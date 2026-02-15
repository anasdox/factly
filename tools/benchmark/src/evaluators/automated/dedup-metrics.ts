import { MetricScore } from '../types';

export function computeDedupCheckMetrics(
  results: Array<{
    duplicates: Array<{ id: string; similarity: number }>;
    _gold: { is_duplicate: boolean; difficulty: string; expected_score_range?: [number, number] };
  }>,
): MetricScore[] {
  let tp = 0, fp = 0, tn = 0, fn = 0;
  let scoreErrors: number[] = [];

  for (const r of results) {
    const predicted = r.duplicates && r.duplicates.length > 0;
    const actual = r._gold.is_duplicate;

    if (predicted && actual) tp++;
    else if (predicted && !actual) fp++;
    else if (!predicted && actual) fn++;
    else tn++;

    if (r._gold.expected_score_range && r.duplicates && r.duplicates.length > 0) {
      const score = r.duplicates[0].similarity;
      const [lo, hi] = r._gold.expected_score_range;
      const midpoint = (lo + hi) / 2;
      scoreErrors.push(Math.abs(score - midpoint));
    }
  }

  const tpr = tp + fn > 0 ? tp / (tp + fn) : 0;
  const fpr = fp + tn > 0 ? fp / (fp + tn) : 0;
  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tpr;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
  const scoreMae = scoreErrors.length > 0
    ? scoreErrors.reduce((a, b) => a + b, 0) / scoreErrors.length
    : 0;

  return [
    { name: 'dedup_tpr', value: tpr, type: 'auto' },
    { name: 'dedup_fpr', value: fpr, type: 'auto' },
    { name: 'dedup_precision', value: precision, type: 'auto' },
    { name: 'dedup_recall', value: recall, type: 'auto' },
    { name: 'dedup_f1', value: f1, type: 'auto' },
    { name: 'dedup_score_mae', value: scoreMae, type: 'auto' },
  ];
}

export function computeAdjustedRandIndex(
  predictedGroups: string[][],
  expectedGroups: string[][],
): number {
  // Build label maps
  const allItems = new Set<string>();
  const predLabel: Record<string, number> = {};
  const trueLabel: Record<string, number> = {};

  predictedGroups.forEach((group, gi) => {
    group.forEach((id) => {
      allItems.add(id);
      predLabel[id] = gi;
    });
  });
  expectedGroups.forEach((group, gi) => {
    group.forEach((id) => {
      allItems.add(id);
      trueLabel[id] = gi;
    });
  });

  // Items not in any group get their own singleton label
  let nextPred = predictedGroups.length;
  let nextTrue = expectedGroups.length;
  for (const item of allItems) {
    if (predLabel[item] === undefined) predLabel[item] = nextPred++;
    if (trueLabel[item] === undefined) trueLabel[item] = nextTrue++;
  }

  const items = Array.from(allItems);
  const n = items.length;
  if (n < 2) return 1.0;

  // Count pair agreements
  let a = 0, b = 0, c = 0, d = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const samePred = predLabel[items[i]] === predLabel[items[j]];
      const sameTrue = trueLabel[items[i]] === trueLabel[items[j]];
      if (samePred && sameTrue) a++;
      else if (!samePred && !sameTrue) d++;
      else if (samePred && !sameTrue) b++;
      else c++;
    }
  }

  const totalPairs = n * (n - 1) / 2;
  const expected = ((a + b) * (a + c) + (c + d) * (b + d)) / totalPairs;
  const maxIndex = ((a + b) + (a + c)) / 2;
  const denominator = maxIndex - expected;

  if (denominator === 0) return 1.0;
  return (a - expected) / denominator;
}

export function computeDedupScanMetrics(
  predictedGroups: string[][],
  expectedGroups: string[][],
): MetricScore {
  const ari = computeAdjustedRandIndex(predictedGroups, expectedGroups);
  return { name: 'dedup_scan_ari', value: ari, type: 'auto' };
}
