/** Own a single captured pointer. Unexpected endings always cancel the operation. */
export class PointerInput {
  constructor(canvas, callbacks) {
    this.canvas = canvas;
    this.callbacks = callbacks;
    this.active = null;
    this.lastPointerType = 'mouse';
    this.view = canvas.ownerDocument.defaultView;
    this.listeners = {
      pointerdown: (event) => this.start(event),
      pointermove: (event) => this.move(event),
      pointerup: (event) => this.end(event),
      pointercancel: (event) => this.cancelEvent(event),
      lostpointercapture: (event) => this.cancelEvent(event),
      contextmenu: (event) => {
        if ((event.pointerType || this.lastPointerType) === 'mouse') event.preventDefault();
      },
    };
    for (const [name, listener] of Object.entries(this.listeners)) canvas.addEventListener(name, listener);
    this.onBlur = () => this.cancel();
    this.view.addEventListener('blur', this.onBlur);
  }

  start(event) {
    if (this.active) return;
    const type = event.pointerType || 'mouse';
    this.lastPointerType = type;
    if (type === 'mouse' && ![0, 2].includes(event.button)) return;
    if (type === 'touch' && !this.callbacks.getOptions().touchDrawing) return;
    event.preventDefault();
    this.active = { id: event.pointerId, type, button: event.button };
    try { this.canvas.setPointerCapture(event.pointerId); } catch { /* Synthetic events cannot capture. */ }
    if (this.callbacks.onStart(event) === false) this.cancel();
  }

  samples(event) {
    const samples = typeof event.getCoalescedEvents === 'function' ? [...event.getCoalescedEvents()] : [];
    const last = samples.at(-1);
    if (!last || last.clientX !== event.clientX || last.clientY !== event.clientY || last.pressure !== event.pressure) {
      samples.push(event);
    }
    return samples;
  }

  move(event) {
    if (!this.active || event.pointerId !== this.active.id) return;
    if (this.active.type === 'mouse' && Number.isFinite(event.buttons)
      && !(event.buttons & (this.active.button === 2 ? 2 : 1))) {
      this.end(event);
      return;
    }
    event.preventDefault();
    this.callbacks.onMove(this.samples(event));
  }

  end(event) {
    if (!this.active || event.pointerId !== this.active.id) return;
    event.preventDefault();
    this.callbacks.onMove(this.samples(event));
    const id = this.active.id;
    this.active = null;
    this.callbacks.onEnd(event);
    this.release(id);
  }

  cancelEvent(event) {
    if (this.active && event.pointerId === this.active.id) this.cancel();
  }

  cancel() {
    if (!this.active) return;
    const id = this.active.id;
    this.active = null;
    this.callbacks.onCancel();
    this.release(id);
  }

  release(id) {
    try {
      if (this.canvas.hasPointerCapture(id)) this.canvas.releasePointerCapture(id);
    } catch { /* A canceled pointer may already have been released by the browser. */ }
  }

  destroy() {
    this.cancel();
    for (const [name, listener] of Object.entries(this.listeners)) this.canvas.removeEventListener(name, listener);
    this.view.removeEventListener('blur', this.onBlur);
  }
}
