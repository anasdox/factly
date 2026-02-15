import * as fs from 'fs';
import * as path from 'path';
import { BenchmarkConfig, MatrixConfig, SuiteName, TargetConfig } from './types';

const VALID_SUITES: SuiteName[] = [
  'fact-extraction',
  'insight-extraction',
  'recommendation-extraction',
  'output-formulation',
  'dedup',
  'impact-check',
  'update-proposal',
  'pipeline',
];

export function loadConfig(configPath: string): BenchmarkConfig {
  const resolved = path.resolve(configPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Config file not found: ${resolved}`);
  }

  const raw = JSON.parse(fs.readFileSync(resolved, 'utf-8'));
  return validateConfig(raw);
}

function validateConfig(raw: any): BenchmarkConfig {
  if (!raw.name || typeof raw.name !== 'string') {
    throw new Error('Config must have a "name" string field');
  }

  const backendUrl = raw.backendUrl || 'http://localhost:3002';
  const runsPerCase = raw.runsPerCase || 1;

  const suites: SuiteName[] = raw.suites || ['fact-extraction'];
  for (const s of suites) {
    if (!VALID_SUITES.includes(s)) {
      throw new Error(`Invalid suite: "${s}". Valid: ${VALID_SUITES.join(', ')}`);
    }
  }

  if (!raw.target || typeof raw.target !== 'object') {
    throw new Error('Config must have a "target" object');
  }

  const target: TargetConfig = {
    provider: raw.target.provider || 'openai',
    model: raw.target.model || 'gpt-4o',
    tempExtraction: raw.target.tempExtraction ?? 0.2,
    tempDedup: raw.target.tempDedup ?? 0.1,
    tempImpact: raw.target.tempImpact ?? 0.1,
    tempProposal: raw.target.tempProposal ?? 0.3,
    embeddingsModel: raw.target.embeddingsModel,
    dedupThreshold: raw.target.dedupThreshold,
  };

  return {
    name: raw.name,
    description: raw.description,
    backendUrl,
    suites,
    runsPerCase,
    target,
    evaluator: raw.evaluator,
    matching: raw.matching || { method: 'string', threshold: 0.5 },
    timeoutMs: raw.timeoutMs || 60000,
  };
}

export function expandMatrix(matrixConfig: MatrixConfig): BenchmarkConfig[] {
  const { matrix, baseTarget, ...rest } = matrixConfig;
  const configs: BenchmarkConfig[] = [];

  const providers = matrix.provider || [baseTarget.provider];
  const models = matrix.model || [baseTarget.model];
  const tempExtractions = matrix.tempExtraction || [baseTarget.tempExtraction];
  const tempDedups = matrix.tempDedup || [baseTarget.tempDedup];
  const tempImpacts = matrix.tempImpact || [baseTarget.tempImpact];
  const tempProposals = matrix.tempProposal || [baseTarget.tempProposal];
  const embModels = matrix.embeddingsModel || [baseTarget.embeddingsModel];
  const dedupThresholds = matrix.dedupThreshold || [baseTarget.dedupThreshold];

  for (const provider of providers) {
    for (const model of models) {
      for (const tempExtraction of tempExtractions) {
        for (const tempDedup of tempDedups) {
          for (const tempImpact of tempImpacts) {
            for (const tempProposal of tempProposals) {
              for (const embeddingsModel of embModels) {
                for (const dedupThreshold of dedupThresholds) {
                  const target: TargetConfig = {
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
                    backendUrl: rest.backendUrl || 'http://localhost:3002',
                    runsPerCase: rest.runsPerCase || 1,
                    matching: rest.matching || { method: 'string', threshold: 0.6 },
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
