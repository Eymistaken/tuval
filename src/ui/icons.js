const paths = {
  brand: '<path d="M5 3h14v18H5z"/><path d="m9 15 6-8 2 2-6 8-3 1z"/><path d="M8 21h8"/>',
  pen: '<path d="m15 4 5 5M4 20l4-1L20 7a2.1 2.1 0 0 0-3-3L5 16z"/><path d="m5 16 3 3M4 20h6"/>',
  marker: '<path d="m12 3 9 9-6 6-9-9zM7 10l-4 4 7 7 4-4M3 19l2-2 2 2-2 2H3zM14 5l5 5M11 15l3-3"/>',
  airbrush: '<path d="M5 10h7v11H5zM7 10V6h3v4M6 6h5M10 6h3"/><path d="M16 5h.01M19 3h.01M19 7h.01M22 1h.01M22 5h.01M22 9h.01M7 14h3"/>',
  rect: '<rect x="4" y="4" width="16" height="16" rx="1"/>',
  circle: '<circle cx="12" cy="12" r="8"/>',
  line: '<path d="m5 19 14-14"/><circle cx="5" cy="19" r="1.5"/><circle cx="19" cy="5" r="1.5"/>',
  text: '<path d="M5 5h14M12 5v15M8 20h8M5 5v3M19 5v3"/>',
  bucket: '<path d="m9 4 9 9-7 7-9-9 7-7zM9 4V2M3 12h13M20 13s-2 3-2 4a2 2 0 0 0 4 0c0-1-2-4-2-4zM3 22h12"/>',
  eraser: '<path d="m14 3 7 7-10 11H6l-4-4zM7 11l7 7M11 21h10"/>',
  undo: '<path d="M9 5 4 10l5 5M4 10h10a6 6 0 0 1 0 12"/>',
  redo: '<path d="m15 5 5 5-5 5M20 10H10a6 6 0 0 0 0 12"/>',
  trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v4h16v-4"/>',
  palette: '<path d="M12 3a9 9 0 1 0 0 18c2 0 2-2 1-3s-1-3 1-3h3a4 4 0 0 0 4-4c0-5-4-8-9-8z"/><circle cx="7.5" cy="10" r=".75"/><circle cx="10" cy="6.5" r=".75"/><circle cx="15" cy="7" r=".75"/><circle cx="17.5" cy="11" r=".75"/>',
  settings: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  'chevron-left': '<path d="m14 6-6 6 6 6"/>',
  'chevron-right': '<path d="m10 6 6 6-6 6"/>',
  'chevron-down': '<path d="m6 9 6 6 6-6"/>',
  keyboard: '<rect x="2" y="5" width="20" height="14" rx="3"/><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M7 15h10"/>',
  spark: '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z"/>',
  shield: '<path d="m12 3 8 3v5c0 5-8 10-8 10S4 16 4 11V6zM8 12l3 3 5-6"/>',
  external: '<path d="M14 3h7v7M21 3l-10 10M10 3H3v18h18v-7"/>',
};

export function icon(name) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths[name] || paths.pen}</svg>`;
}

export function mountIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach((element) => {
    element.innerHTML = icon(element.dataset.icon);
  });
}
