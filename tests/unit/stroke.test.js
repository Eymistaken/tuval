import test from 'node:test';
import assert from 'node:assert/strict';
import { buildStroke } from '../../src/engine/stroke.js';

test('a right-angle sample sequence becomes a curve through midpoint endpoints', () => {
  const stroke = buildStroke([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }]);
  assert.deepEqual(stroke.start, { x: 0, y: 0, pressure: 1 });
  assert.deepEqual(stroke.segments[1], {
    control: { x: 10, y: 0, pressure: 1 },
    end: { x: 10, y: 5, pressure: 1 },
  });
  // At t=0.5 the corner curve is (8.75, 1.25), rather than the angular (10, 0).
  const start = stroke.segments[0].end;
  const segment = stroke.segments[1];
  const midpoint = {
    x: 0.25 * start.x + 0.5 * segment.control.x + 0.25 * segment.end.x,
    y: 0.25 * start.y + 0.5 * segment.control.y + 0.25 * segment.end.y,
  };
  assert.deepEqual(midpoint, { x: 8.75, y: 1.25 });
  assert.deepEqual(stroke.segments.at(-1).end, { x: 10, y: 10, pressure: 1 });
});

test('single taps remain dots and two samples flush the exact final endpoint', () => {
  assert.equal(buildStroke([]), null);
  const tap = buildStroke([{ x: 4, y: 7, pressure: 0.25 }]);
  assert.deepEqual(tap.start, { x: 4, y: 7, pressure: 0.25 });
  assert.equal(tap.segments.length, 0);
  const line = buildStroke([{ x: 0, y: 0, pressure: 0.2 }, { x: 9, y: 3, pressure: 0.8 }]);
  assert.deepEqual(line.segments[0].end, { x: 4.5, y: 1.5, pressure: 0.5 });
  assert.deepEqual(line.segments.at(-1).end, { x: 9, y: 3, pressure: 0.8 });
});
