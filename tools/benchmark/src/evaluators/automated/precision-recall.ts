import { MetricScore } from '../types';

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
}

function stringSimilarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);

  if (na === nb) return 1.0;

  // Trigram-based Jaccard similarity
  const triLen = 3;
  const triA = new Set<string>();
  const triB = new Set<string>();
  for (let i = 0; i <= na.length - triLen; i++) triA.add(na.substring(i, i + triLen));
  for (let i = 0; i <= nb.length - triLen; i++) triB.add(nb.substring(i, i + triLen));

  let intersection = 0;
  triA.forEach((t) => { if (triB.has(t)) intersection++; });
  const union = triA.size + triB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function computePrecisionRecallF1(
  extracted: string[],
  gold: string[],
  threshold = 0.6,
): MetricScore[] {
  if (gold.length === 0 && extracted.length === 0) {
    return [
      { name: 'precision', value: 1.0, type: 'auto' },
      { name: 'recall', value: 1.0, type: 'auto' },
      { name: 'f1', value: 1.0, type: 'auto' },
    ];
  }

  if (extracted.length === 0) {
    return [
      { name: 'precision', value: 0, type: 'auto' },
      { name: 'recall', value: 0, type: 'auto' },
      { name: 'f1', value: 0, type: 'auto' },
    ];
  }

  if (gold.length === 0) {
    return [
      { name: 'precision', value: 0, type: 'auto' },
      { name: 'recall', value: 1.0, type: 'auto' },
      { name: 'f1', value: 0, type: 'auto' },
    ];
  }

  // Greedy bipartite matching
  const goldMatched = new Set<number>();
  let truePositives = 0;

  for (const ext of extracted) {
    let bestScore = 0;
    let bestIdx = -1;
    for (let gi = 0; gi < gold.length; gi++) {
      if (goldMatched.has(gi)) continue;
      const score = stringSimilarity(ext, gold[gi]);
      if (score > bestScore) {
        bestScore = score;
        bestIdx = gi;
      }
    }
    if (bestScore >= threshold && bestIdx >= 0) {
      truePositives++;
      goldMatched.add(bestIdx);
    }
  }

  const precision = truePositives / extracted.length;
  const recall = truePositives / gold.length;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  return [
    { name: 'precision', value: precision, type: 'auto' },
    { name: 'recall', value: recall, type: 'auto' },
    { name: 'f1', value: f1, type: 'auto' },
  ];
}

export function computeSourceAnchoring(
  facts: Array<{ text: string; source_excerpt?: string }>,
  inputText: string,
): MetricScore {
  if (facts.length === 0) {
    return { name: 'source_anchoring', value: 1.0, type: 'auto' };
  }

  let anchored = 0;
  const normalizedInput = normalize(inputText);

  for (const fact of facts) {
    if (!fact.source_excerpt) continue;
    const normalizedExcerpt = normalize(fact.source_excerpt);
    if (normalizedInput.includes(normalizedExcerpt)) {
      anchored++;
    }
  }

  const factsWithExcerpt = facts.filter((f) => f.source_excerpt).length;
  const value = factsWithExcerpt === 0 ? 0 : anchored / factsWithExcerpt;

  return { name: 'source_anchoring', value, type: 'auto' };
}
