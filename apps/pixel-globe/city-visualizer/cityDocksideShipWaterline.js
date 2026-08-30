export const DOCKSIDE_SHIP_WATERLINE_RGB = Object.freeze({
  r: 77,
  g: 155,
  b: 230
});

export function docksideShipWaterlinePixelKeys(submergedKeys, width, height) {
  if (!(submergedKeys instanceof Set)) {
    throw new Error("Dockside ship waterline requires a submerged pixel set");
  }
  if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) {
    throw new Error(`Invalid dockside ship waterline dimensions: ${width}x${height}`);
  }
  const waterline = new Set();
  for (const key of submergedKeys) {
    if (!Number.isInteger(key) || key < 0 || key >= width * height) {
      throw new Error(`Invalid submerged dockside ship pixel: ${key}`);
    }
    const y = Math.floor(key / width);
    if (y === 0 || !submergedKeys.has(key - width)) waterline.add(key);
  }
  return waterline;
}
