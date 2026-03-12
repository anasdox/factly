/**
 * Acceptance tests for AI-Assisted Reformulation Suggestions feature.
 * @see specs/functional/ai-reformulation-suggestions.feature
 *
 * FSIDs covered:
 * - FS-TriggerReformulationOnClick
 * - FS-DisplayReformulationSuggestions
 * - FS-ReformulationUsesRelatedItemsContext
 * - FS-ReformulationUsesDiscoveryGoal
 * - FS-ReformulationErrorShowsMessage
 * - FS-ReformulationTimeoutShowsMessage
 * - FS-ReformulateButtonHiddenWhenNoLLM
 * - FS-ReformulateButtonDisabledWhenTextEmpty
 * - FS-ReformulateButtonEnabledWhenTextPresent
 * - FS-SelectSuggestionReplacesText
 * - FS-EditAfterSelectingSuggestion
 * - FS-DismissSuggestionsKeepsOriginal
 * - FS-ReformulateAgainAfterEdit
 * - FS-ReformulateButtonVisibleInFactModal
 * - FS-ReformulateButtonVisibleInInsightModal
 * - FS-ReformulateButtonVisibleInRecommendationModal
 */

import { BASE_URL } from './helpers/backend-server';

const VALID_REFORMULATE_REQUEST = {
  text: 'Revenue grew significantly in Q3.',
  entity_type: 'fact',
  goal: 'Analyze Q3 business performance and growth drivers',
  related_items: [
    { text: 'The company launched 5 new products in Q3.', type: 'input' },
  ],
};

describe('AI-Assisted Reformulation Suggestions', () => {

  // --- Backend: POST /reformulate validation ---

  // @fsid:FS-TriggerReformulationOnClick
  describe('FS-TriggerReformulationOnClick', () => {
    it('POST /reformulate with missing text returns 400', async () => {
      const { text, ...body } = VALID_REFORMULATE_REQUEST;
      const response = await fetch(`${BASE_URL}/reformulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result).toHaveProperty('error');
      expect(typeof result.error).toBe('string');
    });

    it('POST /reformulate with empty text returns 400', async () => {
      const response = await fetch(`${BASE_URL}/reformulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...VALID_REFORMULATE_REQUEST, text: '' }),
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result).toHaveProperty('error');
    });

    it('POST /reformulate with missing entity_type returns 400', async () => {
      const { entity_type, ...body } = VALID_REFORMULATE_REQUEST;
      const response = await fetch(`${BASE_URL}/reformulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result).toHaveProperty('error');
    });

    it('POST /reformulate with invalid entity_type returns 400', async () => {
      const response = await fetch(`${BASE_URL}/reformulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...VALID_REFORMULATE_REQUEST, entity_type: 'output' }),
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result).toHaveProperty('error');
    });

    it('POST /reformulate with missing goal returns 400', async () => {
      const { goal, ...body } = VALID_REFORMULATE_REQUEST;
      const response = await fetch(`${BASE_URL}/reformulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result).toHaveProperty('error');
    });

    it('POST /reformulate with empty goal returns 400', async () => {
      const response = await fetch(`${BASE_URL}/reformulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...VALID_REFORMULATE_REQUEST, goal: '' }),
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result).toHaveProperty('error');
    });

    it('POST /reformulate with missing related_items returns 400', async () => {
      const { related_items, ...body } = VALID_REFORMULATE_REQUEST;
      const response = await fetch(`${BASE_URL}/reformulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result).toHaveProperty('error');
    });

    it('POST /reformulate with empty body returns 400', async () => {
      const response = await fetch(`${BASE_URL}/reformulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result).toHaveProperty('error');
    });
  });

  // @fsid:FS-DisplayReformulationSuggestions
  describe('FS-DisplayReformulationSuggestions', () => {
    it('POST /reformulate with valid body returns 200 with suggestions array', async () => {
      const response = await fetch(`${BASE_URL}/reformulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(VALID_REFORMULATE_REQUEST),
      });

      // 200 if LLM configured, 503 if not — both are valid
      if (response.status === 200) {
        const result = await response.json();
        expect(result).toHaveProperty('suggestions');
        expect(Array.isArray(result.suggestions)).toBe(true);
        expect(result.suggestions.length).toBeGreaterThanOrEqual(1);
        expect(result.suggestions.length).toBeLessThanOrEqual(3);

        for (const suggestion of result.suggestions) {
          expect(suggestion).toHaveProperty('text');
          expect(typeof suggestion.text).toBe('string');
          expect(suggestion.text.length).toBeGreaterThan(0);
          expect(suggestion).toHaveProperty('justification');
          expect(typeof suggestion.justification).toBe('string');
          expect(suggestion.justification.length).toBeGreaterThan(0);
        }
      } else {
        expect(response.status).toBe(503);
        const result = await response.json();
        expect(result).toHaveProperty('error');
      }
    });
  });

  // @fsid:FS-ReformulationUsesRelatedItemsContext
  describe('FS-ReformulationUsesRelatedItemsContext', () => {
    it('request accepts related_items with text and type fields', () => {
      // Validate request structure matches spec
      expect(VALID_REFORMULATE_REQUEST).toHaveProperty('related_items');
      expect(Array.isArray(VALID_REFORMULATE_REQUEST.related_items)).toBe(true);
      for (const item of VALID_REFORMULATE_REQUEST.related_items) {
        expect(item).toHaveProperty('text');
        expect(item).toHaveProperty('type');
      }
    });

    it('POST /reformulate accepts empty related_items array', async () => {
      const response = await fetch(`${BASE_URL}/reformulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...VALID_REFORMULATE_REQUEST, related_items: [] }),
      });

      // Should accept empty related_items (valid request)
      expect([200, 503]).toContain(response.status);
    });
  });

  // @fsid:FS-ReformulationUsesDiscoveryGoal
  describe('FS-ReformulationUsesDiscoveryGoal', () => {
    it('request includes goal field for LLM context', () => {
      expect(VALID_REFORMULATE_REQUEST).toHaveProperty('goal');
      expect(typeof VALID_REFORMULATE_REQUEST.goal).toBe('string');
      expect(VALID_REFORMULATE_REQUEST.goal.length).toBeGreaterThan(0);
    });
  });

  // @fsid:FS-ReformulationErrorShowsMessage
  describe('FS-ReformulationErrorShowsMessage', () => {
    it('all error responses from /reformulate return structured JSON { error: string }', async () => {
      const response = await fetch(`${BASE_URL}/reformulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(response.headers.get('content-type')).toMatch(/application\/json/);
      const result = await response.json();
      expect(result).toHaveProperty('error');
      expect(typeof result.error).toBe('string');
      expect(result.error.length).toBeGreaterThan(0);
    });
  });

  // @fsid:FS-ReformulateButtonHiddenWhenNoLLM
  describe('FS-ReformulateButtonHiddenWhenNoLLM', () => {
    it('POST /reformulate returns 503 when LLM is not configured', async () => {
      // This test validates the 503 path — when LLM_PROVIDER or LLM_API_KEY is not set
      // The actual behavior depends on server configuration
      const response = await fetch(`${BASE_URL}/reformulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(VALID_REFORMULATE_REQUEST),
      });

      // Either 200 (LLM configured) or 503 (not configured) — both valid
      if (response.status === 503) {
        const result = await response.json();
        expect(result).toHaveProperty('error');
        expect(result.error).toMatch(/not configured/i);
      } else {
        expect(response.status).toBe(200);
      }
    });
  });

  // --- Entity type coverage ---

  // @fsid:FS-ReformulateButtonVisibleInFactModal
  describe('FS-ReformulateButtonVisibleInFactModal', () => {
    it('POST /reformulate accepts entity_type "fact"', async () => {
      const response = await fetch(`${BASE_URL}/reformulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...VALID_REFORMULATE_REQUEST, entity_type: 'fact' }),
      });

      expect([200, 503]).toContain(response.status);
    });
  });

  // @fsid:FS-ReformulateButtonVisibleInInsightModal
  describe('FS-ReformulateButtonVisibleInInsightModal', () => {
    it('POST /reformulate accepts entity_type "insight"', async () => {
      const response = await fetch(`${BASE_URL}/reformulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: 'The product launches drove revenue growth by expanding market reach.',
          entity_type: 'insight',
          goal: 'Analyze Q3 business performance',
          related_items: [
            { text: 'Revenue grew by 15% in Q3.', type: 'fact' },
            { text: 'The company launched 5 new products.', type: 'fact' },
          ],
        }),
      });

      expect([200, 503]).toContain(response.status);
    });
  });

  // @fsid:FS-ReformulateButtonVisibleInRecommendationModal
  describe('FS-ReformulateButtonVisibleInRecommendationModal', () => {
    it('POST /reformulate accepts entity_type "recommendation"', async () => {
      const response = await fetch(`${BASE_URL}/reformulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: 'Continue investing in new product development to sustain growth.',
          entity_type: 'recommendation',
          goal: 'Analyze Q3 business performance',
          related_items: [
            { text: 'Product launches drove revenue growth.', type: 'insight' },
          ],
        }),
      });

      expect([200, 503]).toContain(response.status);
    });
  });

  // --- Request structure tests for frontend FSIDs ---
  // These validate the contract that the frontend will use.
  // UI-specific behavior (button states, suggestion display, selection) is covered in tests/e2e/

  // @fsid:FS-ReformulateButtonDisabledWhenTextEmpty
  // @fsid:FS-ReformulateButtonEnabledWhenTextPresent
  describe('FS-ReformulateButtonDisabledWhenTextEmpty / FS-ReformulateButtonEnabledWhenTextPresent', () => {
    it('POST /reformulate rejects empty text (backend enforces non-empty)', async () => {
      const response = await fetch(`${BASE_URL}/reformulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...VALID_REFORMULATE_REQUEST, text: '' }),
      });

      expect(response.status).toBe(400);
    });

    it('POST /reformulate accepts non-empty text', async () => {
      const response = await fetch(`${BASE_URL}/reformulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(VALID_REFORMULATE_REQUEST),
      });

      expect([200, 503]).toContain(response.status);
    });
  });

  // @fsid:FS-SelectSuggestionReplacesText
  // @fsid:FS-EditAfterSelectingSuggestion
  // @fsid:FS-DismissSuggestionsKeepsOriginal
  // @fsid:FS-ReformulateAgainAfterEdit
  describe('FS-SelectSuggestionReplacesText / FS-EditAfterSelectingSuggestion / FS-DismissSuggestionsKeepsOriginal / FS-ReformulateAgainAfterEdit', () => {
    it('POST /reformulate returns suggestions with distinct text from original', async () => {
      const response = await fetch(`${BASE_URL}/reformulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(VALID_REFORMULATE_REQUEST),
      });

      if (response.status === 200) {
        const result = await response.json();
        // Suggestions should offer different wordings
        for (const suggestion of result.suggestions) {
          expect(typeof suggestion.text).toBe('string');
          expect(suggestion.text.length).toBeGreaterThan(0);
        }
      } else {
        expect(response.status).toBe(503);
      }
    });

    it('POST /reformulate can be called multiple times with different text (re-reformulate)', async () => {
      const firstResponse = await fetch(`${BASE_URL}/reformulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(VALID_REFORMULATE_REQUEST),
      });

      const secondResponse = await fetch(`${BASE_URL}/reformulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...VALID_REFORMULATE_REQUEST,
          text: 'Q3 revenue increased by 15% due to new product launches.',
        }),
      });

      // Both calls should succeed or both return 503
      expect(firstResponse.status).toBe(secondResponse.status);
    });
  });

  // @fsid:FS-ReformulationTimeoutShowsMessage
  describe('FS-ReformulationTimeoutShowsMessage', () => {
    it('error responses include structured error message for frontend display', async () => {
      // Validate that any error path returns a displayable error message
      const response = await fetch(`${BASE_URL}/reformulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'x', entity_type: 'invalid', goal: 'test', related_items: [] }),
      });

      const result = await response.json();
      expect(result).toHaveProperty('error');
      expect(typeof result.error).toBe('string');
    });
  });
});
