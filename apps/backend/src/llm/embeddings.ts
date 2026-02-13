import { LLMProvider } from './provider';
import { DedupResult, DedupGroup } from './prompts';

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

export async function embeddingCheckDuplicates(
  provider: LLMProvider,
  text: string,
  candidates: { id: string; text: string }[],
  threshold: number,
): Promise<DedupResult[]> {
  const allTexts = [text, ...candidates.map((c) => c.text)];
  const embeddings = await provider.getEmbeddings!(allTexts);
  const queryVec = embeddings[0];

  const matches: { idx: number; similarity: number }[] = [];
  for (let i = 0; i < candidates.length; i++) {
    const sim = cosineSimilarity(queryVec, embeddings[i + 1]);
    console.log(`[embedding-dedup] check: candidate "${candidates[i].id}" cosine=${sim.toFixed(4)} threshold=${threshold}`);
    if (sim >= threshold) {
      matches.push({ idx: i, similarity: sim });
    }
  }

  if (matches.length === 0) {
    return [];
  }

  // Get LLM explanations only for matches above threshold
  const matchCandidates = matches.map((m) => candidates[m.idx]);
  const explanations = await provider.checkDuplicates(text, matchCandidates);

  const explanationMap = new Map<string, string>();
  for (const e of explanations) {
    explanationMap.set(e.id, e.explanation);
  }

  return matches.map((m) => ({
    id: candidates[m.idx].id,
    similarity: m.similarity,
    explanation: explanationMap.get(candidates[m.idx].id) || '',
  }));
}

export async function embeddingScanDuplicates(
  provider: LLMProvider,
  items: { id: string; text: string }[],
  threshold: number,
): Promise<DedupGroup[]> {
  const texts = items.map((item) => item.text);
  const embeddings = await provider.getEmbeddings!(texts);

  // Union-Find for grouping
  const parent = items.map((_, i) => i);
  function find(x: number): number {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  }
  function union(a: number, b: number): void {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  }

  // Pairwise cosine similarity
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const sim = cosineSimilarity(embeddings[i], embeddings[j]);
      console.log(`[embedding-dedup] scan: "${items[i].id}" vs "${items[j].id}" cosine=${sim.toFixed(4)} threshold=${threshold}`);
      if (sim >= threshold) {
        union(i, j);
      }
    }
  }

  // Collect groups
  const groupMap = new Map<number, number[]>();
  for (let i = 0; i < items.length; i++) {
    const root = find(i);
    const arr = groupMap.get(root);
    if (arr) {
      arr.push(i);
    } else {
      groupMap.set(root, [i]);
    }
  }

  // Filter to groups with 2+ members
  const groups: { indices: number[] }[] = [];
  groupMap.forEach((indices) => {
    if (indices.length >= 2) {
      groups.push({ indices });
    }
  });

  if (groups.length === 0) {
    return [];
  }

  // Get LLM explanations per group
  const results: DedupGroup[] = [];
  for (const group of groups) {
    const groupItems = group.indices.map((i) => items[i]);
    const llmGroups = await provider.scanDuplicates(groupItems);
    const explanation = llmGroups.length > 0 ? llmGroups[0].explanation : '';
    results.push({
      items: groupItems,
      explanation,
    });
  }

  return results;
}
