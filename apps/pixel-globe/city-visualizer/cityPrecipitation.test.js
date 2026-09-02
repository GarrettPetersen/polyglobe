import assert from "node:assert/strict";
import test from "node:test";

import {
  CITY_PRECIPITATION_PARTICLE_COUNT,
  cityPrecipitationParticles
} from "./cityPrecipitation.js";

test("city rain and snow particles are deterministic and remain bounded", () => {
  const input = {
    kind: "rain",
    intensity: 1,
    timeMs: 1234,
    width: 455,
    height: 256,
    wind: { flowX: 0.8, flowY: -0.2, strength: 0.7 }
  };
  const first = cityPrecipitationParticles(input);
  assert.deepEqual(first, cityPrecipitationParticles(input));
  assert.equal(first.length, CITY_PRECIPITATION_PARTICLE_COUNT.rain);
  assert.ok(first.every(({ x, y }) => x >= -54 && x <= 509 && y >= -7 && y <= 263));
  const snow = cityPrecipitationParticles({ ...input, kind: "snow", intensity: 0.5 });
  assert.equal(snow.length, Math.round(CITY_PRECIPITATION_PARTICLE_COUNT.snow * 0.5));
  assert.ok(snow.every(({ length }) => length === 1));
});
