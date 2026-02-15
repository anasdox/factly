import { SuiteName, BenchmarkConfig } from './config/types';
import { RunnerResult } from './runners/types';
import { SuiteEvaluation, CaseEvaluation, MetricScore, aggregateMetrics } from './evaluators/types';
import { computePrecisionRecallF1, computeSourceAnchoring } from './evaluators/automated/precision-recall';
import { computeTraceabilityAccuracy } from './evaluators/automated/traceability';
import { computeDedupCheckMetrics, computeDedupScanMetrics } from './evaluators/automated/dedup-metrics';
import { computeImpactMetrics, computeValuePropagation } from './evaluators/automated/impact-metrics';
import { evaluateMarkdownStructure } from './evaluators/automated/structural';
import { evaluateFactAtomicity, evaluateNonFactRate } from './evaluators/llm-judge/fact-judge';
import { evaluateInsightNonTriviality, evaluateInsightValidity } from './evaluators/llm-judge/insight-judge';
import { evaluateActionability, evaluateRelevance } from './evaluators/llm-judge/recommendation-judge';
import { evaluateOutputCompleteness, evaluateOutputTraceability } from './evaluators/llm-judge/output-judge';
import { evaluateDedupExplanation } from './evaluators/llm-judge/dedup-judge';
import { evaluateSemanticCorrectness, evaluateStylePreservation } from './evaluators/llm-judge/update-proposal-judge';

export async function evaluateSuite(
  suite: SuiteName,
  results: RunnerResult[],
  config: BenchmarkConfig,
): Promise<SuiteEvaluation> {
  const successResults = results.filter((r) => !r.error && r.rawResponse);
  const cases: CaseEvaluation[] = [];

  for (const r of successResults) {
    const metrics = await evaluateCase(suite, r, config);
    cases.push({ caseId: r.caseId, metrics });
  }

  // Add error cases
  for (const r of results.filter((r) => r.error)) {
    cases.push({ caseId: r.caseId, metrics: [], error: r.error });
  }

  return {
    suite,
    cases,
    aggregated: aggregateMetrics(cases),
  };
}

async function evaluateCase(
  suite: SuiteName,
  result: RunnerResult,
  config: BenchmarkConfig,
): Promise<MetricScore[]> {
  switch (suite) {
    case 'fact-extraction':
      return evaluateFactExtraction(result, config);
    case 'insight-extraction':
      return evaluateInsightExtraction(result, config);
    case 'recommendation-extraction':
      return evaluateRecommendationExtraction(result, config);
    case 'output-formulation':
      return evaluateOutputFormulation(result, config);
    case 'dedup':
      return evaluateDedup(result, config);
    case 'impact-check':
      return evaluateImpact(result);
    case 'update-proposal':
      return evaluateUpdateProposal(result, config);
    case 'pipeline':
      return evaluatePipeline(result, config);
    default:
      return [];
  }
}

async function evaluateFactExtraction(result: RunnerResult, config: BenchmarkConfig): Promise<MetricScore[]> {
  const data = result.rawResponse;
  const extracted = (data.suggestions || []).map((s: any) => s.text);
  const gold = (data._gold || []).map((g: any) => g.text);
  const threshold = config.matching?.threshold ?? 0.5;

  const metrics = computePrecisionRecallF1(extracted, gold, threshold);

  // Source anchoring
  if (data._input_text) {
    const anchoring = computeSourceAnchoring(data.suggestions || [], data._input_text);
    metrics.push(anchoring);
  }

  // LLM-judge evaluations
  if (config.evaluator && extracted.length > 0) {
    const [atomicity, nonFactRate] = await Promise.all([
      evaluateFactAtomicity(extracted, config.evaluator),
      evaluateNonFactRate(extracted, config.evaluator),
    ]);
    metrics.push(atomicity, nonFactRate);
  }

  return metrics;
}

async function evaluateInsightExtraction(result: RunnerResult, config: BenchmarkConfig): Promise<MetricScore[]> {
  const data = result.rawResponse;
  const extracted = (data.suggestions || []).map((s: any) => s.text);
  const gold = (data._gold || []).map((g: any) => g.text);
  const threshold = config.matching?.threshold ?? 0.5;

  const metrics = computePrecisionRecallF1(extracted, gold, threshold);

  // Traceability
  if (data._gold && data.suggestions && data.fact_ids) {
    const traceability = computeTraceabilityAccuracy(
      data.suggestions,
      data._gold,
      data.fact_ids,
    );
    metrics.push(traceability);
  }

  // LLM-judge evaluations
  if (config.evaluator && extracted.length > 0) {
    const facts = (data._input_facts || []).map((f: any) => f.text || f);
    const [nonTriviality, validity] = await Promise.all([
      evaluateInsightNonTriviality(extracted, facts, config.evaluator),
      evaluateInsightValidity(extracted, facts, config.evaluator),
    ]);
    metrics.push(nonTriviality, validity);
  }

  return metrics;
}

async function evaluateRecommendationExtraction(result: RunnerResult, config: BenchmarkConfig): Promise<MetricScore[]> {
  const data = result.rawResponse;
  const extracted = (data.suggestions || []).map((s: any) => s.text);
  const gold = (data._gold || []).map((g: any) => g.text);
  const threshold = config.matching?.threshold ?? 0.5;

  const metrics = computePrecisionRecallF1(extracted, gold, threshold);

  // Traceability
  if (data._gold && data.suggestions && data.insight_ids) {
    const traceability = computeTraceabilityAccuracy(
      data.suggestions,
      data._gold,
      data.insight_ids,
    );
    metrics.push(traceability);
  }

  // LLM-judge evaluations
  if (config.evaluator && extracted.length > 0) {
    const insights = (data._input_insights || []).map((i: any) => i.text || i);
    const goal = data._goal || '';
    const [actionability, relevance] = await Promise.all([
      evaluateActionability(extracted, config.evaluator),
      evaluateRelevance(extracted, insights, goal, config.evaluator),
    ]);
    metrics.push(actionability, relevance);
  }

  return metrics;
}

async function evaluateOutputFormulation(result: RunnerResult, config: BenchmarkConfig): Promise<MetricScore[]> {
  const data = result.rawResponse;
  const extracted = (data.suggestions || []).map((s: any) => s.text);
  const gold = (data._gold || []).map((g: any) => g.text);
  const threshold = config.matching?.threshold ?? 0.5;

  const metrics = computePrecisionRecallF1(extracted, gold, threshold);

  // Structural evaluation on first output
  if (extracted.length > 0) {
    const structural = evaluateMarkdownStructure(extracted[0], 'report');
    metrics.push(...structural);
  }

  // LLM-judge evaluations
  if (config.evaluator && extracted.length > 0) {
    const recommendations = (data._input_recommendations || []).map((r: any) => r.text || r);
    const [completeness, traceability] = await Promise.all([
      evaluateOutputCompleteness(extracted[0], recommendations, config.evaluator),
      evaluateOutputTraceability(extracted[0], config.evaluator),
    ]);
    metrics.push(completeness, traceability);
  }

  return metrics;
}

async function evaluateDedup(result: RunnerResult, config: BenchmarkConfig): Promise<MetricScore[]> {
  const data = result.rawResponse;

  if (data._type === 'check') {
    const autoMetrics = computeDedupCheckMetrics([{
      duplicates: data.duplicates || [],
      _gold: data._gold,
    }]);

    // LLM-judge on explanation quality
    if (config.evaluator && data._gold && data.explanation) {
      const explanationScore = await evaluateDedupExplanation(
        data._gold.text_a || '',
        data._gold.text_b || '',
        data.explanation || '',
        data._gold.is_duplicate || false,
        config.evaluator,
      );
      autoMetrics.push(explanationScore);
    }

    return autoMetrics;
  }

  if (data._type === 'scan') {
    const predictedGroups = (data.groups || []).map((g: any) =>
      (g.members || g.items || []).map((m: any) => typeof m === 'string' ? m : m.id)
    );
    const expectedGroups = data._gold?.expected_groups || [];
    return [computeDedupScanMetrics(predictedGroups, expectedGroups)];
  }

  return [];
}

function evaluateImpact(result: RunnerResult): MetricScore[] {
  const data = result.rawResponse;
  const predicted = data.impacted || [];
  const expected = data._gold?.expected_impacts || [];

  return computeImpactMetrics(predicted, expected);
}

async function evaluateUpdateProposal(result: RunnerResult, config: BenchmarkConfig): Promise<MetricScore[]> {
  const data = result.rawResponse;
  const proposedText = data.proposed_text || '';
  const expectedPresent = data._gold?.expected_values_present || [];
  const expectedAbsent = data._gold?.expected_values_absent || [];

  const metrics = computeValuePropagation(proposedText, expectedPresent, expectedAbsent);

  // LLM-judge evaluations
  if (config.evaluator && proposedText) {
    const [semanticCorrectness, stylePreservation] = await Promise.all([
      evaluateSemanticCorrectness(
        data._gold?.current_text || '',
        data._gold?.upstream_old || '',
        data._gold?.upstream_new || '',
        proposedText,
        config.evaluator,
      ),
      evaluateStylePreservation(
        data._gold?.current_text || '',
        proposedText,
        config.evaluator,
      ),
    ]);
    metrics.push(semanticCorrectness, stylePreservation);
  }

  return metrics;
}

function evaluatePipeline(result: RunnerResult, config?: BenchmarkConfig): MetricScore[] {
  const data = result.rawResponse;
  if (!data) return [];
  const threshold = config?.matching?.threshold ?? 0.5;

  const metrics: MetricScore[] = [];

  // Facts
  if (data.facts && data._gold?.gold_facts) {
    const extracted = (data.facts.suggestions || []).map((s: any) => s.text);
    const gold = data._gold.gold_facts.map((g: any) => g.text);
    const factMetrics = computePrecisionRecallF1(extracted, gold, threshold);
    metrics.push(...factMetrics.map((m) => ({ ...m, name: `pipeline_facts_${m.name}` })));
  }

  // Insights
  if (data.insights && data._gold?.gold_insights) {
    const extracted = (data.insights.suggestions || []).map((s: any) => s.text);
    const gold = data._gold.gold_insights.map((g: any) => g.text);
    const insightMetrics = computePrecisionRecallF1(extracted, gold, threshold);
    metrics.push(...insightMetrics.map((m) => ({ ...m, name: `pipeline_insights_${m.name}` })));
  }

  // Recommendations
  if (data.recommendations && data._gold?.gold_recommendations) {
    const extracted = (data.recommendations.suggestions || []).map((s: any) => s.text);
    const gold = data._gold.gold_recommendations.map((g: any) => g.text);
    const recMetrics = computePrecisionRecallF1(extracted, gold, threshold);
    metrics.push(...recMetrics.map((m) => ({ ...m, name: `pipeline_recs_${m.name}` })));
  }

  return metrics;
}
