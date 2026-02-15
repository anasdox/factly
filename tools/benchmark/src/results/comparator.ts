import { BenchmarkResult, ComparisonResult, ComparisonEntry } from './types';

export function compareResults(results: BenchmarkResult[]): ComparisonResult {
  if (results.length < 2) {
    throw new Error('Need at least 2 results to compare');
  }

  const configs = results.map((r) => r.config.name);
  const allMetrics = new Set<string>();

  for (const result of results) {
    for (const suite of result.suites) {
      for (const [name] of Object.entries(suite.aggregated)) {
        allMetrics.add(`${suite.suite}/${name}`);
      }
    }
  }

  const entries: ComparisonEntry[] = [];

  for (const metric of allMetrics) {
    const [suite, metricName] = metric.split('/');
    const values = results.map((r) => {
      const suiteEval = r.suites.find((s) => s.suite === suite);
      const value = suiteEval?.aggregated[metricName]?.mean ?? 0;
      return { configName: r.config.name, value };
    });

    // Find best value (highest for most metrics, lowest for FPR and MAE)
    const isLowerBetter = metricName.includes('fpr') || metricName.includes('mae');
    const best = isLowerBetter
      ? values.reduce((a, b) => (a.value <= b.value ? a : b))
      : values.reduce((a, b) => (a.value >= b.value ? a : b));

    // Add deltas
    const valuesWithDelta = values.map((v) => ({
      ...v,
      delta: v.value - best.value,
    }));

    entries.push({
      metric,
      values: valuesWithDelta,
      bestConfigName: best.configName,
    });
  }

  // Sort entries by suite then metric name
  entries.sort((a, b) => a.metric.localeCompare(b.metric));

  return { configs, entries };
}
