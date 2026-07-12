export function nearestWaterMaskedPoint({ x, y, isWater, fallback = null, maxRadius = 12 }) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error("Fish water-mask point must be finite");
  if (typeof isWater !== "function") throw new Error("Fish water-mask point requires an isWater callback");
  if (!Number.isInteger(maxRadius) || maxRadius < 0) throw new Error(`Invalid fish water-mask radius: ${maxRadius}`);
  if (isWater(x, y)) return { x, y };

  const centerX = Math.round(x);
  const centerY = Math.round(y);
  for (let radius = 1; radius <= maxRadius; radius++) {
    let best = null;
    let bestDistance = Infinity;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) continue;
        const candidateX = centerX + dx;
        const candidateY = centerY + dy;
        if (!isWater(candidateX, candidateY)) continue;
        const distance = (candidateX - x) ** 2 + (candidateY - y) ** 2;
        if (distance >= bestDistance) continue;
        best = { x: candidateX, y: candidateY };
        bestDistance = distance;
      }
    }
    if (best) return best;
  }

  if (fallback && Number.isFinite(fallback.x) && Number.isFinite(fallback.y) && isWater(fallback.x, fallback.y)) {
    return { x: fallback.x, y: fallback.y };
  }
  return null;
}

export function waterMaskedSpritePixels({ x, y, width, height, alpha, flip = false, isWater }) {
  if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) {
    throw new Error(`Invalid fish sprite mask size: ${width}x${height}`);
  }
  if (!alpha || alpha.length !== width * height) throw new Error("Fish sprite mask requires complete alpha data");
  if (typeof isWater !== "function") throw new Error("Fish sprite mask requires an isWater callback");

  const pixels = [];
  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      const sourceX = flip ? width - 1 - px : px;
      if (alpha[sourceX + py * width] === 0) continue;
      const mapX = x + px;
      const mapY = y + py;
      if (isWater(mapX, mapY)) pixels.push({ x: mapX, y: mapY });
    }
  }
  return pixels;
}
