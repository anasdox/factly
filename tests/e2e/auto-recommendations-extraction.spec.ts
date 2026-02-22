import { expect, Page, test } from '@playwright/test';
import {
  buildDiscovery,
  gotoApp,
  readStoredDiscovery,
  seedDiscovery,
  selectedValues,
  stubBackendStatus,
} from './helpers/factly';

type RecommendationSuggestion = { text: string; related_insight_ids?: string[] };

async function stubRecommendationsExtraction(
  page: Page,
  handler: (body: any) => { status?: number; body: any },
): Promise<void> {
  await page.route('**/extract/recommendations', async (route) => {
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

function baseInsightsDiscovery() {
  return buildDiscovery({
    title: 'Auto Recommendations Extraction E2E',
    goal: 'Derive recommendations from insights',
    insights: [
      { insight_id: 'N-1', text: 'Support SLA failures correlate with churn spikes.', related_facts: [] },
      { insight_id: 'N-2', text: 'Price-sensitive segment is leaving for lower-cost competitors.', related_facts: [] },
    ],
    recommendations: [],
    outputs: [],
  });
}

async function openInsightsSelectionToolbar(page: Page, insightIds: string[]): Promise<void> {
  for (const id of insightIds) {
    await page.locator(`#insight-${id}`).click();
  }
  await expect(page.locator('.column.insights .toolbar-wrapper')).toHaveClass(/toolbar-wrapper-open/);
}

async function openSuggestedRecommendationsPanel(
  page: Page,
  options: { suggestions: RecommendationSuggestion[]; selectedInsightIds?: string[]; onRequest?: (body: any) => void },
): Promise<void> {
  const discovery = baseInsightsDiscovery();
  const selectedInsightIds = options.selectedInsightIds ?? ['N-1'];

  await stubRecommendationsExtraction(page, (body) => {
    options.onRequest?.(body);
    return { body: { suggestions: options.suggestions, insight_ids: selectedInsightIds } };
  });

  await seedDiscovery(page, discovery);
  await gotoApp(page, discovery.title);
  await openInsightsSelectionToolbar(page, selectedInsightIds);
  await page.locator('.column.insights .selection-toolbar').getByRole('button', { name: /generate recommendations/i }).click();
  await expect(page.locator('.suggestions-panel')).toBeVisible();
  await expect(page.getByRole('heading', { name: /suggested recommendations/i })).toBeVisible();
}

function insightSelectable(page: Page, insightId: string) {
  return page.locator(`#insight-${insightId}`).locator('xpath=..');
}

test.describe('Auto Recommendations Extraction (E2E)', () => {
  test.beforeEach(async ({ page }) => {
    await stubBackendStatus(page);
  });

  // @fsid:FS-SelectInsights
  test.describe('FS-SelectInsights', () => {
    test('clicking an Insight item marks it as selected and shows the selection toolbar with count', async ({ page }) => {
      const discovery = baseInsightsDiscovery();
      await seedDiscovery(page, discovery);
      await gotoApp(page, discovery.title);

      await page.locator('#insight-N-1').click();

      await expect(insightSelectable(page, 'N-1')).toHaveClass(/selected/);
      await expect(page.locator('.column.insights .toolbar-wrapper')).toHaveClass(/toolbar-wrapper-open/);
      await expect(page.locator('.column.insights .selection-toolbar span')).toContainText('1 insight(s) selected');
    });
  });

  // @fsid:FS-DeselectInsight
  test.describe('FS-DeselectInsight', () => {
    test('clicking an already selected Insight deselects it and updates the toolbar count', async ({ page }) => {
      const discovery = baseInsightsDiscovery();
      await seedDiscovery(page, discovery);
      await gotoApp(page, discovery.title);

      await page.locator('#insight-N-1').click();
      await expect(insightSelectable(page, 'N-1')).toHaveClass(/selected/);
      await page.locator('#insight-N-1').click();

      await expect(insightSelectable(page, 'N-1')).not.toHaveClass(/selected/);
      await expect(page.locator('.column.insights .toolbar-wrapper')).not.toHaveClass(/toolbar-wrapper-open/);
    });
  });

  // @fsid:FS-ClearInsightSelection
  test.describe('FS-ClearInsightSelection', () => {
    test('clicking Clear deselects all insights and hides the selection toolbar', async ({ page }) => {
      const discovery = baseInsightsDiscovery();
      await seedDiscovery(page, discovery);
      await gotoApp(page, discovery.title);

      await openInsightsSelectionToolbar(page, ['N-1', 'N-2']);
      await expect(page.locator('.column.insights .selection-toolbar span')).toContainText('2 insight(s) selected');

      await page.locator('.column.insights .selection-toolbar').getByRole('button', { name: /^Clear$/ }).click();

      await expect(insightSelectable(page, 'N-1')).not.toHaveClass(/selected/);
      await expect(insightSelectable(page, 'N-2')).not.toHaveClass(/selected/);
      await expect(page.locator('.column.insights .toolbar-wrapper')).not.toHaveClass(/toolbar-wrapper-open/);
    });
  });

  // @fsid:FS-GenerateRecommendationsDisabledWithoutSelection
  test.describe('FS-GenerateRecommendationsDisabledWithoutSelection', () => {
    test('no selection toolbar is displayed when no insights are selected', async ({ page }) => {
      const discovery = baseInsightsDiscovery();
      await seedDiscovery(page, discovery);
      await gotoApp(page, discovery.title);

      await expect(page.locator('.column.insights .toolbar-wrapper')).not.toHaveClass(/toolbar-wrapper-open/);
      await expect(insightSelectable(page, 'N-1')).not.toHaveClass(/selected/);
      await expect(insightSelectable(page, 'N-2')).not.toHaveClass(/selected/);
    });
  });

  // @fsid:FS-AcceptSuggestedRecommendation
  test.describe('FS-AcceptSuggestedRecommendation', () => {
    test('clicking Accept on a suggested recommendation adds it to the Recommendations column linked to source Insights', async ({ page }) => {
      await openSuggestedRecommendationsPanel(page, {
        suggestions: [{ text: 'Reduce support first-response time below 24h.', related_insight_ids: ['N-1'] }],
        selectedInsightIds: ['N-1'],
      });

      await page.locator('.suggestion-card').first().getByRole('button', { name: /^Accept$/ }).click();

      await expect(page.locator('.column.recommendations .recommendation-item')).toHaveCount(1);
      await expect(page.locator('.column.recommendations .recommendation-item')).toContainText(/below 24h/i);
      const stored = await readStoredDiscovery(page);
      expect(stored.recommendations).toHaveLength(1);
      expect(stored.recommendations[0].related_insights).toEqual(['N-1']);
    });
  });

  // @fsid:FS-EditSuggestedRecommendation
  test.describe('FS-EditSuggestedRecommendation', () => {
    test('clicking Edit makes the card editable; confirming adds the modified recommendation to the pipeline', async ({ page }) => {
      await openSuggestedRecommendationsPanel(page, {
        suggestions: [{ text: 'Original recommendation suggestion' }],
        selectedInsightIds: ['N-1'],
      });

      await page.locator('.suggestion-card').first().getByRole('button', { name: /^Edit$/ }).click();
      const textarea = page.locator('.suggestion-card textarea').first();
      await expect(textarea).toBeVisible();
      await textarea.fill('Edited recommendation suggestion');
      await page.locator('.suggestion-edit-actions').first().getByRole('button', { name: /^Confirm$/ }).click();

      await expect(page.locator('.column.recommendations .recommendation-item')).toHaveCount(1);
      await expect(page.locator('.column.recommendations .recommendation-item')).toContainText(/edited recommendation suggestion/i);
      const stored = await readStoredDiscovery(page);
      expect(stored.recommendations[0].text).toBe('Edited recommendation suggestion');
      expect(stored.recommendations[0].related_insights).toEqual(['N-1']);
    });
  });

  // @fsid:FS-RejectSuggestedRecommendation
  test.describe('FS-RejectSuggestedRecommendation', () => {
    test('clicking Reject removes the card without adding any recommendation', async ({ page }) => {
      await openSuggestedRecommendationsPanel(page, {
        suggestions: [{ text: 'Recommendation A' }, { text: 'Recommendation B' }],
      });

      await expect(page.locator('.suggestion-card')).toHaveCount(2);
      await page.locator('.suggestion-card').first().getByRole('button', { name: /^Reject$/ }).click();
      await expect(page.locator('.suggestion-card')).toHaveCount(1);
      await expect(page.locator('.column.recommendations .recommendation-item')).toHaveCount(0);
    });
  });

  // @fsid:FS-AcceptAllSuggestedRecommendations
  test.describe('FS-AcceptAllSuggestedRecommendations', () => {
    test('clicking Accept All adds all remaining suggestions to the Recommendations column and closes the panel', async ({ page }) => {
      await openSuggestedRecommendationsPanel(page, {
        suggestions: [{ text: 'Recommendation 1' }, { text: 'Recommendation 2' }],
        selectedInsightIds: ['N-1', 'N-2'],
      });

      await page.locator('.suggestions-bulk-actions').getByRole('button', { name: /accept all/i }).click();

      await expect(page.locator('.suggestions-panel')).toHaveCount(0);
      await expect(page.locator('.column.recommendations .recommendation-item')).toHaveCount(2);
      const stored = await readStoredDiscovery(page);
      expect(stored.recommendations.map((r) => r.related_insights)).toEqual([
        ['N-1', 'N-2'],
        ['N-1', 'N-2'],
      ]);
    });
  });

  // @fsid:FS-RejectAllSuggestedRecommendations
  test.describe('FS-RejectAllSuggestedRecommendations', () => {
    test('clicking Reject All discards all remaining suggestions and closes the panel', async ({ page }) => {
      await openSuggestedRecommendationsPanel(page, {
        suggestions: [{ text: 'Recommendation 1' }, { text: 'Recommendation 2' }],
      });

      await page.locator('.suggestions-bulk-actions').getByRole('button', { name: /reject all/i }).click();

      await expect(page.locator('.suggestions-panel')).toHaveCount(0);
      await expect(page.locator('.column.recommendations .recommendation-item')).toHaveCount(0);
      expect((await readStoredDiscovery(page)).recommendations).toHaveLength(0);
    });
  });

  // @fsid:FS-CloseSuggestionsRecommendationsPanel
  test.describe('FS-CloseSuggestionsRecommendationsPanel', () => {
    test('closing the panel discards remaining suggestions but keeps previously accepted recommendations', async ({ page }) => {
      await openSuggestedRecommendationsPanel(page, {
        suggestions: [{ text: 'Accepted recommendation' }, { text: 'Discarded recommendation' }],
      });

      await page.locator('.suggestion-card').first().getByRole('button', { name: /^Accept$/ }).click();
      await expect(page.locator('.column.recommendations .recommendation-item')).toHaveCount(1);
      await page.locator('.suggestions-close').click();
      await expect(page.locator('.suggestions-panel')).toHaveCount(0);
      const stored = await readStoredDiscovery(page);
      expect(stored.recommendations).toHaveLength(1);
      expect(stored.recommendations[0].text).toBe('Accepted recommendation');
    });
  });

  // @fsid:FS-ManualRecommendationFromSelection
  test.describe('FS-ManualRecommendationFromSelection', () => {
    test('clicking Add Recommendation on the selection toolbar opens RecommendationModal with related_insights pre-filled', async ({ page }) => {
      const discovery = baseInsightsDiscovery();
      await seedDiscovery(page, discovery);
      await gotoApp(page, discovery.title);

      await openInsightsSelectionToolbar(page, ['N-1', 'N-2']);
      await page.locator('.column.insights .selection-toolbar').getByRole('button', { name: /add recommendation/i }).click();

      await expect(page.getByRole('heading', { name: 'Add Recommendation' })).toBeVisible();
      await expect(page.locator('#recommendation-text')).toHaveValue('');
      await expect(await selectedValues(page, '#recommendation-related-insights')).toEqual(['N-1', 'N-2']);
    });
  });
});
