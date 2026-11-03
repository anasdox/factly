import { expect, Page, test } from '@playwright/test';
import { buildDiscovery, gotoApp, readStoredDiscovery, seedDiscovery, stubBackendStatus } from './helpers/factly';

/**
 * E2E acceptance tests for reformulating an AI suggestion.
 * @see specs/functional/ai-reformulation-suggestions.feature (section "Reformulating an AI Suggestion")
 * @see specs/technical/ai-reformulation-suggestions.md
 *
 * The backend is stubbed: extraction answers with canned suggestions, and
 * `/reformulate` records what it was sent and answers with canned alternatives.
 */

const GOAL = 'Understand customer churn';
const ALTERNATIVES = [
  { text: 'Q4 churn reached 15%.', justification: 'Shorter and quantified' },
  { text: 'In Q4, 15% of customers churned.', justification: 'States who churned' },
];

type ReformulateStub = { requests: any[] };

async function stubReformulate(page: Page, status = 200): Promise<ReformulateStub> {
  const stub: ReformulateStub = { requests: [] };
  await page.route('**/reformulate', async (route) => {
    stub.requests.push(JSON.parse(route.request().postData() || '{}'));
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(status === 200 ? { suggestions: ALTERNATIVES } : { error: 'LLM unavailable' }),
    });
  });
  return stub;
}

async function stubExtraction(page: Page, path: string, body: object): Promise<void> {
  await page.route(`**${path}`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) }),
  );
}

const suggestionCards = (page: Page) => page.locator('.suggestion-card');

async function openSuggestedFacts(page: Page): Promise<void> {
  await stubBackendStatus(page);
  await stubExtraction(page, '/extract/facts', {
    suggestions: [{ text: 'Customer churn increased to 15% in Q4.', source_excerpt: 'churn increased to 15% in Q4' }],
  });
  const discovery = buildDiscovery({
    title: 'Reformulate Suggestions E2E',
    goal: GOAL,
    inputs: [{ input_id: 'I-1', title: 'Transcript', type: 'text', text: 'Customer churn increased to 15% in Q4.' }],
    facts: [],
    insights: [],
  });
  await seedDiscovery(page, discovery);
  await gotoApp(page, discovery.title);
  await page.locator('#input-I-1').click();
  await expect(page.locator('.column.inputs .toolbar-wrapper')).toHaveClass(/toolbar-wrapper-open/);
  await page.locator('.column.inputs .selection-toolbar').getByRole('button', { name: /generate facts/i }).click();
  await expect(page.getByRole('heading', { name: /suggested facts/i })).toBeVisible();
}

async function openSuggestedInsights(page: Page): Promise<void> {
  await stubBackendStatus(page);
  await stubExtraction(page, '/extract/insights', {
    suggestions: [{ text: 'Slow support drives churn.', related_fact_ids: ['F-1', 'F-2'] }],
    fact_ids: ['F-1', 'F-2'],
  });
  const discovery = buildDiscovery({
    title: 'Reformulate Insight Suggestions E2E',
    goal: GOAL,
    facts: [
      { fact_id: 'F-1', text: 'Support response time reached 52h in Q4.', related_inputs: [] },
      { fact_id: 'F-2', text: '31% of churned users cited slow support.', related_inputs: [] },
    ],
    insights: [],
    recommendations: [],
  });
  await seedDiscovery(page, discovery);
  await gotoApp(page, discovery.title);
  await page.locator('#fact-F-1').click();
  await page.locator('#fact-F-2').click();
  await expect(page.locator('.column.facts .toolbar-wrapper')).toHaveClass(/toolbar-wrapper-open/);
  await page.locator('.column.facts .selection-toolbar').getByRole('button', { name: /generate insights/i }).click();
  await expect(page.getByRole('heading', { name: /suggested insights/i })).toBeVisible();
}

test.describe('Reformulating an AI suggestion (E2E)', () => {
  // @fsid:FS-ReformulateButtonOnSuggestedItem
  test.describe('FS-ReformulateButtonOnSuggestedItem', () => {
    test('a suggested fact offers Reformulate next to Accept, Edit and Reject', async ({ page }) => {
      await openSuggestedFacts(page);

      const card = suggestionCards(page).first();
      for (const name of ['Accept', 'Edit', 'Reformulate', 'Reject']) {
        await expect(card.getByRole('button', { name: new RegExp(`^${name}$`) })).toBeVisible();
      }
    });

    test('a suggested insight offers Reformulate too', async ({ page }) => {
      await openSuggestedInsights(page);

      await expect(suggestionCards(page).first().getByRole('button', { name: /^Reformulate$/ })).toBeVisible();
    });
  });

  // @fsid:FS-ReformulateSuggestedItemShowsAlternatives
  test.describe('FS-ReformulateSuggestedItemShowsAlternatives', () => {
    test('Reformulate opens the suggestion for editing and lists alternatives with justifications', async ({ page }) => {
      await stubReformulate(page);
      await openSuggestedFacts(page);

      await suggestionCards(page).first().getByRole('button', { name: /^Reformulate$/ }).click();

      await expect(page.locator('.suggestion-edit textarea')).toHaveValue('Customer churn increased to 15% in Q4.');
      const alternatives = page.locator('.suggestion-edit .reformulation-suggestion-card');
      await expect(alternatives).toHaveCount(2);
      await expect(alternatives.first()).toContainText('Q4 churn reached 15%.');
      await expect(alternatives.first()).toContainText('Shorter and quantified');
    });
  });

  // @fsid:FS-SelectAlternativeThenConfirmSuggestion
  test.describe('FS-SelectAlternativeThenConfirmSuggestion', () => {
    test('choosing an alternative, editing it and confirming adds the reformulated fact', async ({ page }) => {
      await stubReformulate(page);
      await openSuggestedFacts(page);
      await suggestionCards(page).first().getByRole('button', { name: /^Reformulate$/ }).click();

      await page.locator('.suggestion-edit .reformulation-suggestion-card').first().click();

      const textarea = page.locator('.suggestion-edit textarea');
      await expect(textarea).toHaveValue('Q4 churn reached 15%.');
      await expect(page.locator('.suggestion-edit .reformulation-suggestion-card')).toHaveCount(0);
      await textarea.fill('Q4 churn reached 15% of customers.');
      await page.locator('.suggestion-edit-actions').getByRole('button', { name: /^Confirm$/ }).click();

      await expect(page.locator('.column.facts')).toContainText('Q4 churn reached 15% of customers.');
      await expect(page.getByRole('heading', { name: /suggested facts/i })).toHaveCount(0);
      await expect.poll(async () => (await readStoredDiscovery(page)).facts.map((f) => f.text))
        .toEqual(['Q4 churn reached 15% of customers.']);
    });
  });

  // @fsid:FS-ReformulateSuggestionUsesItsContext
  test.describe('FS-ReformulateSuggestionUsesItsContext', () => {
    test('a suggested insight is reformulated with the goal and the text of its facts', async ({ page }) => {
      const stub = await stubReformulate(page);
      await openSuggestedInsights(page);

      await suggestionCards(page).first().getByRole('button', { name: /^Reformulate$/ }).click();

      await expect.poll(() => stub.requests.length).toBe(1);
      expect(stub.requests[0]).toEqual({
        text: 'Slow support drives churn.',
        entity_type: 'insight',
        goal: GOAL,
        related_items: [
          { text: 'Support response time reached 52h in Q4.', type: 'fact' },
          { text: '31% of churned users cited slow support.', type: 'fact' },
        ],
      });
    });

    test('a suggested fact is reformulated with its source excerpt', async ({ page }) => {
      const stub = await stubReformulate(page);
      await openSuggestedFacts(page);

      await suggestionCards(page).first().getByRole('button', { name: /^Reformulate$/ }).click();

      await expect.poll(() => stub.requests.length).toBe(1);
      expect(stub.requests[0]).toMatchObject({
        entity_type: 'fact',
        goal: GOAL,
        related_items: [{ text: 'churn increased to 15% in Q4', type: 'input' }],
      });
    });
  });

  // @fsid:FS-ReformulateSuggestionErrorKeepsText
  test.describe('FS-ReformulateSuggestionErrorKeepsText', () => {
    test('a failed reformulation shows a message and keeps the suggestion text', async ({ page }) => {
      await stubReformulate(page, 503);
      await openSuggestedFacts(page);

      await suggestionCards(page).first().getByRole('button', { name: /^Reformulate$/ }).click();

      await expect(page.locator('.suggestion-edit')).toContainText('Reformulation failed. Try again.');
      await expect(page.locator('.suggestion-edit textarea')).toHaveValue('Customer churn increased to 15% in Q4.');
    });
  });
});
