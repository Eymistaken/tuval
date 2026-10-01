import { createLensMap } from './glass-lens.js';

const SVG = 'http://www.w3.org/2000/svg';
const PADDING = 12;
const svgElement = (name, attributes) => {
  const element = document.createElementNS(SVG, name);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
  return element;
};

/** Decorative local backdrops never modify the drawing or handle input. */
export function createGlass(source) {
  const forcedColors = matchMedia('(forced-colors: active)');
  const reducedTransparency = matchMedia('(prefers-reduced-transparency: reduce)');
  const definitions = svgElement('svg', { width: 0, height: 0, 'aria-hidden': 'true', focusable: 'false' });
  definitions.classList.add('glass-definitions');
  const defs = svgElement('defs', {});
  definitions.append(defs);
  document.body.append(definitions);
  const surfaces = ['dock', 'dock-orb'].map((id) => {
    const element = document.getElementById(id);
    const backdrop = document.createElement('canvas');
    backdrop.className = 'glass-refraction';
    backdrop.setAttribute('aria-hidden', 'true');
    const filter = svgElement('filter', { id: `${id}-lens`, x: 0, y: 0, width: '100%', height: '100%', 'color-interpolation-filters': 'sRGB' });
    const image = svgElement('feImage', { result: 'lens', preserveAspectRatio: 'none' });
    filter.append(image, svgElement('feDisplacementMap', { in: 'SourceGraphic', in2: 'lens', scale: 24, xChannelSelector: 'R', yChannelSelector: 'G' }), svgElement('feGaussianBlur', { stdDeviation: 0.45 }));
    defs.append(filter);
    backdrop.style.filter = `url(#${id}-lens) saturate(1.12)`;
    element.prepend(backdrop);
    return { element, backdrop, context: backdrop.getContext('2d'), image, geometry: '' };
  });
  let frame = null;

  function render() {
    frame = null;
    if (forcedColors.matches || reducedTransparency.matches || document.hidden) return;
    const sourceBox = source.getBoundingClientRect();
    if (!sourceBox.width || !sourceBox.height) return;
    for (const surface of surfaces) {
      const { element, backdrop, context, image } = surface;
      if (element.hidden || (element.id === 'dock' && element.dataset.state !== 'open')) continue;
      const box = element.getBoundingClientRect();
      const width = Math.round(element.clientWidth);
      const height = Math.round(element.clientHeight);
      if (!width || !height) continue;
      const radius = parseFloat(getComputedStyle(element).borderTopLeftRadius);
      const geometry = `${width}:${height}:${radius}`;
      if (surface.geometry !== geometry) {
        const map = createLensMap(width, height, radius, PADDING);
        const mapping = document.createElement('canvas');
        mapping.width = backdrop.width = map.width;
        mapping.height = backdrop.height = map.height;
        mapping.getContext('2d').putImageData(new ImageData(map.pixels, map.width, map.height), 0, 0);
        image.setAttribute('width', map.width);
        image.setAttribute('height', map.height);
        const url = mapping.toDataURL();
        image.setAttribute('href', url);
        image.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', url);
        backdrop.style.width = `${map.width}px`;
        backdrop.style.height = `${map.height}px`;
        surface.geometry = geometry;
      }
      const scaleX = source.width / sourceBox.width;
      const scaleY = source.height / sourceBox.height;
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, backdrop.width, backdrop.height);
      // Include neighboring pixels so refraction at an edge never samples an empty crop.
      context.drawImage(source, (box.left + element.clientLeft - sourceBox.left - PADDING) * scaleX,
        (box.top + element.clientTop - sourceBox.top - PADDING) * scaleY,
        backdrop.width * scaleX, backdrop.height * scaleY, 0, 0, backdrop.width, backdrop.height);
    }
  }
  const refresh = () => {
    if (frame === null) frame = requestAnimationFrame(render);
  };
  const observer = new MutationObserver(refresh);
  const resize = new ResizeObserver(refresh);
  for (const { element } of surfaces) {
    observer.observe(element, { attributes: true, attributeFilter: ['hidden', 'style', 'data-state', 'data-orientation'] });
    resize.observe(element);
    element.addEventListener('pointermove', (event) => {
      if (event.pointerType !== 'mouse' || event.buttons) return;
      const box = element.getBoundingClientRect();
      element.style.setProperty('--glass-light-x', `${(event.clientX - box.left) / box.width * 100}%`);
    }, { passive: true });
  }
  forcedColors.addEventListener('change', refresh);
  reducedTransparency.addEventListener('change', refresh);
  document.addEventListener('visibilitychange', refresh);
  refresh();
  return { refresh };
}
