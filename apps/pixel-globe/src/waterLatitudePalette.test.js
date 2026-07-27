import assert from "node:assert/strict";
import test from "node:test";

import {
  RESURRECT_64_HEX,
  WATER_LATITUDE_MAX_BAND,
  darkerResurrect64Hex,
  isResurrect64Hex,
  isWaterResurrectHex,
  waterDepthIndexForSpriteKey,
  waterLatitudeBand,
  waterPaletteHexForRgb,
  waterPaletteHexForSourceHex
} from "./waterLatitudePalette.js";

test("latitude palette output always stays inside Resurrect 64", () => {
  const sourceColors = [...RESURRECT_64_HEX, "7e9ca3", "618c93", "457d84", "286d74"];
  for (let band = 0; band <= WATER_LATITUDE_MAX_BAND; band++) {
    for (let depth = 0; depth <= 5; depth++) {
      for (const source of sourceColors) {
        const output = waterPaletteHexForSourceHex(source, band, depth);
        assert.equal(isResurrect64Hex(output), true, `${source} at band ${band}, depth ${depth}`);
        assert.equal(isWaterResurrectHex(output), true, output);
      }
    }
  }
});

test("equatorial water is turquoise and polar water is blue-gray", () => {
  assert.equal(waterPaletteHexForSourceHex("9babb2", waterLatitudeBand(0), 0), "30e1b9");
  assert.equal(waterPaletteHexForSourceHex("9babb2", waterLatitudeBand(20), 0), "30e1b9");
  assert.equal(waterPaletteHexForSourceHex("0b5e65", waterLatitudeBand(0), 5), "0b5e65");
  assert.equal(waterPaletteHexForSourceHex("9babb2", waterLatitudeBand(80), 0), "c7dcd0");
  assert.equal(waterPaletteHexForSourceHex("0b5e65", waterLatitudeBand(80), 5), "323353");
});

test("latitude bands are symmetric across the equator", () => {
  for (const latitude of [0, 4, 15, 23.5, 40, 65, 89]) {
    assert.equal(waterLatitudeBand(latitude), waterLatitudeBand(-latitude));
  }
});

test("water sprite keys map to their intended depth", () => {
  assert.equal(waterDepthIndexForSpriteKey("water_shallow_01"), 0);
  assert.equal(waterDepthIndexForSpriteKey("water_depth_01_01"), 1);
  assert.equal(waterDepthIndexForSpriteKey("water_depth_04_01"), 4);
  assert.equal(waterDepthIndexForSpriteKey("water_deep_01_01"), 5);
  assert.equal(waterDepthIndexForSpriteKey("water_depth_01_02"), 1);
  assert.throws(() => waterDepthIndexForSpriteKey("grass_01"), /Unknown water sprite key/);
});

test("arbitrary sprite pixels are quantized rather than blended", () => {
  const output = waterPaletteHexForRgb(126, 156, 163, waterLatitudeBand(12), 1);
  assert.equal(isResurrect64Hex(output), true);
  assert.match(output, /^[0-9a-f]{6}$/);
});

test("riverbank shades stay in Resurrect while darkening varied land colors", () => {
  for (const source of ["a2a947", "239063", "f9c22b", "625565", "c7dcd0"]) {
    const shade = darkerResurrect64Hex(source);
    assert.equal(isResurrect64Hex(shade), true, source);
    assert.ok(perceptualBrightness(shade) < perceptualBrightness(source), `${source} -> ${shade}`);
  }
  assert.equal(isResurrect64Hex(darkerResurrect64Hex("7e9ca3")), true);
  assert.throws(() => darkerResurrect64Hex("a2a947", 0), /shade step/);
});

function perceptualBrightness(hex) {
  const value = Number.parseInt(hex.replace(/^#/, ""), 16);
  const r = (value >>> 16) & 255;
  const g = (value >>> 8) & 255;
  const b = value & 255;
  return r * 0.299 + g * 0.587 + b * 0.114;
}
