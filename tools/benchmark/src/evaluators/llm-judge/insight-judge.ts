import { JudgeClient } from './judge-client';
import { MetricScore } from '../types';
import { EvaluatorConfig } from '../../config/types';

const NON_TRIVIALITY_PROMPT = `You are an expert evaluator of insight quality.
Evaluate whether the insights go BEYOND simple reformulation of the input facts and provide genuine analytical value (cross-cutting patterns, implications, contradictions).

Rate on a scale of 1-5:
1 = All insights are just reformulations of individual facts
2 = Most insights are reformulations with minor additions
3 = Mix of trivial and genuinely analytical insights
4 = Most insights provide genuine analytical value
5 = All insights are non-trivial, revealing patterns or implications

Respond in exactly this format:
SCORE: <number>
REASONING: <your explanation>`;

const LOGICAL_VALIDITY_PROMPT = `You are an expert evaluator of insight quality.
Evaluate whether each insight is LOGICALLY DERIVABLE from the given facts without speculation or unsupported leaps.

Rate on a scale of 1-5:
1 = Most insights are speculative or unsupported
2 = Many insights contain unsupported claims
3 = Mix of well-supported and speculative insights
4 = Most insights are well-supported by the facts
5 = All insights are clearly derivable from the facts

Respond in exactly this format:
SCORE: <number>
REASONING: <your explanation>`;

export async function evaluateInsightNonTriviality(
  insights: string[],
  facts: string[],
  config: EvaluatorConfig,
): Promise<MetricScore> {
  const client = new JudgeClient(config);
  const content = `Source facts:\n${facts.map((f, i) => `${i + 1}. ${f}`).join('\n')}\n\nDerived insights:\n${insights.map((ins, i) => `${i + 1}. ${ins}`).join('\n')}`;
  return client.judge(NON_TRIVIALITY_PROMPT, content, 'insight_non_triviality');
}

export async function evaluateInsightValidity(
  insights: string[],
  facts: string[],
  config: EvaluatorConfig,
): Promise<MetricScore> {
  const client = new JudgeClient(config);
  const content = `Source facts:\n${facts.map((f, i) => `${i + 1}. ${f}`).join('\n')}\n\nDerived insights:\n${insights.map((ins, i) => `${i + 1}. ${ins}`).join('\n')}`;
  return client.judge(LOGICAL_VALIDITY_PROMPT, content, 'insight_logical_validity');
}
