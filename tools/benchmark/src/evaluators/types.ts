export interface MetricScore {
  name: string;
  value: number;
  type: 'auto' | 'llm-judge';
  details?: string;
}

export interface CaseEvaluation {
  caseId: string;
  metrics: MetricScore[];
  error?: string;
}

export interface SuiteEvaluation {
  suite: string;
  cases: CaseEvaluation[];
  aggregated: AggregatedMetrics;
}

export interface AggregatedMetrics {
  [metricName: string]: {
    mean: number;
    stddev: number;
    min: number;
    max: number;
    count: number;
  };
}

export function aggregateMetrics(cases: CaseEvaluation[]): AggregatedMetrics {
  const byName: Record<string, number[]> = {};

  for (const c of cases) {
    for (const m of c.metrics) {
      if (!byName[m.name]) byName[m.name] = [];
      byName[m.name].push(m.value);
    }
  }

  const result: AggregatedMetrics = {};
  for (const [name, values] of Object.entries(byName)) {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
    result[name] = {
      mean,
      stddev: Math.sqrt(variance),
      min: Math.min(...values),
      max: Math.max(...values),
      count: values.length,
    };
  }

  return result;
}
