import { BenchmarkConfig, TargetConfig } from '../config/types';
import { SuiteEvaluation } from '../evaluators/types';
import { CostEstimate } from '../utils/cost-tracker';

export interface BenchmarkResult {
  id: string;
  timestamp: string;
  config: BenchmarkConfig;
  target: TargetConfig;
  suites: SuiteEvaluation[];
  overallScore: number;
  totalLatencyMs: number;
  cost?: CostEstimate;
}

export interface ComparisonEntry {
  metric: string;
  values: Array<{
    configName: string;
    value: number;
    delta?: number;
  }>;
  bestConfigName: string;
}

export interface ComparisonResult {
  configs: string[];
  entries: ComparisonEntry[];
}

export interface HistoryPoint {
  timestamp: string;
  configName: string;
  score: number;
  metricValues: Record<string, number>;
}

export interface RegressionAlert {
  metric: string;
  suite: string;
  previousValue: number;
  currentValue: number;
  delta: number;
  configName: string;
}
