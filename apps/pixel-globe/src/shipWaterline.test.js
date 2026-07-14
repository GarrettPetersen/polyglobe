import assert from "node:assert/strict";
import test from "node:test";

import {
  SHIP_REFRACTION_BAND_HEIGHT,
  SHIP_WATERLINE_LEVEL,
  encodedShipWaterlineY,
  liveShipRefractionOffset,
  shipPixelBakeHeight,
  shipPixelIsAboveWater
} from "./shipWaterline.js";

test("the baked midpoint divides submerged and above-water hull pixels", () => {
  assert.equal(shipPixelIsAboveWater(SHIP_WATERLINE_LEVEL - 1 / 255), false);
  assert.equal(shipPixelIsAboveWater(SHIP_WATERLINE_LEVEL), false);
  assert.equal(shipPixelIsAboveWater(SHIP_WATERLINE_LEVEL + 1 / 255), true);
  assert.equal(shipPixelIsAboveWater(1), true);
});

test("the sink bake preserves an in-range model waterline", () => {
  assert.equal(encodedShipWaterlineY(-0.46, -0.68, 0.73), -0.46);
});

test("the sink bake only clamps waterlines at the encodable extrema", () => {
  const minHeight = -1;
  const maxHeight = 1;
  const padding = (maxHeight - minHeight) / 127;
  assert.equal(encodedShipWaterlineY(-2, minHeight, maxHeight), minHeight + padding);
  assert.equal(encodedShipWaterlineY(2, minHeight, maxHeight), maxHeight - padding);
});

test("the sink bake rejects malformed height ranges", () => {
  assert.throws(() => encodedShipWaterlineY(0, 1, 1), /invalid visible height range/);
  assert.throws(() => encodedShipWaterlineY(Number.NaN, -1, 1), /invalid waterlineY/);
});

test("the sink bake keeps low upward-facing deck pixels initially dry", () => {
  assert.equal(shipPixelBakeHeight(-0.7, 0.8, -0.5, 0.01), -0.49);
  assert.equal(shipPixelBakeHeight(-0.7, 0.1, -0.5, 0.01), -0.7);
  assert.equal(shipPixelBakeHeight(-0.4, 0.8, -0.5, 0.01), -0.4);
});

test("the sink pixel rule rejects malformed raster data", () => {
  assert.throws(() => shipPixelBakeHeight(0, 1, 0, 0), /invalid rasterPadding/);
  assert.throws(() => shipPixelBakeHeight(0, Number.NaN, 0, 0.1), /invalid normalY/);
});

test("live refraction is pixel-snapped, subtle, and changes over time", () => {
  const offsets = [0, 105, 210, 315, 420].map((nowMs) => (
    liveShipRefractionOffset(SHIP_REFRACTION_BAND_HEIGHT * 2, nowMs, 72)
  ));
  assert.ok(offsets.every((offset) => Number.isInteger(offset) && Math.abs(offset) <= 1));
  assert.ok(new Set(offsets).size > 1);
});

test("adjacent refraction bands do not all move in lockstep", () => {
  const offsets = Array.from({ length: 8 }, (_, band) => (
    liveShipRefractionOffset(band * SHIP_REFRACTION_BAND_HEIGHT, 900, 72)
  ));
  assert.ok(new Set(offsets).size > 1);
});

test("waterline helpers reject malformed bake data", () => {
  assert.throws(() => shipPixelIsAboveWater(Number.NaN), /invalid sink height/);
  assert.throws(() => liveShipRefractionOffset(-1, 0, 0), /pixel Y/);
});
