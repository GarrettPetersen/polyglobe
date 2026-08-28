import {
  clamp,
  cross3,
  dot3,
  findNearestTileId,
  graphCenter,
  normalize3
} from "./geodesic.js";
import { isWaterSurfaceRow } from "./terrainSurface.js";

const WORLD_NORTH = Object.freeze([0, 1, 0]);
const FALLBACK_EAST = Object.freeze([1, 0, 0]);
const RUMOR_CANDIDATE_COUNT = 24;
const RUMOR_MIN_DISTANCE_KM = 180;
const RUMOR_DISTANCE_RANGE_KM = 181;
const RUMOR_USEFUL_MIN_DISTANCE_KM = 100;
const RUMOR_USEFUL_MAX_DISTANCE_KM = 600;

export function approximateOceanRumorTileId({
  graph,
  directionIndex,
  earthRows,
  navigationMask,
  originPosition,
  seed,
  earthRadiusKm
}) {
  validateInputs({
    graph,
    directionIndex,
    earthRows,
    navigationMask,
    originPosition,
    seed,
    earthRadiusKm
  });
  const north = tangentDirection(WORLD_NORTH, originPosition, FALLBACK_EAST);
  const east = tangentDirection(cross3(north, originPosition), originPosition, FALLBACK_EAST);
  let best = null;

  for (let index = 0; index < RUMOR_CANDIDATE_COUNT; index++) {
    const bearing = ((seed % 360) + index * 137.508) * Math.PI / 180;
    const targetDistanceKm = RUMOR_MIN_DISTANCE_KM +
      ((seed >>> 9) + index * 47) % RUMOR_DISTANCE_RANGE_KM;
    const distanceRad = targetDistanceKm / earthRadiusKm;
    const tangent = [
      north[0] * Math.cos(bearing) + east[0] * Math.sin(bearing),
      north[1] * Math.cos(bearing) + east[1] * Math.sin(bearing),
      north[2] * Math.cos(bearing) + east[2] * Math.sin(bearing)
    ];
    const candidate = normalize3([
      originPosition[0] * Math.cos(distanceRad) + tangent[0] * Math.sin(distanceRad),
      originPosition[1] * Math.cos(distanceRad) + tangent[1] * Math.sin(distanceRad),
      originPosition[2] * Math.cos(distanceRad) + tangent[2] * Math.sin(distanceRad)
    ]);
    const requestedTileId = findNearestTileId(graph, directionIndex, candidate);
    const tileId = nearestNavigableWaterTile(
      graph,
      earthRows,
      navigationMask,
      requestedTileId
    );
    const tilePosition = graphCenter(graph, tileId);
    const offsetKm = Math.acos(clamp(dot3(originPosition, tilePosition), -1, 1)) * earthRadiusKm;
    const distanceErrorKm = Math.abs(offsetKm - targetDistanceKm);
    if (!best || distanceErrorKm < best.distanceErrorKm) {
      best = { tileId, distanceErrorKm };
    }
    if (
      offsetKm >= RUMOR_USEFUL_MIN_DISTANCE_KM &&
      offsetKm <= RUMOR_USEFUL_MAX_DISTANCE_KM
    ) {
      return tileId;
    }
  }

  if (!best) throw new Error("Ocean rumor world contains no navigable water");
  return best.tileId;
}

export function oceanRumorTileIsNavigable(earthRows, navigationMask, tileId) {
  if (!Number.isInteger(tileId) || tileId < 0 || tileId >= earthRows.length) {
    throw new Error(`Ocean rumor tile is outside the world: ${tileId}`);
  }
  return navigationMask[tileId] === 1 && isWaterSurfaceRow(earthRows[tileId]);
}

function nearestNavigableWaterTile(
  graph,
  earthRows,
  navigationMask,
  startTileId
) {
  const visited = new Set([startTileId]);
  const queue = [startTileId];
  for (let readIndex = 0; readIndex < queue.length; readIndex++) {
    const tileId = queue[readIndex];
    if (oceanRumorTileIsNavigable(earthRows, navigationMask, tileId)) return tileId;
    for (const neighborId of graph.neighbors[tileId]) {
      if (visited.has(neighborId)) continue;
      visited.add(neighborId);
      queue.push(neighborId);
    }
  }
  throw new Error("Ocean rumor world contains no navigable water");
}

function tangentDirection(direction, normal, fallback) {
  const projected = projectToTangent(direction, normal);
  const length = Math.hypot(projected[0], projected[1], projected[2]);
  if (length > 1e-9) return projected.map((value) => value / length);
  const fallbackProjected = projectToTangent(fallback, normal);
  const fallbackLength = Math.hypot(
    fallbackProjected[0],
    fallbackProjected[1],
    fallbackProjected[2]
  );
  if (fallbackLength <= 1e-9) throw new Error("Ocean rumor origin has no tangent frame");
  return fallbackProjected.map((value) => value / fallbackLength);
}

function projectToTangent(direction, normal) {
  const projection = dot3(direction, normal);
  return [
    direction[0] - normal[0] * projection,
    direction[1] - normal[1] * projection,
    direction[2] - normal[2] * projection
  ];
}

function validateInputs({
  graph,
  directionIndex,
  earthRows,
  navigationMask,
  originPosition,
  seed,
  earthRadiusKm
}) {
  if (!graph || !Number.isInteger(graph.tileCount) || graph.tileCount <= 0) {
    throw new Error("Ocean rumor search requires a globe graph");
  }
  if (!directionIndex) throw new Error("Ocean rumor search requires a direction index");
  if (!Array.isArray(earthRows) || earthRows.length !== graph.tileCount) {
    throw new Error("Ocean rumor search requires one terrain row per tile");
  }
  if (!navigationMask || navigationMask.length !== graph.tileCount) {
    throw new Error("Ocean rumor search requires a complete navigation mask");
  }
  if (
    !Array.isArray(originPosition) ||
    originPosition.length !== 3 ||
    !originPosition.every(Number.isFinite)
  ) {
    throw new Error("Ocean rumor search requires a finite origin position");
  }
  const originLength = Math.hypot(...originPosition);
  if (Math.abs(originLength - 1) > 1e-4) {
    throw new Error(`Ocean rumor origin must be normalized: ${originLength}`);
  }
  if (!Number.isInteger(seed) || seed < 0) {
    throw new Error(`Ocean rumor search requires an unsigned seed: ${seed}`);
  }
  if (!Number.isFinite(earthRadiusKm) || earthRadiusKm <= 0) {
    throw new Error(`Ocean rumor search requires a positive world radius: ${earthRadiusKm}`);
  }
}
