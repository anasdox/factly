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

async function openAddInsightModal(page: Page): Promise<void> {
  await page.locator('.column.insights [title="Add Insight"]').click();
  await expect(page.getByRole('heading', { name: 'Add Insight' })).toBeVisible();
}

test.describe('Insight Management (E2E)', () => {
  test.beforeEach(async ({ page }) => {
    await stubBackendStatus(page);
  });

  // @fsid:FS-AddInsight
  test.describe('FS-AddInsight', () => {
    test('clicking the add button in the Insights column opens the Insight modal in add mode', async ({ page }) => {
      const discovery = buildDiscovery({
        title: 'E2E Insight Management',
        facts: [
          { fact_id: 'F-1', text: 'Fact 1', related_inputs: [] },
          { fact_id: 'F-2', text: 'Fact 2', related_inputs: [] },
        ],
      });
      await seedDiscovery(page, discovery);
      await gotoApp(page, discovery.title);

      await openAddInsightModal(page);

      await expect(page.locator('#insight-text')).toHaveValue('');
      await expect(page.locator('#insight-related-facts option')).toHaveCount(2);
      await expect(page.locator('#insight-related-facts option').nth(0)).toHaveText(/fact 1/i);
      await expect(page.locator('#insight-related-facts option').nth(1)).toHaveText(/fact 2/i);
    });
  });

  // @fsid:FS-SaveNewInsight
  test.describe('FS-SaveNewInsight', () => {
    test('entering text, selecting related facts and clicking Add creates a new Insight linked to those Facts', async ({ page }) => {
      const discovery = buildDiscovery({
        title: 'E2E Insight Management',
        facts: [
          { fact_id: 'F-1', text: 'Fact 1', related_inputs: [] },
          { fact_id: 'F-2', text: 'Fact 2', related_inputs: [] },
        ],
      });
      await seedDiscovery(page, discovery);
      await gotoApp(page, discovery.title);

      await openAddInsightModal(page);
      await page.locator('#insight-text').fill('Customers cite delayed support responses as the primary churn driver.');
      await page.locator('#insight-related-facts').selectOption(['F-1']);
      await page.locator('.modal-panel').getByRole('button', { name: /^Add$/ }).click();

      await expect(page.locator('.column.insights .insight-item')).toHaveCount(1);
      await expect(page.locator('.column.insights .insight-item')).toContainText(/primary churn driver/i);

      await expect.poll(async () => (await readStoredDiscovery(page)).insights.length).toBe(1);
      const stored = await readStoredDiscovery(page);
      expect(stored.insights[0].related_facts).toEqual(['F-1']);
      expect(stored.insights[0].text).toBe('Customers cite delayed support responses as the primary churn driver.');
      expect(stored.insights[0].insight_id).not.toBe('');
    });
  });

  // @fsid:FS-EditInsight
  test.describe('FS-EditInsight', () => {
    test('hovering over an Insight and clicking the edit icon opens the modal in edit mode with pre-filled values', async ({ page }) => {
      const discovery = buildDiscovery({
        title: 'E2E Insight Management',
        facts: [
          { fact_id: 'F-1', text: 'Fact 1', related_inputs: [] },
          { fact_id: 'F-2', text: 'Fact 2', related_inputs: [] },
        ],
        insights: [
          { insight_id: 'N-1', text: 'Initial insight text', related_facts: ['F-2'] },
        ],
      });
      await seedDiscovery(page, discovery);
      await gotoApp(page, discovery.title);

      await openEditModalForFirstItem(page, 'insights', 'Edit Insight');

      await expect(page.locator('#insight-text')).toHaveValue('Initial insight text');
      await expect(await selectedValues(page, '#insight-related-facts')).toEqual(['F-2']);
    });
  });

  // @fsid:FS-SaveEditedInsight
  test.describe('FS-SaveEditedInsight', () => {
    test('modifying text or related facts and clicking Save updates the Insight', async ({ page }) => {
      const discovery = buildDiscovery({
        title: 'E2E Insight Management',
        facts: [
          { fact_id: 'F-1', text: 'Fact 1', related_inputs: [] },
          { fact_id: 'F-2', text: 'Fact 2', related_inputs: [] },
        ],
        insights: [
          { insight_id: 'N-1', text: 'Initial insight text', related_facts: ['F-1'] },
        ],
      });
      await seedDiscovery(page, discovery);
      await gotoApp(page, discovery.title);

      await openEditModalForFirstItem(page, 'insights', 'Edit Insight');
      await page.locator('#insight-text').fill('Updated insight about support operations.');
      await page.locator('#insight-related-facts').selectOption(['F-2']);
      await page.locator('.modal-panel').getByRole('button', { name: /^Save$/ }).click();

      await expect(page.locator('.column.insights .insight-item')).toContainText(/updated insight about support operations/i);
      await expect.poll(async () => (await readStoredDiscovery(page)).insights[0].text).toBe('Updated insight about support operations.');
      await expect.poll(async () => (await readStoredDiscovery(page)).insights[0].related_facts.join(','))
        .toBe('F-2');
    });
  });

  // @fsid:FS-DeleteInsight
  test.describe('FS-DeleteInsight', () => {
    test('clicking Delete and confirming removes the Insight from the column', async ({ page }) => {
      const discovery = buildDiscovery({
        title: 'E2E Insight Management',
        facts: [{ fact_id: 'F-1', text: 'Fact 1', related_inputs: [] }],
        insights: [{ insight_id: 'N-1', text: 'Insight to delete', related_facts: ['F-1'] }],
      });
      await seedDiscovery(page, discovery);
      await gotoApp(page, discovery.title);

      await openEditModalForFirstItem(page, 'insights', 'Edit Insight');
      await page.locator('.modal-panel').getByRole('button', { name: /^Delete$/ }).click();
      await expect(page.getByText(/are you sure you want to delete this insight/i)).toBeVisible();
      await page.locator('.modal-panel').getByRole('button', { name: /^Confirm$/ }).click();

      await expect(page.locator('.column.insights .insight-item')).toHaveCount(0);
      await expect.poll(async () => (await readStoredDiscovery(page)).insights.length).toBe(0);
    });
  });
});
