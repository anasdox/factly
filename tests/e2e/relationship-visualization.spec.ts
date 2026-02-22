import { expect, test } from '@playwright/test';
import { buildDiscovery, gotoApp, seedDiscovery, stubBackendStatus } from './helpers/factly';

function buildRelationshipDiscovery() {
  return buildDiscovery({
    title: 'Relationship Visualization E2E',
    inputs: [
      { input_id: 'I-1', title: 'Input 1', type: 'text', text: 'Input text' },
    ],
    facts: [
      { fact_id: 'F-1', text: 'Fact 1', related_inputs: ['I-1'] },
    ],
    insights: [
      { insight_id: 'N-1', text: 'Insight 1', related_facts: ['F-1'] },
    ],
    recommendations: [
      { recommendation_id: 'R-1', text: 'Recommendation 1', related_insights: ['N-1'] },
    ],
    outputs: [
      { output_id: 'O-1', text: 'Output 1', related_recommendations: ['R-1'], type: 'report' },
    ],
  });
}

test.describe('Relationship Visualization (E2E)', () => {
  test.beforeEach(async ({ page }) => {
    await stubBackendStatus(page);
  });

  // @fsid:FS-DrawRelationshipLines
  test.describe('FS-DrawRelationshipLines', () => {
    test('visual lines are drawn between each entity and its related entities in adjacent columns', async ({ page }) => {
      const discovery = buildRelationshipDiscovery();
      await seedDiscovery(page, discovery);
      await gotoApp(page, discovery.title);

      await expect(page.locator('.line')).toHaveCount(4);
      await expect(page.locator('#link-input-I-1-to-fact-F-1')).toBeVisible();
      await expect(page.locator('#link-fact-F-1-to-insight-N-1')).toBeVisible();
      await expect(page.locator('#link-insight-N-1-to-recommendation-R-1')).toBeVisible();
      await expect(page.locator('#link-recommendation-R-1-to-output-O-1')).toBeVisible();
    });
  });

  // @fsid:FS-RedrawLinesOnResize
  test.describe('FS-RedrawLinesOnResize', () => {
    test('relationship lines are recalculated and redrawn when the browser window is resized', async ({ page }) => {
      const discovery = buildRelationshipDiscovery();
      await seedDiscovery(page, discovery);
      await gotoApp(page, discovery.title);

      const firstLine = page.locator('#link-input-I-1-to-fact-F-1');
      await expect(firstLine).toBeVisible();
      const originalHandle = await firstLine.elementHandle();
      expect(originalHandle).not.toBeNull();

      await page.setViewportSize({ width: 1200, height: 900 });

      await expect(page.locator('.line')).toHaveCount(4);
      await expect(page.locator('#link-input-I-1-to-fact-F-1')).toBeVisible();
      const stillConnected = await (originalHandle as any).evaluate((el: Element) => el.isConnected);
      expect(stillConnected).toBe(false);
    });
  });

  // @fsid:FS-HighlightForwardOnHover
  test.describe('FS-HighlightForwardOnHover', () => {
    test('hovering an entity highlights it and downstream dependents with connecting lines from the hovered entity', async ({ page }) => {
      const discovery = buildRelationshipDiscovery();
      await seedDiscovery(page, discovery);
      await gotoApp(page, discovery.title);

      await page.locator('#fact-F-1').hover();

      await expect(page.locator('#fact-F-1')).toHaveClass(/highlighted/);
      await expect(page.locator('#insight-N-1')).toHaveClass(/highlighted/);
      await expect(page.locator('#recommendation-R-1')).toHaveClass(/highlighted/);
      await expect(page.locator('#output-O-1')).toHaveClass(/highlighted/);
      await expect(page.locator('#link-fact-F-1-to-insight-N-1')).toHaveClass(/link-highlighted/);
    });
  });

  // @fsid:FS-HighlightBackwardOnHover
  test.describe('FS-HighlightBackwardOnHover', () => {
    test('hovering an entity highlights upstream source entities', async ({ page }) => {
      const discovery = buildRelationshipDiscovery();
      await seedDiscovery(page, discovery);
      await gotoApp(page, discovery.title);

      await page.locator('#recommendation-R-1').hover();

      await expect(page.locator('#insight-N-1')).toHaveClass(/highlighted/);
      await expect(page.locator('#fact-F-1')).toHaveClass(/highlighted/);
      await expect(page.locator('#input-I-1')).toHaveClass(/highlighted/);
    });
  });

  // @fsid:FS-RemoveHighlightOnLeave
  test.describe('FS-RemoveHighlightOnLeave', () => {
    test('moving the mouse away removes highlight from the entity, related entities, and lines', async ({ page }) => {
      const discovery = buildRelationshipDiscovery();
      await seedDiscovery(page, discovery);
      await gotoApp(page, discovery.title);

      const fact = page.locator('#fact-F-1');
      const line = page.locator('#link-fact-F-1-to-insight-N-1');

      await fact.hover();
      await expect(fact).toHaveClass(/highlighted/);
      await expect(line).toHaveClass(/link-highlighted/);

      await page.locator('.discovery-header').hover();

      await expect(page.locator('#fact-F-1')).not.toHaveClass(/highlighted/);
      await expect(page.locator('#insight-N-1')).not.toHaveClass(/highlighted/);
      await expect(page.locator('#recommendation-R-1')).not.toHaveClass(/highlighted/);
      await expect(page.locator('#output-O-1')).not.toHaveClass(/highlighted/);
      await expect(line).not.toHaveClass(/link-highlighted/);
    });
  });

  // @fsid:FS-ShowItemToolbarOnHover
  test.describe('FS-ShowItemToolbarOnHover', () => {
    test('hovering an entity shows an edit toolbar; leaving hides it', async ({ page }) => {
      const discovery = buildRelationshipDiscovery();
      await seedDiscovery(page, discovery);
      await gotoApp(page, discovery.title);

      const wrapper = page.locator('#fact-F-1');
      const toolbar = page.locator('#fact-F-1-toolbar');

      await expect(toolbar).toHaveCSS('display', 'none');
      await wrapper.hover();
      await expect(toolbar).toHaveCSS('display', 'flex');
      await page.locator('.discovery-header').hover();
      await expect(toolbar).toHaveCSS('display', 'none');
    });
  });
});
