const point = ({ x, y, pressure = 1 }) => ({ x, y, pressure });
const midpoint = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, pressure: (a.pressure + b.pressure) / 2 });

/** Quadratic segments end at sample midpoints, followed by the exact final endpoint. */
export function buildStroke(samples) {
  if (!samples.length) return null;
  const points = samples.map(point);
  const segments = [];
  for (let index = 1; index < points.length; index += 1) {
    segments.push({ control: points[index - 1], end: midpoint(points[index - 1], points[index]) });
  }
  if (points.length > 1) {
    const last = points.at(-1);
    segments.push({ control: last, end: last });
  }
  return { start: points[0], segments };
}

/** Draw with opaque ink; the engine composites the entire layer with opacity once. */
export function drawStroke(context, samples, size, variablePressure = false) {
  const stroke = buildStroke(samples);
  if (!stroke) return;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  const width = (pressure) => size * (variablePressure ? 0.2 + pressure * 0.8 : 1);
  if (!stroke.segments.length) {
    context.beginPath();
    context.arc(stroke.start.x, stroke.start.y, width(stroke.start.pressure) / 2, 0, Math.PI * 2);
    context.fill();
    return;
  }
  let previous = stroke.start;
  context.beginPath();
  context.moveTo(previous.x, previous.y);
  context.lineWidth = size;
  for (const { control, end } of stroke.segments) {
    if (variablePressure) {
      context.beginPath();
      context.moveTo(previous.x, previous.y);
      context.lineWidth = width((previous.pressure + control.pressure + end.pressure) / 3);
    }
    context.quadraticCurveTo(control.x, control.y, end.x, end.y);
    if (variablePressure) context.stroke();
    previous = end;
  }
  if (!variablePressure) context.stroke();
}
