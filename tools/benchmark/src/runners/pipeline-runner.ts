import { BenchmarkConfig } from '../config/types';
import { HttpClient } from '../utils/http-client';
import { RunnerResult } from './types';
import { loadPipelineCases } from '../datasets/loader';

export async function runPipeline(config: BenchmarkConfig): Promise<RunnerResult[]> {
  const cases = loadPipelineCases();
  if (cases.length === 0) {
    console.warn('[pipeline] No pipeline cases found');
    return [];
  }

  const client = new HttpClient(config.backendUrl, config.timeoutMs);
  const results: RunnerResult[] = [];

  for (const tc of cases) {
    for (let run = 0; run < config.runsPerCase; run++) {
      let totalLatency = 0;
      try {
        // Step 1: Extract facts
        const factsResp = await client.post('/extract/facts', {
          input_text: tc.input_text,
          goal: tc.goal,
          input_id: `pipeline-${tc.id}-run${run}`,
        });
        totalLatency += factsResp.latencyMs;
        const extractedFacts = factsResp.data.suggestions || [];

        // Step 2: Extract insights
        const factItems = extractedFacts.map((f: any, i: number) => ({
          fact_id: `f-${i}`,
          text: f.text,
        }));
        const insightsResp = await client.post('/extract/insights', {
          facts: factItems,
          goal: tc.goal,
        });
        totalLatency += insightsResp.latencyMs;
        const extractedInsights = insightsResp.data.suggestions || [];

        // Step 3: Extract recommendations
        const insightItems = extractedInsights.map((ins: any, i: number) => ({
          insight_id: `i-${i}`,
          text: ins.text,
        }));
        const recsResp = await client.post('/extract/recommendations', {
          insights: insightItems,
          goal: tc.goal,
        });
        totalLatency += recsResp.latencyMs;
        const extractedRecs = recsResp.data.suggestions || [];

        // Step 4: Formulate outputs
        const recItems = extractedRecs.map((r: any, i: number) => ({
          recommendation_id: `r-${i}`,
          text: r.text,
        }));
        const outputsResp = await client.post('/extract/outputs', {
          recommendations: recItems,
          goal: tc.goal,
          output_type: tc.output_type,
        });
        totalLatency += outputsResp.latencyMs;

        results.push({
          caseId: tc.id,
          suite: 'pipeline',
          rawResponse: {
            facts: factsResp.data,
            insights: insightsResp.data,
            recommendations: recsResp.data,
            outputs: outputsResp.data,
            _gold: {
              gold_facts: tc.gold_facts,
              gold_insights: tc.gold_insights,
              gold_recommendations: tc.gold_recommendations,
              gold_outputs: tc.gold_outputs,
            },
          },
          latencyMs: totalLatency,
        });
      } catch (err: any) {
        results.push({
          caseId: tc.id,
          suite: 'pipeline',
          rawResponse: null,
          latencyMs: totalLatency,
          error: err.message,
        });
      }
    }
  }

  return results;
}
