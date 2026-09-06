import { terrainStepDistanceKm } from "./terrainDistance.js";
import { isWaterSurfaceRow } from "./terrainSurface.js";

export const CASTAWAY_REMOTE_MIN_DISTANCE_KM = 600;

export function isRemoteCastawayShore({
  graph,
  earthRows,
  settlementTileIds,
  shoreTileId,
  minimumDistanceKm = CASTAWAY_REMOTE_MIN_DISTANCE_KM
}) {
  validateInputs({ graph, earthRows, settlementTileIds, shoreTileId, minimumDistanceKm });
  const stepKm = terrainStepDistanceKm(graph.subdivisions);
  if (isWaterSurfaceRow(earthRows[shoreTileId])) return false;
  const settlements = settlementTileIds instanceof Set
    ? settlementTileIds
    : new Set(settlementTileIds);
  if (settlements.has(shoreTileId)) return false;

  const visited = new Set([shoreTileId]);
  const queue = [{ tileId: shoreTileId, distanceKm: 0 }];
  for (let head = 0; head < queue.length; head++) {
    const current = queue[head];
    if (current.distanceKm + stepKm >= minimumDistanceKm) continue;
    for (const neighborId of graph.neighbors[current.tileId]) {
      if (visited.has(neighborId) || isWaterSurfaceRow(earthRows[neighborId])) continue;
      const distanceKm = current.distanceKm + stepKm;
      if (settlements.has(neighborId)) return false;
      visited.add(neighborId);
      queue.push({ tileId: neighborId, distanceKm });
    }
  }
  return true;
}

function validateInputs({ graph, earthRows, settlementTileIds, shoreTileId, minimumDistanceKm }) {
  if (!graph || !isGraphRowCollection(graph.neighbors) || !Number.isInteger(graph.tileCount)) {
    throw new Error("Remote shore search requires a geodesic graph");
  }
  if (!Array.isArray(earthRows) || earthRows.length !== graph.tileCount ||
      graph.neighbors.length !== graph.tileCount) {
    throw new Error("Remote shore search terrain does not match the graph");
  }
  if (!settlementTileIds || typeof settlementTileIds[Symbol.iterator] !== "function") {
    throw new Error("Remote shore search requires settlement tile ids");
  }
  if (!Number.isInteger(shoreTileId) || shoreTileId < 0 || shoreTileId >= graph.tileCount) {
    throw new Error(`Invalid castaway shore tile: ${shoreTileId}`);
  }
  if (!Number.isFinite(minimumDistanceKm) || minimumDistanceKm <= 0) {
    throw new Error(`Invalid castaway remote distance: ${minimumDistanceKm}`);
  }
}
import { isGraphRowCollection } from "./geodesicBake.js";
