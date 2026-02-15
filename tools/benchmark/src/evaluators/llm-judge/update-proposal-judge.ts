import { JudgeClient } from './judge-client';
import { MetricScore } from '../types';
import { EvaluatorConfig } from '../../config/types';

const SEMANTIC_CORRECTNESS_PROMPT = `You are an expert evaluator of update proposal quality.
Given the original text, the upstream change (old -> new), and the proposed updated text, evaluate whether the proposal correctly reflects the semantic impact of the upstream change.

Rate on a scale of 1-5:
1 = Proposal is wrong or introduces errors
2 = Proposal partially reflects the change but has significant issues
3 = Proposal reflects the change but with some inaccuracies
4 = Proposal correctly reflects the change with minor issues
5 = Proposal perfectly reflects the upstream change

Respond in exactly this format:
SCORE: <number>
REASONING: <your explanation>`;

const STYLE_PRESERVATION_PROMPT = `You are an expert evaluator of update proposal quality.
Compare the original text with the proposed updated text. Evaluate whether the proposal preserves the original tone, style, and approximate length.

Rate on a scale of 1-5:
1 = Completely different style/tone
2 = Significantly different style or length
3 = Somewhat different but recognizable
4 = Mostly preserves style with minor differences
5 = Perfectly preserves tone, style, and length

Respond in exactly this format:
SCORE: <number>
REASONING: <your explanation>`;

export async function evaluateSemanticCorrectness(
  currentText: string,
  upstreamOld: string,
  upstreamNew: string,
  proposedText: string,
  config: EvaluatorConfig,
): Promise<MetricScore> {
  const client = new JudgeClient(config);
  const content = `Original text: ${currentText}\nUpstream old: ${upstreamOld}\nUpstream new: ${upstreamNew}\nProposed update: ${proposedText}`;
  return client.judge(SEMANTIC_CORRECTNESS_PROMPT, content, 'proposal_semantic_correctness');
}

export async function evaluateStylePreservation(
  currentText: string,
  proposedText: string,
  config: EvaluatorConfig,
): Promise<MetricScore> {
  const client = new JudgeClient(config);
  const content = `Original text: ${currentText}\nProposed update: ${proposedText}`;
  return client.judge(STYLE_PRESERVATION_PROMPT, content, 'proposal_style_preservation');
}
