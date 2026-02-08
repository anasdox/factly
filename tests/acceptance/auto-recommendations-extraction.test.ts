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

  // --- Frontend: Insight selection (require browser, defined as todo) ---

  // @fsid:FS-SelectInsights
  describe('FS-SelectInsights', () => {
    test.todo('clicking an Insight item marks it as selected and shows the selection toolbar with count');
  });

  // @fsid:FS-DeselectInsight
  describe('FS-DeselectInsight', () => {
    test.todo('clicking an already selected Insight deselects it and updates the toolbar count');
  });

  // @fsid:FS-ClearInsightSelection
  describe('FS-ClearInsightSelection', () => {
    test.todo('clicking Clear Selection deselects all insights and hides the selection toolbar');
  });

  // @fsid:FS-GenerateRecommendationsDisabledWithoutSelection
  describe('FS-GenerateRecommendationsDisabledWithoutSelection', () => {
    test.todo('no selection toolbar is displayed when no insights are selected');
  });

  // --- Frontend: Suggestions panel (require browser, defined as todo) ---

  // @fsid:FS-AcceptSuggestedRecommendation
  describe('FS-AcceptSuggestedRecommendation', () => {
    test.todo('clicking Accept on a suggested recommendation adds it to the Recommendations column linked to source Insights');
  });

  // @fsid:FS-EditSuggestedRecommendation
  describe('FS-EditSuggestedRecommendation', () => {
    test.todo('clicking Edit makes the card editable; confirming adds the modified recommendation to the pipeline');
  });

  // @fsid:FS-RejectSuggestedRecommendation
  describe('FS-RejectSuggestedRecommendation', () => {
    test.todo('clicking Reject removes the card without adding any recommendation');
  });

  // @fsid:FS-AcceptAllSuggestedRecommendations
  describe('FS-AcceptAllSuggestedRecommendations', () => {
    test.todo('clicking Accept All adds all remaining suggestions to the Recommendations column and closes the panel');
  });

  // @fsid:FS-RejectAllSuggestedRecommendations
  describe('FS-RejectAllSuggestedRecommendations', () => {
    test.todo('clicking Reject All discards all remaining suggestions and closes the panel');
  });

  // @fsid:FS-CloseSuggestionsRecommendationsPanel
  describe('FS-CloseSuggestionsRecommendationsPanel', () => {
    test.todo('closing the panel discards remaining suggestions but keeps previously accepted recommendations');
  });

  // @fsid:FS-ManualRecommendationFromSelection
  describe('FS-ManualRecommendationFromSelection', () => {
    test.todo('clicking Add Recommendation on the selection toolbar opens RecommendationModal with related_insights pre-filled');
  });
});
