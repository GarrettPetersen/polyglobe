import assert from "node:assert/strict";
import test from "node:test";

import { portCityWeatherPresentation } from "./portCityWeather.js";

test("port city weather uses live wind and the surrounding tile ring", () => {
  const weather = portCityWeatherPresentation({
    wind: { directionRad: 1.25, strength: 0.67 },
    nearbyConditions: [
      { raining: false, snowing: false, stormIntensity: 0.1 },
      { raining: true, snowing: false, stormIntensity: 0.35 }
    ]
  });
  assert.deepEqual(weather.wind, { directionRad: 1.25, strength: 0.67 });
  assert.deepEqual(weather.precipitation, { kind: "rain", intensity: 0.46 });
});

test("nearby snow takes precedence over rain and storms can produce rain", () => {
  assert.deepEqual(portCityWeatherPresentation({
    wind: { directionRad: 0, strength: 0.2 },
    nearbyConditions: [
      { raining: true, snowing: false, stormIntensity: 0.2 },
      { raining: false, snowing: true, stormIntensity: 0.6 }
    ]
  }).precipitation, { kind: "snow", intensity: 0.6 });
  assert.deepEqual(portCityWeatherPresentation({
    wind: { directionRad: 0, strength: 0.2 },
    nearbyConditions: [
      { raining: false, snowing: false, stormIntensity: 0.8 }
    ]
  }).precipitation, { kind: "rain", intensity: 0.8 });
});

test("clear nearby conditions do not create a city overlay", () => {
  assert.deepEqual(portCityWeatherPresentation({
    wind: { directionRad: -0.5, strength: 0.4 },
    nearbyConditions: [
      { raining: false, snowing: false, stormIntensity: 0.25 }
    ]
  }).precipitation, { kind: null, intensity: 0 });
});
