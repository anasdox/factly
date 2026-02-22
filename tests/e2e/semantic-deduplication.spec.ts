import { expect, Page, test } from '@playwright/test';
import { buildDiscovery, gotoApp, readStoredDiscovery, seedDiscovery } from './helpers/factly';

async function stubBackendStatusValue(page: Page, ok = true): Promise<void> {
  await page.route('**/status', async (route) => {
    await route.fulfill({
      status: ok ? 200 : 503,
      contentType: 'application/json',
      body: ok ? '{}' : JSON.stringify({ error: 'Backend unavailable' }),
    });
  });
}

async function stubDedupCheck(
  page: Page,
  handler: (body: any) => { status?: number; body: any },
): Promise<void> {
  await page.route('**/dedup/check', async (route) => {
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

function baseFactDedupDiscovery(title: string) {
  return buildDiscovery({
    title,
    goal: 'Prevent duplicate facts during analyst review',
    inputs: [
      { input_id: 'I-1', title: 'Input A', type: 'text', text: 'Revenue data source' },
      { input_id: 'I-2', title: 'Input B', type: 'text', text: 'Alt revenue data source' },
    ],
    facts: [
      {
        fact_id: 'F-1',
        text: 'Revenue grew by 15% in Q3',
        related_inputs: ['I-1'],
        version: 1,
        status: 'draft',
      } as any,
    ],
    insights: [],
    recommendations: [],
    outputs: [],
  });
}

async function seedAndOpen(page: Page, discovery: any): Promise<void> {
  await seedDiscovery(page, discovery);
  await gotoApp(page, discovery.title);
}

async function openAddFactModal(page: Page): Promise<void> {
  await page.locator('.column.facts .header-add-button').click();
  await expect(page.getByRole('heading', { name: 'Add Fact' })).toBeVisible();
}

async function addFactViaModal(page: Page, text: string, relatedInputs: string[]): Promise<void> {
  await openAddFactModal(page);
  await page.locator('#fact-text').fill(text);
  await page.locator('#fact-related-inputs').selectOption(relatedInputs);
  await page.getByRole('button', { name: /^Add$/ }).click();
}

function mergeDialog(page: Page) {
  return page.locator('.merge-dialog');
}

async function openSuggestedFactsDedupReview(page: Page, options?: { dedupBodyAssert?: (body: any) => void }): Promise<void> {
  await stubFactsExtraction(page, (body) => {
    expect(body.goal).toMatch(/prevent duplicate facts/i);
    return {
      body: {
        suggestions: [
          { text: 'Revenue grew by 15% in Q3', source_excerpt: 'Revenue up 15% in Q3' },
        ],
      },
    };
  });

  await stubDedupCheck(page, (body) => {
    options?.dedupBodyAssert?.(body);
    return {
      body: {
        duplicates: [
          {
            id: 'F-1',
            similarity: 0.96,
            explanation: 'Same fact phrased similarly',
          },
        ],
      },
    };
  });

  const discovery = baseFactDedupDiscovery('Semantic Dedup Suggestion E2E');
  await seedAndOpen(page, discovery);

  await page.locator('#input-I-1').click();
  await expect(page.locator('.column.inputs .toolbar-wrapper')).toHaveClass(/toolbar-wrapper-open/);
  await page.locator('.column.inputs .selection-toolbar').getByRole('button', { name: /generate facts/i }).click();
  await expect(page.locator('.suggestions-panel')).toBeVisible();

  await page.locator('.suggestion-card').first().getByRole('button', { name: /^Accept$/ }).click();
  await expect(page.locator('.batch-dedup-panel')).toBeVisible();
}

test.describe('Semantic Deduplication (E2E)', () => {
  test.beforeEach(async ({ page }) => {
    await stubBackendStatusValue(page, true);
  });

  // @fsid:FS-DedupCheckOnManualAdd
  test.describe('FS-DedupCheckOnManualAdd', () => {
    test('manually adding a Fact with similar text to an existing Fact opens the merge dialog', async ({ page }) => {
      let dedupRequest: any = null;
      await stubDedupCheck(page, (body) => {
        dedupRequest = body;
        return {
          body: {
            duplicates: [{ id: 'F-1', similarity: 0.91, explanation: 'Revenue growth statement matches existing fact' }],
          },
        };
      });

      const discovery = baseFactDedupDiscovery('Semantic Dedup Manual Add E2E');
      await seedAndOpen(page, discovery);

      await addFactViaModal(page, 'Q3 revenue increased by 15 percent', ['I-2']);

      await expect(mergeDialog(page)).toBeVisible();
      await expect(page.getByRole('heading', { name: /similar item detected/i })).toBeVisible();
      expect(dedupRequest.text).toBe('Q3 revenue increased by 15 percent');
      expect(dedupRequest.candidates).toHaveLength(1);
      expect(dedupRequest.candidates[0].id).toBe('F-1');
    });
  });

  // @fsid:FS-DedupCheckOnSuggestionAccept
  test.describe('FS-DedupCheckOnSuggestionAccept', () => {
    test('accepting a generated suggestion that duplicates an existing Fact opens the duplicate review panel before add', async ({ page }) => {
      await openSuggestedFactsDedupReview(page, {
        dedupBodyAssert: (body) => {
          expect(body.text).toBe('Revenue grew by 15% in Q3');
        },
      });

      await expect(page.locator('.batch-dedup-panel h3')).toContainText(/duplicate review/i);
      await expect(page.locator('.column.facts .fact-item')).toHaveCount(1);
      await expect(page.locator('.batch-dedup-entry')).toHaveCount(1);
    });
  });

  // @fsid:FS-NoDuplicateDetected
  test.describe('FS-NoDuplicateDetected', () => {
    test('adding a unique Fact does not show the merge dialog', async ({ page }) => {
      await stubDedupCheck(page, () => ({ body: { duplicates: [] } }));
      const discovery = baseFactDedupDiscovery('Semantic Dedup No Match E2E');
      await seedAndOpen(page, discovery);

      await addFactViaModal(page, 'Customer satisfaction improved after support retraining.', ['I-2']);

      await expect(mergeDialog(page)).toHaveCount(0);
      await expect(page.locator('.column.facts .fact-item')).toHaveCount(2);
      const stored = await readStoredDiscovery(page);
      expect(stored.facts).toHaveLength(2);
    });
  });

  // @fsid:FS-MergeDialogOptions
  test.describe('FS-MergeDialogOptions', () => {
    test('merge dialog shows new text, existing text, similarity, and three action buttons', async ({ page }) => {
      await stubDedupCheck(page, () => ({
        body: {
          duplicates: [{ id: 'F-1', similarity: 0.88, explanation: 'Paraphrase of the same revenue growth statement' }],
        },
      }));
      const discovery = baseFactDedupDiscovery('Semantic Dedup Merge Dialog Options E2E');
      await seedAndOpen(page, discovery);

      await addFactViaModal(page, 'Q3 revenue increased by 15 percent', ['I-2']);

      const dialog = mergeDialog(page);
      await expect(dialog).toBeVisible();
      await expect(dialog).toContainText('Q3 revenue increased by 15 percent');
      await expect(dialog).toContainText('Revenue grew by 15% in Q3');
      await expect(dialog).toContainText(/Similarity:\s*88%/i);
      await expect(dialog).toContainText(/Paraphrase of the same revenue growth statement/i);
      await expect(dialog.getByRole('button', { name: /merge into existing/i })).toBeVisible();
      await expect(dialog.getByRole('button', { name: /keep as variant/i })).toBeVisible();
      await expect(dialog.getByRole('button', { name: /force add/i })).toBeVisible();
    });
  });

  // @fsid:FS-MergeIntoExisting
  test.describe('FS-MergeIntoExisting', () => {
    test('selecting Merge discards the new item and keeps the existing one', async ({ page }) => {
      await stubDedupCheck(page, () => ({
        body: {
          duplicates: [{ id: 'F-1', similarity: 0.9, explanation: 'Duplicate fact' }],
        },
      }));
      const discovery = baseFactDedupDiscovery('Semantic Dedup Merge Existing E2E');
      await seedAndOpen(page, discovery);

      await addFactViaModal(page, 'Q3 revenue increased by 15 percent', ['I-2']);
      await mergeDialog(page).getByRole('button', { name: /merge into existing/i }).click();

      await expect(mergeDialog(page)).toHaveCount(0);
      await expect(page.locator('.column.facts .fact-item')).toHaveCount(1);
      const stored = await readStoredDiscovery(page);
      expect(stored.facts).toHaveLength(1);
      expect(stored.facts[0].text).toBe('Revenue grew by 15% in Q3');
      expect(stored.facts[0].related_inputs.slice().sort()).toEqual(['I-1', 'I-2']);
    });
  });

  // @fsid:FS-KeepAsVariant
  test.describe('FS-KeepAsVariant', () => {
    test('selecting Keep as variant adds the new item alongside the existing one', async ({ page }) => {
      await stubDedupCheck(page, () => ({
        body: {
          duplicates: [{ id: 'F-1', similarity: 0.9, explanation: 'Duplicate fact' }],
        },
      }));
      const discovery = baseFactDedupDiscovery('Semantic Dedup Keep Variant E2E');
      await seedAndOpen(page, discovery);

      await addFactViaModal(page, 'Q3 revenue increased by 15 percent', ['I-2']);
      await mergeDialog(page).getByRole('button', { name: /keep as variant/i }).click();

      await expect(mergeDialog(page)).toHaveCount(0);
      await expect(page.locator('.column.facts .fact-item')).toHaveCount(2);
      const stored = await readStoredDiscovery(page);
      expect(stored.facts).toHaveLength(2);
      expect(stored.facts.some((f) => f.text === 'Q3 revenue increased by 15 percent')).toBe(true);
    });
  });

  // @fsid:FS-ForceAdd
  test.describe('FS-ForceAdd', () => {
    test('selecting Force add adds the new item regardless of similarity', async ({ page }) => {
      await stubDedupCheck(page, () => ({
        body: {
          duplicates: [{ id: 'F-1', similarity: 0.99, explanation: 'Near identical' }],
        },
      }));
      const discovery = baseFactDedupDiscovery('Semantic Dedup Force Add E2E');
      await seedAndOpen(page, discovery);

      await addFactViaModal(page, 'Revenue grew by 15% in Q3', ['I-2']);
      await mergeDialog(page).getByRole('button', { name: /force add/i }).click();

      await expect(mergeDialog(page)).toHaveCount(0);
      await expect(page.locator('.column.facts .fact-item')).toHaveCount(2);
      const stored = await readStoredDiscovery(page);
      expect(stored.facts).toHaveLength(2);
      expect(stored.facts.filter((f) => f.text === 'Revenue grew by 15% in Q3')).toHaveLength(2);
    });
  });

  // @fsid:FS-DedupErrorFallsBackToLocal
  test.describe('FS-DedupErrorFallsBackToLocal', () => {
    test('backend error during dedup falls back to local trigram check without blocking duplicate review', async ({ page }) => {
      let calls = 0;
      await stubDedupCheck(page, () => {
        calls += 1;
        return { status: 500, body: { error: 'LLM unavailable' } };
      });
      const discovery = baseFactDedupDiscovery('Semantic Dedup Fallback E2E');
      await seedAndOpen(page, discovery);

      await addFactViaModal(page, 'Revenue grew by 15% in Q3', ['I-2']);

      expect(calls).toBe(1);
      await expect(mergeDialog(page)).toBeVisible();
      await expect(page.locator('.column.facts .fact-item')).toHaveCount(1);
    });
  });

  // @fsid:FS-DedupDisabledForInputs
  test.describe('FS-DedupDisabledForInputs', () => {
    test('adding a new Input does not trigger deduplication checks', async ({ page }) => {
      let dedupCalls = 0;
      await stubDedupCheck(page, () => {
        dedupCalls += 1;
        return { body: { duplicates: [] } };
      });

      const discovery = buildDiscovery({
        title: 'Semantic Dedup Inputs Exempt E2E',
        goal: 'Inputs should bypass dedup',
        inputs: [],
        facts: [],
      });
      await seedAndOpen(page, discovery);

      await page.locator('.column.inputs .header-add-button').click();
      await expect(page.getByRole('heading', { name: 'Add Input' })).toBeVisible();
      await page.locator('#input-title').fill('Raw source transcript');
      await page.locator('#input-text').fill('Long transcript content...');
      await page.getByRole('button', { name: /^Add$/ }).click();

      await expect(page.locator('.column.inputs .input-item')).toHaveCount(1);
      expect(dedupCalls).toBe(0);
    });
  });
});
