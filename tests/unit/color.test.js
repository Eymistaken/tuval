import test from 'node:test';
import assert from 'node:assert/strict';
import { parseColor, rgbToHex, rgbToHsv, hsvToRgb } from '../../src/engine/color.js';

test('color input accepts supported CSS forms and rejects malformed or unbounded channels', () => {
  assert.deepEqual(parseColor('#3aF'), { r: 51, g: 170, b: 255, a: 1 });
  assert.deepEqual(parseColor('#33669980'), { r: 51, g: 102, b: 153, a: 128 / 255 });
  assert.deepEqual(parseColor('#0f08'), { r: 0, g: 255, b: 0, a: 136 / 255 });
  assert.deepEqual(parseColor('rgba(12, 34, 56, 0.25)'), { r: 12, g: 34, b: 56, a: 0.25 });
  assert.deepEqual(parseColor('rgb(100%, 0%, 50%)'), { r: 255, g: 0, b: 128, a: 1 });
  for (const value of ['red', '#12', '#gg0000', 'rgb(256,0,0)', 'rgb(-1,0,0)', 'rgba(0,0,0,2)', 'rgb(1,2)', 'rgba(1,2,3)', 'rgb(1,2,3)junk', null]) {
    assert.equal(parseColor(value), null, String(value));
  }
});

test('RGB and HSV conversions reproduce primary colors and neutral gray', () => {
  assert.equal(rgbToHex(32, 41, 35), '#202923');
  assert.deepEqual(rgbToHsv(255, 0, 0), { h: 0, s: 100, v: 100 });
  assert.deepEqual(rgbToHsv(128, 128, 128), { h: 0, s: 0, v: 128 / 255 * 100 });
  assert.deepEqual(hsvToRgb(120, 100, 100), { r: 0, g: 255, b: 0 });
  assert.deepEqual(hsvToRgb(360, 100, 100), { r: 255, g: 0, b: 0 });
  for (const rgb of [[32, 41, 35], [91, 134, 232], [0, 0, 0], [255, 255, 255]]) {
    const hsv = rgbToHsv(...rgb);
    assert.deepEqual(hsvToRgb(hsv.h, hsv.s, hsv.v), { r: rgb[0], g: rgb[1], b: rgb[2] });
  }
});
