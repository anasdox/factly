import { BenchmarkResult, HistoryPoint, RegressionAlert } from './types';
import { listResults, loadResult } from './storage';

export function getHistory(suiteName?: string): HistoryPoint[] {
  const resultFiles = listResults();
  const points: HistoryPoint[] = [];

  for (const entry of resultFiles) {
    try {
      const result = loadResult(entry.path);
      const metricValues: Record<string, number> = {};

      for (const suite of result.suites) {
        if (suiteName && suite.suite !== suiteName) continue;
        for (const [name, agg] of Object.entries(suite.aggregated)) {
          metricValues[`${suite.suite}/${name}`] = agg.mean;
        }
      }

      points.push({
        timestamp: result.timestamp,
        configName: result.config.name,
        score: result.overallScore,
        metricValues,
      });
    } catch {
      // Skip corrupt files
    }
  }

  points.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  return points;
}

export function detectRegressions(
  current: BenchmarkResult,
  previous: BenchmarkResult,
  threshold = 0.05,
): RegressionAlert[] {
  const alerts: RegressionAlert[] = [];

  for (const currentSuite of current.suites) {
    const prevSuite = previous.suites.find((s) => s.suite === currentSuite.suite);
    if (!prevSuite) continue;

    for (const [metricName, currentAgg] of Object.entries(currentSuite.aggregated)) {
      const prevAgg = prevSuite.aggregated[metricName];
      if (!prevAgg) continue;

      const delta = currentAgg.mean - prevAgg.mean;
      const isLowerBetter = metricName.includes('fpr') || metricName.includes('mae');

      const isRegression = isLowerBetter
        ? delta > threshold
        : delta < -threshold;

      if (isRegression) {
        alerts.push({
          metric: metricName,
          suite: currentSuite.suite,
          previousValue: prevAgg.mean,
          currentValue: currentAgg.mean,
          delta,
          configName: current.config.name,
        });
      }
    }
  }

  return alerts;
}

export function formatHistory(points: HistoryPoint[]): string {
  if (points.length === 0) return 'No history data found.';

  const lines: string[] = [];
  lines.push('');
  lines.push('SCORE HISTORY');
  lines.push('-'.repeat(60));

  for (const point of points) {
    const bar = '|'.repeat(Math.round(point.score * 40));
    lines.push(`  ${point.timestamp.substring(0, 19)}  ${point.configName.padEnd(25)}  ${(point.score * 100).toFixed(1)}%  ${bar}`);
  }

  lines.push('');
  return lines.join('\n');
}
