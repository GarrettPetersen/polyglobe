import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createCanvas, loadImage } from "../../../examples/globe-demo/node_modules/canvas/index.js";
import { RESURRECT_64_HEX } from "./waterLatitudePalette.js";

const assetRoot = join(dirname(fileURLToPath(import.meta.url)), "../public/assets/vehicles/horse-cart");
const FRAME_SIZE = 47;
const HEADING_COUNT = 32;
const SHEET_COLS = 8;

test("horse-cart bake provides six distinct hard-edged Resurrect walk frames", async () => {
  const manifest = JSON.parse(await readFile(join(assetRoot, "manifest.json"), "utf8"));
  assert.equal(manifest.frameSize, FRAME_SIZE);
  assert.equal(manifest.headings, HEADING_COUNT);
  assert.equal(manifest.animationFrames, 6);
  assert.equal(manifest.horse.creator, "Jungle Jim");
  assert.equal(manifest.cart.creator, "Filip");
  const palette = new Set(RESURRECT_64_HEX);
  const frameSignatures = new Set();

  for (let frameIndex = 0; frameIndex < manifest.animationFrames; frameIndex++) {
    const image = await loadImage(join(assetRoot, `horse-cart-walk-${frameIndex}-32-headings.png`));
    assert.equal(image.width, FRAME_SIZE * SHEET_COLS);
    assert.equal(image.height, FRAME_SIZE * Math.ceil(HEADING_COUNT / SHEET_COLS));
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0);
    const pixels = ctx.getImageData(0, 0, image.width, image.height).data;
    let opaquePixels = 0;
    for (let offset = 0; offset < pixels.length; offset += 4) {
      const alpha = pixels[offset + 3];
      assert.ok(alpha === 0 || alpha === 255, `walk ${frameIndex} has partial alpha ${alpha}`);
      if (alpha === 0) continue;
      const hex = [pixels[offset], pixels[offset + 1], pixels[offset + 2]]
        .map((value) => value.toString(16).padStart(2, "0"))
        .join("");
      assert.ok(palette.has(hex), `walk ${frameIndex} contains non-Resurrect color #${hex}`);
      opaquePixels++;
    }
    assert.ok(opaquePixels > 1000, `walk ${frameIndex} is blank`);
    frameSignatures.add(frameSignature(ctx.getImageData(0, 0, FRAME_SIZE, FRAME_SIZE).data));
  }
  assert.ok(frameSignatures.size >= 4, `only ${frameSignatures.size} distinct walk poses`);
});

function frameSignature(pixels) {
  let hash = 2166136261;
  for (let offset = 0; offset < pixels.length; offset += 4) {
    hash ^= pixels[offset + 3] === 0 ? 0 : (pixels[offset] << 16) ^ (pixels[offset + 1] << 8) ^ pixels[offset + 2];
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
