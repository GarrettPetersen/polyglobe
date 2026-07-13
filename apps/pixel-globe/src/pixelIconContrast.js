export const PIXEL_ICON_OUTLINE_COLOR = Object.freeze({
  r: 199,
  g: 220,
  b: 208,
  a: 255
});

export function buildPixelIconOutlinePixels({
  sourcePixels,
  width,
  height,
  cells,
  color = PIXEL_ICON_OUTLINE_COLOR
}) {
  if (!(sourcePixels instanceof Uint8ClampedArray) || sourcePixels.length !== width * height * 4) {
    throw new Error("Pixel icon outline source must match its RGBA atlas dimensions");
  }
  if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) {
    throw new Error(`Invalid pixel icon atlas dimensions: ${width}x${height}`);
  }
  if (!Array.isArray(cells) || cells.length === 0) {
    throw new Error("Pixel icon outline requires atlas cells");
  }
  validateOutlineColor(color);

  const outline = new Uint8ClampedArray(sourcePixels.length);
  for (const cell of cells) {
    validateCell(cell, width, height);
    const maxX = cell.x + cell.w;
    const maxY = cell.y + cell.h;
    for (let y = cell.y; y < maxY; y++) {
      for (let x = cell.x; x < maxX; x++) {
        const offset = pixelOffset(x, y, width);
        if (sourcePixels[offset + 3] !== 0) continue;
        if (!hasOpaqueCardinalNeighbor(sourcePixels, width, x, y, cell)) continue;
        outline[offset] = color.r;
        outline[offset + 1] = color.g;
        outline[offset + 2] = color.b;
        outline[offset + 3] = color.a;
      }
    }
  }
  return outline;
}

function hasOpaqueCardinalNeighbor(sourcePixels, width, x, y, cell) {
  const neighbors = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (const [dx, dy] of neighbors) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx < cell.x || nx >= cell.x + cell.w || ny < cell.y || ny >= cell.y + cell.h) continue;
    if (sourcePixels[pixelOffset(nx, ny, width) + 3] !== 0) return true;
  }
  return false;
}

function validateCell(cell, width, height) {
  if (
    !cell ||
    !Number.isInteger(cell.x) || !Number.isInteger(cell.y) ||
    !Number.isInteger(cell.w) || !Number.isInteger(cell.h) ||
    cell.w <= 0 || cell.h <= 0 ||
    cell.x < 0 || cell.y < 0 ||
    cell.x + cell.w > width || cell.y + cell.h > height
  ) {
    throw new Error(`Invalid pixel icon atlas cell: ${JSON.stringify(cell)}`);
  }
}

function validateOutlineColor(color) {
  for (const channel of ["r", "g", "b", "a"]) {
    if (!Number.isInteger(color?.[channel]) || color[channel] < 0 || color[channel] > 255) {
      throw new Error(`Invalid pixel icon outline ${channel}: ${color?.[channel]}`);
    }
  }
}

function pixelOffset(x, y, width) {
  return (y * width + x) * 4;
}
