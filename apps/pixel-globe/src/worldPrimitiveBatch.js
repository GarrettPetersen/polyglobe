const COLOR_CACHE = new Map();

export function unitRgbaForCssColor(color) {
  if (typeof color !== "string" || color.length === 0) {
    throw new Error(`World primitive color must be a non-empty string: ${color}`);
  }
  const cached = COLOR_CACHE.get(color);
  if (cached) return cached;
  const channels = parseCssColor(color);
  const result = Object.freeze([
    channels[0] / 255,
    channels[1] / 255,
    channels[2] / 255,
    channels[3]
  ]);
  COLOR_CACHE.set(color, result);
  return result;
}

export function forEachPixelLine(x0, y0, x1, y1, visit) {
  if (![x0, y0, x1, y1].every(Number.isInteger)) {
    throw new Error(`Pixel line endpoints must be integers: ${x0},${y0} to ${x1},${y1}`);
  }
  if (typeof visit !== "function") throw new Error("Pixel line requires a visitor");
  let x = x0;
  let y = y0;
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let error = dx - dy;

  while (true) {
    visit(x, y);
    if (x === x1 && y === y1) return;
    const doubled = error * 2;
    if (doubled > -dy) {
      error -= dy;
      x += sx;
    }
    if (doubled < dx) {
      error += dx;
      y += sy;
    }
  }
}

function parseCssColor(color) {
  if (/^#[0-9a-f]{6}$/i.test(color)) {
    return [
      Number.parseInt(color.slice(1, 3), 16),
      Number.parseInt(color.slice(3, 5), 16),
      Number.parseInt(color.slice(5, 7), 16),
      1
    ];
  }
  const match = color.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)$/i);
  if (!match) throw new Error(`Unsupported world primitive color: ${color}`);
  const channels = [Number(match[1]), Number(match[2]), Number(match[3])];
  if (channels.some((channel) => !Number.isInteger(channel) || channel < 0 || channel > 255)) {
    throw new Error(`World primitive RGB channel is out of range: ${color}`);
  }
  const alpha = match[4] === undefined ? 1 : Number(match[4]);
  if (!Number.isFinite(alpha) || alpha < 0 || alpha > 1) {
    throw new Error(`World primitive alpha is out of range: ${color}`);
  }
  return [...channels, alpha];
}
