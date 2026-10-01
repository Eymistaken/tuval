import { expect } from '@playwright/test';

/** A striped backdrop distinguishes real optical displacement from transparency alone. */
export async function verifyRefraction(page) {
  await page.locator('#canvas').evaluate((canvas) => {
    const context = canvas.getContext('2d');
    const scale = canvas.width / canvas.clientWidth;
    context.save();
    context.setTransform(scale, 0, 0, scale, 0, 0);
    for (let y = 0; y < canvas.clientHeight; y += 4) {
      context.fillStyle = y % 8 ? '#007aff' : '#ff3b30';
      context.fillRect(0, y, canvas.clientWidth, 4);
    }
    context.restore();
    window.glassFixture = canvas.toDataURL();
    document.querySelector('#dock').style.setProperty('--glass-light-x', '25%');
  });
  const backdrop = page.locator('#dock > .glass-refraction');
  await expect.poll(() => backdrop.evaluate((canvas) => canvas.getContext('2d').getImageData(40, 40, 1, 1).data[1])).toBeLessThan(200);
  await expect(page.locator('#dock-lens feImage')).toHaveAttribute('href', /^data:image\/png/);
  await page.locator('#dock-lens feImage').evaluate(async (element) => {
    const image = new Image(); image.src = element.getAttribute('href'); await image.decode();
  });
  const box = await page.locator('#dock').boundingBox();
  const clip = { x: Math.floor(box.x + box.width / 2) - 20, y: Math.ceil(box.y) + 2, width: 40, height: 5 };
  const refracted = await page.screenshot({ clip });
  const displacement = page.locator('#dock-lens feDisplacementMap');
  await displacement.evaluate((element) => { element.setAttribute('scale', '0'); });
  const plain = await page.screenshot({ clip });
  expect(refracted.equals(plain), 'the glass edge must bend the actual backdrop pixels').toBe(false);
  await displacement.evaluate((element) => { element.setAttribute('scale', '24'); });
  expect(await page.locator('#canvas').evaluate((canvas) => canvas.toDataURL() === window.glassFixture)).toBe(true);
}
