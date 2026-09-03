import assert from "node:assert/strict";
import test from "node:test";

import {
  applyCityBuildingEdgeContrast,
  cityBuildingEdgeContrastApplies,
  citySkySourceColorsByRow
} from "./cityBuildingEdgeContrast.js";
import {
  applyDayNightPaletteGrade,
  nightPaletteHexForSourceHex,
  sunsetPaletteHexForSourceHex
} from "../src/dayNightPalette.js";

test("building skyline edges that merge with graded sky are darkened once", () => {
  const sky = solidRaster(4, 4, "484a77");
  const skyRows = citySkySourceColorsByRow({ pixels: sky, width: 4, height: 4 });
  const building = transparentRaster(5, 5);
  setPixel(building, 5, 1, 1, "625565");
  setPixel(building, 5, 2, 1, "625565");
  setPixel(building, 5, 3, 1, "625565");
  setPixel(building, 5, 1, 2, "625565");
  setPixel(building, 5, 2, 2, "625565");
  setPixel(building, 5, 3, 2, "625565");
  setPixel(building, 5, 1, 3, "625565");
  setPixel(building, 5, 2, 3, "625565");
  setPixel(building, 5, 3, 3, "625565");

  assert.equal(nightPaletteHexForSourceHex("625565"), nightPaletteHexForSourceHex("484a77"));
  const changed = applyCityBuildingEdgeContrast({
    pixels: building,
    width: 5,
    height: 5,
    masterY: 0,
    skyMasterY: 0,
    skySourceColorsByRow: skyRows
  });

  assert.equal(changed, 5);
  for (const [x, y] of [[1, 1], [2, 1], [3, 1], [1, 2], [3, 2]]) {
    const edgeHex = pixelHex(building, 5, x, y);
    assert.notEqual(nightPaletteHexForSourceHex(edgeHex), nightPaletteHexForSourceHex("484a77"));
    assert.notEqual(sunsetPaletteHexForSourceHex(edgeHex), sunsetPaletteHexForSourceHex("484a77"));
  }
  assert.equal(pixelHex(building, 5, 2, 2), "625565", "interior pixel changed");
  for (const x of [1, 2, 3]) {
    assert.equal(pixelHex(building, 5, x, 3), "625565", "ground edge changed");
  }
});

test("transparent interior holes are not mistaken for the outside silhouette", () => {
  const sky = solidRaster(5, 5, "484a77");
  const building = solidRaster(5, 5, "625565");
  setTransparent(building, 5, 2, 2);

  applyCityBuildingEdgeContrast({
    pixels: building,
    width: 5,
    height: 5,
    masterY: 0,
    skyMasterY: 0,
    skySourceColorsByRow: citySkySourceColorsByRow({ pixels: sky, width: 5, height: 5 })
  });

  assert.equal(pixelHex(building, 5, 2, 1), "625565");
  assert.equal(pixelHex(building, 5, 1, 2), "625565");
  assert.equal(pixelHex(building, 5, 3, 2), "625565");
});

test("pale outlines can traverse the full darker ramp to clear every sky band", () => {
  const sky = transparentRaster(3, 3);
  for (let y = 0; y < 3; y += 1) {
    setPixel(sky, 3, 0, y, "4d65b4");
    setPixel(sky, 3, 1, y, "4d9be6");
    setPixel(sky, 3, 2, y, "8fd3ff");
  }
  const building = transparentRaster(3, 3);
  setPixel(building, 3, 1, 1, "9babb2");
  setPixel(building, 3, 1, 2, "9babb2");

  assert.equal(applyCityBuildingEdgeContrast({
    pixels: building,
    width: 3,
    height: 3,
    masterY: 0,
    skyMasterY: 0,
    skySourceColorsByRow: citySkySourceColorsByRow({ pixels: sky, width: 3, height: 3 })
  }), 1);
  assert.notEqual(pixelHex(building, 3, 1, 1), "9babb2");
});

test("edge contrast remains distinct through intermediate day-night palette stages", () => {
  const sky = solidRaster(3, 3, "4d65b4");
  const building = transparentRaster(3, 3);
  setPixel(building, 3, 1, 1, "966c6c");
  setPixel(building, 3, 1, 2, "966c6c");

  applyCityBuildingEdgeContrast({
    pixels: building,
    width: 3,
    height: 3,
    masterY: 0,
    skyMasterY: 0,
    skySourceColorsByRow: citySkySourceColorsByRow({ pixels: sky, width: 3, height: 3 })
  });

  assert.notEqual(
    gradedHex(pixelHex(building, 3, 1, 1), { sunset: 0.5, night: 0.5 }),
    gradedHex("4d65b4", { sunset: 0.5, night: 0.5 })
  );
});

test("building edge contrast is scoped to authored structures", () => {
  assert.equal(cityBuildingEdgeContrastApplies("Home"), true);
  assert.equal(cityBuildingEdgeContrastApplies("Japan Home", { regionalOf: "Home" }), true);
  assert.equal(cityBuildingEdgeContrastApplies("Church"), true);
  assert.equal(cityBuildingEdgeContrastApplies("Gate Front Edge"), true);
  assert.equal(cityBuildingEdgeContrastApplies("Shipyard Front"), true);
  assert.equal(cityBuildingEdgeContrastApplies("Distant Forest"), false);
  assert.equal(cityBuildingEdgeContrastApplies("Dock"), false);
});

function solidRaster(width, height, hex) {
  const pixels = transparentRaster(width, height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) setPixel(pixels, width, x, y, hex);
  }
  return pixels;
}

function transparentRaster(width, height) {
  return new Uint8ClampedArray(width * height * 4);
}

function setPixel(pixels, width, x, y, hex) {
  const offset = (y * width + x) * 4;
  pixels[offset] = Number.parseInt(hex.slice(0, 2), 16);
  pixels[offset + 1] = Number.parseInt(hex.slice(2, 4), 16);
  pixels[offset + 2] = Number.parseInt(hex.slice(4, 6), 16);
  pixels[offset + 3] = 255;
}

function setTransparent(pixels, width, x, y) {
  pixels[(y * width + x) * 4 + 3] = 0;
}

function pixelHex(pixels, width, x, y) {
  const offset = (y * width + x) * 4;
  return [pixels[offset], pixels[offset + 1], pixels[offset + 2]]
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("");
}

function gradedHex(hex, light) {
  const pixels = new Uint8ClampedArray([
    Number.parseInt(hex.slice(0, 2), 16),
    Number.parseInt(hex.slice(2, 4), 16),
    Number.parseInt(hex.slice(4, 6), 16),
    255
  ]);
  applyDayNightPaletteGrade(pixels, 1, 1, light);
  return pixelHex(pixels, 1, 0, 0);
}
