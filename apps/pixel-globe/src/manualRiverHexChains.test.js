import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { buildGeodesicGraph, createDirectionIndex, findNearestTileId } from "./geodesic.js";
import { cityHasPortAccess } from "./cityPortAccess.js";
import { applyManualTerrainOverrides } from "./manualTerrainOverrides.js";
import {
  MANUAL_BLOCKED_RIVER_HEX_EDGES_BY_SUBDIVISIONS,
  MANUAL_BLOCKED_RIVER_MOUTH_EDGES_BY_SUBDIVISIONS,
  MANUAL_CITY_RIVER_HEX_CHAINS_BY_SUBDIVISIONS,
  MANUAL_RIVER_HEX_CHAINS_BY_SUBDIVISIONS,
  MANUAL_RIVER_MOUTH_EDGES_BY_SUBDIVISIONS,
  MANUAL_SALTWATER_PASSAGE_HEX_IDS_BY_SUBDIVISIONS,
  removeBlockedRiverEdgesFromMasks,
  removeBlockedRiverMouthEdgesFromMasks
} from "./manualRiverHexChains.js";

const SUBDIVISIONS = 7;
const repoRoot = new URL("../../../", import.meta.url);

const MANUAL_CITY_RIVER_CONNECTIONS = Object.freeze([
  { city: "Guangzhou", lat: 23.11667, lon: 113.25, tileId: 61752 },
  { city: "Jingdezhen", lat: 29.268836, lon: 117.17842, tileId: 61646 },
  { city: "Florence", lat: 43.771033, lon: 11.248, tileId: 162182 },
  { city: "Bologna", lat: 44.49381, lon: 11.33875, tileId: 40274 },
  { city: "Verona", lat: 45.43419, lon: 10.99779, tileId: 161032 },
  { city: "Changsha", lat: 28.196111, lon: 112.972222, tileId: 15508 },
  { city: "Wroclaw", lat: 51.116667, lon: 17.033333, tileId: 98257 },
  { city: "Bremen", lat: 53.07516, lon: 8.80777, tileId: 98128 },
  { city: "Glasgow", lat: 55.86515, lon: -4.25763, tileId: 71858 },
  { city: "Hamburg", lat: 53.57532, lon: 10.01534, tileId: 98427 },
  { city: "Magdeburg", lat: 52.130808, lon: 11.628878, tileId: 98280 },
  { city: "Prague", lat: 50.08804, lon: 14.42076, tileId: 98296 },
  { city: "Lyon", lat: 45.74846, lon: 4.84671, tileId: 161095 },
  { city: "Toulouse", lat: 43.60426, lon: 1.44367, tileId: 10151 },
  { city: "Cordoba", lat: 38.046133, lon: -4.893564, tileId: 162135 },
  { city: "Zaragoza", lat: 41.648792, lon: -0.889581, tileId: 162350 },
  { city: "Vilnius", lat: 54.683333, lon: 25.283333, tileId: 99518 },
  { city: "Novgorod", lat: 58.525569, lon: 31.274192, tileId: 24836 },
  { city: "Kiev", lat: 50.45466, lon: 30.5238, tileId: 99609 },
  { city: "Smolensk", lat: 54.7818, lon: 32.0401, tileId: 99530 },
  { city: "Lahore", lat: 31.54972, lon: 74.34361, tileId: 24284 },
  { city: "Agra", lat: 27.18333, lon: 78.01667, tileId: 154941 },
  { city: "Diyarbakir", lat: 37.914411, lon: 40.230628, tileId: 102394 },
  { city: "Edirne", lat: 41.681808, lon: 26.562269, tileId: 98639 },
  { city: "Plovdiv", lat: 42.15, lon: 24.75, tileId: 98850 },
  { city: "Chiang Mai", lat: 18.790978, lon: 98.960775, tileId: 93453 }
]);

const INTENTIONALLY_INLAND_WATER_SETTLEMENTS = Object.freeze([
  { city: "Milan", tileId: 161043 },
  { city: "Moscow", tileId: 99089 },
  { city: "Nizhniy Novgorod", tileId: 99208 },
  { city: "Kazan", tileId: 24823 },
  { city: "Pskov", tileId: 6206 },
  { city: "Srinagar", tileId: 96806 },
  { city: "Mexico City", tileId: 19938 },
  { city: "Tzintzuntzan", tileId: 79272 },
  { city: "Toledo", tileId: 162273 }
]);

test("Grand Canal gives Ming Beijing water access", async () => {
  const { earth, graph, directionIndex, masks, reachable } = await buildManualRiverFixture();
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

test("manual city river corridors give their mapped city tiles ocean access", async () => {
  const { earth, graph, directionIndex, masks, reachable } = await buildManualRiverFixture();
  const cityChains = MANUAL_CITY_RIVER_HEX_CHAINS_BY_SUBDIVISIONS[SUBDIVISIONS];

  assert.deepEqual(Object.keys(cityChains), MANUAL_CITY_RIVER_CONNECTIONS.map(({ city }) => city));
  for (const { city, lat, lon, tileId } of MANUAL_CITY_RIVER_CONNECTIONS) {
    const nearestTileId = findNearestTileId(graph, directionIndex, latLonToDirection(lat, lon));
    assert.equal(nearestTileId, tileId, `${city} moved to a different globe tile`);
    assert.equal(cityChains[city][0], tileId, `${city} river chain must begin at its city tile`);
    assert.equal(reachable[tileId], 1, `${city} river chain must reach the ocean`);
    assert.equal(cityHasPortAccess({
      graph,
      earthRows: earth.tiles,
      reachableNavigationMask: reachable,
      riverMasks: masks,
      tileId
    }), true, `${city} must be dockable at its mapped tile`);
  }
});

test("the Elbe corridor does not turn Leipzig into a river port", async () => {
  const { earth, graph, directionIndex, masks, reachable } = await buildManualRiverFixture();
  const leipzigTileId = findNearestTileId(
    graph,
    directionIndex,
    latLonToDirection(51.33962, 12.37129)
  );

  assert.equal(leipzigTileId, 98284);
  assert.equal(cityHasPortAccess({
    graph,
    earthRows: earth.tiles,
    reachableNavigationMask: reachable,
    riverMasks: masks,
    tileId: leipzigTileId
  }), false);
});

test("closed-basin and post-1522 waterways remain inland", async () => {
  const { earth, graph, masks, reachable } = await buildManualRiverFixture();

  for (const { city, tileId } of INTENTIONALLY_INLAND_WATER_SETTLEMENTS) {
    assert.equal(cityHasPortAccess({
      graph,
      earthRows: earth.tiles,
      reachableNavigationMask: reachable,
      riverMasks: masks,
      tileId
    }), false, `${city} must not gain an ahistorical open-sea route`);
  }
});

test("saltwater passages are an explicit subset of manual river channels", () => {
  const chainTiles = new Set((MANUAL_RIVER_HEX_CHAINS_BY_SUBDIVISIONS[SUBDIVISIONS] || []).flat());
  const passageTiles = MANUAL_SALTWATER_PASSAGE_HEX_IDS_BY_SUBDIVISIONS[SUBDIVISIONS] || [];

  assert.ok(passageTiles.length > 0);
  assert.ok(passageTiles.every((tileId) => chainTiles.has(tileId)));
});

test("Mekong and Yangtze remain separate river systems", async () => {
  const { graph, masks } = await buildManualRiverFixture();
  const blockedEdges = MANUAL_BLOCKED_RIVER_HEX_EDGES_BY_SUBDIVISIONS[SUBDIVISIONS];

  assert.deepEqual(blockedEdges, [[92179, 92180]]);
  assert.equal(riverTilesConnected(graph, masks, 93216, 61636), false);
});

test("the Lena reaches the Laptev Sea without draining into Lake Baikal", async () => {
  const { earth, graph, masks, toWaterMasks, reachable } = await buildManualRiverFixture();
  const yakutskTileId = 54566;
  const lenaHeadwaterTileId = 57232;
  const falseBaikalOutlets = MANUAL_BLOCKED_RIVER_MOUTH_EDGES_BY_SUBDIVISIONS[SUBDIVISIONS];
  const deltaBranches = [
    { riverTileId: 54672, edge: 3, coastalTileId: 13710 },
    { riverTileId: 53872, edge: 2, coastalTileId: 13505 },
    { riverTileId: 53872, edge: 3, coastalTileId: 53878 },
  ];

  assert.deepEqual(falseBaikalOutlets, [
    { tile: 57232, edge: 4 },
    { tile: 57229, edge: 2 },
    { tile: 57229, edge: 3 },
  ]);
  assert.equal(riverTilesConnected(graph, masks, yakutskTileId, lenaHeadwaterTileId), true);
  for (const { tile, edge } of falseBaikalOutlets) {
    const lakeTileId = graph.edgeNeighbors[tile][edge];
    assert.equal(earth.tiles[lakeTileId].t, "lake");
    assert.equal(riverEdgeSet(masks, tile, edge), false);
    assert.equal(riverEdgeSet(toWaterMasks, tile, edge), false);
  }
  for (const { riverTileId, edge, coastalTileId } of deltaBranches) {
    assert.equal(graph.edgeNeighbors[riverTileId][edge], coastalTileId);
    assert.equal(earth.tiles[coastalTileId].t, "beach");
    assert.equal(riverEdgeSet(masks, riverTileId, edge), true);
    assert.equal(
      riverEdgeSet(toWaterMasks, riverTileId, edge),
      true,
      `Lena delta branch ${riverTileId}/${edge} must be marked river-to-water`
    );
    assert.equal(reachable[riverTileId], 1);
  }
  assert.equal(reachable[yakutskTileId], 1);
  assert.equal(reachable[lenaHeadwaterTileId], 1);
});

test("no coastal river component is stranded one edge from navigable water", async () => {
  const { earth, graph, masks, reachable } = await buildManualRiverFixture();
  const visited = new Uint8Array(graph.tileCount);

  for (let startTileId = 0; startTileId < graph.tileCount; startTileId++) {
    if (visited[startTileId] || masks[startTileId] === 0) continue;
    const component = connectedRiverTiles(graph, masks, startTileId, visited);
    const touchesReachableWater = component.some((tileId) => (
      graph.neighbors[tileId].some((neighborId) => (
        isWaterSurfaceRow(earth.tiles[neighborId]) && reachable[neighborId] === 1
      ))
    ));
    if (!touchesReachableWater) continue;
    assert.ok(
      component.every((tileId) => reachable[tileId] === 1),
      `river component ${startTileId} touches navigable coastal water but remains stranded`
    );
  }
});

test("both Yukon delta branches open into the Bering Sea", async () => {
  const { earth, graph, masks, reachable } = await buildManualRiverFixture();
  const branches = [
    { riverTileId: 47511, edge: 3, coastalTileId: 47529 },
    { riverTileId: 47521, edge: 2, coastalTileId: 11910 },
  ];

  assert.equal(riverTilesConnected(graph, masks, branches[0].riverTileId, branches[1].riverTileId), true);
  for (const { riverTileId, edge, coastalTileId } of branches) {
    assert.equal(graph.edgeNeighbors[riverTileId][edge], coastalTileId);
    assert.equal(isWaterSurfaceRow(earth.tiles[coastalTileId]), true);
    assert.equal(riverEdgeSet(masks, riverTileId, edge), true);
    assert.equal(reachable[riverTileId], 1);
  }
});

test("the Rio de la Plata opens into the South Atlantic", async () => {
  const { earth, graph, masks, reachable } = await buildManualRiverFixture();
  const deltaTileId = 6776;
  const mouthTileId = 106926;
  const mouthEdge = 2;
  const coastalTileId = 107948;

  assert.equal(riverTilesConnected(graph, masks, deltaTileId, mouthTileId), true);
  assert.equal(graph.edgeNeighbors[mouthTileId][mouthEdge], coastalTileId);
  assert.equal(isWaterSurfaceRow(earth.tiles[coastalTileId]), true);
  assert.equal(riverEdgeSet(masks, mouthTileId, mouthEdge), true);
  assert.equal(reachable[deltaTileId], 1);
  assert.equal(reachable[mouthTileId], 1);
});

test("the Whanganui River opens into the Tasman Sea", async () => {
  const { earth, graph, masks, reachable } = await buildManualRiverFixture();
  const upperRiverTileId = 88824;
  const lowerRiverTileId = 88822;
  const mouthTileId = 88758;
  const mouthEdge = 0;
  const coastalTileId = 88759;

  assert.equal(riverTilesConnected(graph, masks, upperRiverTileId, lowerRiverTileId), true);
  assert.equal(riverTilesConnected(graph, masks, lowerRiverTileId, mouthTileId), true);
  assert.equal(graph.edgeNeighbors[mouthTileId][mouthEdge], coastalTileId);
  assert.equal(isWaterSurfaceRow(earth.tiles[coastalTileId]), true);
  assert.equal(riverEdgeSet(masks, mouthTileId, mouthEdge), true);
  assert.equal(reachable[upperRiverTileId], 1);
  assert.equal(reachable[mouthTileId], 1);
});

test("the James, Potomac, and Hudson have short independent Atlantic navigation", async () => {
  const { earth, graph, masks, reachable } = await buildManualRiverFixture();
  const rivers = [
    { name: "James", head: 73682, mouth: 73670, edge: 0, water: 4642 },
    { name: "Potomac", head: 18467, mouth: 73669, edge: 5, water: 4642 },
    { name: "Hudson", head: 74307, mouth: 74845, edge: 5, water: 4716 }
  ];

  for (const river of rivers) {
    assert.equal(riverTilesConnected(graph, masks, river.head, river.mouth), true, `${river.name} chain`);
    assert.equal(graph.edgeNeighbors[river.mouth][river.edge], river.water, `${river.name} mouth`);
    assert.equal(earth.tiles[river.water].t, "water", `${river.name} must open to ocean water`);
    assert.equal(riverEdgeSet(masks, river.mouth, river.edge), true, `${river.name} mouth edge`);
    assert.equal(reachable[river.head], 1, `${river.name} head must be ocean reachable`);
  }

  assert.equal(
    riverTilesConnected(graph, masks, 73682, 19555),
    false,
    "the Chesapeake rivers must not join the Mississippi basin"
  );
});

test("all of Lake Malawi reaches the Indian Ocean through the Shire River", async () => {
  const { earth, graph, reachable } = await buildManualRiverFixture();
  const lakeCenterline = [
    31333, 124778, 7886, 124560, 124561,
    124564, 31274, 125693, 31571, 125695
  ];

  for (let index = 0; index < lakeCenterline.length; index++) {
    const tileId = lakeCenterline[index];
    assert.equal(earth.tiles[tileId].t, "lake", `Lake Malawi tile ${tileId} must be water`);
    assert.equal(reachable[tileId], 1, `Lake Malawi tile ${tileId} must reach the Shire River`);
    if (index === 0) continue;
    assert.equal(
      graph.neighbors[lakeCenterline[index - 1]].includes(tileId),
      true,
      `Lake Malawi must remain continuous at tile ${tileId}`
    );
  }
});

async function buildManualRiverFixture() {
  const earth = JSON.parse(await readFile(
    new URL("examples/globe-demo/public/earth-globe-cache-7.json", repoRoot),
    "utf8"
  ));
  earth.tiles = applyManualTerrainOverrides(earth.tiles, SUBDIVISIONS);
  const graph = buildGeodesicGraph(SUBDIVISIONS);
  const directionIndex = createDirectionIndex(graph);
  const { masks, toWaterMasks } = buildRiverMasks(graph, earth);
  const reachable = buildOceanReachableNavigationMask(graph, earth.tiles, masks, toWaterMasks);
  return { earth, graph, directionIndex, masks, toWaterMasks, reachable };
}

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
  removeBlockedRiverEdgesFromMasks(
    graph,
    masks,
    MANUAL_BLOCKED_RIVER_HEX_EDGES_BY_SUBDIVISIONS[SUBDIVISIONS] || []
  );
  removeBlockedRiverMouthEdgesFromMasks(
    graph,
    earth.tiles,
    masks,
    toWaterMasks,
    MANUAL_BLOCKED_RIVER_MOUTH_EDGES_BY_SUBDIVISIONS[SUBDIVISIONS] || []
  );
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

function riverTilesConnected(graph, masks, startTileId, targetTileId) {
  const queue = [startTileId];
  const seen = new Set(queue);
  for (let head = 0; head < queue.length; head++) {
    const tileId = queue[head];
    for (let edge = 0; edge < graph.edgeCount[tileId]; edge++) {
      if (!riverEdgeSet(masks, tileId, edge)) continue;
      const neighborId = graph.edgeNeighbors[tileId]?.[edge];
      if (neighborId === targetTileId) return true;
      if (neighborId === undefined || seen.has(neighborId)) continue;
      const reciprocalEdge = edgeIndexTowardNeighbor(graph, neighborId, tileId);
      if (reciprocalEdge === undefined || !riverEdgeSet(masks, neighborId, reciprocalEdge)) continue;
      seen.add(neighborId);
      queue.push(neighborId);
    }
  }
  return startTileId === targetTileId;
}

function connectedRiverTiles(graph, masks, startTileId, visited = new Uint8Array(graph.tileCount)) {
  const queue = [startTileId];
  visited[startTileId] = 1;
  for (let head = 0; head < queue.length; head++) {
    const tileId = queue[head];
    for (let edge = 0; edge < graph.edgeCount[tileId]; edge++) {
      if (!riverEdgeSet(masks, tileId, edge)) continue;
      const neighborId = graph.edgeNeighbors[tileId]?.[edge];
      if (neighborId === undefined || visited[neighborId]) continue;
      const reciprocalEdge = edgeIndexTowardNeighbor(graph, neighborId, tileId);
      if (reciprocalEdge === undefined || !riverEdgeSet(masks, neighborId, reciprocalEdge)) continue;
      visited[neighborId] = 1;
      queue.push(neighborId);
    }
  }
  return queue;
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
