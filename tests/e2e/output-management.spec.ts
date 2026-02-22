import { expect, Page, test } from '@playwright/test';

const STORAGE_KEY = 'factly_last_discovery';

type TestDiscovery = {
  discovery_id: string;
  title: string;
  goal: string;
  date: string;
  inputs: unknown[];
  facts: unknown[];
  insights: unknown[];
  recommendations: { recommendation_id: string; text: string; related_insights: string[] }[];
  outputs: {
    output_id: string;
    text: string;
    related_recommendations: string[];
    type: 'report' | 'presentation' | 'action_plan' | 'brief';
    version?: number;
    status?: string;
    created_at?: string;
  }[];
};

function buildDiscovery(overrides: Partial<TestDiscovery> = {}): TestDiscovery {
  return {
    discovery_id: 'e2e-output-001',
    title: 'E2E Output Management',
    goal: 'Validate output CRUD behavior',
    date: '2026-02-22',
    inputs: [],
    facts: [],
    insights: [],
    recommendations: [
      { recommendation_id: 'R-1', text: 'Prepare an executive summary for leadership', related_insights: [] },
      { recommendation_id: 'R-2', text: 'Create a rollout checklist for the ops team', related_insights: [] },
    ],
    outputs: [],
    ...overrides,
  };
}

async function stubBackendStatus(page: Page): Promise<void> {
  await page.route('**/status', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '{}',
    });
  });
}

async function seedDiscovery(page: Page, discovery: TestDiscovery): Promise<void> {
  await page.addInitScript(
    ({ key, value }) => {
      window.localStorage.setItem(key, JSON.stringify(value));
    },
    { key: STORAGE_KEY, value: discovery },
  );
}

async function gotoApp(page: Page, discoveryTitle: string): Promise<void> {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: new RegExp(discoveryTitle, 'i') })).toBeVisible();
  await expect(page.locator('.column.outputs')).toBeVisible();
}

async function openAddOutputModal(page: Page): Promise<void> {
  await page.locator('.column.outputs [title="Add Output"]').click();
  await expect(page.getByRole('heading', { name: 'Add Output' })).toBeVisible();
}

async function openEditModalForFirstOutput(page: Page): Promise<void> {
  const firstOutputWrapper = page.locator('.column.outputs .wrapper').first();
  await firstOutputWrapper.hover();
  await firstOutputWrapper.locator('[title="Edit"]').click();
  await expect(page.getByRole('heading', { name: 'Edit Output' })).toBeVisible();
}

async function readStoredDiscovery(page: Page): Promise<TestDiscovery> {
  return await page.evaluate((key) => {
    const raw = window.localStorage.getItem(key);
    if (!raw) throw new Error(`Missing localStorage key: ${key}`);
    return JSON.parse(raw);
  }, STORAGE_KEY);
}

async function selectedRecommendationIds(page: Page): Promise<string[]> {
  return await page.locator('#output-related-recommendations').evaluate((el) =>
    Array.from((el as HTMLSelectElement).selectedOptions).map(option => option.value),
  );
}

test.describe('Output Management (E2E)', () => {
  test.beforeEach(async ({ page }) => {
    await stubBackendStatus(page);
  });

  // @fsid:FS-AddOutput
  test.describe('FS-AddOutput', () => {
    test('clicking the add button opens the Output modal in add mode with empty fields and recommendation options', async ({ page }) => {
      const discovery = buildDiscovery();
      await seedDiscovery(page, discovery);
      await gotoApp(page, discovery.title);

      await openAddOutputModal(page);

      await expect(page.getByLabel('Text')).toHaveValue('');
      await expect(page.locator('#output-related-recommendations option')).toHaveCount(2);
      await expect(page.locator('#output-related-recommendations option').nth(0)).toHaveText(/executive summary/i);
      await expect(page.locator('#output-related-recommendations option').nth(1)).toHaveText(/rollout checklist/i);
    });
  });

  // @fsid:FS-SaveNewOutput
  test.describe('FS-SaveNewOutput', () => {
    test('entering text, selecting recommendations and clicking Add creates a linked output', async ({ page }) => {
      const discovery = buildDiscovery();
      await seedDiscovery(page, discovery);
      await gotoApp(page, discovery.title);

      await openAddOutputModal(page);
      await page.getByLabel('Text').fill('Executive summary for Q4 retention risks');
      await page.locator('#output-related-recommendations').selectOption(['R-1']);
      await page.locator('.modal-panel').getByRole('button', { name: /^Add$/ }).click();

      await expect(page.locator('.column.outputs .output-item')).toHaveCount(1);
      await expect(page.locator('.column.outputs .output-item')).toContainText(/executive summary for q4 retention risks/i);

      await expect.poll(async () => (await readStoredDiscovery(page)).outputs.length).toBe(1);
      const stored = await readStoredDiscovery(page);
      expect(stored.outputs[0].related_recommendations).toEqual(['R-1']);
      expect(stored.outputs[0].text).toBe('Executive summary for Q4 retention risks');
    });
  });

  // @fsid:FS-EditOutput
  test.describe('FS-EditOutput', () => {
    test('hovering an Output and clicking edit opens the modal in edit mode with pre-filled values', async ({ page }) => {
      const discovery = buildDiscovery({
        outputs: [
          {
            output_id: 'O-1',
            text: 'Initial output draft',
            related_recommendations: ['R-2'],
            type: 'report',
            version: 1,
            status: 'draft',
            created_at: '2026-02-22T12:00:00.000Z',
          },
        ],
      });
      await seedDiscovery(page, discovery);
      await gotoApp(page, discovery.title);

      await openEditModalForFirstOutput(page);

      await expect(page.getByLabel('Text')).toHaveValue('Initial output draft');
      await expect(page.getByLabel('Type')).toHaveValue('report');
      await expect(await selectedRecommendationIds(page)).toEqual(['R-2']);
    });
  });

  // @fsid:FS-SaveEditedOutput
  test.describe('FS-SaveEditedOutput', () => {
    test('modifying text or related recommendations and clicking Save updates the Output', async ({ page }) => {
      const discovery = buildDiscovery({
        outputs: [
          {
            output_id: 'O-1',
            text: 'Initial output draft',
            related_recommendations: ['R-1'],
            type: 'report',
            version: 1,
            status: 'draft',
            created_at: '2026-02-22T12:00:00.000Z',
          },
        ],
      });
      await seedDiscovery(page, discovery);
      await gotoApp(page, discovery.title);

      await openEditModalForFirstOutput(page);
      await page.getByLabel('Text').fill('Updated output for operations and leadership');
      await page.locator('#output-related-recommendations').selectOption(['R-2']);
      await page.locator('.modal-panel').getByRole('button', { name: /^Save$/ }).click();

      await expect(page.locator('.column.outputs .output-item')).toContainText(/updated output for operations and leadership/i);
      await expect.poll(async () => (await readStoredDiscovery(page)).outputs[0].text).toBe('Updated output for operations and leadership');
      await expect.poll(async () => (await readStoredDiscovery(page)).outputs[0].related_recommendations.join(',')).toBe('R-2');
    });
  });

  // @fsid:FS-DeleteOutput
  test.describe('FS-DeleteOutput', () => {
    test('clicking Delete and confirming removes the Output from the column', async ({ page }) => {
      const discovery = buildDiscovery({
        outputs: [
          {
            output_id: 'O-1',
            text: 'Output to delete',
            related_recommendations: ['R-1'],
            type: 'report',
            version: 1,
            status: 'draft',
            created_at: '2026-02-22T12:00:00.000Z',
          },
        ],
      });
      await seedDiscovery(page, discovery);
      await gotoApp(page, discovery.title);

      await openEditModalForFirstOutput(page);
      await page.locator('.modal-panel').getByRole('button', { name: /^Delete$/ }).click();
      await expect(page.getByText(/are you sure you want to delete this output/i)).toBeVisible();
      await page.locator('.modal-panel').getByRole('button', { name: /^Confirm$/ }).click();

      await expect(page.locator('.column.outputs .output-item')).toHaveCount(0);
      await expect.poll(async () => (await readStoredDiscovery(page)).outputs.length).toBe(0);
    });
  });
});
