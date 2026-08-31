import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  WATER_SOURCE_BASE_HEX,
  waterLatitudeBand,
  waterPaletteHexForSourceHex
} from "../src/waterLatitudePalette.js";
import { PORT_SCENE_OCEAN_SLICES } from "./citySceneRules.js";
import {
  CITY_WATER_DEPTH_LEVELS,
  CITY_WATER_ART_BASE_HEX,
  cityWaterAnimatedLayerUsesPalette,
  cityWaterDepthIndex,
  cityWaterLatitudeBand,
  cityWaterPaletteHexForSourceHex,
  cityWaterPaletteRgb
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
  assert.match(source, /drawWaterToWaveEdges[\s\S]*latitudeWaterCssColor\("4d65b4", masterY\)/);
  assert.match(source, /docksideShipWaterlineLayers\([\s\S]*waterlineRgb/);
});

function toHex({ r, g, b }) {
  return [r, g, b].map((channel) => channel.toString(16).padStart(2, "0")).join("");
}
