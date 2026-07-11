import assert from "node:assert/strict";
import test from "node:test";

import {
  NIGHT_GRADE_HEX,
  SUNSET_GRADE_HEX,
  applyDayNightPaletteGrade,
  nightPaletteHexForSourceHex,
  sunsetPaletteHexForSourceHex
} from "./dayNightPalette.js";
import { RESURRECT_64_HEX } from "./waterLatitudePalette.js";

test("day and night mappings stay inside their Resurrect ramps", () => {
  const night = new Set(NIGHT_GRADE_HEX);
  const sunset = new Set(SUNSET_GRADE_HEX);
  for (const source of RESURRECT_64_HEX) {
    assert.equal(night.has(nightPaletteHexForSourceHex(source)), true, source);
    assert.equal(sunset.has(sunsetPaletteHexForSourceHex(source)), true, source);
  }
});

test("night mapping is darker while retaining a useful tonal range", () => {
  const mapped = RESURRECT_64_HEX.map(nightPaletteHexForSourceHex);
  const sourceBrightness = average(RESURRECT_64_HEX.map(perceptualBrightness));
  const nightBrightness = average(mapped.map(perceptualBrightness));

  assert.ok(nightBrightness < sourceBrightness * 0.82);
  assert.ok(new Set(mapped).size >= 7);
  for (let i = 0; i < mapped.length; i++) {
    assert.ok(oklabLightness(mapped[i]) <= oklabLightness(RESURRECT_64_HEX[i]), RESURRECT_64_HEX[i]);
  }
});

test("sunset mapping pushes the whole palette toward red and gold", () => {
  const mapped = RESURRECT_64_HEX.map(sunsetPaletteHexForSourceHex);
  const sourceWarmth = average(RESURRECT_64_HEX.map(warmth));
  const sunsetWarmth = average(mapped.map(warmth));

  assert.ok(sunsetWarmth > sourceWarmth + 70);
  assert.ok(new Set(mapped).size >= 8);
});

test("palette grading leaves day pixels untouched and fully maps night pixels", () => {
  const day = new Uint8ClampedArray([77, 155, 230, 255, 249, 194, 43, 255]);
  const unchanged = new Uint8ClampedArray(day);
  applyDayNightPaletteGrade(day, 2, 1, { sunset: 0, night: 0 });
  assert.deepEqual(day, unchanged);

  applyDayNightPaletteGrade(day, 2, 1, { sunset: 0, night: 1 });
  assert.equal(`#${rgbHex(day, 0)}`, `#${nightPaletteHexForSourceHex("4d9be6")}`);
  assert.equal(`#${rgbHex(day, 4)}`, `#${nightPaletteHexForSourceHex("f9c22b")}`);
});

test("an evening ramp stage changes matching pixels in unison without spatial grain", () => {
  const width = 8;
  const height = 8;
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let offset = 0; offset < pixels.length; offset += 4) {
    pixels.set([77, 155, 230, 255], offset);
  }

  applyDayNightPaletteGrade(pixels, width, height, { sunset: 0.5, night: 0 });
  const colors = new Set();
  for (let offset = 0; offset < pixels.length; offset += 4) colors.add(rgbHex(pixels, offset));
  assert.equal(colors.size, 1);
  assert.equal(RESURRECT_64_HEX.includes([...colors][0]), true);
});

function perceptualBrightness(hex) {
  const { r, g, b } = parseHex(hex);
  return r * 0.299 + g * 0.587 + b * 0.114;
}

function warmth(hex) {
  const { r, g, b } = parseHex(hex);
  return r + g - b * 2;
}

function oklabLightness(hex) {
  const { r, g, b } = parseHex(hex);
  const lr = srgbToLinear(r / 255);
  const lg = srgbToLinear(g / 255);
  const lb = srgbToLinear(b / 255);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
}

function srgbToLinear(value) {
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function parseHex(hex) {
  const value = hex.replace(/^#/, "");
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16)
  };
}

function rgbHex(data, offset) {
  return [data[offset], data[offset + 1], data[offset + 2]]
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("");
}

function average(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
