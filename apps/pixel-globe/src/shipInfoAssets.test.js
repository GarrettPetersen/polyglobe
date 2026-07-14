import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createCanvas, loadImage } from "../../../examples/globe-demo/node_modules/canvas/index.js";
import { MODEL_CREDITS } from "./modelCredits.js";
import {
  SHIP_PROPULSION_OAR,
  SHIP_PROPULSION_OAR_SAIL,
  SHIP_STATS
} from "./shipStats.js";
import { RESURRECT_64_HEX } from "./waterLatitudePalette.js";
import {
  SHIP_SHADOW_FRAME_SIZE,
  SHIP_SPRITE_FRAME_SIZE,
  SHIP_SPRITE_HEADINGS,
  SHIP_SPRITE_SHEET_COLS
} from "./shipSpriteLayout.js";
import { validateShipFootprintBake } from "./shipFootprint.js";
import {
  SHIP_WATERLINE_DEPTH_BYTE,
  SHIP_WATERLINE_LEVEL
} from "./shipWaterline.js";

const SIDE_VIEW_WIDTH = 192;
const SIDE_VIEW_HEIGHT = 104;
const SHIP_SHEET_SIZE = SHIP_SPRITE_FRAME_SIZE * SHIP_SPRITE_SHEET_COLS;
const SHIP_SHADOW_SHEET_WIDTH = SHIP_SHADOW_FRAME_SIZE * SHIP_SPRITE_SHEET_COLS;
const SHIP_SHADOW_SHEET_HEIGHT = SHIP_SHADOW_FRAME_SIZE * Math.ceil(
  SHIP_SPRITE_HEADINGS / SHIP_SPRITE_SHEET_COLS
) * 2;
const SHIP_LIGHTING_SHEET_HEIGHT = SHIP_SHEET_SIZE * 2;
const sideViewRoot = join(dirname(fileURLToPath(import.meta.url)), "../public/assets/vehicles/unity-ships/side-views");
const shipAssetRoot = dirname(sideViewRoot);
const NATIVE_BOAT_SLUGS = Object.freeze([
  "polynesian-voyaging-canoe",
  "mesoamerican-dugout-canoe"
]);
const MEDITERRANEAN_GALLEY_SLUG = "mediterranean-galley";
const MESOAMERICAN_CANOE_SLUG = "mesoamerican-dugout-canoe";
const VIKING_LONGSHIP_SLUG = "viking-longship";
const JOSEON_TURTLE_SHIP_SLUG = "joseon-turtle-ship";
const JOSEON_PANOKSEON_SLUG = "joseon-panokseon";
const JAPANESE_ATAKEBUNE_SLUG = "japanese-atakebune";
const SPANISH_NAO_SLUG = "spanish-nao";
const PORTUGUESE_CARRACK_SLUG = "portuguese-carrack";
const DHOW_SLUG = "dhow";
const GALLEON_SLUG = "galleon";

test("every runtime ship model has a registered attribution", async () => {
  const manifest = JSON.parse(await readFile(join(shipAssetRoot, "manifest.json"), "utf8"));
  const registeredCredits = new Set(MODEL_CREDITS.map(modelCreditKey));

  for (const entry of manifest.ships) {
    assert.ok(entry.creator, `${entry.slug} creator`);
    assert.ok(entry.license, `${entry.slug} license`);
    assert.ok(entry.sourceTitle, `${entry.slug} source title`);
    assert.ok(
      registeredCredits.has(modelCreditKey(entry)),
      `${entry.slug} model attribution is registered in the credits`
    );
    assert.doesNotMatch(JSON.stringify(entry), /https?:\/\//);
  }
});

test("every oar-capable hull and only those hulls have rowing animation", async () => {
  const manifest = JSON.parse(await readFile(join(shipAssetRoot, "manifest.json"), "utf8"));
  const expected = SHIP_STATS
    .filter((stats) => (
      stats.propulsion === SHIP_PROPULSION_OAR || stats.propulsion === SHIP_PROPULSION_OAR_SAIL
    ))
    .map((stats) => stats.slug)
    .sort();
  const animated = manifest.ships
    .filter((entry) => Array.isArray(entry.files?.rowingAnimation))
    .map((entry) => entry.slug)
    .sort();

  assert.deepEqual(animated, expected);
});

test("every roster ship has sixteen baked waterline hull footprints", async () => {
  const bake = JSON.parse(await readFile(join(shipAssetRoot, "hull-footprints.json"), "utf8"));
  const footprints = validateShipFootprintBake(
    bake,
    SHIP_SPRITE_FRAME_SIZE,
    SHIP_SPRITE_HEADINGS,
    SHIP_STATS.map((entry) => entry.slug)
  );
  assert.equal(footprints.size, SHIP_STATS.length);
  for (const [slug, frames] of footprints) {
    assert.equal(frames.length, SHIP_SPRITE_HEADINGS, `${slug} heading footprint count`);
    assert.ok(frames.every((frame) => frame.polygon.length >= 3), `${slug} polygon geometry`);
    assert.ok(frames.every((frame) => frame.samples.length >= 3), `${slug} terrain samples`);
  }
});

test("every ship sprite and rowing frame has an exact per-pixel model-height bake", async () => {
  const manifest = JSON.parse(await readFile(join(shipAssetRoot, "manifest.json"), "utf8"));

  for (const entry of manifest.ships) {
    assert.equal(entry.sinkHeightBins, 256, `${entry.slug} sink height bins`);
    assert.ok(entry.sinkHeightMin < entry.sinkHeightMax, `${entry.slug} sink height range`);
    assert.ok(
      entry.sinkWaterlineLevel >= 0 && entry.sinkWaterlineLevel <= 1,
      `${entry.slug} sink waterline level`
    );
    assert.ok(entry.files?.sinkDepth, `${entry.slug} sink-depth asset`);
    assert.ok(
      Math.abs(entry.sinkWaterlineLevel - SHIP_WATERLINE_LEVEL) < 1e-6,
      `${entry.slug} waterline level`
    );
    await assertSinkDepthPair(entry.files.sheet, entry.files.sinkDepth, entry.slug);

    const rowingAnimation = entry.files.rowingAnimation;
    const rowingSinkDepth = entry.files.rowingSinkDepth;
    if (!rowingAnimation) {
      assert.equal(rowingSinkDepth, undefined, `${entry.slug} has no orphan rowing sink-depth assets`);
      continue;
    }
    assert.ok(Array.isArray(rowingSinkDepth), `${entry.slug} rowing sink-depth list`);
    assert.equal(rowingSinkDepth.length, rowingAnimation.length, `${entry.slug} rowing sink-depth count`);
    for (let frameIndex = 0; frameIndex < rowingAnimation.length; frameIndex++) {
      await assertSinkDepthPair(
        rowingAnimation[frameIndex],
        rowingSinkDepth[frameIndex],
        `${entry.slug} rowing frame ${frameIndex}`
      );
    }
  }
});

test("every roster ship has a clipped-safe Resurrect side-view sprite", async () => {
  const manifest = JSON.parse(await readFile(join(sideViewRoot, "manifest.json"), "utf8"));
  assert.equal(manifest.palette, "Resurrect 64");
  assert.equal(manifest.width, SIDE_VIEW_WIDTH);
  assert.equal(manifest.height, SIDE_VIEW_HEIGHT);
  assert.deepEqual(
    manifest.ships.map((entry) => entry.slug).sort(),
    SHIP_STATS.map((entry) => entry.slug).sort()
  );

  const palette = new Set(RESURRECT_64_HEX);
  for (const entry of manifest.ships) {
    const image = await loadImage(join(sideViewRoot, `${entry.slug}.png`));
    assert.equal(image.width, SIDE_VIEW_WIDTH, `${entry.slug} width`);
    assert.equal(image.height, SIDE_VIEW_HEIGHT, `${entry.slug} height`);
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0);
    const pixels = ctx.getImageData(0, 0, image.width, image.height).data;
    let opaquePixels = 0;
    for (let offset = 0; offset < pixels.length; offset += 4) {
      if (pixels[offset + 3] === 0) continue;
      assert.equal(pixels[offset + 3], 255, `${entry.slug} has partial alpha`);
      const hex = [pixels[offset], pixels[offset + 1], pixels[offset + 2]]
        .map((value) => value.toString(16).padStart(2, "0"))
        .join("");
      assert.ok(palette.has(hex), `${entry.slug} contains non-Resurrect color #${hex}`);
      opaquePixels += 1;
    }
    assert.ok(opaquePixels > 0, `${entry.slug} side view is blank`);
  }
});

test("native boat models provide complete 16-heading sprite and wake bakes", async () => {
  const manifest = JSON.parse(await readFile(join(shipAssetRoot, "manifest.json"), "utf8"));
  const wakeAnchors = JSON.parse(await readFile(join(shipAssetRoot, "wake-anchors.json"), "utf8"));
  const expectedAssets = [
    ["", SHIP_SHEET_SIZE, SHIP_SHEET_SIZE],
    ["-sink-depth", SHIP_SHEET_SIZE, SHIP_SHEET_SIZE],
    ["-light", SHIP_SHEET_SIZE, SHIP_LIGHTING_SHEET_HEIGHT],
    ["-shade", SHIP_SHEET_SIZE, SHIP_LIGHTING_SHEET_HEIGHT],
    ["-shadow", SHIP_SHADOW_SHEET_WIDTH, SHIP_SHADOW_SHEET_HEIGHT]
  ];

  for (const slug of NATIVE_BOAT_SLUGS) {
    const entry = manifest.ships.find((ship) => ship.slug === slug);
    assert.ok(entry, `${slug} manifest entry`);
    assert.ok(entry.creator, `${slug} creator`);
    assert.ok(entry.license, `${slug} license`);
    assert.ok(entry.sourceTitle, `${slug} source title`);
    assert.doesNotMatch(JSON.stringify(entry), /https?:\/\//);
    assert.equal(wakeAnchors.ships[slug].length, 16, `${slug} wake headings`);

    for (const [suffix, width, height] of expectedAssets) {
      const image = await loadImage(join(shipAssetRoot, `${slug}-16-headings${suffix}.png`));
      assert.equal(image.width, width, `${slug}${suffix} width`);
      assert.equal(image.height, height, `${slug}${suffix} height`);
      assert.ok(opaquePixelCount(image) > 0, `${slug}${suffix} is blank`);
    }
  }
});

test("the Mediterranean galley provides licensed rowing animation frames", async () => {
  const manifest = JSON.parse(await readFile(join(shipAssetRoot, "manifest.json"), "utf8"));
  const wakeAnchors = JSON.parse(await readFile(join(shipAssetRoot, "wake-anchors.json"), "utf8"));
  const entry = manifest.ships.find((ship) => ship.slug === MEDITERRANEAN_GALLEY_SLUG);

  assert.ok(entry, "Mediterranean galley manifest entry");
  assert.equal(entry.creator, "Museovirasto Museiverket Finnish Heritage Agency");
  assert.equal(entry.license, "CC BY 4.0");
  assert.equal(entry.sourceTitle, "Russian 22-bank Baltic galley");
  assert.doesNotMatch(JSON.stringify(entry), /https?:\/\//);
  assert.equal(wakeAnchors.ships[MEDITERRANEAN_GALLEY_SLUG].length, 16);
  assert.equal(entry.files.rowingAnimation.length, 4);

  for (let frameIndex = 0; frameIndex < 4; frameIndex++) {
    const image = await loadImage(join(
      shipAssetRoot,
      `${MEDITERRANEAN_GALLEY_SLUG}-rowing-${frameIndex}-16-headings.png`
    ));
    assert.equal(image.width, SHIP_SHEET_SIZE, `rowing frame ${frameIndex} width`);
    assert.equal(image.height, SHIP_SHEET_SIZE, `rowing frame ${frameIndex} height`);
    assert.ok(opaquePixelCount(image) > 0, `rowing frame ${frameIndex} is blank`);
  }
});

test("the Viking longship keeps its colored sail and provides four working oar phases", async () => {
  const manifest = JSON.parse(await readFile(join(shipAssetRoot, "manifest.json"), "utf8"));
  const entry = manifest.ships.find((ship) => ship.slug === VIKING_LONGSHIP_SLUG);

  assert.ok(entry, "Viking longship manifest entry");
  assert.equal(entry.sailRecolor, false);
  assert.match(entry.sourceModel, /viking ship 1\.fbx$/);
  assert.equal(entry.files.rowingAnimation.length, 4);
  const frames = [];
  for (let frameIndex = 0; frameIndex < 4; frameIndex++) {
    const path = join(
      shipAssetRoot,
      `${VIKING_LONGSHIP_SLUG}-rowing-${frameIndex}-16-headings.png`
    );
    const image = await loadImage(path);
    assert.equal(image.width, SHIP_SHEET_SIZE, `longship rowing frame ${frameIndex} width`);
    assert.equal(image.height, SHIP_SHEET_SIZE, `longship rowing frame ${frameIndex} height`);
    assert.ok(opaquePixelCount(image) > 0, `longship rowing frame ${frameIndex} is blank`);
    frames.push(await readFile(path));
  }
  assert.equal(new Set(frames.map((buffer) => buffer.toString("base64"))).size, 4);
});

test("the Joseon turtle ship has credited art and four working oar phases", async () => {
  const manifest = JSON.parse(await readFile(join(shipAssetRoot, "manifest.json"), "utf8"));
  const entry = manifest.ships.find((ship) => ship.slug === JOSEON_TURTLE_SHIP_SLUG);

  assert.ok(entry, "Joseon turtle ship manifest entry");
  assert.equal(entry.creator, "KargaEntiti");
  assert.equal(entry.license, "CC BY 4.0");
  assert.equal(entry.sourceTitle, "Geobukseon (Turtle Ship)");
  assert.match(entry.sourceModel, /joseon-turtle-ship\/scene\.gltf$/);
  assert.equal(entry.files.rowingAnimation.length, 4);
  const frames = [];
  for (let frameIndex = 0; frameIndex < 4; frameIndex++) {
    const path = join(
      shipAssetRoot,
      `${JOSEON_TURTLE_SHIP_SLUG}-rowing-${frameIndex}-16-headings.png`
    );
    const image = await loadImage(path);
    assert.equal(image.width, SHIP_SHEET_SIZE, `turtle ship rowing frame ${frameIndex} width`);
    assert.equal(image.height, SHIP_SHEET_SIZE, `turtle ship rowing frame ${frameIndex} height`);
    assert.ok(opaquePixelCount(image) > 0, `turtle ship rowing frame ${frameIndex} is blank`);
    frames.push(await readFile(path));
  }
  assert.equal(new Set(frames.map((buffer) => buffer.toString("base64"))).size, 4);
});

test("the Joseon Panokseon replaces its static paddles with four working phases", async () => {
  const manifest = JSON.parse(await readFile(join(shipAssetRoot, "manifest.json"), "utf8"));
  const entry = manifest.ships.find((ship) => ship.slug === JOSEON_PANOKSEON_SLUG);

  assert.ok(entry, "Joseon Panokseon manifest entry");
  assert.equal(entry.creator, "Heat Of Fusion, with JJakgwi");
  assert.equal(entry.license, "CC BY 4.0");
  assert.equal(entry.sourceTitle, "Panok ship (Panokseon) | 판옥선 | 板屋船");
  assert.match(entry.sourceModel, /joseon-panokseon\/scene\.gltf$/);
  assert.deepEqual(entry.removedSourceMeshes, [{
    nodeName: "Object_9",
    parentName: "Object_4",
    positionCount: 2544
  }]);
  assert.equal(entry.files.rowingAnimation.length, 4);
  const frames = [];
  for (let frameIndex = 0; frameIndex < 4; frameIndex++) {
    const path = join(
      shipAssetRoot,
      `${JOSEON_PANOKSEON_SLUG}-rowing-${frameIndex}-16-headings.png`
    );
    const image = await loadImage(path);
    assert.equal(image.width, SHIP_SHEET_SIZE, `Panokseon rowing frame ${frameIndex} width`);
    assert.equal(image.height, SHIP_SHEET_SIZE, `Panokseon rowing frame ${frameIndex} height`);
    assert.ok(opaquePixelCount(image) > 0, `Panokseon rowing frame ${frameIndex} is blank`);
    frames.push(await readFile(path));
  }
  assert.equal(new Set(frames.map((buffer) => buffer.toString("base64"))).size, 4);
});

test("the Japanese Atakebune replaces its static oars with four working phases", async () => {
  const manifest = JSON.parse(await readFile(join(shipAssetRoot, "manifest.json"), "utf8"));
  const entry = manifest.ships.find((ship) => ship.slug === JAPANESE_ATAKEBUNE_SLUG);

  assert.ok(entry, "Japanese Atakebune manifest entry");
  assert.equal(entry.creator, "LukasSI");
  assert.equal(entry.license, "CC BY 4.0");
  assert.equal(entry.sourceTitle, "Atakebune Japanese Medieval Warship");
  assert.match(entry.sourceModel, /atakebune-japanese-warship\/scene\.gltf$/);
  assert.deepEqual(entry.removedSourceMeshes, [{
    nodeName: "Object_13",
    parentName: "Cube071_3",
    positionCount: 480
  }]);
  assert.equal(entry.files.rowingAnimation.length, 4);
  const frames = [];
  for (let frameIndex = 0; frameIndex < 4; frameIndex++) {
    const path = join(
      shipAssetRoot,
      `${JAPANESE_ATAKEBUNE_SLUG}-rowing-${frameIndex}-16-headings.png`
    );
    const image = await loadImage(path);
    assert.equal(image.width, SHIP_SHEET_SIZE, `Atakebune rowing frame ${frameIndex} width`);
    assert.equal(image.height, SHIP_SHEET_SIZE, `Atakebune rowing frame ${frameIndex} height`);
    assert.ok(opaquePixelCount(image) > 0, `Atakebune rowing frame ${frameIndex} is blank`);
    frames.push(await readFile(path));
  }
  assert.equal(new Set(frames.map((buffer) => buffer.toString("base64"))).size, 4);
});

test("the Spanish Nao uses the credited Nao Victoria source at an intermediate carrack scale", async () => {
  const manifest = JSON.parse(await readFile(join(shipAssetRoot, "manifest.json"), "utf8"));
  const entry = manifest.ships.find((ship) => ship.slug === SPANISH_NAO_SLUG);

  assert.ok(entry, "Spanish Nao manifest entry");
  assert.equal(entry.creator, "Javier López Cuadrado");
  assert.equal(entry.license, "CC BY 4.0");
  assert.equal(entry.sourceTitle, "Nao Victoria Galleon Ship");
  assert.match(entry.sourceModel, /nao-victoria\/scene\.gltf$/);
  assert.equal(entry.files.rowingAnimation, undefined);

  const dimensions = {};
  for (const slug of ["square-rigged-caravel", SPANISH_NAO_SLUG, "carrack"]) {
    dimensions[slug] = maxOpaqueFrameDimension(await loadImage(join(shipAssetRoot, `${slug}-16-headings.png`)));
  }
  assert.ok(dimensions[SPANISH_NAO_SLUG] > dimensions["square-rigged-caravel"]);
  assert.ok(dimensions[SPANISH_NAO_SLUG] < dimensions.carrack);
});

test("the Portuguese Carrack uses its credited model and large period rig", async () => {
  const manifest = JSON.parse(await readFile(join(shipAssetRoot, "manifest.json"), "utf8"));
  const entry = manifest.ships.find((ship) => ship.slug === PORTUGUESE_CARRACK_SLUG);

  assert.ok(entry, "Portuguese Carrack manifest entry");
  assert.equal(entry.creator, "gogiart");
  assert.equal(entry.license, "CC BY 4.0");
  assert.equal(entry.sourceTitle, "Portuguese Carrack");
  assert.match(entry.sourceModel, /portuguese-carrack\/scene\.gltf$/);
  assert.equal(entry.files.rowingAnimation, undefined);

  const dimensions = {};
  for (const slug of [SPANISH_NAO_SLUG, PORTUGUESE_CARRACK_SLUG]) {
    dimensions[slug] = maxOpaqueFrameDimension(await loadImage(join(shipAssetRoot, `${slug}-16-headings.png`)));
  }
  assert.ok(dimensions[PORTUGUESE_CARRACK_SLUG] > dimensions[SPANISH_NAO_SLUG]);
});

test("the Dhow uses the credited purpose-built source model", async () => {
  const manifest = JSON.parse(await readFile(join(shipAssetRoot, "manifest.json"), "utf8"));
  const entry = manifest.ships.find((ship) => ship.slug === DHOW_SLUG);

  assert.ok(entry, "Dhow manifest entry");
  assert.equal(entry.creator, "gogiart");
  assert.equal(entry.license, "CC BY 4.0");
  assert.equal(entry.sourceTitle, "Dhow");
  assert.match(entry.sourceModel, /dhow-gogiart\/scene\.gltf$/);
  assert.equal(entry.files.rowingAnimation, undefined);

  const dimensions = {};
  for (const slug of ["small-dhow", DHOW_SLUG, "xebec"]) {
    dimensions[slug] = maxOpaqueFrameDimension(await loadImage(join(shipAssetRoot, `${slug}-16-headings.png`)));
  }
  assert.ok(dimensions[DHOW_SLUG] > dimensions["small-dhow"]);
  assert.ok(dimensions[DHOW_SLUG] < dimensions.xebec);
});

test("the Galleon uses the credited detailed sailing ship model", async () => {
  const manifest = JSON.parse(await readFile(join(shipAssetRoot, "manifest.json"), "utf8"));
  const entry = manifest.ships.find((ship) => ship.slug === GALLEON_SLUG);

  assert.ok(entry, "Galleon manifest entry");
  assert.equal(entry.creator, "cyc3w");
  assert.equal(entry.license, "CC BY 4.0");
  assert.equal(entry.sourceTitle, "Sailing ship");
  assert.match(entry.sourceModel, /cyc3w-sailing-ship\/scene\.gltf$/);
  assert.equal(entry.files.rowingAnimation, undefined);
});

test("the Mesoamerican canoe has a compact four-frame paddle cycle", async () => {
  const manifest = JSON.parse(await readFile(join(shipAssetRoot, "manifest.json"), "utf8"));
  const entry = manifest.ships.find((ship) => ship.slug === MESOAMERICAN_CANOE_SLUG);

  assert.ok(entry, "Mesoamerican canoe manifest entry");
  assert.equal(entry.files.rowingAnimation.length, 4);
  const frameBuffers = [];
  for (let frameIndex = 0; frameIndex < 4; frameIndex++) {
    const path = join(
      shipAssetRoot,
      `${MESOAMERICAN_CANOE_SLUG}-rowing-${frameIndex}-16-headings.png`
    );
    const image = await loadImage(path);
    assert.equal(image.width, SHIP_SHEET_SIZE, `paddling frame ${frameIndex} width`);
    assert.equal(image.height, SHIP_SHEET_SIZE, `paddling frame ${frameIndex} height`);
    assert.ok(opaquePixelCount(image) > 0, `paddling frame ${frameIndex} is blank`);
    frameBuffers.push(await readFile(path));
  }
  assert.equal(new Set(frameBuffers.map((buffer) => buffer.toString("base64"))).size, 4);
});

test("standalone Asian warships preserve their scale below the longer Mediterranean galley", async () => {
  const dimensions = {};
  for (const slug of [
    MEDITERRANEAN_GALLEY_SLUG,
    JAPANESE_ATAKEBUNE_SLUG,
    JOSEON_PANOKSEON_SLUG,
    JOSEON_TURTLE_SHIP_SLUG
  ]) {
    const image = await loadImage(join(shipAssetRoot, `${slug}-16-headings.png`));
    dimensions[slug] = maxOpaqueFrameDimension(image);
  }

  assert.ok(dimensions[MEDITERRANEAN_GALLEY_SLUG] > dimensions[JAPANESE_ATAKEBUNE_SLUG]);
  assert.ok(dimensions[MEDITERRANEAN_GALLEY_SLUG] > dimensions[JOSEON_PANOKSEON_SLUG]);
  assert.ok(dimensions[JAPANESE_ATAKEBUNE_SLUG] > dimensions[JOSEON_TURTLE_SHIP_SLUG]);
});

function opaquePixelCount(image) {
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0);
  const pixels = ctx.getImageData(0, 0, image.width, image.height).data;
  let count = 0;
  for (let offset = 3; offset < pixels.length; offset += 4) {
    if (pixels[offset] > 0) count += 1;
  }
  return count;
}

function maxOpaqueFrameDimension(image) {
  assert.equal(image.width, SHIP_SHEET_SIZE);
  assert.equal(image.height, SHIP_SHEET_SIZE);
  const pixels = imagePixels(image);
  let maximum = 0;
  for (let frame = 0; frame < 16; frame++) {
    const originX = frame % SHIP_SPRITE_SHEET_COLS * SHIP_SPRITE_FRAME_SIZE;
    const originY = Math.floor(frame / SHIP_SPRITE_SHEET_COLS) * SHIP_SPRITE_FRAME_SIZE;
    let minX = SHIP_SPRITE_FRAME_SIZE;
    let minY = SHIP_SPRITE_FRAME_SIZE;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < SHIP_SPRITE_FRAME_SIZE; y++) {
      for (let x = 0; x < SHIP_SPRITE_FRAME_SIZE; x++) {
        const alpha = pixels[((originX + x) + (originY + y) * image.width) * 4 + 3];
        if (alpha === 0) continue;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
    assert.ok(maxX >= minX && maxY >= minY, `blank ship frame ${frame}`);
    maximum = Math.max(maximum, maxX - minX + 1, maxY - minY + 1);
  }
  return maximum;
}

async function assertSinkDepthPair(spritePath, sinkDepthPath, label) {
  const [sprite, sinkDepth] = await Promise.all([
    loadImage(join(shipAssetRoot, basename(spritePath))),
    loadImage(join(shipAssetRoot, basename(sinkDepthPath)))
  ]);
  assert.equal(sinkDepth.width, sprite.width, `${label} sink-depth width`);
  assert.equal(sinkDepth.height, sprite.height, `${label} sink-depth height`);
  const spritePixels = imagePixels(sprite);
  const sinkDepthPixels = imagePixels(sinkDepth);
  const levels = new Set();
  for (let offset = 0; offset < spritePixels.length; offset += 4) {
    assert.equal(
      sinkDepthPixels[offset + 3],
      spritePixels[offset + 3],
      `${label} sink-depth alpha at pixel ${offset / 4}`
    );
    if (spritePixels[offset + 3] === 0) continue;
    assert.equal(sinkDepthPixels[offset], sinkDepthPixels[offset + 1], `${label} sink-depth red/green`);
    assert.equal(sinkDepthPixels[offset], sinkDepthPixels[offset + 2], `${label} sink-depth red/blue`);
    levels.add(sinkDepthPixels[offset]);
  }
  assert.ok(levels.size >= 4, `${label} sink-depth bake has only ${levels.size} distinct levels`);
  for (let frame = 0; frame < SHIP_SPRITE_HEADINGS; frame++) {
    const originX = (frame % SHIP_SPRITE_SHEET_COLS) * SHIP_SPRITE_FRAME_SIZE;
    const originY = Math.floor(frame / SHIP_SPRITE_SHEET_COLS) * SHIP_SPRITE_FRAME_SIZE;
    let submerged = 0;
    let aboveWater = 0;
    for (let y = 0; y < SHIP_SPRITE_FRAME_SIZE; y++) {
      for (let x = 0; x < SHIP_SPRITE_FRAME_SIZE; x++) {
        const offset = ((originX + x) + (originY + y) * sinkDepth.width) * 4;
        if (sinkDepthPixels[offset + 3] === 0) continue;
        if (sinkDepthPixels[offset] <= SHIP_WATERLINE_DEPTH_BYTE) submerged++;
        else aboveWater++;
      }
    }
    assert.ok(submerged > 0, `${label} frame ${frame} has no submerged hull pixels`);
    assert.ok(aboveWater > 0, `${label} frame ${frame} has no above-water hull pixels`);
  }
}

function imagePixels(image) {
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0);
  return ctx.getImageData(0, 0, image.width, image.height).data;
}

function modelCreditKey({ creator, sourceTitle, license }) {
  return `${creator}\n${sourceTitle}\n${license}`;
}
