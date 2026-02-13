import { API_URL } from './config';

const TRIGRAM_LENGTH = 3;
const DEFAULT_DEDUP_THRESHOLD = 0.75;

export function canonicalize(text: string): string {
  return text.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
}

export function computeFingerprint(text: string): string {
  const canon = canonicalize(text);
  let hash = 5381;
  for (let i = 0; i < canon.length; i++) {
    hash = ((hash << 5) + hash + canon.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(16);
}

function getTrigrams(text: string): Set<string> {
  const result = new Set<string>();
  const canon = canonicalize(text);
  for (let i = 0; i <= canon.length - TRIGRAM_LENGTH; i++) {
    result.add(canon.substring(i, i + TRIGRAM_LENGTH));
  }
  return result;
}

export function trigramSimilarity(a: string, b: string): number {
  const triA = getTrigrams(a);
  const triB = getTrigrams(b);
  let intersection = 0;
  triA.forEach(t => { if (triB.has(t)) intersection++; });
  const union = triA.size + triB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export type DuplicateMatch = {
  id: string;
  text: string;
  similarity: number;
  explanation?: string;
};

export function findDuplicatesLocal(
  newText: string,
  existingItems: { id: string; text: string }[],
  threshold = DEFAULT_DEDUP_THRESHOLD,
): DuplicateMatch[] {
  return existingItems
    .map(item => ({
      id: item.id,
      text: item.text,
      similarity: trigramSimilarity(newText, item.text),
    }))
    .filter(m => m.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity);
}

export async function findDuplicates(
  newText: string,
  existingItems: { id: string; text: string }[],
  backendAvailable: boolean,
): Promise<DuplicateMatch[]> {
  if (existingItems.length === 0) return [];

  if (backendAvailable) {
    try {
      const response = await fetch(`${API_URL}/dedup/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: newText,
          candidates: existingItems.map(i => ({ id: i.id, text: i.text })),
        }),
      });
      if (response.ok) {
        const result = await response.json();
        return (result.duplicates || []).map((d: any) => ({
          id: d.id,
          text: existingItems.find(i => i.id === d.id)?.text || '',
          similarity: d.similarity,
          explanation: d.explanation,
        }));
      }
    } catch {
      // Fall through to local fallback
    }
  }

  return findDuplicatesLocal(newText, existingItems);
}
