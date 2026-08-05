import assert from "node:assert/strict";
import test from "node:test";
import {
  SHIP_LIGHT_DIRECT_START_ALT,
  SHIP_LIGHTING_RGBA,
  SHIP_SHADOW_FADE_OUT_ALT,
  SHIP_SURFACE_LIGHTING_BLEND,
  scaledShipLightingRgba,
  shipLightingCssColor,
  shipLightStrengthsForSunAltitude
} from "./shipLighting.js";

test("shared ship lighting keeps dark hull contrast restrained", () => {
  assert.equal(SHIP_SURFACE_LIGHTING_BLEND, "soft-light");
  assert.deepEqual(SHIP_LIGHTING_RGBA.shadow, [12 / 255, 9 / 255, 24 / 255, 0.22]);
  assert.deepEqual(SHIP_LIGHTING_RGBA.shade, [26 / 255, 18 / 255, 44 / 255, 0.24]);
  assert.deepEqual(SHIP_LIGHTING_RGBA.highlight, [1, 240 / 255, 188 / 255, 0.26]);
  assert.deepEqual(
    scaledShipLightingRgba("highlight", 0.5),
    [1, 240 / 255, 188 / 255, 0.13]
  );
  assert.equal(shipLightingCssColor("shade"), "rgba(26, 18, 44, 0.24)");
});

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
