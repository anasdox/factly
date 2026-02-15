import { JudgeClient } from './judge-client';
import { MetricScore } from '../types';
import { EvaluatorConfig } from '../../config/types';

const EXPLANATION_QUALITY_PROMPT = `You are an expert evaluator of deduplication explanation quality.
Given two texts and the system's explanation of why they are (or are not) duplicates, evaluate the quality of the explanation.

Rate on a scale of 1-5:
1 = Explanation is wrong or incoherent
2 = Explanation is vague and unhelpful
3 = Explanation is partially correct but lacks detail
4 = Explanation is mostly accurate and clear
5 = Explanation is precise, accurate, and clearly identifies the semantic relationship

Respond in exactly this format:
SCORE: <number>
REASONING: <your explanation>`;

export async function evaluateDedupExplanation(
  textA: string,
  textB: string,
  explanation: string,
  isDuplicate: boolean,
  config: EvaluatorConfig,
): Promise<MetricScore> {
  const client = new JudgeClient(config);
  const content = `Text A: ${textA}\nText B: ${textB}\nSystem verdict: ${isDuplicate ? 'DUPLICATE' : 'NOT DUPLICATE'}\nSystem explanation: ${explanation}`;
  return client.judge(EXPLANATION_QUALITY_PROMPT, content, 'dedup_explanation_quality');
}
