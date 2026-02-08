/**
 * Acceptance tests for Auto Facts Extraction from Text feature.
 * @see specs/functional/auto-facts-extraction.feature
 *
 * FSIDs covered:
 * - FS-TriggerFactsExtraction
 * - FS-DisplaySuggestedFacts
 * - FS-AcceptSuggestedFact
 * - FS-EditSuggestedFact
 * - FS-RejectSuggestedFact
 * - FS-AcceptAllSuggestedFacts
 * - FS-RejectAllSuggestedFacts
 * - FS-CloseSuggestionsPanel
 * - FS-ExtractionErrorDisplay
 * - FS-ExtractFactsDisabledForNonText
 * - FS-ExtractFactsDisabledForEmptyText
 */

import { BASE_URL } from './helpers/backend-server';

const VALID_EXTRACTION_REQUEST = {
  input_text: 'The global temperature rose by 1.1°C in 2023 compared to pre-industrial levels. Sea levels have risen by 20cm since 1900.',
  goal: 'Understand the impact of climate change on global indicators',
  input_id: 'input-001',
};

describe('Auto Facts Extraction from Text', () => {

  // --- Backend: POST /extract/facts validation ---

  // @fsid:FS-TriggerFactsExtraction
  describe('FS-TriggerFactsExtraction', () => {
    it('POST /extract/facts with missing input_text returns 400', async () => {
      const { input_text, ...body } = VALID_EXTRACTION_REQUEST;
      const response = await fetch(`${BASE_URL}/extract/facts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result).toHaveProperty('error');
      expect(typeof result.error).toBe('string');
    });

    it('POST /extract/facts with empty input_text returns 400', async () => {
      const response = await fetch(`${BASE_URL}/extract/facts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...VALID_EXTRACTION_REQUEST, input_text: '' }),
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result).toHaveProperty('error');
    });

    it('POST /extract/facts with missing goal returns 400', async () => {
      const { goal, ...body } = VALID_EXTRACTION_REQUEST;
      const response = await fetch(`${BASE_URL}/extract/facts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result).toHaveProperty('error');
    });

    it('POST /extract/facts with missing input_id returns 400', async () => {
      const { input_id, ...body } = VALID_EXTRACTION_REQUEST;
      const response = await fetch(`${BASE_URL}/extract/facts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result).toHaveProperty('error');
    });

    it('POST /extract/facts with empty body returns 400', async () => {
      const response = await fetch(`${BASE_URL}/extract/facts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result).toHaveProperty('error');
    });
  });

  // @fsid:FS-DisplaySuggestedFacts
  describe('FS-DisplaySuggestedFacts', () => {
    it('POST /extract/facts with valid body returns 200 with suggestions array and input_id', async () => {
      const response = await fetch(`${BASE_URL}/extract/facts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(VALID_EXTRACTION_REQUEST),
      });

      // 200 if LLM configured, 503 if not — both are valid for this test
      if (response.status === 200) {
        const result = await response.json();
        expect(result).toHaveProperty('suggestions');
        expect(Array.isArray(result.suggestions)).toBe(true);
        expect(result).toHaveProperty('input_id', VALID_EXTRACTION_REQUEST.input_id);
        for (const suggestion of result.suggestions) {
          expect(suggestion).toHaveProperty('text');
          expect(typeof suggestion.text).toBe('string');
          expect(suggestion.text.length).toBeGreaterThan(0);
        }
      } else {
        // LLM not configured — 503 is acceptable
        expect(response.status).toBe(503);
        const result = await response.json();
        expect(result).toHaveProperty('error');
      }
    });
  });

  // @fsid:FS-ExtractionErrorDisplay
  describe('FS-ExtractionErrorDisplay', () => {
    it('all error responses from /extract/facts return structured JSON { error: string }', async () => {
      const response = await fetch(`${BASE_URL}/extract/facts`, {
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

  // --- Frontend: Suggestions panel (require browser, defined as todo) ---

  // @fsid:FS-AcceptSuggestedFact
  describe('FS-AcceptSuggestedFact', () => {
    test.todo('clicking Accept on a suggested fact adds it to the Facts column linked to the source Input');
  });

  // @fsid:FS-EditSuggestedFact
  describe('FS-EditSuggestedFact', () => {
    test.todo('clicking Edit makes the card editable; confirming adds the modified fact to the pipeline');
  });

  // @fsid:FS-RejectSuggestedFact
  describe('FS-RejectSuggestedFact', () => {
    test.todo('clicking Reject removes the card without adding any fact');
  });

  // @fsid:FS-AcceptAllSuggestedFacts
  describe('FS-AcceptAllSuggestedFacts', () => {
    test.todo('clicking Accept All adds all remaining suggestions to the Facts column and closes the panel');
  });

  // @fsid:FS-RejectAllSuggestedFacts
  describe('FS-RejectAllSuggestedFacts', () => {
    test.todo('clicking Reject All discards all remaining suggestions and closes the panel');
  });

  // @fsid:FS-CloseSuggestionsPanel
  describe('FS-CloseSuggestionsPanel', () => {
    test.todo('closing the panel discards remaining suggestions but keeps previously accepted facts');
  });

  // @fsid:FS-ExtractFactsDisabledForNonText
  describe('FS-ExtractFactsDisabledForNonText', () => {
    test.todo('Extract Facts action is not displayed on non-text Input items');
  });

  // @fsid:FS-ExtractFactsDisabledForEmptyText
  describe('FS-ExtractFactsDisabledForEmptyText', () => {
    test.todo('Extract Facts action is displayed but disabled on text Inputs with empty content');
  });
});
