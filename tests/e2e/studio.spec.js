import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const tools = ['pen', 'marker', 'airbrush', 'rect', 'circle', 'line', 'text', 'bucket', 'eraser'];

async function pixels(page) {
  return page.locator('#canvas').evaluate((canvas) => {
    const image = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
    let count = 0;
    for (let i = 0; i < image.data.length; i += 4) {
      if (image.data[i] < 245 || image.data[i + 1] < 245 || image.data[i + 2] < 245) count++;
    }
    return count;
  });
}
async function snapshot(page) {
  return page.locator('#canvas').evaluate(async (canvas) => {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canvas.toDataURL()));
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  });
}
async function draw(page, points = [[0.2, 0.2], [0.35, 0.25], [0.5, 0.4]]) {
  const box = await page.locator('#canvas').boundingBox();
  await page.mouse.move(box.x + box.width * points[0][0], box.y + box.height * points[0][1]);
  await page.mouse.down();
  for (const [x, y] of points.slice(1)) await page.mouse.move(box.x + box.width * x, box.y + box.height * y, { steps: 5 });
  await page.mouse.up();
}
async function tool(page, id) { await page.locator(`#btn-${id}`).click(); }
async function setRange(page, id, value) {
  await page.locator(`#${id}`).evaluate((input, value) => { input.value = value; input.dispatchEvent(new Event('input', { bubbles: true })); }, value);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#loading-state')).toBeHidden();
});

test('full-screen canvas keeps every action in a compact bottom toolbar', async ({ page }) => {
  const viewport = page.viewportSize();
  const box = await page.locator('#canvas').boundingBox();
  expect(box.x).toBe(0);
  expect(box.y).toBe(0);
  expect(box.width).toBe(viewport.width);
  expect(box.height).toBe(viewport.height);
  await expect(page.locator('.studio-header, .document-meta, .canvas-hint, .workspace-heading')).toHaveCount(0);
  for (const id of ['btn-undo', 'btn-redo', 'btn-clear', 'btn-export', 'btn-help', 'btn-collapse']) {
    await expect(page.locator(`#dock #${id}`)).toBeVisible();
  }
  const dock = await page.locator('#dock').boundingBox();
  expect(dock.y).toBeGreaterThan(viewport.height / 2);
});

test('literal palette colors remain visible when system colors are forced', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' });
  const colors = await page.locator('.color-swatch').evaluateAll((buttons) => buttons.map((button) => {
    const sample = button.querySelector('circle') || button.querySelector('.swatch-fill');
    const style = getComputedStyle(sample);
    return { actual: sample.tagName === 'circle' ? style.fill : style.backgroundColor, color: button.dataset.color };
  }));
  for (const { actual, color } of colors) {
    const channels = [1, 3, 5].map((offset) => parseInt(color.slice(offset, offset + 2), 16));
    expect(actual).toBe(`rgb(${channels.join(', ')})`);
  }
});

test('every original tool is selectable at narrow and wide viewport sizes', async ({ page }) => {
  for (const width of [320, 390, 620, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    for (const id of tools) {
      await tool(page, id);
      await expect(page.locator(`#btn-${id}`)).toHaveAttribute('aria-pressed', 'true');
      const box = await page.locator(`#btn-${id}`).boundingBox();
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    for (const selector of ['#btn-color', '#btn-settings', '#size-slider', '#btn-collapse', '#btn-undo', '#btn-redo', '#btn-clear', '#btn-export', '#btn-help']) {
      const box = await page.locator(selector).boundingBox();
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
      expect(box.y + box.height).toBeLessThanOrEqual(845);
    }
  }
});

test('tool-row arrows reveal both ends without losing controls', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await expect(page.locator('#tools-next')).toBeVisible();
  for (let index = 0; index < 8; index++) {
    if (await page.locator('#tools-next').isDisabled()) break;
    await page.locator('#tools-next').click();
    await page.waitForTimeout(200);
  }
  await page.locator('#btn-eraser').click();
  await expect(page.locator('#btn-eraser')).toHaveAttribute('aria-pressed', 'true');
  for (let index = 0; index < 8; index++) {
    if (await page.locator('#tools-previous').isDisabled()) break;
    await page.locator('#tools-previous').click();
    await page.waitForTimeout(200);
  }
  await page.locator('#btn-pen').click();
  await expect(page.locator('#btn-pen')).toHaveAttribute('aria-pressed', 'true');
});

test('pen draws a continuous stroke and a tap, with working history branching', async ({ page }) => {
  await draw(page);
  expect(await pixels(page)).toBeGreaterThan(100);
  const first = await snapshot(page);
  await page.locator('#btn-undo').click();
  expect(await pixels(page)).toBe(0);
  await page.locator('#btn-redo').click();
  expect(await snapshot(page)).toBe(first);
  await page.locator('#btn-undo').click();
  await page.locator('#canvas').click({ position: { x: 60, y: 70 } });
  expect(await pixels(page)).toBeGreaterThan(0);
  await expect(page.locator('#btn-redo')).toBeDisabled();
});

test('marker, spray, shapes, fill, and eraser all change the drawing', async ({ page }) => {
  for (const id of ['marker', 'airbrush', 'rect', 'circle', 'line']) {
    await tool(page, id);
    const before = await snapshot(page);
    await draw(page);
    expect(await snapshot(page)).not.toBe(before);
  }
  await tool(page, 'bucket');
  const beforeFill = await snapshot(page);
  await page.locator('#canvas').click({ position: { x: 25, y: 25 } });
  expect(await snapshot(page)).not.toBe(beforeFill);
  await tool(page, 'eraser');
  await setRange(page, 'size-slider', 35);
  const beforeErase = await snapshot(page);
  await draw(page);
  expect(await snapshot(page)).not.toBe(beforeErase);
  await page.locator('[data-color="#FF3B30"]').click();
  await expect(page.locator('#btn-pen')).toHaveAttribute('aria-pressed', 'true');
});

test('text is committed exactly once and accepts literal markup as text', async ({ page }) => {
  await tool(page, 'text');
  await page.locator('#canvas').click({ position: { x: 30, y: 60 } });
  await expect(page.locator('#text-editor')).toBeVisible();
  await page.locator('#text-input').fill('<script>Hello</script>');
  await page.locator('#text-editor button[type="submit"]').click();
  expect(await pixels(page)).toBeGreaterThan(100);
  await page.locator('#btn-undo').click();
  expect(await pixels(page)).toBe(0);
  await expect(page.locator('#btn-undo')).toBeDisabled();
});

test('custom HEX and RGB colors and opacity are applied and invalid input is rejected', async ({ page }) => {
  await page.locator('#btn-color').click();
  await page.locator('#color-input').fill('#2468AC');
  await page.locator('#color-done').click();
  await expect(page.locator('#current-color-label')).toHaveText('#2468AC');
  await page.locator('#btn-color').click();
  await page.locator('#color-format').click();
  await page.locator('#color-input').fill('rgba(220, 30, 40, 0.4)');
  await page.locator('#color-done').click();
  await expect(page.locator('#current-color-label')).toHaveText('#DC1E28');
  await page.locator('#btn-settings').click();
  await expect(page.locator('#opacity-slider')).toHaveValue('40');
  await page.locator('[data-close="settings-dialog"]').click();
  await page.locator('#btn-color').click();
  await page.locator('#color-input').fill('not-a-color');
  await page.locator('#color-done').click();
  await expect(page.locator('#color-dialog')).toBeVisible();
  await expect(page.locator('#color-input')).toHaveAttribute('aria-invalid', 'true');
});

test('color picker keyboard and touch-area controls update color without leaving viewport', async ({ page }) => {
  await page.locator('#btn-color').click();
  await page.locator('#color-sv').focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowUp');
  await setRange(page, 'color-hue', 220);
  await setRange(page, 'color-alpha', 65);
  await expect(page.locator('#alpha-value')).toHaveText('65%');
  await page.locator('#color-sv').click({ position: { x: 80, y: 40 } });
  await page.locator('#color-done').click();
  await expect(page.locator('#color-dialog')).toBeHidden();
  await page.locator('#btn-settings').click();
  await expect(page.locator('#opacity-slider')).toHaveValue('65');
});

test('clear can be canceled and the confirmed clear can be undone', async ({ page }) => {
  await draw(page);
  const drawing = await snapshot(page);
  await page.locator('#btn-clear').click();
  await page.locator('#clear-dialog [data-close]').last().click();
  expect(await snapshot(page)).toBe(drawing);
  await page.locator('#btn-clear').click();
  await page.locator('#clear-confirm').click();
  expect(await pixels(page)).toBe(0);
  await page.locator('#btn-undo').click();
  expect(await snapshot(page)).toBe(drawing);
});

test('drawing and settings survive reload and PNG export has a valid signature', async ({ page }) => {
  await draw(page);
  await setRange(page, 'size-slider', 17);
  const drawing = await snapshot(page);
  await expect(page.locator('#save-status-text')).toHaveText('Saved on this device');
  await page.reload();
  await expect(page.locator('#loading-state')).toBeHidden();
  expect(await snapshot(page)).toBe(drawing);
  await expect(page.locator('#size-slider')).toHaveValue('17');
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#btn-export').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^tuval-\d{4}-\d{2}-\d{2}\.png$/);
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  expect([...Buffer.concat(chunks).subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
});

test('an immediate reload preserves the committed stroke before the autosave timer runs', async ({ page }) => {
  await draw(page);
  const drawing = await snapshot(page);
  await page.reload();
  await expect(page.locator('#loading-state')).toBeHidden();
  expect(await snapshot(page)).toBe(drawing);
});

test('an intact legacy drawing restores even when IndexedDB is unavailable', async ({ page, context }) => {
  const legacy = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 60;
    const context = canvas.getContext('2d');
    context.fillStyle = '#ff0000';
    context.fillRect(0, 0, 100, 60);
    return canvas.toDataURL();
  });
  await page.evaluate((value) => localStorage.setItem('smartCanvas_img', value), legacy);
  await context.addInitScript(() => {
    Object.defineProperty(window, 'indexedDB', { value: { open() { throw new DOMException('Storage is blocked', 'SecurityError'); } } });
  });
  await page.reload();
  await expect(page.locator('#loading-state')).toBeHidden();
  expect(await pixels(page)).toBeGreaterThan(1000);
  await expect(page.locator('#save-status')).toHaveAttribute('data-state', 'error');
});

test('existing IndexedDB Blob records restore after the PNG byte migration', async ({ page }) => {
  await page.evaluate(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 60;
    const context = canvas.getContext('2d');
    context.fillStyle = '#cc2233';
    context.fillRect(0, 0, 100, 60);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve));
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('tuval-studio', 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise((resolve, reject) => {
      const transaction = db.transaction('drawings', 'readwrite');
      transaction.objectStore('drawings').put({ blob, width: 100, height: 60, changedAt: Date.now() }, 'current');
      transaction.oncomplete = resolve;
      transaction.onabort = () => reject(transaction.error);
    });
    db.close();
  });
  await page.reload();
  await expect(page.locator('#loading-state')).toBeHidden();
  expect(await pixels(page)).toBeGreaterThan(1000);
  const viewport = page.viewportSize();
  await expect(page.locator('#canvas-dimensions')).toHaveText(`${viewport.width} × ${viewport.height}`);
});

test('touch drawing finalizes without errors and ignores an extra finger', async ({ page, context }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true });
  const box = await page.locator('#canvas').boundingBox();
  const first = { x: box.x + 60, y: box.y + 70, id: 1 };
  const second = { x: box.x + box.width - 60, y: box.y + box.height - 60, id: 2 };
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [first] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...first, x: first.x + 40 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...first, x: first.x + 40 }, second] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...first, x: first.x + 80 }, { ...second, x: second.x - 20 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  expect(await pixels(page)).toBeGreaterThan(40);
  expect(errors).toEqual([]);
  await page.locator('#btn-undo').click();
  expect(await pixels(page)).toBe(0);
  await page.locator('#btn-settings').click();
  await page.locator('#touch-toggle').uncheck();
  await page.locator('[data-close="settings-dialog"]').click();
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [first] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...first, x: first.x + 50 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  expect(await pixels(page)).toBe(0);
});

test('stylus pressure works and canceled pointers leave no drawing or stuck input', async ({ page }) => {
  await setRange(page, 'size-slider', 30);
  const dispatch = (type, x, pressure = 0.5) => page.locator('#canvas').evaluate((canvas, { type, x, pressure }) => {
    const rect = canvas.getBoundingClientRect();
    canvas.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 44, pointerType: 'pen', isPrimary: true, button: 0, buttons: type === 'pointerup' ? 0 : 1, pressure, clientX: rect.left + x, clientY: rect.top + 100 }));
  }, { type, x, pressure });
  await dispatch('pointerdown', 40, 0.2);
  await dispatch('pointermove', 100, 0.6);
  await dispatch('pointercancel', 100);
  expect(await pixels(page)).toBe(0);
  await dispatch('pointerdown', 40, 0.2);
  await dispatch('pointermove', 80, 0.2);
  await dispatch('pointermove', 130, 0.9);
  await dispatch('pointerup', 170, 0);
  expect(await pixels(page)).toBeGreaterThan(500);
  await page.locator('#btn-undo').click();
  expect(await pixels(page)).toBe(0);
  await draw(page);
  expect(await pixels(page)).toBeGreaterThan(100);
});

test('rotation and dock collapse preserve the full exported document', async ({ page }) => {
  await draw(page, [[0.1, 0.1], [0.9, 0.9]]);
  const dimensions = (await page.locator('#canvas-dimensions').textContent()).split(' × ').map(Number);
  await page.locator('#btn-collapse').click();
  await expect(page.locator('#dock-orb')).toBeVisible();
  await expect(page.locator('#dock')).toBeHidden();
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.locator('#canvas-dimensions')).toHaveText(`${Math.max(dimensions[0], 844)} × ${Math.max(dimensions[1], 390)}`);
  expect(await pixels(page)).toBeGreaterThan(0);
  await page.locator('#dock-orb').click();
  await expect(page.locator('#dock')).toBeVisible();
  expect(await pixels(page)).toBeGreaterThan(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#btn-undo').click();
  expect(await pixels(page)).toBe(0);
  await page.locator('#btn-redo').click();
  expect(await pixels(page)).toBeGreaterThan(0);
});

test('viewport expansion keeps history and makes the newly exposed edges drawable', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 480 });
  await page.addInitScript(() => Object.defineProperty(window, 'devicePixelRatio', { value: 2, configurable: true }));
  await page.reload();
  await expect(page.locator('#loading-state')).toBeHidden();
  await page.locator('#canvas').click({ position: { x: 20, y: 30 } });
  await page.evaluate(() => Object.defineProperty(window, 'devicePixelRatio', { value: 1, configurable: true }));
  await page.setViewportSize({ width: 900, height: 700 });
  await expect(page.locator('#canvas-dimensions')).toHaveText('900 × 700');
  const box = await page.locator('#canvas').boundingBox();
  expect(box).toMatchObject({ x: 0, y: 0, width: 900, height: 700 });
  await page.locator('#canvas').click({ position: { x: 870, y: 30 } });
  const sample = () => page.locator('#canvas').evaluate((canvas) => {
    const context = canvas.getContext('2d');
    const ratio = canvas.width / 900;
    return [20, 870].map((x) => context.getImageData(Math.floor(x * ratio), Math.floor(30 * ratio), 1, 1).data[0]);
  });
  expect(await sample()).toEqual([32, 32]);
  await page.locator('#btn-undo').click();
  expect(await sample()).toEqual([32, 255]);
  await page.locator('#btn-undo').click();
  expect(await pixels(page)).toBe(0);
  await page.locator('#btn-redo').click();
  expect(await sample()).toEqual([32, 255]);
  await page.locator('#btn-redo').click();
  expect(await sample()).toEqual([32, 32]);
  await page.setViewportSize({ width: 320, height: 480 });
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#btn-export').click();
  const stream = await (await downloadPromise).createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const png = Buffer.concat(chunks);
  const ratio = await page.locator('#canvas').evaluate((canvas) => canvas.width / 320);
  expect(png.readUInt32BE(16)).toBe(900 * ratio);
  expect(png.readUInt32BE(20)).toBe(700 * ratio);
});

test('a resize during PNG encoding keeps saved dimensions paired with the captured image', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 480 });
  await page.reload();
  await expect(page.locator('#loading-state')).toBeHidden();
  const ratio = await page.locator('#canvas').evaluate((canvas) => canvas.width / 320);
  await page.evaluate(() => {
    window.pendingEncodings = [];
    window.originalToBlob = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function (callback, ...args) {
      window.originalToBlob.call(this, (blob) => window.pendingEncodings.push(() => callback(blob)), ...args);
    };
  });
  await page.locator('#canvas').click({ position: { x: 20, y: 30 } });
  await page.waitForFunction(() => window.pendingEncodings.length === 1);
  await page.setViewportSize({ width: 900, height: 700 });
  await page.evaluate(() => window.pendingEncodings.shift()());
  await page.waitForFunction(() => window.pendingEncodings.length === 1);
  const record = await page.evaluate(async () => {
    const db = await new Promise((resolve) => { const request = indexedDB.open('tuval-studio', 1); request.onsuccess = () => resolve(request.result); });
    const drawing = await new Promise((resolve) => { const request = db.transaction('drawings').objectStore('drawings').get('current'); request.onsuccess = () => resolve(request.result); });
    db.close();
    const bytes = new DataView(drawing.png);
    return { width: drawing.width, height: drawing.height, pngWidth: bytes.getUint32(16), pngHeight: bytes.getUint32(20) };
  });
  expect(record).toEqual({ width: 320, height: 480, pngWidth: 320 * ratio, pngHeight: 480 * ratio });
  await page.evaluate(() => {
    HTMLCanvasElement.prototype.toBlob = window.originalToBlob;
    window.pendingEncodings.shift()();
  });
  await expect(page.locator('#save-status-text')).toHaveText('Saved on this device');
  await page.reload();
  await expect(page.locator('#loading-state')).toBeHidden();
  await expect(page.locator('#canvas-dimensions')).toHaveText('900 × 700');
  expect(await pixels(page)).toBeGreaterThan(0);
});

test('keyboard shortcuts and focus navigation remain usable', async ({ page }) => {
  await page.keyboard.press('m');
  await expect(page.locator('#btn-marker')).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press(']');
  await expect(page.locator('#size-slider')).toHaveValue('6');
  await page.locator('#btn-pen').focus();
  await page.keyboard.press('End');
  await expect(page.locator('#btn-eraser')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#btn-eraser')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#btn-help').click();
  await expect(page.locator('#help-dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#help-dialog')).toBeHidden();
});

test('the studio and dialogs have no WCAG AA accessibility violations', async ({ page }) => {
  const scan = () => new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect((await scan()).violations).toEqual([]);
  for (const [button, dialog] of [['#btn-color', 'color-dialog'], ['#btn-settings', 'settings-dialog'], ['#btn-help', 'help-dialog'], ['#btn-clear', 'clear-dialog']]) {
    await page.locator(button).click();
    expect((await scan()).violations).toEqual([]);
    await page.locator(`#${dialog} [data-close]`).first().click();
  }
});
