import { icon } from './icons.js';
import { createDock } from './dock.js';

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
  list.innerHTML = TOOLS.map(({ id, name, key }) => `<button class="tool-button" id="btn-${id}" data-tool="${id}" aria-label="${name}" aria-pressed="${id === 'pen'}" title="${name} (${key})">${icon(id)}</button>`).join('');
  const presets = document.querySelector('#color-presets');
  presets.innerHTML = PRESETS.map(({ color, name }) => `<button class="color-swatch" data-color="${color}" aria-label="${name} color" aria-pressed="${color === '#202923'}" title="${name}"><svg class="swatch-fill" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="${color}" /></svg></button>`).join('');

  list.addEventListener('click', (event) => {
    const button = event.target.closest('[data-tool]');
    if (button) onTool(button.dataset.tool);
  });
  list.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const buttons = [...list.querySelectorAll('button')];
    let index = buttons.indexOf(document.activeElement);
    if (event.key === 'Home') index = 0;
    else if (event.key === 'End') index = buttons.length - 1;
    else index = (index + (['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : -1) + buttons.length) % buttons.length;
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
  const dock = document.querySelector('#dock');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const scroll = (direction) => {
    const vertical = dock.dataset.orientation === 'vertical';
    list.scrollBy({ [vertical ? 'top' : 'left']: direction * (vertical ? list.clientHeight : list.clientWidth) * 0.75, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
  };
  previous.addEventListener('click', () => scroll(-1));
  next.addEventListener('click', () => scroll(1));
  const updateScroll = () => {
    const vertical = dock.dataset.orientation === 'vertical';
    list.setAttribute('aria-orientation', vertical ? 'vertical' : 'horizontal');
    const available = (vertical ? list.parentElement.clientHeight : list.parentElement.clientWidth) + 2;
    const style = getComputedStyle(list);
    const contentSize = [...list.children].reduce((total, child) => total + (vertical ? child.offsetHeight : child.offsetWidth), 0)
      + (parseFloat(vertical ? style.rowGap : style.columnGap) || 0) * (list.children.length - 1)
      + parseFloat(vertical ? style.paddingTop : style.paddingLeft) + parseFloat(vertical ? style.paddingBottom : style.paddingRight);
    const overflow = contentSize > available;
    previous.hidden = !overflow;
    next.hidden = !overflow;
    const position = vertical ? list.scrollTop : list.scrollLeft;
    previous.disabled = position <= 1;
    next.disabled = position + (vertical ? list.clientHeight : list.clientWidth) >= (vertical ? list.scrollHeight : list.scrollWidth) - 2;
  };
  list.addEventListener('scroll', updateScroll, { passive: true });
  new ResizeObserver(updateScroll).observe(list);

  const controller = createDock({ onLayout: updateScroll });

  return {
    update(options) {
      list.querySelectorAll('[data-tool]').forEach((button) => {
        button.setAttribute('aria-pressed', String(button.dataset.tool === options.tool));
      });
      const active = list.querySelector('[aria-pressed="true"]');
      if (controller.expanded) active?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      presets.querySelectorAll('[data-color]').forEach((button) => {
        button.setAttribute('aria-pressed', String(button.dataset.color.toUpperCase() === options.color.toUpperCase()));
      });
      document.querySelector('#btn-color').setAttribute('aria-pressed', String(!PRESETS.some((preset) => preset.color.toUpperCase() === options.color.toUpperCase())));
      document.querySelector('#current-color-label').textContent = options.color.toUpperCase();
      document.querySelector('#size-value').textContent = `${options.size} px`;
      size.value = options.size;
      document.querySelector('#canvas').dataset.tool = options.tool;
      updateScroll();
    },
  };
}
