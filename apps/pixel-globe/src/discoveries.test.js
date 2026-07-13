import assert from "node:assert/strict";
import test from "node:test";
import { buildGeodesicGraph, createDirectionIndex } from "./geodesic.js";
import {
  CIRCUMNAVIGATION_DISCOVERY,
  EL_DORADO_DISCOVERY_ID,
  GRAND_CANAL_DISCOVERY_ID,
  GREAT_PYRAMID_DISCOVERY_ID,
  LAKE_VICTORIA_DISCOVERY_ID,
  WORLD_DISCOVERY_SPECS,
  WORLD_DISCOVERY_SPRITE_KEYS,
  buildWorldDiscoveries,
  captainDialogueForDiscovery,
  isDiscoveryNovelToCharacter,
  mountainIsAccessibleFromNavigation
} from "./discoveries.js";
import {
  consumePendingDiscoveryPortDialogue,
  createGameState,
  recordDiscovery,
  validateGameState
} from "./gameState.js";

test("world wonders map onto globe tiles and visual landmarks get dedicated art tiles", () => {
  const graph = buildGeodesicGraph(3);
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
  assert.equal(discoveries.length, 19);
  assert.equal(discoveries[0].id, GREAT_PYRAMID_DISCOVERY_ID);
  assert.equal(discoveries[1].id, LAKE_VICTORIA_DISCOVERY_ID);
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
  assert.equal(CIRCUMNAVIGATION_DISCOVERY.kind, "achievement");
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
    .every((item) => item.spriteKey === null));
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

  assert.equal(
    captainDialogueForDiscovery(lakeVictoria, { startRegion: "europe" }),
    "We've found it! The legendary source of the Nile!"
  );
  assert.equal(captainDialogueForDiscovery(greatPyramid, { startRegion: "ottoman" }), null);
  assert.match(captainDialogueForDiscovery(greatPyramid, { startRegion: "india" }), /Great Pyramid/);
  assert.equal(captainDialogueForDiscovery(greatWall, { startRegion: "east-asia" }), null);
  assert.match(captainDialogueForDiscovery(greatWall, { startRegion: "europe" }), /beyond the horizon/);
  assert.equal(captainDialogueForDiscovery(CIRCUMNAVIGATION_DISCOVERY, { startRegion: "europe" }), null);
});

test("home-region landmarks are familiar rather than player discoveries", () => {
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
