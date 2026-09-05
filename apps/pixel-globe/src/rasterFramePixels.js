// Atlas pixels are immutable; consumers receive private copies to tint or damage.
// Key by source object and source rectangle, never the building's screen position.
export function createRasterFramePixelReader(readPixels, { maxBytes = 8 * 1024 * 1024 } = {}) {
  if (typeof readPixels !== "function" || !Number.isSafeInteger(maxBytes) || maxBytes <= 0) {
    throw new TypeError("Raster frame reader requires a read function and positive byte budget");
  }
  const framesByAtlas = new WeakMap();
  const retained = new Set();
  let retainedBytes = 0;

  return function readFramePixels(atlas, { x, y, w, h }) {
    if (!atlas || typeof atlas !== "object" ||
        ![x, y, w, h].every(Number.isSafeInteger) || x < 0 || y < 0 || w <= 0 || h <= 0) {
      throw new TypeError("Raster frame reader requires an atlas and a valid source rectangle");
    }
    let frames = framesByAtlas.get(atlas);
    if (!frames) {
      frames = new Map();
      framesByAtlas.set(atlas, frames);
    }
    const key = `${x}:${y}:${w}:${h}`;
    let entry = frames.get(key);
    if (entry) {
      retained.delete(entry);
      retained.add(entry);
      return entry.pixels.slice();
    }
    const pixels = readPixels(atlas, { x, y, w, h });
    if (!(pixels instanceof Uint8ClampedArray) || pixels.length !== w * h * 4) {
      throw new Error(`Raster frame read returned invalid RGBA pixels for ${key}`);
    }
    // An oversized frame is valid, but cannot evict the entire useful cache.
    if (pixels.byteLength > maxBytes) return pixels.slice();
    while (retainedBytes + pixels.byteLength > maxBytes) {
      const oldest = retained.values().next().value;
      oldest.frames.delete(oldest.key);
      retained.delete(oldest);
      retainedBytes -= oldest.pixels.byteLength;
    }
    entry = { frames, key, pixels: pixels.slice() };
    frames.set(key, entry);
    retained.add(entry);
    retainedBytes += entry.pixels.byteLength;
    return pixels.slice();
  };
}
