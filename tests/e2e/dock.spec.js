import { test, expect } from '@playwright/test';
import { verifyRefraction } from './glass-helper.js';
import { readFile } from 'node:fs/promises';

async function collapseAndDrag(page, x, y) {
  await page.locator('#btn-collapse').click();
  await expect(page.locator('#dock')).toBeHidden();
  const box = await page.locator('#dock-orb').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(x, y, { steps: 12 });
  await page.mouse.up();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#loading-state')).toBeHidden();
});

test('the glass toolbar opens around the moved button horizontally and vertically', async ({ page }) => {
  const { width, height } = page.viewportSize();
  for (const [x, y, orientation] of [[width - 60, height / 2, 'vertical'], [60, height / 2, 'vertical'], [width / 2, 70, 'horizontal'], [width / 2, height - 70, 'horizontal']]) {
    await collapseAndDrag(page, x, y);
    await page.locator('#dock-orb').click();
    await expect(page.locator('#dock')).toHaveAttribute('data-state', 'open');
    await expect(page.locator('#dock')).toHaveAttribute('data-orientation', orientation);
    const box = await page.locator('#dock').boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    expect(box.y + box.height).toBeLessThanOrEqual(height);
    expect(x).toBeGreaterThanOrEqual(box.x);
    expect(x).toBeLessThanOrEqual(box.x + box.width);
    expect(y).toBeGreaterThanOrEqual(box.y);
    expect(y).toBeLessThanOrEqual(box.y + box.height);
  }
});

test('right-button dragging temporarily erases and leaves the selected tool unchanged', async ({ page }) => {
  const canvas = page.locator('#canvas');
  await page.mouse.move(40, 100);
  await page.mouse.down();
  await page.mouse.move(180, 100, { steps: 20 });
  await page.mouse.up();
  const sample = () => canvas.evaluate((element) => {
    const ratio = element.width / element.clientWidth;
    return element.getContext('2d').getImageData(Math.floor(100 * ratio), Math.floor(100 * ratio), 1, 1).data[0];
  });
  expect(await sample()).toBe(32);
  await page.locator('#btn-rect').click();
  await page.locator('#size-slider').evaluate((input) => { input.value = 35; input.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.locator('#opacity-slider').evaluate((input) => { input.value = 30; input.dispatchEvent(new Event('input', { bubbles: true })); });
  await canvas.evaluate((element) => element.addEventListener('contextmenu', (event) => { window.mouseMenuBlocked = event.defaultPrevented; }));
  await page.mouse.move(90, 80);
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(110, 120, { steps: 12 });
  await page.mouse.up({ button: 'right' });
  expect(await sample()).toBe(255);
  expect(await page.evaluate(() => window.mouseMenuBlocked)).toBe(true);
  await expect(page.locator('#btn-rect')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#btn-undo').click();
  expect(await sample()).toBe(32);
  await page.locator('#btn-redo').click();
  expect(await sample()).toBe(255);
  await page.mouse.move(220, 60);
  await page.mouse.down();
  await page.mouse.move(290, 120, { steps: 8 });
  await page.mouse.up();
  await expect(page.locator('#btn-rect')).toHaveAttribute('aria-pressed', 'true');
});

test('opening and closing animate from the button and honor reduced motion', async ({ page }) => {
  await page.evaluate(() => {
    window.dockMotions = [];
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (frames, options) {
      if (this.id === 'dock') window.dockMotions.push({ frames, options });
      return animate.call(this, frames, options);
    };
  });
  await page.locator('#btn-collapse').click();
  await expect(page.locator('#dock')).toBeHidden();
  await page.locator('#dock-orb').click();
  await expect(page.locator('#dock')).toHaveAttribute('data-state', 'open');
  const motions = await page.evaluate(() => window.dockMotions);
  expect(motions).toHaveLength(2);
  expect(motions.every(({ options }) => options.duration === 360)).toBe(true);
  expect(motions[0].frames[1].transform).toContain('scale(');
  expect(motions[1].frames[0].transform).toContain('scale(');
  expect(motions[1].frames[1].transform).toBe('none');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator('#btn-collapse').click();
  await expect(page.locator('#dock')).toHaveAttribute('data-state', 'closed');
  await page.locator('#dock-orb').click();
  await expect(page.locator('#dock')).toHaveAttribute('data-state', 'open');
  expect(await page.evaluate(() => window.dockMotions.length)).toBe(2);
});

test('a short vertical toolbar keeps every tool and action reachable', async ({ page }) => {
  await page.setViewportSize({ width: 600, height: 390 });
  await collapseAndDrag(page, 550, 195);
  await page.locator('#dock-orb').click();
  await expect(page.locator('#dock')).toHaveAttribute('data-state', 'open');
  for (const id of ['pen', 'marker', 'airbrush', 'rect', 'circle', 'line', 'text', 'bucket', 'eraser']) {
    const button = page.locator(`#btn-${id}`);
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    const box = await button.boundingBox();
    expect(box.y).toBeGreaterThanOrEqual(12);
    expect(box.y + box.height).toBeLessThanOrEqual(378);
  }
  for (const id of ['btn-color', 'btn-settings', 'size-slider', 'btn-undo', 'btn-redo', 'btn-clear', 'btn-export', 'btn-help', 'btn-collapse']) {
    const button = page.locator(`#${id}`);
    await button.scrollIntoViewIfNeeded();
    const box = await button.boundingBox();
    expect(box.y).toBeGreaterThanOrEqual(12);
    expect(box.y + box.height).toBeLessThanOrEqual(378);
  }
  await page.locator('#btn-help').click();
  await expect(page.locator('#help-dialog')).toBeVisible();
  await page.locator('[data-close="help-dialog"]').click();
  const download = page.waitForEvent('download');
  await page.locator('#btn-export').click();
  expect((await download).suggestedFilename()).toMatch(/\.png$/);
});

test('touch dragging moves the button without marking the canvas', async ({ page, context, isMobile }) => {
  await page.locator('#btn-collapse').click();
  await expect(page.locator('#dock')).toBeHidden();
  const box = await page.locator('#dock-orb').boundingBox();
  const { width, height } = page.viewportSize();
  const cdp = await context.newCDPSession(page);
  const first = { x: box.x + 26, y: box.y + 26, id: 1 };
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [first] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...first, x: width - 60, y: height / 2 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  if (isMobile) await page.locator('#dock-orb').tap();
  else await page.locator('#dock-orb').evaluate((button) => button.click());
  await expect(page.locator('#dock')).toHaveAttribute('data-state', 'open');
  await expect(page.locator('#dock')).toHaveAttribute('data-orientation', 'vertical');
  await expect(page.locator('#btn-undo')).toBeDisabled();
  // A touch or stylus reporting button 2 must still use the selected drawing tool.
  for (const [pointerType, y] of [['touch', 80], ['pen', 110]]) {
    await page.locator('#canvas').evaluate((canvas, values) => {
      const send = (type, x) => canvas.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerType: values.pointerType, pointerId: 17, button: 2, buttons: 2, pressure: 0.8, clientX: x, clientY: values.y }));
      send('pointerdown', 40); send('pointermove', 100); send('pointerup', 120);
    }, { pointerType, y });
    const red = await page.locator('#canvas').evaluate((canvas, row) => {
      const scale = canvas.width / canvas.clientWidth;
      return canvas.getContext('2d').getImageData(80 * scale, row * scale, 1, 1).data[0];
    }, y);
    expect(red).toBe(32);
  }
  await expect(page.locator('#btn-undo')).toBeEnabled();
});

test('interrupted motion and resize leave the dock usable and inside the viewport', async ({ page }) => {
  await page.evaluate(() => {
    document.querySelector('#btn-collapse').click();
    document.querySelector('#dock-orb').click();
  });
  await expect(page.locator('#dock')).toHaveAttribute('data-state', 'open');
  await collapseAndDrag(page, page.viewportSize().width - 40, 120);
  await page.setViewportSize({ width: 320, height: 568 });
  await expect.poll(async () => { const box = await page.locator('#dock-orb').boundingBox(); return box.x + box.width; }).toBeLessThanOrEqual(308);
  const orb = await page.locator('#dock-orb').boundingBox();
  expect(orb.x + orb.width).toBeLessThanOrEqual(308);
  await page.locator('#dock-orb').click();
  await expect(page.locator('#dock')).toHaveAttribute('data-state', 'open');
  const dock = await page.locator('#dock').boundingBox();
  expect(dock.x).toBeGreaterThanOrEqual(12);
  expect(dock.y).toBeGreaterThanOrEqual(12);
  expect(dock.x + dock.width).toBeLessThanOrEqual(308);
  expect(dock.y + dock.height).toBeLessThanOrEqual(556);
  await page.locator('#btn-marker').click();
  await expect(page.locator('#btn-marker')).toHaveAttribute('aria-pressed', 'true');
});

test('a canceled touch drag returns the button to its previous position', async ({ page, context }) => {
  await page.locator('#btn-collapse').click();
  await expect(page.locator('#dock')).toBeHidden();
  const orb = page.locator('#dock-orb');
  const original = await orb.boundingBox();
  const cdp = await context.newCDPSession(page);
  const first = { x: original.x + 26, y: original.y + 26, id: 1 };
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [first] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...first, x: 60, y: 160 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  expect(await orb.boundingBox()).toEqual(original);
  await orb.evaluate((button) => button.click());
  await expect(page.locator('#dock')).toHaveAttribute('data-state', 'open');
  await expect(page.locator('#btn-undo')).toBeDisabled();
});

test('dragging during collapse finishes the canceled animation before moving', async ({ page }) => {
  await page.evaluate(() => {
    window.originalAnimate = Element.prototype.animate;
    Element.prototype.animate = function (frames, options) {
      return window.originalAnimate.call(this, frames, { ...options, duration: 10000 });
    };
    document.querySelector('#btn-collapse').click();
  });
  const box = await page.locator('#dock-orb').boundingBox();
  await page.mouse.move(box.x + 26, box.y + 26);
  await page.mouse.down();
  await page.mouse.move(60, 160, { steps: 5 });
  await expect(page.locator('#dock')).toBeHidden();
  await expect(page.locator('#dock')).toHaveAttribute('data-state', 'closed');
  await page.mouse.up();
  await page.evaluate(() => { Element.prototype.animate = window.originalAnimate; });
  await page.locator('#dock-orb').click();
  await expect(page.locator('#dock')).toHaveAttribute('data-state', 'open');
  await expect(page.locator('#dock')).toHaveAttribute('data-orientation', 'vertical');
});

test('liquid glass displaces the backdrop without changing the drawing', async ({ page, context }) => {
  await verifyRefraction(page);
  await page.emulateMedia({ forcedColors: 'active' });
  await expect(page.locator('#dock > .glass-refraction')).toBeHidden();
  await expect(page.locator('#btn-pen')).toBeVisible();
  await page.emulateMedia({ forcedColors: 'none' });
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }] });
  expect(await page.evaluate(() => matchMedia('(prefers-reduced-transparency: reduce)').matches)).toBe(true);
  await expect(page.locator('#dock > .glass-refraction')).toBeHidden();
});

test('the glass backdrop follows drawing history and keeps its own pixels out of exports', async ({ page }) => {
  const original = await page.locator('#dock').boundingBox();
  await page.locator('#size-slider').evaluate((input) => { input.value = 50; input.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.locator('#btn-collapse').click();
  await expect(page.locator('#dock')).toBeHidden();
  await page.mouse.move(40, original.y + 10);
  await page.mouse.down();
  await page.mouse.move(page.viewportSize().width - 40, original.y + 10, { steps: 20 });
  await page.mouse.up();
  await page.locator('#dock-orb').click();
  await expect(page.locator('#dock')).toHaveAttribute('data-state', 'open');
  const sample = () => page.locator('#dock > .glass-refraction').evaluate((canvas) => canvas.getContext('2d').getImageData(52, 22, 1, 1).data[0]);
  await expect.poll(sample).toBe(32);
  await page.locator('#btn-undo').click();
  await expect.poll(sample).toBe(255);
  await page.locator('#btn-redo').click();
  await expect.poll(sample).toBe(32);
  const before = await page.locator('#canvas').evaluate((canvas) => canvas.toDataURL());
  const download = page.waitForEvent('download');
  await page.locator('#btn-export').click();
  const file = await download;
  const png = (await readFile(await file.path())).toString('base64');
  const exported = await page.evaluate(async ({ png, y }) => {
    const image = new Image();
    image.src = `data:image/png;base64,${png}`;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.width; canvas.height = image.height;
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0);
    return context.getImageData(image.width / 2, y * image.width / innerWidth, 1, 1).data[0];
  }, { png, y: original.y + 10 });
  expect(exported).toBe(32);
  expect(await page.locator('#canvas').evaluate((canvas, previous) => canvas.toDataURL() === previous, before)).toBe(true);
  await page.locator('#btn-clear').click();
  await page.locator('#clear-confirm').click();
  await expect.poll(sample).toBe(255);
});
