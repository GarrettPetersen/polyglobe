export const RIVER_BASIN_ID = Object.freeze({
  NONE: 0,
  MEKONG: 1
});

const NAMED_RIVER_BASINS = Object.freeze([
  Object.freeze({
    id: RIVER_BASIN_ID.MEKONG,
    name: "Mekong",
    anchorTileBySubdivisions: Object.freeze({
      7: 93216
    })
  })
]);

export function buildNamedRiverBasinIds({ graph, riverMasks, subdivisions }) {
  if (!graph || !Number.isInteger(graph.tileCount) || !Array.isArray(graph.edgeNeighbors)) {
    throw new Error("Named river basins require a geodesic graph");
  }
  if (!(riverMasks instanceof Uint8Array) || riverMasks.length !== graph.tileCount) {
    throw new Error("Named river basins require one river mask per graph tile");
  }
  if (!Number.isInteger(subdivisions) || subdivisions !== graph.subdivisions) {
    throw new Error(`Named river basin subdivision mismatch: ${subdivisions}/${graph.subdivisions}`);
  }

  const basinIds = new Uint8Array(graph.tileCount);
  for (const basin of NAMED_RIVER_BASINS) {
    const anchorTileId = basin.anchorTileBySubdivisions[subdivisions];
    if (!Number.isInteger(anchorTileId)) {
      throw new Error(`${basin.name} basin has no anchor for subdivision ${subdivisions}`);
    }
    labelConnectedRiverBasin(graph, riverMasks, basinIds, basin, anchorTileId);
  }
  return basinIds;
}

function labelConnectedRiverBasin(graph, riverMasks, basinIds, basin, anchorTileId) {
  if (anchorTileId < 0 || anchorTileId >= graph.tileCount || riverMasks[anchorTileId] === 0) {
    throw new Error(`${basin.name} basin anchor is not a river tile: ${anchorTileId}`);
  }
  const queue = [anchorTileId];
  basinIds[anchorTileId] = basin.id;
  for (let head = 0; head < queue.length; head++) {
    const tileId = queue[head];
    for (let edge = 0; edge < graph.edgeCount[tileId]; edge++) {
      if (!riverEdgeSet(riverMasks, tileId, edge)) continue;
      const neighborId = graph.edgeNeighbors[tileId]?.[edge];
      if (neighborId === undefined) {
        throw new Error(`${basin.name} basin river edge has no neighbor: ${tileId}/${edge}`);
      }
      const reciprocalEdge = edgeIndexTowardNeighbor(graph, neighborId, tileId);
      if (reciprocalEdge === undefined || !riverEdgeSet(riverMasks, neighborId, reciprocalEdge)) continue;
      const existingBasinId = basinIds[neighborId];
      if (existingBasinId !== RIVER_BASIN_ID.NONE && existingBasinId !== basin.id) {
        throw new Error(`${basin.name} basin overlaps named basin ${existingBasinId} at tile ${neighborId}`);
      }
      if (existingBasinId === basin.id) continue;
      basinIds[neighborId] = basin.id;
      queue.push(neighborId);
    }
  }
}

function edgeIndexTowardNeighbor(graph, tileId, neighborId) {
  const edge = graph.edgeNeighbors[tileId]?.indexOf(neighborId) ?? -1;
  return edge >= 0 ? edge : undefined;
}

function riverEdgeSet(masks, tileId, edge) {
  return Number.isInteger(edge) && (masks[tileId] & (1 << edge)) !== 0;
}
