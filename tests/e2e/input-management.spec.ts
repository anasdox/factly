import { expect, Page, test } from '@playwright/test';
import {
  buildDiscovery,
  gotoApp,
  openEditModalForFirstItem,
  readStoredDiscovery,
  seedDiscovery,
  stubBackendStatus,
} from './helpers/factly';

async function openAddInputModal(page: Page): Promise<void> {
  await page.locator('.column.inputs [title="Add Input"]').click();
  await expect(page.getByRole('heading', { name: 'Add Input' })).toBeVisible();
}

test.describe('Input Management (E2E)', () => {
  test.beforeEach(async ({ page }) => {
    await stubBackendStatus(page);
  });

  // @fsid:FS-AddInput
  test.describe('FS-AddInput', () => {
    test('clicking the add button in the Inputs column opens the Input modal in add mode with defaults', async ({ page }) => {
      const discovery = buildDiscovery({ title: 'E2E Input Management' });
      await seedDiscovery(page, discovery);
      await gotoApp(page, discovery.title);

      await openAddInputModal(page);

      await expect(page.locator('#input-title')).toHaveValue('');
      await expect(page.locator('#input-type')).toHaveValue('text');
      await expect(page.locator('#input-text')).toHaveValue('');
      await expect(page.locator('#input-url')).toHaveCount(0);
    });
  });

  // @fsid:FS-SaveNewInput
  test.describe('FS-SaveNewInput', () => {
    test('filling in title, URL, type and clicking Add creates a new Input with a generated ID', async ({ page }) => {
      const discovery = buildDiscovery({ title: 'E2E Input Management' });
      await seedDiscovery(page, discovery);
      await gotoApp(page, discovery.title);

      await openAddInputModal(page);
      await page.locator('#input-type').selectOption('web');
      await page.locator('#input-title').fill('Quarterly report URL');
      await page.locator('#input-url').fill('https://example.com/q4-report');
      await page.locator('.modal-panel').getByRole('button', { name: /^Add$/ }).click();

      await expect(page.locator('.column.inputs .input-item')).toHaveCount(1);
      await expect(page.locator('.column.inputs .input-item')).toContainText(/quarterly report url/i);

      await expect.poll(async () => (await readStoredDiscovery(page)).inputs.length).toBe(1);
      const stored = await readStoredDiscovery(page);
      expect(stored.inputs[0].title).toBe('Quarterly report URL');
      expect(stored.inputs[0].type).toBe('web');
      expect(stored.inputs[0].url).toBe('https://example.com/q4-report');
      expect(stored.inputs[0].input_id).not.toBe('');
    });
  });

  // @fsid:FS-EditInput
  test.describe('FS-EditInput', () => {
    test('hovering over an Input and clicking the edit icon opens the modal in edit mode with pre-filled values', async ({ page }) => {
      const discovery = buildDiscovery({
        title: 'E2E Input Management',
        inputs: [
          {
            input_id: 'I-1',
            title: 'Source URL',
            type: 'web',
            url: 'https://example.com/source',
            text: '',
            version: 1,
            status: 'draft',
            created_at: '2026-02-22T12:00:00.000Z',
          },
        ],
      });
      await seedDiscovery(page, discovery);
      await gotoApp(page, discovery.title);

      await openEditModalForFirstItem(page, 'inputs', 'Edit Input');

      await expect(page.locator('#input-title')).toHaveValue('Source URL');
      await expect(page.locator('#input-type')).toHaveValue('web');
      await expect(page.locator('#input-url')).toHaveValue('https://example.com/source');
    });
  });

  // @fsid:FS-SaveEditedInput
  test.describe('FS-SaveEditedInput', () => {
    test('modifying values and clicking Save updates the Input', async ({ page }) => {
      const discovery = buildDiscovery({
        title: 'E2E Input Management',
        inputs: [
          {
            input_id: 'I-1',
            title: 'Source URL',
            type: 'web',
            url: 'https://example.com/source',
            text: '',
            version: 1,
            status: 'draft',
            created_at: '2026-02-22T12:00:00.000Z',
          },
        ],
      });
      await seedDiscovery(page, discovery);
      await gotoApp(page, discovery.title);

      await openEditModalForFirstItem(page, 'inputs', 'Edit Input');
      await page.locator('#input-title').fill('Updated Source URL');
      await page.locator('#input-url').fill('https://example.com/source-updated');
      await page.locator('.modal-panel').getByRole('button', { name: /^Save$/ }).click();

      await expect(page.locator('.column.inputs .input-item')).toContainText(/updated source url/i);
      await expect.poll(async () => (await readStoredDiscovery(page)).inputs[0].title).toBe('Updated Source URL');
      await expect.poll(async () => (await readStoredDiscovery(page)).inputs[0].url || '').toBe('https://example.com/source-updated');
    });
  });

  // @fsid:FS-DeleteInput
  test.describe('FS-DeleteInput', () => {
    test('clicking Delete and confirming archives the Input instead of removing it', async ({ page }) => {
      const discovery = buildDiscovery({
        title: 'E2E Input Management',
        inputs: [
          {
            input_id: 'I-1',
            title: 'Input to archive',
            type: 'text',
            text: 'Original text',
            version: 1,
            status: 'draft',
            created_at: '2026-02-22T12:00:00.000Z',
          },
        ],
      });
      await seedDiscovery(page, discovery);
      await gotoApp(page, discovery.title);

      await openEditModalForFirstItem(page, 'inputs', 'Edit Input');
      await page.locator('.modal-panel').getByRole('button', { name: /^Delete$/ }).click();
      await expect(page.getByText(/are you sure you want to delete this input/i)).toBeVisible();
      await page.locator('.modal-panel').getByRole('button', { name: /^Confirm$/ }).click();

      await expect(page.locator('.column.inputs .input-item')).toHaveCount(1);
      await expect.poll(async () => (await readStoredDiscovery(page)).inputs.length).toBe(1);
      await expect.poll(async () => (await readStoredDiscovery(page)).inputs[0].status || '').toBe('outdated');
    });
  });

  // @fsid:FS-ClickInputOpensUrl
  test.describe('FS-ClickInputOpensUrl', () => {
    test('clicking an Input item toggles selection on the item', async ({ page }) => {
      const discovery = buildDiscovery({
        title: 'E2E Input Management',
        inputs: [
          { input_id: 'I-1', title: 'Clickable Input', type: 'web', url: 'https://example.com' },
        ],
      });
      await seedDiscovery(page, discovery);
      await gotoApp(page, discovery.title);

      const selectable = page.locator('.column.inputs .item-selectable').first();
      await selectable.click();

      await expect(selectable).toHaveClass(/selected/);
    });
  });

  // @fsid:FS-InputTypeIcons
  test.describe('FS-InputTypeIcons', () => {
    test('each Input displays the expected icon for supported types and fallback for unsupported types', async ({ page }) => {
      const discovery = buildDiscovery({
        title: 'E2E Input Management',
        inputs: [
          { input_id: 'I-TEXT', title: 'Text Input', type: 'text', text: 'Body text' },
          { input_id: 'I-WEB', title: 'Web Input', type: 'web', url: 'https://example.com' },
          { input_id: 'I-AUDIO', title: 'Audio Input', type: 'audio', url: 'https://example.com/audio.mp3' },
        ],
      });
      await seedDiscovery(page, discovery);
      await gotoApp(page, discovery.title);

      await expect(page.locator('#input-I-TEXT svg.input-icon')).toHaveAttribute('data-icon', /file-(alt|lines)/);
      await expect(page.locator('#input-I-WEB svg.input-icon')).toHaveAttribute('data-icon', /globe/);
      await expect(page.locator('#input-I-AUDIO svg.input-icon')).toHaveAttribute('data-icon', /(question-circle|circle-question)/);
    });
  });
});
