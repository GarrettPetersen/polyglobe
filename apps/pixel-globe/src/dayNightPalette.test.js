import { dayNightLightForSunAltitude } from "./dayNightCycle.js";
import { SHIP_TIMBER_SOURCE_HEX } from "./shipResurrectPalette.js";
import assert from "node:assert/strict";
import test from "node:test";

import {
  DAY_NIGHT_VARIANT_STEPS,
  NIGHT_LAND_GRADE_HEX,
  NIGHT_GRADE_HEX,
  NIGHT_WATER_GRADE_HEX,
  SUNSET_GRADE_HEX,
  SUNSET_LAND_GRADE_HEX,
  SUNSET_WATER_GRADE_HEX,
  applyDayNightPaletteGrade,
  dayNightPaletteVariant,
  nightPaletteHexForSourceHex,
  sunsetPaletteHexForSourceHex
} from "./dayNightPalette.js";
import {
  RESURRECT_64_HEX,
  darkerResurrect64Hex
} from "./waterLatitudePalette.js";

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

test("sunset water and land use disjoint ramps", () => {
  const waterRamp = new Set(SUNSET_WATER_GRADE_HEX);
  const landRamp = new Set(SUNSET_LAND_GRADE_HEX);
  assert.equal([...waterRamp].some((hex) => landRamp.has(hex)), false);

  const terrainPairs = [
    ["323353", "4c3e24"],
    ["9babb2", "a2a947"],
    ["0b8a8f", "676633"],
    ["0b5e65", "165a4c"],
    ["0eaf9b", "239063"],
    ["30e1b9", "f9c22b"]
  ];
  for (const [water, land] of terrainPairs) {
    assert.equal(waterRamp.has(sunsetPaletteHexForSourceHex(water)), true, water);
    assert.equal(landRamp.has(sunsetPaletteHexForSourceHex(land)), true, land);
  }
});

test("dominant sunset land favors the capsule's coral and brick colors", () => {
  assert.equal(sunsetPaletteHexForSourceHex("676633"), "b33831");
  assert.equal(sunsetPaletteHexForSourceHex("a2a947"), "ea4f36");
  assert.equal(sunsetPaletteHexForSourceHex("91db69"), "f57d4a");
  assert.equal(sunsetPaletteHexForSourceHex("f9c22b"), "e6904e");
});

test("riverbank shades remain darker than adjacent land throughout palette grading", () => {
  for (const land of ["a2a947", "239063", "f9c22b", "625565", "c7dcd0"]) {
    const bank = darkerResurrect64Hex(land, 2);
    for (const mode of ["sunset", "night"]) {
      for (let stage = 1; stage <= 16; stage++) {
        const pixels = new Uint8ClampedArray([...rgba(bank), ...rgba(land)]);
        applyDayNightPaletteGrade(pixels, 2, 1, {
          sunset: mode === "sunset" ? stage / 16 : 0,
          night: mode === "night" ? stage / 16 : 0
        });
        assert.ok(
          perceptualBrightness(rgbHex(pixels, 0)) < perceptualBrightness(rgbHex(pixels, 4)),
          `${bank}/${land} ${mode} stage ${stage}`
        );
      }
    }
  }
});

test("dominant water and land colors stay distinct at sunset and night", () => {
  const terrainPairs = [
    ["323353", "4c3e24"],
    ["9babb2", "a2a947"],
    ["0b8a8f", "676633"],
    ["0b5e65", "165a4c"],
    ["0eaf9b", "239063"],
    ["30e1b9", "f9c22b"]
  ];
  for (const [water, land] of terrainPairs) {
    assert.notEqual(nightPaletteHexForSourceHex(water), nightPaletteHexForSourceHex(land), `${water}/${land} night`);
    assert.notEqual(sunsetPaletteHexForSourceHex(water), sunsetPaletteHexForSourceHex(land), `${water}/${land} sunset`);
  }
});

test("night water and land use separate Resurrect ramps", () => {
  const waterRamp = new Set(NIGHT_WATER_GRADE_HEX);
  const landRamp = new Set(NIGHT_LAND_GRADE_HEX);
  assert.equal([...waterRamp].some((hex) => landRamp.has(hex)), false);
  for (const source of ["323353", "484a77", "4d65b4", "4d9be6", "0b5e65", "0b8a8f", "0eaf9b", "30e1b9"]) {
    assert.equal(waterRamp.has(nightPaletteHexForSourceHex(source)), true, source);
  }
  for (const source of ["4c3e24", "676633", "a2a947", "165a4c", "239063", "1ebc73", "91db69"]) {
    assert.equal(landRamp.has(nightPaletteHexForSourceHex(source)), true, source);
  }
});

test("dominant water and land colors stay distinct throughout both transitions", () => {
  const terrainPairs = [
    ["323353", "4c3e24"],
    ["9babb2", "a2a947"],
    ["0b8a8f", "676633"],
    ["0b5e65", "165a4c"],
    ["0eaf9b", "239063"],
    ["30e1b9", "f9c22b"]
  ];
  for (const mode of ["sunset", "night"]) {
    for (let stage = 1; stage <= 16; stage++) {
      for (const [water, land] of terrainPairs) {
        const pixels = new Uint8ClampedArray([...rgba(water), ...rgba(land)]);
        applyDayNightPaletteGrade(pixels, 2, 1, {
          sunset: mode === "sunset" ? stage / 16 : 0,
          night: mode === "night" ? stage / 16 : 0
        });
        assert.notEqual(rgbHex(pixels, 0), rgbHex(pixels, 4), `${water}/${land} ${mode} stage ${stage}`);
      }
    }
  }
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

test("day and night lighting use nine grades per palette axis", () => {
  assert.equal(DAY_NIGHT_VARIANT_STEPS, 8);
  assert.equal(dayNightPaletteVariant({ sunset: 0, night: 0 }), null);
  const first = dayNightPaletteVariant({ sunset: 0.51, night: 0 });
  const second = dayNightPaletteVariant({ sunset: 0.56, night: 0 });
  assert.equal(first, second);
  assert.equal(first.key, "4:0");
  assert.equal(first.width, 1024);
  assert.equal(first.height, 32);
  assert.equal(first.pixels.length, 1024 * 32 * 4);
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

function rgba(hex) {
  const { r, g, b } = parseHex(hex);
  return [r, g, b, 255];
}

function average(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}


test("ship timber never collapses into ocean colours during dusk and night", () => {
  const timber = [...SHIP_TIMBER_SOURCE_HEX, "694f62"];
  const water = ["323353", "484a77", "4d65b4", "4d9be6", "9babb2", "c7dcd0", "0b5e65", "0b8a8f", "0eaf9b", "30e1b9"];
  for (const mode of ["sunset", "night"]) for (let stage = 1; stage <= DAY_NIGHT_VARIANT_STEPS; stage++) {
    const colours = [...water, ...timber];
    const pixels = new Uint8ClampedArray(colours.flatMap(rgba));
    applyDayNightPaletteGrade(pixels, colours.length, 1, { [mode]: stage / DAY_NIGHT_VARIANT_STEPS });
    const ocean = new Set(water.map((_, index) => rgbHex(pixels, index * 4)));
    for (let index = 0; index < timber.length; index++) {
      assert.ok(!ocean.has(rgbHex(pixels, (water.length + index) * 4)), `${timber[index]} ${mode} ${stage}`);
    }
  }
  for (const hex of timber) assert.ok(!NIGHT_WATER_GRADE_HEX.includes(nightPaletteHexForSourceHex(hex)), hex);
});


test("timber stays separate through the real overlapping twilight cycle on CPU and GPU", () => {
  const timber = [...SHIP_TIMBER_SOURCE_HEX, "694f62"];
  const water = ["323353", "484a77", "4d65b4", "4d9be6", "9babb2", "c7dcd0", "0b5e65", "0b8a8f", "0eaf9b", "30e1b9"];
  for (let sample = 0; sample <= 200; sample++) {
    const light = dayNightLightForSunAltitude(-1 + sample / 100);
    const colours = [...water, ...timber];
    const pixels = new Uint8ClampedArray(colours.flatMap(rgba));
    applyDayNightPaletteGrade(pixels, colours.length, 1, light);
    const ocean = new Set(water.map((_, index) => rgbHex(pixels, index * 4)));
    const variant = dayNightPaletteVariant(light);
    for (let index = 0; index < timber.length; index++) {
      const offset = (water.length + index) * 4;
      assert.ok(!ocean.has(rgbHex(pixels, offset)), `${timber[index]} altitude ${light.sunAltitude}`);
    }
    if (!variant) continue;
    for (let index = 0; index < colours.length; index++) {
      const [r, g, b] = rgba(colours[index]);
      const texel = ((r >> 3) * 1024 + (g >> 3) * 32 + (b >> 3)) * 4;
      assert.equal(rgbHex(variant.pixels, texel), rgbHex(pixels, index * 4));
    }
  }
});

test("sunset transitions stay in Resurrect 64 with at most one warm bridge", () => {
  const palette = new Set(RESURRECT_64_HEX), warm = new Set(SUNSET_GRADE_HEX);
  for (const source of RESURRECT_64_HEX) {
    const path = [source];
    for (let stage = 1; stage <= DAY_NIGHT_VARIANT_STEPS; stage++) {
      const pixels = new Uint8ClampedArray(rgba(source));
      applyDayNightPaletteGrade(pixels, 1, 1, { sunset:stage/DAY_NIGHT_VARIANT_STEPS, night:0 });
      const hex = rgbHex(pixels, 0);
      assert.ok(palette.has(hex), `${source}: ${hex}`);
      assert.ok(hex === source || warm.has(hex), `${source}: unrelated hue ${hex}`);
      if (path.at(-1) !== hex) path.push(hex);
    }
    assert.ok(path.length <= 3, `${source}: ${path}`);
    assert.equal(new Set(path).size, path.length, `${source} reverses its colour path`);
  }
});


test("every CPU and GPU grade combination stays strictly inside Resurrect 64", () => {
  const palette = new Set(RESURRECT_64_HEX.map(hex => parseInt(hex, 16)));
  const packed = (pixels, offset) => pixels[offset] * 65536 + pixels[offset + 1] * 256 + pixels[offset + 2];
  for (let sunset = 0; sunset <= DAY_NIGHT_VARIANT_STEPS; sunset++) {
    for (let night = 0; night <= DAY_NIGHT_VARIANT_STEPS; night++) {
      const light = { sunset:sunset/DAY_NIGHT_VARIANT_STEPS, night:night/DAY_NIGHT_VARIANT_STEPS };
      const pixels = new Uint8ClampedArray(RESURRECT_64_HEX.flatMap(rgba));
      applyDayNightPaletteGrade(pixels, RESURRECT_64_HEX.length, 1, light);
      for (let offset = 0; offset < pixels.length; offset += 4) {
        assert.ok(palette.has(packed(pixels, offset)), `CPU ${sunset}:${night}/${offset}`);
      }
      const variant = dayNightPaletteVariant(light);
      if (!variant) continue;
      for (let offset = 0; offset < variant.pixels.length; offset += 4) {
        assert.ok(palette.has(packed(variant.pixels, offset)), `GPU ${sunset}:${night}/${offset}`);
      }
    }
  }
});

test("each night path has at most one bridge and the full twilight cycle has at most four changes", () => {
  for (const source of RESURRECT_64_HEX) {
    for (const mode of ["night", "cycle"]) {
      const path = [source];
      for (let step = 0; step <= 200; step++) {
        const light = mode === "night" ? {night:step/200} : dayNightLightForSunAltitude(1-step/100);
        const pixels = new Uint8ClampedArray(rgba(source));
        applyDayNightPaletteGrade(pixels, 1, 1, light);
        const hex = rgbHex(pixels, 0);
        if (hex !== path.at(-1)) path.push(hex);
      }
      assert.ok(path.length <= (mode === "night" ? 3 : 5), `${mode} ${source}: ${path}`);
      if (mode === "night") assert.equal(new Set(path).size, path.length);
    }
  }
});


test("grass does not flash bright violet on its way from orange sunset to muted night", () => {
  for (const hex of ["239063", "a2a947"]) for (let step = 0; step <= 200; step++) {
    const pixels = new Uint8ClampedArray(rgba(hex));
    applyDayNightPaletteGrade(pixels, 1, 1, dayNightLightForSunAltitude(1-step/100));
    assert.ok(!["6b3e75", "905ea9", "a884f3"].includes(rgbHex(pixels, 0)));
  }
});
