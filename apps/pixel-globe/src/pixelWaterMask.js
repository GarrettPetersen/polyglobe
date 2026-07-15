export function forEachPixelBrushPoint(x, y, radius, visit) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error("Pixel brush center must be finite");
  if (!Number.isInteger(radius) || radius < 0) throw new Error(`Invalid pixel brush radius: ${radius}`);
  if (typeof visit !== "function") throw new Error("Pixel brush requires a visitor");

  for (let yy = -radius; yy <= radius; yy++) {
    for (let xx = -radius; xx <= radius; xx++) {
      if (Math.abs(xx) + Math.abs(yy) > radius + 1) continue;
      visit(Math.round(x + xx), Math.round(y + yy));
    }
  }
}

export function pixelMaskKey(x, y) {
  if (!Number.isInteger(x) || !Number.isInteger(y)) throw new Error("Pixel mask coordinates must be integers");
  return `${x},${y}`;
}

export function alphaMaskContainsMapPoint(mask, originX, originY, mapX, mapY) {
  if (!mask || !Number.isInteger(mask.width) || !Number.isInteger(mask.height) || !mask.alpha) {
    throw new Error("A complete alpha mask is required");
  }
  for (const value of [originX, originY, mapX, mapY]) {
    if (!Number.isFinite(value)) throw new Error("Alpha mask coordinates must be finite");
  }
  const x = Math.round(mapX - originX);
  const y = Math.round(mapY - originY);
  if (x < 0 || y < 0 || x >= mask.width || y >= mask.height) return false;
  return mask.alpha[x + y * mask.width] > 0;
}
