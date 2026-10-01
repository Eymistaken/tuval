import test from 'node:test';
import assert from 'node:assert/strict';
import { clampAnchor, dockOrientation, placeDock } from '../../src/ui/dock-geometry.js';

const bounds = { left: 12, top: 24, right: 378, bottom: 820 };

test('the nearest proportional screen edge determines toolbar orientation', () => {
  assert.equal(dockOrientation({ x: 350, y: 422 }, bounds), 'vertical');
  assert.equal(dockOrientation({ x: 40, y: 422 }, bounds), 'vertical');
  assert.equal(dockOrientation({ x: 195, y: 50 }, bounds), 'horizontal');
  assert.equal(dockOrientation({ x: 195, y: 794 }, bounds), 'horizontal');
});

test('dragged buttons and panels stay inside safe viewport bounds after resizing', () => {
  assert.deepEqual(clampAnchor({ x: 600, y: -100 }, bounds), { x: 352, y: 50 });
  assert.deepEqual(placeDock({ x: 352, y: 50 }, 110, 740, bounds), { left: 268, top: 24 });
  assert.deepEqual(placeDock({ x: 195, y: 794 }, 366, 160, bounds), { left: 12, top: 660 });
});
