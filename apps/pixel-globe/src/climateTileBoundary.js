import { isGraphRowCollection } from "./geodesicBake.js";

export function fineTilesBorderingCoarseTile({
  graph,
  coarseTileId,
  coarseTileIdForFineTile,
  acceptsBoundaryTile,
  maximumVisitedTiles = 128
}) {
  if (!graph || !Number.isInteger(graph.tileCount) || graph.tileCount <= 0 ||
      !isGraphRowCollection(graph.neighbors) || graph.neighbors.length !== graph.tileCount) {
    throw new Error("Climate boundary search requires a complete fine graph");
  }
  if (!Number.isInteger(coarseTileId) || coarseTileId < 0 || coarseTileId >= graph.tileCount) {
    throw new Error(`Invalid climate boundary source: ${coarseTileId}`);
  }
  if (typeof coarseTileIdForFineTile !== "function" || typeof acceptsBoundaryTile !== "function") {
    throw new Error("Climate boundary search requires mapping and acceptance functions");
  }
  if (!Number.isInteger(maximumVisitedTiles) || maximumVisitedTiles <= 0) {
    throw new Error(`Invalid climate boundary search limit: ${maximumVisitedTiles}`);
  }
  if (coarseTileIdForFineTile(coarseTileId) !== coarseTileId) {
    throw new Error(`Climate boundary source ${coarseTileId} does not map to itself`);
  }

  const visited = new Set([coarseTileId]);
  const queue = [coarseTileId];
  const boundaryTileIds = new Set();
  for (let head = 0; head < queue.length; head++) {
    const tileId = queue[head];
    for (const neighborId of graph.neighbors[tileId]) {
      if (visited.has(neighborId)) continue;
      visited.add(neighborId);
      if (coarseTileIdForFineTile(neighborId) === coarseTileId) {
        queue.push(neighborId);
      } else if (acceptsBoundaryTile(neighborId)) {
        boundaryTileIds.add(neighborId);
      }
    }
    if (visited.size > maximumVisitedTiles) {
      throw new Error(
        `Climate tile ${coarseTileId} covers more than ${maximumVisitedTiles} local fine cells`
      );
    }
  }
  return Object.freeze([...boundaryTileIds]);
}
