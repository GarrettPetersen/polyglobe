import { RESURRECT_64_HEX } from "./waterLatitudePalette.js";

const palette = new Set(RESURRECT_64_HEX.map(hex => parseInt(hex, 16)));

/**
 * Register a finished 2D painting to a reviewed orthographic geometry bake.
 * Existing pixels retain their surface sample; new contour pixels borrow the
 * nearest surface within an explicitly reviewed radius. Ties use row order.
 * This is a bounded 2.5D art operation, not a replacement for model geometry.
 */
export function docksidePaintoverSamples({ rgba, width, height, sourceAlpha, maximumDistancePx }) {
  if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0 ||
      rgba.length !== width * height * 4 || sourceAlpha.length !== width * height) {
    throw new Error("Dockside paintover requires matching RGBA and geometry dimensions");
  }
  if (!Number.isInteger(maximumDistancePx) || maximumDistancePx < 0 || maximumDistancePx > 32) {
    throw new Error("Dockside paintover registration radius must be 0–32 native pixels");
  }
  const samples = new Int32Array(width * height).fill(-1);
  let opaquePixels = 0;
  let extendedPixels = 0;
  let maximumUsedDistanceSquared = 0;
  for (let pixel = 0; pixel < samples.length; pixel++) {
    const offset = pixel * 4;
    const alpha = rgba[offset + 3];
    if (alpha === 0) {
      if (rgba[offset] || rgba[offset + 1] || rgba[offset + 2]) {
        throw new Error(`Dockside paintover has hidden RGB at pixel ${pixel}`);
      }
      continue;
    }
    if (alpha !== 255) throw new Error(`Dockside paintover has non-binary alpha at pixel ${pixel}`);
    const rgb = rgba[offset] * 65536 + rgba[offset + 1] * 256 + rgba[offset + 2];
    if (!palette.has(rgb)) throw new Error(`Dockside paintover has non-Resurrect color at pixel ${pixel}`);
    opaquePixels++;
    if (sourceAlpha[pixel]) {
      samples[pixel] = pixel;
      continue;
    }
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    let bestDistanceSquared = maximumDistancePx ** 2 + 1;
    for (let sy = Math.max(0, y - maximumDistancePx); sy <= Math.min(height - 1, y + maximumDistancePx); sy++) {
      for (let sx = Math.max(0, x - maximumDistancePx); sx <= Math.min(width - 1, x + maximumDistancePx); sx++) {
        const source = sx + sy * width;
        if (!sourceAlpha[source]) continue;
        const distanceSquared = (sx - x) ** 2 + (sy - y) ** 2;
        if (distanceSquared >= bestDistanceSquared) continue;
        bestDistanceSquared = distanceSquared;
        samples[pixel] = source;
      }
    }
    if (samples[pixel] === -1) {
      throw new Error(`Dockside paintover pixel (${x}, ${y}) exceeds its ${maximumDistancePx}px geometry registration radius`);
    }
    extendedPixels++;
    maximumUsedDistanceSquared = Math.max(maximumUsedDistanceSquared, bestDistanceSquared);
  }
  if (opaquePixels === 0) throw new Error("Dockside paintover is blank");
  return { samples, opaquePixels, extendedPixels, maximumUsedDistancePx: Math.sqrt(maximumUsedDistanceSquared) };
}
