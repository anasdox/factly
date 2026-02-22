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

async function openAddFactModal(page: Page): Promise<void> {
  await page.locator('.column.facts [title="Add Fact"]').click();
  await expect(page.getByRole('heading', { name: 'Add Fact' })).toBeVisible();
}

test.describe('Fact Management (E2E)', () => {
  test.beforeEach(async ({ page }) => {
    await stubBackendStatus(page);
  });

  // @fsid:FS-AddFact
  test.describe('FS-AddFact', () => {
    test('clicking the add button in the Facts column opens the Fact modal in add mode', async ({ page }) => {
      const discovery = buildDiscovery({
        title: 'E2E Fact Management',
        inputs: [
          { input_id: 'I-1', title: 'Support Tickets', type: 'text', text: 'Seed text 1' },
          { input_id: 'I-2', title: 'Survey Results', type: 'web', url: 'https://example.com/survey' },
        ],
      });
      await seedDiscovery(page, discovery);
      await gotoApp(page, discovery.title);

      await openAddFactModal(page);

      await expect(page.locator('#fact-text')).toHaveValue('');
      await expect(page.locator('#fact-related-inputs option')).toHaveCount(2);
      await expect(page.locator('#fact-related-inputs option').nth(0)).toHaveText(/support tickets/i);
      await expect(page.locator('#fact-related-inputs option').nth(1)).toHaveText(/survey results/i);
    });
  });

  // @fsid:FS-SaveNewFact
  test.describe('FS-SaveNewFact', () => {
    test('entering text, selecting related inputs and clicking Add creates a new Fact linked to those Inputs', async ({ page }) => {
      const discovery = buildDiscovery({
        title: 'E2E Fact Management',
        inputs: [
          { input_id: 'I-1', title: 'Support Tickets', type: 'text', text: 'Seed text 1' },
          { input_id: 'I-2', title: 'Survey Results', type: 'web', url: 'https://example.com/survey' },
        ],
      });
      await seedDiscovery(page, discovery);
      await gotoApp(page, discovery.title);

      await openAddFactModal(page);
      await page.locator('#fact-text').fill('Average response time increased from 12h to 52h in Q4.');
      await page.locator('#fact-related-inputs').selectOption(['I-1', 'I-2']);
      await page.locator('.modal-panel').getByRole('button', { name: /^Add$/ }).click();

      await expect(page.locator('.column.facts .fact-item')).toHaveCount(1);
      await expect(page.locator('.column.facts .fact-item')).toContainText(/average response time increased/i);

      await expect.poll(async () => (await readStoredDiscovery(page)).facts.length).toBe(1);
      const stored = await readStoredDiscovery(page);
      expect(stored.facts[0].text).toBe('Average response time increased from 12h to 52h in Q4.');
      expect(stored.facts[0].related_inputs).toEqual(['I-1', 'I-2']);
      expect(stored.facts[0].fact_id).not.toBe('');
    });
  });

  // @fsid:FS-EditFact
  test.describe('FS-EditFact', () => {
    test('hovering over a Fact and clicking the edit icon opens the modal in edit mode with pre-filled values', async ({ page }) => {
      const discovery = buildDiscovery({
        title: 'E2E Fact Management',
        inputs: [
          { input_id: 'I-1', title: 'Support Tickets', type: 'text', text: 'Seed text 1' },
          { input_id: 'I-2', title: 'Survey Results', type: 'web', url: 'https://example.com/survey' },
        ],
        facts: [
          { fact_id: 'F-1', text: 'Initial fact text', related_inputs: ['I-2'] },
        ],
      });
      await seedDiscovery(page, discovery);
      await gotoApp(page, discovery.title);

      await openEditModalForFirstItem(page, 'facts', 'Edit Fact');

      await expect(page.locator('#fact-text')).toHaveValue('Initial fact text');
      await expect(await selectedValues(page, '#fact-related-inputs')).toEqual(['I-2']);
    });
  });

  // @fsid:FS-SaveEditedFact
  test.describe('FS-SaveEditedFact', () => {
    test('modifying text or related inputs and clicking Save updates the Fact', async ({ page }) => {
      const discovery = buildDiscovery({
        title: 'E2E Fact Management',
        inputs: [
          { input_id: 'I-1', title: 'Support Tickets', type: 'text', text: 'Seed text 1' },
          { input_id: 'I-2', title: 'Survey Results', type: 'web', url: 'https://example.com/survey' },
        ],
        facts: [
          { fact_id: 'F-1', text: 'Initial fact text', related_inputs: ['I-1'] },
        ],
      });
      await seedDiscovery(page, discovery);
      await gotoApp(page, discovery.title);

      await openEditModalForFirstItem(page, 'facts', 'Edit Fact');
      await page.locator('#fact-text').fill('Updated fact text for the review.');
      await page.locator('#fact-related-inputs').selectOption(['I-2']);
      await page.locator('.modal-panel').getByRole('button', { name: /^Save$/ }).click();

      await expect(page.locator('.column.facts .fact-item')).toContainText(/updated fact text for the review/i);
      await expect.poll(async () => (await readStoredDiscovery(page)).facts[0].text).toBe('Updated fact text for the review.');
      await expect.poll(async () => (await readStoredDiscovery(page)).facts[0].related_inputs.join(','))
        .toBe('I-2');
    });
  });

  // @fsid:FS-DeleteFact
  test.describe('FS-DeleteFact', () => {
    test('clicking Delete and confirming removes the Fact from the column', async ({ page }) => {
      const discovery = buildDiscovery({
        title: 'E2E Fact Management',
        inputs: [{ input_id: 'I-1', title: 'Support Tickets', type: 'text', text: 'Seed text 1' }],
        facts: [{ fact_id: 'F-1', text: 'Fact to delete', related_inputs: ['I-1'] }],
      });
      await seedDiscovery(page, discovery);
      await gotoApp(page, discovery.title);

      await openEditModalForFirstItem(page, 'facts', 'Edit Fact');
      await page.locator('.modal-panel').getByRole('button', { name: /^Delete$/ }).click();
      await expect(page.getByText(/are you sure you want to delete this fact/i)).toBeVisible();
      await page.locator('.modal-panel').getByRole('button', { name: /^Confirm$/ }).click();

      await expect(page.locator('.column.facts .fact-item')).toHaveCount(0);
      await expect.poll(async () => (await readStoredDiscovery(page)).facts.length).toBe(0);
    });
  });

  // @fsid:FS-FactDisplayBoldsNumbers
  test.describe('FS-FactDisplayBoldsNumbers', () => {
    test('the first numeric value in Fact text is displayed in bold', async ({ page }) => {
      const discovery = buildDiscovery({
        title: 'E2E Fact Management',
        facts: [{ fact_id: 'F-1', text: 'Response time increased from 12h to 52h in Q4.', related_inputs: [] }],
      });
      await seedDiscovery(page, discovery);
      await gotoApp(page, discovery.title);

      await expect(page.locator('.column.facts .fact-item b')).toHaveCount(1);
      await expect(page.locator('.column.facts .fact-item b')).toHaveText('12');
      await expect(page.locator('.column.facts .fact-item')).toContainText(/52h/i);
    });
  });
});
