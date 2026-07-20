import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createCanvas, loadImage } from "../../../examples/globe-demo/node_modules/canvas/index.js";
import { RESURRECT_64_HEX } from "./waterLatitudePalette.js";

const miscRoot = join(dirname(fileURLToPath(import.meta.url)), "../public/assets/misc");

test("survival meter icons are nonblank 6px Resurrect sprites", async () => {
  const palette = new Set(RESURRECT_64_HEX);
  for (const name of ["water", "food", "fish", "wine"]) {
    const image = await loadImage(join(miscRoot, `${name}.png`));
    assert.equal(image.width, 6, `${name} width`);
    assert.equal(image.height, 6, `${name} height`);

    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0);
    const pixels = ctx.getImageData(0, 0, image.width, image.height).data;
    let opaquePixels = 0;
    for (let offset = 0; offset < pixels.length; offset += 4) {
      const alpha = pixels[offset + 3];
      assert.ok(alpha === 0 || alpha === 255, `${name} has partially transparent pixels`);
      if (alpha === 0) continue;
      const hex = [pixels[offset], pixels[offset + 1], pixels[offset + 2]]
        .map((value) => value.toString(16).padStart(2, "0"))
        .join("");
      assert.ok(palette.has(hex), `${name} contains non-Resurrect color #${hex}`);
      opaquePixels += 1;
    }
    assert.ok(opaquePixels > 0, `${name} is blank`);
  }
});

test("cargo crates provide nonblank filled and empty 6px Resurrect frames", async () => {
  const palette = new Set(RESURRECT_64_HEX);
  const image = await loadImage(join(miscRoot, "crate-Sheet.png"));
  assert.equal(image.width, 12);
  assert.equal(image.height, 6);

  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0);
  const pixels = ctx.getImageData(0, 0, image.width, image.height).data;
  const opaqueByFrame = [0, 0];
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      const offset = (y * image.width + x) * 4;
      const alpha = pixels[offset + 3];
      assert.ok(alpha === 0 || alpha === 255, `crate sheet has partial alpha at ${x},${y}`);
      if (alpha === 0) continue;
      const hex = [pixels[offset], pixels[offset + 1], pixels[offset + 2]]
        .map((value) => value.toString(16).padStart(2, "0"))
        .join("");
      assert.ok(palette.has(hex), `crate sheet contains non-Resurrect color #${hex}`);
      opaqueByFrame[Math.floor(x / 6)] += 1;
    }
  }
  assert.ok(opaqueByFrame.every((count) => count > 0), `blank crate frame: ${opaqueByFrame}`);
});
