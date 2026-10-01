import { drawStroke } from './stroke.js';

export const TOOL_NAMES = new Set(['pen', 'marker', 'airbrush', 'eraser', 'bucket', 'rect', 'circle', 'line', 'text']);
export const FREEHAND_TOOLS = new Set(['pen', 'marker', 'eraser']);
export const SHAPE_TOOLS = new Set(['rect', 'circle', 'line']);

export function layerStyle(options) {
  return {
    alpha: options.tool === 'eraser' ? 1 : options.alpha * (options.tool === 'marker' ? 0.5 : 1),
    composite: options.tool === 'marker' ? 'multiply' : 'source-over',
  };
}

export function paintFreehand(context, operation) {
  const { options, points, pointerType } = operation;
  const size = options.size * (options.tool === 'marker' ? 2 : 1);
  drawStroke(context, points, size, options.tool === 'pen' && options.pressure && pointerType === 'pen');
}

export function paintShape(context, { options, start, current }) {
  const dx = current.x - start.x;
  const dy = current.y - start.y;
  if (Math.hypot(dx, dy) < 0.01) return;
  context.lineWidth = options.size;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.beginPath();
  if (options.tool === 'rect') context.rect(start.x, start.y, dx, dy);
  else if (options.tool === 'circle') context.arc(start.x, start.y, Math.hypot(dx, dy), 0, Math.PI * 2);
  else {
    context.moveTo(start.x, start.y);
    context.lineTo(current.x, current.y);
  }
  context.stroke();
}

export function spray(context, point, size) {
  const radius = size * 2;
  for (let index = 0; index < 24; index += 1) {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.sqrt(Math.random()) * radius;
    context.fillRect(point.x + Math.cos(angle) * distance, point.y + Math.sin(angle) * distance, 1, 1);
  }
}
