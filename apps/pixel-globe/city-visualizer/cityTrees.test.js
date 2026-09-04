import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createCanvas, loadImage } from "../../../examples/globe-demo/node_modules/canvas/index.js";
import { RESURRECT_64_HEX } from "../src/waterLatitudePalette.js";
import {
  CITY_TREE_BACKGROUND_SHADOW_Z,
  CITY_TREE_CASTLE_BACKING_SHADOW_Z,
  CITY_TREE_FOREGROUND_SHADOW_Z,
  cityTreeCount,
  cityTreePlacements
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

test("individual trees are sparse, deterministic props across near and rear planes", () => {
  const city = sampleCity({ id: "forest-port", cityType: "northern-european", lat: 52 });
  const features = { rightTerrain: "forest" };
  const placements = cityTreePlacements({ city, features, trees: manifest.trees });
  assert.deepEqual(placements, cityTreePlacements({ city, features, trees: manifest.trees }));
  assert.ok(placements.length >= 3 && placements.length <= 4);
  assert.ok(placements.every(({ tree }) => tree.id !== "palm"));
  const foreground = placements.filter(({ depth }) => depth === 1);
  const behindBuildings = placements.filter(({ depth }) => depth < 1);
  const midgroundAccent = behindBuildings.filter(({ id }) => id.endsWith(":behind-buildings"));
  const castleBacking = behindBuildings.filter(({ id }) => id.endsWith(":castle-backing"));
  assert.ok(foreground.length >= 1, "at least one individual tree fills the open foreground");
  assert.ok(foreground.every(({ z, scale, baseY }) => z > 70 && scale >= 0.9 && baseY >= 575));
  assert.equal(foreground[0].baseY, 575, "the first foreground tree enters the normal-height viewport");
  assert.ok(
    foreground[0].id.endsWith(":foreground-business-gap"),
    "the usual foreground tree occupies the business frontage instead of the assault midpoint"
  );
  assert.equal(
    foreground[0].originX + foreground[0].tree.frame.sourceSize.w * foreground[0].scale / 2,
    1090,
    "the usual foreground tree sits between the final market stall and the inn"
  );
  assert.equal(behindBuildings.length, 2);
  assert.ok(midgroundAccent.every(({ z, scale }) => z < 40 && scale < 0.5));
  assert.ok(castleBacking.every(({ z, scale }) => z < 45 && scale === 0.55));
});

test("baked tree lighting and left-cast shadows always retain their authored orientation", () => {
  const features = { rightTerrain: "forest" };
  const placements = Array.from({ length: 24 }, (_, index) => cityTreePlacements({
    city: sampleCity({ id: `shadow-direction-${index}` }),
    features,
    trees: manifest.trees
  })).flat();
  assert.ok(placements.length > 0);
  assert.ok(
    placements.every(({ flipX }) => flipX === false),
    "all tree lighting retains its authored direction"
  );
  assert.ok(
    placements.every(({ shadowFlipX }) => shadowFlipX === false),
    "all tree shadows retain the authored left-cast direction"
  );
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
  assert.ok(polynesian.filter(({ depth }) => depth === 1).every(({ shadowZ, z }) => shadowZ < z));
  assert.ok(polynesian
    .filter(({ id }) => id.endsWith(":behind-buildings"))
    .every(({ shadowZ, z }) => shadowZ < z));
  assert.ok(polynesian
    .filter(({ id }) => id.endsWith(":castle-backing"))
    .every(({ shadowZ, z }) => shadowZ < z));

  const coolMediterranean = cityTreePlacements({
    city: sampleCity({ id: "cool-med-port", cityType: "mediterranean", lat: 44 }),
    features: forest,
    trees: manifest.trees
  });
  assert.ok(coolMediterranean.every(({ tree }) => tree.id !== "palm"));

  const southeastAsian = cityTreePlacements({
    city: sampleCity({ id: "makian-like-port", cityType: "southeast-asian", lat: 1 }),
    features: forest,
    trees: manifest.trees
  });
  assert.equal(southeastAsian[0].tree.id, "palm", "a tropical palm occupies the first foreground slot");
  assert.ok(southeastAsian.some(({ tree }) => tree.id !== "palm"), "tropical scenes retain other regional trees");
});

test("tree placement rejects an unmapped city culture", () => {
  assert.throws(() => cityTreePlacements({
    city: sampleCity({ cityType: "unmapped-culture" }),
    features: { rightTerrain: "forest" },
    trees: manifest.trees
  }), /No city tree pool/);
});

test("some river scenes with actual opposite-bank tree cover place a regional foreground tree there", () => {
  const features = {
    approach: "river",
    leftTerrain: "grass",
    leftTreeCover: true,
    rightTerrain: "forest"
  };
  let placements = [];
  for (let index = 0; index < 20 && placements.length === 0; index++) {
    placements = cityTreePlacements({
      city: sampleCity({ id: `river-port-${index}`, cityType: "northern-european", lat: 52 }),
      features,
      trees: manifest.trees
    }).filter(({ id }) => id.endsWith(":left-bank-foreground"));
  }
  assert.equal(placements.length, 1);
  assert.equal(placements[0].parallaxAnchor, -1);
  assert.equal(placements[0].depth, 1);
  assert.equal(placements[0].scale, 0.9);
  assert.equal(placements[0].baseY, 575);
  assert.ok(placements[0].tree.id !== "palm");
});

test("a river scene never invents a left-bank tree where the terrain scan found no tree cover", () => {
  for (let index = 0; index < 20; index++) {
    const placements = cityTreePlacements({
      city: sampleCity({ id: `bare-river-port-${index}`, cityType: "northern-european", lat: 52 }),
      features: {
        approach: "river",
        leftTerrain: "grass",
        leftTreeCover: false,
        rightTerrain: "forest"
      },
      trees: manifest.trees
    });
    assert.ok(placements.every(({ id }) => !id.endsWith(":left-bank-foreground")));
  }
});

test("one regional tree always occupies the plane behind the castle", () => {
  const city = sampleCity({ id: "open-town", cityType: "northern-european", lat: 52 });
  const baseFeatures = {
    approach: "ocean",
    fortified: false,
    rightTerrain: "grass"
  };
  const openTown = cityTreePlacements({ city, features: baseFeatures, trees: manifest.trees });
  const backing = openTown.find(({ id }) => id.endsWith(":castle-backing"));
  assert.ok(backing);
  assert.equal(backing.baseY, 508);
  assert.equal(backing.scale, 0.55);
  assert.equal(backing.shadowZ, CITY_TREE_CASTLE_BACKING_SHADOW_Z);
  assert.equal(backing.depth, 0.996, "the backing tree is parallax-locked to the far wall");
  assert.ok(backing.z < 45, "the backing tree stays behind the far castle wall");

  const fortified = cityTreePlacements({
    city,
    features: { ...baseFeatures, fortified: true },
    trees: manifest.trees
  });
  assert.ok(fortified.some(({ id }) => id.endsWith(":castle-backing")));
});

test("open terrain gets fewer accents than forest and desert only permits an occasional palm", () => {
  const city = sampleCity({ id: "tree-count-port", cityType: "islamic-desert", lat: 25 });
  assert.ok(cityTreeCount(city, "forest", true) >= 2);
  assert.ok(cityTreeCount(city, "grass", true) <= 1);
  assert.ok(cityTreeCount(city, "rocky", true) <= 1);
  assert.ok(cityTreeCount(city, "desert", false) === 0);
  assert.ok(cityTreeCount(city, "desert", true) <= 1);
});

test("tree shadows keep their authored painter planes", () => {
  assert.ok(CITY_TREE_BACKGROUND_SHADOW_Z < 39.6, "rear shadows stay behind their tree and hill");
  assert.ok(CITY_TREE_FOREGROUND_SHADOW_Z > 70, "near shadows cover the foreground terrain");
  assert.ok(CITY_TREE_FOREGROUND_SHADOW_Z < 74, "near shadows remain behind their trees");
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
