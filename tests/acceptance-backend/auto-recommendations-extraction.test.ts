/**
 * Acceptance tests for Auto Recommendations Extraction from Insights feature.
 * @see specs/functional/auto-recommendations-extraction.feature
 *
 * FSIDs covered:
 * - FS-SelectInsights
 * - FS-DeselectInsight
 * - FS-ClearInsightSelection
 * - FS-TriggerRecommendationsExtraction
 * - FS-DisplaySuggestedRecommendations
 * - FS-AcceptSuggestedRecommendation
 * - FS-EditSuggestedRecommendation
 * - FS-RejectSuggestedRecommendation
 * - FS-AcceptAllSuggestedRecommendations
 * - FS-RejectAllSuggestedRecommendations
 * - FS-CloseSuggestionsRecommendationsPanel
 * - FS-RecommendationsExtractionErrorDisplay
 * - FS-ManualRecommendationFromSelection
 * - FS-GenerateRecommendationsDisabledWithoutSelection
 */

import { BASE_URL } from './helpers/backend-server';

const VALID_RECOMMENDATIONS_REQUEST = {
  insights: [
    { insight_id: 'insight-001', text: 'The correlation between temperature rise and sea level increase suggests accelerating feedback loops.' },
    { insight_id: 'insight-002', text: 'Coastal infrastructure in low-lying areas faces compounding risk from both sea level rise and storm intensification.' },
  ],
  goal: 'Formulate actionable recommendations to address climate change impacts',
};

describe('Auto Recommendations Extraction from Insights', () => {

  // --- Backend: POST /extract/recommendations validation ---

  // @fsid:FS-TriggerRecommendationsExtraction
  describe('FS-TriggerRecommendationsExtraction', () => {
    it('POST /extract/recommendations with missing insights returns 400', async () => {
      const { insights, ...body } = VALID_RECOMMENDATIONS_REQUEST;
      const response = await fetch(`${BASE_URL}/extract/recommendations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result).toHaveProperty('error');
      expect(typeof result.error).toBe('string');
    });

    it('POST /extract/recommendations with empty insights array returns 400', async () => {
      const response = await fetch(`${BASE_URL}/extract/recommendations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...VALID_RECOMMENDATIONS_REQUEST, insights: [] }),
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result).toHaveProperty('error');
    });

    it('POST /extract/recommendations with missing goal returns 400', async () => {
      const { goal, ...body } = VALID_RECOMMENDATIONS_REQUEST;
      const response = await fetch(`${BASE_URL}/extract/recommendations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result).toHaveProperty('error');
    });

    it('POST /extract/recommendations with insight missing text returns 400', async () => {
      const response = await fetch(`${BASE_URL}/extract/recommendations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...VALID_RECOMMENDATIONS_REQUEST,
          insights: [{ insight_id: 'insight-001' }],
        }),
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result).toHaveProperty('error');
    });

    it('POST /extract/recommendations with insight missing insight_id returns 400', async () => {
      const response = await fetch(`${BASE_URL}/extract/recommendations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...VALID_RECOMMENDATIONS_REQUEST,
          insights: [{ text: 'Some insight text' }],
        }),
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result).toHaveProperty('error');
    });

    it('POST /extract/recommendations with empty body returns 400', async () => {
      const response = await fetch(`${BASE_URL}/extract/recommendations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result).toHaveProperty('error');
    });
  });

  // @fsid:FS-DisplaySuggestedRecommendations
  describe('FS-DisplaySuggestedRecommendations', () => {
    it('POST /extract/recommendations with valid body returns 200 with suggestions array and insight_ids', async () => {
      const response = await fetch(`${BASE_URL}/extract/recommendations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(VALID_RECOMMENDATIONS_REQUEST),
      });

      // 200 if LLM configured, 503 if not — both are valid for this test
      if (response.status === 200) {
        const result = await response.json();
        expect(result).toHaveProperty('suggestions');
        expect(Array.isArray(result.suggestions)).toBe(true);
        expect(result).toHaveProperty('insight_ids');
        expect(Array.isArray(result.insight_ids)).toBe(true);
        expect(result.insight_ids).toEqual(VALID_RECOMMENDATIONS_REQUEST.insights.map(i => i.insight_id));
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

  // @fsid:FS-RecommendationsExtractionErrorDisplay
  describe('FS-RecommendationsExtractionErrorDisplay', () => {
    it('all error responses from /extract/recommendations return structured JSON { error: string }', async () => {
      const response = await fetch(`${BASE_URL}/extract/recommendations`, {
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

  // Frontend UI scenarios for insight selection / suggestions panel are covered by:
  // tests/e2e/auto-recommendations-extraction.spec.ts
});
