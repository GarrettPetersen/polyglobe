import { findNearestTileId } from "./geodesic.js";

export function colonizationDefenseSpawnTileIds({
  graph,
  navigationMask,
  targetTileId,
  count,
  pixelsPerRadian,
  seed = 0,
  minDistancePx = 18,
  maxDistancePx = 72
}) {
  assertGraph(graph);
  if (!(navigationMask instanceof Uint8Array) || navigationMask.length !== graph.tileCount) {
    throw new Error("Colony defense spawns require one navigation value per globe tile");
  }
  if (!Number.isInteger(targetTileId) || targetTileId < 0 || targetTileId >= graph.tileCount) {
    throw new Error(`Invalid colony defense target tile: ${targetTileId}`);
  }
  if (!Number.isInteger(count) || count <= 0) {
    throw new Error(`Invalid colony defense ship count: ${count}`);
  }
  if (!Number.isFinite(pixelsPerRadian) || pixelsPerRadian <= 0) {
    throw new Error(`Invalid colony defense pixel scale: ${pixelsPerRadian}`);
  }
  if (!Number.isInteger(seed) || !Number.isFinite(minDistancePx) || !Number.isFinite(maxDistancePx) ||
      minDistancePx < 0 || maxDistancePx <= minDistancePx) {
    throw new Error("Invalid colony defense spawn range");
  }

  const target = centerVector(graph, targetTileId);
  const north = tangentNorth(target);
  const east = normalize(cross(north, target));
  const candidates = [];
  for (let tileId = 0; tileId < graph.tileCount; tileId += 1) {
    if (navigationMask[tileId] !== 1) continue;
    const vector = centerVector(graph, tileId);
    const distancePx = Math.acos(clamp(dot(target, vector), -1, 1)) * pixelsPerRadian;
    if (distancePx < minDistancePx || distancePx > maxDistancePx) continue;
    const tangent = normalizeOrNull([
      vector[0] - target[0] * dot(target, vector),
      vector[1] - target[1] * dot(target, vector),
      vector[2] - target[2] * dot(target, vector)
    ]);
    if (!tangent) continue;
    candidates.push({
      tileId,
      bearing: Math.atan2(dot(tangent, east), dot(tangent, north)),
      distancePx
    });
  }
  if (candidates.length < count) {
    throw new Error(
      `Colony defense target ${targetTileId} has only ${candidates.length} nearby navigable spawn tiles`
    );
  }
  candidates.sort((a, b) => a.bearing - b.bearing || a.distancePx - b.distancePx || a.tileId - b.tileId);
  const rotation = ((seed % candidates.length) + candidates.length) % candidates.length;
  return Object.freeze(Array.from({ length: count }, (_, index) => (
    candidates[(rotation + Math.floor(index * candidates.length / count)) % candidates.length].tileId
  )));
}

export function colonizationDefenseSpawnNeedsRepair({
  graph,
  directionIndex,
  navigationMask,
  routeVector,
  targetTileId,
  pixelsPerRadian,
  maxDistancePx = 96
}) {
  assertGraph(graph);
  if (!(navigationMask instanceof Uint8Array) || navigationMask.length !== graph.tileCount) {
    throw new Error("Colony defense repair requires one navigation value per globe tile");
  }
  if (!Array.isArray(routeVector) || routeVector.length !== 3 ||
      routeVector.some((value) => !Number.isFinite(value))) {
    return true;
  }
  if (!Number.isInteger(targetTileId) || targetTileId < 0 || targetTileId >= graph.tileCount) {
    throw new Error(`Invalid colony defense repair target: ${targetTileId}`);
  }
  if (!Number.isFinite(pixelsPerRadian) || pixelsPerRadian <= 0 ||
      !Number.isFinite(maxDistancePx) || maxDistancePx <= 0) {
    throw new Error("Invalid colony defense repair distance");
  }
  const tileId = findNearestTileId(graph, directionIndex, routeVector);
  if (navigationMask[tileId] !== 1) return true;
  const distancePx = Math.acos(clamp(
    dot(normalize(routeVector), centerVector(graph, targetTileId)),
    -1,
    1
  )) * pixelsPerRadian;
  return distancePx > maxDistancePx;
}

function assertGraph(graph) {
  if (!Number.isInteger(graph?.tileCount) || graph.tileCount <= 0 ||
      !(graph.centers instanceof Float32Array) || graph.centers.length !== graph.tileCount * 3) {
    throw new Error("Colony defense spawns require a geodesic graph");
  }
}

function centerVector(graph, tileId) {
  const offset = tileId * 3;
  return [graph.centers[offset], graph.centers[offset + 1], graph.centers[offset + 2]];
}

function tangentNorth(normal) {
  return normalizeOrNull([
    -normal[1] * normal[0],
    1 - normal[1] * normal[1],
    -normal[1] * normal[2]
  ]) || normalize(cross([1, 0, 0], normal));
}

function normalize(vector) {
  const result = normalizeOrNull(vector);
  if (!result) throw new Error("Colony defense spawn basis is degenerate");
  return result;
}

function normalizeOrNull(vector) {
  const length = Math.hypot(vector[0], vector[1], vector[2]);
  return length > 1e-9 ? vector.map((value) => value / length) : null;
}

function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0]
  ];
}

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}
