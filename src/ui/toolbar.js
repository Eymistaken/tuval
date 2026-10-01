import { icon } from './icons.js';

export const TOOLS = [
  { id: 'pen', name: 'Pen', key: 'P' },
  { id: 'marker', name: 'Marker', key: 'M' },
  { id: 'airbrush', name: 'Spray', key: 'A' },
  { id: 'rect', name: 'Rectangle', key: 'R' },
  { id: 'circle', name: 'Circle', key: 'O' },
  { id: 'line', name: 'Line', key: 'L' },
  { id: 'text', name: 'Text', key: 'T' },
  { id: 'bucket', name: 'Fill', key: 'F' },
  { id: 'eraser', name: 'Eraser', key: 'E' },
];
export const PRESETS = [
  { color: '#202923', name: 'Ink' },
  { color: '#FF3B30', name: 'Red' },
  { color: '#007AFF', name: 'Blue' },
  { color: '#D9923B', name: 'Ochre' },
  { color: '#4F7960', name: 'Forest' },
  { color: '#9A6A9D', name: 'Violet' },
];

export function createToolbar({ onTool, onColor, onSize }) {
  const list = document.querySelector('#tool-list');
  list.innerHTML = TOOLS.map(({ id, name, key }) => `<button class="tool-button" id="btn-${id}" data-tool="${id}" aria-label="${name}" aria-pressed="${id === 'pen'}" title="${name} (${key})">${icon(id)}<span class="tool-name">${name}</span></button>`).join('');
  const presets = document.querySelector('#color-presets');
  presets.innerHTML = PRESETS.map(({ color, name }) => `<button class="color-swatch" data-color="${color}" aria-label="${name} color" aria-pressed="${color === '#202923'}" title="${name}" style="--swatch:${color}"><span class="swatch-fill"></span></button>`).join('');

  list.addEventListener('click', (event) => {
    const button = event.target.closest('[data-tool]');
    if (button) onTool(button.dataset.tool);
  });
  list.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const buttons = [...list.querySelectorAll('button')];
    let index = buttons.indexOf(document.activeElement);
    if (event.key === 'Home') index = 0;
    else if (event.key === 'End') index = buttons.length - 1;
    else index = (index + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
    buttons[index].focus({ preventScroll: true });
    buttons[index].scrollIntoView({ block: 'nearest', inline: 'nearest' });
  });
  presets.addEventListener('click', (event) => {
    const button = event.target.closest('[data-color]');
    if (button) onColor(button.dataset.color);
  });
  const size = document.querySelector('#size-slider');
  size.addEventListener('input', () => onSize(Number(size.value)));

  const previous = document.querySelector('#tools-previous');
  const next = document.querySelector('#tools-next');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const scroll = (direction) => list.scrollBy({ left: direction * list.clientWidth * 0.75, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
  previous.addEventListener('click', () => scroll(-1));
  next.addEventListener('click', () => scroll(1));
  const updateScroll = () => {
    const availableWidth = list.parentElement.clientWidth - document.querySelector('#btn-collapse').offsetWidth + 2;
    const style = getComputedStyle(list);
    const contentWidth = [...list.children].reduce((width, child) => width + child.offsetWidth, 0)
      + parseFloat(style.columnGap) * (list.children.length - 1)
      + parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
    const overflow = contentWidth > availableWidth;
    previous.hidden = !overflow;
    next.hidden = !overflow;
    previous.disabled = list.scrollLeft <= 1;
    next.disabled = list.scrollLeft + list.clientWidth >= list.scrollWidth - 2;
  };
  list.addEventListener('scroll', updateScroll, { passive: true });
  new ResizeObserver(updateScroll).observe(list);

  const dock = document.querySelector('#dock');
  const orb = document.querySelector('#dock-orb');
  document.querySelector('#btn-collapse').addEventListener('click', () => {
    dock.hidden = true;
    orb.hidden = false;
    orb.focus();
  });
  const showDock = () => {
    dock.hidden = false;
    orb.hidden = true;
    list.querySelector('[aria-pressed="true"]').focus({ preventScroll: true });
  };
  let drag = null;
  orb.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || drag) return;
    const rect = orb.getBoundingClientRect();
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, left: rect.left, top: rect.top, moved: false };
    orb.setPointerCapture(event.pointerId);
  });
  orb.addEventListener('pointermove', (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (Math.hypot(dx, dy) > 5) drag.moved = true;
    if (drag.moved) {
      orb.style.left = `${Math.max(8, Math.min(innerWidth - orb.offsetWidth - 8, drag.left + dx))}px`;
      orb.style.top = `${Math.max(8, Math.min(innerHeight - orb.offsetHeight - 8, drag.top + dy))}px`;
      orb.style.bottom = 'auto';
    }
  });
  orb.addEventListener('pointerup', (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    const moved = drag.moved;
    drag = null;
    if (!moved) showDock();
  });
  orb.addEventListener('pointercancel', () => { drag = null; });
  orb.addEventListener('lostpointercapture', () => { drag = null; });
  orb.addEventListener('click', (event) => { if (event.detail === 0) showDock(); });
  window.addEventListener('resize', () => {
    if (!orb.style.top) return;
    const rect = orb.getBoundingClientRect();
    orb.style.left = `${Math.max(8, Math.min(innerWidth - orb.offsetWidth - 8, rect.left))}px`;
    orb.style.top = `${Math.max(8, Math.min(innerHeight - orb.offsetHeight - 8, rect.top))}px`;
  });

  return {
    update(options) {
      list.querySelectorAll('[data-tool]').forEach((button) => {
        button.setAttribute('aria-pressed', String(button.dataset.tool === options.tool));
      });
      const active = list.querySelector('[aria-pressed="true"]');
      if (!dock.hidden) active?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      presets.querySelectorAll('[data-color]').forEach((button) => {
        button.setAttribute('aria-pressed', String(button.dataset.color.toUpperCase() === options.color.toUpperCase()));
      });
      document.querySelector('#btn-color').setAttribute('aria-pressed', String(!PRESETS.some((preset) => preset.color.toUpperCase() === options.color.toUpperCase())));
      document.querySelector('#current-color-label').textContent = options.color.toUpperCase();
      document.querySelector('#size-value').textContent = `${options.size} px`;
      size.value = options.size;
      const preview = document.querySelector('#brush-preview');
      preview.style.setProperty('--brush-preview-size', `${Math.max(3, Math.min(18, options.size))}px`);
      preview.style.setProperty('--brush-color', options.color);
      document.querySelector('#canvas').dataset.tool = options.tool;
      updateScroll();
    },
  };
}
