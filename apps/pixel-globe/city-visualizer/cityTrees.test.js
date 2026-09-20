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
  cityTreeParticleSprites,
  cityTreePlacements,
  cityTreePresentation
} from "./cityTrees.js";

const manifestUrl = new URL("./assets/trees/manifest.json", import.meta.url);
const manifest = JSON.parse(await readFile(manifestUrl, "utf8"));

test("the city tree atlas exports seasonal Resurrect trees and shared shadows", async () => {
  assert.equal(manifest.format, "marque-city-tree-atlas");
  assert.equal(manifest.version, 2);
  assert.equal(manifest.palette, "Resurrect 64");
  assert.equal(manifest.trees.length, 12);
  assert.equal(new Set(manifest.trees.map(({ id }) => id)).size, 12);
  for (const tree of manifest.trees) {
    assert.deepEqual(tree.frame.sourceSize, { w: 100, h: 150 }, tree.id);
    assert.deepEqual(tree.shadow.sourceSize, { w: 100, h: 150 }, tree.id);
    assert.deepEqual(tree.variants.foliage, tree.frame, tree.id);
    for (const variant of Object.values(tree.variants)) {
      assert.deepEqual(variant.sourceSize, { w: 100, h: 150 }, tree.id);
    }
  }
  assert.deepEqual(Object.keys(tree("larch").variants), ["foliage", "autumn", "bare"]);
  assert.deepEqual(Object.keys(tree("cherry").variants), ["foliage", "blossom", "autumn", "bare"]);
  assert.deepEqual(tree("cherry").particleColors, {
    blossom: ["eaaded", "f04f78"],
    leaf: ["cd683d", "fbb954"]
  });
  assert.equal(tree("cherry").particleEmitters.blossom.length, 64);
  assert.equal(tree("cherry").particleEmitters.leaf.length, 64);

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

  const larchAutumnColors = frameColors(context, tree("larch").variants.autumn);
  assert.ok(larchAutumnColors.has("676633"));
  assert.ok(larchAutumnColors.has("a2a947"));
  assert.ok(larchAutumnColors.has("d5e04b"));
  assert.ok(!larchAutumnColors.has("165a4c"));
  assert.ok(!larchAutumnColors.has("239063"));
  const larchBareColors = frameColors(context, tree("larch").variants.bare);
  assert.ok(!larchBareColors.has("165a4c"));
  assert.ok(!larchBareColors.has("239063"));
  const cherryBlossomColors = frameColors(context, tree("cherry").variants.blossom);
  assert.ok(cherryBlossomColors.has("eaaded"));
  assert.ok(cherryBlossomColors.has("f04f78"));
  assertEmitterPixels(
    context,
    tree("cherry").variants.blossom,
    tree("cherry").particleEmitters.blossom,
    new Set(["eaaded", "f04f78"])
  );
  assertEmitterPixels(
    context,
    tree("cherry").variants.foliage,
    tree("cherry").particleEmitters.leaf,
    new Set(["165a4c", "239063", "91db69"])
  );
  assertEmitterPixels(
    context,
    tree("cherry").variants.autumn,
    tree("cherry").particleEmitters.leaf,
    new Set(["9e4539", "cd683d", "fbb954"])
  );
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

test("Japan and Korea feature true cherry trees while other East Asian ports do not", () => {
  const forest = { rightTerrain: "forest" };
  for (const [id, country, populationProfileId, lat, lon] of [
    ["kyoto|japan", "Japan", "japanese", 35.02, 135.75],
    ["seoul|republic of korea", "Republic of Korea", "joseon", 37.57, 126.98],
    ["kaesong|dem. people's republic of korea", "Dem. People's Republic of Korea", "joseon", 37.97, 126.55]
  ]) {
    const placements = cityTreePlacements({
      city: sampleCity({ id, country, populationProfileId, lat, lon, cityType: "east-asian" }),
      features: forest,
      trees: manifest.trees
    });
    assert.equal(placements[0].tree.id, "cherry", id);
    assert.equal(placements[0].presentationPolicy, "cherry", id);
  }
  const chinese = cityTreePlacements({
    city: sampleCity({
      id: "ningbo|china", country: "China", populationProfileId: "ming",
      lat: 29.87, lon: 121.55, cityType: "east-asian"
    }),
    features: forest,
    trees: manifest.trees
  });
  assert.ok(chinese.every(({ tree: selectedTree }) => selectedTree.id !== "cherry"));
});

test("Pacific Northwest geography features Douglas fir independently of city art culture", () => {
  const forest = { rightTerrain: "forest" };
  const pnw = cityTreePlacements({
    city: sampleCity({
      id: "yuquot-like", country: "Indigenous", lat: 49.6, lon: -126.1, cityType: "mesoamerican"
    }),
    features: forest,
    trees: manifest.trees
  });
  assert.equal(pnw[0].tree.id, "douglas-fir");
  const california = cityTreePlacements({
    city: sampleCity({
      id: "california-like", country: "Indigenous", lat: 37.7, lon: -122.4, cityType: "mesoamerican"
    }),
    features: forest,
    trees: manifest.trees
  });
  assert.ok(california.every(({ tree: selectedTree }) => selectedTree.id !== "douglas-fir"));
});

test("larch, cherry, and generic deciduous policies follow their authored annual cycles", () => {
  const larch = tree("larch");
  assert.equal(presentation(larch, "larch", 50, 150).phase, "foliage");
  assert.equal(presentation(larch, "larch", 50, 270).phase, "autumn");
  assert.equal(presentation(larch, "larch", 50, 320).phase, "bare");

  const cherry = tree("cherry");
  assert.equal(presentation(cherry, "cherry", 35, 85).phase, "blossom");
  assert.equal(presentation(cherry, "cherry", 35, 100).phase, "falling-blossom");
  assert.equal(presentation(cherry, "cherry", 35, 150).phase, "foliage");
  assert.equal(presentation(cherry, "cherry", 35, 290).phase, "falling-leaf");
  assert.equal(presentation(cherry, "cherry", 35, 320).phase, "bare");

  const genericPhases = [85, 150, 270, 290, 320].map((dayOfYear) => (
    presentation(cherry, "deciduous", 50, dayOfYear).phase
  ));
  assert.deepEqual(genericPhases, ["foliage", "foliage", "autumn", "falling-leaf", "bare"]);
  assert.ok(!genericPhases.some((phase) => phase.includes("blossom")));
});

test("falling blossom and leaf particles are deterministic two-pixel wafts", () => {
  for (const kind of ["blossom", "leaf"]) {
    const emitters = tree("cherry").particleEmitters[kind];
    const emitterKeys = new Set(emitters.map(({ x, y }) => `${x}:${y}`));
    const first = cityTreeParticleSprites({
      placementId: "kyoto:foreground", kind, timeMs: 1_000, colorCount: 2, emitters
    });
    const atCycleStart = cityTreeParticleSprites({
      placementId: "kyoto:foreground", kind, timeMs: 0, colorCount: 2, emitters
    });
    const repeated = cityTreeParticleSprites({
      placementId: "kyoto:foreground", kind, timeMs: 1_000, colorCount: 2, emitters
    });
    const advanced = cityTreeParticleSprites({
      placementId: "kyoto:foreground", kind, timeMs: 1_500, colorCount: 2, emitters
    });
    assert.deepEqual(first, repeated);
    assert.notDeepEqual(first, advanced);
    assert.ok(first.every(({ width, height, colorIndex }) => (
      width === 2 && [1, 2].includes(height) && [0, 1].includes(colorIndex)
    )));
    assert.ok(first.every(({ originX, originY }) => emitterKeys.has(`${originX}:${originY}`)));
    assert.equal(atCycleStart[0].x, atCycleStart[0].originX);
    assert.equal(atCycleStart[0].y, atCycleStart[0].originY);
  }
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
    country: "United Kingdom",
    populationProfileId: "northern-european",
    lat: 50,
    lon: 0,
    ...overrides
  });
}

function tree(id) {
  const result = manifest.trees.find((candidate) => candidate.id === id);
  assert.ok(result, `missing tree ${id}`);
  return result;
}

function presentation(selectedTree, presentationPolicy, latitudeDeg, dayOfYear) {
  return cityTreePresentation(selectedTree, { presentationPolicy, latitudeDeg, dayOfYear });
}

function frameColors(context, frame) {
  const pixels = context.getImageData(frame.frame.x, frame.frame.y, frame.frame.w, frame.frame.h).data;
  const colors = new Set();
  for (let offset = 0; offset < pixels.length; offset += 4) {
    if (pixels[offset + 3] === 0) continue;
    colors.add([pixels[offset], pixels[offset + 1], pixels[offset + 2]]
      .map((value) => value.toString(16).padStart(2, "0"))
      .join(""));
  }
  return colors;
}

function assertEmitterPixels(context, frame, emitters, allowedColors) {
  const pixels = context.getImageData(frame.frame.x, frame.frame.y, frame.frame.w, frame.frame.h).data;
  for (const { x, y } of emitters) {
    const offset = (y * frame.frame.w + x) * 4;
    assert.equal(pixels[offset + 3], 255, `emitter ${x},${y} must be opaque`);
    const color = [pixels[offset], pixels[offset + 1], pixels[offset + 2]]
      .map((value) => value.toString(16).padStart(2, "0"))
      .join("");
    assert.ok(allowedColors.has(color), `emitter ${x},${y} starts on #${color}`);
  }
}
