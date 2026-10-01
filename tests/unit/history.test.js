import test from 'node:test';
import assert from 'node:assert/strict';
import { SnapshotHistory } from '../../src/engine/history.js';

const snapshot = (value) => ({ width: 1, height: 1, data: new Uint8ClampedArray([value, value, value, 255]) });

test('undo and redo are synchronous and a new operation replaces the redo branch', () => {
  const history = new SnapshotHistory(snapshot(0));
  assert.equal(history.canUndo, false);
  assert.equal(history.push(snapshot(1)), true);
  assert.equal(history.push(snapshot(2)), true);
  assert.equal(history.undo().data[0], 1);
  assert.equal(history.redo().data[0], 2);
  assert.equal(history.undo().data[0], 1);
  history.push(snapshot(3));
  assert.equal(history.canRedo, false);
  assert.equal(history.redo(), null);
  assert.equal(history.undo().data[0], 1);
  assert.equal(history.undo().data[0], 0);
  assert.equal(history.undo(), null);
});

test('history keeps snapshots immutable and skips identical operations', () => {
  const initial = snapshot(0);
  const history = new SnapshotHistory(initial);
  initial.data[0] = 99;
  assert.equal(history.push(snapshot(0)), false);
  history.push(snapshot(1));
  assert.equal(history.undo().data[0], 0);
  assert.equal(history.length, 2);
});

test('history enforces both entry and byte limits, including after branching and reset', () => {
  const history = new SnapshotHistory(snapshot(0), { maxEntries: 3, maxBytes: 8 });
  history.push(snapshot(1));
  history.push(snapshot(2));
  assert.equal(history.length, 2);
  assert.equal(history.byteLength, 8);
  assert.equal(history.undo().data[0], 1);
  assert.equal(history.undo(), null);
  history.push(snapshot(3));
  assert.equal(history.byteLength, 8);
  history.reset(snapshot(4));
  assert.equal(history.length, 1);
  assert.equal(history.byteLength, 4);
  assert.equal(history.canUndo, false);
  assert.equal(history.canRedo, false);
  const countLimited = new SnapshotHistory(snapshot(0), { maxEntries: 2, maxBytes: 100 });
  countLimited.push(snapshot(1));
  countLimited.push(snapshot(2));
  assert.equal(countLimited.length, 2);
  assert.throws(() => new SnapshotHistory(snapshot(0), { maxBytes: 3 }), RangeError);
});

test('history preserves logical coordinates when snapshot resolution or document size changes', () => {
  const initial = { ...snapshot(0), logicalWidth: 0.5, logicalHeight: 0.5 };
  const history = new SnapshotHistory(initial);
  history.push({ ...snapshot(1), logicalWidth: 1, logicalHeight: 1 });
  const previous = history.undo();
  assert.equal(previous.logicalWidth, 0.5);
  assert.equal(previous.logicalHeight, 0.5);
  assert.equal(history.redo().logicalWidth, 1);
});
