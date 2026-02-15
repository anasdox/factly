import { Router, Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';

const router = Router();

const RESULTS_DIR = path.resolve(__dirname, '../../../tools/benchmark/results');
const CONFIGS_DIR = path.resolve(__dirname, '../../../tools/benchmark/configs');
const BENCHMARK_DIR = path.resolve(__dirname, '../../../tools/benchmark');

// Collect all config.name values from existing results
function getExistingResultNames(): Set<string> {
  const names = new Set<string>();
  if (!fs.existsSync(RESULTS_DIR)) return names;
  for (const f of fs.readdirSync(RESULTS_DIR).filter((f) => f.endsWith('.json'))) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(RESULTS_DIR, f), 'utf-8'));
      if (data.config?.name) names.add(data.config.name);
    } catch { /* skip */ }
  }
  return names;
}

// In-memory job tracking
interface BenchmarkJob {
  id: string;
  state: 'pending' | 'running' | 'completed' | 'failed';
  configName: string;
  currentSuite?: string;
  currentCase?: string;
  completedSuites: number;
  totalSuites: number;
  completedCases: number;
  totalCases: number;
  totalRuns: number;
  completedRuns: number;
  currentRunIndex: number;
  currentRunLabel?: string;
  partialScores: Record<string, number>;
  resultId?: string;
  error?: string;
  process?: ChildProcess;
  output: string;
  startedAt: string;
}

// Expand matrix config into individual configs (Cartesian product)
function expandMatrixConfig(config: any): any[] {
  const { matrix, baseTarget, ...rest } = config;
  if (!matrix || !baseTarget) return [config];

  const providers = matrix.provider || [baseTarget.provider];
  const models = matrix.model || [baseTarget.model];
  const tempExtractions = matrix.tempExtraction || [baseTarget.tempExtraction];
  const tempDedups = matrix.tempDedup || [baseTarget.tempDedup];
  const tempImpacts = matrix.tempImpact || [baseTarget.tempImpact];
  const tempProposals = matrix.tempProposal || [baseTarget.tempProposal];
  const embModels = matrix.embeddingsModel || [baseTarget.embeddingsModel];
  const dedupThresholds = matrix.dedupThreshold || [baseTarget.dedupThreshold];

  const configs: any[] = [];

  for (const provider of providers) {
    for (const model of models) {
      for (const tempExtraction of tempExtractions) {
        for (const tempDedup of tempDedups) {
          for (const tempImpact of tempImpacts) {
            for (const tempProposal of tempProposals) {
              for (const embeddingsModel of embModels) {
                for (const dedupThreshold of dedupThresholds) {
                  const target = {
                    provider,
                    model,
                    tempExtraction,
                    tempDedup,
                    tempImpact,
                    tempProposal,
                    embeddingsModel,
                    dedupThreshold,
                  };
                  const label = `${provider}-${model}-t${tempExtraction}`;
                  configs.push({
                    ...rest,
                    name: `${rest.name}-${label}`,
                    target,
                    suites: rest.suites || ['fact-extraction'],
                    runsPerCase: rest.runsPerCase || 1,
                  });
                }
              }
            }
          }
        }
      }
    }
  }

  return configs;
}

const jobs = new Map<string, BenchmarkJob>();

// GET /benchmark/results — list all benchmark results
router.get('/results', (req: Request, res: Response) => {
  try {
    if (!fs.existsSync(RESULTS_DIR)) {
      return res.json({ results: [] });
    }

    const files = fs.readdirSync(RESULTS_DIR)
      .filter((f) => f.endsWith('.json') && f !== '.gitkeep')
      .sort()
      .reverse();

    const results = files.map((f) => {
      const filePath = path.join(RESULTS_DIR, f);
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

        // Compute error rate across all cases in all suites
        let totalCases = 0;
        let errorCases = 0;
        for (const suite of data.suites || []) {
          for (const c of suite.cases || []) {
            totalCases++;
            if (c.error) {
              errorCases++;
            }
          }
        }
        const errorRate = totalCases > 0 ? errorCases / totalCases : 0;
        const status = errorRate > 0.5 ? 'error' : 'success';

        return {
          id: data.id,
          timestamp: data.timestamp,
          configName: data.config?.name || 'unknown',
          target: data.target,
          overallScore: data.overallScore,
          suitesCount: data.suites?.length || 0,
          totalLatencyMs: data.totalLatencyMs,
          cost: data.cost,
          filename: f,
          errorRate,
          errorCount: errorCases,
          status,
        };
      } catch {
        return null;
      }
    }).filter(Boolean);

    res.json({ results });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /benchmark/results/names — list all existing config names (for uniqueness check)
router.get('/results/names', (req: Request, res: Response) => {
  try {
    const names = Array.from(getExistingResultNames());
    res.json({ names });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /benchmark/results/:id — full detail of one run
router.get('/results/:id', (req: Request, res: Response) => {
  try {
    if (!fs.existsSync(RESULTS_DIR)) {
      return res.status(404).json({ error: 'No results directory' });
    }

    const files = fs.readdirSync(RESULTS_DIR).filter((f) => f.endsWith('.json'));

    for (const f of files) {
      const filePath = path.join(RESULTS_DIR, f);
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        if (data.id === req.params.id) {
          return res.json(data);
        }
      } catch {
        continue;
      }
    }

    res.status(404).json({ error: 'Result not found' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /benchmark/compare?ids=id1,id2,id3 — compare N runs
router.get('/compare', (req: Request, res: Response) => {
  try {
    const idsParam = req.query.ids as string;
    if (!idsParam) {
      return res.status(400).json({ error: 'Query parameter "ids" is required (comma-separated)' });
    }

    const ids = idsParam.split(',').map((s) => s.trim());
    if (ids.length < 2) {
      return res.status(400).json({ error: 'Need at least 2 IDs to compare' });
    }

    if (!fs.existsSync(RESULTS_DIR)) {
      return res.status(404).json({ error: 'No results directory' });
    }

    const files = fs.readdirSync(RESULTS_DIR).filter((f) => f.endsWith('.json'));
    const results: any[] = [];

    for (const f of files) {
      const filePath = path.join(RESULTS_DIR, f);
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        if (ids.includes(data.id)) {
          results.push(data);
        }
      } catch {
        continue;
      }
    }

    if (results.length < 2) {
      return res.status(404).json({ error: `Found ${results.length} of ${ids.length} requested results` });
    }

    // Build comparison
    const allMetrics = new Set<string>();
    for (const result of results) {
      for (const suite of result.suites || []) {
        for (const name of Object.keys(suite.aggregated || {})) {
          allMetrics.add(`${suite.suite}/${name}`);
        }
      }
    }

    const entries = Array.from(allMetrics).sort().map((metric) => {
      const [suite, metricName] = metric.split('/');
      const values = results.map((r) => {
        const suiteEval = (r.suites || []).find((s: any) => s.suite === suite);
        const value = suiteEval?.aggregated?.[metricName]?.mean ?? 0;
        return { configName: r.config.name, id: r.id, value };
      });

      const isLowerBetter = metricName.includes('fpr') || metricName.includes('mae');
      const best = isLowerBetter
        ? values.reduce((a, b) => (a.value <= b.value ? a : b))
        : values.reduce((a, b) => (a.value >= b.value ? a : b));

      return { metric, values, bestConfigName: best.configName };
    });

    res.json({
      configs: results.map((r) => ({ name: r.config.name, id: r.id })),
      entries,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /benchmark/configs — list available config presets
router.get('/configs', (req: Request, res: Response) => {
  try {
    if (!fs.existsSync(CONFIGS_DIR)) {
      return res.json({ configs: [] });
    }

    const files = fs.readdirSync(CONFIGS_DIR).filter((f) => f.endsWith('.json'));
    const configs = files.map((f) => {
      const filePath = path.join(CONFIGS_DIR, f);
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        return {
          filename: f,
          name: data.name,
          description: data.description,
          suites: data.suites,
          runsPerCase: data.runsPerCase,
          target: data.target,
          isMatrix: !!data.matrix,
        };
      } catch {
        return null;
      }
    }).filter(Boolean);

    res.json({ configs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /benchmark/configs — save a custom config
router.post('/configs', (req: Request, res: Response) => {
  try {
    const config = req.body;
    if (!config.name) {
      return res.status(400).json({ error: 'Config must have a "name" field' });
    }

    if (!fs.existsSync(CONFIGS_DIR)) {
      fs.mkdirSync(CONFIGS_DIR, { recursive: true });
    }

    const filename = `${config.name.replace(/[^a-zA-Z0-9-_]/g, '-')}.json`;
    const filePath = path.join(CONFIGS_DIR, filename);
    fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf-8');

    res.json({ filename, path: filePath });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /benchmark/suggestions — improvement suggestions based on existing results
router.get('/suggestions', (req: Request, res: Response) => {
  try {
    if (!fs.existsSync(RESULTS_DIR)) {
      return res.json({ suggestions: [] });
    }

    const files = fs.readdirSync(RESULTS_DIR)
      .filter((f) => f.endsWith('.json') && f !== '.gitkeep')
      .sort()
      .reverse()
      .slice(0, 20);

    const results: any[] = [];
    for (const f of files) {
      try {
        results.push(JSON.parse(fs.readFileSync(path.join(RESULTS_DIR, f), 'utf-8')));
      } catch {
        continue;
      }
    }

    const suggestions = generateSuggestions(results);
    res.json({ suggestions });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /benchmark/run — launch a new benchmark run
router.post('/run', (req: Request, res: Response) => {
  try {
    const config = req.body;
    if (!config.name) {
      return res.status(400).json({ error: 'Config must have a "name" field' });
    }

    if (!fs.existsSync(CONFIGS_DIR)) {
      fs.mkdirSync(CONFIGS_DIR, { recursive: true });
    }

    const jobId = Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
    const port = process.env.PORT || 3002;

    // Expand matrix if present, otherwise single config
    const isMatrix = !!config.matrix && !!config.baseTarget;
    const expandedConfigs = isMatrix
      ? expandMatrixConfig({ backendUrl: `http://localhost:${port}`, ...config })
      : [{ backendUrl: `http://localhost:${port}`, ...config }];

    // Enforce unique names across all expanded configs
    const existingNames = getExistingResultNames();
    const conflicts: string[] = [];
    for (const ec of expandedConfigs) {
      if (existingNames.has(ec.name)) conflicts.push(ec.name);
    }
    if (conflicts.length > 0) {
      return res.status(409).json({
        error: 'Benchmark name(s) already exist',
        conflicts,
      });
    }

    const suitesPerRun = (config.suites || []).length;
    const totalSuites = expandedConfigs.length * suitesPerRun;

    const job: BenchmarkJob = {
      id: jobId,
      state: 'running',
      configName: config.name,
      completedSuites: 0,
      totalSuites,
      completedCases: 0,
      totalCases: 0,
      totalRuns: expandedConfigs.length,
      completedRuns: 0,
      currentRunIndex: 0,
      partialScores: {},
      output: '',
      startedAt: new Date().toISOString(),
    };

    jobs.set(jobId, job);

    // Sequential runner: runs configs one at a time
    function runNextConfig(index: number) {
      if (index >= expandedConfigs.length) {
        job.state = 'completed';
        job.process = undefined;
        return;
      }

      if (job.state === 'failed') return; // cancelled or errored

      const runConfig = expandedConfigs[index];
      job.currentRunIndex = index;
      job.currentRunLabel = runConfig.name || `run-${index + 1}`;

      const configFilename = `_run-${jobId}-${index}.json`;
      const configPath = path.join(CONFIGS_DIR, configFilename);
      fs.writeFileSync(configPath, JSON.stringify(runConfig, null, 2), 'utf-8');

      const nvmNode = path.resolve(process.env.HOME || '~', '.nvm/versions/node/v20.19.0/bin/node');
      const nodeBin = fs.existsSync(nvmNode) ? nvmNode : 'node';
      const tsNodePath = path.join(BENCHMARK_DIR, 'node_modules/.bin/ts-node');
      const cliPath = path.join(BENCHMARK_DIR, 'src/cli.ts');

      const child = spawn(
        fs.existsSync(tsNodePath) ? tsNodePath : `${nodeBin} -e "require('${cliPath}')"`,
        fs.existsSync(tsNodePath)
          ? [cliPath, 'run', '--config', configPath]
          : ['run', '--config', configPath],
        {
          cwd: BENCHMARK_DIR,
          env: { ...process.env, PATH: `${path.dirname(nodeBin)}:${process.env.PATH}` },
          shell: true,
          stdio: ['ignore', 'pipe', 'pipe'],
        },
      );

      job.process = child;

      child.stdout?.on('data', (data: Buffer) => {
        const text = data.toString();
        job.output += text;

        const suiteMatch = text.match(/Running suite: (.+)\.\.\./);
        if (suiteMatch) {
          job.currentSuite = suiteMatch[1];
        }

        const avgMatch = text.match(/Avg score: ([\d.]+)%.*?(\d+) metrics.*?(\d+) cases/);
        if (avgMatch && job.currentSuite) {
          job.partialScores[job.currentSuite] = parseFloat(avgMatch[1]) / 100;
          job.completedSuites++;
          job.completedCases += parseInt(avgMatch[3]);
        }

        const savedMatch = text.match(/Result saved to: (.+)/);
        if (savedMatch) {
          try {
            const savedPath = savedMatch[1].trim();
            const resultData = JSON.parse(fs.readFileSync(savedPath, 'utf-8'));
            job.resultId = resultData.id;
          } catch { /* ignore parse errors */ }
        }
      });

      child.stderr?.on('data', (data: Buffer) => {
        job.output += data.toString();
      });

      child.on('close', (code) => {
        try { fs.unlinkSync(configPath); } catch { /* ignore */ }

        if (code !== 0) {
          job.state = 'failed';
          job.error = `Run ${index + 1}/${expandedConfigs.length} exited with code ${code}`;
          job.process = undefined;
          return;
        }

        job.completedRuns++;
        runNextConfig(index + 1);
      });

      child.on('error', (err) => {
        job.state = 'failed';
        job.error = err.message;
        job.process = undefined;
        try { fs.unlinkSync(configPath); } catch { /* ignore */ }
      });
    }

    runNextConfig(0);

    res.json({ jobId, state: 'running' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /benchmark/run/:jobId/status — check job status
router.get('/run/:jobId/status', (req: Request, res: Response) => {
  const job = jobs.get(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  res.json({
    id: job.id,
    state: job.state,
    configName: job.configName,
    currentSuite: job.currentSuite,
    completedSuites: job.completedSuites,
    totalSuites: job.totalSuites,
    completedCases: job.completedCases,
    totalCases: job.totalCases,
    totalRuns: job.totalRuns,
    completedRuns: job.completedRuns,
    currentRunLabel: job.currentRunLabel,
    partialScores: job.partialScores,
    resultId: job.resultId,
    error: job.error,
    startedAt: job.startedAt,
  });
});

// POST /benchmark/run/:jobId/cancel — cancel a running job
router.post('/run/:jobId/cancel', (req: Request, res: Response) => {
  const job = jobs.get(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  if (job.state !== 'running' || !job.process) {
    return res.status(400).json({ error: 'Job is not running' });
  }

  job.process.kill('SIGTERM');
  job.state = 'failed';
  job.error = 'Cancelled by user';
  job.process = undefined;

  res.json({ state: 'failed', message: 'Job cancelled' });
});

// DELETE /benchmark/results/:id — delete a benchmark result
router.delete('/results/:id', (req: Request, res: Response) => {
  try {
    if (!fs.existsSync(RESULTS_DIR)) {
      return res.status(404).json({ error: 'No results directory' });
    }

    const files = fs.readdirSync(RESULTS_DIR).filter((f) => f.endsWith('.json'));

    for (const f of files) {
      const filePath = path.join(RESULTS_DIR, f);
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        if (data.id === req.params.id) {
          fs.unlinkSync(filePath);
          return res.json({ deleted: true });
        }
      } catch {
        continue;
      }
    }

    res.status(404).json({ error: 'Result not found' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

function generateSuggestions(results: any[]): any[] {
  if (results.length === 0) return [];

  const suggestions: any[] = [];
  const latest = results[0];
  const pct = (v: number) => (v * 100).toFixed(1);
  const latestName = latest.config?.name || latest.id;

  // --- 1. Low-scoring metrics on the latest run ---
  if (latest?.suites) {
    for (const suite of latest.suites) {
      for (const [name, agg] of Object.entries(suite.aggregated || {})) {
        const value = (agg as any).mean;
        if (value < 0.5) {
          let bestOther: { configName: string; value: number; model: string; temp: number; target: any } | null = null;
          for (const r of results.slice(1)) {
            const s = (r.suites || []).find((ss: any) => ss.suite === suite.suite);
            const otherVal = s?.aggregated?.[name]?.mean;
            if (otherVal != null && (!bestOther || otherVal > bestOther.value)) {
              bestOther = {
                configName: r.config?.name || r.id,
                value: otherVal,
                model: r.target?.model || '?',
                temp: r.target?.tempExtraction ?? 0,
                target: r.target,
              };
            }
          }

          const gap = bestOther ? bestOther.value - value : 0;
          const hasRef = bestOther && bestOther.value > value;

          suggestions.push({
            type: 'low_score',
            title: `Low ${name} on ${suite.suite}`,
            message: hasRef
              ? `On the latest benchmark (${latestName}), metric "${name}" in suite "${suite.suite}" is only at ${pct(value)}%. `
                + `A previous benchmark (${bestOther!.configName}, model ${bestOther!.model}, temp ${bestOther!.temp}) scored ${pct(bestOther!.value)}% on the same metric. `
                + `Gap: +${pct(gap)} pts in favor of the previous run.`
              : `On the latest benchmark (${latestName}), metric "${name}" in suite "${suite.suite}" is only at ${pct(value)}%. `
                + `Below 50% means the model fails more often than it succeeds on this task.`,
            detail: hasRef
              ? `Benchmark "${bestOther!.configName}" already proved a better score is achievable with a different configuration. `
                + `The ${pct(gap)} pts gap shows real room for improvement. `
                + `Try the parameters from that previous run to improve this metric.`
              : `A score below 50% means the model struggles on this task. `
                + `Consider a more capable model, lowering the temperature for more deterministic outputs, or adjusting the prompt.`,
            gap: hasRef ? {
              latest: { label: latestName, value },
              reference: { label: bestOther!.configName, value: bestOther!.value },
              delta: gap,
            } : null,
            suggestedConfig: hasRef && bestOther!.target ? { target: bestOther!.target } : null,
          });
        }
      }
    }
  }

  // --- 2. Best config overall ---
  if (results.length >= 2) {
    const best = results.reduce((a, b) =>
      (b.overallScore ?? 0) > (a.overallScore ?? 0) ? b : a
    );
    if (best.id !== latest.id && (best.overallScore - latest.overallScore) > 0.02) {
      const bestName = best.config?.name || best.id;
      const delta = best.overallScore - latest.overallScore;
      suggestions.push({
        type: 'best_config',
        title: `Latest run is not the best`,
        message: `Latest benchmark (${latestName}) scored ${pct(latest.overallScore)}%, `
          + `but "${bestName}" reached ${pct(best.overallScore)}%. `
          + `Gap: ${pct(delta)} pts. `
          + `"${bestName}" used model ${best.target?.model || '?'} (${best.target?.provider || '?'}) `
          + `with extraction temperature ${best.target?.tempExtraction ?? '?'}.`,
        detail: `When the latest run scores lower than the historical best, recent parameter changes may have degraded performance. `
          + `Re-running with the best known config helps determine whether it's a config issue or a real system regression.`,
        gap: {
          latest: { label: latestName, value: latest.overallScore },
          reference: { label: bestName, value: best.overallScore },
          delta,
        },
        suggestedConfig: best.target ? { target: best.target } : null,
      });
    }
  }

  // --- 3. Model comparison ---
  if (results.length >= 2) {
    const byModel: Record<string, { scores: number[]; bestScore: number; avgScore: number; target: any; configName: string; count: number }> = {};
    for (const r of results) {
      const model = r.target?.model;
      if (!model || r.overallScore == null) continue;
      if (!byModel[model]) {
        byModel[model] = { scores: [], bestScore: 0, avgScore: 0, target: r.target, configName: r.config?.name || r.id, count: 0 };
      }
      byModel[model].scores.push(r.overallScore);
      byModel[model].count++;
      if (r.overallScore > byModel[model].bestScore) {
        byModel[model].bestScore = r.overallScore;
        byModel[model].target = r.target;
        byModel[model].configName = r.config?.name || r.id;
      }
    }
    for (const data of Object.values(byModel)) {
      data.avgScore = data.scores.reduce((a, b) => a + b, 0) / data.scores.length;
    }
    const models = Object.entries(byModel);
    if (models.length >= 2) {
      models.sort((a, b) => b[1].bestScore - a[1].bestScore);
      const [bestModel, bestData] = models[0];
      const [worstModel, worstData] = models[models.length - 1];
      const delta = bestData.bestScore - worstData.bestScore;
      if (delta > 0.03) {
        suggestions.push({
          type: 'model_comparison',
          title: `${bestModel} outperforms ${worstModel}`,
          message: `Across ${models.length} models tested, ${bestModel} achieves the best score at ${pct(bestData.bestScore)}% `
            + `(avg over ${bestData.count} run(s): ${pct(bestData.avgScore)}%), `
            + `while ${worstModel} peaks at ${pct(worstData.bestScore)}% `
            + `(avg over ${worstData.count} run(s): ${pct(worstData.avgScore)}%). `
            + `Gap: ${pct(delta)} pts.`,
          detail: `Not all LLM models have the same capabilities. `
            + `A ${pct(delta)} pts gap is significant and indicates ${bestModel} handles your benchmark tasks better. `
            + `If ${worstModel} is cheaper, weigh the quality gap against cost savings. `
            + `Otherwise, prefer ${bestModel}.`,
          gap: {
            latest: { label: worstModel, value: worstData.bestScore },
            reference: { label: bestModel, value: bestData.bestScore },
            delta,
          },
          suggestedConfig: bestData.target ? { target: bestData.target } : null,
        });
      }
    }
  }

  // --- 4. Temperature sweet spots ---
  if (results.length >= 2) {
    const tempParams: Array<{ key: string; configKey: string; label: string; explanation: string }> = [
      { key: 'tempExtraction', configKey: 'tempExtraction', label: 'extraction',
        explanation: `Extraction temperature controls model creativity when identifying facts. Lower = stricter and more factual. Higher = more exploratory interpretations.` },
      { key: 'tempDedup', configKey: 'tempDedup', label: 'dedup',
        explanation: `Dedup temperature controls how the model decides if two facts are identical. Lower = more conservative (keeps more duplicates). Higher = more aggressive (merges more).` },
      { key: 'tempImpact', configKey: 'tempImpact', label: 'impact',
        explanation: `Impact temperature controls fact importance analysis. Lower = predictable evaluations. Higher = more nuanced but more variable.` },
      { key: 'tempProposal', configKey: 'tempProposal', label: 'proposal',
        explanation: `Proposal temperature controls suggestion generation. Lower = conventional and reliable. Higher = more creative but with higher error risk.` },
    ];

    for (const { key, configKey, label, explanation } of tempParams) {
      const byTemp: Array<{ temp: number; score: number }> = [];
      for (const r of results) {
        const temp = r.target?.[key];
        if (temp != null && r.overallScore != null) {
          byTemp.push({ temp, score: r.overallScore });
        }
      }
      const bestByTemp = new Map<number, { temp: number; score: number }>();
      for (const entry of byTemp) {
        const existing = bestByTemp.get(entry.temp);
        if (!existing || entry.score > existing.score) {
          bestByTemp.set(entry.temp, entry);
        }
      }
      const unique = Array.from(bestByTemp.values());
      if (unique.length < 2) continue;

      unique.sort((a, b) => b.score - a.score);
      const best = unique[0];
      const worst = unique[unique.length - 1];
      const delta = best.score - worst.score;
      if (delta > 0.03) {
        const testedList = unique.map((u) => `${u.temp} (${pct(u.score)}%)`).join(', ');

        suggestions.push({
          type: 'temperature_sweet_spot',
          title: `Optimal ${label} temperature: ${best.temp}`,
          message: `Among tested ${label} temperatures [${testedList}], `
            + `${best.temp} gives the best result at ${pct(best.score)}%, `
            + `vs ${pct(worst.score)}% for ${worst.temp}. `
            + `Gap: ${pct(delta)} pts.`,
          detail: explanation + ` `
            + `Benchmarks show ${best.temp} is the best tested trade-off. `
            + (delta > 0.1
              ? `The ${pct(delta)} pts gap is very significant: this temperature choice has a real impact on quality.`
              : `The ${pct(delta)} pts gap is notable but moderate: other parameters may have more influence.`),
          gap: {
            latest: { label: `temp=${worst.temp}`, value: worst.score },
            reference: { label: `temp=${best.temp}`, value: best.score },
            delta,
          },
          suggestedConfig: { target: { ...(latest.target || {}), [key]: best.temp } },
        });

        // Neighborhood exploration
        const step = 0.05;
        const testedTemps = new Set(unique.map((u) => u.temp));
        const low = +(best.temp - step).toFixed(2);
        const high = +(best.temp + step).toFixed(2);
        if (!testedTemps.has(low) || !testedTemps.has(high)) {
          const untested = [low, high].filter((t) => !testedTemps.has(t) && t >= 0 && t <= 2);
          suggestions.push({
            type: 'neighborhood_exploration',
            title: `Refine ${label} temperature`,
            message: `Best tested ${label} temperature is ${best.temp}, `
              + `but nearby values (${untested.join(', ')}) have never been tested. `
              + `A neighbor value may score even higher.`,
            detail: `In optimization, when you find a good point (${best.temp}), you test values just around it to see if you can gain a few more points. `
              + `Like searching for a hilltop: small steps around the best known point.`,
            gap: null,
            suggestedConfig: {
              matrix: { [key]: untested },
              baseTarget: { ...(latest.target || {}), [key]: best.temp },
            },
          });
        }
      }
    }
  }

  // --- 5. Regression vs best historical ---
  if (results.length >= 2) {
    const bestHistorical = results.slice(1).reduce((a, b) =>
      (b.overallScore ?? 0) > (a.overallScore ?? 0) ? b : a
    );
    const delta = bestHistorical.overallScore - latest.overallScore;
    if (delta > 0.03) {
      const bestName = bestHistorical.config?.name || bestHistorical.id;

      const diffs: string[] = [];
      const lt = latest.target || {};
      const bt = bestHistorical.target || {};
      if (lt.model !== bt.model) diffs.push(`model: ${lt.model} -> ${bt.model}`);
      if (lt.provider !== bt.provider) diffs.push(`provider: ${lt.provider} -> ${bt.provider}`);
      if (lt.tempExtraction !== bt.tempExtraction) diffs.push(`temp extraction: ${lt.tempExtraction} -> ${bt.tempExtraction}`);
      if (lt.tempDedup !== bt.tempDedup) diffs.push(`temp dedup: ${lt.tempDedup} -> ${bt.tempDedup}`);
      if (lt.tempImpact !== bt.tempImpact) diffs.push(`temp impact: ${lt.tempImpact} -> ${bt.tempImpact}`);
      if (lt.tempProposal !== bt.tempProposal) diffs.push(`temp proposal: ${lt.tempProposal} -> ${bt.tempProposal}`);

      const diffText = diffs.length > 0
        ? `Config differences: ${diffs.join('; ')}.`
        : `Both runs used identical parameters, pointing to a change in the system itself.`;

      suggestions.push({
        type: 'regression',
        title: `Regression detected: -${pct(delta)} pts`,
        message: `Latest benchmark (${latestName}) scored ${pct(latest.overallScore)}%, `
          + `${pct(delta)} pts below the best historical result "${bestName}" at ${pct(bestHistorical.overallScore)}%. `
          + diffText,
        detail: `A regression means overall system quality has dropped. `
          + `This can come from parameter changes (temperature, model), backend code modifications, `
          + `or a shift in the LLM's behavior. `
          + `First step: re-run the benchmark with "${bestName}" config to determine if it's a config issue or a system regression.`,
        gap: {
          latest: { label: latestName, value: latest.overallScore },
          reference: { label: bestName, value: bestHistorical.overallScore },
          delta,
        },
        suggestedConfig: bestHistorical.target ? { target: bestHistorical.target } : null,
      });
    }
  }

  // --- 6. Per-suite declining trends ---
  if (results.length >= 3) {
    const suiteNames = new Set<string>();
    for (const r of results) {
      for (const s of r.suites || []) suiteNames.add(s.suite);
    }

    for (const suiteName of suiteNames) {
      const scores: Array<{ score: number; configName: string; target: any }> = [];
      for (const r of [...results].reverse()) {
        const s = (r.suites || []).find((ss: any) => ss.suite === suiteName);
        if (s) {
          const metricMeans = Object.values(s.aggregated || {}).map((a: any) => a.mean);
          if (metricMeans.length > 0) {
            const avg = metricMeans.reduce((sum: number, v: number) => sum + v, 0) / metricMeans.length;
            scores.push({ score: avg, configName: r.config?.name || r.id, target: r.target });
          }
        }
      }
      if (scores.length < 3) continue;

      const last3 = scores.slice(-3);
      if (last3[2].score < last3[1].score && last3[1].score < last3[0].score) {
        const drop = last3[0].score - last3[2].score;
        if (drop > 0.03) {
          suggestions.push({
            type: 'suite_declining',
            title: `${suiteName} declining steadily`,
            message: `Suite "${suiteName}" has dropped over the last 3 benchmarks: `
              + `${last3[0].configName} at ${pct(last3[0].score)}%, `
              + `then ${last3[1].configName} at ${pct(last3[1].score)}%, `
              + `then ${last3[2].configName} at ${pct(last3[2].score)}%. `
              + `Total loss: ${pct(drop)} pts.`,
            detail: `When a score drops 3 times in a row, it's likely not random. `
              + `Successive config changes may be degrading this specific dimension. `
              + `Compare the parameters that changed across these 3 runs to identify the responsible factor.`,
            gap: {
              latest: { label: last3[2].configName, value: last3[2].score },
              reference: { label: last3[0].configName, value: last3[0].score },
              delta: drop,
            },
            suggestedConfig: last3[0].target ? { target: last3[0].target } : null,
          });
        }
      }
    }
  }

  // --- 7. Provider comparison ---
  if (results.length >= 2) {
    const byProvider: Record<string, { scores: number[]; bestScore: number; avgScore: number; target: any; count: number }> = {};
    for (const r of results) {
      const provider = r.target?.provider;
      if (!provider || r.overallScore == null) continue;
      if (!byProvider[provider]) {
        byProvider[provider] = { scores: [], bestScore: 0, avgScore: 0, target: r.target, count: 0 };
      }
      byProvider[provider].scores.push(r.overallScore);
      byProvider[provider].count++;
      if (r.overallScore > byProvider[provider].bestScore) {
        byProvider[provider].bestScore = r.overallScore;
        byProvider[provider].target = r.target;
      }
    }
    for (const data of Object.values(byProvider)) {
      data.avgScore = data.scores.reduce((a, b) => a + b, 0) / data.scores.length;
    }
    const providers = Object.entries(byProvider);
    if (providers.length >= 2) {
      providers.sort((a, b) => b[1].bestScore - a[1].bestScore);
      const [bestProv, bestProvData] = providers[0];
      const [worstProv, worstProvData] = providers[providers.length - 1];
      const delta = bestProvData.bestScore - worstProvData.bestScore;
      if (delta > 0.03) {
        suggestions.push({
          type: 'provider_comparison',
          title: `${bestProv} outperforms ${worstProv}`,
          message: `Provider ${bestProv} (best: ${pct(bestProvData.bestScore)}%, avg: ${pct(bestProvData.avgScore)}% over ${bestProvData.count} run(s)) `
            + `outperforms ${worstProv} (best: ${pct(worstProvData.bestScore)}%, avg: ${pct(worstProvData.avgScore)}% over ${worstProvData.count} run(s)). `
            + `Gap: ${pct(delta)} pts.`,
          detail: `Providers (OpenAI, Anthropic, OVHcloud...) use different infrastructure and models. `
            + `The same model name can perform differently across providers. `
            + `If cost is similar, prefer ${bestProv}. `
            + `If ${worstProv} is significantly cheaper, weigh quality vs cost.`,
          gap: {
            latest: { label: worstProv, value: worstProvData.bestScore },
            reference: { label: bestProv, value: bestProvData.bestScore },
            delta,
          },
          suggestedConfig: bestProvData.target ? { target: bestProvData.target } : null,
        });
      }
    }
  }

  return suggestions;
}

export default router;
