import { BenchmarkConfig } from '../config/types';
import { HttpClient } from '../utils/http-client';
import { RunnerResult } from './types';
import {
  loadFactExtractionCases,
  loadInsightExtractionCases,
  loadRecommendationExtractionCases,
  loadOutputFormulationCases,
} from '../datasets/loader';
import {
  FactExtractionCase,
  InsightExtractionCase,
  RecommendationExtractionCase,
  OutputFormulationCase,
} from '../datasets/types';

export async function runFactExtraction(config: BenchmarkConfig): Promise<RunnerResult[]> {
  const cases = loadFactExtractionCases();
  if (cases.length === 0) {
    console.warn('[fact-extraction] No dataset cases found');
    return [];
  }

  const client = new HttpClient(config.backendUrl, config.timeoutMs);
  const results: RunnerResult[] = [];

  for (const tc of cases) {
    for (let run = 0; run < config.runsPerCase; run++) {
      try {
        const response = await client.post('/extract/facts', {
          input_text: tc.input_text,
          goal: tc.goal,
          input_id: `benchmark-${tc.id}-run${run}`,
        });

        results.push({
          caseId: tc.id,
          suite: 'fact-extraction',
          rawResponse: { ...response.data, _gold: tc.gold_facts, _input_text: tc.input_text },
          latencyMs: response.latencyMs,
        });
      } catch (err: any) {
        results.push({
          caseId: tc.id,
          suite: 'fact-extraction',
          rawResponse: null,
          latencyMs: 0,
          error: err.message,
        });
      }
    }
  }

  return results;
}

export async function runInsightExtraction(config: BenchmarkConfig): Promise<RunnerResult[]> {
  const cases = loadInsightExtractionCases();
  if (cases.length === 0) {
    console.warn('[insight-extraction] No dataset cases found');
    return [];
  }

  const client = new HttpClient(config.backendUrl, config.timeoutMs);
  const results: RunnerResult[] = [];

  for (const tc of cases) {
    for (let run = 0; run < config.runsPerCase; run++) {
      try {
        const response = await client.post('/extract/insights', {
          facts: tc.facts,
          goal: tc.goal,
        });

        results.push({
          caseId: tc.id,
          suite: 'insight-extraction',
          rawResponse: { ...response.data, _gold: tc.gold_insights },
          latencyMs: response.latencyMs,
        });
      } catch (err: any) {
        results.push({
          caseId: tc.id,
          suite: 'insight-extraction',
          rawResponse: null,
          latencyMs: 0,
          error: err.message,
        });
      }
    }
  }

  return results;
}

export async function runRecommendationExtraction(config: BenchmarkConfig): Promise<RunnerResult[]> {
  const cases = loadRecommendationExtractionCases();
  if (cases.length === 0) {
    console.warn('[recommendation-extraction] No dataset cases found');
    return [];
  }

  const client = new HttpClient(config.backendUrl, config.timeoutMs);
  const results: RunnerResult[] = [];

  for (const tc of cases) {
    for (let run = 0; run < config.runsPerCase; run++) {
      try {
        const response = await client.post('/extract/recommendations', {
          insights: tc.insights,
          goal: tc.goal,
        });

        results.push({
          caseId: tc.id,
          suite: 'recommendation-extraction',
          rawResponse: { ...response.data, _gold: tc.gold_recommendations },
          latencyMs: response.latencyMs,
        });
      } catch (err: any) {
        results.push({
          caseId: tc.id,
          suite: 'recommendation-extraction',
          rawResponse: null,
          latencyMs: 0,
          error: err.message,
        });
      }
    }
  }

  return results;
}

export async function runOutputFormulation(config: BenchmarkConfig): Promise<RunnerResult[]> {
  const cases = loadOutputFormulationCases();
  if (cases.length === 0) {
    console.warn('[output-formulation] No dataset cases found');
    return [];
  }

  const client = new HttpClient(config.backendUrl, config.timeoutMs);
  const results: RunnerResult[] = [];

  for (const tc of cases) {
    for (let run = 0; run < config.runsPerCase; run++) {
      try {
        const response = await client.post('/extract/outputs', {
          recommendations: tc.recommendations,
          goal: tc.goal,
          output_type: tc.output_type,
        });

        results.push({
          caseId: tc.id,
          suite: 'output-formulation',
          rawResponse: { ...response.data, _gold: tc.gold_outputs },
          latencyMs: response.latencyMs,
        });
      } catch (err: any) {
        results.push({
          caseId: tc.id,
          suite: 'output-formulation',
          rawResponse: null,
          latencyMs: 0,
          error: err.message,
        });
      }
    }
  }

  return results;
}
