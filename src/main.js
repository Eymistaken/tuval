import { DrawingEngine } from './engine/canvas.js';
import { parseColor } from './engine/color.js';
import { mountIcons } from './ui/icons.js';
import { createToolbar, TOOLS } from './ui/toolbar.js';
import { createColorPicker } from './ui/color-picker.js';
import { bindDialogs, openDialog, toast, createTextEditor } from './ui/dialogs.js';
import { loadDrawing, saveDrawing, saveRecovery, loadSettings, saveSettings } from './storage.js';

mountIcons();
bindDialogs();
const canvas = document.querySelector('#canvas');
const status = document.querySelector('#save-status');
const statusText = document.querySelector('#save-status-text');
let revision = 0;
let persistedRevision = 0;
let changedAt = 0;
let saveTimer;
let saveQueue = Promise.resolve();
let toolbar;
let editor;
let ready = false;

function setStatus(message, state = 'saved') {
  statusText.textContent = message;
  status.dataset.state = state;
}

const engine = new DrawingEngine(canvas, {
  onChange() {
    document.querySelector('#canvas-dimensions').textContent = `${Math.round(engine.width)} × ${Math.round(engine.height)}`;
    if (!ready) return;
    revision += 1;
    changedAt = Math.max(Date.now(), changedAt + 1);
    setStatus('Saving your drawing…', 'saving');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(queueSave, 180);
  },
  onHistoryChange({ canUndo, canRedo }) {
    document.querySelector('#btn-undo').disabled = !canUndo;
    document.querySelector('#btn-redo').disabled = !canRedo;
  },
  onTextRequest(point) { editor?.open(point); },
});

function queueSave() {
  clearTimeout(saveTimer);
  saveTimer = null;
  // Queue before encoding: an older PNG must never overwrite a newer drawing.
  saveQueue = saveQueue.catch(() => {}).then(async () => {
    const currentRevision = revision;
    const snapshotAt = changedAt;
    const dimensions = engine.dimensions;
    const blob = await engine.toBlob();
    await saveDrawing({ blob, ...dimensions, changedAt: snapshotAt });
    persistedRevision = Math.max(persistedRevision, currentRevision);
    if (currentRevision === revision) setStatus('Saved on this device');
  }).catch(() => {
    setStatus('Autosave unavailable. Save a PNG to keep your work.', 'error');
  });
  return saveQueue;
}

function updateOptions(changes) {
  engine.setOptions(changes);
  toolbar?.update(engine.options);
  document.querySelector('#pressure-toggle').checked = engine.options.pressure;
  document.querySelector('#touch-toggle').checked = engine.options.touchDrawing;
  document.querySelector('#opacity-slider').value = Math.round(engine.options.alpha * 100);
  document.querySelector('#opacity-value').textContent = `${Math.round(engine.options.alpha * 100)}%`;
  saveSettings(engine.options);
}

function chooseTool(tool) {
  editor?.close();
  updateOptions({ tool });
}

function chooseColor(color, alpha = engine.options.alpha) {
  updateOptions({ color, alpha, ...(engine.options.tool === 'eraser' ? { tool: 'pen' } : {}) });
}

toolbar = createToolbar({ onTool: chooseTool, onColor: chooseColor, onSize: (size) => updateOptions({ size }) });
editor = createTextEditor((text, point) => engine.addText(text, point));
const picker = createColorPicker(({ color, alpha }) => chooseColor(color, alpha));
const saved = loadSettings();
const options = {};
if (parseColor(saved.color)) options.color = saved.color;
if (TOOLS.some((tool) => tool.id === saved.tool)) options.tool = saved.tool;
if (Number.isFinite(saved.size)) options.size = Math.max(1, Math.min(50, saved.size));
if (Number.isFinite(saved.alpha)) options.alpha = Math.max(0, Math.min(1, saved.alpha));
if (typeof saved.pressure === 'boolean') options.pressure = saved.pressure;
if (typeof saved.touchDrawing === 'boolean') options.touchDrawing = saved.touchDrawing;
updateOptions(options);

document.querySelector('#btn-color').addEventListener('click', () => picker.open(engine.options));
document.querySelector('#btn-settings').addEventListener('click', () => openDialog('settings-dialog'));
document.querySelector('#btn-help').addEventListener('click', () => openDialog('help-dialog'));
document.querySelector('#btn-clear').addEventListener('click', () => openDialog('clear-dialog'));
document.querySelector('#clear-confirm').addEventListener('click', () => {
  editor.close();
  engine.clear();
  document.querySelector('#clear-dialog').close();
  toast('A fresh canvas. Undo brings your drawing back.');
});
document.querySelector('#btn-undo').addEventListener('click', () => { editor.close(); engine.undo(); });
document.querySelector('#btn-redo').addEventListener('click', () => { editor.close(); engine.redo(); });
document.querySelector('#pressure-toggle').addEventListener('change', (event) => updateOptions({ pressure: event.target.checked }));
document.querySelector('#touch-toggle').addEventListener('change', (event) => updateOptions({ touchDrawing: event.target.checked }));
document.querySelector('#opacity-slider').addEventListener('input', (event) => updateOptions({ alpha: Number(event.target.value) / 100 }));

async function exportPng() {
  const button = document.querySelector('#btn-export');
  if (button.disabled || !ready) return;
  button.disabled = true;
  try {
    const blob = await engine.toBlob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tuval-${new Date().toISOString().slice(0, 10)}.png`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    toast('Your canvas is ready as a PNG.');
  } catch { toast('Could not export. Please try again.'); }
  finally { button.disabled = false; }
}
document.querySelector('#btn-export').addEventListener('click', exportPng);

document.addEventListener('keydown', (event) => {
  if (event.target.closest('input, textarea, [contenteditable="true"], dialog[open]')) return;
  if (document.querySelector('dialog[open]') || !ready) return;
  const key = event.key.toLowerCase();
  if (event.ctrlKey || event.metaKey) {
    if (key === 'z') { event.preventDefault(); editor.close(); event.shiftKey ? engine.redo() : engine.undo(); }
    else if (key === 'y') { event.preventDefault(); editor.close(); engine.redo(); }
    else if (key === 's') { event.preventDefault(); exportPng(); }
    return;
  }
  if (event.altKey) return;
  const tool = TOOLS.find((entry) => entry.key.toLowerCase() === key);
  if (tool) { event.preventDefault(); chooseTool(tool.id); }
  if (key === '[' || key === ']') { event.preventDefault(); updateOptions({ size: Math.max(1, Math.min(50, engine.options.size + (key === ']' ? 1 : -1))) }); }
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && ready && saveTimer) queueSave();
});

function preserveUnsavedDrawing() {
  if (!ready || revision <= persistedRevision) return;
  if (!saveRecovery({ dataUrl: engine.toDataURL(), width: engine.width, height: engine.height, changedAt })) {
    setStatus('Recovery storage is full. Save a PNG to keep your work.', 'error');
  }
}
// Navigation may end async work before IndexedDB finishes; this is a synchronous fallback.
window.addEventListener('pagehide', preserveUnsavedDrawing);
window.addEventListener('beforeunload', preserveUnsavedDrawing);

try {
  const drawing = await loadDrawing();
  if (drawing) {
    changedAt = drawing.changedAt ?? drawing.updatedAt ?? Date.now();
    await engine.loadBlob(drawing.blob, drawing.width ? { width: drawing.width, height: drawing.height } : undefined);
    if (drawing.storageUnavailable) setStatus('Autosave unavailable. Save a PNG to keep your work.', 'error');
    else if (drawing.legacy || drawing.recovered) {
      const dimensions = engine.dimensions;
      await saveDrawing({ blob: await engine.toBlob(), ...dimensions, changedAt });
      setStatus(drawing.legacy ? 'Your previous drawing is restored' : 'Saved on this device');
    } else setStatus('Saved on this device');
  }
} catch {
  setStatus('Autosave unavailable. Save a PNG to keep your work.', 'error');
}
ready = true;
document.querySelector('#canvas-dimensions').textContent = `${Math.round(engine.width)} × ${Math.round(engine.height)}`;
document.querySelector('#loading-state').hidden = true;
