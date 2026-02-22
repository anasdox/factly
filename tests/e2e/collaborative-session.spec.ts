import { expect, Page, test } from '@playwright/test';

async function stubBackendStatusValue(page: Page, ok = true): Promise<void> {
  await page.route('**/status', async (route) => {
    await route.fulfill({
      status: ok ? 200 : 503,
      contentType: 'application/json',
      body: ok ? '{}' : JSON.stringify({ error: 'Backend unavailable' }),
    });
  });
}

test.describe('Collaborative Session (E2E)', () => {
  // @fsid:FS-JoinRoomViaInviteFirstUse
  test.describe('FS-JoinRoomViaInviteFirstUse', () => {
    test('first-time user opening a room link lands in the room directly without seeing the welcome home screen', async ({ page }) => {
      await page.addInitScript(() => {
        window.localStorage.clear();

        class FakeEventSource {
          static CONNECTING = 0;
          static OPEN = 1;
          static CLOSED = 2;
          readyState = FakeEventSource.OPEN;
          onmessage: ((event: MessageEvent) => void) | null = null;
          onerror: ((event: Event) => void) | null = null;
          constructor(_url: string) {}
          close() {
            this.readyState = FakeEventSource.CLOSED;
          }
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).EventSource = FakeEventSource;
      });

      await stubBackendStatusValue(page, true);

      const roomDiscovery = {
        discovery_id: 'd-room-1',
        title: 'Joined Room E2E',
        goal: 'Collaborative room bootstrap',
        date: '2026-02-22',
        inputs: [],
        facts: [],
        insights: [],
        recommendations: [],
        outputs: [],
        chat_history: [],
      };

      let roomFetchCount = 0;
      await page.route('**/rooms/room-123', async (route) => {
        roomFetchCount += 1;
        await new Promise((resolve) => setTimeout(resolve, 250));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(roomDiscovery),
        });
      });

      const nav = page.goto('/?room=room-123');

      await expect(page.getByText(/joining room/i)).toBeVisible();
      await expect(page.locator('.welcome-new-discovery')).toHaveCount(0);
      await nav;

      await expect(page.getByRole('heading', { name: /joined room e2e/i })).toBeVisible();
      await expect(page.locator('.discovery-grid')).toBeVisible();
      expect(roomFetchCount).toBeGreaterThanOrEqual(1);
      await expect(page.getByText(/joining room/i)).toHaveCount(0);
    });
  });
});
