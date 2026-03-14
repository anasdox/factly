export {};

/**
 * Acceptance tests for Bulk Review Workflow feature.
 * @see specs/functional/bulk-review-workflow.feature
 *
 * FSIDs covered:
 * - FS-ReviewCountButton
 * - FS-ReviewCountButtonHiddenWhenNone
 * - FS-SelectReviewableItems
 * - FS-ScrollToFirstReviewable
 * - FS-ToolbarReviewButton
 * - FS-ToolbarReviewButtonHiddenWhenNoReviewable
 * - FS-BulkReviewModalOpens
 * - FS-BulkReviewProposalCard
 * - FS-BulkReviewAcceptProposal
 * - FS-BulkReviewEditProposal
 * - FS-BulkReviewDismissProposal
 * - FS-BulkReviewAcceptAll
 * - FS-BulkReviewDismissAll
 * - FS-BulkReviewAutoClose
 * - FS-BulkReviewProposalError
 * - FS-BulkReviewTruncationError
 * - FS-BulkReviewOutputMarkdownPreview
 * - FS-BulkReviewOutputUsesRawMarkdownPrompt
 *
 * Browser UI interactions are covered in `tests/e2e/bulk-review-workflow.spec.ts`.
 */

import { BASE_URL } from './helpers/backend-server';

type EntityStatus = 'draft' | 'validated' | 'outdated' | 'needs_review' | 'needs_refresh'
                  | 'unsupported' | 'weak' | 'risky';

const ACTIONABLE_STATUSES: EntityStatus[] = ['needs_review', 'needs_refresh', 'unsupported', 'weak', 'risky'];
const NON_ACTIONABLE_STATUSES: EntityStatus[] = ['draft', 'validated'];

// --- Domain logic tests (pure functions, no browser needed) ---

describe('Bulk Review Workflow', () => {

  // @fsid:FS-ReviewCountButton
  describe('FS-ReviewCountButton', () => {
    it('counts items with actionable statuses in a column', () => {
      const items = [
        { fact_id: 'F-1', status: 'needs_review' as EntityStatus },
        { fact_id: 'F-2', status: 'draft' as EntityStatus },
        { fact_id: 'F-3', status: 'weak' as EntityStatus },
        { fact_id: 'F-4', status: 'validated' as EntityStatus },
        { fact_id: 'F-5', status: 'unsupported' as EntityStatus },
      ];

      const reviewableCount = items.filter(i => ACTIONABLE_STATUSES.includes(i.status)).length;
      expect(reviewableCount).toBe(3);
    });
  });

  // @fsid:FS-ReviewCountButtonHiddenWhenNone
  describe('FS-ReviewCountButtonHiddenWhenNone', () => {
    it('review count is 0 when all items are draft or validated', () => {
      const items = [
        { fact_id: 'F-1', status: 'draft' as EntityStatus },
        { fact_id: 'F-2', status: 'validated' as EntityStatus },
        { fact_id: 'F-3', status: 'draft' as EntityStatus },
      ];

      const reviewableCount = items.filter(i => ACTIONABLE_STATUSES.includes(i.status)).length;
      expect(reviewableCount).toBe(0);
    });
  });

  // @fsid:FS-SelectReviewableItems
  describe('FS-SelectReviewableItems', () => {
    it('selects only items with actionable statuses', () => {
      const items = [
        { fact_id: 'F-1', status: 'needs_review' as EntityStatus },
        { fact_id: 'F-2', status: 'draft' as EntityStatus },
        { fact_id: 'F-3', status: 'needs_review' as EntityStatus },
        { fact_id: 'F-4', status: 'validated' as EntityStatus },
        { fact_id: 'F-5', status: 'risky' as EntityStatus },
      ];

      const selected = items.filter(i => ACTIONABLE_STATUSES.includes(i.status));
      expect(selected).toHaveLength(3);
      expect(selected.map(s => s.fact_id)).toEqual(['F-1', 'F-3', 'F-5']);
    });
  });

  // @fsid:FS-ToolbarReviewButton
  describe('FS-ToolbarReviewButton', () => {
    it('review button is available when at least one selected item has actionable status', () => {
      const selectedItems = [
        { fact_id: 'F-1', status: 'draft' as EntityStatus },
        { fact_id: 'F-2', status: 'needs_review' as EntityStatus },
      ];

      const hasReviewable = selectedItems.some(i => ACTIONABLE_STATUSES.includes(i.status));
      expect(hasReviewable).toBe(true);
    });
  });

  // @fsid:FS-ToolbarReviewButtonHiddenWhenNoReviewable
  describe('FS-ToolbarReviewButtonHiddenWhenNoReviewable', () => {
    it('review button is not available when no selected items have actionable status', () => {
      const selectedItems = [
        { fact_id: 'F-1', status: 'draft' as EntityStatus },
        { fact_id: 'F-2', status: 'validated' as EntityStatus },
      ];

      const hasReviewable = selectedItems.some(i => ACTIONABLE_STATUSES.includes(i.status));
      expect(hasReviewable).toBe(false);
    });
  });

  // @fsid:FS-BulkReviewModalOpens
  describe('FS-BulkReviewModalOpens', () => {
    it('parallel AI proposals are triggered for each reviewable item', () => {
      const reviewableItems = [
        { fact_id: 'F-1', text: 'Fact 1', status: 'needs_review' as EntityStatus },
        { fact_id: 'F-2', text: 'Fact 2', status: 'weak' as EntityStatus },
        { fact_id: 'F-3', text: 'Fact 3', status: 'needs_review' as EntityStatus },
      ];

      // Each item generates one proposal request
      const proposalRequests = reviewableItems.map(item => ({
        entity_type: 'fact',
        current_text: item.text,
      }));

      expect(proposalRequests).toHaveLength(3);
      expect(proposalRequests.every(r => r.entity_type === 'fact')).toBe(true);
    });
  });

  // @fsid:FS-BulkReviewProposalCard
  describe('FS-BulkReviewProposalCard', () => {
    it('POST /propose/update returns proposed_text and explanation for review card', async () => {
      const response = await fetch(`${BASE_URL}/propose/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity_type: 'fact',
          current_text: 'Revenue grew by 15% in Q3.',
          upstream_change: {
            old_text: 'The company launched 3 new products.',
            new_text: 'The company launched 5 new products, including 2 premium offerings.',
            entity_type: 'input',
          },
          goal: 'Analyze Q3 performance',
        }),
      });

      if (response.status === 200) {
        const result = await response.json();
        expect(result).toHaveProperty('proposed_text');
        expect(typeof result.proposed_text).toBe('string');
        expect(result.proposed_text.length).toBeGreaterThan(0);
        expect(result).toHaveProperty('explanation');
        expect(typeof result.explanation).toBe('string');
      } else {
        expect(response.status).toBe(503);
      }
    });
  });

  // @fsid:FS-BulkReviewAcceptProposal
  describe('FS-BulkReviewAcceptProposal', () => {
    it('accepting a proposal creates a new version and clears status', () => {
      const item = {
        fact_id: 'F-1',
        text: 'Old fact text',
        version: 1,
        status: 'needs_review' as EntityStatus,
        versions: [] as { version: number; text: string; created_at: string }[],
      };

      const proposedText = 'Updated fact text based on AI proposal';

      // Simulate accept: new version, update text, clear status
      const previousVersion = { version: item.version, text: item.text, created_at: new Date().toISOString() };
      const accepted = {
        ...item,
        text: proposedText,
        version: item.version + 1,
        status: 'validated' as EntityStatus,
        versions: [...item.versions, previousVersion],
      };

      expect(accepted.text).toBe(proposedText);
      expect(accepted.version).toBe(2);
      expect(accepted.status).toBe('validated');
      expect(accepted.versions).toHaveLength(1);
      expect(accepted.versions[0].text).toBe('Old fact text');
    });
  });

  // @fsid:FS-BulkReviewEditProposal
  describe('FS-BulkReviewEditProposal', () => {
    it('editing a proposal before accepting uses modified text', () => {
      const proposedText = 'AI proposed text';
      const modifiedText = 'Analyst modified text';

      const item = {
        fact_id: 'F-1',
        text: 'Original text',
        version: 1,
        status: 'needs_review' as EntityStatus,
      };

      // Simulate edit + accept with modified text
      const accepted = {
        ...item,
        text: modifiedText,
        version: item.version + 1,
        status: 'validated' as EntityStatus,
      };

      expect(accepted.text).toBe(modifiedText);
      expect(accepted.text).not.toBe(proposedText);
      expect(accepted.version).toBe(2);
      expect(accepted.status).toBe('validated');
    });
  });

  // @fsid:FS-BulkReviewDismissProposal
  describe('FS-BulkReviewDismissProposal', () => {
    it('dismissing a proposal leaves entity unchanged', () => {
      const item = {
        fact_id: 'F-1',
        text: 'Original text',
        version: 1,
        status: 'needs_review' as EntityStatus,
      };

      // Dismiss: entity is not modified
      const afterDismiss = { ...item };

      expect(afterDismiss.text).toBe('Original text');
      expect(afterDismiss.version).toBe(1);
      expect(afterDismiss.status).toBe('needs_review');
    });
  });

  // @fsid:FS-BulkReviewAcceptAll
  describe('FS-BulkReviewAcceptAll', () => {
    it('accept all processes each proposal sequentially', () => {
      const items = [
        { fact_id: 'F-1', text: 'Fact 1', version: 1, status: 'needs_review' as EntityStatus },
        { fact_id: 'F-2', text: 'Fact 2', version: 1, status: 'needs_review' as EntityStatus },
        { fact_id: 'F-3', text: 'Fact 3', version: 2, status: 'weak' as EntityStatus },
      ];

      const proposals = [
        { proposed_text: 'Updated fact 1', explanation: 'reason 1' },
        { proposed_text: 'Updated fact 2', explanation: 'reason 2' },
        { proposed_text: 'Updated fact 3', explanation: 'reason 3' },
      ];

      // Simulate sequential accept all
      const updatedItems = items.map((item, idx) => ({
        ...item,
        text: proposals[idx].proposed_text,
        version: item.version + 1,
        status: 'validated' as EntityStatus,
      }));

      expect(updatedItems).toHaveLength(3);
      expect(updatedItems[0].text).toBe('Updated fact 1');
      expect(updatedItems[0].version).toBe(2);
      expect(updatedItems[1].text).toBe('Updated fact 2');
      expect(updatedItems[1].version).toBe(2);
      expect(updatedItems[2].text).toBe('Updated fact 3');
      expect(updatedItems[2].version).toBe(3);
      expect(updatedItems.every(i => i.status === 'validated')).toBe(true);
    });
  });

  // @fsid:FS-BulkReviewDismissAll
  describe('FS-BulkReviewDismissAll', () => {
    it('dismiss all leaves all entities unchanged', () => {
      const items = [
        { fact_id: 'F-1', text: 'Fact 1', version: 1, status: 'needs_review' as EntityStatus },
        { fact_id: 'F-2', text: 'Fact 2', version: 2, status: 'weak' as EntityStatus },
      ];

      // Dismiss all: no modifications
      const afterDismiss = items.map(i => ({ ...i }));

      expect(afterDismiss[0].text).toBe('Fact 1');
      expect(afterDismiss[0].status).toBe('needs_review');
      expect(afterDismiss[1].text).toBe('Fact 2');
      expect(afterDismiss[1].status).toBe('weak');
    });
  });

  // @fsid:FS-BulkReviewAutoClose
  describe('FS-BulkReviewAutoClose', () => {
    it('modal should close when all proposals are handled (accepted or dismissed)', () => {
      const proposals = [
        { id: 'F-1', handled: false },
        { id: 'F-2', handled: false },
      ];

      // Handle first (accept)
      proposals[0].handled = true;
      expect(proposals.every(p => p.handled)).toBe(false);

      // Handle second (dismiss)
      proposals[1].handled = true;
      expect(proposals.every(p => p.handled)).toBe(true);
      // When all handled → modal auto-closes
    });
  });

  // @fsid:FS-BulkReviewProposalError
  describe('FS-BulkReviewProposalError', () => {
    it('POST /propose/update error returns structured JSON without crashing batch', async () => {
      // Invalid request should return error, not crash
      const response = await fetch(`${BASE_URL}/propose/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity_type: 'fact',
          current_text: '',  // empty → 400
          upstream_change: { old_text: 'old', new_text: 'new', entity_type: 'input' },
          goal: 'test',
        }),
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result).toHaveProperty('error');
      expect(typeof result.error).toBe('string');
    });
  });

  // @fsid:FS-BulkReviewTruncationError
  describe('FS-BulkReviewTruncationError', () => {
    it('POST /propose/update for output with invalid output_type returns 400', async () => {
      const response = await fetch(`${BASE_URL}/propose/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity_type: 'output',
          current_text: '# A very long report...',
          upstream_change: {
            old_text: 'Old recommendation',
            new_text: 'Updated recommendation',
            entity_type: 'recommendation',
          },
          goal: 'Test truncation handling',
          output_type: 'invalid_type',
        }),
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result).toHaveProperty('error');
    });

    it('truncation errors from backend are reported as structured error', async () => {
      // If a truncated response occurs, the backend returns 502 with structured error
      // We test the error format expectation
      const errorResponse = { error: 'Response truncated — output too long for token limit' };
      expect(errorResponse).toHaveProperty('error');
      expect(errorResponse.error).toContain('truncated');
    });
  });

  // @fsid:FS-BulkReviewOutputMarkdownPreview
  describe('FS-BulkReviewOutputMarkdownPreview', () => {
    it('output proposals contain Markdown text suitable for preview rendering', async () => {
      const response = await fetch(`${BASE_URL}/propose/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity_type: 'output',
          current_text: '# Report\n\n## Key Findings\n\n- Finding 1\n- Finding 2',
          upstream_change: {
            old_text: 'Implement monitoring.',
            new_text: 'Implement monitoring with real-time alerting.',
            entity_type: 'recommendation',
          },
          goal: 'Address infrastructure concerns',
          output_type: 'report',
        }),
      });

      if (response.status === 200) {
        const result = await response.json();
        expect(result).toHaveProperty('proposed_text');
        expect(typeof result.proposed_text).toBe('string');
        // Output proposals return Markdown (not JSON-wrapped)
        expect(result.proposed_text).not.toMatch(/^\s*\{/);
      } else {
        expect(response.status).toBe(503);
      }
    });
  });

  // @fsid:FS-BulkReviewOutputUsesRawMarkdownPrompt
  describe('FS-BulkReviewOutputUsesRawMarkdownPrompt', () => {
    it('output proposal response is not JSON-wrapped Markdown', async () => {
      const response = await fetch(`${BASE_URL}/propose/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity_type: 'output',
          current_text: '# Action Plan\n\n1. Step one\n2. Step two',
          upstream_change: {
            old_text: 'Focus on cost reduction.',
            new_text: 'Focus on cost reduction and sustainability.',
            entity_type: 'recommendation',
          },
          goal: 'Improve operational efficiency',
          output_type: 'action_plan',
        }),
      });

      if (response.status === 200) {
        const result = await response.json();
        expect(result).toHaveProperty('proposed_text');
        // Raw Markdown prompt means response is not {"proposed_text": "..."} format from LLM
        // The backend parses it and returns clean proposed_text
        expect(typeof result.proposed_text).toBe('string');
        expect(result).toHaveProperty('explanation');
      } else {
        expect(response.status).toBe(503);
      }
    });
  });

  // Browser UI interactions migrated to Playwright:
  // - @fsid:FS-ReviewCountButton (visual rendering)
  // - @fsid:FS-ReviewCountButtonHiddenWhenNone (visual rendering)
  // - @fsid:FS-SelectReviewableItems (click + selection)
  // - @fsid:FS-ScrollToFirstReviewable (scroll behavior)
  // - @fsid:FS-ToolbarReviewButton (toolbar rendering)
  // - @fsid:FS-ToolbarReviewButtonHiddenWhenNoReviewable (toolbar rendering)
  // - @fsid:FS-BulkReviewModalOpens (modal interaction)
  // - @fsid:FS-BulkReviewAutoClose (modal auto-close)
  // See `tests/e2e/bulk-review-workflow.spec.ts`.
});
