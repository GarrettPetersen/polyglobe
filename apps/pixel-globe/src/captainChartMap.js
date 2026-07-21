import {
  minimapViewportCenter,
  zoomedMinimapViewport
} from "./minimapViewport.js";

const PAN_EPSILON = 1e-9;
const MAX_HOUSE_SIZE = 9;

export function captainChartPannedViewport({
  baseViewport,
  viewport,
  zoom,
  directionX,
  directionY,
  fraction,
  worldWidth,
  worldHeight
}) {
  if (!Number.isFinite(directionX) || !Number.isFinite(directionY) ||
      (directionX === 0 && directionY === 0)) {
    throw new Error(`Invalid captain chart pan direction: ${directionX},${directionY}`);
  }
  if (!Number.isFinite(fraction) || fraction <= 0) {
    throw new Error(`Invalid captain chart pan fraction: ${fraction}`);
  }
  const center = minimapViewportCenter(viewport, worldWidth);
  const nextViewport = zoomedMinimapViewport({
    baseViewport,
    zoom,
    centerX: center.x + viewport.spanX * directionX * fraction,
    centerY: center.y + viewport.spanY * directionY * fraction,
    worldWidth,
    worldHeight
  });
  const nextCenter = minimapViewportCenter(nextViewport, worldWidth);
  const horizontalDistance = wrappedDistance(center.x, nextCenter.x, worldWidth);
  if (horizontalDistance < PAN_EPSILON && Math.abs(nextCenter.y - center.y) < PAN_EPSILON) {
    return null;
  }
  return nextViewport;
}

export function captainChartPanAvailability(options) {
  const available = {};
  for (const [name, directionX, directionY] of [
    ["left", -1, 0],
    ["right", 1, 0],
    ["up", 0, -1],
    ["down", 0, 1]
  ]) {
    available[name] = captainChartPannedViewport({
      ...options,
      directionX,
      directionY
    }) !== null;
  }
  return Object.freeze(available);
}

export function captainChartHexPixelSpan({
  viewport,
  pixelWidth,
  pixelHeight,
  tileCount,
  worldWidth,
  worldHeight
}) {
  for (const [label, value] of Object.entries({
    pixelWidth,
    pixelHeight,
    tileCount,
    worldWidth,
    worldHeight
  })) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(`Invalid captain chart ${label}: ${value}`);
    }
  }
  if (!viewport || !Number.isFinite(viewport.spanX) || !Number.isFinite(viewport.spanY) ||
      viewport.spanX <= 0 || viewport.spanY <= 0) {
    throw new Error("Captain chart hex scale requires a valid viewport");
  }
  const visibleWorldFraction = viewport.spanX / worldWidth * viewport.spanY / worldHeight;
  const estimatedVisibleTiles = Math.max(1, tileCount * visibleWorldFraction);
  return Math.sqrt(pixelWidth * pixelHeight / estimatedVisibleTiles);
}

export function captainChartSettlementMarkerSize(hexPixelSpan) {
  if (!Number.isFinite(hexPixelSpan) || hexPixelSpan <= 0) {
    throw new Error(`Invalid captain chart hex pixel span: ${hexPixelSpan}`);
  }
  if (hexPixelSpan <= 1) return 1;
  let size = Math.max(3, Math.round(hexPixelSpan) + 2);
  if (size % 2 === 0) size += 1;
  return Math.min(MAX_HOUSE_SIZE, size);
}

export function captainChartHousePixels(size) {
  if (!Number.isInteger(size) || size < 3 || size > MAX_HOUSE_SIZE || size % 2 === 0) {
    throw new Error(`Invalid captain chart house size: ${size}`);
  }
  const middle = Math.floor(size / 2);
  const pixels = [];
  for (let y = 0; y <= middle; y++) {
    for (let x = middle - y; x <= middle + y; x++) pixels.push(Object.freeze({ x, y }));
  }
  for (let y = middle + 1; y < size; y++) {
    const left = size === 3 ? 0 : 1;
    const right = size === 3 ? size - 1 : size - 2;
    for (let x = left; x <= right; x++) {
      if (y === size - 1 && x === middle) continue;
      pixels.push(Object.freeze({ x, y }));
    }
  }
  return Object.freeze(pixels);
}

function wrappedDistance(a, b, range) {
  const direct = Math.abs(a - b);
  return Math.min(direct, range - direct);
}
