import assert from "node:assert/strict";
import test from "node:test";
import {
  compareTerrainDrawCalls,
  terrainBaseSpriteKey,
  terrainConnectorNeedsSlopeDetail,
  terrainSpriteDrawLayer
} from "./terrainDrawOrder.js";

test("mountains compose over ordinary rocky ground", () => {
  assert.equal(terrainBaseSpriteKey("mountain_stone_01"), "earth_rocky");
  assert.equal(terrainBaseSpriteKey("mountain_snowy_02"), "earth_rocky");
  assert.equal(terrainBaseSpriteKey("forest_broadleaf_01"), "forest_broadleaf_01");
  assert.throws(() => terrainBaseSpriteKey(""), /requires a sprite key/);
});

test("mountain connectors do not leak elevation lines beyond the mountain art", () => {
  assert.equal(terrainConnectorNeedsSlopeDetail(3, 0), false);
  assert.equal(terrainConnectorNeedsSlopeDetail(4, 1), false);
  assert.equal(terrainConnectorNeedsSlopeDetail(2, 0), true);
  assert.equal(terrainConnectorNeedsSlopeDetail(2, 1), false);
  assert.throws(() => terrainConnectorNeedsSlopeDetail(NaN, 0), /finite levels/);
});

test("flat terrain draws below vegetation and mountains on the same baseline", () => {
  const keys = [
    "mountain_snowy_01",
    "jungle_dense_02",
    "forest_broadleaf_01",
    "grassy_hill",
    "earth_rocky",
    "grass_03",
    "sand_01"
  ];
  const calls = keys.map((spriteKey, id) => ({
    id,
    sortY: 100,
    drawLayer: terrainSpriteDrawLayer(spriteKey),
    spriteKey
  }));
  calls.sort(compareTerrainDrawCalls);
  assert.deepEqual(calls.map((call) => call.spriteKey), [
    "grass_03",
    "sand_01",
    "earth_rocky",
    "grassy_hill",
    "forest_broadleaf_01",
    "jungle_dense_02",
    "mountain_snowy_01"
  ]);
});

test("screen Y always outranks biome height", () => {
  const mountainBehind = {
    id: 1,
    sortY: 99.999,
    drawLayer: terrainSpriteDrawLayer("mountain_stone_01")
  };
  const grassInFront = {
    id: 2,
    sortY: 100,
    drawLayer: terrainSpriteDrawLayer("grass_01")
  };
  assert.ok(compareTerrainDrawCalls(mountainBehind, grassInFront) < 0);
  assert.ok(compareTerrainDrawCalls(grassInFront, mountainBehind) > 0);
});
