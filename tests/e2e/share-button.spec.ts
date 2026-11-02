import { expect, Page, test } from '@playwright/test';
import { buildDiscovery, seedDiscovery, stubBackendStatus } from './helpers/factly';

/**
 * E2E acceptance tests for Share Button.
 * @see specs/functional/share-button.feature
 * @see specs/technical/share-button.md
 *
 * The backend is stubbed: a saved discovery is served from `/documents/<id>`
 * and saving answers with a fresh id. EventSource is replaced so the room
 * connection stays silent.
 */

const DOC_ID = '3f6c2a9e-0b1d-4c8e-9f2a-7d5e1b3c4a6f';
const NEW_DOC_ID = '9a1b2c3d-4e5f-4a6b-8c7d-0e1f2a3b4c5d';
const BACKEND = 'http://localhost:3002';
const SAVED = buildDiscovery({ title: 'Shared Discovery E2E', goal: 'Share it' });

async function silenceEventSource(page: Page): Promise<void> {
  await page.addInitScript(() => {
    class FakeEventSource {
      static CONNECTING = 0;
      static OPEN = 1;
      static CLOSED = 2;
      readyState = 1;
      onmessage: ((event: MessageEvent) => void) | null = null;
      onerror: ((event: Event) => void) | null = null;
      constructor(_url: string) {}
      close() {
        this.readyState = 2;
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).EventSource = FakeEventSource;
  });
}

async function stubSavedDocument(page: Page): Promise<void> {
  await page.route(`${BACKEND}/documents/${DOC_ID}`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(SAVED) }),
  );
  await page.route(`${BACKEND}/documents/${DOC_ID}/update`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }),
  );
}

async function openSavedDiscovery(page: Page): Promise<void> {
  await silenceEventSource(page);
  await stubBackendStatus(page);
  await stubSavedDocument(page);
  await page.goto(`/documents/${DOC_ID}`);
  await expect(page.getByRole('heading', { name: /shared discovery e2e/i })).toBeVisible();
}

async function signIn(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.setItem('auth_token', 'e2e-token');
    window.localStorage.setItem('auth_user', 'ana');
  });
  await page.route(`${BACKEND}/me/**`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ discoveries: [] }) }),
  );
}

const shareButton = (page: Page) => page.locator('.toolbar [title="Share"]');
const shareDialog = (page: Page) => page.locator('.modal-panel').filter({ hasText: 'Share Discovery' });

test.describe('Share Button (E2E)', () => {
  // @fsid:FS-ShareButtonShownForSavedDiscovery
  test.describe('FS-ShareButtonShownForSavedDiscovery', () => {
    test('an anonymous Analyst sees the Share button on a saved discovery', async ({ page }) => {
      await openSavedDiscovery(page);

      await expect(shareButton(page)).toBeVisible();
    });

    test('a signed-in Analyst sees the Share button on a saved discovery', async ({ page }) => {
      await signIn(page);
      await openSavedDiscovery(page);

      await expect(shareButton(page)).toBeVisible();
    });
  });

  // @fsid:FS-ShareButtonHiddenForUnsavedDiscovery
  test.describe('FS-ShareButtonHiddenForUnsavedDiscovery', () => {
    test('no Share button on a discovery that was never saved', async ({ page }) => {
      await stubBackendStatus(page);
      await seedDiscovery(page, buildDiscovery({ title: 'Local Only E2E' }));
      await page.goto('/');
      await expect(page.getByRole('heading', { name: /local only e2e/i })).toBeVisible();

      await expect(shareButton(page)).toHaveCount(0);
    });
  });

  // @fsid:FS-ShareDialogShowsDiscoveryLink
  test.describe('FS-ShareDialogShowsDiscoveryLink', () => {
    test('the Share dialog shows the link that opens this discovery', async ({ page }) => {
      await openSavedDiscovery(page);

      await shareButton(page).click();

      await expect(shareDialog(page)).toBeVisible();
      const origin = new URL(page.url()).origin;
      await expect(shareDialog(page).getByLabel('Discovery link')).toHaveValue(`${origin}/documents/${DOC_ID}`);
    });
  });

  // @fsid:FS-ShareDialogCopiesLink
  test.describe('FS-ShareDialogCopiesLink', () => {
    test('the copy control puts the link in the clipboard and confirms it', async ({ page, context }) => {
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);
      await openSavedDiscovery(page);
      await shareButton(page).click();

      await shareDialog(page).locator('[title="Copy link"]').click();

      const origin = new URL(page.url()).origin;
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(`${origin}/documents/${DOC_ID}`);
      await expect(shareDialog(page).locator('[title="Copied!"]')).toBeVisible();
    });
  });

  // @fsid:FS-ShareButtonAppearsAfterFirstSave
  test.describe('FS-ShareButtonAppearsAfterFirstSave', () => {
    test('saving a new discovery makes the Share button appear with the new link', async ({ page }) => {
      await silenceEventSource(page);
      await signIn(page);
      await stubBackendStatus(page);
      await seedDiscovery(page, buildDiscovery({ title: 'To Be Saved E2E' }));
      await page.route(`${BACKEND}/documents`, (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ documentId: NEW_DOC_ID }) }),
      );
      await page.route(`${BACKEND}/documents/${NEW_DOC_ID}**`, (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(buildDiscovery({ title: 'To Be Saved E2E' })) }),
      );
      await page.goto('/');
      await expect(page.getByRole('heading', { name: /to be saved e2e/i })).toBeVisible();
      await expect(shareButton(page)).toHaveCount(0);

      await page.locator('.toolbar [title="Save"]').click();

      await expect(shareButton(page)).toBeVisible();
      await shareButton(page).click();
      const origin = new URL(page.url()).origin;
      await expect(shareDialog(page).getByLabel('Discovery link')).toHaveValue(`${origin}/documents/${NEW_DOC_ID}`);
    });
  });
});
