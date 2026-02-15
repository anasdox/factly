import { JudgeClient } from './judge-client';
import { MetricScore } from '../types';
import { EvaluatorConfig } from '../../config/types';

const COMPLETENESS_PROMPT = `You are an expert evaluator of output document quality.
Evaluate whether the output document covers all key recommendations and provides comprehensive coverage of the analysis results.

Rate on a scale of 1-5:
1 = Major recommendations are missing
2 = Several important recommendations are not covered
3 = Covers most but misses some recommendations
4 = Covers nearly all recommendations
5 = Complete coverage of all key recommendations

Respond in exactly this format:
SCORE: <number>
REASONING: <your explanation>`;

const TRACEABILITY_PROMPT = `You are an expert evaluator of output document quality.
Evaluate whether the output document properly traces its claims back to specific sources (facts, data points, citations) rather than making unsupported assertions.

Rate on a scale of 1-5:
1 = No traceability, all claims are unsupported
2 = Few claims are traced to sources
3 = Some claims have source references
4 = Most claims are traced to sources
5 = Excellent traceability with clear source references

Respond in exactly this format:
SCORE: <number>
REASONING: <your explanation>`;

export async function evaluateOutputCompleteness(
  output: string,
  recommendations: string[],
  config: EvaluatorConfig,
): Promise<MetricScore> {
  const client = new JudgeClient(config);
  const content = `Source recommendations:\n${recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}\n\nGenerated output:\n${output}`;
  return client.judge(COMPLETENESS_PROMPT, content, 'output_completeness');
}

export async function evaluateOutputTraceability(
  output: string,
  config: EvaluatorConfig,
): Promise<MetricScore> {
  const client = new JudgeClient(config);
  return client.judge(TRACEABILITY_PROMPT, `Generated output:\n${output}`, 'output_traceability');
}
