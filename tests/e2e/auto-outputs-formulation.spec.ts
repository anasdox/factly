import { expect, Page, test } from '@playwright/test';
import {
  buildDiscovery,
  gotoApp,
  readStoredDiscovery,
  seedDiscovery,
  stubBackendStatus,
} from './helpers/factly';

type OutputSuggestion = { text: string };

async function stubOutputsFormulation(
  page: Page,
  handler: (body: any) => { status?: number; body: any },
): Promise<void> {
  await page.route('**/extract/outputs', async (route) => {
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

function baseRecommendationsDiscovery() {
  return buildDiscovery({
    title: 'Auto Outputs Formulation E2E',
    goal: 'Formulate deliverables from recommendations',
    recommendations: [
      { recommendation_id: 'R-1', text: 'Improve support response time and staffing.', related_insights: [] },
      { recommendation_id: 'R-2', text: 'Launch retention offer for price-sensitive customers.', related_insights: [] },
    ],
    outputs: [],
  });
}

async function openRecommendationsSelectionToolbar(page: Page, recommendationIds: string[]): Promise<void> {
  for (const id of recommendationIds) {
    await page.locator(`#recommendation-${id}`).click();
  }
  await expect(page.locator('.column.recommendations .toolbar-wrapper')).toHaveClass(/toolbar-wrapper-open/);
}

async function openSuggestedOutputsPanel(
  page: Page,
  options: {
    suggestions: OutputSuggestion[];
    selectedRecommendationIds?: string[];
    selectedOutputType?: 'report' | 'presentation' | 'action_plan' | 'brief';
    onRequest?: (body: any) => void;
  },
): Promise<void> {
  const discovery = baseRecommendationsDiscovery();
  const selectedRecommendationIds = options.selectedRecommendationIds ?? ['R-1'];
  const selectedOutputType = options.selectedOutputType ?? 'report';

  await stubOutputsFormulation(page, (body) => {
    options.onRequest?.(body);
    return { body: { suggestions: options.suggestions, recommendation_ids: selectedRecommendationIds } };
  });

  await seedDiscovery(page, discovery);
  await gotoApp(page, discovery.title);
  await openRecommendationsSelectionToolbar(page, selectedRecommendationIds);
  await page.locator('.column.recommendations .selection-toolbar select').selectOption(selectedOutputType);
  await page.locator('.column.recommendations .selection-toolbar').getByRole('button', { name: /formulate outputs/i }).click();
  await expect(page.locator('.suggestions-panel')).toBeVisible();
  await expect(page.getByRole('heading', { name: /suggested outputs/i })).toBeVisible();
}

function recommendationSelectable(page: Page, recommendationId: string) {
  return page.locator(`#recommendation-${recommendationId}`).locator('xpath=..');
}

test.describe('Auto Outputs Formulation (E2E)', () => {
  test.beforeEach(async ({ page }) => {
    await stubBackendStatus(page);
  });

  // @fsid:FS-SelectRecommendations
  test.describe('FS-SelectRecommendations', () => {
    test('clicking a Recommendation item marks it as selected and shows the selection toolbar with count', async ({ page }) => {
      const discovery = baseRecommendationsDiscovery();
      await seedDiscovery(page, discovery);
      await gotoApp(page, discovery.title);

      await page.locator('#recommendation-R-1').click();

      await expect(recommendationSelectable(page, 'R-1')).toHaveClass(/selected/);
      await expect(page.locator('.column.recommendations .toolbar-wrapper')).toHaveClass(/toolbar-wrapper-open/);
      await expect(page.locator('.column.recommendations .selection-toolbar span')).toContainText('1 recommendation(s) selected');
    });
  });

  // @fsid:FS-DeselectRecommendation
  test.describe('FS-DeselectRecommendation', () => {
    test('clicking an already selected Recommendation deselects it and updates the toolbar count', async ({ page }) => {
      const discovery = baseRecommendationsDiscovery();
      await seedDiscovery(page, discovery);
      await gotoApp(page, discovery.title);

      await page.locator('#recommendation-R-1').click();
      await expect(recommendationSelectable(page, 'R-1')).toHaveClass(/selected/);
      await page.locator('#recommendation-R-1').click();

      await expect(recommendationSelectable(page, 'R-1')).not.toHaveClass(/selected/);
      await expect(page.locator('.column.recommendations .toolbar-wrapper')).not.toHaveClass(/toolbar-wrapper-open/);
    });
  });

  // @fsid:FS-ClearRecommendationSelection
  test.describe('FS-ClearRecommendationSelection', () => {
    test('clicking Clear deselects all recommendations and hides the selection toolbar', async ({ page }) => {
      const discovery = baseRecommendationsDiscovery();
      await seedDiscovery(page, discovery);
      await gotoApp(page, discovery.title);

      await openRecommendationsSelectionToolbar(page, ['R-1', 'R-2']);
      await expect(page.locator('.column.recommendations .selection-toolbar span')).toContainText('2 recommendation(s) selected');

      await page.locator('.column.recommendations .selection-toolbar').getByRole('button', { name: /^Clear$/ }).click();

      await expect(recommendationSelectable(page, 'R-1')).not.toHaveClass(/selected/);
      await expect(recommendationSelectable(page, 'R-2')).not.toHaveClass(/selected/);
      await expect(page.locator('.column.recommendations .toolbar-wrapper')).not.toHaveClass(/toolbar-wrapper-open/);
    });
  });

  // @fsid:FS-SelectOutputType
  test.describe('FS-SelectOutputType', () => {
    test('selection toolbar displays a dropdown with output types defaulting to Report', async ({ page }) => {
      const discovery = baseRecommendationsDiscovery();
      await seedDiscovery(page, discovery);
      await gotoApp(page, discovery.title);

      await openRecommendationsSelectionToolbar(page, ['R-1']);
      const select = page.locator('.column.recommendations .selection-toolbar select');
      await expect(select).toHaveValue('report');
      await expect(select.locator('option')).toHaveCount(4);
      await expect(select.locator('option').nth(0)).toHaveText('Report');
      await expect(select.locator('option').nth(1)).toHaveText('Presentation');
      await expect(select.locator('option').nth(2)).toHaveText('Action Plan');
      await expect(select.locator('option').nth(3)).toHaveText('Brief');
    });
  });

  // @fsid:FS-FormulateOutputsDisabledWithoutSelection
  test.describe('FS-FormulateOutputsDisabledWithoutSelection', () => {
    test('no selection toolbar is displayed when no recommendations are selected', async ({ page }) => {
      const discovery = baseRecommendationsDiscovery();
      await seedDiscovery(page, discovery);
      await gotoApp(page, discovery.title);

      await expect(page.locator('.column.recommendations .toolbar-wrapper')).not.toHaveClass(/toolbar-wrapper-open/);
      await expect(recommendationSelectable(page, 'R-1')).not.toHaveClass(/selected/);
      await expect(recommendationSelectable(page, 'R-2')).not.toHaveClass(/selected/);
    });
  });

  // @fsid:FS-AcceptSuggestedOutput
  test.describe('FS-AcceptSuggestedOutput', () => {
    test('clicking Accept on a suggested output adds it to the Outputs column with selected type linked to source Recommendations', async ({ page }) => {
      await openSuggestedOutputsPanel(page, {
        suggestions: [{ text: 'Executive brief summarizing support and pricing churn drivers.' }],
        selectedRecommendationIds: ['R-1'],
        selectedOutputType: 'brief',
      });

      await page.locator('.suggestion-card').first().getByRole('button', { name: /^Accept$/ }).click();

      await expect(page.locator('.column.outputs .output-item')).toHaveCount(1);
      await expect(page.locator('.column.outputs .output-item')).toContainText(/executive brief summarizing/i);
      const stored = await readStoredDiscovery(page);
      expect(stored.outputs).toHaveLength(1);
      expect(stored.outputs[0].type).toBe('brief');
      expect(stored.outputs[0].related_recommendations).toEqual(['R-1']);
    });
  });

  // @fsid:FS-EditSuggestedOutput
  test.describe('FS-EditSuggestedOutput', () => {
    test('clicking Edit makes the card editable; confirming adds the modified output to the pipeline', async ({ page }) => {
      await openSuggestedOutputsPanel(page, {
        suggestions: [{ text: 'Original output suggestion' }],
        selectedRecommendationIds: ['R-1'],
        selectedOutputType: 'report',
      });

      await page.locator('.suggestion-card').first().getByRole('button', { name: /^Edit$/ }).click();
      const textarea = page.locator('.suggestion-card textarea').first();
      await expect(textarea).toBeVisible();
      await textarea.fill('Edited output suggestion for review');
      await page.locator('.suggestion-edit-actions').first().getByRole('button', { name: /^Confirm$/ }).click();

      await expect(page.locator('.column.outputs .output-item')).toHaveCount(1);
      await expect(page.locator('.column.outputs .output-item')).toContainText(/edited output suggestion for review/i);
      const stored = await readStoredDiscovery(page);
      expect(stored.outputs[0].text).toBe('Edited output suggestion for review');
      expect(stored.outputs[0].type).toBe('report');
      expect(stored.outputs[0].related_recommendations).toEqual(['R-1']);
    });
  });

  // @fsid:FS-RejectSuggestedOutput
  test.describe('FS-RejectSuggestedOutput', () => {
    test('clicking Reject removes the card without adding any output', async ({ page }) => {
      await openSuggestedOutputsPanel(page, {
        suggestions: [{ text: 'Output A' }, { text: 'Output B' }],
      });

      await expect(page.locator('.suggestion-card')).toHaveCount(2);
      await page.locator('.suggestion-card').first().getByRole('button', { name: /^Reject$/ }).click();
      await expect(page.locator('.suggestion-card')).toHaveCount(1);
      await expect(page.locator('.column.outputs .output-item')).toHaveCount(0);
    });
  });

  // @fsid:FS-AcceptAllSuggestedOutputs
  test.describe('FS-AcceptAllSuggestedOutputs', () => {
    test('clicking Accept All adds all remaining suggestions to the Outputs column and closes the panel', async ({ page }) => {
      await openSuggestedOutputsPanel(page, {
        suggestions: [{ text: 'Output 1' }, { text: 'Output 2' }],
        selectedRecommendationIds: ['R-1', 'R-2'],
        selectedOutputType: 'presentation',
      });

      await page.locator('.suggestions-bulk-actions').getByRole('button', { name: /accept all/i }).click();

      await expect(page.locator('.suggestions-panel')).toHaveCount(0);
      await expect(page.locator('.column.outputs .output-item')).toHaveCount(2);
      const stored = await readStoredDiscovery(page);
      expect(stored.outputs).toHaveLength(2);
      expect(stored.outputs.map((o) => o.type)).toEqual(['presentation', 'presentation']);
      expect(stored.outputs.map((o) => o.related_recommendations)).toEqual([
        ['R-1', 'R-2'],
        ['R-1', 'R-2'],
      ]);
    });
  });

  // @fsid:FS-RejectAllSuggestedOutputs
  test.describe('FS-RejectAllSuggestedOutputs', () => {
    test('clicking Reject All discards all remaining suggestions and closes the panel', async ({ page }) => {
      await openSuggestedOutputsPanel(page, {
        suggestions: [{ text: 'Output 1' }, { text: 'Output 2' }],
      });

      await page.locator('.suggestions-bulk-actions').getByRole('button', { name: /reject all/i }).click();

      await expect(page.locator('.suggestions-panel')).toHaveCount(0);
      await expect(page.locator('.column.outputs .output-item')).toHaveCount(0);
      expect((await readStoredDiscovery(page)).outputs).toHaveLength(0);
    });
  });

  // @fsid:FS-CloseSuggestionsOutputsPanel
  test.describe('FS-CloseSuggestionsOutputsPanel', () => {
    test('closing the panel discards remaining suggestions but keeps previously accepted outputs', async ({ page }) => {
      await openSuggestedOutputsPanel(page, {
        suggestions: [{ text: 'Accepted output' }, { text: 'Discarded output' }],
        selectedOutputType: 'action_plan',
      });

      await page.locator('.suggestion-card').first().getByRole('button', { name: /^Accept$/ }).click();
      await expect(page.locator('.column.outputs .output-item')).toHaveCount(1);
      await page.locator('.suggestions-close').click();
      await expect(page.locator('.suggestions-panel')).toHaveCount(0);

      const stored = await readStoredDiscovery(page);
      expect(stored.outputs).toHaveLength(1);
      expect(stored.outputs[0].text).toBe('Accepted output');
      expect(stored.outputs[0].type).toBe('action_plan');
    });
  });

  // @fsid:FS-ManualOutputFromSelection
  test.describe('FS-ManualOutputFromSelection', () => {
    test('no Add Output action is displayed on the recommendation selection toolbar', async ({ page }) => {
      const discovery = baseRecommendationsDiscovery();
      await seedDiscovery(page, discovery);
      await gotoApp(page, discovery.title);

      await openRecommendationsSelectionToolbar(page, ['R-1']);

      const selectionToolbar = page.locator('.column.recommendations .selection-toolbar');
      await expect(selectionToolbar.getByRole('button', { name: /add output/i })).toHaveCount(0);
      await expect(page.locator('.column.outputs [title="Add Output"]')).toBeVisible();
    });
  });
});
