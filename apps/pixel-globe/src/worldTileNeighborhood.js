import { isGraphRowCollection } from "./geodesicBake.js";

const SEARCH_DEPTH_STRETCH = 2.5;
const SEARCH_DEPTH_MARGIN = 4;

export function worldTilesWithinArcRadius({ graph, originTileId, maxDistanceRad }) {
  validateInputs(graph, originTileId, maxDistanceRad);
  const approximateSpacingRad = Math.sqrt(4 * Math.PI / graph.tileCount);
  const maximumDepth = Math.ceil(
    maxDistanceRad / approximateSpacingRad * SEARCH_DEPTH_STRETCH
  ) + SEARCH_DEPTH_MARGIN;
  const originOffset = originTileId * 3;
  const originX = graph.centers[originOffset];
  const originY = graph.centers[originOffset + 1];
  const originZ = graph.centers[originOffset + 2];
  const visited = new Set([originTileId]);
  const queue = [{ tileId: originTileId, depth: 0 }];
  const matches = [];
  let nearestBoundaryDistanceRad = Infinity;

  for (let head = 0; head < queue.length; head++) {
    const { tileId, depth } = queue[head];
    const offset = tileId * 3;
    const dot = clamp(
      originX * graph.centers[offset] +
        originY * graph.centers[offset + 1] +
        originZ * graph.centers[offset + 2],
      -1,
      1
    );
    const distanceRad = Math.acos(dot);
    if (distanceRad <= maxDistanceRad) matches.push(Object.freeze({ tileId, distanceRad }));
    if (depth === maximumDepth) {
      nearestBoundaryDistanceRad = Math.min(nearestBoundaryDistanceRad, distanceRad);
      continue;
    }
    for (const neighborId of graph.neighbors[tileId]) {
      if (visited.has(neighborId)) continue;
      visited.add(neighborId);
      queue.push({ tileId: neighborId, depth: depth + 1 });
    }
  }

  if (nearestBoundaryDistanceRad <= maxDistanceRad + approximateSpacingRad * 2) {
    throw new Error(
      `Bounded world search reached its depth ${maximumDepth} too near the requested radius`
    );
  }
  return Object.freeze(matches);
}

function validateInputs(graph, originTileId, maxDistanceRad) {
  if (!graph || !Number.isInteger(graph.tileCount) || graph.tileCount <= 0 ||
      !(graph.centers instanceof Float32Array) || graph.centers.length !== graph.tileCount * 3 ||
      !isGraphRowCollection(graph.neighbors) || graph.neighbors.length !== graph.tileCount) {
    throw new Error("Bounded world search requires a complete geodesic graph");
  }
  if (!Number.isInteger(originTileId) || originTileId < 0 || originTileId >= graph.tileCount) {
    throw new Error(`Invalid bounded-search origin tile: ${originTileId}`);
  }
  if (!Number.isFinite(maxDistanceRad) || maxDistanceRad <= 0 || maxDistanceRad >= Math.PI) {
    throw new Error(`Invalid bounded-search radius: ${maxDistanceRad}`);
  }
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}
