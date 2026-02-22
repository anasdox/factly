import { expect, Page } from '@playwright/test';

export const STORAGE_KEY = 'factly_last_discovery';

export type E2EInput = {
  input_id: string;
  title: string;
  type: string;
  url?: string;
  text?: string;
  version?: number;
  status?: string;
  created_at?: string;
};

export type E2EFact = {
  fact_id: string;
  text: string;
  related_inputs: string[];
  source_excerpt?: string;
  version?: number;
  status?: string;
  created_at?: string;
};

export type E2EInsight = {
  insight_id: string;
  text: string;
  related_facts: string[];
  version?: number;
  status?: string;
  created_at?: string;
};

export type E2ERecommendation = {
  recommendation_id: string;
  text: string;
  related_insights: string[];
  version?: number;
  status?: string;
  created_at?: string;
};

export type E2EOutput = {
  output_id: string;
  text: string;
  related_recommendations: string[];
  type: 'report' | 'presentation' | 'action_plan' | 'brief';
  version?: number;
  status?: string;
  created_at?: string;
};

export type E2EDiscovery = {
  discovery_id: string;
  title: string;
  goal: string;
  date: string;
  inputs: E2EInput[];
  facts: E2EFact[];
  insights: E2EInsight[];
  recommendations: E2ERecommendation[];
  outputs: E2EOutput[];
  chat_history?: unknown[];
};

export function buildDiscovery(overrides: Partial<E2EDiscovery> = {}): E2EDiscovery {
  return {
    discovery_id: 'e2e-discovery-001',
    title: 'E2E Discovery',
    goal: 'Validate browser CRUD behaviors',
    date: '2026-02-22',
    inputs: [],
    facts: [],
    insights: [],
    recommendations: [],
    outputs: [],
    chat_history: [],
    ...overrides,
  };
}

export async function stubBackendStatus(page: Page): Promise<void> {
  await page.route('**/status', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '{}',
    });
  });
}

export async function seedDiscovery(page: Page, discovery: E2EDiscovery): Promise<void> {
  await page.addInitScript(
    ({ key, value }) => {
      window.localStorage.setItem(key, JSON.stringify(value));
    },
    { key: STORAGE_KEY, value: discovery },
  );
}

export async function gotoApp(page: Page, discoveryTitle: string): Promise<void> {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: new RegExp(discoveryTitle, 'i') })).toBeVisible();
  await expect(page.locator('.discovery-grid')).toBeVisible();
}

export async function readStoredDiscovery(page: Page): Promise<E2EDiscovery> {
  return await page.evaluate((key) => {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      throw new Error(`Missing localStorage key: ${key}`);
    }
    return JSON.parse(raw);
  }, STORAGE_KEY);
}

export async function selectedValues(page: Page, selector: string): Promise<string[]> {
  return await page.locator(selector).evaluate((el) =>
    Array.from((el as HTMLSelectElement).selectedOptions).map((option) => option.value),
  );
}

export async function openEditModalForFirstItem(page: Page, columnClass: string, heading: string): Promise<void> {
  const firstWrapper = page.locator(`.column.${columnClass} .wrapper`).first();
  await firstWrapper.hover();
  await firstWrapper.locator('[title="Edit"]').click();
  await expect(page.getByRole('heading', { name: heading })).toBeVisible();
}

export async function confirmPrompt(page: Page, promptText: RegExp): Promise<void> {
  const promptPanel = page.locator('.modal-panel').filter({ hasText: promptText });
  await expect(promptPanel).toBeVisible();
  await promptPanel.getByRole('button', { name: /^Confirm$/ }).click();
}
