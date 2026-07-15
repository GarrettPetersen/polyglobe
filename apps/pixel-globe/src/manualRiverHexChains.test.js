import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { buildGeodesicGraph, createDirectionIndex, findNearestTileId } from "./geodesic.js";
import { cityHasPortAccess } from "./cityPortAccess.js";
import { applyManualTerrainOverrides } from "./manualTerrainOverrides.js";
import {
  MANUAL_RIVER_HEX_CHAINS_BY_SUBDIVISIONS,
  MANUAL_RIVER_MOUTH_EDGES_BY_SUBDIVISIONS,
  MANUAL_SALTWATER_PASSAGE_HEX_IDS_BY_SUBDIVISIONS
} from "./manualRiverHexChains.js";

const SUBDIVISIONS = 7;
const repoRoot = new URL("../../../", import.meta.url);

test("Grand Canal gives Ming Beijing water access", async () => {
  const earth = JSON.parse(await readFile(
    new URL("examples/globe-demo/public/earth-globe-cache-7.json", repoRoot),
    "utf8"
  ));
  earth.tiles = applyManualTerrainOverrides(earth.tiles, SUBDIVISIONS);
  const graph = buildGeodesicGraph(SUBDIVISIONS);
  const directionIndex = createDirectionIndex(graph);
  const { masks, toWaterMasks } = buildRiverMasks(graph, earth);
  const reachable = buildOceanReachableNavigationMask(graph, earth.tiles, masks, toWaterMasks);
  const beijingTileId = findNearestTileId(graph, directionIndex, latLonToDirection(39.9075, 116.39723));

  assert.equal(beijingTileId, 15605);
  assert.equal(cityHasPortAccess({
    graph,
    earthRows: earth.tiles,
    reachableNavigationMask: reachable,
    riverMasks: masks,
    tileId: beijingTileId
  }), true);
});

test("saltwater passages are an explicit subset of manual river channels", () => {
  const chainTiles = new Set((MANUAL_RIVER_HEX_CHAINS_BY_SUBDIVISIONS[SUBDIVISIONS] || []).flat());
  const passageTiles = MANUAL_SALTWATER_PASSAGE_HEX_IDS_BY_SUBDIVISIONS[SUBDIVISIONS] || [];

  assert.ok(passageTiles.length > 0);
  assert.ok(passageTiles.every((tileId) => chainTiles.has(tileId)));
});

function buildRiverMasks(graph, earth) {
  const masks = new Uint8Array(graph.tileCount);
  const toWaterMasks = new Uint8Array(graph.tileCount);

  for (const [rawId, edges] of Object.entries(earth.riverEdges)) {
    const tileId = Number(rawId);
    for (const edge of edges) addRiverEdgeMask(graph, masks, tileId, edge);
  }
  for (const [rawId, edges] of Object.entries(earth.riverEdgeToWater || {})) {
    const tileId = Number(rawId);
    for (const edge of edges) addRiverEdgeMask(graph, toWaterMasks, tileId, edge);
  }
  for (const chain of MANUAL_RIVER_HEX_CHAINS_BY_SUBDIVISIONS[SUBDIVISIONS] || []) {
    for (let i = 0; i < chain.length - 1; i++) {
      addRiverEdgeBetween(graph, masks, chain[i], chain[i + 1]);
    }
  }
  for (const { tile, edge } of MANUAL_RIVER_MOUTH_EDGES_BY_SUBDIVISIONS[SUBDIVISIONS] || []) {
    addRiverEdgeMask(graph, masks, tile, edge);
    addRiverEdgeMask(graph, toWaterMasks, tile, edge);
  }
  markRiverEdgesOpeningToWater(graph, earth.tiles, masks, toWaterMasks);

  return { masks, toWaterMasks };
}

function buildOceanReachableNavigationMask(graph, earthRows, riverMasks, riverToWaterMasks) {
  const reachable = new Uint8Array(graph.tileCount);
  const queue = [];
  for (let tileId = 0; tileId < graph.tileCount; tileId++) {
    if (!isOceanNavigationSeedTile(earthRows[tileId])) continue;
    reachable[tileId] = 1;
    queue.push(tileId);
  }

  for (let head = 0; head < queue.length; head++) {
    const tileId = queue[head];
    for (const neighborId of graph.neighbors[tileId]) {
      if (reachable[neighborId]) continue;
      if (!canTraverseOceanReachability(graph, earthRows, riverMasks, riverToWaterMasks, tileId, neighborId)) {
        continue;
      }
      reachable[neighborId] = 1;
      queue.push(neighborId);
    }
  }
  return reachable;
}

function canTraverseOceanReachability(graph, earthRows, riverMasks, riverToWaterMasks, fromTileId, toTileId) {
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

function markRiverEdgesOpeningToWater(graph, earthRows, masks, toWaterMasks) {
  for (let tileId = 0; tileId < graph.tileCount; tileId++) {
    const mask = masks[tileId];
    if (mask === 0 || isWaterSurfaceRow(earthRows[tileId])) continue;
    for (let edge = 0; edge < graph.edgeCount[tileId]; edge++) {
      if ((mask & (1 << edge)) === 0) continue;
      const neighborId = graph.edgeNeighbors[tileId]?.[edge];
      if (isWaterSurfaceRow(earthRows[neighborId])) {
        addRiverEdgeMask(graph, toWaterMasks, tileId, edge);
      }
    }
  }
}

function addRiverEdgeBetween(graph, masks, a, b) {
  const edgeA = edgeIndexTowardNeighbor(graph, a, b);
  const edgeB = edgeIndexTowardNeighbor(graph, b, a);
  assert.notEqual(edgeA, undefined, `manual river tiles ${a} and ${b} are not adjacent`);
  assert.notEqual(edgeB, undefined, `manual river tiles ${b} and ${a} are not adjacent`);
  addRiverEdgeMask(graph, masks, a, edgeA);
  addRiverEdgeMask(graph, masks, b, edgeB);
}

function addRiverEdgeMask(graph, masks, tileId, edge) {
  assert.ok(Number.isInteger(edge) && edge >= 0 && edge < graph.edgeCount[tileId]);
  masks[tileId] |= 1 << edge;
}

function edgeIndexTowardNeighbor(graph, tileId, neighborId) {
  const edge = graph.edgeNeighbors[tileId]?.indexOf(neighborId);
  return edge >= 0 ? edge : undefined;
}

function riverEdgeSet(masks, tileId, edge) {
  return ((masks?.[tileId] || 0) & (1 << edge)) !== 0;
}

function isOceanNavigationSeedTile(row) {
  return row?.t === "water";
}

function isWaterSurfaceRow(row) {
  const t = row?.t || "";
  return t === "water" || t === "lake" || t === "beach";
}

function latLonToDirection(latDeg, lonDeg) {
  const lat = latDeg * Math.PI / 180;
  const lon = lonDeg * Math.PI / 180;
  const c = Math.cos(lat);
  return [c * Math.cos(lon), Math.sin(lat), -c * Math.sin(lon)];
}
