import { expect, Page, test } from '@playwright/test';
import { buildDiscovery, gotoApp, seedDiscovery, stubBackendStatus } from './helpers/factly';

function buildChatDiscovery() {
  return buildDiscovery({
    title: 'Conversational Chat E2E',
    goal: 'Validate chat interactions',
    inputs: [
      {
        input_id: 'I-1',
        title: 'Source note',
        type: 'text',
        text: 'Observed retention drop in Q4 in two regions.',
      },
    ],
    facts: [
      {
        fact_id: 'F-1',
        text: 'Retention decreased in Q4 in two regions',
        related_inputs: ['I-1'],
      },
    ],
  });
}

async function openChat(page: Page) {
  await page.locator('.chat-fab').click();
  await expect(page.locator('.chat-panel')).toBeVisible();
  await expect(page.locator('.chat-input')).toBeFocused();
}

test.describe('Conversational Chat (E2E)', () => {
  test.beforeEach(async ({ page }) => {
    await stubBackendStatus(page);
  });

  // @fsid:FS-ChatDragItemToMention
  test.describe('FS-ChatDragItemToMention', () => {
    test('dragging a pipeline item into the chat input inserts an @mention and selects it', async ({ page }) => {
      const discovery = buildChatDiscovery();
      await seedDiscovery(page, discovery);
      await gotoApp(page, discovery.title);
      await openChat(page);

      const sourceItem = page.locator('#fact-F-1');
      const chatInput = page.locator('.chat-input');

      await expect(sourceItem).toBeVisible();
      await sourceItem.dragTo(chatInput);

      await expect(chatInput).toHaveValue('@F-1 ');
      await expect(chatInput).toBeFocused();
      await expect(page.locator('.chat-ref-tag')).toHaveCount(1);
      await expect(page.locator('.chat-ref-tag').first()).toContainText('F-1');
    });
  });
});
