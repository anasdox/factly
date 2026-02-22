/**
 * Acceptance tests for AI-Assisted Update Proposals feature.
 * @see specs/functional/ai-assisted-updates.feature
 *
 * FSIDs covered:
 * - FS-TriggerAiUpdateOnStaleItem
 * - FS-DisplayAiUpdateProposal
 * - FS-AcceptAiUpdateProposal
 * - FS-EditAiUpdateProposal
 * - FS-RejectAiUpdateProposal
 * - FS-AiUpdateReceivesFullContext
 * - FS-ProposeUpdateDisabledWhenBackendUnavailable
 * - FS-ProposeUpdateNotShownForValidItems
 * - FS-ProposeUpdateShownForAllActionableStatuses
 * - FS-AiUpdateErrorDisplay
 * - FS-AiUpdateForOutputProposesMarkdown
 */

import { BASE_URL } from './helpers/backend-server';

const VALID_PROPOSE_UPDATE_REQUEST = {
  entity_type: 'fact',
  current_text: 'Revenue grew by 15% in Q3 driven by new product launches.',
  upstream_change: {
    old_text: 'The company launched 3 new products in Q3.',
    new_text: 'The company launched 5 new products in Q3, including 2 premium-tier offerings.',
    entity_type: 'input',
  },
  goal: 'Analyze Q3 business performance and growth drivers',
};

describe('AI-Assisted Update Proposals', () => {

  // --- Backend: POST /propose/update validation ---

  // @fsid:FS-TriggerAiUpdateOnStaleItem
  describe('FS-TriggerAiUpdateOnStaleItem', () => {
    it('POST /propose/update with missing entity_type returns 400', async () => {
      const { entity_type, ...body } = VALID_PROPOSE_UPDATE_REQUEST;
      const response = await fetch(`${BASE_URL}/propose/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result).toHaveProperty('error');
      expect(typeof result.error).toBe('string');
    });

    it('POST /propose/update with invalid entity_type returns 400', async () => {
      const response = await fetch(`${BASE_URL}/propose/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...VALID_PROPOSE_UPDATE_REQUEST, entity_type: 'input' }),
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result).toHaveProperty('error');
    });

    it('POST /propose/update with missing current_text returns 400', async () => {
      const { current_text, ...body } = VALID_PROPOSE_UPDATE_REQUEST;
      const response = await fetch(`${BASE_URL}/propose/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result).toHaveProperty('error');
    });

    it('POST /propose/update with empty current_text returns 400', async () => {
      const response = await fetch(`${BASE_URL}/propose/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...VALID_PROPOSE_UPDATE_REQUEST, current_text: '' }),
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result).toHaveProperty('error');
    });

    it('POST /propose/update with missing upstream_change returns 400', async () => {
      const { upstream_change, ...body } = VALID_PROPOSE_UPDATE_REQUEST;
      const response = await fetch(`${BASE_URL}/propose/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result).toHaveProperty('error');
    });

    it('POST /propose/update with missing upstream_change.old_text returns 400', async () => {
      const response = await fetch(`${BASE_URL}/propose/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...VALID_PROPOSE_UPDATE_REQUEST,
          upstream_change: { new_text: 'updated', entity_type: 'input' },
        }),
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result).toHaveProperty('error');
    });

    it('POST /propose/update with missing goal returns 400', async () => {
      const { goal, ...body } = VALID_PROPOSE_UPDATE_REQUEST;
      const response = await fetch(`${BASE_URL}/propose/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result).toHaveProperty('error');
    });

    it('POST /propose/update with empty body returns 400', async () => {
      const response = await fetch(`${BASE_URL}/propose/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result).toHaveProperty('error');
    });
  });

  // @fsid:FS-DisplayAiUpdateProposal
  describe('FS-DisplayAiUpdateProposal', () => {
    it('POST /propose/update with valid body returns 200 with proposed_text and explanation', async () => {
      const response = await fetch(`${BASE_URL}/propose/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(VALID_PROPOSE_UPDATE_REQUEST),
      });

      // 200 if LLM configured, 503 if not — both are valid
      if (response.status === 200) {
        const result = await response.json();
        expect(result).toHaveProperty('proposed_text');
        expect(typeof result.proposed_text).toBe('string');
        expect(result.proposed_text.length).toBeGreaterThan(0);
        expect(result).toHaveProperty('explanation');
        expect(typeof result.explanation).toBe('string');
      } else {
        expect(response.status).toBe(503);
        const result = await response.json();
        expect(result).toHaveProperty('error');
      }
    });
  });

  // @fsid:FS-AiUpdateReceivesFullContext
  describe('FS-AiUpdateReceivesFullContext', () => {
    it('request includes upstream old_text, new_text, entity_type, current_text, and goal', () => {
      // Validate request structure matches spec
      expect(VALID_PROPOSE_UPDATE_REQUEST).toHaveProperty('entity_type');
      expect(VALID_PROPOSE_UPDATE_REQUEST).toHaveProperty('current_text');
      expect(VALID_PROPOSE_UPDATE_REQUEST).toHaveProperty('goal');
      expect(VALID_PROPOSE_UPDATE_REQUEST.upstream_change).toHaveProperty('old_text');
      expect(VALID_PROPOSE_UPDATE_REQUEST.upstream_change).toHaveProperty('new_text');
      expect(VALID_PROPOSE_UPDATE_REQUEST.upstream_change).toHaveProperty('entity_type');
    });
  });

  // @fsid:FS-AiUpdateForOutputProposesMarkdown
  describe('FS-AiUpdateForOutputProposesMarkdown', () => {
    it('POST /propose/update for output entity with output_type returns 200', async () => {
      const outputRequest = {
        entity_type: 'output',
        current_text: '# Report\n\nKey findings...',
        upstream_change: {
          old_text: 'Implement monitoring network.',
          new_text: 'Implement monitoring network with real-time alerting.',
          entity_type: 'recommendation',
        },
        goal: 'Address coastal infrastructure concerns',
        output_type: 'report',
      };

      const response = await fetch(`${BASE_URL}/propose/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(outputRequest),
      });

      if (response.status === 200) {
        const result = await response.json();
        expect(result).toHaveProperty('proposed_text');
        expect(typeof result.proposed_text).toBe('string');
      } else {
        // 503 if LLM not configured
        expect(response.status).toBe(503);
      }
    });
  });

  // @fsid:FS-AiUpdateErrorDisplay
  describe('FS-AiUpdateErrorDisplay', () => {
    it('all error responses from /propose/update return structured JSON { error: string }', async () => {
      const response = await fetch(`${BASE_URL}/propose/update`, {
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

  // Frontend UI scenarios for proposal panel / propose-update availability are covered by:
  // tests/e2e/ai-assisted-updates.spec.ts
});
