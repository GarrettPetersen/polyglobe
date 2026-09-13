import { canTraverseWorldNavigationEdge } from "./worldNavigationTopology.js";
import { isWaterSurfaceRow } from "./terrainSurface.js";

// Inland quays require a connected waterway; coastal quays also permit boarding
// from adjacent open water, regardless of river-mouth orientation. This last
// docking edge does not make land navigable. Two edges cover the docking radius.
export function portApproachReachable({ graph, earthRows, riverMasks, riverToWaterMasks, shipTileId, portTileId }) {
  if (!Number.isInteger(shipTileId) || !Number.isInteger(portTileId) ||
      !graph.neighbors[shipTileId] || !graph.neighbors[portTileId]) {
    throw new Error("Port approach requires valid ship and port tiles");
  }
  if (isWaterSurfaceRow(earthRows[portTileId]) || !riverMasks[portTileId]) return true;
  const visited = new Set([shipTileId]);
  let frontier = [shipTileId];
  for (let depth = 0; depth <= 2; depth++) {
    if (frontier.includes(portTileId)) return true;
    if (depth === 2) break;
    const next = [];
    for (const fromTileId of frontier) {
      for (const toTileId of graph.neighbors[fromTileId]) {
        if (visited.has(toTileId)) continue;
        if (toTileId === portTileId && isWaterSurfaceRow(earthRows[fromTileId])) return true;
        if (!canTraverseWorldNavigationEdge({ graph, earthRows, riverMasks, riverToWaterMasks, fromTileId, toTileId })) continue;
        visited.add(toTileId);
        next.push(toTileId);
      }
    }
    frontier = next;
  }
  return false;
}
