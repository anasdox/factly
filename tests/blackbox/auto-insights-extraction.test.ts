/**
 * Acceptance tests for Auto Insights Extraction from Facts feature.
 * @see specs/functional/auto-insights-extraction.feature
 *
 * FSIDs covered:
 * - FS-SelectFacts
 * - FS-DeselectFact
 * - FS-ClearFactSelection
 * - FS-TriggerInsightsExtraction
 * - FS-DisplaySuggestedInsights
 * - FS-AcceptSuggestedInsight
 * - FS-EditSuggestedInsight
 * - FS-RejectSuggestedInsight
 * - FS-AcceptAllSuggestedInsights
 * - FS-RejectAllSuggestedInsights
 * - FS-CloseSuggestionsInsightsPanel
 * - FS-InsightsExtractionErrorDisplay
 * - FS-ManualInsightFromSelection
 * - FS-GenerateInsightsDisabledWithoutSelection
 */

import { BASE_URL } from './helpers/backend-server';

const VALID_INSIGHTS_REQUEST = {
  facts: [
    { fact_id: 'fact-001', text: 'Global temperature rose by 1.1°C in 2023 compared to pre-industrial levels.' },
    { fact_id: 'fact-002', text: 'Sea levels have risen by 20cm since 1900.' },
  ],
  goal: 'Understand the impact of climate change on global indicators',
};

describe('Auto Insights Extraction from Facts', () => {

  // --- Backend: POST /extract/insights validation ---

  // @fsid:FS-TriggerInsightsExtraction
  describe('FS-TriggerInsightsExtraction', () => {
    it('POST /extract/insights with missing facts returns 400', async () => {
      const { facts, ...body } = VALID_INSIGHTS_REQUEST;
      const response = await fetch(`${BASE_URL}/extract/insights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result).toHaveProperty('error');
      expect(typeof result.error).toBe('string');
    });

    it('POST /extract/insights with empty facts array returns 400', async () => {
      const response = await fetch(`${BASE_URL}/extract/insights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...VALID_INSIGHTS_REQUEST, facts: [] }),
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result).toHaveProperty('error');
    });

    it('POST /extract/insights with missing goal returns 400', async () => {
      const { goal, ...body } = VALID_INSIGHTS_REQUEST;
      const response = await fetch(`${BASE_URL}/extract/insights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result).toHaveProperty('error');
    });

    it('POST /extract/insights with fact missing text returns 400', async () => {
      const response = await fetch(`${BASE_URL}/extract/insights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...VALID_INSIGHTS_REQUEST,
          facts: [{ fact_id: 'fact-001' }],
        }),
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result).toHaveProperty('error');
    });

    it('POST /extract/insights with fact missing fact_id returns 400', async () => {
      const response = await fetch(`${BASE_URL}/extract/insights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...VALID_INSIGHTS_REQUEST,
          facts: [{ text: 'Some fact text' }],
        }),
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result).toHaveProperty('error');
    });

    it('POST /extract/insights with empty body returns 400', async () => {
      const response = await fetch(`${BASE_URL}/extract/insights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result).toHaveProperty('error');
    });
  });

  // @fsid:FS-DisplaySuggestedInsights
  describe('FS-DisplaySuggestedInsights', () => {
    it('POST /extract/insights with valid body returns 200 with suggestions array and fact_ids', async () => {
      const response = await fetch(`${BASE_URL}/extract/insights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(VALID_INSIGHTS_REQUEST),
      });

      // 200 if LLM configured, 503 if not — both are valid for this test
      if (response.status === 200) {
        const result = await response.json();
        expect(result).toHaveProperty('suggestions');
        expect(Array.isArray(result.suggestions)).toBe(true);
        expect(result).toHaveProperty('fact_ids');
        expect(Array.isArray(result.fact_ids)).toBe(true);
        expect(result.fact_ids).toEqual(VALID_INSIGHTS_REQUEST.facts.map(f => f.fact_id));
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

  // @fsid:FS-InsightsExtractionErrorDisplay
  describe('FS-InsightsExtractionErrorDisplay', () => {
    it('all error responses from /extract/insights return structured JSON { error: string }', async () => {
      const response = await fetch(`${BASE_URL}/extract/insights`, {
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

  // Frontend UI scenarios for fact selection / suggestions panel are covered by:
  // tests/e2e/auto-insights-extraction.spec.ts
});
