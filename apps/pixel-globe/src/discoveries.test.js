import assert from "node:assert/strict";
import test from "node:test";
import { buildGeodesicGraph, createDirectionIndex } from "./geodesic.js";
import {
  CIRCUMNAVIGATION_DISCOVERY,
  EL_DORADO_DISCOVERY_ID,
  GREAT_PYRAMID_DISCOVERY_ID,
  LAKE_VICTORIA_DISCOVERY_ID,
  WORLD_DISCOVERY_SPECS,
  WORLD_DISCOVERY_SPRITE_KEYS,
  buildWorldDiscoveries,
  mountainIsAccessibleFromNavigation
} from "./discoveries.js";
import { createGameState, recordDiscovery } from "./gameState.js";

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
  assert.equal(discoveries.length, 18);
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

test("mountain accessibility requires ocean-connected navigation within viewing range", () => {
  const graph = buildGeodesicGraph(2);
  const mountainTileId = 0;
  const nearbyTileId = graph.neighbors[mountainTileId][0];
  const mask = new Uint8Array(graph.tileCount);

  assert.equal(mountainIsAccessibleFromNavigation(mountainTileId, graph, mask, 0.5), false);
  mask[nearbyTileId] = 1;
  assert.equal(mountainIsAccessibleFromNavigation(mountainTileId, graph, mask, 0.5), true);
});
