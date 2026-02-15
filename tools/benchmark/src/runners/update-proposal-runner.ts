import { BenchmarkConfig } from '../config/types';
import { HttpClient } from '../utils/http-client';
import { RunnerResult } from './types';
import { loadUpdateProposalScenarios } from '../datasets/loader';

export async function runUpdateProposal(config: BenchmarkConfig): Promise<RunnerResult[]> {
  const scenarios = loadUpdateProposalScenarios();
  if (scenarios.length === 0) {
    console.warn('[update-proposal] No update proposal scenarios found');
    return [];
  }

  const client = new HttpClient(config.backendUrl, config.timeoutMs);
  const results: RunnerResult[] = [];

  for (const scenario of scenarios) {
    for (let run = 0; run < config.runsPerCase; run++) {
      try {
        const response = await client.post('/propose/update', {
          entity_type: scenario.entity_type,
          current_text: scenario.current_text,
          upstream_change: {
            old_text: scenario.upstream_old_text,
            new_text: scenario.upstream_new_text,
            entity_type: scenario.upstream_entity_type,
          },
          goal: scenario.goal,
          output_type: scenario.output_type,
        });

        results.push({
          caseId: scenario.id,
          suite: 'update-proposal',
          rawResponse: {
            ...response.data,
            _gold: {
              expected_values_present: scenario.expected_values_present,
              expected_values_absent: scenario.expected_values_absent,
            },
          },
          latencyMs: response.latencyMs,
        });
      } catch (err: any) {
        results.push({
          caseId: scenario.id,
          suite: 'update-proposal',
          rawResponse: null,
          latencyMs: 0,
          error: err.message,
        });
      }
    }
  }

  return results;
}
