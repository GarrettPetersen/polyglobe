export const RIVER_BASIN_ID = Object.freeze({
  NONE: 0,
  MEKONG: 1,
  AMAZON: 2,
  MURRAY_DARLING: 3,
  EAST_CHINA_NETWORK: 4,
  AMUR: 5,
  PEARL: 6,
  RHINE: 7,
  DANUBE_BLACK_SEA_NETWORK: 8,
  VOLGA_CASPIAN_NETWORK: 9,
  ELBE_ODER_NETWORK: 10,
  VISTULA_BALTIC_NETWORK: 11,
  ORINOCO: 12,
  PARANA: 13,
  INDUS: 14,
  GANGES_BRAHMAPUTRA: 15,
  IRRAWADDY: 16
});

const NAMED_RIVER_BASINS = Object.freeze([
  Object.freeze({
    id: RIVER_BASIN_ID.MEKONG,
    name: "Mekong",
    anchorTileBySubdivisions: Object.freeze({
      7: 93216,
      8: 93216
    })
  }),
  basin(RIVER_BASIN_ID.AMAZON, "Amazon", 138275),
  basin(RIVER_BASIN_ID.MURRAY_DARLING, "Murray-Darling", 150752),
  basin(RIVER_BASIN_ID.EAST_CHINA_NETWORK, "Yangtze-Yellow river network", 61636),
  basin(RIVER_BASIN_ID.AMUR, "Amur", 15074),
  basin(RIVER_BASIN_ID.PEARL, "Pearl", 61752),
  basin(RIVER_BASIN_ID.RHINE, "Rhine", 161056),
  basin(RIVER_BASIN_ID.DANUBE_BLACK_SEA_NETWORK, "Danube-Black Sea river network", 24784),
  basin(RIVER_BASIN_ID.VOLGA_CASPIAN_NETWORK, "Volga-Caspian river network", 24872),
  basin(RIVER_BASIN_ID.ELBE_ODER_NETWORK, "Elbe-Oder river network", 98242),
  basin(RIVER_BASIN_ID.VISTULA_BALTIC_NETWORK, "Vistula-Baltic river network", 98230),
  basin(RIVER_BASIN_ID.ORINOCO, "Orinoco", 138903),
  basin(RIVER_BASIN_ID.PARANA, "Parana", 106954),
  basin(RIVER_BASIN_ID.INDUS, "Indus", 97492),
  basin(RIVER_BASIN_ID.GANGES_BRAHMAPUTRA, "Ganges-Brahmaputra", 155083),
  basin(RIVER_BASIN_ID.IRRAWADDY, "Irrawaddy", 93194)
]);

function basin(id, name, subdivisionSevenAnchorTileId) {
  return Object.freeze({
    id,
    name,
    anchorTileBySubdivisions: Object.freeze({
      7: subdivisionSevenAnchorTileId,
      8: subdivisionSevenAnchorTileId
    })
  });
}

export function buildNamedRiverBasinIds({ graph, riverMasks, subdivisions }) {
  if (!graph || !Number.isInteger(graph.tileCount) || !isGraphRowCollection(graph.edgeNeighbors)) {
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
import { isGraphRowCollection } from "./geodesicBake.js";
