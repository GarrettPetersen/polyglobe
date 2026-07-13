import assert from "node:assert/strict";
import test from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createCanvas, loadImage } from "../../../examples/globe-demo/node_modules/canvas/index.js";
const cityArtRoot = join(dirname(fileURLToPath(import.meta.url)), "../public/assets/buildings/city-types");

test("the shared village placeholder is a nonblank transparent 36px sprite", async () => {
  const image = await loadImage(join(cityArtRoot, "city-village.png"));
  assert.equal(image.width, 36);
  assert.equal(image.height, 36);
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0);
  const pixels = ctx.getImageData(0, 0, image.width, image.height).data;
  let opaquePixels = 0;
  let transparentPixels = 0;
  for (let offset = 0; offset < pixels.length; offset += 4) {
    if (pixels[offset + 3] === 0) transparentPixels += 1;
    else opaquePixels += 1;
  }
  assert.ok(opaquePixels > 0);
  assert.ok(transparentPixels > 0);
});
