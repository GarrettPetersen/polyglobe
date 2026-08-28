import {
  MANUAL_BLOCKED_RIVER_HEX_EDGES_BY_SUBDIVISIONS,
  MANUAL_BLOCKED_RIVER_MOUTH_EDGES_BY_SUBDIVISIONS,
  MANUAL_RIVER_HEX_CHAINS_BY_SUBDIVISIONS,
  MANUAL_RIVER_MOUTH_EDGES_BY_SUBDIVISIONS,
  removeBlockedRiverEdgesFromMasks,
  removeBlockedRiverMouthEdgesFromMasks
} from "./manualRiverHexChains.js";
import { isGraphRowCollection } from "./geodesicBake.js";
import { requiredSubdivisionMapData } from "./mapCorrectionData.js";
import { buildNamedRiverBasinIds } from "./riverBasins.js";
import { isWaterSurfaceRow } from "./terrainSurface.js";

export function buildWorldNavigationTopology({ graph, earthRows, earthCache, subdivisions }) {
  validateWorldInputs(graph, earthRows, subdivisions);
  if (!earthCache || typeof earthCache !== "object") throw new Error("World navigation requires the Earth cache");
  const riverData = buildRiverMasks({ graph, earthRows, earthCache, subdivisions });
  const reachableNavigationMask = buildOceanReachableNavigationMask({
    graph,
    earthRows,
    riverMasks: riverData.riverMasks,
    riverToWaterMasks: riverData.riverToWaterMasks
  });
  const riverBasinIds = buildNamedRiverBasinIds({
    graph,
    riverMasks: riverData.riverMasks,
    subdivisions
  });
  const navigableTileCount = countNavigableTiles(
    earthRows,
    riverData.riverMasks,
    reachableNavigationMask
  );
  return Object.freeze({
    riverMasks: riverData.riverMasks,
    riverToWaterMasks: riverData.riverToWaterMasks,
    riverBasinIds,
    reachableNavigationMask,
    stats: Object.freeze({
      riverTileCount: countRiverTiles(riverData.riverMasks),
      navigableTileCount,
      removedBlockedHalfEdges: riverData.removedBlockedHalfEdges,
      removedBlockedMouthHalfEdges: riverData.removedBlockedMouthHalfEdges,
      manualHalfEdges: riverData.manualHalfEdges,
      manualMouthHalfEdges: riverData.manualMouthHalfEdges,
      derivedMouthHalfEdges: riverData.derivedMouthHalfEdges
    })
  });
}

export function canTraverseWorldNavigationEdge({
  graph,
  earthRows,
  riverMasks,
  riverToWaterMasks,
  fromTileId,
  toTileId
}) {
  const fromWater = isWaterSurfaceRow(earthRows[fromTileId]);
  const toWater = isWaterSurfaceRow(earthRows[toTileId]);
  if (fromWater && toWater) return true;

  const edgeA = edgeIndexTowardNeighbor(graph, fromTileId, toTileId);
  const edgeB = edgeIndexTowardNeighbor(graph, toTileId, fromTileId);
  if (edgeA === undefined || edgeB === undefined) return false;

  const fromRiver = (riverMasks[fromTileId] || 0) !== 0;
  const toRiver = (riverMasks[toTileId] || 0) !== 0;
  if (fromWater && toRiver) {
    return riverEdgeSet(riverMasks, toTileId, edgeB) || riverEdgeSet(riverToWaterMasks, toTileId, edgeB);
  }
  if (fromRiver && toWater) {
    return riverEdgeSet(riverMasks, fromTileId, edgeA) || riverEdgeSet(riverToWaterMasks, fromTileId, edgeA);
  }
  if (fromRiver && toRiver) {
    return riverEdgeSet(riverMasks, fromTileId, edgeA) && riverEdgeSet(riverMasks, toTileId, edgeB);
  }
  return false;
}

export function isWorldNavigableTile({ earthRows, riverMasks, reachableNavigationMask, tileId }) {
  return reachableNavigationMask[tileId] === 1 && (
    isWaterSurfaceRow(earthRows[tileId]) || (riverMasks[tileId] || 0) !== 0
  );
}

export function edgeIndexTowardNeighbor(graph, tileId, neighborId) {
  const edgeNeighbors = graph.edgeNeighbors[tileId];
  if (!edgeNeighbors) return undefined;
  const edge = edgeNeighbors.indexOf(neighborId);
  return edge >= 0 ? edge : undefined;
}

export function riverEdgeSet(masks, tileId, edge) {
  return Number.isInteger(edge) && (masks[tileId] & (1 << edge)) !== 0;
}

function buildRiverMasks({ graph, earthRows, earthCache, subdivisions }) {
  if (!earthCache.riverEdges || typeof earthCache.riverEdges !== "object") {
    throw new Error(
      `Earth cache is missing riverEdges for subdivision ${subdivisions}; rebuild the Earth cache`
    );
  }
  const riverMasks = new Uint8Array(graph.tileCount);
  const riverToWaterMasks = new Uint8Array(graph.tileCount);
  addCacheRiverEdges(graph, riverMasks, earthCache.riverEdges, "Earth cache tile");
  if (earthCache.riverEdgeToWater != null) {
    if (typeof earthCache.riverEdgeToWater !== "object") {
      throw new Error("Earth cache riverEdgeToWater must be an object when present");
    }
    addCacheRiverEdges(graph, riverToWaterMasks, earthCache.riverEdgeToWater, "Earth cache river-to-water tile");
  }

  const removedBlockedHalfEdges = removeBlockedRiverEdgesFromMasks(
    graph,
    riverMasks,
    requiredSubdivisionMapData(
      MANUAL_BLOCKED_RIVER_HEX_EDGES_BY_SUBDIVISIONS,
      subdivisions,
      "blocked river-edge corrections"
    )
  );
  const removedBlockedMouthHalfEdges = removeBlockedRiverMouthEdgesFromMasks(
    graph,
    earthRows,
    riverMasks,
    riverToWaterMasks,
    requiredSubdivisionMapData(
      MANUAL_BLOCKED_RIVER_MOUTH_EDGES_BY_SUBDIVISIONS,
      subdivisions,
      "blocked river-mouth corrections"
    )
  );
  const manualHalfEdges = mergeManualRiverChains(graph, riverMasks, subdivisions);
  const manualMouthHalfEdges = mergeManualRiverMouthEdges(
    graph,
    earthRows,
    riverMasks,
    riverToWaterMasks,
    subdivisions
  );
  const derivedMouthHalfEdges = markRiverEdgesOpeningToWater(
    graph,
    earthRows,
    riverMasks,
    riverToWaterMasks
  );
  return {
    riverMasks,
    riverToWaterMasks,
    removedBlockedHalfEdges,
    removedBlockedMouthHalfEdges,
    manualHalfEdges,
    manualMouthHalfEdges,
    derivedMouthHalfEdges
  };
}

function addCacheRiverEdges(graph, masks, source, label) {
  for (const [rawId, edges] of Object.entries(source)) {
    const tileId = Number(rawId);
    if (!Number.isInteger(tileId) || tileId < 0 || tileId >= graph.tileCount) {
      throw new Error(`Invalid river tile id in ${label}: ${rawId}`);
    }
    if (!Array.isArray(edges)) throw new Error(`Invalid river edge list for tile ${tileId}`);
    for (const edge of edges) addRiverEdgeMask(graph, masks, tileId, edge, `${label} ${tileId}`);
  }
}

function mergeManualRiverChains(graph, masks, subdivisions) {
  const chains = requiredSubdivisionMapData(
    MANUAL_RIVER_HEX_CHAINS_BY_SUBDIVISIONS,
    subdivisions,
    "manual river-chain corrections"
  );
  let added = 0;
  for (const chain of chains) {
    for (let index = 0; index < chain.length - 1; index++) {
      added += addRiverEdgeBetween(graph, masks, chain[index], chain[index + 1], "manual river chain");
    }
  }
  return added;
}

function mergeManualRiverMouthEdges(graph, earthRows, masks, toWaterMasks, subdivisions) {
  const mouths = requiredSubdivisionMapData(
    MANUAL_RIVER_MOUTH_EDGES_BY_SUBDIVISIONS,
    subdivisions,
    "manual river-mouth corrections"
  );
  let added = 0;
  for (const { tile, edge } of mouths) {
    const neighborId = graph.edgeNeighbors[tile]?.[edge];
    if (neighborId === undefined) throw new Error(`manual river mouth: tile ${tile} has no edge ${edge}`);
    if (!isWaterSurfaceRow(earthRows[neighborId])) {
      throw new Error(`manual river mouth: tile ${tile} edge ${edge} does not touch water`);
    }
    added += addRiverEdgeMask(graph, masks, tile, edge, `manual river mouth tile ${tile}`);
    addRiverEdgeMask(graph, toWaterMasks, tile, edge, `manual river mouth tile ${tile}`);
  }
  return added;
}

function markRiverEdgesOpeningToWater(graph, earthRows, masks, toWaterMasks) {
  let added = 0;
  for (let tileId = 0; tileId < graph.tileCount; tileId++) {
    const mask = masks[tileId];
    if (mask === 0 || isWaterSurfaceRow(earthRows[tileId])) continue;
    for (let edge = 0; edge < graph.edgeCount[tileId]; edge++) {
      if ((mask & (1 << edge)) === 0) continue;
      const neighborId = graph.edgeNeighbors[tileId]?.[edge];
      if (neighborId === undefined) throw new Error(`River edge ${edge} on tile ${tileId} has no edge neighbor`);
      if (isWaterSurfaceRow(earthRows[neighborId])) {
        added += addRiverEdgeMask(graph, toWaterMasks, tileId, edge, `derived river-to-water tile ${tileId}`);
      }
    }
  }
  return added;
}

function addRiverEdgeBetween(graph, masks, a, b, source) {
  const edgeA = edgeIndexTowardNeighbor(graph, a, b);
  const edgeB = edgeIndexTowardNeighbor(graph, b, a);
  if (edgeA === undefined || edgeB === undefined) throw new Error(`${source}: tiles ${a} and ${b} are not adjacent`);
  return addRiverEdgeMask(graph, masks, a, edgeA, `${source} ${a}->${b}`) +
    addRiverEdgeMask(graph, masks, b, edgeB, `${source} ${b}->${a}`);
}

function addRiverEdgeMask(graph, masks, tileId, edge, source) {
  const edgeCount = graph.edgeCount[tileId];
  if (!Number.isInteger(edge) || edge < 0 || edge >= edgeCount) {
    throw new Error(`${source}: invalid edge ${edge}; tile ${tileId} has ${edgeCount} edges`);
  }
  const bit = 1 << edge;
  if ((masks[tileId] & bit) !== 0) return 0;
  masks[tileId] |= bit;
  return 1;
}

function buildOceanReachableNavigationMask({ graph, earthRows, riverMasks, riverToWaterMasks }) {
  const reachable = new Uint8Array(graph.tileCount);
  const queue = [];
  for (let tileId = 0; tileId < graph.tileCount; tileId++) {
    if (earthRows[tileId]?.t !== "water") continue;
    reachable[tileId] = 1;
    queue.push(tileId);
  }
  for (let head = 0; head < queue.length; head++) {
    const tileId = queue[head];
    for (const neighborId of graph.neighbors[tileId]) {
      if (reachable[neighborId]) continue;
      if (!canTraverseWorldNavigationEdge({
        graph,
        earthRows,
        riverMasks,
        riverToWaterMasks,
        fromTileId: tileId,
        toTileId: neighborId
      })) continue;
      reachable[neighborId] = 1;
      queue.push(neighborId);
    }
  }
  return reachable;
}

function validateWorldInputs(graph, earthRows, subdivisions) {
  if (!graph || !Number.isInteger(graph.tileCount) || !isGraphRowCollection(graph.neighbors)) {
    throw new Error("World navigation requires a geodesic graph");
  }
  if (!Array.isArray(earthRows) || earthRows.length !== graph.tileCount) {
    throw new Error("World navigation requires one terrain row per graph tile");
  }
  if (graph.subdivisions !== subdivisions) {
    throw new Error(`World navigation subdivision mismatch: graph ${graph.subdivisions}, requested ${subdivisions}`);
  }
}

function countRiverTiles(masks) {
  let count = 0;
  for (const mask of masks) if (mask !== 0) count++;
  return count;
}

function countNavigableTiles(earthRows, riverMasks, reachableNavigationMask) {
  let count = 0;
  for (let tileId = 0; tileId < earthRows.length; tileId++) {
    if (isWorldNavigableTile({ earthRows, riverMasks, reachableNavigationMask, tileId })) count++;
  }
  return count;
}
