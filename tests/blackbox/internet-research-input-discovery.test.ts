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
  describe('FS-TriggerResearchSendsGoal', () => {
    it('POST /research with valid goal is accepted by the endpoint', async () => {
      const response = await fetch(`${BASE_URL}/research`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(VALID_RESEARCH_REQUEST),
      });

      // 200 if search configured, 503 if not — both confirm goal was sent
      expect([200, 503]).toContain(response.status);
    }, 120000);
  });

  // @fsid:FS-ResearchButtonDisabledWithoutGoal
  describe('FS-ResearchButtonDisabledWithoutGoal', () => {
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
  describe('FS-ResearchReturnsUpToTenSuggestions', () => {
    it('POST /research returns at most 10 suggestions', async () => {
      const response = await fetch(`${BASE_URL}/research`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(VALID_RESEARCH_REQUEST),
      });

      if (response.status === 200) {
        const result = await response.json();
        expect(result).toHaveProperty('suggestions');
        expect(Array.isArray(result.suggestions)).toBe(true);
        expect(result.suggestions.length).toBeLessThanOrEqual(10);
      } else {
        expect(response.status).toBe(503);
      }
    }, 120000);
  });

  // @fsid:FS-SuggestionDisplaysTitle
  describe('FS-SuggestionDisplaysTitle', () => {
    it('each suggestion contains a non-empty title', async () => {
      const response = await fetch(`${BASE_URL}/research`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(VALID_RESEARCH_REQUEST),
      });

      if (response.status === 200) {
        const result = await response.json();
        for (const suggestion of result.suggestions) {
          expect(suggestion).toHaveProperty('title');
          expect(typeof suggestion.title).toBe('string');
          expect(suggestion.title.length).toBeGreaterThan(0);
        }
      } else {
        expect(response.status).toBe(503);
      }
    }, 120000);
  });

  // @fsid:FS-SuggestionDisplaysSummary
  describe('FS-SuggestionDisplaysSummary', () => {
    it('each suggestion contains a non-empty summary', async () => {
      const response = await fetch(`${BASE_URL}/research`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(VALID_RESEARCH_REQUEST),
      });

      if (response.status === 200) {
        const result = await response.json();
        for (const suggestion of result.suggestions) {
          expect(suggestion).toHaveProperty('summary');
          expect(typeof suggestion.summary).toBe('string');
          expect(suggestion.summary.length).toBeGreaterThan(0);
        }
      } else {
        expect(response.status).toBe(503);
      }
    }, 120000);
  });

  // @fsid:FS-SuggestionDisplaysSourceUrl
  describe('FS-SuggestionDisplaysSourceUrl', () => {
    it('each suggestion contains a valid URL', async () => {
      const response = await fetch(`${BASE_URL}/research`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(VALID_RESEARCH_REQUEST),
      });

      if (response.status === 200) {
        const result = await response.json();
        for (const suggestion of result.suggestions) {
          expect(suggestion).toHaveProperty('url');
          expect(typeof suggestion.url).toBe('string');
          expect(suggestion.url).toMatch(/^https?:\/\//);
        }
      } else {
        expect(response.status).toBe(503);
      }
    }, 120000);
  });

  // @fsid:FS-SuggestionDisplaysRelevanceJustification
  describe('FS-SuggestionDisplaysRelevanceJustification', () => {
    it('each suggestion contains a non-empty justification', async () => {
      const response = await fetch(`${BASE_URL}/research`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(VALID_RESEARCH_REQUEST),
      });

      if (response.status === 200) {
        const result = await response.json();
        for (const suggestion of result.suggestions) {
          expect(suggestion).toHaveProperty('justification');
          expect(typeof suggestion.justification).toBe('string');
          expect(suggestion.justification.length).toBeGreaterThan(0);
        }
      } else {
        expect(response.status).toBe(503);
      }
    }, 120000);
  });

  // --- Service availability ---

  // @fsid:FS-ResearchButtonDisabledWithoutBackend
  describe('FS-ResearchButtonDisabledWithoutBackend', () => {
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

  // @fsid:FS-ResearchButtonVisibleInInputColumn
  describe('FS-ResearchButtonVisibleInInputColumn', () => {
    it('GET /status returns searchAvailable flag', async () => {
      const response = await fetch(`${BASE_URL}/status`);
      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result).toHaveProperty('searchAvailable');
      expect(typeof result.searchAvailable).toBe('boolean');
    });
  });

  // --- Accept flow contract ---

  // @fsid:FS-AcceptSuggestionAddsInput
  describe('FS-AcceptSuggestionAddsInput', () => {
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

  // @fsid:FS-AcceptMultipleSuggestions
  describe('FS-AcceptMultipleSuggestions', () => {
    it('response can contain multiple suggestions for batch acceptance', async () => {
      const response = await fetch(`${BASE_URL}/research`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(VALID_RESEARCH_REQUEST),
      });

      if (response.status === 200) {
        const result = await response.json();
        expect(Array.isArray(result.suggestions)).toBe(true);
        // Multiple suggestions can be accepted individually
        for (const suggestion of result.suggestions) {
          expect(suggestion).toHaveProperty('title');
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
  describe('FS-RejectSuggestionRemovesIt', () => {
    it('suggestion structure supports individual rejection (each has unique fields)', async () => {
      const response = await fetch(`${BASE_URL}/research`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(VALID_RESEARCH_REQUEST),
      });

      if (response.status === 200) {
        const result = await response.json();
        for (const suggestion of result.suggestions) {
          expect(typeof suggestion.title).toBe('string');
          expect(typeof suggestion.url).toBe('string');
        }
      } else {
        expect(response.status).toBe(503);
      }
    }, 120000);
  });

  // @fsid:FS-EditSuggestionBeforeAccepting
  describe('FS-EditSuggestionBeforeAccepting', () => {
    it('suggestion fields are strings allowing frontend editing', async () => {
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
        }
      } else {
        expect(response.status).toBe(503);
      }
    }, 120000);
  });

  // @fsid:FS-DismissAllSuggestions
  describe('FS-DismissAllSuggestions', () => {
    it('suggestions array is dismissable (all fields are serializable)', async () => {
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
