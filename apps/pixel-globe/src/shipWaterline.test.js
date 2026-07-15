import assert from "node:assert/strict";
import test from "node:test";

import {
  SHIP_MAX_RASTER_WATERLINE_DEPTH,
  SHIP_REFRACTION_BAND_HEIGHT,
  SHIP_WATERLINE_LEVEL,
  encodedShipWaterlineY,
  floatingShipSubmergedPixelKeys,
  liveShipRefractionOffset,
  shipMaxRasterWaterlineDepth,
  shipPixelBakeHeight,
  shipPixelIsAboveWater
} from "./shipWaterline.js";

test("the baked midpoint divides submerged and above-water hull pixels", () => {
  assert.equal(shipPixelIsAboveWater(SHIP_WATERLINE_LEVEL - 1 / 255), false);
  assert.equal(shipPixelIsAboveWater(SHIP_WATERLINE_LEVEL), false);
  assert.equal(shipPixelIsAboveWater(SHIP_WATERLINE_LEVEL + 1 / 255), true);
  assert.equal(shipPixelIsAboveWater(1), true);
});

test("a floating ship submerges only low pixels exposed along the lower silhouette", () => {
  const low = SHIP_WATERLINE_LEVEL - 1 / 255;
  const high = SHIP_WATERLINE_LEVEL + 1 / 255;
  const submerged = floatingShipSubmergedPixelKeys([
    { x: 1, y: 0, sinkHeight: low },
    { x: 1, y: 1, sinkHeight: high },
    { x: 1, y: 2, sinkHeight: low },
    { x: 1, y: 3, sinkHeight: low },
    { x: 2, y: 2, sinkHeight: low },
    { x: 2, y: 3, sinkHeight: high }
  ], 4);

  assert.deepEqual([...submerged].sort((a, b) => a - b), [9, 13]);
});

test("a waterproof hull keeps enclosed low pixels in the opaque layer", () => {
  const low = SHIP_WATERLINE_LEVEL - 1 / 255;
  const high = SHIP_WATERLINE_LEVEL + 1 / 255;
  const submerged = floatingShipSubmergedPixelKeys([
    { x: 1, y: 1, sinkHeight: low },
    { x: 0, y: 2, sinkHeight: high },
    { x: 1, y: 2, sinkHeight: high },
    { x: 2, y: 2, sinkHeight: high }
  ], 4);

  assert.equal(submerged.size, 0);
});

test("a narrow unsupported depth column cannot refract vertically through a ship", () => {
  const low = SHIP_WATERLINE_LEVEL - 1 / 255;
  const submerged = floatingShipSubmergedPixelKeys([
    { x: 2, y: 1, sinkHeight: low },
    { x: 2, y: 2, sinkHeight: low },
    { x: 2, y: 3, sinkHeight: low },
    { x: 2, y: 4, sinkHeight: low },
    { x: 2, y: 5, sinkHeight: low }
  ], 7);

  assert.deepEqual([...submerged].sort((a, b) => a - b), [30, 37]);
});

test("neighboring hull pixels preserve a broad submerged diagonal", () => {
  const low = SHIP_WATERLINE_LEVEL - 1 / 255;
  const submerged = floatingShipSubmergedPixelKeys([
    { x: 1, y: 4, sinkHeight: low },
    { x: 1, y: 5, sinkHeight: low },
    { x: 2, y: 3, sinkHeight: low },
    { x: 2, y: 4, sinkHeight: low },
    { x: 2, y: 5, sinkHeight: low },
    { x: 3, y: 2, sinkHeight: low },
    { x: 3, y: 3, sinkHeight: low },
    { x: 3, y: 4, sinkHeight: low },
    { x: 3, y: 5, sinkHeight: low }
  ], 7);

  assert.equal(submerged.size, 9);
});

test("floating ship refraction is capped at five raster rows", () => {
  const low = SHIP_WATERLINE_LEVEL - 1 / 255;
  const pixels = [];
  for (let y = 1; y <= 8; y++) {
    for (let x = 1; x <= 3; x++) pixels.push({ x, y, sinkHeight: low });
  }
  const submerged = floatingShipSubmergedPixelKeys(pixels, 10);
  const rows = new Set([...submerged].map((key) => Math.floor(key / 10)));

  assert.deepEqual([...rows].sort((a, b) => a - b), [4, 5, 6, 7, 8]);
  assert.equal(rows.size, SHIP_MAX_RASTER_WATERLINE_DEPTH);
});

test("deep-draft ships explicitly extend the normal raster waterline cap", () => {
  assert.equal(shipMaxRasterWaterlineDepth("portuguese-carrack"), 8);
  assert.equal(shipMaxRasterWaterlineDepth("spanish-nao"), 7);
  assert.equal(shipMaxRasterWaterlineDepth("japanese-atakebune"), 6);
  assert.equal(shipMaxRasterWaterlineDepth("caravel"), SHIP_MAX_RASTER_WATERLINE_DEPTH);
  assert.throws(() => shipMaxRasterWaterlineDepth(""), /requires a slug/);
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
  assert.throws(() => floatingShipSubmergedPixelKeys([], 4), /requires opaque/);
  assert.throws(() => floatingShipSubmergedPixelKeys([{ x: 4, y: 0, sinkHeight: 0.5 }], 4), /outside/);
});
