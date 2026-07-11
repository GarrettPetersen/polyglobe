import assert from "node:assert/strict";
import test from "node:test";
import {
  SHIP_LIGHT_DIRECT_START_ALT,
  SHIP_SHADOW_FADE_OUT_ALT,
  shipLightStrengthsForSunAltitude
} from "./shipLighting.js";

test("ship shadows remain strongest when low sunset light loses its highlights", () => {
  const light = shipLightStrengthsForSunAltitude(SHIP_LIGHT_DIRECT_START_ALT);

  assert.equal(light.direct, 0);
  assert.equal(light.shadow, 1);
});

test("ship shadows fade through twilight after the sun crosses the horizon", () => {
  const twilight = shipLightStrengthsForSunAltitude(-0.04);
  const night = shipLightStrengthsForSunAltitude(SHIP_SHADOW_FADE_OUT_ALT);

  assert.ok(twilight.shadow > 0);
  assert.ok(twilight.shadow < 1);
  assert.equal(night.shadow, 0);
});

test("daylight keeps both ship lighting and shadows fully present", () => {
  const light = shipLightStrengthsForSunAltitude(0.5);

  assert.equal(light.direct, 1);
  assert.equal(light.shadow, 1);
});
