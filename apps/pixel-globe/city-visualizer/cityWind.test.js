import assert from "node:assert/strict";
import test from "node:test";

import {
  cityWindForCity,
  cityWindSpeedLabel,
  screenWindFlowDirection
} from "./cityWind.js";

const LONDON = Object.freeze({ lat: 51.5074, lon: -0.1278 });

test("city wind is deterministic and derives from geographic coordinates", () => {
  assert.deepEqual(cityWindForCity(LONDON), cityWindForCity(LONDON));
  const cairo = cityWindForCity({ lat: 30.0444, lon: 31.2357 });
  assert.notDeepEqual(cairo, cityWindForCity(LONDON));
});

test("city wind overrides preserve a normalized shared screen vector", () => {
  const wind = cityWindForCity(LONDON, { speed: "strong", direction: "up-left" });
  assert.equal(wind.strength, 1);
  assert.ok(wind.flowX < 0);
  assert.ok(wind.flowY < 0);
  assert.ok(Math.abs(Math.hypot(wind.flowX, wind.flowY) - 1) < 1e-12);
  assert.equal(wind.speedLabel, "strong");
  assert.equal(wind.directionLabel, "toward upper left");
});

test("screen wind conversion matches the main game's geographic projection", () => {
  const west = screenWindFlowDirection(0);
  const east = screenWindFlowDirection(Math.PI);
  assert.ok(Math.cos(west) < -0.999999 && Math.abs(Math.sin(west)) < 1e-12);
  assert.ok(Math.cos(east) > 0.999999 && Math.abs(Math.sin(east)) < 1e-12);
  assert.equal(cityWindSpeedLabel(0.18), "calm");
  assert.equal(cityWindSpeedLabel(0.42), "light");
  assert.equal(cityWindSpeedLabel(0.78), "moderate");
  assert.equal(cityWindSpeedLabel(0.79), "strong");
});

test("city wind rejects unknown overrides and invalid geography", () => {
  assert.throws(() => cityWindForCity({ lat: 0 }), /latitude and longitude/);
  assert.throws(() => cityWindForCity(LONDON, { speed: "hurricane" }), /Unknown city wind speed/);
  assert.throws(() => cityWindForCity(LONDON, { direction: "north" }), /Unknown city wind direction/);
});
