import { MetricScore } from '../types';

export function computeTraceabilityAccuracy(
  extracted: Array<{ related_fact_ids?: string[]; related_insight_ids?: string[] }>,
  gold: Array<{ source_facts?: number[]; source_insights?: number[] }>,
  sourceIds: string[],
): MetricScore {
  if (extracted.length === 0 || gold.length === 0) {
    return { name: 'traceability_accuracy', value: 0, type: 'auto' };
  }

  let totalJaccard = 0;
  const count = Math.min(extracted.length, gold.length);

  for (let i = 0; i < count; i++) {
    const ext = extracted[i];
    const g = gold[i];

    const extractedIds = new Set(ext.related_fact_ids || ext.related_insight_ids || []);
    const goldIndices = g.source_facts || g.source_insights || [];
    const goldIds = new Set(goldIndices.filter((n) => n >= 1 && n <= sourceIds.length).map((n) => sourceIds[n - 1]));

    let intersection = 0;
    extractedIds.forEach((id) => { if (goldIds.has(id)) intersection++; });
    const union = extractedIds.size + goldIds.size - intersection;
    totalJaccard += union === 0 ? 0 : intersection / union;
  }

  return { name: 'traceability_accuracy', value: totalJaccard / count, type: 'auto' };
}
