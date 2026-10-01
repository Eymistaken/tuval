const clamp = (value, min, max) => Math.max(min, Math.min(value, Math.max(min, max)));

export function clampAnchor(anchor, bounds, size = 52) {
  return {
    x: clamp(anchor.x, bounds.left + size / 2, bounds.right - size / 2),
    y: clamp(anchor.y, bounds.top + size / 2, bounds.bottom - size / 2),
  };
}

export function dockOrientation(anchor, bounds) {
  const width = Math.max(1, bounds.right - bounds.left);
  const height = Math.max(1, bounds.bottom - bounds.top);
  const horizontal = Math.min(anchor.y - bounds.top, bounds.bottom - anchor.y) / height;
  const vertical = Math.min(anchor.x - bounds.left, bounds.right - anchor.x) / width;
  return vertical < horizontal ? 'vertical' : 'horizontal';
}

export function placeDock(anchor, width, height, bounds) {
  return {
    left: clamp(anchor.x - width / 2, bounds.left, bounds.right - width),
    top: clamp(anchor.y - height / 2, bounds.top, bounds.bottom - height),
  };
}

export function transformBetween(from, to) {
  return `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width}, ${from.height / to.height})`;
}
