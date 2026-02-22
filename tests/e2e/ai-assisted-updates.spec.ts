import { expect, Page, test } from '@playwright/test';
import { buildDiscovery, gotoApp, readStoredDiscovery, seedDiscovery } from './helpers/factly';

async function stubBackendStatusValue(page: Page, ok: boolean): Promise<void> {
  await page.route('**/status', async (route) => {
    await route.fulfill({
      status: ok ? 200 : 503,
      contentType: 'application/json',
      body: ok ? '{}' : JSON.stringify({ error: 'Backend unavailable' }),
    });
  });
}

async function stubProposeUpdate(
  page: Page,
  handler: (body: any) => { status?: number; body: any },
): Promise<void> {
  await page.route('**/propose/update', async (route) => {
    const raw = route.request().postData() || '{}';
    const parsed = JSON.parse(raw);
    const result = handler(parsed);
    await route.fulfill({
      status: result.status ?? 200,
      contentType: 'application/json',
      body: JSON.stringify(result.body),
    });
  });
}

function baseFactProposalDiscovery() {
  return buildDiscovery({
    title: 'AI Update Proposals E2E',
    goal: 'Keep churn analysis current after upstream changes',
    inputs: [
      {
        input_id: 'I-1',
        title: 'Source Input',
        type: 'text',
        text: 'Updated input text with stronger evidence about support delays.',
        version: 2,
        status: 'validated',
        created_at: '2026-02-22T10:00:00.000Z',
      } as any,
    ],
    facts: [
      {
        fact_id: 'F-1',
        text: 'Support response time increased in Q4.',
        related_inputs: ['I-1'],
        version: 2,
        status: 'needs_review',
        created_at: '2026-02-22T11:00:00.000Z',
        versions: [
          {
            version: 1,
            text: 'Support response time increased.',
            created_at: '2026-02-21T11:00:00.000Z',
          },
        ],
      } as any,
    ],
    insights: [],
    recommendations: [],
    outputs: [],
  });
}

async function openProposeUpdateForFact(page: Page): Promise<void> {
  const wrapper = page.locator('#fact-F-1');
  await wrapper.hover();
  await wrapper.locator('[title="Propose AI update"]').click();
  await expect(page.locator('.proposal-panel h3')).toHaveText('AI Update Proposal');
}

function factToolbar(page: Page, factId: string) {
  return page.locator(`#fact-${factId}-toolbar`);
}

test.describe('AI-Assisted Updates (E2E)', () => {
  // @fsid:FS-AcceptAiUpdateProposal
  test.describe('FS-AcceptAiUpdateProposal', () => {
    test('accepting an AI-proposed update creates a new version and clears status to validated', async ({ page }) => {
      await stubBackendStatusValue(page, true);
      await stubProposeUpdate(page, (body) => {
        expect(body.entity_type).toBe('fact');
        expect(body.current_text).toMatch(/support response time increased in q4/i);
        expect(body.upstream_change.new_text).toMatch(/updated input text/i);
        expect(body.goal).toMatch(/keep churn analysis current/i);
        return {
          body: {
            proposed_text: 'Support response time reached 52h in Q4 after the migration release.',
            explanation: 'Updated with stronger evidence from the revised source input.',
          },
        };
      });

      const discovery = baseFactProposalDiscovery();
      await seedDiscovery(page, discovery);
      await gotoApp(page, discovery.title);

      await openProposeUpdateForFact(page);
      await page.getByRole('button', { name: /^Accept$/ }).click();

      await expect(page.locator('.proposal-panel')).toHaveCount(0);
      await expect(page.locator('.column.facts .fact-item')).toContainText(/52h in q4/i);

      const stored = await readStoredDiscovery(page);
      const fact = stored.facts[0] as any;
      expect(fact.text).toBe('Support response time reached 52h in Q4 after the migration release.');
      expect(fact.version).toBe(3);
      expect(fact.status).toBe('validated');
      expect(Array.isArray(fact.versions)).toBe(true);
      expect(fact.versions[fact.versions.length - 1].text).toBe('Support response time increased in Q4.');
    });
  });

  // @fsid:FS-EditAiUpdateProposal
  test.describe('FS-EditAiUpdateProposal', () => {
    test('editing an AI-proposed update before accepting creates a version with the modified text', async ({ page }) => {
      await stubBackendStatusValue(page, true);
      await stubProposeUpdate(page, () => ({
        body: {
          proposed_text: 'AI suggested fact update text',
          explanation: 'Suggestion rationale',
        },
      }));

      const discovery = baseFactProposalDiscovery();
      await seedDiscovery(page, discovery);
      await gotoApp(page, discovery.title);

      await openProposeUpdateForFact(page);
      await page.getByRole('button', { name: /^Edit$/ }).click();
      const editTextarea = page.locator('.proposal-edit-textarea');
      await expect(editTextarea).toBeVisible();
      await editTextarea.fill('Analyst-edited fact update text');
      await page.getByRole('button', { name: /^Confirm$/ }).click();

      await expect(page.locator('.proposal-panel')).toHaveCount(0);
      const stored = await readStoredDiscovery(page);
      const fact = stored.facts[0] as any;
      expect(fact.text).toBe('Analyst-edited fact update text');
      expect(fact.version).toBe(3);
      expect(fact.status).toBe('validated');
    });
  });

  // @fsid:FS-RejectAiUpdateProposal
  test.describe('FS-RejectAiUpdateProposal', () => {
    test('rejecting an AI-proposed update closes the panel without changing the entity', async ({ page }) => {
      await stubBackendStatusValue(page, true);
      await stubProposeUpdate(page, () => ({
        body: {
          proposed_text: 'AI suggested fact update text',
          explanation: 'Suggestion rationale',
        },
      }));

      const discovery = baseFactProposalDiscovery();
      await seedDiscovery(page, discovery);
      await gotoApp(page, discovery.title);

      await openProposeUpdateForFact(page);
      await page.getByRole('button', { name: /^Reject$/ }).click();

      await expect(page.locator('.proposal-panel')).toHaveCount(0);
      const stored = await readStoredDiscovery(page);
      const fact = stored.facts[0] as any;
      expect(fact.text).toBe('Support response time increased in Q4.');
      expect(fact.version).toBe(2);
      expect(fact.status).toBe('needs_review');
    });
  });

  // @fsid:FS-ProposeUpdateDisabledWhenBackendUnavailable
  test.describe('FS-ProposeUpdateDisabledWhenBackendUnavailable', () => {
    test('propose update button is disabled when backend is unavailable', async ({ page }) => {
      await stubBackendStatusValue(page, false);
      let proposeCalls = 0;
      await stubProposeUpdate(page, () => {
        proposeCalls += 1;
        return { body: { error: 'Should not be called' } };
      });

      const discovery = baseFactProposalDiscovery();
      await seedDiscovery(page, discovery);
      await gotoApp(page, discovery.title);

      const wrapper = page.locator('#fact-F-1');
      await wrapper.hover();
      const disabledAction = wrapper.locator('[title="Backend unavailable"]');
      await expect(disabledAction).toBeVisible();
      await disabledAction.click();
      await expect(page.locator('.proposal-panel')).toHaveCount(0);
      expect(proposeCalls).toBe(0);
    });
  });

  // @fsid:FS-ProposeUpdateNotShownForValidItems
  test.describe('FS-ProposeUpdateNotShownForValidItems', () => {
    test('propose update action is not displayed on items with status validated', async ({ page }) => {
      await stubBackendStatusValue(page, true);
      const discovery = baseFactProposalDiscovery();
      (discovery.facts[0] as any).status = 'validated';
      await seedDiscovery(page, discovery);
      await gotoApp(page, discovery.title);

      const wrapper = page.locator('#fact-F-1');
      await wrapper.hover();
      await expect(wrapper.locator('[title="Propose AI update"]')).toHaveCount(0);
    });
  });

  // @fsid:FS-ProposeUpdateShownForAllActionableStatuses
  test.describe('FS-ProposeUpdateShownForAllActionableStatuses', () => {
    test('propose update action is available for needs_review, needs_refresh, unsupported, weak, risky', async ({ page }) => {
      await stubBackendStatusValue(page, true);
      const discovery = buildDiscovery({
        title: 'AI Update Status Availability E2E',
        goal: 'Verify propose update visibility',
        facts: [
          { fact_id: 'F-1', text: 'Fact 1', related_inputs: [], status: 'needs_review' as any },
          { fact_id: 'F-2', text: 'Fact 2', related_inputs: [], status: 'needs_refresh' as any },
          { fact_id: 'F-3', text: 'Fact 3', related_inputs: [], status: 'unsupported' as any },
          { fact_id: 'F-4', text: 'Fact 4', related_inputs: [], status: 'weak' as any },
          { fact_id: 'F-5', text: 'Fact 5', related_inputs: [], status: 'risky' as any },
        ],
      });
      await seedDiscovery(page, discovery);
      await gotoApp(page, discovery.title);

      for (const id of ['F-1', 'F-2', 'F-3', 'F-4', 'F-5']) {
        const wrapper = page.locator(`#fact-${id}`);
        await wrapper.hover();
        await expect(factToolbar(page, id.replace('F-', 'F-')).locator('[title="Propose AI update"]')).toBeVisible();
      }
    });
  });
});
