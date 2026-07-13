import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createCanvas, loadImage } from "../../../examples/globe-demo/node_modules/canvas/index.js";
import { SHIP_STATS } from "./shipStats.js";
import { RESURRECT_64_HEX } from "./waterLatitudePalette.js";

const SIDE_VIEW_WIDTH = 192;
const SIDE_VIEW_HEIGHT = 104;
const sideViewRoot = join(dirname(fileURLToPath(import.meta.url)), "../public/assets/vehicles/unity-ships/side-views");
const shipAssetRoot = dirname(sideViewRoot);
const NATIVE_BOAT_SLUGS = Object.freeze([
  "polynesian-voyaging-canoe",
  "mesoamerican-dugout-canoe"
]);

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
