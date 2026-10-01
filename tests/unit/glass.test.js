import test from 'node:test';
import assert from 'node:assert/strict';
import { createLensMap } from '../../src/ui/glass-lens.js';

test('the lens preserves the flat center and exterior while bending opposite edges symmetrically', () => {
  const map = createLensMap(120, 60, 30);
  const pixel = (x, y) => [...map.pixels.slice((y * map.width + x) * 4, (y * map.width + x) * 4 + 4)];
  assert.deepEqual(pixel(72, 42), [128, 128, 128, 255]);
  assert.deepEqual(pixel(0, 0), [128, 128, 128, 255]);
  const left = pixel(20, 42);
  const right = pixel(map.width - 21, 42);
  assert.ok(left[0] > 160 && right[0] < 95);
  assert.equal(left[0] + right[0], 255);
  const top = pixel(72, 20);
  const bottom = pixel(72, map.height - 21);
  assert.ok(top[1] > 160 && bottom[1] < 95);
  assert.equal(top[1] + bottom[1], 255);
});

test('circular and narrow glass bounds produce finite channels within the padded sample region', () => {
  for (const [width, height, radius] of [[52, 52, 999], [110, 740, 30], [1190, 60, 999]]) {
    const map = createLensMap(width, height, radius);
    assert.equal(map.pixels.length, map.width * map.height * 4);
    for (let i = 0; i < map.pixels.length; i += 4) {
      assert.ok(map.pixels[i] >= 20 && map.pixels[i] <= 235);
      assert.ok(map.pixels[i + 1] >= 20 && map.pixels[i + 1] <= 235);
      assert.equal(map.pixels[i + 3], 255);
    }
  }
});
