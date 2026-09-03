import { shipHullBarLayoutBelowRect } from "../src/shipHullBar.js";

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

export function docksideShipHullBarLayout({
  x,
  y,
  scale,
  opaqueMinX,
  opaqueMaxX,
  opaqueMaxY,
  hitPoints,
  maxHitPoints,
  viewportWidth,
  viewportHeight
}) {
  for (const [label, value] of Object.entries({
    scale,
    opaqueMinX,
    opaqueMaxX,
    opaqueMaxY,
    viewportWidth,
    viewportHeight
  })) {
    if (!Number.isFinite(value)) throw new Error(`Invalid dockside ship hull bar ${label}: ${value}`);
  }
  if (scale <= 0 || opaqueMinX < 0 || opaqueMaxX < opaqueMinX || opaqueMaxY < 0) {
    throw new Error("Invalid dockside ship hull bar silhouette");
  }
  if (viewportWidth < 7 || viewportHeight < 7) {
    throw new Error(`Invalid dockside ship hull bar viewport: ${viewportWidth}x${viewportHeight}`);
  }
  const silhouetteWidth = (opaqueMaxX - opaqueMinX + 1) * scale;
  const barWidth = Math.min(48, Math.round(silhouetteWidth * 0.3125));
  const natural = shipHullBarLayoutBelowRect({
    x: x + opaqueMinX * scale,
    y,
    width: silhouetteWidth,
    height: (opaqueMaxY + 1) * scale,
    hitPoints,
    maxHitPoints,
    barWidth,
    gap: 1
  });
  return Object.freeze({
    ...natural,
    x: clamp(natural.x, 2, viewportWidth - natural.width - 2),
    y: clamp(natural.y, 2, viewportHeight - natural.height - 2)
  });
}

function clamp(value, minimum, maximum) {
  if (maximum < minimum) throw new Error(`Dockside ship hull bar cannot fit viewport: ${maximum}`);
  return Math.max(minimum, Math.min(maximum, value));
}
