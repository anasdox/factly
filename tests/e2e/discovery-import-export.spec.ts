import fs from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import {
  buildDiscovery,
  confirmPrompt,
  gotoApp,
  readStoredDiscovery,
  seedDiscovery,
  stubBackendStatus,
  type E2EDiscovery,
} from './helpers/factly';

function buildLinkedDiscovery(overrides: Partial<E2EDiscovery> = {}): E2EDiscovery {
  return buildDiscovery({
    discovery_id: 'imported-001',
    title: 'Imported Discovery',
    goal: 'Imported goal',
    date: '2026-02-22',
    inputs: [{ input_id: 'I-1', title: 'Input 1', type: 'text', text: 'Seed input text' }],
    facts: [{ fact_id: 'F-1', text: 'Fact 1', related_inputs: ['I-1'] }],
    insights: [{ insight_id: 'N-1', text: 'Insight 1', related_facts: ['F-1'] }],
    recommendations: [{ recommendation_id: 'R-1', text: 'Recommendation 1', related_insights: ['N-1'] }],
    outputs: [{ output_id: 'O-1', text: 'Output 1', related_recommendations: ['R-1'], type: 'report' }],
    ...overrides,
  });
}

test.describe('Discovery Import/Export (E2E)', () => {
  test.beforeEach(async ({ page }) => {
    await stubBackendStatus(page);
  });

  // @fsid:FS-ExportDiscovery
  test.describe('FS-ExportDiscovery', () => {
    test('clicking Save Discovery downloads a JSON file named after the discovery title', async ({ page }) => {
      const discovery = buildLinkedDiscovery({ title: 'My Analysis' });
      await seedDiscovery(page, discovery);
      await gotoApp(page, discovery.title);

      const downloadPromise = page.waitForEvent('download');
      await page.locator('[title="Save Discovery"]').click();
      const download = await downloadPromise;

      expect(download.suggestedFilename()).toBe('My_Analysis_export.json');
      const path = await download.path();
      expect(path).not.toBeNull();
      const fileContent = await fs.readFile(path as string, 'utf8');
      expect(JSON.parse(fileContent)).toEqual(discovery);
    });
  });

  // @fsid:FS-ImportDiscovery
  test.describe('FS-ImportDiscovery', () => {
    test('selecting a valid JSON file via Open Discovery replaces the current discovery with imported data', async ({ page }) => {
      const initialDiscovery = buildDiscovery({
        title: 'Current Discovery',
        goal: 'Current goal',
      });
      const importedDiscovery = buildLinkedDiscovery({
        title: 'Imported Discovery',
        goal: 'Imported analysis goal',
      });
      await seedDiscovery(page, initialDiscovery);
      await gotoApp(page, initialDiscovery.title);

      await page.setInputFiles('#file-input', {
        name: 'import.json',
        mimeType: 'application/json',
        buffer: Buffer.from(JSON.stringify(importedDiscovery), 'utf8'),
      });

      await confirmPrompt(page, /import "imported discovery"\? this will replace the current discovery/i);

      await expect(page.getByRole('heading', { name: /imported discovery/i })).toBeVisible();
      await expect(page.getByText(/imported analysis goal/i)).toBeVisible();
      await expect(page.locator('.column.inputs .input-item')).toHaveCount(1);
      await expect(page.locator('.column.facts .fact-item')).toHaveCount(1);
      await expect(page.locator('.column.insights .insight-item')).toHaveCount(1);
      await expect(page.locator('.column.recommendations .recommendation-item')).toHaveCount(1);
      await expect(page.locator('.column.outputs .output-item')).toHaveCount(1);
      await expect(page.locator('.line')).toHaveCount(4);

      await expect.poll(async () => (await readStoredDiscovery(page)).title).toBe('Imported Discovery');
      expect(await readStoredDiscovery(page)).toEqual(importedDiscovery);
    });
  });

  // @fsid:FS-ImportInvalidJson
  test.describe('FS-ImportInvalidJson', () => {
    test('selecting an invalid JSON file logs an error and leaves the current discovery unchanged', async ({ page }) => {
      const discovery = buildDiscovery({ title: 'Current Discovery', goal: 'Current goal' });
      await seedDiscovery(page, discovery);
      await gotoApp(page, discovery.title);

      const consoleErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      await page.setInputFiles('#file-input', {
        name: 'broken.json',
        mimeType: 'application/json',
        buffer: Buffer.from('{ invalid json }', 'utf8'),
      });

      await expect.poll(() => consoleErrors.some((m) => /Error parsing JSON/i.test(m))).toBe(true);
      await expect(page.getByRole('heading', { name: /current discovery/i })).toBeVisible();
      await expect(page.getByText(/current goal/i)).toBeVisible();
      await expect(page.locator('.modal-panel').filter({ hasText: /import .*replace the current discovery/i })).toHaveCount(0);
      expect(await readStoredDiscovery(page)).toEqual(discovery);
    });
  });

  // @fsid:FS-LoadInitialData
  test.describe('FS-LoadInitialData', () => {
    test('on application start without local discovery, the welcome screen is shown and no /data.json fetch occurs', async ({ page }) => {
      let dataJsonRequests = 0;
      await page.route('**/data.json', async (route) => {
        dataJsonRequests += 1;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(buildLinkedDiscovery()),
        });
      });

      await page.goto('/');

      await expect(page.getByRole('heading', { name: 'Factly' })).toBeVisible();
      await expect(page.getByText(/from raw information to evidence-based decisions/i)).toBeVisible();
      await expect(page.getByText(/loading\.\.\./i)).toHaveCount(0);
      expect(dataJsonRequests).toBe(0);
    });
  });
});
