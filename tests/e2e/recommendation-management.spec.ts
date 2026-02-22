import { expect, Page, test } from '@playwright/test';
import {
  buildDiscovery,
  gotoApp,
  openEditModalForFirstItem,
  readStoredDiscovery,
  seedDiscovery,
  selectedValues,
  stubBackendStatus,
} from './helpers/factly';

async function openAddRecommendationModal(page: Page): Promise<void> {
  await page.locator('.column.recommendations [title="Add Recommendation"]').click();
  await expect(page.getByRole('heading', { name: 'Add Recommendation' })).toBeVisible();
}

test.describe('Recommendation Management (E2E)', () => {
  test.beforeEach(async ({ page }) => {
    await stubBackendStatus(page);
  });

  // @fsid:FS-AddRecommendation
  test.describe('FS-AddRecommendation', () => {
    test('clicking the add button in the Recommendations column opens the modal in add mode', async ({ page }) => {
      const discovery = buildDiscovery({
        title: 'E2E Recommendation Management',
        insights: [
          { insight_id: 'N-1', text: 'Insight 1', related_facts: [] },
          { insight_id: 'N-2', text: 'Insight 2', related_facts: [] },
        ],
      });
      await seedDiscovery(page, discovery);
      await gotoApp(page, discovery.title);

      await openAddRecommendationModal(page);

      await expect(page.locator('#recommendation-text')).toHaveValue('');
      await expect(page.locator('#recommendation-related-insights option')).toHaveCount(2);
      await expect(page.locator('#recommendation-related-insights option').nth(0)).toHaveText(/insight 1/i);
      await expect(page.locator('#recommendation-related-insights option').nth(1)).toHaveText(/insight 2/i);
    });
  });

  // @fsid:FS-SaveNewRecommendation
  test.describe('FS-SaveNewRecommendation', () => {
    test('entering text, selecting related insights and clicking Add creates a new Recommendation', async ({ page }) => {
      const discovery = buildDiscovery({
        title: 'E2E Recommendation Management',
        insights: [
          { insight_id: 'N-1', text: 'Insight 1', related_facts: [] },
          { insight_id: 'N-2', text: 'Insight 2', related_facts: [] },
        ],
      });
      await seedDiscovery(page, discovery);
      await gotoApp(page, discovery.title);

      await openAddRecommendationModal(page);
      await page.locator('#recommendation-text').fill('Reduce first-response time to under 24h for high-risk accounts.');
      await page.locator('#recommendation-related-insights').selectOption(['N-1']);
      await page.locator('.modal-panel').getByRole('button', { name: /^Add$/ }).click();

      await expect(page.locator('.column.recommendations .recommendation-item')).toHaveCount(1);
      await expect(page.locator('.column.recommendations .recommendation-item'))
        .toContainText(/reduce first-response time to under 24h/i);

      await expect.poll(async () => (await readStoredDiscovery(page)).recommendations.length).toBe(1);
      const stored = await readStoredDiscovery(page);
      expect(stored.recommendations[0].related_insights).toEqual(['N-1']);
      expect(stored.recommendations[0].text).toBe('Reduce first-response time to under 24h for high-risk accounts.');
      expect(stored.recommendations[0].recommendation_id).not.toBe('');
    });
  });

  // @fsid:FS-EditRecommendation
  test.describe('FS-EditRecommendation', () => {
    test('hovering over a Recommendation and clicking the edit icon opens the modal in edit mode', async ({ page }) => {
      const discovery = buildDiscovery({
        title: 'E2E Recommendation Management',
        insights: [
          { insight_id: 'N-1', text: 'Insight 1', related_facts: [] },
          { insight_id: 'N-2', text: 'Insight 2', related_facts: [] },
        ],
        recommendations: [
          { recommendation_id: 'R-1', text: 'Initial recommendation text', related_insights: ['N-2'] },
        ],
      });
      await seedDiscovery(page, discovery);
      await gotoApp(page, discovery.title);

      await openEditModalForFirstItem(page, 'recommendations', 'Edit Recommendation');

      await expect(page.locator('#recommendation-text')).toHaveValue('Initial recommendation text');
      await expect(await selectedValues(page, '#recommendation-related-insights')).toEqual(['N-2']);
    });
  });

  // @fsid:FS-SaveEditedRecommendation
  test.describe('FS-SaveEditedRecommendation', () => {
    test('modifying text or related insights and clicking Save updates the Recommendation', async ({ page }) => {
      const discovery = buildDiscovery({
        title: 'E2E Recommendation Management',
        insights: [
          { insight_id: 'N-1', text: 'Insight 1', related_facts: [] },
          { insight_id: 'N-2', text: 'Insight 2', related_facts: [] },
        ],
        recommendations: [
          { recommendation_id: 'R-1', text: 'Initial recommendation text', related_insights: ['N-1'] },
        ],
      });
      await seedDiscovery(page, discovery);
      await gotoApp(page, discovery.title);

      await openEditModalForFirstItem(page, 'recommendations', 'Edit Recommendation');
      await page.locator('#recommendation-text').fill('Updated recommendation for support staffing and triage.');
      await page.locator('#recommendation-related-insights').selectOption(['N-2']);
      await page.locator('.modal-panel').getByRole('button', { name: /^Save$/ }).click();

      await expect(page.locator('.column.recommendations .recommendation-item'))
        .toContainText(/updated recommendation for support staffing and triage/i);
      await expect.poll(async () => (await readStoredDiscovery(page)).recommendations[0].text)
        .toBe('Updated recommendation for support staffing and triage.');
      await expect.poll(async () => (await readStoredDiscovery(page)).recommendations[0].related_insights.join(','))
        .toBe('N-2');
    });
  });

  // @fsid:FS-DeleteRecommendation
  test.describe('FS-DeleteRecommendation', () => {
    test('clicking Delete and confirming removes the Recommendation from the column', async ({ page }) => {
      const discovery = buildDiscovery({
        title: 'E2E Recommendation Management',
        insights: [{ insight_id: 'N-1', text: 'Insight 1', related_facts: [] }],
        recommendations: [{ recommendation_id: 'R-1', text: 'Recommendation to delete', related_insights: ['N-1'] }],
      });
      await seedDiscovery(page, discovery);
      await gotoApp(page, discovery.title);

      await openEditModalForFirstItem(page, 'recommendations', 'Edit Recommendation');
      await page.locator('.modal-panel').getByRole('button', { name: /^Delete$/ }).click();
      await expect(page.getByText(/are you sure you want to delete this recommendation/i)).toBeVisible();
      await page.locator('.modal-panel').getByRole('button', { name: /^Confirm$/ }).click();

      await expect(page.locator('.column.recommendations .recommendation-item')).toHaveCount(0);
      await expect.poll(async () => (await readStoredDiscovery(page)).recommendations.length).toBe(0);
    });
  });
});
