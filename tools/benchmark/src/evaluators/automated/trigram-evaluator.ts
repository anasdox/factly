import { MetricScore } from '../types';
import { DedupPair } from '../../datasets/types';

// Inline trigram functions (same logic as frontend dedup.ts)
function canonicalize(text: string): string {
  return text.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
}

function getTrigrams(text: string): Set<string> {
  const result = new Set<string>();
  const canon = canonicalize(text);
  for (let i = 0; i <= canon.length - 3; i++) {
    result.add(canon.substring(i, i + 3));
  }
  return result;
}

function trigramSimilarity(a: string, b: string): number {
  const triA = getTrigrams(a);
  const triB = getTrigrams(b);
  let intersection = 0;
  triA.forEach((t) => { if (triB.has(t)) intersection++; });
  const union = triA.size + triB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function evaluateTrigramDedup(
  pairs: DedupPair[],
  threshold = 0.75,
): MetricScore[] {
  let tp = 0, fp = 0, tn = 0, fn = 0;
  const scoreErrors: number[] = [];

  for (const pair of pairs) {
    const score = trigramSimilarity(pair.text_a, pair.text_b);
    const predicted = score >= threshold;

    if (predicted && pair.is_duplicate) tp++;
    else if (predicted && !pair.is_duplicate) fp++;
    else if (!predicted && pair.is_duplicate) fn++;
    else tn++;

    if (pair.expected_score_range) {
      const [lo, hi] = pair.expected_score_range;
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
    { name: 'trigram_tpr', value: tpr, type: 'auto' },
    { name: 'trigram_fpr', value: fpr, type: 'auto' },
    { name: 'trigram_precision', value: precision, type: 'auto' },
    { name: 'trigram_f1', value: f1, type: 'auto' },
    { name: 'trigram_score_mae', value: scoreMae, type: 'auto' },
  ];
}
