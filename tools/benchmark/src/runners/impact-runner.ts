import { BenchmarkConfig } from '../config/types';
import { HttpClient } from '../utils/http-client';
import { RunnerResult } from './types';
import { loadImpactScenarios } from '../datasets/loader';

export async function runImpactCheck(config: BenchmarkConfig): Promise<RunnerResult[]> {
  const scenarios = loadImpactScenarios();
  if (scenarios.length === 0) {
    console.warn('[impact-check] No impact scenarios found');
    return [];
  }

  const client = new HttpClient(config.backendUrl, config.timeoutMs);
  const results: RunnerResult[] = [];

  for (const scenario of scenarios) {
    for (let run = 0; run < config.runsPerCase; run++) {
      try {
        const response = await client.post('/check/impact', {
          old_text: scenario.old_text,
          new_text: scenario.new_text,
          children: scenario.children,
        });

        results.push({
          caseId: scenario.id,
          suite: 'impact-check',
          rawResponse: {
            ...response.data,
            _gold: { expected_impacts: scenario.expected_impacts },
          },
          latencyMs: response.latencyMs,
        });
      } catch (err: any) {
        results.push({
          caseId: scenario.id,
          suite: 'impact-check',
          rawResponse: null,
          latencyMs: 0,
          error: err.message,
        });
      }
    }
  }

  return results;
}
