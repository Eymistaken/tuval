import test from 'node:test';
import assert from 'node:assert/strict';
import { floodFill } from '../../src/engine/fill.js';

const white = [255, 255, 255, 255];
const black = [0, 0, 0, 255];
const image = (rows) => ({ width: rows[0].length, height: rows.length, data: new Uint8ClampedArray(rows.flat(2)) });
const pixel = (data, x, y) => [...data.data.slice((y * data.width + x) * 4, (y * data.width + x + 1) * 4)];

test('fill stays inside the selected connected region and refuses out-of-bounds seeds', () => {
  const data = image([[white, black, white], [white, black, white], [black, black, white]]);
  assert.equal(floodFill(data, -1, 0, { r: 255, g: 0, b: 0, a: 1 }), false);
  assert.equal(floodFill(data, 3, 0, { r: 255, g: 0, b: 0, a: 1 }), false);
  assert.equal(floodFill(data, 0, 0, { r: 255, g: 0, b: 0, a: 1 }), true);
  assert.deepEqual(pixel(data, 0, 1), [255, 0, 0, 255]);
  assert.deepEqual(pixel(data, 2, 0), white);
  assert.deepEqual(pixel(data, 1, 0), black);
  assert.equal(floodFill(data, 0, 0, { r: 255, g: 0, b: 0, a: 1 }), false);
});

test('fill blends opacity once and distinguishes regions by their alpha channel', () => {
  const transparentWhite = [255, 255, 255, 0];
  const data = image([[white, transparentWhite, white]]);
  assert.equal(floodFill(data, 0, 0, { r: 0, g: 0, b: 0, a: 0.5 }), true);
  assert.deepEqual(pixel(data, 0, 0), [128, 128, 128, 255]);
  assert.deepEqual(pixel(data, 1, 0), transparentWhite);
  assert.deepEqual(pixel(data, 2, 0), white);
  assert.equal(floodFill(data, 1, 0, { r: 255, g: 0, b: 0, a: 0.5 }), true);
  assert.deepEqual(pixel(data, 1, 0), [255, 0, 0, 128]);
  assert.equal(floodFill(data, 2, 0, { r: 1, g: 2, b: 3, a: 0 }), false);
});
