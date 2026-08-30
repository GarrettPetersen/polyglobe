import assert from "node:assert/strict";
import test from "node:test";

import {
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
