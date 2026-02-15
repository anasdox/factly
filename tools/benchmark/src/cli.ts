import { loadConfig } from './config/loader';
import { BenchmarkConfig, SuiteName } from './config/types';
import { RunnerResult } from './runners/types';
import { runFactExtraction, runInsightExtraction, runRecommendationExtraction, runOutputFormulation } from './runners/extraction-runner';
import { runDedupCheck, runDedupScan } from './runners/dedup-runner';
import { runImpactCheck } from './runners/impact-runner';
import { runUpdateProposal } from './runners/update-proposal-runner';
import { runPipeline } from './runners/pipeline-runner';
import { evaluateSuite } from './evaluate';
import { BenchmarkResult } from './results/types';
import { saveResult, loadResult, listResults } from './results/storage';
import { compareResults } from './results/comparator';
import { formatResultTerminal, formatComparisonTerminal } from './results/reporter';
import { getHistory, formatHistory, detectRegressions } from './results/history';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

const SUITE_RUNNERS: Record<SuiteName, (config: BenchmarkConfig) => Promise<RunnerResult[]>> = {
  'fact-extraction': runFactExtraction,
  'insight-extraction': runInsightExtraction,
  'recommendation-extraction': runRecommendationExtraction,
  'output-formulation': runOutputFormulation,
  'dedup': async (config) => {
    const checks = await runDedupCheck(config);
    const scans = await runDedupScan(config);
    return [...checks, ...scans];
  },
  'impact-check': runImpactCheck,
  'update-proposal': runUpdateProposal,
  'pipeline': runPipeline,
};

async function runBenchmark(configPath: string, suiteFilter?: string): Promise<void> {
  const config = loadConfig(configPath);

  if (suiteFilter) {
    const filtered = suiteFilter.split(',').map((s) => s.trim()) as SuiteName[];
    config.suites = filtered;
  }

  console.log(`\nStarting benchmark: ${config.name}`);
  console.log(`Target: ${config.target.provider}/${config.target.model}`);
  console.log(`Suites: ${config.suites.join(', ')}`);
  console.log(`Runs per case: ${config.runsPerCase}`);
  console.log('');

  const result: BenchmarkResult = {
    id: generateId(),
    timestamp: new Date().toISOString(),
    config,
    target: config.target,
    suites: [],
    overallScore: 0,
    totalLatencyMs: 0,
  };

  for (const suite of config.suites) {
    console.log(`  Running suite: ${suite}...`);
    const runner = SUITE_RUNNERS[suite];
    if (!runner) {
      console.warn(`    Unknown suite: ${suite}, skipping`);
      continue;
    }

    const runnerResults = await runner(config);
    const totalLatency = runnerResults.reduce((s, r) => s + r.latencyMs, 0);
    result.totalLatencyMs += totalLatency;

    const errors = runnerResults.filter((r) => r.error);
    if (errors.length > 0) {
      console.warn(`    ${errors.length}/${runnerResults.length} cases had errors`);
    }

    const evaluation = await evaluateSuite(suite, runnerResults, config);
    result.suites.push(evaluation);

    const metrics = Object.entries(evaluation.aggregated);
    if (metrics.length > 0) {
      const avgScore = metrics.reduce((s, [, agg]) => s + agg.mean, 0) / metrics.length;
      console.log(`    Avg score: ${(avgScore * 100).toFixed(1)}% (${metrics.length} metrics, ${runnerResults.length} cases, ${(totalLatency / 1000).toFixed(1)}s)`);
    }
  }

  // Compute overall score as average of all suite averages
  const suiteAverages = result.suites.map((s) => {
    const metrics = Object.values(s.aggregated);
    if (metrics.length === 0) return 0;
    return metrics.reduce((sum, m) => sum + m.mean, 0) / metrics.length;
  });
  result.overallScore = suiteAverages.length > 0
    ? suiteAverages.reduce((a, b) => a + b, 0) / suiteAverages.length
    : 0;

  const filePath = saveResult(result);
  console.log(formatResultTerminal(result));
  console.log(`\nResult saved to: ${filePath}`);
}

async function compareCommand(files: string[]): Promise<void> {
  if (files.length < 2) {
    console.error('Compare requires at least 2 result files');
    process.exit(1);
  }

  const results = files.map((f) => loadResult(f));
  const comparison = compareResults(results);
  console.log(formatComparisonTerminal(comparison));

  // Check for regressions
  if (results.length === 2) {
    const alerts = detectRegressions(results[1], results[0]);
    if (alerts.length > 0) {
      console.log('\nREGRESSION ALERTS:');
      for (const alert of alerts) {
        console.log(`  [${alert.suite}] ${alert.metric}: ${(alert.previousValue * 100).toFixed(1)}% -> ${(alert.currentValue * 100).toFixed(1)}% (${(alert.delta * 100).toFixed(1)}%)`);
      }
    }
  }
}

async function historyCommand(suite?: string): Promise<void> {
  const points = getHistory(suite);
  console.log(formatHistory(points));
}

async function listCommand(): Promise<void> {
  const results = listResults();
  if (results.length === 0) {
    console.log('No benchmark results found.');
    return;
  }

  console.log('\nBenchmark Results:');
  console.log('-'.repeat(80));
  for (const r of results) {
    console.log(`  ${r.timestamp.substring(0, 19)}  ${r.configName.padEnd(30)}  ${(r.overallScore * 100).toFixed(1)}%  ${r.path}`);
  }
  console.log('');
}

// CLI argument parsing
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === '--help' || command === '-h') {
    console.log(`
Factly AI Quality Benchmark

Usage:
  npx ts-node src/cli.ts run --config <path> [--suite <name>]
  npx ts-node src/cli.ts compare <file1.json> <file2.json> [...]
  npx ts-node src/cli.ts history [--suite <name>]
  npx ts-node src/cli.ts list

Commands:
  run       Run a benchmark with the given config
  compare   Compare two or more benchmark results
  history   Show score history over time
  list      List all saved benchmark results
`);
    return;
  }

  if (command === 'run') {
    const configIdx = args.indexOf('--config');
    if (configIdx === -1 || !args[configIdx + 1]) {
      console.error('--config <path> is required');
      process.exit(1);
    }
    const configPath = args[configIdx + 1];

    const suiteIdx = args.indexOf('--suite');
    const suiteFilter = suiteIdx !== -1 ? args[suiteIdx + 1] : undefined;

    await runBenchmark(configPath, suiteFilter);
  } else if (command === 'compare') {
    const files = args.slice(1).filter((a) => !a.startsWith('--'));
    await compareCommand(files);
  } else if (command === 'history') {
    const suiteIdx = args.indexOf('--suite');
    const suite = suiteIdx !== -1 ? args[suiteIdx + 1] : undefined;
    await historyCommand(suite);
  } else if (command === 'list') {
    await listCommand();
  } else {
    console.error(`Unknown command: ${command}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Benchmark failed:', err.message);
  process.exit(1);
});
