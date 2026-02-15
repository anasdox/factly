import { BenchmarkResult, ComparisonResult } from './types';

function pct(v: number): string {
  return (v * 100).toFixed(1) + '%';
}

function pad(s: string, len: number): string {
  return s.padEnd(len);
}

export function formatResultTerminal(result: BenchmarkResult): string {
  const lines: string[] = [];

  lines.push('');
  lines.push('='.repeat(70));
  lines.push(`  BENCHMARK RESULT: ${result.config.name}`);
  lines.push('='.repeat(70));
  lines.push(`  Timestamp: ${result.timestamp}`);
  lines.push(`  Model: ${result.target.provider}/${result.target.model}`);
  lines.push(`  Temps: extraction=${result.target.tempExtraction} dedup=${result.target.tempDedup} impact=${result.target.tempImpact} proposal=${result.target.tempProposal}`);
  if (result.target.embeddingsModel) {
    lines.push(`  Embeddings: ${result.target.embeddingsModel}`);
  }
  lines.push(`  Overall Score: ${pct(result.overallScore)}`);
  lines.push(`  Total Latency: ${(result.totalLatencyMs / 1000).toFixed(1)}s`);
  if (result.cost) {
    lines.push(`  Estimated Cost: $${result.cost.estimatedUsd.toFixed(4)} (${result.cost.tokens.totalTokens} tokens)`);
  }
  lines.push('-'.repeat(70));

  for (const suite of result.suites) {
    lines.push('');
    lines.push(`  [${suite.suite}]`);

    const entries = Object.entries(suite.aggregated);
    if (entries.length === 0) {
      lines.push('    No metrics');
      continue;
    }

    const maxNameLen = Math.max(...entries.map(([name]) => name.length));

    for (const [name, agg] of entries) {
      const bar = '|'.repeat(Math.round(agg.mean * 20));
      lines.push(
        `    ${pad(name, maxNameLen + 2)} ${pct(agg.mean).padStart(7)}  ${bar}  (stddev=${pct(agg.stddev)}, n=${agg.count})`
      );
    }
  }

  lines.push('');
  lines.push('='.repeat(70));
  return lines.join('\n');
}

export function formatComparisonTerminal(comparison: ComparisonResult): string {
  const lines: string[] = [];
  const colWidth = 16;

  lines.push('');
  lines.push('='.repeat(70));
  lines.push('  BENCHMARK COMPARISON');
  lines.push('='.repeat(70));

  // Header
  const header = pad('Metric', 35) + comparison.configs.map((c) => pad(c.substring(0, colWidth - 1), colWidth)).join('');
  lines.push(`  ${header}`);
  lines.push('  ' + '-'.repeat(header.length));

  let currentSuite = '';
  for (const entry of comparison.entries) {
    const [suite] = entry.metric.split('/');
    if (suite !== currentSuite) {
      currentSuite = suite;
      lines.push('');
      lines.push(`  [${suite}]`);
    }

    const metricName = entry.metric.split('/')[1];
    const cells = entry.values.map((v) => {
      const isBest = v.configName === entry.bestConfigName;
      const formatted = pct(v.value);
      return pad(isBest ? `*${formatted}` : ` ${formatted}`, colWidth);
    });

    lines.push(`  ${pad(metricName, 35)}${cells.join('')}`);
  }

  lines.push('');
  lines.push('  * = best');
  lines.push('='.repeat(70));
  return lines.join('\n');
}

export function formatResultMarkdown(result: BenchmarkResult): string {
  const lines: string[] = [];

  lines.push(`# Benchmark Result: ${result.config.name}`);
  lines.push('');
  lines.push(`| Property | Value |`);
  lines.push(`|----------|-------|`);
  lines.push(`| Timestamp | ${result.timestamp} |`);
  lines.push(`| Model | ${result.target.provider}/${result.target.model} |`);
  lines.push(`| Temp (extraction) | ${result.target.tempExtraction} |`);
  lines.push(`| Temp (dedup) | ${result.target.tempDedup} |`);
  lines.push(`| Temp (impact) | ${result.target.tempImpact} |`);
  lines.push(`| Temp (proposal) | ${result.target.tempProposal} |`);
  lines.push(`| Overall Score | ${pct(result.overallScore)} |`);
  lines.push(`| Total Latency | ${(result.totalLatencyMs / 1000).toFixed(1)}s |`);
  lines.push('');

  for (const suite of result.suites) {
    lines.push(`## ${suite.suite}`);
    lines.push('');
    lines.push(`| Metric | Mean | StdDev | Min | Max | N |`);
    lines.push(`|--------|------|--------|-----|-----|---|`);

    for (const [name, agg] of Object.entries(suite.aggregated)) {
      lines.push(`| ${name} | ${pct(agg.mean)} | ${pct(agg.stddev)} | ${pct(agg.min)} | ${pct(agg.max)} | ${agg.count} |`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

export function formatComparisonMarkdown(comparison: ComparisonResult): string {
  const lines: string[] = [];

  lines.push(`# Benchmark Comparison`);
  lines.push('');

  const header = `| Metric | ${comparison.configs.join(' | ')} | Best |`;
  const sep = `|--------|${comparison.configs.map(() => '------').join('|')}|------|`;
  lines.push(header);
  lines.push(sep);

  for (const entry of comparison.entries) {
    const cells = entry.values.map((v) => {
      const formatted = pct(v.value);
      return v.configName === entry.bestConfigName ? `**${formatted}**` : formatted;
    });
    lines.push(`| ${entry.metric} | ${cells.join(' | ')} | ${entry.bestConfigName} |`);
  }

  lines.push('');
  return lines.join('\n');
}
