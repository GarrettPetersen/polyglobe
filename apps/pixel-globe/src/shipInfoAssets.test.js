import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createCanvas, loadImage } from "../../../examples/globe-demo/node_modules/canvas/index.js";
import { MODEL_CREDITS } from "./modelCredits.js";
import {
  SHIP_PROPULSION_OAR,
  SHIP_PROPULSION_OAR_SAIL,
  SHIP_STATS
} from "./shipStats.js";
import { RESURRECT_64_HEX } from "./waterLatitudePalette.js";

const SIDE_VIEW_WIDTH = 192;
const SIDE_VIEW_HEIGHT = 104;
const sideViewRoot = join(dirname(fileURLToPath(import.meta.url)), "../public/assets/vehicles/unity-ships/side-views");
const shipAssetRoot = dirname(sideViewRoot);
const NATIVE_BOAT_SLUGS = Object.freeze([
  "polynesian-voyaging-canoe",
  "mesoamerican-dugout-canoe"
]);
const MEDITERRANEAN_GALLEY_SLUG = "mediterranean-galley";
const MESOAMERICAN_CANOE_SLUG = "mesoamerican-dugout-canoe";

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
    ["", 144, 144],
    ["-light", 144, 288],
    ["-shade", 144, 288],
    ["-shadow", 288, 576]
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
    assert.equal(image.width, 144, `rowing frame ${frameIndex} width`);
    assert.equal(image.height, 144, `rowing frame ${frameIndex} height`);
    assert.ok(opaquePixelCount(image) > 0, `rowing frame ${frameIndex} is blank`);
  }
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
    assert.equal(image.width, 144, `paddling frame ${frameIndex} width`);
    assert.equal(image.height, 144, `paddling frame ${frameIndex} height`);
    assert.ok(opaquePixelCount(image) > 0, `paddling frame ${frameIndex} is blank`);
    frameBuffers.push(await readFile(path));
  }
  assert.equal(new Set(frameBuffers.map((buffer) => buffer.toString("base64"))).size, 4);
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

function modelCreditKey({ creator, sourceTitle, license }) {
  return `${creator}\n${sourceTitle}\n${license}`;
}
