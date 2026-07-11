import test from "node:test";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createCanvas, loadImage } from "../../../examples/globe-demo/node_modules/canvas/index.js";
import { WORLD_DISCOVERY_SPRITE_KEYS } from "./discoveries.js";
import { RESURRECT_64_HEX } from "./waterLatitudePalette.js";

const terrainRoot = join(dirname(fileURLToPath(import.meta.url)), "../public/assets/terrain/resurrect-64");

test("every visual world discovery has a 36px Resurrect sprite", async () => {
  const palette = new Set(RESURRECT_64_HEX);
  for (const spriteKey of WORLD_DISCOVERY_SPRITE_KEYS) {
    const image = await loadImage(join(terrainRoot, `${spriteKey}.png`));
    assert.equal(image.width, 36, `${spriteKey} width`);
    assert.equal(image.height, 36, `${spriteKey} height`);
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0);
    const pixels = ctx.getImageData(0, 0, image.width, image.height).data;
    let opaquePixels = 0;
    for (let offset = 0; offset < pixels.length; offset += 4) {
      if (pixels[offset + 3] === 0) continue;
      const hex = [pixels[offset], pixels[offset + 1], pixels[offset + 2]]
        .map((value) => value.toString(16).padStart(2, "0"))
        .join("");
      assert.ok(palette.has(hex), `${spriteKey} contains non-Resurrect color #${hex}`);
      opaquePixels += 1;
    }
    assert.ok(opaquePixels > 0, `${spriteKey} is blank`);
  }
});
