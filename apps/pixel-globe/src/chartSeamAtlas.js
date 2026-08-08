import { normalize3 } from "./geodesic.js";

export const CHART_SEAM_ATLAS_VERSION = 1;
export const CHART_SEAM_REGION_HYSTERESIS_DOT = 0.00018;

export function parseChartSeamAtlas(data, { subdivisions, earthVersion } = {}) {
  if (!data || typeof data !== "object") throw new Error("Chart seam atlas is missing");
  if (data.version !== CHART_SEAM_ATLAS_VERSION) {
    throw new Error(`Unsupported chart seam atlas version: ${data.version}`);
  }
  if (data.subdivisions !== subdivisions) {
    throw new Error(
      `Chart seam atlas subdivisions mismatch: ${data.subdivisions} != ${subdivisions}`
    );
  }
  if (String(data.earthVersion) !== String(earthVersion)) {
    throw new Error(
      `Chart seam atlas Earth version mismatch: ${data.earthVersion} != ${earthVersion}`
    );
  }
  if (!Array.isArray(data.regions) || data.regions.length < 4 || data.regions.length > 32) {
    throw new Error(`Chart seam atlas has an invalid region count: ${data.regions?.length}`);
  }

  const ids = new Set();
  const regions = data.regions.map((region, index) => {
    if (!Number.isInteger(region?.id) || region.id !== index || ids.has(region.id)) {
      throw new Error(`Chart seam atlas region id is invalid at index ${index}: ${region?.id}`);
    }
    ids.add(region.id);
    if (!Array.isArray(region.center) || region.center.length !== 3 ||
        region.center.some((value) => !Number.isFinite(value))) {
      throw new Error(`Chart seam atlas region ${region.id} has an invalid center`);
    }
    const center = normalize3(region.center);
    if (!Array.isArray(region.neighbors) || region.neighbors.some((id) => (
      !Number.isInteger(id) || id < 0 || id >= data.regions.length || id === region.id
    ))) {
      throw new Error(`Chart seam atlas region ${region.id} has invalid neighbors`);
    }
    return Object.freeze({
      id: region.id,
      center: Object.freeze(center),
      centerLatRad: Math.asin(clamp(center[1], -1, 1)),
      centerLonRad: Math.atan2(-center[2], center[0]),
      neighbors: Object.freeze([...new Set(region.neighbors)].sort((a, b) => a - b))
    });
  });
  for (const region of regions) {
    for (const neighborId of region.neighbors) {
      if (!regions[neighborId].neighbors.includes(region.id)) {
        throw new Error(`Chart seam atlas adjacency is not reciprocal: ${region.id}/${neighborId}`);
      }
    }
  }
  return Object.freeze({
    version: data.version,
    subdivisions: data.subdivisions,
    earthVersion: String(data.earthVersion),
    regions: Object.freeze(regions),
    bake: Object.freeze({ ...(data.bake || {}) })
  });
}

export function projectPositionInChartRegion(atlas, regionId, position) {
  validateAtlasAndPosition(atlas, position);
  validateRegionId(atlas, regionId);
  const region = atlas.regions[regionId];
  const latitude = Math.asin(clamp(position[1], -1, 1));
  const longitude = Math.atan2(-position[2], position[0]);
  return {
    x: wrapRadians(longitude - region.centerLonRad) * Math.cos(region.centerLatRad),
    y: region.centerLatRad - latitude
  };
}

export function unprojectPositionInChartRegion(atlas, regionId, point) {
  if (!atlas || !Array.isArray(atlas.regions)) {
    throw new Error("Chart seam unprojection requires a parsed atlas");
  }
  validateRegionId(atlas, regionId);
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    throw new Error("Chart seam unprojection requires a finite point");
  }
  const region = atlas.regions[regionId];
  const longitudeScale = Math.cos(region.centerLatRad);
  if (Math.abs(longitudeScale) < 1e-6) {
    throw new Error(`Chart seam region ${regionId} is too close to a pole`);
  }
  const latitude = clamp(region.centerLatRad - point.y, -Math.PI / 2, Math.PI / 2);
  const longitude = wrapRadians(region.centerLonRad + point.x / longitudeScale);
  const cosLatitude = Math.cos(latitude);
  return [
    cosLatitude * Math.cos(longitude),
    Math.sin(latitude),
    -cosLatitude * Math.sin(longitude)
  ];
}

export function chartSeamRegionForPosition(atlas, position) {
  validateAtlasAndPosition(atlas, position);
  let bestId = -1;
  let bestDot = -Infinity;
  for (const region of atlas.regions) {
    const dot = dot3(position, region.center);
    if (dot <= bestDot) continue;
    bestDot = dot;
    bestId = region.id;
  }
  if (bestId < 0) throw new Error("Chart seam atlas could not classify a globe position");
  return bestId;
}

export function chartSeamTransitionTarget(atlas, activeRegionId, position, {
  navigationKind = "openWater",
  hysteresisDot = CHART_SEAM_REGION_HYSTERESIS_DOT
} = {}) {
  validateAtlasAndPosition(atlas, position);
  validateRegionId(atlas, activeRegionId);
  if (!["openWater", "river", "lake"].includes(navigationKind)) {
    throw new Error(`Unknown chart seam navigation kind: ${navigationKind}`);
  }
  if (!Number.isFinite(hysteresisDot) || hysteresisDot < 0) {
    throw new Error(`Chart seam hysteresis must be non-negative: ${hysteresisDot}`);
  }
  // Rivers and connected lakes are pockets of the ocean sheet at their mouth.
  // Keeping the entry frame avoids needless redraws on a route that exits the
  // same way it entered.
  if (navigationKind === "river" || navigationKind === "lake") return null;

  const candidateId = chartSeamRegionForPosition(atlas, position);
  if (candidateId === activeRegionId) return null;
  const activeDot = dot3(position, atlas.regions[activeRegionId].center);
  const candidateDot = dot3(position, atlas.regions[candidateId].center);
  return candidateDot - activeDot > hysteresisDot ? candidateId : null;
}

export function chartSeamAtlasCoverage(atlas, positions) {
  if (!Array.isArray(positions) || positions.length === 0) {
    throw new Error("Chart seam coverage requires globe positions");
  }
  const visited = new Set(positions.map((position) => chartSeamRegionForPosition(atlas, position)));
  return Object.freeze({ visitedRegionIds: Object.freeze([...visited].sort((a, b) => a - b)) });
}

export function synchronizeChartSheetPositions(positions, projectedTiles) {
  if (!(positions instanceof Map)) {
    throw new Error("Chart sheet synchronization requires a position map");
  }
  if (!Array.isArray(projectedTiles)) {
    throw new Error("Chart sheet synchronization requires projected tiles");
  }
  for (const tile of projectedTiles) {
    if (!Number.isInteger(tile?.id) || !Number.isFinite(tile.layoutX) ||
        !Number.isFinite(tile.layoutY)) {
      throw new Error(`Chart atlas omitted fixed coordinates for tile ${tile?.id}`);
    }
    const existing = positions.get(tile.id);
    if (existing && (existing.x !== tile.layoutX || existing.y !== tile.layoutY)) {
      throw new Error(
        `Chart sheet changed immutable tile ${tile.id}: ` +
        `${existing.x},${existing.y} -> ${tile.layoutX},${tile.layoutY}`
      );
    }
    if (!existing) positions.set(tile.id, { x: tile.layoutX, y: tile.layoutY });
  }
  return positions;
}

function validateAtlasAndPosition(atlas, position) {
  if (!atlas || !Array.isArray(atlas.regions) || atlas.regions.length === 0) {
    throw new Error("Chart seam operation requires a parsed atlas");
  }
  if (!Array.isArray(position) || position.length !== 3 ||
      position.some((value) => !Number.isFinite(value))) {
    throw new Error("Chart seam operation requires a finite globe position");
  }
}

function validateRegionId(atlas, regionId) {
  if (!Number.isInteger(regionId) || regionId < 0 || regionId >= atlas.regions.length) {
    throw new Error(`Invalid active chart seam region: ${regionId}`);
  }
}

function dot3(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function wrapRadians(value) {
  let wrapped = value;
  while (wrapped <= -Math.PI) wrapped += Math.PI * 2;
  while (wrapped > Math.PI) wrapped -= Math.PI * 2;
  return wrapped;
}
