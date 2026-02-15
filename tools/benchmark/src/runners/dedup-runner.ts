import { BenchmarkConfig } from '../config/types';
import { HttpClient } from '../utils/http-client';
import { RunnerResult } from './types';
import { loadDedupPairs, loadDedupScanScenarios } from '../datasets/loader';

export async function runDedupCheck(config: BenchmarkConfig): Promise<RunnerResult[]> {
  const pairs = loadDedupPairs();
  if (pairs.length === 0) {
    console.warn('[dedup] No dedup pair cases found');
    return [];
  }

  const client = new HttpClient(config.backendUrl, config.timeoutMs);
  const results: RunnerResult[] = [];

  for (const pair of pairs) {
    for (let run = 0; run < config.runsPerCase; run++) {
      try {
        const response = await client.post('/dedup/check', {
          text: pair.text_a,
          candidates: [{ id: pair.id, text: pair.text_b }],
        });

        results.push({
          caseId: pair.id,
          suite: 'dedup',
          rawResponse: {
            ...response.data,
            _type: 'check',
            _gold: {
              is_duplicate: pair.is_duplicate,
              difficulty: pair.difficulty,
              expected_score_range: pair.expected_score_range,
            },
          },
          latencyMs: response.latencyMs,
        });
      } catch (err: any) {
        results.push({
          caseId: pair.id,
          suite: 'dedup',
          rawResponse: null,
          latencyMs: 0,
          error: err.message,
        });
      }
    }
  }

  return results;
}

export async function runDedupScan(config: BenchmarkConfig): Promise<RunnerResult[]> {
  const scenarios = loadDedupScanScenarios();
  if (scenarios.length === 0) {
    console.warn('[dedup] No dedup scan scenarios found');
    return [];
  }

  const client = new HttpClient(config.backendUrl, config.timeoutMs);
  const results: RunnerResult[] = [];

  for (const scenario of scenarios) {
    for (let run = 0; run < config.runsPerCase; run++) {
      try {
        const response = await client.post('/dedup/scan', {
          items: scenario.items,
        });

        results.push({
          caseId: scenario.id,
          suite: 'dedup',
          rawResponse: {
            ...response.data,
            _type: 'scan',
            _gold: { expected_groups: scenario.expected_groups },
          },
          latencyMs: response.latencyMs,
        });
      } catch (err: any) {
        results.push({
          caseId: scenario.id,
          suite: 'dedup',
          rawResponse: null,
          latencyMs: 0,
          error: err.message,
        });
      }
    }
  }

  return results;
}
