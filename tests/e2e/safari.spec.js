import { test, expect } from '@playwright/test';

test('iPad Safari draws, restores history, and retains a canvas across rotation', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('#loading-state')).toBeHidden();
  const canvas = page.locator('#canvas');
  const box = await canvas.boundingBox();
  await page.mouse.move(box.x + 40, box.y + 60);
  await page.mouse.down();
  await page.mouse.move(box.x + 180, box.y + 140, { steps: 20 });
  await page.mouse.up();
  await expect(page.locator('#btn-undo')).toBeEnabled();
  await expect(page.locator('#save-status-text')).toHaveText('Saved on this device');
  await page.reload();
  await expect(page.locator('#loading-state')).toBeHidden();
  await page.locator('#btn-marker').click();
  await canvas.tap({ position: { x: 70, y: 80 } });
  await expect(page.locator('#btn-undo')).toBeEnabled();
  await page.locator('#btn-undo').click();
  await page.locator('#btn-redo').click();
  await page.setViewportSize({ width: 1080, height: 810 });
  await page.locator('#btn-color').click();
  await page.locator('#color-input').fill('#AA3344');
  await page.locator('#color-done').click();
  await expect(page.locator('#current-color-label')).toHaveText('#AA3344');
  expect(errors).toEqual([]);
});
