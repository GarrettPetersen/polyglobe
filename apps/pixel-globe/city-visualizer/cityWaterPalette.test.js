import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  WATER_SOURCE_BASE_HEX,
  waterLatitudeBand,
  waterPaletteHexForSourceHex
} from "../src/waterLatitudePalette.js";
import { PORT_SCENE_MASTER, PORT_SCENE_OCEAN_SLICES } from "./citySceneRules.js";
import {
  CITY_WATER_DEPTH_LEVELS,
  CITY_WATER_ART_BASE_HEX,
  cityWaterAnimatedLayerUsesPalette,
  cityWaterDepthIndex,
  cityWaterDepthIndexAt,
  cityWaterLatitudeBand,
  cityWaterPaletteHexForSourceHex,
  cityWaterPaletteRgb,
  cityWaterPaletteRgbAt,
  applyCityWaterPalette
} from "./cityWaterPalette.js";

test("city water uses every production depth band from horizon to foreground", () => {
  const top = PORT_SCENE_OCEAN_SLICES[0].top;
  const bottom = PORT_SCENE_OCEAN_SLICES[2].bottom - 1;
  assert.equal(cityWaterDepthIndex(top), CITY_WATER_DEPTH_LEVELS - 1);
  assert.equal(cityWaterDepthIndex(bottom), 0);

  const depths = new Set();
  let previous = CITY_WATER_DEPTH_LEVELS;
  for (let y = top; y <= bottom; y++) {
    const depth = cityWaterDepthIndex(y);
    assert.ok(depth <= previous, `water depth increased toward the foreground at row ${y}`);
    depths.add(depth);
    previous = depth;
  }
  assert.deepEqual([...depths].sort(), [0, 1, 2, 3, 4, 5]);
  assert.equal(cityWaterDepthIndex(PORT_SCENE_OCEAN_SLICES.at(-1).bottom - 1), 0);
  assert.throws(() => cityWaterDepthIndex(Number.NaN), /row must be finite/);
});

test("city water depth boundaries form smooth natural contours instead of straight stripes", () => {
  const top = PORT_SCENE_OCEAN_SLICES[0].top;
  const bottom = PORT_SCENE_OCEAN_SLICES[2].bottom - 1;
  const sceneWidth = PORT_SCENE_MASTER.width;

  for (let boundaryIndex = 0; boundaryIndex < CITY_WATER_DEPTH_LEVELS - 1; boundaryIndex++) {
    const upperDepth = CITY_WATER_DEPTH_LEVELS - 1 - boundaryIndex;
    const boundaryRows = [];
    for (let x = 0; x < sceneWidth; x++) {
      let boundaryY = null;
      for (let y = top; y <= bottom; y++) {
        if (cityWaterDepthIndexAt(x, y) < upperDepth) {
          boundaryY = y;
          break;
        }
      }
      assert.notEqual(boundaryY, null, `missing water contour ${boundaryIndex} at x=${x}`);
      boundaryRows.push(boundaryY);
    }

    assert.ok(
      new Set(boundaryRows).size >= 12,
      `water contour ${boundaryIndex} is still effectively a straight horizontal line`
    );
    for (let x = 1; x < boundaryRows.length; x++) {
      assert.ok(
        Math.abs(boundaryRows[x] - boundaryRows[x - 1]) <= 1,
        `water contour ${boundaryIndex} has noisy pixel scatter at x=${x}`
      );
    }
    assert.ok(
      Math.abs(boundaryRows[0] - boundaryRows.at(-1)) <= 1,
      `water contour ${boundaryIndex} does not wrap seamlessly`
    );
  }

  for (const x of [0, 136, 341, 682, 1023, PORT_SCENE_MASTER.width - 1]) {
    let previous = CITY_WATER_DEPTH_LEVELS;
    for (let y = top; y <= bottom; y++) {
      const depth = cityWaterDepthIndexAt(x, y);
      assert.ok(depth <= previous, `water depth reversed at x=${x}, y=${y}`);
      previous = depth;
    }
  }

  assert.throws(() => cityWaterDepthIndexAt(Number.NaN, top), /column must be finite/);
});

test("city ocean and wave colors delegate to the production latitude palette", () => {
  const masterY = PORT_SCENE_OCEAN_SLICES[1].top;
  const latitude = -6.1622;
  const depthIndex = cityWaterDepthIndex(masterY);
  const expected = waterPaletteHexForSourceHex(
    WATER_SOURCE_BASE_HEX[depthIndex],
    waterLatitudeBand(latitude),
    depthIndex
  );
  assert.equal(cityWaterPaletteHexForSourceHex(CITY_WATER_ART_BASE_HEX, latitude, masterY), expected);

  const rgb = cityWaterPaletteRgb(77, 101, 180, latitude, masterY);
  assert.equal(toHex(rgb), expected);

  const contouredRgb = cityWaterPaletteRgbAt(77, 101, 180, latitude, 417, masterY);
  const contouredDepth = cityWaterDepthIndexAt(417, masterY);
  const contouredExpected = waterPaletteHexForSourceHex(
    WATER_SOURCE_BASE_HEX[contouredDepth],
    waterLatitudeBand(latitude),
    contouredDepth
  );
  assert.equal(toHex(contouredRgb), contouredExpected);
});

test("city palette caching can share the production five-degree latitude bands", () => {
  assert.equal(cityWaterLatitudeBand(-6.1622), waterLatitudeBand(-6.1622));
  assert.equal(cityWaterLatitudeBand(51.5072), cityWaterLatitudeBand(52.1));
});

test("tropical city water is turquoise while temperate water uses a cooler muted ramp", () => {
  const shorelineY = PORT_SCENE_OCEAN_SLICES[2].top;
  const tropical = cityWaterPaletteHexForSourceHex(CITY_WATER_ART_BASE_HEX, -6.1622, shorelineY);
  const temperate = cityWaterPaletteHexForSourceHex(CITY_WATER_ART_BASE_HEX, 51.5072, shorelineY);
  assert.notEqual(tropical, temperate);
  assert.ok(["30e1b9", "0eaf9b", "0b8a8f", "0b5e65"].includes(tropical));
  assert.ok(["c7dcd0", "9babb2", "7f708a", "625565", "4d65b4", "484a77", "323353"].includes(temperate));
});

test("waves follow local water color while authored white surf stays white", () => {
  assert.equal(cityWaterAnimatedLayerUsesPalette("Waves"), true);
  assert.equal(cityWaterAnimatedLayerUsesPalette("Surf"), false);
  assert.throws(
    () => cityWaterAnimatedLayerUsesPalette("Foam"),
    /Invalid city water animation layer/
  );
});

test("static ocean, animated waves, shoreline fill, and ship waterlines share the city palette", () => {
  const source = fs.readFileSync(new URL("./main.js", import.meta.url), "utf8");
  assert.match(source, /drawOceanSlice[\s\S]*latitudeWaterFrame\(state\.staticAtlas, frame, PORT_SCENE_HORIZON_SHIFT_Y\)/);
  assert.match(source, /drawAnimatedLayer[\s\S]*cityWaterAnimatedLayerUsesPalette\(layerName\)[\s\S]*latitudeWaterFrame\(atlas, frame\)/);
  assert.match(source, /latitudeWaterFrame[\s\S]*applyCityWaterPalette\(/);
  assert.match(source, /drawWaterToWaveEdges[\s\S]*latitudeWaterCssColor\("4d65b4", masterY\)/);
  assert.match(source, /docksideShipWaterlineLayers\([\s\S]*waterlineRgb/);
});

test("raster water colours match scalar presentation across latitude, depth, offsets and alpha", () => {
  const width = 83;
  const height = 257;
  for (const latitudeDeg of [-90, -51.5, -6.2, 0, 34.7, 90]) {
    for (const masterX of [-46.5, 0, 1300]) {
      const masterY = PORT_SCENE_OCEAN_SLICES[0].top - 8.5;
      const actual = new Uint8ClampedArray(width * height * 4);
      const expected = new Uint8ClampedArray(actual.length);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const offset = (y * width + x) * 4;
          const rgba = [(x * 37) % 256, (y * 71) % 256, ((x + y) * 43) % 256, (x + y) % 256];
          actual.set(rgba, offset);
          if (rgba[3] === 0) expected.set(rgba, offset);
          else {
            const rgb = cityWaterPaletteRgbAt(...rgba.slice(0, 3), latitudeDeg, masterX + x, masterY + y);
            expected.set([rgb.r, rgb.g, rgb.b, rgba[3]], offset);
          }
        }
      }
      applyCityWaterPalette({ pixels: actual, width, height, latitudeDeg, masterX, masterY });
      assert.deepEqual(actual, expected, `${latitudeDeg} degrees at x=${masterX}`);
    }
  }
});

test("water contour work grows with raster width rather than area", (t) => {
  const sin = t.mock.method(Math, "sin");
  const width = 80;
  const height = 400;
  applyCityWaterPalette({
    pixels: new Uint8ClampedArray(width * height * 4).fill(255),
    width, height, latitudeDeg: 51.5, masterX: 0, masterY: 0
  });
  assert.ok(sin.mock.callCount() <= width * 15, `repeated contour work: ${sin.mock.callCount()} calls`);
});

test("water raster preparation rejects malformed inputs", () => {
  const options = { pixels: new Uint8ClampedArray(4), width: 1, height: 1, latitudeDeg: 0, masterX: 0, masterY: 0 };
  assert.throws(() => applyCityWaterPalette({ ...options, width: 2 }), /RGBA raster/);
  assert.throws(() => applyCityWaterPalette({ ...options, masterX: NaN }), /finite scene coordinates/);
  assert.throws(() => applyCityWaterPalette({ ...options, latitudeDeg: NaN }), /latitude/i);
});

function toHex({ r, g, b }) {
  return [r, g, b].map((channel) => channel.toString(16).padStart(2, "0")).join("");
}
