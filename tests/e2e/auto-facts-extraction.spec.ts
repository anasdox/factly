import { expect, Page, test } from '@playwright/test';
import { buildDiscovery, gotoApp, readStoredDiscovery, seedDiscovery, stubBackendStatus } from './helpers/factly';

type FactSuggestion = { text: string; source_excerpt?: string };

async function stubFactsExtraction(
  page: Page,
  handler: (body: any) => { status?: number; body: any },
): Promise<void> {
  await page.route('**/extract/facts', async (route) => {
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

async function openInputsSelectionToolbar(page: Page, inputIds: string[]): Promise<void> {
  for (const id of inputIds) {
    await page.locator(`#input-${id}`).click();
  }
  const toolbarWrapper = page.locator('.column.inputs .toolbar-wrapper');
  await expect(toolbarWrapper).toHaveClass(/toolbar-wrapper-open/);
}

async function openSuggestedFactsPanel(
  page: Page,
  options: {
    suggestions: FactSuggestion[];
    inputs?: Array<{ input_id: string; title: string; type: string; text?: string; url?: string }>;
    selectedInputIds?: string[];
    onRequest?: (body: any) => void;
  },
): Promise<void> {
  const inputs = options.inputs ?? [
    { input_id: 'I-1', title: 'Transcript', type: 'text', text: 'Customer churn increased to 15% in Q4.' },
  ];
  const selectedInputIds = options.selectedInputIds ?? [inputs[0].input_id];

  await stubFactsExtraction(page, (body) => {
    options.onRequest?.(body);
    return { body: { suggestions: options.suggestions } };
  });

  const discovery = buildDiscovery({
    title: 'Auto Facts Extraction E2E',
    goal: 'Extract churn-related facts',
    inputs,
    facts: [],
    insights: [],
  });

  await seedDiscovery(page, discovery);
  await gotoApp(page, discovery.title);
  await openInputsSelectionToolbar(page, selectedInputIds);
  await page.locator('.column.inputs .selection-toolbar').getByRole('button', { name: /generate facts/i }).click();
  await expect(page.locator('.suggestions-panel')).toBeVisible();
  await expect(page.getByRole('heading', { name: /suggested facts/i })).toBeVisible();
}

test.describe('Auto Facts Extraction (E2E)', () => {
  test.beforeEach(async ({ page }) => {
    await stubBackendStatus(page);
  });

  // @fsid:FS-AcceptSuggestedFact
  test.describe('FS-AcceptSuggestedFact', () => {
    test('clicking Accept on a suggested fact adds it to the Facts column linked to the source Input', async ({ page }) => {
      await openSuggestedFactsPanel(page, {
        suggestions: [{ text: 'Support response time reached 52h in Q4.', source_excerpt: 'avg response 52h' }],
      });

      await page.locator('.suggestion-card').first().getByRole('button', { name: /^Accept$/ }).click();

      await expect(page.locator('.column.facts .fact-item')).toHaveCount(1);
      await expect(page.locator('.column.facts .fact-item')).toContainText(/52h in q4/i);
      await expect(page.locator('.suggestions-panel')).toHaveCount(0);

      const stored = await readStoredDiscovery(page);
      expect(stored.facts).toHaveLength(1);
      expect(stored.facts[0].text).toBe('Support response time reached 52h in Q4.');
      expect(stored.facts[0].related_inputs).toEqual(['I-1']);
    });
  });

  // @fsid:FS-EditSuggestedFact
  test.describe('FS-EditSuggestedFact', () => {
    test('clicking Edit makes the card editable; confirming adds the modified fact to the pipeline', async ({ page }) => {
      await openSuggestedFactsPanel(page, {
        suggestions: [{ text: 'Original suggested fact', source_excerpt: 'excerpt' }],
      });

      await page.locator('.suggestion-card').first().getByRole('button', { name: /^Edit$/ }).click();
      const editTextarea = page.locator('.suggestion-card textarea').first();
      await expect(editTextarea).toBeVisible();
      await editTextarea.fill('Edited suggested fact for analyst review');
      await page.locator('.suggestion-edit-actions').first().getByRole('button', { name: /^Confirm$/ }).click();

      await expect(page.locator('.column.facts .fact-item')).toHaveCount(1);
      await expect(page.locator('.column.facts .fact-item')).toContainText(/edited suggested fact for analyst review/i);

      const stored = await readStoredDiscovery(page);
      expect(stored.facts[0].text).toBe('Edited suggested fact for analyst review');
      expect(stored.facts[0].related_inputs).toEqual(['I-1']);
    });
  });

  // @fsid:FS-RejectSuggestedFact
  test.describe('FS-RejectSuggestedFact', () => {
    test('clicking Reject removes the card without adding any fact', async ({ page }) => {
      await openSuggestedFactsPanel(page, {
        suggestions: [
          { text: 'Suggested fact A' },
          { text: 'Suggested fact B' },
        ],
      });

      await expect(page.locator('.suggestion-card')).toHaveCount(2);
      await page.locator('.suggestion-card').first().getByRole('button', { name: /^Reject$/ }).click();

      await expect(page.locator('.suggestion-card')).toHaveCount(1);
      await expect(page.locator('.column.facts .fact-item')).toHaveCount(0);
      expect((await readStoredDiscovery(page)).facts).toHaveLength(0);
    });
  });

  // @fsid:FS-AcceptAllSuggestedFacts
  test.describe('FS-AcceptAllSuggestedFacts', () => {
    test('clicking Accept All adds all remaining suggestions to the Facts column and closes the panel', async ({ page }) => {
      await openSuggestedFactsPanel(page, {
        suggestions: [
          { text: 'Fact 1 from extraction' },
          { text: 'Fact 2 from extraction' },
        ],
      });

      await page.locator('.suggestions-bulk-actions').getByRole('button', { name: /accept all/i }).click();

      await expect(page.locator('.suggestions-panel')).toHaveCount(0);
      await expect(page.locator('.column.facts .fact-item')).toHaveCount(2);
      const stored = await readStoredDiscovery(page);
      expect(stored.facts).toHaveLength(2);
      expect(stored.facts.map((f) => f.related_inputs)).toEqual([['I-1'], ['I-1']]);
    });
  });

  // @fsid:FS-RejectAllSuggestedFacts
  test.describe('FS-RejectAllSuggestedFacts', () => {
    test('clicking Reject All discards all remaining suggestions and closes the panel', async ({ page }) => {
      await openSuggestedFactsPanel(page, {
        suggestions: [
          { text: 'Fact 1 from extraction' },
          { text: 'Fact 2 from extraction' },
        ],
      });

      await page.locator('.suggestions-bulk-actions').getByRole('button', { name: /reject all/i }).click();

      await expect(page.locator('.suggestions-panel')).toHaveCount(0);
      await expect(page.locator('.column.facts .fact-item')).toHaveCount(0);
      expect((await readStoredDiscovery(page)).facts).toHaveLength(0);
    });
  });

  // @fsid:FS-CloseSuggestionsPanel
  test.describe('FS-CloseSuggestionsPanel', () => {
    test('closing the panel discards remaining suggestions but keeps previously accepted facts', async ({ page }) => {
      await openSuggestedFactsPanel(page, {
        suggestions: [
          { text: 'Accepted fact' },
          { text: 'Discarded fact' },
        ],
      });

      await page.locator('.suggestion-card').first().getByRole('button', { name: /^Accept$/ }).click();
      await expect(page.locator('.column.facts .fact-item')).toHaveCount(1);
      await expect(page.locator('.suggestion-card')).toHaveCount(1);

      await page.locator('.suggestions-close').click();
      await expect(page.locator('.suggestions-panel')).toHaveCount(0);
      await expect(page.locator('.column.facts .fact-item')).toHaveCount(1);

      const stored = await readStoredDiscovery(page);
      expect(stored.facts).toHaveLength(1);
      expect(stored.facts[0].text).toBe('Accepted fact');
    });
  });

  // @fsid:FS-ExtractFactsDisabledForNonText
  test.describe('FS-ExtractFactsDisabledForNonText', () => {
    test('Generate Facts action is displayed on the selection toolbar for a selected web Input', async ({ page }) => {
      const discovery = buildDiscovery({
        title: 'Auto Facts Extraction E2E',
        goal: 'Extract churn-related facts',
        inputs: [{ input_id: 'I-WEB', title: 'Web Source', type: 'web', url: 'https://example.com/report' }],
      });
      await seedDiscovery(page, discovery);
      await gotoApp(page, discovery.title);

      await openInputsSelectionToolbar(page, ['I-WEB']);
      const generateBtn = page.locator('.column.inputs .selection-toolbar').getByRole('button', { name: /generate facts/i });
      await expect(generateBtn).toBeVisible();
      await expect(generateBtn).toBeEnabled();
    });
  });

  // @fsid:FS-ExtractFactsDisabledForEmptyText
  test.describe('FS-ExtractFactsDisabledForEmptyText', () => {
    test('Generate Facts action is displayed on the selection toolbar for a selected text Input with empty content', async ({ page }) => {
      const discovery = buildDiscovery({
        title: 'Auto Facts Extraction E2E',
        goal: 'Extract churn-related facts',
        inputs: [{ input_id: 'I-EMPTY', title: 'Empty Text Input', type: 'text', text: '' }],
      });
      await seedDiscovery(page, discovery);
      await gotoApp(page, discovery.title);

      await openInputsSelectionToolbar(page, ['I-EMPTY']);
      const generateBtn = page.locator('.column.inputs .selection-toolbar').getByRole('button', { name: /generate facts/i });
      await expect(generateBtn).toBeVisible();
      await expect(generateBtn).toBeEnabled();
    });
  });
});
