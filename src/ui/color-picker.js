import { parseColor, rgbToHex, rgbToHsv, hsvToRgb } from '../engine/color.js';
import { openDialog } from './dialogs.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function createColorPicker(onChoose) {
  const dialog = document.querySelector('#color-dialog');
  const area = document.querySelector('#color-sv');
  const indicator = document.querySelector('#sv-indicator');
  const hue = document.querySelector('#color-hue');
  const alpha = document.querySelector('#color-alpha');
  const input = document.querySelector('#color-input');
  const formatButton = document.querySelector('#color-format');
  const error = document.querySelector('#color-error');
  let state = { h: 150, s: 100, v: 100, a: 1 };
  let format = 'HEX';
  let activePointer = null;

  const update = () => {
    const rgb = hsvToRgb(state.h, state.s, state.v);
    const hex = rgbToHex(rgb.r, rgb.g, rgb.b).toUpperCase();
    area.style.setProperty('--hue', state.h);
    indicator.style.left = `${state.s}%`;
    indicator.style.top = `${100 - state.v}%`;
    area.setAttribute('aria-valuenow', Math.round(state.s));
    area.setAttribute('aria-valuetext', `${Math.round(state.s)}% saturation, ${Math.round(state.v)}% brightness`);
    hue.value = state.h;
    alpha.value = Math.round(state.a * 100);
    document.querySelector('#hue-value').textContent = `${Math.round(state.h)}°`;
    document.querySelector('#alpha-value').textContent = `${Math.round(state.a * 100)}%`;
    document.querySelector('#color-preview').style.setProperty('--preview-color', `rgba(${rgb.r},${rgb.g},${rgb.b},${state.a})`);
    document.querySelector('#color-format-label').textContent = format;
    formatButton.textContent = format === 'HEX' ? 'RGB' : 'HEX';
    formatButton.setAttribute('aria-label', `Switch to ${format === 'HEX' ? 'RGB' : 'HEX'} input`);
    if (format === 'HEX') input.value = hex;
    else input.value = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${Number(state.a.toFixed(2))})`;
    error.textContent = '';
    input.removeAttribute('aria-invalid');
  };
  const applyInput = () => {
    const parsed = parseColor(input.value.trim());
    if (!parsed) {
      error.textContent = 'Enter a HEX color or rgb(0, 0, 0).';
      input.setAttribute('aria-invalid', 'true');
      return false;
    }
    const hsv = rgbToHsv(parsed.r, parsed.g, parsed.b);
    state = { ...hsv, a: /^(rgba|#(?:[\da-f]{4}|[\da-f]{8})$)/i.test(input.value.trim()) ? parsed.a : state.a };
    update();
    return true;
  };
  const choose = () => {
    if (!applyInput()) { input.focus(); return; }
    const rgb = hsvToRgb(state.h, state.s, state.v);
    onChoose({ color: rgbToHex(rgb.r, rgb.g, rgb.b), alpha: state.a });
    dialog.close();
  };
  const drag = (event) => {
    const rect = area.getBoundingClientRect();
    state.s = clamp((event.clientX - rect.left) / rect.width * 100, 0, 100);
    state.v = 100 - clamp((event.clientY - rect.top) / rect.height * 100, 0, 100);
    update();
  };
  area.addEventListener('pointerdown', (event) => {
    if (activePointer !== null || event.button !== 0) return;
    activePointer = event.pointerId;
    area.setPointerCapture(event.pointerId);
    drag(event);
  });
  area.addEventListener('pointermove', (event) => {
    if (event.pointerId === activePointer) drag(event);
  });
  const endDrag = () => { activePointer = null; };
  area.addEventListener('pointerup', endDrag);
  area.addEventListener('pointercancel', endDrag);
  area.addEventListener('lostpointercapture', endDrag);
  area.addEventListener('keydown', (event) => {
    const step = event.shiftKey ? 10 : 1;
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'ArrowLeft') state.s = clamp(state.s - step, 0, 100);
    if (event.key === 'ArrowRight') state.s = clamp(state.s + step, 0, 100);
    if (event.key === 'ArrowUp') state.v = clamp(state.v + step, 0, 100);
    if (event.key === 'ArrowDown') state.v = clamp(state.v - step, 0, 100);
    update();
  });
  hue.addEventListener('input', () => { state.h = Number(hue.value) % 360; update(); });
  alpha.addEventListener('input', () => { state.a = Number(alpha.value) / 100; update(); });
  input.addEventListener('change', applyInput);
  input.addEventListener('keydown', (event) => { if (event.key === 'Enter') { event.preventDefault(); choose(); } });
  formatButton.addEventListener('click', () => { if (applyInput()) { format = format === 'HEX' ? 'RGB' : 'HEX'; update(); } });
  document.querySelector('#color-done').addEventListener('click', choose);
  return {
    open(options) {
      const rgb = parseColor(options.color);
      state = { ...rgbToHsv(rgb.r, rgb.g, rgb.b), a: options.alpha };
      update();
      openDialog('color-dialog');
    },
  };
}
