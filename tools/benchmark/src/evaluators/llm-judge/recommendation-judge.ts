import { JudgeClient } from './judge-client';
import { MetricScore } from '../types';
import { EvaluatorConfig } from '../../config/types';

const ACTIONABILITY_PROMPT = `You are an expert evaluator of recommendation quality.
Evaluate whether each recommendation is ACTIONABLE: it describes a specific, concrete action that can be implemented (not vague or generic advice).

Rate on a scale of 1-5:
1 = Most recommendations are vague or generic
2 = Many recommendations lack specificity
3 = Mix of actionable and vague recommendations
4 = Most recommendations are specific and actionable
5 = All recommendations are concrete, specific, and actionable

Respond in exactly this format:
SCORE: <number>
REASONING: <your explanation>`;

const RELEVANCE_PROMPT = `You are an expert evaluator of recommendation quality.
Given the research goal and the source insights, evaluate whether each recommendation is RELEVANT and aligned with the research objective.

Rate on a scale of 1-5:
1 = Most recommendations are off-topic or irrelevant
2 = Many recommendations diverge from the goal
3 = Mix of relevant and tangential recommendations
4 = Most recommendations are well-aligned with the goal
5 = All recommendations directly address the research goal

Respond in exactly this format:
SCORE: <number>
REASONING: <your explanation>`;

export async function evaluateActionability(
  recommendations: string[],
  config: EvaluatorConfig,
): Promise<MetricScore> {
  const client = new JudgeClient(config);
  const content = `Recommendations:\n${recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}`;
  return client.judge(ACTIONABILITY_PROMPT, content, 'recommendation_actionability');
}

export async function evaluateRelevance(
  recommendations: string[],
  insights: string[],
  goal: string,
  config: EvaluatorConfig,
): Promise<MetricScore> {
  const client = new JudgeClient(config);
  const content = `Research goal: ${goal}\n\nSource insights:\n${insights.map((ins, i) => `${i + 1}. ${ins}`).join('\n')}\n\nRecommendations:\n${recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}`;
  return client.judge(RELEVANCE_PROMPT, content, 'recommendation_relevance');
}
