import { createStaticPointIndex, nearestStaticPoint } from "./staticPointIndex.js";

function requireFinitePositive(value, label) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`Chart viewport coverage requires positive ${label}: ${value}`);
  }
}

function requireFinitePoint(point, label) {
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    throw new Error(`Chart viewport coverage requires finite ${label}`);
  }
}

export function chartTerrainCoverageBounds(tileCalls, tileVisualRadiusPx) {
  if (!Array.isArray(tileCalls)) {
    throw new Error("Chart terrain coverage requires tile calls");
  }
  requireFinitePositive(tileVisualRadiusPx, "tile radius");
  if (tileCalls.length === 0) return null;

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const call of tileCalls) {
    const point = { x: call?.drawSurfaceX, y: call?.drawSurfaceY };
    requireFinitePoint(point, `tile ${call?.id ?? "unknown"}`);
    minX = Math.min(minX, point.x - tileVisualRadiusPx);
    minY = Math.min(minY, point.y - tileVisualRadiusPx);
    maxX = Math.max(maxX, point.x + tileVisualRadiusPx);
    maxY = Math.max(maxY, point.y + tileVisualRadiusPx);
  }
  return Object.freeze({ minX, minY, maxX, maxY });
}

export function chartViewportEdgeCoverage({ bounds, offset, viewportWidth, viewportHeight }) {
  requireFinitePositive(viewportWidth, "viewport width");
  requireFinitePositive(viewportHeight, "viewport height");
  requireFinitePoint(offset, "chart offset");
  if (bounds === null) {
    return Object.freeze({ maximumGapPx: Number.POSITIVE_INFINITY, edge: "all" });
  }
  for (const [label, value] of Object.entries(bounds)) {
    if (!Number.isFinite(value)) throw new Error(`Chart coverage bound ${label} is invalid: ${value}`);
  }

  const gaps = Object.freeze({
    left: bounds.minX + offset.x,
    top: bounds.minY + offset.y,
    right: viewportWidth - (bounds.maxX + offset.x),
    bottom: viewportHeight - (bounds.maxY + offset.y)
  });
  let edge = "left";
  let maximumGapPx = gaps.left;
  for (const candidate of ["top", "right", "bottom"]) {
    if (gaps[candidate] <= maximumGapPx) continue;
    edge = candidate;
    maximumGapPx = gaps[candidate];
  }
  return Object.freeze({ maximumGapPx: Math.max(0, maximumGapPx), edge, gaps });
}

export function measureChartViewportTileCoverage({
  tileCalls,
  offset,
  viewportWidth,
  viewportHeight,
  sampleSpacingPx
}) {
  if (!Array.isArray(tileCalls)) {
    throw new Error("Chart viewport sampling requires tile calls");
  }
  requireFinitePoint(offset, "chart offset");
  requireFinitePositive(viewportWidth, "viewport width");
  requireFinitePositive(viewportHeight, "viewport height");
  requireFinitePositive(sampleSpacingPx, "sample spacing");
  if (tileCalls.length === 0) {
    return Object.freeze({
      maximumNearestTileDistancePx: Number.POSITIVE_INFINITY,
      screenX: 0,
      screenY: 0,
      sampleCount: 1
    });
  }

  const xSamples = viewportSamples(viewportWidth, sampleSpacingPx);
  const ySamples = viewportSamples(viewportHeight, sampleSpacingPx);
  const tileIndex = createStaticPointIndex(tileCalls, {
    cellSize: sampleSpacingPx,
    pointForEntry: (call) => ({ x: call?.drawSurfaceX, y: call?.drawSurfaceY })
  });
  let maximumNearestTileDistancePx = 0;
  let worstX = 0;
  let worstY = 0;
  for (const screenY of ySamples) {
    for (const screenX of xSamples) {
      const nearest = nearestStaticPoint(tileIndex, screenX - offset.x, screenY - offset.y);
      const nearestTileDistancePx = Math.sqrt(nearest.distanceSquared);
      if (nearestTileDistancePx <= maximumNearestTileDistancePx) continue;
      maximumNearestTileDistancePx = nearestTileDistancePx;
      worstX = screenX;
      worstY = screenY;
    }
  }
  return Object.freeze({
    maximumNearestTileDistancePx,
    screenX: worstX,
    screenY: worstY,
    sampleCount: xSamples.length * ySamples.length
  });
}

function viewportSamples(size, spacing) {
  const samples = [];
  for (let position = 0; position < size; position += spacing) samples.push(position);
  if (samples.at(-1) !== size) samples.push(size);
  return samples;
}
