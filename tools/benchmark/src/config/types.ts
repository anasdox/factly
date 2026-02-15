export type SuiteName =
  | 'fact-extraction'
  | 'insight-extraction'
  | 'recommendation-extraction'
  | 'output-formulation'
  | 'dedup'
  | 'impact-check'
  | 'update-proposal'
  | 'pipeline';

export interface BenchmarkConfig {
  name: string;
  description?: string;
  backendUrl: string;
  suites: SuiteName[];
  runsPerCase: number;
  target: TargetConfig;
  evaluator?: EvaluatorConfig;
  matching?: MatchingConfig;
  timeoutMs?: number;
}

export interface TargetConfig {
  provider: string;
  model: string;
  tempExtraction: number;
  tempDedup: number;
  tempImpact: number;
  tempProposal: number;
  embeddingsModel?: string;
  dedupThreshold?: number;
}

export interface EvaluatorConfig {
  provider: string;
  model: string;
  apiKey?: string;
  baseUrl?: string;
}

export interface MatchingConfig {
  method: 'string' | 'embedding';
  threshold: number;
  embeddingsModel?: string;
}

export interface MatrixConfig extends Omit<BenchmarkConfig, 'target'> {
  matrix: {
    provider?: string[];
    model?: string[];
    tempExtraction?: number[];
    tempDedup?: number[];
    tempImpact?: number[];
    tempProposal?: number[];
    embeddingsModel?: string[];
    dedupThreshold?: number[];
  };
  baseTarget: TargetConfig;
}
