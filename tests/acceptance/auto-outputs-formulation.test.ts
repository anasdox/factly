/**
 * Acceptance tests for Auto Outputs Formulation from Recommendations feature.
 * @see specs/functional/auto-outputs-formulation.feature
 *
 * FSIDs covered:
 * - FS-SelectRecommendations
 * - FS-DeselectRecommendation
 * - FS-ClearRecommendationSelection
 * - FS-SelectOutputType
 * - FS-TriggerOutputsFormulation
 * - FS-DisplaySuggestedOutputs
 * - FS-AcceptSuggestedOutput
 * - FS-EditSuggestedOutput
 * - FS-RejectSuggestedOutput
 * - FS-AcceptAllSuggestedOutputs
 * - FS-RejectAllSuggestedOutputs
 * - FS-CloseSuggestionsOutputsPanel
 * - FS-OutputsFormulationErrorDisplay
 * - FS-ManualOutputFromSelection
 * - FS-FormulateOutputsDisabledWithoutSelection
 */

import { BASE_URL } from './helpers/backend-server';

const VALID_OUTPUTS_REQUEST = {
  recommendations: [
    { recommendation_id: 'rec-001', text: 'Establish a coastal monitoring network with sensors every 10km along vulnerable shorelines.' },
    { recommendation_id: 'rec-002', text: 'Implement building code revisions for structures within 500m of current high-tide lines.' },
  ],
  goal: 'Produce deliverables to address climate change impacts on coastal infrastructure',
  output_type: 'report',
};

const VALID_OUTPUT_TYPES = ['report', 'presentation', 'action_plan', 'brief'];

describe('Auto Outputs Formulation from Recommendations', () => {

  // --- Backend: POST /extract/outputs validation ---

  // @fsid:FS-TriggerOutputsFormulation
  describe('FS-TriggerOutputsFormulation', () => {
    it('POST /extract/outputs with missing recommendations returns 400', async () => {
      const { recommendations, ...body } = VALID_OUTPUTS_REQUEST;
      const response = await fetch(`${BASE_URL}/extract/outputs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result).toHaveProperty('error');
      expect(typeof result.error).toBe('string');
    });

    it('POST /extract/outputs with empty recommendations array returns 400', async () => {
      const response = await fetch(`${BASE_URL}/extract/outputs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...VALID_OUTPUTS_REQUEST, recommendations: [] }),
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result).toHaveProperty('error');
    });

    it('POST /extract/outputs with missing goal returns 400', async () => {
      const { goal, ...body } = VALID_OUTPUTS_REQUEST;
      const response = await fetch(`${BASE_URL}/extract/outputs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result).toHaveProperty('error');
    });

    it('POST /extract/outputs with missing output_type returns 400', async () => {
      const { output_type, ...body } = VALID_OUTPUTS_REQUEST;
      const response = await fetch(`${BASE_URL}/extract/outputs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result).toHaveProperty('error');
    });

    it('POST /extract/outputs with invalid output_type returns 400', async () => {
      const response = await fetch(`${BASE_URL}/extract/outputs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...VALID_OUTPUTS_REQUEST, output_type: 'invalid_type' }),
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result).toHaveProperty('error');
    });

    it('POST /extract/outputs with recommendation missing text returns 400', async () => {
      const response = await fetch(`${BASE_URL}/extract/outputs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...VALID_OUTPUTS_REQUEST,
          recommendations: [{ recommendation_id: 'rec-001' }],
        }),
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result).toHaveProperty('error');
    });

    it('POST /extract/outputs with recommendation missing recommendation_id returns 400', async () => {
      const response = await fetch(`${BASE_URL}/extract/outputs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...VALID_OUTPUTS_REQUEST,
          recommendations: [{ text: 'Some recommendation text' }],
        }),
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result).toHaveProperty('error');
    });

    it('POST /extract/outputs with empty body returns 400', async () => {
      const response = await fetch(`${BASE_URL}/extract/outputs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result).toHaveProperty('error');
    });

    it.each(VALID_OUTPUT_TYPES)('POST /extract/outputs accepts output_type "%s"', async (outputType) => {
      const response = await fetch(`${BASE_URL}/extract/outputs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...VALID_OUTPUTS_REQUEST, output_type: outputType }),
      });

      // Should not be 400 — either 200 (LLM configured) or 503 (not configured)
      expect(response.status).not.toBe(400);
    }, 60_000);
  });

  // @fsid:FS-DisplaySuggestedOutputs
  describe('FS-DisplaySuggestedOutputs', () => {
    it('POST /extract/outputs with valid body returns 200 with suggestions array and recommendation_ids', async () => {
      const response = await fetch(`${BASE_URL}/extract/outputs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(VALID_OUTPUTS_REQUEST),
      });

      // 200 if LLM configured, 503 if not — both are valid for this test
      if (response.status === 200) {
        const result = await response.json();
        expect(result).toHaveProperty('suggestions');
        expect(Array.isArray(result.suggestions)).toBe(true);
        expect(result).toHaveProperty('recommendation_ids');
        expect(Array.isArray(result.recommendation_ids)).toBe(true);
        expect(result.recommendation_ids).toEqual(VALID_OUTPUTS_REQUEST.recommendations.map(r => r.recommendation_id));
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

  // @fsid:FS-OutputsFormulationErrorDisplay
  describe('FS-OutputsFormulationErrorDisplay', () => {
    it('all error responses from /extract/outputs return structured JSON { error: string }', async () => {
      const response = await fetch(`${BASE_URL}/extract/outputs`, {
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

  // --- Frontend: Recommendation selection (require browser, defined as todo) ---

  // @fsid:FS-SelectRecommendations
  describe('FS-SelectRecommendations', () => {
    test.todo('clicking a Recommendation item marks it as selected and shows the selection toolbar with count');
  });

  // @fsid:FS-DeselectRecommendation
  describe('FS-DeselectRecommendation', () => {
    test.todo('clicking an already selected Recommendation deselects it and updates the toolbar count');
  });

  // @fsid:FS-ClearRecommendationSelection
  describe('FS-ClearRecommendationSelection', () => {
    test.todo('clicking Clear Selection deselects all recommendations and hides the selection toolbar');
  });

  // @fsid:FS-SelectOutputType
  describe('FS-SelectOutputType', () => {
    test.todo('selection toolbar displays a dropdown with output types defaulting to Report');
  });

  // @fsid:FS-FormulateOutputsDisabledWithoutSelection
  describe('FS-FormulateOutputsDisabledWithoutSelection', () => {
    test.todo('no selection toolbar is displayed when no recommendations are selected');
  });

  // --- Frontend: Suggestions panel (require browser, defined as todo) ---

  // @fsid:FS-AcceptSuggestedOutput
  describe('FS-AcceptSuggestedOutput', () => {
    test.todo('clicking Accept on a suggested output adds it to the Outputs column with selected type linked to source Recommendations');
  });

  // @fsid:FS-EditSuggestedOutput
  describe('FS-EditSuggestedOutput', () => {
    test.todo('clicking Edit makes the card editable; confirming adds the modified output to the pipeline');
  });

  // @fsid:FS-RejectSuggestedOutput
  describe('FS-RejectSuggestedOutput', () => {
    test.todo('clicking Reject removes the card without adding any output');
  });

  // @fsid:FS-AcceptAllSuggestedOutputs
  describe('FS-AcceptAllSuggestedOutputs', () => {
    test.todo('clicking Accept All adds all remaining suggestions to the Outputs column and closes the panel');
  });

  // @fsid:FS-RejectAllSuggestedOutputs
  describe('FS-RejectAllSuggestedOutputs', () => {
    test.todo('clicking Reject All discards all remaining suggestions and closes the panel');
  });

  // @fsid:FS-CloseSuggestionsOutputsPanel
  describe('FS-CloseSuggestionsOutputsPanel', () => {
    test.todo('closing the panel discards remaining suggestions but keeps previously accepted outputs');
  });

  // @fsid:FS-ManualOutputFromSelection
  describe('FS-ManualOutputFromSelection', () => {
    test.todo('clicking Add Output on the selection toolbar opens OutputModal with related_recommendations pre-filled');
  });
});
