import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildGeodesicGraph, createDirectionIndex } from "./geodesic.js";
import { applyManualTerrainOverrides } from "./manualTerrainOverrides.js";
import { isWaterSurfaceRow } from "./terrainSurface.js";
import { buildWorldNavigationTopology } from "./worldNavigationTopology.js";
import {
  CIRCUMNAVIGATION_DISCOVERY,
  DEFAULT_MOUNTAIN_DISCOVERY_RADIUS_PX,
  EL_DORADO_DISCOVERY_ID,
  EL_DORADO_DISCOVERY_LAT,
  EL_DORADO_DISCOVERY_LON,
  EL_DORADO_DISCOVERY_RADIUS_PX,
  GRAND_CANAL_DISCOVERY_ID,
  GREAT_BARRIER_REEF_DISCOVERY_ID,
  GREAT_PYRAMID_DISCOVERY_ID,
  LAKE_VICTORIA_DISCOVERY_ID,
  LAKE_VICTORIA_DISCOVERY_RADIUS_PX,
  MOUNT_SHASTA_DISCOVERY_RADIUS_PX,
  MOUNTAIN_DISCOVERY_MENU_SPRITE_KEY,
  MOAI_DISCOVERY_ID,
  NIAGARA_FALLS_DISCOVERY_ID,
  NIAGARA_FALLS_DISCOVERY_RADIUS_PX,
  VICTORIA_FALLS_DISCOVERY_ID,
  VICTORIA_FALLS_DISCOVERY_RADIUS_PX,
  WATER_DISCOVERY_MENU_SPRITE_KEY,
  WORLD_DISCOVERY_SPECS,
  WORLD_DISCOVERY_SPRITE_KEYS,
  buildWorldDiscoveries,
  captainDialogueForDiscovery,
  isDiscoveryNovelToCharacter,
  mountainDiscovery,
  mountainIsAccessibleFromNavigation
} from "./discoveries.js";
import {
  AUTHORED_WORLD_REPORT_IDS,
  explorerJournalDescriptionForDiscovery,
  explorerReportDialogueForDiscovery,
  validateExplorerReportDialogueCatalog
} from "./explorerDiscoveryDialogue.js";
import {
  consumePendingDiscoveryPortDialogue,
  createGameState,
  pendingDiscoveryPortDialogue,
  recordDiscovery,
  validateGameState
} from "./gameState.js";

const PRODUCTION_SUBDIVISIONS = 7;
const PRODUCTION_PIXELS_PER_RADIAN = 2450;
const repoRoot = new URL("../../../", import.meta.url);

test("world wonders map onto globe tiles and visual landmarks get dedicated art tiles", () => {
  const graph = buildGeodesicGraph(5);
  const landMask = new Uint8Array(graph.tileCount).fill(1);
  const riverMasks = new Uint8Array(graph.tileCount);
  const riverToWaterMasks = new Uint8Array(graph.tileCount);
  const navigationMask = new Uint8Array(graph.tileCount).fill(1);
  const discoveries = buildWorldDiscoveries(graph, createDirectionIndex(graph), {
    landMask,
    cityTileIds: [],
    riverMasks,
    riverToWaterMasks,
    navigationMask,
    pixelsPerRadian: 2450
  });
  assert.equal(discoveries.length, 21);
  assert.equal(discoveries[0].id, GREAT_PYRAMID_DISCOVERY_ID);
  assert.equal(discoveries[1].id, LAKE_VICTORIA_DISCOVERY_ID);
  assert.equal(discoveries[1].radiusPx, LAKE_VICTORIA_DISCOVERY_RADIUS_PX);
  assert.equal(LAKE_VICTORIA_DISCOVERY_RADIUS_PX, 60);
  assert.ok(discoveries.every((item) => Number.isInteger(item.tileId)));
  assert.ok(discoveries.every((item) =>
    item.spriteKey ? Number.isInteger(item.spriteTileId) : item.spriteTileId === null
  ));
  const pyramid = discoveries.find((item) => item.id === GREAT_PYRAMID_DISCOVERY_ID);
  assert.ok(pyramid);
  assert.ok(Number.isInteger(pyramid.spriteTileId));
  assert.ok(graph.lonDeg[pyramid.spriteTileId] < pyramid.lon, "pyramid artwork must remain west of the Nile");
  const elDorado = discoveries.find((item) => item.id === EL_DORADO_DISCOVERY_ID);
  assert.ok(elDorado);
  assert.equal(elDorado.kind, "legend");
  assert.equal(elDorado.historicity, "legendary");
  assert.equal(elDorado.lat, EL_DORADO_DISCOVERY_LAT);
  assert.equal(elDorado.lon, EL_DORADO_DISCOVERY_LON);
  assert.equal(elDorado.radiusPx, EL_DORADO_DISCOVERY_RADIUS_PX);
  assert.match(elDorado.captainDialogue, /legendary city of gold/i);
  assert.deepEqual(elDorado.cargoReward, {
    goodId: "gold",
    fillRemainingHold: true
  });
  const grandCanal = discoveries.find((item) => item.id === GRAND_CANAL_DISCOVERY_ID);
  assert.ok(grandCanal);
  assert.equal(grandCanal.displayName, "The Grand Canal");
  assert.equal(grandCanal.spriteKey, null);
  assert.equal(grandCanal.historicity, "historical");
  assert.equal(grandCanal.routeDirections.length, 8);
  const reef = discoveries.find((item) => item.id === GREAT_BARRIER_REEF_DISCOVERY_ID);
  assert.ok(reef);
  assert.equal(reef.displayName, "Great Barrier Reef");
  assert.equal(reef.spriteKey, "coral_01");
  assert.equal(reef.underwater, true);
  assert.equal(navigationMask[reef.spriteTileId], 1);
  assert.equal(CIRCUMNAVIGATION_DISCOVERY.kind, "achievement");
  assert.equal(CIRCUMNAVIGATION_DISCOVERY.menuIconId, "achievement:magellan");
  assert.equal(CIRCUMNAVIGATION_DISCOVERY.countsTowardExplorerGoal, true);
  assert.equal(CIRCUMNAVIGATION_DISCOVERY.explorerLeadAssignable, false);
  assert.equal(CIRCUMNAVIGATION_DISCOVERY.explorerRewardDoubloons, 3000);
});

test("El Dorado requires a close upper-Amazon approach", () => {
  const elDorado = WORLD_DISCOVERY_SPECS.find((item) => item.id === EL_DORADO_DISCOVERY_ID);
  const panama = { lat: 8.9824, lon: -79.5199 };
  const panamaDistancePx = greatCircleDistancePx(panama, elDorado, 2450);

  assert.ok(elDorado.lat < 0, "El Dorado should be south of the equator in the upper Amazon");
  assert.ok(elDorado.lon < -70, "El Dorado should remain far upriver in the western Amazon");
  assert.ok(
    panamaDistancePx > elDorado.radiusPx * 10,
    "El Dorado must not be discoverable from Panama"
  );
});

test("waterfall discoveries require their inland approaches but remain forgiving there", async () => {
  const earth = JSON.parse(await readFile(
    new URL("examples/globe-demo/public/earth-globe-cache-7.json", repoRoot),
    "utf8"
  ));
  earth.tiles = applyManualTerrainOverrides(earth.tiles, PRODUCTION_SUBDIVISIONS);
  const graph = buildGeodesicGraph(PRODUCTION_SUBDIVISIONS);
  const topology = buildWorldNavigationTopology({
    graph,
    earthRows: earth.tiles,
    earthCache: earth,
    subdivisions: PRODUCTION_SUBDIVISIONS
  });
  const discoveries = buildWorldDiscoveries(graph, createDirectionIndex(graph), {
    landMask: Uint8Array.from(earth.tiles, (row) => isWaterSurfaceRow(row) ? 0 : 1),
    cityTileIds: [],
    riverMasks: topology.riverMasks,
    riverToWaterMasks: topology.riverToWaterMasks,
    navigationMask: topology.reachableNavigationMask,
    pixelsPerRadian: PRODUCTION_PIXELS_PER_RADIAN
  });
  const falls = discoveries.find((item) => item.id === VICTORIA_FALLS_DISCOVERY_ID);
  const sofalaDistancePx = greatCircleDistancePx(
    { lat: -20.1653, lon: 34.7153 },
    falls,
    PRODUCTION_PIXELS_PER_RADIAN
  );

  assert.equal(falls.radiusPx, VICTORIA_FALLS_DISCOVERY_RADIUS_PX);
  assert.ok(falls.navigationDistancePx < falls.radiusPx, "the navigable Zambezi must reach discovery range");
  assert.ok(sofalaDistancePx > falls.radiusPx * 7, "Victoria Falls must not be visible from Sofala");

  const niagara = discoveries.find((item) => item.id === NIAGARA_FALLS_DISCOVERY_ID);
  const atlanticCityDistancePx = greatCircleDistancePx(
    { lat: 39.3643, lon: -74.4229 },
    niagara,
    PRODUCTION_PIXELS_PER_RADIAN
  );

  assert.equal(niagara.radiusPx, NIAGARA_FALLS_DISCOVERY_RADIUS_PX);
  assert.ok(
    niagara.navigationDistancePx < niagara.radiusPx / 3,
    "the Great Lakes approach must provide a generous Niagara discovery margin"
  );
  assert.ok(
    atlanticCityDistancePx > niagara.radiusPx * 3,
    "Niagara Falls must not be discoverable from the Atlantic coast"
  );
});

test("the Moai occupy a dedicated Rapa Nui hex beside the village", async () => {
  const earth = JSON.parse(await readFile(
    new URL("examples/globe-demo/public/earth-globe-cache-7.json", repoRoot),
    "utf8"
  ));
  earth.tiles = applyManualTerrainOverrides(earth.tiles, PRODUCTION_SUBDIVISIONS);
  const graph = buildGeodesicGraph(PRODUCTION_SUBDIVISIONS);
  const topology = buildWorldNavigationTopology({
    graph,
    earthRows: earth.tiles,
    earthCache: earth,
    subdivisions: PRODUCTION_SUBDIVISIONS
  });
  const landMask = Uint8Array.from(earth.tiles, (row) => isWaterSurfaceRow(row) ? 0 : 1);
  const villageTileId = 141773;
  const discoveries = buildWorldDiscoveries(graph, createDirectionIndex(graph), {
    landMask,
    cityTileIds: new Map([[villageTileId, true]]).keys(),
    riverMasks: topology.riverMasks,
    riverToWaterMasks: topology.riverToWaterMasks,
    navigationMask: topology.reachableNavigationMask,
    pixelsPerRadian: PRODUCTION_PIXELS_PER_RADIAN
  });
  const moai = discoveries.find((item) => item.id === MOAI_DISCOVERY_ID);

  assert.ok(moai);
  assert.equal(moai.spriteKey, "moai");
  assert.equal(moai.spriteTileId, 8932);
  assert.notEqual(moai.spriteTileId, villageTileId);
  assert.equal(graph.neighbors[villageTileId].includes(moai.spriteTileId), false);
  assert.ok(graph.neighbors[141771].includes(moai.spriteTileId));
  assert.equal(earth.tiles[villageTileId].m, earth.tiles[moai.spriteTileId].m);
  assert.equal(landMask[moai.spriteTileId], 1);
});

test("the Nazca Lines sit inland without overlapping the Pacific", async () => {
  const earth = JSON.parse(await readFile(
    new URL("examples/globe-demo/public/earth-globe-cache-7.json", repoRoot),
    "utf8"
  ));
  earth.tiles = applyManualTerrainOverrides(earth.tiles, PRODUCTION_SUBDIVISIONS);
  const graph = buildGeodesicGraph(PRODUCTION_SUBDIVISIONS);
  const topology = buildWorldNavigationTopology({
    graph,
    earthRows: earth.tiles,
    earthCache: earth,
    subdivisions: PRODUCTION_SUBDIVISIONS
  });
  const landMask = Uint8Array.from(earth.tiles, (row) => isWaterSurfaceRow(row) ? 0 : 1);
  const discoveries = buildWorldDiscoveries(graph, createDirectionIndex(graph), {
    landMask,
    cityTileIds: [],
    riverMasks: topology.riverMasks,
    riverToWaterMasks: topology.riverToWaterMasks,
    navigationMask: topology.reachableNavigationMask,
    pixelsPerRadian: PRODUCTION_PIXELS_PER_RADIAN
  });
  const nazca = discoveries.find((item) => item.id === "landmark-nazca-lines");

  assert.ok(nazca);
  assert.equal(earth.tiles[nazca.spriteTileId].t, "cold_desert");
  assert.ok(graph.lonDeg[nazca.spriteTileId] > nazca.lon, "Nazca artwork must move east, inland from the coast");
  assert.ok(
    graph.neighbors[nazca.spriteTileId].every((tileId) => landMask[tileId]),
    "Nazca artwork needs a complete land ring between its center and the Pacific"
  );
});

test("world discovery registry is unique, complete, and explicit about historicity", () => {
  assert.equal(new Set(WORLD_DISCOVERY_SPECS.map((item) => item.id)).size, WORLD_DISCOVERY_SPECS.length);
  assert.equal(new Set(WORLD_DISCOVERY_SPRITE_KEYS).size, WORLD_DISCOVERY_SPRITE_KEYS.length);
  assert.deepEqual(
    WORLD_DISCOVERY_SPRITE_KEYS,
    WORLD_DISCOVERY_SPECS.map((item) => item.spriteKey).filter(Boolean)
  );
  assert.ok(WORLD_DISCOVERY_SPECS.every((item) => ["historical", "legendary"].includes(item.historicity)));
  const waterFeatures = new Set([
    LAKE_VICTORIA_DISCOVERY_ID,
    GRAND_CANAL_DISCOVERY_ID,
    "landmark-niagara-falls",
    "landmark-victoria-falls",
    "landmark-lake-titicaca"
  ]);
  assert.ok(WORLD_DISCOVERY_SPECS
    .filter((item) => waterFeatures.has(item.id))
    .every((item) =>
      item.spriteKey === null && item.menuTerrainSpriteKey === WATER_DISCOVERY_MENU_SPRITE_KEY
    ));
  assert.equal(
    mountainDiscovery({ id: "mountain-fuji", displayName: "Mount Fuji", elevationM: 3776, tileId: 42 })
      .menuTerrainSpriteKey,
    MOUNTAIN_DISCOVERY_MENU_SPRITE_KEY
  );
  assert.deepEqual(
    new Set(AUTHORED_WORLD_REPORT_IDS),
    new Set([...WORLD_DISCOVERY_SPECS.map((item) => item.id), CIRCUMNAVIGATION_DISCOVERY.id])
  );
  assert.equal(
    validateExplorerReportDialogueCatalog([...WORLD_DISCOVERY_SPECS, CIRCUMNAVIGATION_DISCOVERY]),
    WORLD_DISCOVERY_SPECS.length + 1
  );
  const canalReport = explorerReportDialogueForDiscovery(
    WORLD_DISCOVERY_SPECS.find((item) => item.id === GRAND_CANAL_DISCOVERY_ID)
  );
  assert.match(canalReport.player, /gates raise and lower the water/i);
  assert.match(canalReport.patron, /empire fed by an engineered river/i);
  assert.equal(
    explorerJournalDescriptionForDiscovery(
      WORLD_DISCOVERY_SPECS.find((item) => item.id === GRAND_CANAL_DISCOVERY_ID)
    ),
    canalReport.player
  );
  const circumnavigationReport = explorerReportDialogueForDiscovery(CIRCUMNAVIGATION_DISCOVERY);
  assert.match(circumnavigationReport.player, /world joined behind us/i);
  assert.match(circumnavigationReport.patron, /scholar's conjecture/i);
  const reefReport = explorerReportDialogueForDiscovery(
    WORLD_DISCOVERY_SPECS.find((item) => item.id === GREAT_BARRIER_REEF_DISCOVERY_ID)
  );
  assert.match(reefReport.player, /coral gardens stretched beyond sight/i);
  assert.match(reefReport.patron, /living rampart/i);
});

test("legendary discoveries are recorded alongside historical landmarks", () => {
  const state = createGameState({ cargoCapacity: 20 });
  const elDorado = WORLD_DISCOVERY_SPECS.find((item) => item.id === EL_DORADO_DISCOVERY_ID);
  assert.equal(recordDiscovery(state, elDorado), true);
  assert.equal(state.memory.discoveries[EL_DORADO_DISCOVERY_ID].kind, "legend");
});

test("circumnavigation queues a one-time calendar remark for the next port", () => {
  const state = createGameState({ cargoCapacity: 20 });
  assert.equal(recordDiscovery(state, CIRCUMNAVIGATION_DISCOVERY), true);

  const restored = validateGameState(JSON.parse(JSON.stringify(state)));
  const pending = pendingDiscoveryPortDialogue(restored);
  assert.equal(pending.discoveryId, CIRCUMNAVIGATION_DISCOVERY.id);
  assert.equal(restored.memory.pendingDiscoveryPortDialogueIds.length, 1);
  const remark = consumePendingDiscoveryPortDialogue(restored);
  assert.equal(remark.discoveryId, CIRCUMNAVIGATION_DISCOVERY.id);
  assert.match(remark.message, /calendar.*log.*whole day/i);
  assert.equal(remark.expressionId, "surprised");
  assert.equal(consumePendingDiscoveryPortDialogue(restored), null);
});

test("captains react to discoveries outside their home region", () => {
  const lakeVictoria = WORLD_DISCOVERY_SPECS.find((item) => item.id === LAKE_VICTORIA_DISCOVERY_ID);
  const greatPyramid = WORLD_DISCOVERY_SPECS.find((item) => item.id === GREAT_PYRAMID_DISCOVERY_ID);
  const greatWall = WORLD_DISCOVERY_SPECS.find((item) => item.id === "landmark-great-wall");
  const greatBarrierReef = WORLD_DISCOVERY_SPECS.find(
    (item) => item.id === GREAT_BARRIER_REEF_DISCOVERY_ID
  );

  assert.equal(
    captainDialogueForDiscovery(lakeVictoria, { startRegion: "europe" }),
    "We've found it! The legendary source of the Nile!"
  );
  assert.equal(captainDialogueForDiscovery(greatPyramid, { startRegion: "ottoman" }), null);
  assert.match(captainDialogueForDiscovery(greatPyramid, { startRegion: "india" }), /Great Pyramid/);
  assert.equal(captainDialogueForDiscovery(greatWall, { startRegion: "east-asia" }), null);
  assert.match(captainDialogueForDiscovery(greatWall, { startRegion: "europe" }), /beyond the horizon/);
  assert.match(captainDialogueForDiscovery(greatBarrierReef, { startRegion: "europe" }), /sea is alive/i);
  assert.equal(captainDialogueForDiscovery(CIRCUMNAVIGATION_DISCOVERY, { startRegion: "europe" }), null);
});

test("home-region landmarks suppress redundant captain dialogue", () => {
  const stonehenge = WORLD_DISCOVERY_SPECS.find((item) => item.id === "landmark-stonehenge");
  const greatWall = WORLD_DISCOVERY_SPECS.find((item) => item.id === "landmark-great-wall");

  assert.equal(isDiscoveryNovelToCharacter(stonehenge, { startRegion: "europe" }), false);
  assert.equal(isDiscoveryNovelToCharacter(stonehenge, { startRegion: "east-asia" }), true);
  assert.equal(isDiscoveryNovelToCharacter(greatWall, { startRegion: "east-asia" }), false);
  assert.equal(isDiscoveryNovelToCharacter(greatWall, { startRegion: "europe" }), true);
  assert.equal(isDiscoveryNovelToCharacter(CIRCUMNAVIGATION_DISCOVERY, { startRegion: "europe" }), true);
});

test("mountain accessibility requires ocean-connected navigation within viewing range", () => {
  const graph = buildGeodesicGraph(2);
  const mountainTileId = 0;
  const nearbyTileId = graph.neighbors[mountainTileId][0];
  const mask = new Uint8Array(graph.tileCount);

  assert.equal(mountainIsAccessibleFromNavigation(mountainTileId, graph, mask, 0.5), false);
  mask[nearbyTileId] = 1;
  assert.equal(mountainIsAccessibleFromNavigation(mountainTileId, graph, mask, 0.5), true);
});

test("Mount Shasta has a slightly wider coastal discovery radius", () => {
  const baseMountain = {
    id: "mountain-test",
    elevationM: 4322,
    lat: 41.4093,
    lon: -122.195,
    tileId: 1
  };

  assert.equal(
    mountainDiscovery({ ...baseMountain, displayName: "Mount Shasta" }).radiusPx,
    MOUNT_SHASTA_DISCOVERY_RADIUS_PX
  );
  assert.equal(
    mountainDiscovery({ ...baseMountain, displayName: "Mount Rainier" }).radiusPx,
    DEFAULT_MOUNTAIN_DISCOVERY_RADIUS_PX
  );
});

function greatCircleDistancePx(a, b, pixelsPerRadian) {
  const radians = Math.PI / 180;
  const latA = a.lat * radians;
  const latB = b.lat * radians;
  const deltaLat = (b.lat - a.lat) * radians;
  const deltaLon = (b.lon - a.lon) * radians;
  const haversine = Math.sin(deltaLat / 2) ** 2
    + Math.cos(latA) * Math.cos(latB) * Math.sin(deltaLon / 2) ** 2;
  return 2 * Math.asin(Math.min(1, Math.sqrt(haversine))) * pixelsPerRadian;
}
