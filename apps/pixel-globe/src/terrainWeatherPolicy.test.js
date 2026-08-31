import assert from "node:assert/strict";
import test from "node:test";

import {
  assertStaticTerrainCells,
  TERRAIN_WEATHER_MODE_STATIC,
  TERRAIN_WEATHER_MODE_WORLD,
  terrainRowUsesWorldWeather
} from "./terrainWeatherPolicy.js";

test("world terrain uses live weather by default", () => {
  assert.equal(terrainRowUsesWorldWeather({ t: "water" }), true);
  assert.equal(terrainRowUsesWorldWeather({ t: "land", weatherMode: TERRAIN_WEATHER_MODE_WORLD }), true);
});

test("synthetic terrain explicitly opts out of world weather lookups", () => {
  assert.equal(terrainRowUsesWorldWeather({
    t: "water",
    latitudeDeg: 18,
    weatherMode: TERRAIN_WEATHER_MODE_STATIC
  }), false);
});

test("invalid terrain weather policies fail loudly", () => {
  assert.throws(() => terrainRowUsesWorldWeather(null), /requires a terrain row/);
  assert.throws(
    () => terrainRowUsesWorldWeather({ t: "water", weatherMode: "synthetic" }),
    /Unknown terrain weather mode/
  );
});

test("local terrain maps reject any cell that can reach world weather", () => {
  const cells = [{
    id: 2_000_001,
    terrain: { t: "water", weatherMode: TERRAIN_WEATHER_MODE_STATIC }
  }];
  assert.equal(assertStaticTerrainCells(cells, "Test arena"), cells);
  assert.throws(
    () => assertStaticTerrainCells([{
      id: 3_000_001,
      terrain: { t: "water" }
    }], "Test arena"),
    /cell 3000001 must not use world weather/
  );
});
