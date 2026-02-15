import { BenchmarkConfig, SuiteName } from '../config/types';

export interface RunnerResult {
  caseId: string;
  suite: SuiteName;
  rawResponse: any;
  latencyMs: number;
  error?: string;
}

export interface BenchmarkRunner {
  suite: SuiteName;
  run(config: BenchmarkConfig): Promise<RunnerResult[]>;
}
