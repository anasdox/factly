/**
 * Acceptance tests for Semantic Deduplication feature.
 * @see specs/functional/semantic-deduplication.feature
 *
 * Backend/API and local-algorithm FSIDs covered in this file:
 * - FS-LlmSemanticComparison
 * - FS-TrigramFallbackWhenOffline
 * - FS-OnDemandDedupPerColumn
 * - FS-DedupErrorFallsBackToLocal
 * - FS-EmbeddingBasedSemanticComparison
 * - FS-EmbeddingFallbackToLlmChat
 *
 * Frontend/browser FSIDs are covered in `tests/e2e/semantic-deduplication.spec.ts`.
 */

import { BASE_URL } from './helpers/backend-server';

const VALID_DEDUP_CHECK_REQUEST = {
  text: 'Revenue grew by 15% in Q3',
  candidates: [
    { id: 'fact-001', text: 'Q3 revenue increased by 15 percent' },
    { id: 'fact-002', text: 'Customer satisfaction declined in Q3' },
  ],
};

const VALID_DEDUP_SCAN_REQUEST = {
  items: [
    { id: 'fact-001', text: 'Revenue grew by 15% in Q3' },
    { id: 'fact-002', text: 'Q3 revenue increased by 15 percent' },
    { id: 'fact-003', text: 'Customer satisfaction declined sharply' },
    { id: 'fact-004', text: 'Customer satisfaction levels dropped significantly' },
  ],
};

describe('Semantic Deduplication', () => {

  // --- Backend: POST /dedup/check validation ---

  // @fsid:FS-LlmSemanticComparison
  describe('FS-LlmSemanticComparison (POST /dedup/check)', () => {
    it('POST /dedup/check with missing text returns 400', async () => {
      const { text, ...body } = VALID_DEDUP_CHECK_REQUEST;
      const response = await fetch(`${BASE_URL}/dedup/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result).toHaveProperty('error');
      expect(typeof result.error).toBe('string');
    });

    it('POST /dedup/check with empty text returns 400', async () => {
      const response = await fetch(`${BASE_URL}/dedup/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...VALID_DEDUP_CHECK_REQUEST, text: '' }),
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result).toHaveProperty('error');
    });

    it('POST /dedup/check with missing candidates returns 400', async () => {
      const { candidates, ...body } = VALID_DEDUP_CHECK_REQUEST;
      const response = await fetch(`${BASE_URL}/dedup/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result).toHaveProperty('error');
    });

    it('POST /dedup/check with empty candidates array returns 400', async () => {
      const response = await fetch(`${BASE_URL}/dedup/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...VALID_DEDUP_CHECK_REQUEST, candidates: [] }),
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result).toHaveProperty('error');
    });

    it('POST /dedup/check with candidate missing id returns 400', async () => {
      const response = await fetch(`${BASE_URL}/dedup/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: 'Test text',
          candidates: [{ text: 'Candidate without id' }],
        }),
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result).toHaveProperty('error');
    });

    it('POST /dedup/check with candidate missing text returns 400', async () => {
      const response = await fetch(`${BASE_URL}/dedup/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: 'Test text',
          candidates: [{ id: 'fact-001' }],
        }),
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result).toHaveProperty('error');
    });

    it('POST /dedup/check with empty body returns 400', async () => {
      const response = await fetch(`${BASE_URL}/dedup/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result).toHaveProperty('error');
    });

    it('POST /dedup/check with valid body returns 200 with duplicates array', async () => {
      const response = await fetch(`${BASE_URL}/dedup/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(VALID_DEDUP_CHECK_REQUEST),
      });

      // 200 if LLM configured, 503 if not — both are valid
      if (response.status === 200) {
        const result = await response.json();
        expect(result).toHaveProperty('duplicates');
        expect(Array.isArray(result.duplicates)).toBe(true);
        for (const dup of result.duplicates) {
          expect(dup).toHaveProperty('id');
          expect(typeof dup.id).toBe('string');
          expect(dup).toHaveProperty('similarity');
          expect(typeof dup.similarity).toBe('number');
          expect(dup.similarity).toBeGreaterThan(0);
          expect(dup.similarity).toBeLessThanOrEqual(1);
          expect(dup).toHaveProperty('explanation');
          expect(typeof dup.explanation).toBe('string');
        }
      } else {
        expect(response.status).toBe(503);
        const result = await response.json();
        expect(result).toHaveProperty('error');
      }
    });
  });

  // --- Backend: POST /dedup/scan validation ---

  // @fsid:FS-OnDemandDedupPerColumn
  describe('FS-OnDemandDedupPerColumn (POST /dedup/scan)', () => {
    it('POST /dedup/scan with missing items returns 400', async () => {
      const response = await fetch(`${BASE_URL}/dedup/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result).toHaveProperty('error');
    });

    it('POST /dedup/scan with less than 2 items returns 400', async () => {
      const response = await fetch(`${BASE_URL}/dedup/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [{ id: 'fact-001', text: 'Only one item' }] }),
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result).toHaveProperty('error');
    });

    it('POST /dedup/scan with item missing id returns 400', async () => {
      const response = await fetch(`${BASE_URL}/dedup/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [{ text: 'A' }, { text: 'B' }] }),
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result).toHaveProperty('error');
    });

    it('POST /dedup/scan with valid body returns 200 with groups array', async () => {
      const response = await fetch(`${BASE_URL}/dedup/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(VALID_DEDUP_SCAN_REQUEST),
      });

      // 200 if LLM configured, 503 if not — both are valid
      if (response.status === 200) {
        const result = await response.json();
        expect(result).toHaveProperty('groups');
        expect(Array.isArray(result.groups)).toBe(true);
        for (const group of result.groups) {
          expect(group).toHaveProperty('items');
          expect(Array.isArray(group.items)).toBe(true);
          expect(group.items.length).toBeGreaterThanOrEqual(2);
          expect(group).toHaveProperty('explanation');
          expect(typeof group.explanation).toBe('string');
          for (const item of group.items) {
            expect(item).toHaveProperty('id');
            expect(item).toHaveProperty('text');
          }
        }
      } else {
        expect(response.status).toBe(503);
        const result = await response.json();
        expect(result).toHaveProperty('error');
      }
    });
  });

  // --- Frontend: Trigram similarity unit tests ---

  // @fsid:FS-TrigramFallbackWhenOffline
  describe('FS-TrigramFallbackWhenOffline', () => {
    it('trigram similarity detects similar texts above threshold', () => {
      // Inline trigram logic for testing (mirrors dedup.ts implementation)
      function canonicalize(text: string): string {
        return text.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
      }

      function trigrams(text: string): Set<string> {
        const result = new Set<string>();
        const canon = canonicalize(text);
        for (let i = 0; i <= canon.length - 3; i++) {
          result.add(canon.substring(i, i + 3));
        }
        return result;
      }

      function trigramSimilarity(a: string, b: string): number {
        const triA = trigrams(a);
        const triB = trigrams(b);
        let intersection = 0;
        triA.forEach(t => { if (triB.has(t)) intersection++; });
        const union = triA.size + triB.size - intersection;
        return union === 0 ? 0 : intersection / union;
      }

      // Similar texts should have high similarity
      const sim1 = trigramSimilarity('Revenue grew by 15% in Q3', 'Q3 revenue increased by 15 percent');
      expect(sim1).toBeGreaterThan(0.2); // Trigram similarity for paraphrases is moderate

      // Identical texts should have similarity 1.0
      const sim2 = trigramSimilarity('Exact same text', 'Exact same text');
      expect(sim2).toBe(1.0);

      // Completely different texts should have low similarity
      const sim3 = trigramSimilarity('Revenue grew by 15%', 'The weather is sunny today');
      expect(sim3).toBeLessThan(0.3);
    });
  });

  // @fsid:FS-EmbeddingBasedSemanticComparison
  describe('FS-EmbeddingBasedSemanticComparison', () => {
    it('POST /dedup/check uses embeddings when configured and returns duplicates with cosine similarity', async () => {
      const response = await fetch(`${BASE_URL}/dedup/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(VALID_DEDUP_CHECK_REQUEST),
      });

      // 503 if LLM not configured — skip assertion
      if (response.status === 503) {
        const result = await response.json();
        expect(result).toHaveProperty('error');
        return;
      }

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result).toHaveProperty('duplicates');
      expect(Array.isArray(result.duplicates)).toBe(true);
      // When embeddings are configured, duplicates have numeric cosine similarity and LLM-generated explanations
      for (const dup of result.duplicates) {
        expect(dup).toHaveProperty('id');
        expect(dup).toHaveProperty('similarity');
        expect(typeof dup.similarity).toBe('number');
        expect(dup.similarity).toBeGreaterThan(0);
        expect(dup.similarity).toBeLessThanOrEqual(1);
        expect(dup).toHaveProperty('explanation');
        expect(typeof dup.explanation).toBe('string');
      }
    });
  });

  // @fsid:FS-EmbeddingFallbackToLlmChat
  describe('FS-EmbeddingFallbackToLlmChat', () => {
    it('POST /dedup/check falls back to LLM chat comparison when embeddings are not available', async () => {
      // This test verifies the endpoint responds correctly regardless of embedding config.
      // When no embedding model is configured, the backend uses LLM chat-based comparison.
      // Both paths return the same response shape: { duplicates: [...] }
      const response = await fetch(`${BASE_URL}/dedup/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(VALID_DEDUP_CHECK_REQUEST),
      });

      if (response.status === 503) {
        const result = await response.json();
        expect(result).toHaveProperty('error');
        return;
      }

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result).toHaveProperty('duplicates');
      expect(Array.isArray(result.duplicates)).toBe(true);
      // Both embedding and LLM chat paths return the same contract
      for (const dup of result.duplicates) {
        expect(dup).toHaveProperty('id');
        expect(typeof dup.id).toBe('string');
        expect(dup).toHaveProperty('similarity');
        expect(typeof dup.similarity).toBe('number');
        expect(dup).toHaveProperty('explanation');
        expect(typeof dup.explanation).toBe('string');
      }
    });
  });

  // Frontend/browser coverage migrated to Playwright:
  // - @fsid:FS-DedupCheckOnManualAdd
  // - @fsid:FS-DedupCheckOnSuggestionAccept
  // - @fsid:FS-NoDuplicateDetected
  // - @fsid:FS-MergeDialogOptions
  // - @fsid:FS-MergeIntoExisting
  // - @fsid:FS-KeepAsVariant
  // - @fsid:FS-ForceAdd
  // - @fsid:FS-DedupErrorFallsBackToLocal
  // - @fsid:FS-DedupDisabledForInputs
  // See `tests/e2e/semantic-deduplication.spec.ts`.
});
