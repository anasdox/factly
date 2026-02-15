import * as fs from 'fs';
import * as path from 'path';
import {
  FactExtractionCase,
  InsightExtractionCase,
  RecommendationExtractionCase,
  OutputFormulationCase,
  DedupPair,
  DedupScanScenario,
  ImpactScenario,
  UpdateProposalScenario,
  PipelineCase,
} from './types';

const DATASETS_DIR = path.resolve(__dirname, '../../datasets');

function loadJsonFiles<T>(subdir: string): T[] {
  const dir = path.join(DATASETS_DIR, subdir);
  if (!fs.existsSync(dir)) {
    return [];
  }

  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
  const results: T[] = [];

  for (const file of files) {
    const content = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf-8'));
    if (Array.isArray(content)) {
      results.push(...content);
    } else {
      results.push(content);
    }
  }

  return results;
}

export function loadFactExtractionCases(): FactExtractionCase[] {
  return loadJsonFiles<FactExtractionCase>('fact-extraction');
}

export function loadInsightExtractionCases(): InsightExtractionCase[] {
  return loadJsonFiles<InsightExtractionCase>('insight-extraction');
}

export function loadRecommendationExtractionCases(): RecommendationExtractionCase[] {
  return loadJsonFiles<RecommendationExtractionCase>('recommendation-extraction');
}

export function loadOutputFormulationCases(): OutputFormulationCase[] {
  return loadJsonFiles<OutputFormulationCase>('output-formulation');
}

export function loadDedupPairs(): DedupPair[] {
  const filePath = path.join(DATASETS_DIR, 'dedup', 'known-duplicates.json');
  if (!fs.existsSync(filePath)) return [];
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

export function loadDedupScanScenarios(): DedupScanScenario[] {
  const filePath = path.join(DATASETS_DIR, 'dedup', 'scan-groups.json');
  if (!fs.existsSync(filePath)) return [];
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

export function loadImpactScenarios(): ImpactScenario[] {
  const filePath = path.join(DATASETS_DIR, 'impact', 'impact-scenarios.json');
  if (!fs.existsSync(filePath)) return [];
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

export function loadUpdateProposalScenarios(): UpdateProposalScenario[] {
  const filePath = path.join(DATASETS_DIR, 'update-proposal', 'update-scenarios.json');
  if (!fs.existsSync(filePath)) return [];
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

export function loadPipelineCases(): PipelineCase[] {
  return loadJsonFiles<PipelineCase>('pipeline');
}
