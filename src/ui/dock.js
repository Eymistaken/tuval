import { clampAnchor, dockOrientation, placeDock, transformBetween } from './dock-geometry.js';

/** The panel and button share one anchor; motion changes presentation, never drawing state. */
export function createDock({ onLayout }) {
  const dock = document.querySelector('#dock');
  const content = dock.querySelector('.dock-content');
  const orb = document.querySelector('#dock-orb');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let anchor = null;
  let expanded = true;
  let drag = null;
  let animations = [];
  let motionVersion = 0;

  const safeBounds = () => {
    const style = getComputedStyle(document.documentElement);
    const inset = (side) => Math.max(12, parseFloat(style.getPropertyValue(`--safe-${side}`)) || 0);
    return { left: inset('left'), top: inset('top'), right: innerWidth - inset('right'), bottom: innerHeight - inset('bottom') };
  };
  const point = (bounds) => clampAnchor(anchor || { x: innerWidth / 2, y: bounds.bottom - 26 }, bounds);
  const placeOrb = (bounds) => {
    const position = point(bounds);
    if (anchor) anchor = position;
    orb.style.left = `${position.x - 26}px`;
    orb.style.top = `${position.y - 26}px`;
    orb.style.bottom = 'auto';
  };
  const placePanel = (bounds) => {
    dock.dataset.orientation = dockOrientation(point(bounds), bounds);
    const position = placeDock(point(bounds), dock.offsetWidth, dock.offsetHeight, bounds);
    dock.style.left = `${position.left}px`;
    dock.style.top = `${position.top}px`;
    onLayout();
  };
  const cancelMotion = () => {
    motionVersion += 1;
    animations.forEach((animation) => animation.cancel());
    animations = [];
  };
  const finish = (focus = false) => {
    dock.hidden = !expanded;
    orb.hidden = expanded;
    content.inert = !expanded;
    dock.dataset.state = expanded ? 'open' : 'closed';
    orb.setAttribute('aria-expanded', String(expanded));
    if (focus) {
      const target = expanded ? dock.querySelector('[data-tool][aria-pressed="true"]') : orb;
      target.focus({ preventScroll: true });
      if (expanded) target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  };
  const layout = () => {
    cancelMotion();
    finish();
    const bounds = safeBounds();
    placeOrb(bounds);
    if (expanded) placePanel(bounds);
  };

  async function toggle(show) {
    const from = dock.hidden ? orb.getBoundingClientRect() : dock.getBoundingClientRect();
    const opacity = dock.hidden ? 0 : Number(getComputedStyle(dock).opacity);
    const contentOpacity = dock.hidden ? 0 : Number(getComputedStyle(content).opacity);
    cancelMotion();
    const version = motionVersion;
    expanded = show;
    const bounds = safeBounds();
    placeOrb(bounds);
    dock.hidden = false;
    if (show) placePanel(bounds);
    const panel = dock.getBoundingClientRect();
    // A hidden button has no layout box; its fixed size and shared anchor define the target.
    const target = { left: parseFloat(orb.style.left), top: parseFloat(orb.style.top), width: 52, height: 52 };
    dock.dataset.state = show ? 'opening' : 'closing';
    content.inert = !show;
    orb.hidden = show;
    if (reducedMotion.matches) { finish(true); return; }
    const timing = { duration: 360, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'both' };
    animations = [
      dock.animate([
        { transform: transformBetween(from, panel), opacity },
        { transform: show ? 'none' : transformBetween(target, panel), opacity: show ? 1 : 0.2 },
      ], timing),
      content.animate(show
        ? [{ opacity: contentOpacity }, { opacity: 0, offset: 0.2 }, { opacity: 1 }]
        : [{ opacity: contentOpacity }, { opacity: 0, offset: 0.35 }, { opacity: 0 }], timing),
    ];
    if (!show) animations.push(orb.animate([{ opacity: 0 }, { opacity: 1 }], timing));
    await Promise.allSettled(animations.map((animation) => animation.finished));
    if (version !== motionVersion) return;
    animations.forEach((animation) => animation.cancel());
    animations = [];
    finish(true);
  }

  document.querySelector('#btn-collapse').addEventListener('click', () => toggle(false));
  orb.setAttribute('aria-controls', 'dock');
  orb.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || drag) return;
    event.preventDefault();
    const bounds = safeBounds();
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, point: point(bounds), original: anchor, bounds, moved: false };
    orb.setPointerCapture(event.pointerId);
  });
  orb.addEventListener('pointermove', (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (!drag.moved) {
      if (Math.hypot(dx, dy) <= 5) return;
      drag.moved = true;
      cancelMotion();
      finish();
    }
    anchor = clampAnchor({ x: drag.point.x + dx, y: drag.point.y + dy }, drag.bounds);
    placeOrb(drag.bounds);
  });
  orb.addEventListener('pointerup', (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    const moved = drag.moved;
    drag = null;
    if (orb.hasPointerCapture(event.pointerId)) orb.releasePointerCapture(event.pointerId);
    if (moved) layout();
    else toggle(true);
  });
  const cancelDrag = (event) => {
    if (!drag || (event?.pointerId !== undefined && event.pointerId !== drag.id)) return;
    const id = drag.id;
    anchor = drag.original;
    drag = null;
    if (orb.hasPointerCapture(id)) orb.releasePointerCapture(id);
    layout();
  };
  orb.addEventListener('pointercancel', cancelDrag);
  orb.addEventListener('lostpointercapture', cancelDrag);
  orb.addEventListener('click', (event) => { if (event.detail === 0) toggle(true); });
  window.addEventListener('blur', cancelDrag);
  window.addEventListener('resize', () => { cancelDrag(); layout(); });
  reducedMotion.addEventListener('change', layout);
  layout();
  return { get orientation() { return dock.dataset.orientation; }, get expanded() { return expanded; } };
}
