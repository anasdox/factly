import { expect, Page, test } from '@playwright/test';
import { buildDiscovery, readStoredDiscovery, seedDiscovery, gotoApp } from './helpers/factly';

type EntityKind = 'input' | 'fact' | 'insight' | 'recommendation' | 'output';

type ImpactResponse = {
  impacted?: Array<{ id: string; impacted: boolean; explanation?: string }>;
  status?: number;
  delayMs?: number;
};

const EDIT_CONFIG: Record<EntityKind, { wrapperIdPrefix: string; heading: string; textSelector: string }> = {
  input: { wrapperIdPrefix: 'input', heading: 'Edit Input', textSelector: '#input-text' },
  fact: { wrapperIdPrefix: 'fact', heading: 'Edit Fact', textSelector: '#fact-text' },
  insight: { wrapperIdPrefix: 'insight', heading: 'Edit Insight', textSelector: '#insight-text' },
  recommendation: { wrapperIdPrefix: 'recommendation', heading: 'Edit Recommendation', textSelector: '#recommendation-text' },
  output: { wrapperIdPrefix: 'output', heading: 'Edit Output', textSelector: '#output-text' },
};

async function stubBackendStatusValue(page: Page, ok = true): Promise<void> {
  await page.route('**/status', async (route) => {
    await route.fulfill({
      status: ok ? 200 : 503,
      contentType: 'application/json',
      body: ok ? '{}' : JSON.stringify({ error: 'Backend unavailable' }),
    });
  });
}

async function stubImpactCheck(
  page: Page,
  handler: (body: any) => ImpactResponse,
): Promise<void> {
  await page.route('**/check/impact', async (route) => {
    const raw = route.request().postData() || '{}';
    const parsed = JSON.parse(raw);
    const response = handler(parsed);
    if (response.delayMs) {
      await new Promise((resolve) => setTimeout(resolve, response.delayMs));
    }
    await route.fulfill({
      status: response.status ?? 200,
      contentType: 'application/json',
      body: JSON.stringify({ impacted: response.impacted ?? [] }),
    });
  });
}

async function stubProposeUpdate(page: Page, proposedText = 'AI proposed update'): Promise<void> {
  await page.route('**/propose/update', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ proposed_text: proposedText, explanation: 'E2E proposal' }),
    });
  });
}

function rootWrapper(page: Page, kind: EntityKind, id: string) {
  return page.locator(`#${EDIT_CONFIG[kind].wrapperIdPrefix}-${id}`);
}

function selectableWrapper(page: Page, kind: EntityKind, id: string) {
  return rootWrapper(page, kind, id).locator('xpath=..');
}

async function openEditModal(page: Page, kind: EntityKind, id: string): Promise<void> {
  const wrapper = rootWrapper(page, kind, id);
  await wrapper.hover();
  await wrapper.locator('[title="Edit"]').click();
  await expect(page.getByRole('heading', { name: EDIT_CONFIG[kind].heading })).toBeVisible();
}

async function editEntityText(page: Page, kind: EntityKind, id: string, text: string): Promise<void> {
  await openEditModal(page, kind, id);
  await page.locator(EDIT_CONFIG[kind].textSelector).fill(text);
  await page.getByRole('button', { name: /^Save$/ }).click();
}

function toast(page: Page) {
  return page.locator('.toast');
}

function baseChainDiscovery(title: string) {
  return buildDiscovery({
    title,
    goal: 'Validate staleness propagation behaviors',
    inputs: [
      {
        input_id: 'I-1',
        title: 'Primary Source',
        type: 'text',
        text: 'Original input text',
        version: 1,
        status: 'draft',
        created_at: '2026-02-22T08:00:00.000Z',
      } as any,
      {
        input_id: 'I-2',
        title: 'Secondary Source',
        type: 'text',
        text: 'Secondary input',
        version: 1,
        status: 'draft',
        created_at: '2026-02-22T08:05:00.000Z',
      } as any,
    ],
    facts: [
      {
        fact_id: 'F-1',
        text: 'Fact linked to I-1',
        related_inputs: ['I-1'],
        version: 1,
        status: 'draft',
        created_at: '2026-02-22T08:10:00.000Z',
      } as any,
      {
        fact_id: 'F-2',
        text: 'Second fact linked to I-1',
        related_inputs: ['I-1'],
        version: 1,
        status: 'draft',
        created_at: '2026-02-22T08:11:00.000Z',
      } as any,
      {
        fact_id: 'F-3',
        text: 'Third fact linked to I-1',
        related_inputs: ['I-1'],
        version: 1,
        status: 'draft',
        created_at: '2026-02-22T08:12:00.000Z',
      } as any,
      {
        fact_id: 'F-OTHER',
        text: 'Fact linked to I-2',
        related_inputs: ['I-2'],
        version: 1,
        status: 'draft',
        created_at: '2026-02-22T08:13:00.000Z',
      } as any,
    ],
    insights: [
      {
        insight_id: 'N-1',
        text: 'Insight linked to F-1',
        related_facts: ['F-1'],
        version: 1,
        status: 'draft',
        created_at: '2026-02-22T08:20:00.000Z',
      } as any,
    ],
    recommendations: [
      {
        recommendation_id: 'R-1',
        text: 'Recommendation linked to N-1',
        related_insights: ['N-1'],
        version: 1,
        status: 'draft',
        created_at: '2026-02-22T08:30:00.000Z',
      } as any,
    ],
    outputs: [
      {
        output_id: 'O-1',
        text: 'Output linked to R-1',
        related_recommendations: ['R-1'],
        type: 'report',
        version: 1,
        status: 'draft',
        created_at: '2026-02-22T08:40:00.000Z',
      } as any,
    ],
  });
}

async function seedAndOpen(page: Page, discovery: any): Promise<void> {
  await seedDiscovery(page, discovery);
  await gotoApp(page, discovery.title);
}

test.describe('Staleness Propagation (E2E)', () => {
  test.beforeEach(async ({ page }) => {
    await stubBackendStatusValue(page, true);
  });

  // @fsid:FS-WaitingToastDuringImpactAnalysis
  test.describe('FS-WaitingToastDuringImpactAnalysis', () => {
    test('editing Input/Fact/Insight/Recommendation text shows the expected waiting toast and replaces it with a result toast', async ({ page }) => {
      await stubImpactCheck(page, (body) => ({
        delayMs: 200,
        impacted: (body.children || []).map((child: any) => ({ id: child.id, impacted: true })),
      }));

      const discovery = baseChainDiscovery('Staleness Waiting Toasts E2E');
      await seedAndOpen(page, discovery);

      const cases: Array<{
        kind: EntityKind;
        id: string;
        waiting: RegExp;
        result: RegExp;
      }> = [
        {
          kind: 'input',
          id: 'I-1',
          waiting: /creating new version and analyzing impact on related facts/i,
          result: /updated to v2\./i,
        },
        {
          kind: 'fact',
          id: 'F-1',
          waiting: /creating new version and analyzing impact on related insights/i,
          result: /updated to v2\./i,
        },
        {
          kind: 'insight',
          id: 'N-1',
          waiting: /creating new version and analyzing impact on related recommendations/i,
          result: /updated to v2\./i,
        },
        {
          kind: 'recommendation',
          id: 'R-1',
          waiting: /creating new version and analyzing impact on related outputs/i,
          result: /updated to v2\./i,
        },
      ];

      for (const c of cases) {
        await editEntityText(page, c.kind, c.id, `Edited ${c.kind} text ${Date.now()}`);
        await expect(toast(page)).toContainText(c.waiting);
        await expect(toast(page)).toContainText(c.result);
      }

      const stored = await readStoredDiscovery(page);
      expect((stored.inputs.find((i) => i.input_id === 'I-1') as any)?.version).toBe(2);
      expect((stored.facts.find((f) => f.fact_id === 'F-1') as any)?.version).toBe(2);
      expect((stored.insights.find((i) => i.insight_id === 'N-1') as any)?.version).toBe(2);
      expect((stored.recommendations.find((r) => r.recommendation_id === 'R-1') as any)?.version).toBe(2);
    });
  });

  // @fsid:FS-ToolbarClickDoesNotSelectItem
  test.describe('FS-ToolbarClickDoesNotSelectItem', () => {
    test('clicking edit, traceability, confirm valid, and propose update toolbar actions does not toggle selection', async ({ page }) => {
      await stubProposeUpdate(page);
      const discovery = baseChainDiscovery('Staleness Toolbar Selection E2E');
      (discovery.facts.find((f) => f.fact_id === 'F-1') as any)!.status = 'needs_review';
      (discovery.facts.find((f) => f.fact_id === 'F-2') as any)!.status = 'needs_review';
      await seedAndOpen(page, discovery);

      const fact1Selectable = selectableWrapper(page, 'fact', 'F-1');
      const fact2Selectable = selectableWrapper(page, 'fact', 'F-2');

      await expect(fact1Selectable).not.toHaveClass(/selected/);
      await expect(fact2Selectable).not.toHaveClass(/selected/);

      const fact1 = rootWrapper(page, 'fact', 'F-1');
      await fact1.hover();
      await fact1.locator('[title="Edit"]').click();
      await expect(page.getByRole('heading', { name: 'Edit Fact' })).toBeVisible();
      await expect(fact1Selectable).not.toHaveClass(/selected/);
      await page.getByRole('button', { name: /^Cancel$/ }).click();

      await fact1.hover();
      await fact1.locator('[title="View traceability"]').click();
      await expect(page.locator('.traceability-panel')).toBeVisible();
      await expect(fact1Selectable).not.toHaveClass(/selected/);
      await page.locator('.traceability-close').click();
      await expect(page.locator('.traceability-panel')).toHaveCount(0);

      await fact1.hover();
      await fact1.locator('[title="Propose AI update"]').click();
      await expect(page.locator('.proposal-panel h3')).toHaveText('AI Update Proposal');
      await expect(fact1Selectable).not.toHaveClass(/selected/);
      await page.getByRole('button', { name: /^Reject$/ }).click();
      await expect(page.locator('.proposal-panel')).toHaveCount(0);

      const fact2 = rootWrapper(page, 'fact', 'F-2');
      await fact2.hover();
      await fact2.locator('[title="Confirm valid"]').click();
      await expect(fact2Selectable).not.toHaveClass(/selected/);
      await expect(fact2.locator('[title="Confirm valid"]')).toHaveCount(0);
    });
  });

  // @fsid:FS-VersionBadgeDisplay
  test.describe('FS-VersionBadgeDisplay', () => {
    test('version badge "v3" is displayed on items at version 3', async ({ page }) => {
      const discovery = buildDiscovery({
        title: 'Staleness Version Badge V3 E2E',
        goal: 'Version badge checks',
        facts: [
          { fact_id: 'F-V3', text: 'Versioned fact', related_inputs: [], version: 3, status: 'draft' as any },
        ],
      });
      await seedAndOpen(page, discovery);

      await expect(rootWrapper(page, 'fact', 'F-V3').locator('.version-badge')).toHaveText('v3');
    });
  });

  // @fsid:FS-VersionBadgeHiddenForV1
  test.describe('FS-VersionBadgeHiddenForV1', () => {
    test('no version badge is displayed on items at version 1', async ({ page }) => {
      const discovery = buildDiscovery({
        title: 'Staleness Version Badge V1 E2E',
        goal: 'Version badge checks',
        facts: [
          { fact_id: 'F-V1', text: 'Initial version fact', related_inputs: [], version: 1, status: 'draft' as any },
        ],
      });
      await seedAndOpen(page, discovery);

      await expect(rootWrapper(page, 'fact', 'F-V1').locator('.version-badge')).toHaveCount(0);
    });
  });

  // @fsid:FS-StatusChipDisplay
  test.describe('FS-StatusChipDisplay', () => {
    test('status chip with text "needs review" is displayed on items with status needs_review', async ({ page }) => {
      const discovery = buildDiscovery({
        title: 'Staleness Status Chip Display E2E',
        goal: 'Status chip checks',
        facts: [
          { fact_id: 'F-S', text: 'Needs review fact', related_inputs: [], status: 'needs_review' as any },
        ],
      });
      await seedAndOpen(page, discovery);

      const chip = rootWrapper(page, 'fact', 'F-S').locator('.status-chip.needs-review');
      await expect(chip).toBeVisible();
      await expect(chip).toHaveText(/needs review/i);
    });
  });

  // @fsid:FS-StatusChipNotShownForDraft
  test.describe('FS-StatusChipNotShownForDraft', () => {
    test('no status chip is displayed on items with status draft or validated', async ({ page }) => {
      const discovery = buildDiscovery({
        title: 'Staleness Status Chip Hidden E2E',
        goal: 'Status chip checks',
        facts: [
          { fact_id: 'F-DRAFT', text: 'Draft fact', related_inputs: [], status: 'draft' as any },
          { fact_id: 'F-VAL', text: 'Validated fact', related_inputs: [], status: 'validated' as any },
        ],
      });
      await seedAndOpen(page, discovery);

      await expect(rootWrapper(page, 'fact', 'F-DRAFT').locator('.status-chip')).toHaveCount(0);
      await expect(rootWrapper(page, 'fact', 'F-VAL').locator('.status-chip')).toHaveCount(0);
    });
  });

  // @fsid:FS-StaleBorderIndicator
  test.describe('FS-StaleBorderIndicator', () => {
    test('colored left border is displayed on items with actionable status', async ({ page }) => {
      const discovery = buildDiscovery({
        title: 'Staleness Border Indicator E2E',
        goal: 'Border indicator checks',
        insights: [
          { insight_id: 'N-WEAK', text: 'Weak insight', related_facts: [], status: 'weak' as any },
        ],
      });
      await seedAndOpen(page, discovery);

      await expect(rootWrapper(page, 'insight', 'N-WEAK')).toHaveClass(/status-weak/);
    });
  });

  // @fsid:FS-StatusColorMapping
  test.describe('FS-StatusColorMapping', () => {
    test('each actionable status maps to the expected status class and chip label', async ({ page }) => {
      const discovery = buildDiscovery({
        title: 'Staleness Status Color Mapping E2E',
        goal: 'Status mapping checks',
        facts: [
          { fact_id: 'F-NR', text: 'Needs review', related_inputs: [], status: 'needs_review' as any },
          { fact_id: 'F-RF', text: 'Needs refresh', related_inputs: [], status: 'needs_refresh' as any },
          { fact_id: 'F-UN', text: 'Unsupported', related_inputs: [], status: 'unsupported' as any },
          { fact_id: 'F-WE', text: 'Weak', related_inputs: [], status: 'weak' as any },
          { fact_id: 'F-RI', text: 'Risky', related_inputs: [], status: 'risky' as any },
        ],
      });
      await seedAndOpen(page, discovery);

      const expectations = [
        ['F-NR', 'needs-review', 'needs review'],
        ['F-RF', 'needs-refresh', 'needs refresh'],
        ['F-UN', 'unsupported', 'unsupported'],
        ['F-WE', 'weak', 'weak'],
        ['F-RI', 'risky', 'risky'],
      ] as const;

      for (const [id, cls, label] of expectations) {
        const wrapper = rootWrapper(page, 'fact', id);
        await expect(wrapper).toHaveClass(new RegExp(`status-${cls}`));
        const chip = wrapper.locator(`.status-chip.${cls}`);
        await expect(chip).toBeVisible();
        await expect(chip).toContainText(label);
      }
    });
  });

  // @fsid:FS-ConfirmValidNotShownForNonActionable
  test.describe('FS-ConfirmValidNotShownForNonActionable', () => {
    test('confirm valid action is not shown for items with status draft or validated', async ({ page }) => {
      const discovery = buildDiscovery({
        title: 'Staleness Confirm Valid Hidden E2E',
        goal: 'Confirm valid visibility checks',
        facts: [
          { fact_id: 'F-DRAFT', text: 'Draft fact', related_inputs: [], status: 'draft' as any },
          { fact_id: 'F-VAL', text: 'Validated fact', related_inputs: [], status: 'validated' as any },
        ],
      });
      await seedAndOpen(page, discovery);

      for (const id of ['F-DRAFT', 'F-VAL']) {
        const wrapper = rootWrapper(page, 'fact', id);
        await wrapper.hover();
        await expect(wrapper.locator('[title="Confirm valid"]')).toHaveCount(0);
      }
    });
  });

  // @fsid:FS-PropagationToastNotification
  test.describe('FS-PropagationToastNotification', () => {
    test('toast notification displays the propagation message after text edit and then disappears', async ({ page }) => {
      await stubImpactCheck(page, (body) => ({
        impacted: (body.children || []).map((child: any) => ({ id: child.id, impacted: true })),
      }));

      const discovery = baseChainDiscovery('Staleness Propagation Toast E2E');
      await seedAndOpen(page, discovery);

      await editEntityText(page, 'input', 'I-1', 'Updated source text for propagation toast');
      await expect(toast(page)).toContainText('Updated to v2. 3 downstream item(s) marked for review.');
      await expect(toast(page)).toBeVisible();
      await page.waitForTimeout(5200);
      await expect(page.locator('.toast-overlay')).toHaveCount(0);
    });
  });

  // @fsid:FS-ArchiveToastNotification
  test.describe('FS-ArchiveToastNotification', () => {
    test('toast notification displays archive impact count after archiving an Input', async ({ page }) => {
      const discovery = baseChainDiscovery('Staleness Archive Toast E2E');
      await seedAndOpen(page, discovery);

      await openEditModal(page, 'input', 'I-1');
      const modal = page.locator('.modal-panel');
      await modal.getByRole('button', { name: /^Delete$/ }).click();
      await modal.getByRole('button', { name: /^Confirm$/ }).click();

      await expect(toast(page)).toContainText('Input archived. 6 downstream item(s) affected.');

      const stored = await readStoredDiscovery(page);
      expect((stored.inputs.find((i) => i.input_id === 'I-1') as any)?.status).toBe('outdated');
      expect((stored.facts.find((f) => f.fact_id === 'F-1') as any)?.status).toBe('unsupported');
      expect((stored.insights.find((i) => i.insight_id === 'N-1') as any)?.status).toBe('weak');
      expect((stored.recommendations.find((r) => r.recommendation_id === 'R-1') as any)?.status).toBe('risky');
      expect((stored.outputs.find((o) => o.output_id === 'O-1') as any)?.status).toBe('needs_refresh');
    });
  });
});
