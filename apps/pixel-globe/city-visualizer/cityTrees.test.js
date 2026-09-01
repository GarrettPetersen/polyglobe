import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createCanvas, loadImage } from "../../../examples/globe-demo/node_modules/canvas/index.js";
import {
  RESURRECT_64_HEX,
  darkerResurrect64Hex
} from "../src/waterLatitudePalette.js";
import {
  CITY_TREE_SHADOW_Z,
  cityTreeCount,
  cityTreePlacements,
  cityTreeShadowRgb
} from "./cityTrees.js";

const manifestUrl = new URL("./assets/trees/manifest.json", import.meta.url);
const manifest = JSON.parse(await readFile(manifestUrl, "utf8"));

test("the city tree atlas exports eleven paired Resurrect trees and shadows", async () => {
  assert.equal(manifest.format, "marque-city-tree-atlas");
  assert.equal(manifest.version, 1);
  assert.equal(manifest.palette, "Resurrect 64");
  assert.equal(manifest.trees.length, 11);
  assert.equal(new Set(manifest.trees.map(({ id }) => id)).size, 11);
  for (const tree of manifest.trees) {
    assert.deepEqual(tree.frame.sourceSize, { w: 100, h: 150 }, tree.id);
    assert.deepEqual(tree.shadow.sourceSize, { w: 100, h: 150 }, tree.id);
  }

  const image = await loadImage(new URL(`./assets/trees/${manifest.sheet}`, import.meta.url).pathname);
  const canvas = createCanvas(image.width, image.height);
  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, image.width, image.height).data;
  const palette = new Set(RESURRECT_64_HEX);
  let opaquePixels = 0;
  for (let offset = 0; offset < pixels.length; offset += 4) {
    if (pixels[offset + 3] === 0) continue;
    const hex = [pixels[offset], pixels[offset + 1], pixels[offset + 2]]
      .map((value) => value.toString(16).padStart(2, "0"))
      .join("");
    assert.ok(palette.has(hex), `tree atlas contains non-Resurrect color #${hex}`);
    opaquePixels++;
  }
  assert.ok(opaquePixels > 0);
});

test("individual tree placement is sparse, deterministic, and ordered by perspective", () => {
  const city = sampleCity({ id: "forest-port", cityType: "northern-european", lat: 52 });
  const features = { rightTerrain: "forest" };
  const placements = cityTreePlacements({ city, features, trees: manifest.trees });
  assert.deepEqual(placements, cityTreePlacements({ city, features, trees: manifest.trees }));
  assert.ok(placements.length >= 2 && placements.length <= 3);
  assert.ok(placements.every(({ tree }) => tree.id !== "palm"));
  assert.ok(placements.every(({ z }) => z < 40), "trees stay behind the quay houses");
  const byBase = [...placements].sort((a, b) => a.baseY - b.baseY);
  for (let index = 1; index < byBase.length; index++) {
    assert.ok(byBase[index].scale > byBase[index - 1].scale);
    assert.ok(byBase[index].depth > byBase[index - 1].depth);
  }
});

test("regional pools and latitude prevent implausible tree choices", () => {
  const forest = { rightTerrain: "forest" };
  const polynesian = cityTreePlacements({
    city: sampleCity({ id: "island-port", cityType: "polynesian", lat: -18 }),
    features: forest,
    trees: manifest.trees
  });
  assert.ok(polynesian.length > 0);
  assert.ok(polynesian.every(({ tree }) => tree.id === "palm"));

  const coolMediterranean = cityTreePlacements({
    city: sampleCity({ id: "cool-med-port", cityType: "mediterranean", lat: 44 }),
    features: forest,
    trees: manifest.trees
  });
  assert.ok(coolMediterranean.every(({ tree }) => tree.id !== "palm"));
});

test("open terrain gets fewer accents than forest and desert only permits an occasional palm", () => {
  const city = sampleCity({ id: "tree-count-port", cityType: "islamic-desert", lat: 25 });
  assert.ok(cityTreeCount(city, "forest", true) >= 2);
  assert.ok(cityTreeCount(city, "grass", true) <= 1);
  assert.ok(cityTreeCount(city, "rocky", true) <= 1);
  assert.ok(cityTreeCount(city, "desert", false) === 0);
  assert.ok(cityTreeCount(city, "desert", true) <= 1);
});

test("tree shadows remap the underlying scene colour through the game's Resurrect shade ramp", () => {
  for (const sourceHex of ["239063", "a2a947", "f9c22b", "c7dcd0", "4d65b4"]) {
    const red = Number.parseInt(sourceHex.slice(0, 2), 16);
    const green = Number.parseInt(sourceHex.slice(2, 4), 16);
    const blue = Number.parseInt(sourceHex.slice(4, 6), 16);
    const shadow = cityTreeShadowRgb(red, green, blue);
    const expected = darkerResurrect64Hex(sourceHex, 2);
    assert.equal(
      [shadow.red, shadow.green, shadow.blue]
        .map((value) => value.toString(16).padStart(2, "0"))
        .join(""),
      expected
    );
    assert.ok(RESURRECT_64_HEX.includes(expected));
  }
  assert.ok(CITY_TREE_SHADOW_Z > 42, "the shadow is applied after the ground plane");
  assert.ok(CITY_TREE_SHADOW_Z < 45, "the shadow remains behind near businesses");
});

function sampleCity(overrides) {
  return Object.freeze({
    id: "sample-port",
    cityType: "northern-european",
    settlementType: "city",
    lat: 50,
    ...overrides
  });
}
