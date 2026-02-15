import { MetricScore } from '../types';

export function computeImpactMetrics(
  predicted: Array<{ id: string; impacted: boolean }>,
  expected: Array<{ id: string; impacted: boolean }>,
): MetricScore[] {
  const expectedMap = new Map(expected.map((e) => [e.id, e.impacted]));

  let tp = 0, fp = 0, tn = 0, fn = 0;

  for (const p of predicted) {
    const actual = expectedMap.get(p.id);
    if (actual === undefined) continue;

    if (p.impacted && actual) tp++;
    else if (p.impacted && !actual) fp++;
    else if (!p.impacted && actual) fn++;
    else tn++;
  }

  const tpr = tp + fn > 0 ? tp / (tp + fn) : 0;
  const tnr = tn + fp > 0 ? tn / (tn + fp) : 0;
  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tpr;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  return [
    { name: 'impact_tpr', value: tpr, type: 'auto' },
    { name: 'impact_tnr', value: tnr, type: 'auto' },
    { name: 'impact_precision', value: precision, type: 'auto' },
    { name: 'impact_f1', value: f1, type: 'auto' },
  ];
}

export function computeValuePropagation(
  proposedText: string,
  expectedPresent: string[],
  expectedAbsent: string[],
): MetricScore[] {
  const normalized = proposedText.toLowerCase();

  let presentCount = 0;
  for (const v of expectedPresent) {
    if (normalized.includes(v.toLowerCase())) presentCount++;
  }

  let absentCount = 0;
  for (const v of expectedAbsent) {
    if (!normalized.includes(v.toLowerCase())) absentCount++;
  }

  const presentRate = expectedPresent.length > 0 ? presentCount / expectedPresent.length : 1.0;
  const absentRate = expectedAbsent.length > 0 ? absentCount / expectedAbsent.length : 1.0;

  return [
    { name: 'value_present_rate', value: presentRate, type: 'auto' },
    { name: 'value_absent_rate', value: absentRate, type: 'auto' },
  ];
}
