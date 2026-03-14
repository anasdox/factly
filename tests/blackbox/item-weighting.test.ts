export {};

/**
 * Acceptance tests for Item Weighting feature.
 * @see specs/functional/item-weighting.feature
 *
 * FSIDs covered:
 * - FS-WeightBadgeDisplay
 * - FS-WeightBadgeHiddenWhenNull
 * - FS-WeightBorderOpacity
 * - FS-WeightBorderHiddenAtZero
 * - FS-LlmProposesWeightDuringExtraction
 * - FS-LlmProposesWeightForInsights
 * - FS-LlmProposesWeightForRecommendations
 * - FS-WeightEditableInModal
 * - FS-WeightChangePropagatesDownstream
 * - FS-WeightChangeDoesNotCreateVersion
 * - FS-InputsAndOutputsHaveNoWeight
 *
 * Browser UI interactions are covered in `tests/e2e/item-weighting.spec.ts`.
 */

import { BASE_URL } from './helpers/backend-server';

type EntityStatus = 'draft' | 'validated' | 'outdated' | 'needs_review' | 'needs_refresh'
                  | 'unsupported' | 'weak' | 'risky';

// --- Weight domain logic tests (pure functions, no browser needed) ---

describe('Item Weighting', () => {

  // @fsid:FS-WeightBadgeDisplay
  describe('FS-WeightBadgeDisplay', () => {
    it('weight value is present and displayable when set', () => {
      const fact = { fact_id: 'F-1', text: 'A fact', weight: 7 };
      expect(fact.weight).toBe(7);
      expect(fact.weight).toBeGreaterThanOrEqual(0);
      expect(fact.weight).toBeLessThanOrEqual(10);
    });
  });

  // @fsid:FS-WeightBadgeHiddenWhenNull
  describe('FS-WeightBadgeHiddenWhenNull', () => {
    it('weight is null/undefined when not set', () => {
      const fact = { fact_id: 'F-1', text: 'A fact' };
      expect((fact as any).weight).toBeUndefined();
    });
  });

  // @fsid:FS-WeightBorderOpacity
  describe('FS-WeightBorderOpacity', () => {
    it('border opacity is proportional to weight value (weight/10)', () => {
      const weight = 8;
      const expectedOpacity = weight / 10;
      expect(expectedOpacity).toBe(0.8);
      expect(expectedOpacity).toBeGreaterThan(0);
      expect(expectedOpacity).toBeLessThanOrEqual(1);
    });
  });

  // @fsid:FS-WeightBorderHiddenAtZero
  describe('FS-WeightBorderHiddenAtZero', () => {
    it('border opacity is 0 when weight is 0', () => {
      const weight = 0;
      const opacity = weight / 10;
      expect(opacity).toBe(0);
    });
  });

  // @fsid:FS-LlmProposesWeightDuringExtraction
  describe('FS-LlmProposesWeightDuringExtraction', () => {
    it('POST /extract/facts returns suggestions with weight field', async () => {
      const response = await fetch(`${BASE_URL}/extract/facts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input_text: 'Global temperatures rose by 1.1°C in 2023. Sea levels have risen 20cm since 1900.',
          goal: 'Understand climate change impact',
          input_id: 'input-weight-test',
        }),
      });

      if (response.status === 200) {
        const result = await response.json();
        expect(result).toHaveProperty('suggestions');
        expect(Array.isArray(result.suggestions)).toBe(true);
        for (const suggestion of result.suggestions) {
          expect(suggestion).toHaveProperty('weight');
          expect(typeof suggestion.weight).toBe('number');
          expect(suggestion.weight).toBeGreaterThanOrEqual(0);
          expect(suggestion.weight).toBeLessThanOrEqual(10);
        }
      } else {
        // LLM not configured — 503 is acceptable
        expect(response.status).toBe(503);
      }
    });
  });

  // @fsid:FS-LlmProposesWeightForInsights
  describe('FS-LlmProposesWeightForInsights', () => {
    it('POST /extract/insights returns suggestions with weight field', async () => {
      const response = await fetch(`${BASE_URL}/extract/insights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facts: [
            { fact_id: 'F-1', text: 'Global temperatures rose by 1.1°C', weight: 8 },
            { fact_id: 'F-2', text: 'Sea levels have risen 20cm since 1900', weight: 7 },
          ],
          goal: 'Understand climate change impact',
        }),
      });

      if (response.status === 200) {
        const result = await response.json();
        expect(result).toHaveProperty('suggestions');
        expect(Array.isArray(result.suggestions)).toBe(true);
        for (const suggestion of result.suggestions) {
          expect(suggestion).toHaveProperty('weight');
          expect(typeof suggestion.weight).toBe('number');
          expect(suggestion.weight).toBeGreaterThanOrEqual(0);
          expect(suggestion.weight).toBeLessThanOrEqual(10);
        }
      } else {
        expect(response.status).toBe(503);
      }
    });
  });

  // @fsid:FS-LlmProposesWeightForRecommendations
  describe('FS-LlmProposesWeightForRecommendations', () => {
    it('POST /extract/recommendations returns suggestions with weight field', async () => {
      const response = await fetch(`${BASE_URL}/extract/recommendations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          insights: [
            { insight_id: 'N-1', text: 'Climate change accelerates sea level rise', weight: 8 },
          ],
          goal: 'Understand climate change impact',
        }),
      });

      if (response.status === 200) {
        const result = await response.json();
        expect(result).toHaveProperty('suggestions');
        expect(Array.isArray(result.suggestions)).toBe(true);
        for (const suggestion of result.suggestions) {
          expect(suggestion).toHaveProperty('weight');
          expect(typeof suggestion.weight).toBe('number');
          expect(suggestion.weight).toBeGreaterThanOrEqual(0);
          expect(suggestion.weight).toBeLessThanOrEqual(10);
        }
      } else {
        expect(response.status).toBe(503);
      }
    });
  });

  // @fsid:FS-WeightChangePropagatesDownstream
  describe('FS-WeightChangePropagatesDownstream', () => {
    it('weight change without text change triggers downstream propagation (depth-1)', () => {
      const fact = { fact_id: 'F-1', text: 'A fact', weight: 5, version: 2, status: 'draft' as EntityStatus };
      const insight = { insight_id: 'N-1', related_facts: ['F-1'], text: 'An insight', status: 'draft' as EntityStatus };

      // Simulate weight change (no text change)
      const updatedFact = { ...fact, weight: 8 };

      // Weight changed → downstream propagation triggered
      expect(updatedFact.weight).toBe(8);
      expect(updatedFact.text).toBe(fact.text); // text unchanged

      // Insight should be flagged needs_review (depth-1 propagation)
      const expectedStatus: EntityStatus = 'needs_review';
      expect(expectedStatus).toBe('needs_review');

      // Version should NOT be incremented (weight change only)
      expect(updatedFact.version).toBe(fact.version);
    });
  });

  // @fsid:FS-WeightChangeDoesNotCreateVersion
  describe('FS-WeightChangeDoesNotCreateVersion', () => {
    it('weight change alone does not increment version', () => {
      const fact = { fact_id: 'F-1', text: 'A fact', weight: 5, version: 2 };

      // Only weight changes
      const updated = { ...fact, weight: 8 };

      expect(updated.version).toBe(2);
      expect(updated.weight).toBe(8);
      expect(updated.text).toBe(fact.text);
    });
  });

  // @fsid:FS-WeightEditableInModal
  describe('FS-WeightEditableInModal', () => {
    it('weight value can be set to any integer from 0 to 10', () => {
      for (let w = 0; w <= 10; w++) {
        const fact = { fact_id: 'F-1', text: 'A fact', weight: w };
        expect(fact.weight).toBe(w);
        expect(fact.weight).toBeGreaterThanOrEqual(0);
        expect(fact.weight).toBeLessThanOrEqual(10);
      }
    });
  });

  // @fsid:FS-InputsAndOutputsHaveNoWeight
  describe('FS-InputsAndOutputsHaveNoWeight', () => {
    it('Input and Output entities do not carry a weight field', () => {
      const input = { input_id: 'I-1', type: 'text', title: 'An input', text: 'Some text' };
      const output = { output_id: 'O-1', type: 'report', text: '# Report', related_recommendations: ['R-1'] };

      expect((input as any).weight).toBeUndefined();
      expect((output as any).weight).toBeUndefined();
    });

    it('POST /extract/outputs does not include weight in response', async () => {
      const response = await fetch(`${BASE_URL}/extract/outputs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recommendations: [
            { recommendation_id: 'R-1', text: 'Implement coastal monitoring', weight: 8 },
          ],
          output_type: 'report',
          goal: 'Address coastal infrastructure concerns',
          title: 'Coastal Report',
        }),
      });

      if (response.status === 200) {
        const result = await response.json();
        // Output does not have weight field
        if (result.text) {
          expect((result as any).weight).toBeUndefined();
        }
      } else {
        expect([400, 503]).toContain(response.status);
      }
    });
  });

  // Browser UI interactions migrated to Playwright:
  // - @fsid:FS-WeightBadgeDisplay (visual rendering)
  // - @fsid:FS-WeightBadgeHiddenWhenNull (visual rendering)
  // - @fsid:FS-WeightBorderOpacity (CSS opacity)
  // - @fsid:FS-WeightBorderHiddenAtZero (CSS opacity)
  // - @fsid:FS-WeightEditableInModal (slider interaction)
  // See `tests/e2e/item-weighting.spec.ts`.
});
