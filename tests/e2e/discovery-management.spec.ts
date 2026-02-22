import { expect, Page, test } from '@playwright/test';
import {
  buildDiscovery,
  confirmPrompt,
  gotoApp,
  readStoredDiscovery,
  seedDiscovery,
  stubBackendStatus,
} from './helpers/factly';

async function openNewDiscoveryModal(page: Page): Promise<void> {
  await page.locator('[title="New Discovery"]').click();
  await confirmPrompt(page, /start a new discovery/i);
  await expect(page.getByRole('heading', { name: 'Add New Discovery' })).toBeVisible();
}

async function openEditDiscoveryModal(page: Page): Promise<void> {
  await page.locator('[title="Edit Discovery Goal"]').click();
  await expect(page.getByRole('heading', { name: 'Edit Discovery' })).toBeVisible();
}

test.describe('Discovery Management (E2E)', () => {
  test.beforeEach(async ({ page }) => {
    await stubBackendStatus(page);
  });

  // @fsid:FS-CreateNewDiscovery
  test.describe('FS-CreateNewDiscovery', () => {
    test('clicking "New Discovery" and confirming opens the Discovery modal in add mode with empty visible fields', async ({ page }) => {
      const discovery = buildDiscovery({
        title: 'Active Discovery',
        goal: 'Current working goal',
      });
      await seedDiscovery(page, discovery);
      await gotoApp(page, discovery.title);

      await openNewDiscoveryModal(page);

      await expect(page.locator('#discovery-title')).toHaveValue('');
      await expect(page.locator('#discovery-goal')).toHaveValue('');
      await expect(page.locator('#discovery-date')).toHaveCount(0);
    });
  });

  // @fsid:FS-SaveNewDiscovery
  test.describe('FS-SaveNewDiscovery', () => {
    test('filling in title and goal then clicking Add creates a discovery with reset entity collections', async ({ page }) => {
      const discovery = buildDiscovery({
        title: 'Old Discovery',
        goal: 'Old goal',
        inputs: [{ input_id: 'I-1', title: 'Seed input', type: 'text', text: 'seed' }],
        facts: [{ fact_id: 'F-1', text: 'Seed fact', related_inputs: ['I-1'] }],
        insights: [{ insight_id: 'N-1', text: 'Seed insight', related_facts: ['F-1'] }],
        recommendations: [{ recommendation_id: 'R-1', text: 'Seed recommendation', related_insights: ['N-1'] }],
        outputs: [{ output_id: 'O-1', text: 'Seed output', related_recommendations: ['R-1'], type: 'report' }],
      });
      await seedDiscovery(page, discovery);
      await gotoApp(page, discovery.title);

      await openNewDiscoveryModal(page);
      await page.locator('#discovery-title').fill('Q1 Retention Review');
      await page.locator('#discovery-goal').fill('Understand churn drivers and define remediation actions.');
      await page.locator('.modal-panel').getByRole('button', { name: /^Add$/ }).click();

      await expect(page.getByRole('heading', { name: /q1 retention review/i })).toBeVisible();
      await expect(page.getByText(/understand churn drivers and define remediation actions/i)).toBeVisible();

      await expect.poll(async () => (await readStoredDiscovery(page)).title).toBe('Q1 Retention Review');
      const stored = await readStoredDiscovery(page);
      expect(stored.goal).toBe('Understand churn drivers and define remediation actions.');
      expect(stored.inputs).toHaveLength(0);
      expect(stored.facts).toHaveLength(0);
      expect(stored.insights).toHaveLength(0);
      expect(stored.recommendations).toHaveLength(0);
      expect(stored.outputs).toHaveLength(0);
      expect(stored.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  // @fsid:FS-EditDiscovery
  test.describe('FS-EditDiscovery', () => {
    test('clicking "Edit Discovery Goal" opens the Discovery modal in edit mode with pre-filled visible fields', async ({ page }) => {
      const discovery = buildDiscovery({
        title: 'My Discovery',
        goal: 'Initial goal statement',
        date: '2026-02-10',
      });
      await seedDiscovery(page, discovery);
      await gotoApp(page, discovery.title);

      await openEditDiscoveryModal(page);

      await expect(page.locator('#discovery-title')).toHaveValue('My Discovery');
      await expect(page.locator('#discovery-goal')).toHaveValue('Initial goal statement');
      await expect(page.locator('#discovery-date')).toHaveCount(0);
    });
  });

  // @fsid:FS-SaveEditedDiscovery
  test.describe('FS-SaveEditedDiscovery', () => {
    test('modifying visible fields and clicking Save updates discovery while preserving collections', async ({ page }) => {
      const discovery = buildDiscovery({
        title: 'My Discovery',
        goal: 'Initial goal statement',
        date: '2026-02-10',
        inputs: [{ input_id: 'I-1', title: 'Input 1', type: 'text', text: 'alpha' }],
        facts: [{ fact_id: 'F-1', text: 'Fact 1', related_inputs: ['I-1'] }],
        insights: [{ insight_id: 'N-1', text: 'Insight 1', related_facts: ['F-1'] }],
        recommendations: [{ recommendation_id: 'R-1', text: 'Recommendation 1', related_insights: ['N-1'] }],
        outputs: [{ output_id: 'O-1', text: 'Output 1', related_recommendations: ['R-1'], type: 'report' }],
      });
      await seedDiscovery(page, discovery);
      await gotoApp(page, discovery.title);

      await openEditDiscoveryModal(page);
      await page.locator('#discovery-title').fill('My Discovery Updated');
      await page.locator('#discovery-goal').fill('Updated goal statement');
      await page.locator('.modal-panel').getByRole('button', { name: /^Save$/ }).click();

      await expect(page.getByRole('heading', { name: /my discovery updated/i })).toBeVisible();
      await expect(page.getByText(/updated goal statement/i)).toBeVisible();

      await expect.poll(async () => (await readStoredDiscovery(page)).title).toBe('My Discovery Updated');
      const stored = await readStoredDiscovery(page);
      expect(stored.goal).toBe('Updated goal statement');
      expect(stored.date).toBe('2026-02-10');
      expect(stored.inputs.map((i) => i.input_id)).toEqual(['I-1']);
      expect(stored.facts.map((f) => f.fact_id)).toEqual(['F-1']);
      expect(stored.insights.map((i) => i.insight_id)).toEqual(['N-1']);
      expect(stored.recommendations.map((r) => r.recommendation_id)).toEqual(['R-1']);
      expect(stored.outputs.map((o) => o.output_id)).toEqual(['O-1']);
    });
  });

  // @fsid:FS-CancelDiscoveryModal
  test.describe('FS-CancelDiscoveryModal', () => {
    test('clicking Cancel closes the modal without applying changes', async ({ page }) => {
      const discovery = buildDiscovery({
        title: 'My Discovery',
        goal: 'Initial goal statement',
      });
      await seedDiscovery(page, discovery);
      await gotoApp(page, discovery.title);

      await openEditDiscoveryModal(page);
      await page.locator('#discovery-title').fill('Unsaved Title');
      await page.locator('#discovery-goal').fill('Unsaved goal');
      await page.locator('.modal-panel').getByRole('button', { name: /cancel/i }).click();

      await expect(page.getByRole('heading', { name: /my discovery/i })).toBeVisible();
      await expect(page.getByText(/initial goal statement/i)).toBeVisible();

      const stored = await readStoredDiscovery(page);
      expect(stored.title).toBe('My Discovery');
      expect(stored.goal).toBe('Initial goal statement');
    });
  });
});
