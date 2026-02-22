import { expect, Page, test } from '@playwright/test';
import { buildDiscovery, gotoApp, seedDiscovery } from './helpers/factly';

async function stubBackendStatusValue(page: Page, ok = true): Promise<void> {
  await page.route('**/status', async (route) => {
    await route.fulfill({
      status: ok ? 200 : 503,
      contentType: 'application/json',
      body: ok ? '{}' : JSON.stringify({ error: 'Backend unavailable' }),
    });
  });
}

async function stubCreateRoomError(page: Page, errorMessage: string): Promise<void> {
  await page.route('**/rooms', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({ error: errorMessage }),
    });
  });
}

test.describe('Input Validation and Error Handling (E2E)', () => {
  // @fsid:FS-DisplayErrorToastOnBackendError
  test.describe('FS-DisplayErrorToastOnBackendError', () => {
    test('frontend displays a temporary toast with the backend error when room creation fails', async ({ page }) => {
      const backendError = 'Room creation rejected: invalid discovery payload';
      await stubBackendStatusValue(page, true);
      await stubCreateRoomError(page, backendError);

      const discovery = buildDiscovery({
        title: 'Backend Error Toast E2E',
        goal: 'Verify room creation error handling',
        inputs: [{ input_id: 'I-1', title: 'Source', type: 'text', text: 'Any content' }],
      });

      await seedDiscovery(page, discovery);
      await gotoApp(page, discovery.title);

      await page.locator('[title="Start Event Room"]').click();

      const toast = page.locator('.toast');
      await expect(toast).toContainText(backendError);
      await page.waitForTimeout(5200);
      await expect(page.locator('.toast-overlay')).toHaveCount(0);
    });
  });
});
