import { JudgeClient } from './judge-client';
import { MetricScore } from '../types';
import { EvaluatorConfig } from '../../config/types';

const ATOMICITY_PROMPT = `You are an expert evaluator of fact extraction quality.
Evaluate whether each extracted fact is ATOMIC: it contains exactly one factual claim, not multiple claims combined.

Rate on a scale of 1-5:
1 = Most facts contain multiple claims
2 = Many facts contain multiple claims
3 = Mix of atomic and multi-claim facts
4 = Most facts are atomic
5 = All facts are atomic single claims

Respond in exactly this format:
SCORE: <number>
REASONING: <your explanation>`;

const NON_FACT_RATE_PROMPT = `You are an expert evaluator of fact extraction quality.
Evaluate what fraction of the extracted items are NOT objective facts but rather opinions, interpretations, or subjective statements.

Rate on a scale of 1-5:
1 = Most items are opinions/interpretations (>60%)
2 = Many items are opinions/interpretations (40-60%)
3 = Some items are opinions/interpretations (20-40%)
4 = Few items are opinions/interpretations (5-20%)
5 = Almost all items are objective facts (<5% opinions)

Respond in exactly this format:
SCORE: <number>
REASONING: <your explanation>`;

export async function evaluateFactAtomicity(
  facts: string[],
  config: EvaluatorConfig,
): Promise<MetricScore> {
  const client = new JudgeClient(config);
  const content = `Extracted facts:\n${facts.map((f, i) => `${i + 1}. ${f}`).join('\n')}`;
  return client.judge(ATOMICITY_PROMPT, content, 'fact_atomicity');
}

export async function evaluateNonFactRate(
  facts: string[],
  config: EvaluatorConfig,
): Promise<MetricScore> {
  const client = new JudgeClient(config);
  const content = `Extracted items:\n${facts.map((f, i) => `${i + 1}. ${f}`).join('\n')}`;
  return client.judge(NON_FACT_RATE_PROMPT, content, 'non_fact_rate');
}
