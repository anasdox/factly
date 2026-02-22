import { expect, Page, test } from '@playwright/test';
import {
  buildDiscovery,
  gotoApp,
  readStoredDiscovery,
  seedDiscovery,
  selectedValues,
  stubBackendStatus,
} from './helpers/factly';

type InsightSuggestion = { text: string; related_fact_ids?: string[] };

async function stubInsightsExtraction(
  page: Page,
  handler: (body: any) => { status?: number; body: any },
): Promise<void> {
  await page.route('**/extract/insights', async (route) => {
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

function baseFactsDiscovery() {
  return buildDiscovery({
    title: 'Auto Insights Extraction E2E',
    goal: 'Derive insights from churn facts',
    facts: [
      { fact_id: 'F-1', text: 'Support response time reached 52h in Q4.', related_inputs: [] },
      { fact_id: 'F-2', text: '31% of churned users cited cheaper alternatives.', related_inputs: [] },
    ],
    insights: [],
    recommendations: [],
  });
}

async function openFactsSelectionToolbar(page: Page, factIds: string[]): Promise<void> {
  for (const id of factIds) {
    await page.locator(`#fact-${id}`).click();
  }
  const toolbarWrapper = page.locator('.column.facts .toolbar-wrapper');
  await expect(toolbarWrapper).toHaveClass(/toolbar-wrapper-open/);
}

async function openSuggestedInsightsPanel(
  page: Page,
  options: {
    suggestions: InsightSuggestion[];
    selectedFactIds?: string[];
    onRequest?: (body: any) => void;
  },
): Promise<void> {
  const discovery = baseFactsDiscovery();
  const selectedFactIds = options.selectedFactIds ?? ['F-1'];

  await stubInsightsExtraction(page, (body) => {
    options.onRequest?.(body);
    return {
      body: {
        suggestions: options.suggestions,
        fact_ids: selectedFactIds,
      },
    };
  });

  await seedDiscovery(page, discovery);
  await gotoApp(page, discovery.title);
  await openFactsSelectionToolbar(page, selectedFactIds);
  await page.locator('.column.facts .selection-toolbar').getByRole('button', { name: /generate insights/i }).click();
  await expect(page.locator('.suggestions-panel')).toBeVisible();
  await expect(page.getByRole('heading', { name: /suggested insights/i })).toBeVisible();
}

function factSelectable(page: Page, factId: string) {
  return page.locator(`#fact-${factId}`).locator('xpath=..');
}

test.describe('Auto Insights Extraction (E2E)', () => {
  test.beforeEach(async ({ page }) => {
    await stubBackendStatus(page);
  });

  // @fsid:FS-SelectFacts
  test.describe('FS-SelectFacts', () => {
    test('clicking a Fact item marks it as selected and shows the selection toolbar with count', async ({ page }) => {
      const discovery = baseFactsDiscovery();
      await seedDiscovery(page, discovery);
      await gotoApp(page, discovery.title);

      await page.locator('#fact-F-1').click();

      await expect(factSelectable(page, 'F-1')).toHaveClass(/selected/);
      await expect(page.locator('.column.facts .toolbar-wrapper')).toHaveClass(/toolbar-wrapper-open/);
      await expect(page.locator('.column.facts .selection-toolbar span')).toContainText('1 fact(s) selected');
    });
  });

  // @fsid:FS-DeselectFact
  test.describe('FS-DeselectFact', () => {
    test('clicking an already selected Fact deselects it and updates the toolbar count', async ({ page }) => {
      const discovery = baseFactsDiscovery();
      await seedDiscovery(page, discovery);
      await gotoApp(page, discovery.title);

      await page.locator('#fact-F-1').click();
      await expect(factSelectable(page, 'F-1')).toHaveClass(/selected/);
      await page.locator('#fact-F-1').click();

      await expect(factSelectable(page, 'F-1')).not.toHaveClass(/selected/);
      await expect(page.locator('.column.facts .toolbar-wrapper')).not.toHaveClass(/toolbar-wrapper-open/);
    });
  });

  // @fsid:FS-ClearFactSelection
  test.describe('FS-ClearFactSelection', () => {
    test('clicking Clear deselects all facts and hides the selection toolbar', async ({ page }) => {
      const discovery = baseFactsDiscovery();
      await seedDiscovery(page, discovery);
      await gotoApp(page, discovery.title);

      await openFactsSelectionToolbar(page, ['F-1', 'F-2']);
      await expect(page.locator('.column.facts .selection-toolbar span')).toContainText('2 fact(s) selected');

      await page.locator('.column.facts .selection-toolbar').getByRole('button', { name: /^Clear$/ }).click();

      await expect(factSelectable(page, 'F-1')).not.toHaveClass(/selected/);
      await expect(factSelectable(page, 'F-2')).not.toHaveClass(/selected/);
      await expect(page.locator('.column.facts .toolbar-wrapper')).not.toHaveClass(/toolbar-wrapper-open/);
    });
  });

  // @fsid:FS-GenerateInsightsDisabledWithoutSelection
  test.describe('FS-GenerateInsightsDisabledWithoutSelection', () => {
    test('no selection toolbar is displayed when no facts are selected', async ({ page }) => {
      const discovery = baseFactsDiscovery();
      await seedDiscovery(page, discovery);
      await gotoApp(page, discovery.title);

      await expect(page.locator('.column.facts .toolbar-wrapper')).not.toHaveClass(/toolbar-wrapper-open/);
      await expect(factSelectable(page, 'F-1')).not.toHaveClass(/selected/);
      await expect(factSelectable(page, 'F-2')).not.toHaveClass(/selected/);
    });
  });

  // @fsid:FS-AcceptSuggestedInsight
  test.describe('FS-AcceptSuggestedInsight', () => {
    test('clicking Accept on a suggested insight adds it to the Insights column linked to source Facts', async ({ page }) => {
      await openSuggestedInsightsPanel(page, {
        suggestions: [{ text: 'Support SLA failures are a primary churn signal.' }],
        selectedFactIds: ['F-1'],
      });

      await page.locator('.suggestion-card').first().getByRole('button', { name: /^Accept$/ }).click();

      await expect(page.locator('.column.insights .insight-item')).toHaveCount(1);
      await expect(page.locator('.column.insights .insight-item')).toContainText(/primary churn signal/i);
      await expect(page.locator('.suggestions-panel')).toHaveCount(0);

      const stored = await readStoredDiscovery(page);
      expect(stored.insights).toHaveLength(1);
      expect(stored.insights[0].related_facts).toEqual(['F-1']);
    });
  });

  // @fsid:FS-EditSuggestedInsight
  test.describe('FS-EditSuggestedInsight', () => {
    test('clicking Edit makes the card editable; confirming adds the modified insight to the pipeline', async ({ page }) => {
      await openSuggestedInsightsPanel(page, {
        suggestions: [{ text: 'Original insight suggestion' }],
        selectedFactIds: ['F-1'],
      });

      await page.locator('.suggestion-card').first().getByRole('button', { name: /^Edit$/ }).click();
      const textarea = page.locator('.suggestion-card textarea').first();
      await expect(textarea).toBeVisible();
      await textarea.fill('Edited insight suggestion for analyst validation');
      await page.locator('.suggestion-edit-actions').first().getByRole('button', { name: /^Confirm$/ }).click();

      await expect(page.locator('.column.insights .insight-item')).toHaveCount(1);
      await expect(page.locator('.column.insights .insight-item')).toContainText(/edited insight suggestion/i);
      const stored = await readStoredDiscovery(page);
      expect(stored.insights[0].text).toBe('Edited insight suggestion for analyst validation');
      expect(stored.insights[0].related_facts).toEqual(['F-1']);
    });
  });

  // @fsid:FS-RejectSuggestedInsight
  test.describe('FS-RejectSuggestedInsight', () => {
    test('clicking Reject removes the card without adding any insight', async ({ page }) => {
      await openSuggestedInsightsPanel(page, {
        suggestions: [{ text: 'Insight A' }, { text: 'Insight B' }],
        selectedFactIds: ['F-1'],
      });

      await expect(page.locator('.suggestion-card')).toHaveCount(2);
      await page.locator('.suggestion-card').first().getByRole('button', { name: /^Reject$/ }).click();

      await expect(page.locator('.suggestion-card')).toHaveCount(1);
      await expect(page.locator('.column.insights .insight-item')).toHaveCount(0);
      expect((await readStoredDiscovery(page)).insights).toHaveLength(0);
    });
  });

  // @fsid:FS-AcceptAllSuggestedInsights
  test.describe('FS-AcceptAllSuggestedInsights', () => {
    test('clicking Accept All adds all remaining suggestions to the Insights column and closes the panel', async ({ page }) => {
      await openSuggestedInsightsPanel(page, {
        suggestions: [{ text: 'Insight 1' }, { text: 'Insight 2' }],
        selectedFactIds: ['F-1', 'F-2'],
      });

      await page.locator('.suggestions-bulk-actions').getByRole('button', { name: /accept all/i }).click();

      await expect(page.locator('.suggestions-panel')).toHaveCount(0);
      await expect(page.locator('.column.insights .insight-item')).toHaveCount(2);
      const stored = await readStoredDiscovery(page);
      expect(stored.insights).toHaveLength(2);
      expect(stored.insights.map((i) => i.related_facts)).toEqual([
        ['F-1', 'F-2'],
        ['F-1', 'F-2'],
      ]);
    });
  });

  // @fsid:FS-RejectAllSuggestedInsights
  test.describe('FS-RejectAllSuggestedInsights', () => {
    test('clicking Reject All discards remaining suggestions and closes the panel', async ({ page }) => {
      await openSuggestedInsightsPanel(page, {
        suggestions: [{ text: 'Insight 1' }, { text: 'Insight 2' }],
        selectedFactIds: ['F-1'],
      });

      await page.locator('.suggestions-bulk-actions').getByRole('button', { name: /reject all/i }).click();

      await expect(page.locator('.suggestions-panel')).toHaveCount(0);
      await expect(page.locator('.column.insights .insight-item')).toHaveCount(0);
      expect((await readStoredDiscovery(page)).insights).toHaveLength(0);
    });
  });

  // @fsid:FS-CloseSuggestionsInsightsPanel
  test.describe('FS-CloseSuggestionsInsightsPanel', () => {
    test('closing the panel discards remaining suggestions but keeps previously accepted insights', async ({ page }) => {
      await openSuggestedInsightsPanel(page, {
        suggestions: [{ text: 'Accepted insight' }, { text: 'Discarded insight' }],
        selectedFactIds: ['F-1'],
      });

      await page.locator('.suggestion-card').first().getByRole('button', { name: /^Accept$/ }).click();
      await expect(page.locator('.column.insights .insight-item')).toHaveCount(1);
      await expect(page.locator('.suggestion-card')).toHaveCount(1);

      await page.locator('.suggestions-close').click();

      await expect(page.locator('.suggestions-panel')).toHaveCount(0);
      await expect(page.locator('.column.insights .insight-item')).toHaveCount(1);
      const stored = await readStoredDiscovery(page);
      expect(stored.insights).toHaveLength(1);
      expect(stored.insights[0].text).toBe('Accepted insight');
    });
  });

  // @fsid:FS-ManualInsightFromSelection
  test.describe('FS-ManualInsightFromSelection', () => {
    test('clicking Add Insight on the selection toolbar opens InsightModal with related_facts pre-filled', async ({ page }) => {
      const discovery = baseFactsDiscovery();
      await seedDiscovery(page, discovery);
      await gotoApp(page, discovery.title);

      await openFactsSelectionToolbar(page, ['F-1', 'F-2']);
      await page.locator('.column.facts .selection-toolbar').getByRole('button', { name: /add insight/i }).click();

      await expect(page.getByRole('heading', { name: 'Add Insight' })).toBeVisible();
      await expect(page.locator('#insight-text')).toHaveValue('');
      await expect(await selectedValues(page, '#insight-related-facts')).toEqual(['F-1', 'F-2']);
    });
  });
});
