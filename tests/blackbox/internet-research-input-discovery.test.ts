/**
 * Acceptance tests for Internet Research for Input Discovery feature.
 * @see specs/functional/internet-research-input-discovery.feature
 *
 * FSIDs covered:
 * - FS-ResearchButtonVisibleInInputColumn (status check)
 * - FS-ResearchButtonDisabledWithoutGoal (validation)
 * - FS-ResearchButtonDisabledWithoutBackend (status check)
 * - FS-TriggerResearchSendsGoal
 * - FS-ResearchReturnsUpToTenSuggestions
 * - FS-SuggestionDisplaysTitle
 * - FS-SuggestionDisplaysSummary
 * - FS-SuggestionDisplaysSourceUrl
 * - FS-SuggestionDisplaysRelevanceJustification
 * - FS-AcceptSuggestionAddsInput (contract: suggestion structure supports input creation)
 * - FS-RejectSuggestionRemovesIt (frontend-only, contract validated)
 * - FS-EditSuggestionBeforeAccepting (frontend-only, contract validated)
 * - FS-AcceptMultipleSuggestions (contract: multiple suggestions returned)
 * - FS-DismissAllSuggestions (frontend-only, contract validated)
 * - FS-ResearchErrorDisplaysMessage
 * - FS-ResearchNoResultsDisplaysMessage
 * - FS-ResearchPageFetchPartialFailure
 * - FS-ReResearchAllowed
 */

import { BASE_URL } from './helpers/backend-server';

const VALID_RESEARCH_REQUEST = {
  goal: 'Understand the impact of climate change on global agriculture and food security',
};

describe('Internet Research for Input Discovery', () => {

  // --- POST /research validation ---

  // @fsid:FS-TriggerResearchSendsGoal
  // @fsid:FS-ResearchButtonDisabledWithoutGoal
  describe('FS-TriggerResearchSendsGoal / FS-ResearchButtonDisabledWithoutGoal', () => {
    it('POST /research with missing goal returns 400', async () => {
      const response = await fetch(`${BASE_URL}/research`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result).toHaveProperty('error');
      expect(typeof result.error).toBe('string');
    });

    it('POST /research with empty goal returns 400', async () => {
      const response = await fetch(`${BASE_URL}/research`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: '' }),
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result).toHaveProperty('error');
    });

    it('POST /research with whitespace-only goal returns 400', async () => {
      const response = await fetch(`${BASE_URL}/research`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: '   ' }),
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result).toHaveProperty('error');
    });

    it('POST /research with empty body returns 400', async () => {
      const response = await fetch(`${BASE_URL}/research`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result).toHaveProperty('error');
    });
  });

  // --- Response structure ---

  // @fsid:FS-ResearchReturnsUpToTenSuggestions
  // @fsid:FS-SuggestionDisplaysTitle
  // @fsid:FS-SuggestionDisplaysSummary
  // @fsid:FS-SuggestionDisplaysSourceUrl
  // @fsid:FS-SuggestionDisplaysRelevanceJustification
  describe('FS-ResearchReturnsUpToTenSuggestions / Suggestion structure', () => {
    it('POST /research with valid goal returns 200 with suggestions array', async () => {
      const response = await fetch(`${BASE_URL}/research`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(VALID_RESEARCH_REQUEST),
      });

      // 200 if search + LLM configured, 503 if not — both are valid
      if (response.status === 200) {
        const result = await response.json();
        expect(result).toHaveProperty('suggestions');
        expect(Array.isArray(result.suggestions)).toBe(true);
        expect(result.suggestions.length).toBeLessThanOrEqual(10);
        expect(result).toHaveProperty('fetch_failures');
        expect(typeof result.fetch_failures).toBe('number');
        expect(result.fetch_failures).toBeGreaterThanOrEqual(0);

        for (const suggestion of result.suggestions) {
          // FS-SuggestionDisplaysTitle
          expect(suggestion).toHaveProperty('title');
          expect(typeof suggestion.title).toBe('string');
          expect(suggestion.title.length).toBeGreaterThan(0);

          // FS-SuggestionDisplaysSummary
          expect(suggestion).toHaveProperty('summary');
          expect(typeof suggestion.summary).toBe('string');
          expect(suggestion.summary.length).toBeGreaterThan(0);

          // FS-SuggestionDisplaysSourceUrl
          expect(suggestion).toHaveProperty('url');
          expect(typeof suggestion.url).toBe('string');
          expect(suggestion.url).toMatch(/^https?:\/\//);

          // FS-SuggestionDisplaysRelevanceJustification
          expect(suggestion).toHaveProperty('justification');
          expect(typeof suggestion.justification).toBe('string');
          expect(suggestion.justification.length).toBeGreaterThan(0);
        }
      } else {
        expect(response.status).toBe(503);
        const result = await response.json();
        expect(result).toHaveProperty('error');
      }
    }, 120000); // Long timeout: search + page fetch + LLM
  });

  // --- Service availability ---

  // @fsid:FS-ResearchButtonDisabledWithoutBackend
  // @fsid:FS-ResearchButtonVisibleInInputColumn
  describe('FS-ResearchButtonDisabledWithoutBackend / FS-ResearchButtonVisibleInInputColumn', () => {
    it('GET /status returns searchAvailable flag', async () => {
      const response = await fetch(`${BASE_URL}/status`);
      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result).toHaveProperty('searchAvailable');
      expect(typeof result.searchAvailable).toBe('boolean');
    });

    it('POST /research returns 503 when search is not configured', async () => {
      const response = await fetch(`${BASE_URL}/research`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(VALID_RESEARCH_REQUEST),
      });

      // Either 200 (configured) or 503 (not configured) — both valid
      if (response.status === 503) {
        const result = await response.json();
        expect(result).toHaveProperty('error');
        expect(result.error).toMatch(/not configured/i);
      } else {
        expect(response.status).toBe(200);
      }
    }, 120000);
  });

  // --- Accept flow contract ---

  // @fsid:FS-AcceptSuggestionAddsInput
  // @fsid:FS-AcceptMultipleSuggestions
  describe('FS-AcceptSuggestionAddsInput / FS-AcceptMultipleSuggestions', () => {
    it('suggestion structure contains all fields needed to create a web input', async () => {
      const response = await fetch(`${BASE_URL}/research`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(VALID_RESEARCH_REQUEST),
      });

      if (response.status === 200) {
        const result = await response.json();
        if (result.suggestions.length > 0) {
          const suggestion = result.suggestions[0];
          // These fields map to Input: type="web", title=suggestion.title, text=suggestion.summary, url=suggestion.url
          expect(suggestion).toHaveProperty('title');
          expect(suggestion).toHaveProperty('summary');
          expect(suggestion).toHaveProperty('url');
        }
      } else {
        expect(response.status).toBe(503);
      }
    }, 120000);
  });

  // --- Partial failure ---

  // @fsid:FS-ResearchPageFetchPartialFailure
  describe('FS-ResearchPageFetchPartialFailure', () => {
    it('response includes fetch_failures count', async () => {
      const response = await fetch(`${BASE_URL}/research`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(VALID_RESEARCH_REQUEST),
      });

      if (response.status === 200) {
        const result = await response.json();
        expect(result).toHaveProperty('fetch_failures');
        expect(typeof result.fetch_failures).toBe('number');
        expect(result.fetch_failures).toBeGreaterThanOrEqual(0);
      } else {
        expect(response.status).toBe(503);
      }
    }, 120000);
  });

  // --- Error handling ---

  // @fsid:FS-ResearchErrorDisplaysMessage
  describe('FS-ResearchErrorDisplaysMessage', () => {
    it('all error responses return structured JSON { error: string }', async () => {
      const response = await fetch(`${BASE_URL}/research`, {
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

  // @fsid:FS-ResearchNoResultsDisplaysMessage
  describe('FS-ResearchNoResultsDisplaysMessage', () => {
    it('POST /research with valid goal returns suggestions array (may be empty)', async () => {
      const response = await fetch(`${BASE_URL}/research`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(VALID_RESEARCH_REQUEST),
      });

      if (response.status === 200) {
        const result = await response.json();
        expect(result).toHaveProperty('suggestions');
        expect(Array.isArray(result.suggestions)).toBe(true);
        // Empty array is valid (no relevant results)
      } else {
        expect(response.status).toBe(503);
      }
    }, 120000);
  });

  // --- Re-research ---

  // @fsid:FS-ReResearchAllowed
  describe('FS-ReResearchAllowed', () => {
    it('POST /research can be called multiple times', async () => {
      const firstResponse = await fetch(`${BASE_URL}/research`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(VALID_RESEARCH_REQUEST),
      });

      const secondResponse = await fetch(`${BASE_URL}/research`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: 'Analyze renewable energy trends in Europe' }),
      });

      // Both calls should succeed or both return 503
      expect(firstResponse.status).toBe(secondResponse.status);
    }, 240000);
  });

  // --- Frontend contract tests ---
  // These validate that the API contract supports the frontend behavior.
  // Actual UI behavior (reject, edit, dismiss) is covered in tests/e2e/

  // @fsid:FS-RejectSuggestionRemovesIt
  // @fsid:FS-EditSuggestionBeforeAccepting
  // @fsid:FS-DismissAllSuggestions
  describe('FS-RejectSuggestionRemovesIt / FS-EditSuggestionBeforeAccepting / FS-DismissAllSuggestions', () => {
    it('suggestion fields are all strings (editable by frontend)', async () => {
      const response = await fetch(`${BASE_URL}/research`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(VALID_RESEARCH_REQUEST),
      });

      if (response.status === 200) {
        const result = await response.json();
        for (const suggestion of result.suggestions) {
          expect(typeof suggestion.title).toBe('string');
          expect(typeof suggestion.summary).toBe('string');
          expect(typeof suggestion.url).toBe('string');
          expect(typeof suggestion.justification).toBe('string');
        }
      } else {
        expect(response.status).toBe(503);
      }
    }, 120000);
  });
});
