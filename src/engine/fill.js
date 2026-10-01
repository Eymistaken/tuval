/** Blend one connected, exact-RGBA region in place. Returns whether pixels changed. */
export function floodFill(image, x, y, color) {
  const { width, height, data } = image;
  if (!Number.isFinite(x) || !Number.isFinite(y) || color.a <= 0) return false;
  x = Math.floor(x);
  y = Math.floor(y);
  if (x < 0 || y < 0 || x >= width || y >= height) return false;
  const seed = (y * width + x) * 4;
  const source = [...data.slice(seed, seed + 4)];
  const opacity = Math.min(1, color.a);
  const sourceAlpha = source[3] / 255;
  const alpha = opacity + sourceAlpha * (1 - opacity);
  const replacement = [color.r, color.g, color.b].map((component, index) =>
    Math.round((component * opacity + source[index] * sourceAlpha * (1 - opacity)) / alpha));
  replacement.push(Math.round(alpha * 255));
  if (source.every((component, index) => component === replacement[index])) return false;

  const matches = (column, row) => {
    const offset = (row * width + column) * 4;
    return data[offset] === source[0] && data[offset + 1] === source[1]
      && data[offset + 2] === source[2] && data[offset + 3] === source[3];
  };
  // Scan whole horizontal spans instead of allocating four neighbors for every pixel.
  const seeds = [x, y];
  while (seeds.length) {
    const row = seeds.pop();
    const column = seeds.pop();
    if (!matches(column, row)) continue;
    let left = column;
    let right = column;
    while (left > 0 && matches(left - 1, row)) left -= 1;
    while (right + 1 < width && matches(right + 1, row)) right += 1;
    for (let current = left; current <= right; current += 1) {
      data.set(replacement, (row * width + current) * 4);
    }
    for (const neighborRow of [row - 1, row + 1]) {
      if (neighborRow < 0 || neighborRow >= height) continue;
      let inSpan = false;
      for (let current = left; current <= right; current += 1) {
        const match = matches(current, neighborRow);
        if (match && !inSpan) seeds.push(current, neighborRow);
        inSpan = match;
      }
    }
  }
  return true;
}
