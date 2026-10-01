import test from 'node:test';
import assert from 'node:assert/strict';
import { PointerInput } from '../../src/engine/input.js';

function setup(options = {}) {
  const view = new EventTarget();
  const canvas = new EventTarget();
  canvas.ownerDocument = { defaultView: view };
  canvas.setPointerCapture = () => {};
  canvas.hasPointerCapture = () => true;
  canvas.releasePointerCapture = () => {};
  const calls = [];
  const input = new PointerInput(canvas, {
    getOptions: () => ({ touchDrawing: true, ...options }),
    onStart: (event) => calls.push(['start', event.pointerId]),
    onMove: (samples) => calls.push(['move', samples.map((sample) => sample.clientX)]),
    onEnd: (event) => calls.push(['end', event.pointerId]),
    onCancel: () => calls.push(['cancel']),
  });
  const send = (type, values = {}) => {
    const event = new Event(type, { cancelable: true });
    Object.assign(event, { pointerId: 1, pointerType: 'mouse', button: 0, clientX: 10, clientY: 10, ...values });
    canvas.dispatchEvent(event);
  };
  return { canvas, view, input, calls, send };
}

test('pointer input ignores secondary mouse buttons, extra pointers, and disabled touch', () => {
  const { send, calls, input } = setup({ touchDrawing: false });
  send('pointerdown', { button: 2 });
  send('pointerdown', { pointerType: 'touch' });
  send('pointerdown', { pointerType: 'pen' });
  send('pointerdown', { pointerId: 2, pointerType: 'touch' });
  send('pointerup', { pointerId: 2 });
  send('pointerup');
  assert.deepEqual(calls.filter(([name]) => name !== 'move'), [['start', 1], ['end', 1]]);
  input.destroy();
});

test('coalesced samples and the release endpoint reach the drawing operation', () => {
  const { send, calls, input } = setup();
  send('pointerdown');
  send('pointermove', {
    clientX: 30,
    getCoalescedEvents: () => [{ clientX: 20, clientY: 10 }, { clientX: 25, clientY: 10 }],
  });
  send('pointerup', { clientX: 40 });
  assert.deepEqual(calls, [['start', 1], ['move', [20, 25, 30]], ['move', [40]], ['end', 1]]);
  input.destroy();
});

test('cancel, lost capture, and blur roll back once and allow the next stroke', () => {
  for (const ending of ['pointercancel', 'lostpointercapture', 'blur']) {
    const { send, view, calls, input } = setup();
    send('pointerdown');
    if (ending === 'blur') view.dispatchEvent(new Event('blur'));
    else send(ending);
    send('pointerup');
    send('pointerdown');
    send('pointerup');
    assert.deepEqual(calls.filter(([name]) => name !== 'move'), [['start', 1], ['cancel'], ['start', 1], ['end', 1]], ending);
    input.destroy();
    send('pointerdown');
    assert.equal(calls.filter(([name]) => name === 'start').length, 2);
  }
});
