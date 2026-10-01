import { parseColor, rgbToHex } from './color.js';
import { floodFill } from './fill.js';
import { SnapshotHistory } from './history.js';
import { PointerInput } from './input.js';
import { TOOL_NAMES, FREEHAND_TOOLS, SHAPE_TOOLS, layerStyle, paintFreehand, paintShape, spray } from './tools.js';

const MAX_DOCUMENT_PIXELS = 16 * 1024 * 1024;
const MAX_CANVAS_SIDE = 16384;
const noOp = () => {};
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const backingRatio = (width, height, requested) => Math.min(requested,
  Math.sqrt(MAX_DOCUMENT_PIXELS / (width * height)), MAX_CANVAS_SIDE / width, MAX_CANVAS_SIDE / height);

/** A retained drawing document with an independently resized display and preview layer. */
export class DrawingEngine {
  constructor(canvas, { onChange = noOp, onHistoryChange = noOp, onTextRequest = noOp, onRender = noOp } = {}) {
    this.canvas = canvas;
    this.parent = canvas.parentElement;
    this.view = canvas.ownerDocument.defaultView;
    this.callbacks = { onChange, onHistoryChange, onTextRequest, onRender };
    this.options = { tool: 'pen', color: '#202923', alpha: 1, size: 5, pressure: true, touchDrawing: true };
    this.destroyed = false;
    this.operation = null;
    this.previewFrame = null;
    this.loadVersion = 0;
    this.documentCanvas = canvas.ownerDocument.createElement('canvas');
    this.layerCanvas = canvas.ownerDocument.createElement('canvas');
    this.context = this.documentCanvas.getContext('2d', { willReadFrequently: true });
    this.layerContext = this.layerCanvas.getContext('2d');
    this.displayContext = canvas.getContext('2d');
    const bounds = this.parent.getBoundingClientRect();
    this.createDocument(Math.max(1, Math.round(bounds.width)), Math.max(1, Math.round(bounds.height)));
    this.history = new SnapshotHistory(this.snapshot());
    this.canvas.style.touchAction = 'none';
    this.input = new PointerInput(canvas, {
      getOptions: () => this.options,
      onStart: (event) => this.startOperation(event),
      onMove: (samples) => this.moveOperation(samples),
      onEnd: () => this.finishOperation(),
      onCancel: () => this.cancelOperation(),
    });
    this.onResize = () => this.fit();
    this.view.addEventListener('resize', this.onResize);
    const ResizeObserverClass = this.view.ResizeObserver;
    if (ResizeObserverClass) {
      this.resizeObserver = new ResizeObserverClass(this.onResize);
      this.resizeObserver.observe(this.parent);
    }
    this.fit();
    this.notifyHistory();
  }

  get dimensions() { return { width: this.width, height: this.height }; }

  createDocument(width, height) {
    this.width = width;
    this.height = height;
    const requestedRatio = clamp(this.view.devicePixelRatio || 1, 1, 2);
    const ratio = backingRatio(width, height, requestedRatio);
    this.documentCanvas.width = Math.max(1, Math.floor(width * ratio));
    this.documentCanvas.height = Math.max(1, Math.floor(height * ratio));
    this.layerCanvas.width = this.documentCanvas.width;
    this.layerCanvas.height = this.documentCanvas.height;
    this.scaleX = this.documentCanvas.width / width;
    this.scaleY = this.documentCanvas.height / height;
    this.context.fillStyle = '#ffffff';
    this.context.fillRect(0, 0, this.documentCanvas.width, this.documentCanvas.height);
  }

  setOptions(patch = {}) {
    if (TOOL_NAMES.has(patch.tool)) this.options.tool = patch.tool;
    if (typeof patch.color === 'string' && patch.color.trim().startsWith('#')) {
      const color = parseColor(patch.color);
      if (color) this.options.color = rgbToHex(color.r, color.g, color.b);
    }
    if (Number.isFinite(patch.alpha)) this.options.alpha = clamp(patch.alpha, 0, 1);
    if (Number.isFinite(patch.size)) this.options.size = clamp(patch.size, 1, 50);
    if (typeof patch.pressure === 'boolean') this.options.pressure = patch.pressure;
    if (typeof patch.touchDrawing === 'boolean') this.options.touchDrawing = patch.touchDrawing;
    return { ...this.options };
  }

  fit() {
    if (this.destroyed) return;
    const bounds = this.parent.getBoundingClientRect();
    const width = Math.max(1, Math.round(bounds.width));
    const height = Math.max(1, Math.round(bounds.height));
    const expanded = width > this.width || height > this.height;
    if (expanded) {
      this.input.cancel();
      const previous = this.canvas.ownerDocument.createElement('canvas');
      previous.width = this.documentCanvas.width;
      previous.height = this.documentCanvas.height;
      previous.getContext('2d').drawImage(this.documentCanvas, 0, 0);
      const oldWidth = this.width;
      const oldHeight = this.height;
      this.createDocument(Math.max(width, oldWidth), Math.max(height, oldHeight));
      this.context.drawImage(previous, 0, 0, oldWidth * this.scaleX, oldHeight * this.scaleY);
    }
    this.viewportWidth = width;
    this.viewportHeight = height;
    const ratio = backingRatio(width, height, clamp(this.view.devicePixelRatio || 1, 1, 2));
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    const pixelWidth = Math.max(1, Math.round(width * ratio));
    const pixelHeight = Math.max(1, Math.round(height * ratio));
    if (this.canvas.width !== pixelWidth) this.canvas.width = pixelWidth;
    if (this.canvas.height !== pixelHeight) this.canvas.height = pixelHeight;
    this.render();
    if (expanded) this.callbacks.onChange();
  }

  render() {
    if (this.destroyed) return;
    const context = this.displayContext;
    context.save();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.globalAlpha = 1;
    context.globalCompositeOperation = 'source-over';
    context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const width = this.width * this.canvas.width / this.viewportWidth;
    const height = this.height * this.canvas.height / this.viewportHeight;
    context.drawImage(this.documentCanvas, 0, 0, width, height);
    if (this.operation) {
      const { alpha, composite } = layerStyle(this.operation.options);
      context.globalAlpha = alpha;
      context.globalCompositeOperation = composite;
      context.drawImage(this.layerCanvas, 0, 0, width, height);
    }
    context.restore();
    this.callbacks.onRender();
  }

  toPoint(event, pressure = 1) {
    const bounds = this.canvas.getBoundingClientRect();
    return {
      x: (event.clientX - bounds.left) / bounds.width * this.viewportWidth,
      y: (event.clientY - bounds.top) / bounds.height * this.viewportHeight,
      pressure,
    };
  }

  prepareLayer(options) {
    const context = this.layerContext;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, this.layerCanvas.width, this.layerCanvas.height);
    context.setTransform(this.scaleX, 0, 0, this.scaleY, 0, 0);
    context.globalAlpha = 1;
    context.globalCompositeOperation = 'source-over';
    context.fillStyle = options.tool === 'eraser' ? '#ffffff' : options.color;
    context.strokeStyle = context.fillStyle;
  }

  startOperation(event) {
    if (this.destroyed) return false;
    const pressure = event.pointerType === 'pen' && event.pressure > 0 ? clamp(event.pressure, 0, 1) : 1;
    const start = this.toPoint(event, pressure);
    if (!Number.isFinite(start.x) || !Number.isFinite(start.y)
      || start.x < 0 || start.y < 0 || start.x >= this.width || start.y >= this.height) return false;
    this.loadVersion += 1;
    const temporaryEraser = (event.pointerType || 'mouse') === 'mouse' && event.button === 2;
    this.operation = {
      options: { ...this.options, ...(temporaryEraser ? { tool: 'eraser' } : {}) }, start, current: start, points: [start],
      pointerType: event.pointerType || 'mouse', clientX: event.clientX, clientY: event.clientY,
    };
    this.canvas.toggleAttribute('data-temporary-eraser', temporaryEraser);
    this.prepareLayer(this.operation.options);
    if (FREEHAND_TOOLS.has(this.operation.options.tool)) paintFreehand(this.layerContext, this.operation);
    if (this.operation.options.tool === 'airbrush') spray(this.layerContext, start, this.operation.options.size);
    this.render();
    return true;
  }

  moveOperation(samples) {
    if (!this.operation) return;
    const operation = this.operation;
    for (const event of samples) {
      const previous = operation.current;
      const pressure = operation.pointerType === 'pen' && event.pressure > 0 ? clamp(event.pressure, 0, 1) : previous.pressure;
      const point = this.toPoint(event, pressure);
      if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) continue;
      if (point.x === previous.x && point.y === previous.y) continue;
      operation.current = point;
      if (FREEHAND_TOOLS.has(operation.options.tool)) operation.points.push(point);
      if (operation.options.tool === 'airbrush') {
        const distance = Math.hypot(point.x - previous.x, point.y - previous.y);
        const count = Math.max(1, Math.ceil(distance / Math.max(1, operation.options.size / 2)));
        for (let index = 1; index <= count; index += 1) {
          spray(this.layerContext, {
            x: previous.x + (point.x - previous.x) * index / count,
            y: previous.y + (point.y - previous.y) * index / count,
          }, operation.options.size);
        }
      }
    }
    if (this.previewFrame === null) {
      this.previewFrame = this.view.requestAnimationFrame(() => {
        this.previewFrame = null;
        this.refreshPreview();
      });
    }
  }

  refreshPreview() {
    const operation = this.operation;
    if (!operation) return;
    if (FREEHAND_TOOLS.has(operation.options.tool) || SHAPE_TOOLS.has(operation.options.tool)) {
      this.prepareLayer(operation.options);
      if (FREEHAND_TOOLS.has(operation.options.tool)) paintFreehand(this.layerContext, operation);
      else paintShape(this.layerContext, operation);
    }
    this.render();
  }

  finishOperation() {
    if (!this.operation) return;
    this.cancelPreviewFrame();
    this.refreshPreview();
    const operation = this.operation;
    this.operation = null;
    this.canvas.removeAttribute('data-temporary-eraser');
    if (operation.options.tool === 'text') {
      this.render();
      this.callbacks.onTextRequest({ x: operation.start.x, y: operation.start.y, clientX: operation.clientX, clientY: operation.clientY });
      return;
    }
    if (operation.options.tool === 'bucket') {
      const pixels = this.snapshot();
      const color = { ...parseColor(operation.options.color), a: operation.options.alpha };
      if (floodFill(pixels, operation.start.x * this.scaleX, operation.start.y * this.scaleY, color)) {
        this.context.putImageData(pixels, 0, 0);
        this.commit();
      } else this.render();
      return;
    }
    const { alpha, composite } = layerStyle(operation.options);
    this.context.save();
    this.context.setTransform(1, 0, 0, 1, 0, 0);
    this.context.globalAlpha = alpha;
    this.context.globalCompositeOperation = composite;
    this.context.drawImage(this.layerCanvas, 0, 0);
    this.context.restore();
    this.commit();
  }

  cancelOperation() {
    this.cancelPreviewFrame();
    this.operation = null;
    this.canvas.removeAttribute('data-temporary-eraser');
    this.render();
  }

  cancelPreviewFrame() {
    if (this.previewFrame !== null) this.view.cancelAnimationFrame(this.previewFrame);
    this.previewFrame = null;
  }

  snapshot() {
    const snapshot = this.context.getImageData(0, 0, this.documentCanvas.width, this.documentCanvas.height);
    snapshot.logicalWidth = this.width;
    snapshot.logicalHeight = this.height;
    return snapshot;
  }

  notifyHistory() {
    this.callbacks.onHistoryChange({ canUndo: this.history.canUndo, canRedo: this.history.canRedo });
  }

  commit() {
    const changed = this.history.push(this.snapshot());
    this.render();
    if (changed) {
      this.notifyHistory();
      this.callbacks.onChange();
    }
    return changed;
  }

  undo() { return this.restoreHistory('undo'); }
  redo() { return this.restoreHistory('redo'); }

  restoreHistory(direction) {
    if (this.destroyed) return false;
    this.input.cancel();
    this.loadVersion += 1;
    const snapshot = this.history[direction]();
    if (!snapshot) return false;
    this.context.fillStyle = '#ffffff';
    this.context.fillRect(0, 0, this.documentCanvas.width, this.documentCanvas.height);
    if (snapshot.width / snapshot.logicalWidth === this.scaleX && snapshot.height / snapshot.logicalHeight === this.scaleY) {
      this.context.putImageData(snapshot, 0, 0);
    } else {
      const previous = this.canvas.ownerDocument.createElement('canvas');
      previous.width = snapshot.width;
      previous.height = snapshot.height;
      previous.getContext('2d').putImageData(snapshot, 0, 0);
      this.context.drawImage(previous, 0, 0, snapshot.logicalWidth * this.scaleX, snapshot.logicalHeight * this.scaleY);
    }
    this.render();
    this.notifyHistory();
    this.callbacks.onChange();
    return true;
  }

  clear() {
    if (this.destroyed) return false;
    this.input.cancel();
    this.loadVersion += 1;
    this.context.save();
    this.context.setTransform(1, 0, 0, 1, 0, 0);
    this.context.globalAlpha = 1;
    this.context.globalCompositeOperation = 'source-over';
    this.context.fillStyle = '#ffffff';
    this.context.fillRect(0, 0, this.documentCanvas.width, this.documentCanvas.height);
    this.context.restore();
    return this.commit();
  }

  addText(text, { x, y } = {}) {
    if (this.destroyed || typeof text !== 'string' || !text.trim() || !Number.isFinite(x) || !Number.isFinite(y)) return false;
    this.input.cancel();
    this.loadVersion += 1;
    this.context.save();
    this.context.setTransform(this.scaleX, 0, 0, this.scaleY, 0, 0);
    this.context.globalCompositeOperation = 'source-over';
    this.context.globalAlpha = this.options.alpha;
    this.context.fillStyle = this.options.color;
    const fontSize = this.options.size * 3 + 10;
    this.context.font = `${fontSize}px sans-serif`;
    this.context.textBaseline = 'top';
    text.split('\n').forEach((line, index) => this.context.fillText(line, x, y + index * fontSize * 1.2));
    this.context.restore();
    return this.commit();
  }

  toDataURL() {
    return this.documentCanvas.toDataURL('image/png');
  }

  toBlob() {
    return new Promise((resolve, reject) => {
      this.documentCanvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('The drawing could not be exported.')), 'image/png');
    });
  }

  async loadBlob(blob, dimensions = {}) {
    if (this.destroyed) return false;
    this.input.cancel();
    const version = ++this.loadVersion;
    const bitmap = await this.view.createImageBitmap(blob);
    try {
      if (this.destroyed || version !== this.loadVersion) return false;
      const width = Number.isFinite(dimensions.width) && dimensions.width > 0 ? dimensions.width : bitmap.width;
      const height = Number.isFinite(dimensions.height) && dimensions.height > 0 ? dimensions.height : bitmap.height;
      this.createDocument(width, height);
      this.context.drawImage(bitmap, 0, 0, this.documentCanvas.width, this.documentCanvas.height);
      this.history.reset(this.snapshot());
      this.fit();
      this.notifyHistory();
      this.callbacks.onChange();
      return true;
    } finally {
      bitmap.close();
    }
  }

  destroy() {
    if (this.destroyed) return;
    this.input.destroy();
    this.destroyed = true;
    this.loadVersion += 1;
    this.resizeObserver?.disconnect();
    this.view.removeEventListener('resize', this.onResize);
  }
}
