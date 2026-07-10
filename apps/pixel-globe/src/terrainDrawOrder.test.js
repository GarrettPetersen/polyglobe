import assert from "node:assert/strict";
import test from "node:test";
import {
  compareTerrainDrawCalls,
  terrainSpriteDrawLayer
} from "./terrainDrawOrder.js";

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
