const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const channel = (value) => Math.round(clamp(Number(value) || 0, 0, 255));

/** Parse the supported HEX and comma-separated RGB forms without browser coercion. */
export function parseColor(value) {
  if (typeof value !== 'string') return null;
  const input = value.trim();
  const hex = /^#([\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.exec(input);
  if (hex) {
    const full = hex[1].length < 5 ? [...hex[1]].map((digit) => digit + digit).join('') : hex[1];
    return {
      r: parseInt(full.slice(0, 2), 16),
      g: parseInt(full.slice(2, 4), 16),
      b: parseInt(full.slice(4, 6), 16),
      a: full.length === 8 ? parseInt(full.slice(6, 8), 16) / 255 : 1,
    };
  }
  const rgb = /^(rgb|rgba)\(([^()]*)\)$/i.exec(input);
  if (!rgb) return null;
  const parts = rgb[2].split(',').map((part) => part.trim());
  if (parts.length !== (rgb[1].toLowerCase() === 'rgba' ? 4 : 3)) return null;
  const values = [];
  for (let index = 0; index < parts.length; index += 1) {
    const match = /^(\d+(?:\.\d+)?|\.\d+)(%)?$/.exec(parts[index]);
    if (!match) return null;
    const number = Number(match[1]);
    const maximum = match[2] ? 100 : index === 3 ? 1 : 255;
    if (number > maximum) return null;
    values.push(index === 3 ? number / (match[2] ? 100 : 1) : Math.round(number / maximum * 255));
  }
  return { r: values[0], g: values[1], b: values[2], a: values[3] ?? 1 };
}

export function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map((value) => channel(value).toString(16).padStart(2, '0')).join('');
}

export function rgbToHsv(r, g, b) {
  const [red, green, blue] = [r, g, b].map((value) => channel(value) / 255);
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  let h = 0;
  if (delta) {
    if (max === red) h = ((green - blue) / delta) % 6;
    else if (max === green) h = (blue - red) / delta + 2;
    else h = (red - green) / delta + 4;
    h = (h * 60 + 360) % 360;
  }
  return { h, s: max ? delta / max * 100 : 0, v: max * 100 };
}

export function hsvToRgb(h, s, v) {
  const hue = ((Number(h) || 0) % 360 + 360) % 360 / 60;
  const saturation = clamp(Number(s) || 0, 0, 100) / 100;
  const value = clamp(Number(v) || 0, 0, 100) / 100;
  const chroma = value * saturation;
  const x = chroma * (1 - Math.abs(hue % 2 - 1));
  const offset = value - chroma;
  const sectors = [[chroma, x, 0], [x, chroma, 0], [0, chroma, x], [0, x, chroma], [x, 0, chroma], [chroma, 0, x]];
  const [r, g, b] = sectors[Math.floor(hue)].map((component) => Math.round((component + offset) * 255));
  return { r, g, b };
}
