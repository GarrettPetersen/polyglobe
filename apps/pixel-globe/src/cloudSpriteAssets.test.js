import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { createCanvas, loadImage } from "../../../examples/globe-demo/node_modules/canvas/index.js";

import {
  CLOUD_MAX_ALPHA,
  CLOUD_SPRITE_FRAME_SIZE,
  CLOUD_SPRITE_SHEET_HEIGHT,
  CLOUD_SPRITE_SHEET_PATH,
  CLOUD_SPRITE_SHEET_WIDTH,
  CLOUD_SPRITE_VARIANT_COUNT,
  cloudLifecycleAlpha,
  cloudSpriteFrameIndex,
  cloudSpriteSourceRect
} from "./cloudSpriteAssets.js";
import { RESURRECT_64_HEX } from "./waterLatitudePalette.js";

test("the editable cloud sheet contains five nonblank 64px Resurrect sprites", async () => {
  const image = await loadImage(
    readFileSync(new URL(`../public/${CLOUD_SPRITE_SHEET_PATH}`, import.meta.url))
  );
  assert.equal(image.width, CLOUD_SPRITE_SHEET_WIDTH);
  assert.equal(image.height, CLOUD_SPRITE_SHEET_HEIGHT);
  const canvas = createCanvas(image.width, image.height);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, image.width, image.height).data;
  const palette = new Set(RESURRECT_64_HEX);

  for (let frameIndex = 0; frameIndex < CLOUD_SPRITE_VARIANT_COUNT; frameIndex++) {
    const frame = cloudSpriteSourceRect(frameIndex);
    let opaquePixels = 0;
    for (let y = frame.y; y < frame.y + frame.height; y++) {
      for (let x = frame.x; x < frame.x + frame.width; x++) {
        const offset = (x + y * image.width) * 4;
        const alpha = pixels[offset + 3];
        assert.ok(alpha === 0 || alpha === 255, `frame ${frameIndex}, ${x},${y}`);
        if (alpha === 0) continue;
        opaquePixels++;
        const hex = [pixels[offset], pixels[offset + 1], pixels[offset + 2]]
          .map((channel) => channel.toString(16).padStart(2, "0"))
          .join("");
        assert.equal(palette.has(hex), true, `frame ${frameIndex}: ${hex}`);
      }
    }
    assert.ok(opaquePixels > 0, `frame ${frameIndex}`);
  }
});

test("cloud frame selection wraps across all five variants", () => {
  assert.equal(cloudSpriteFrameIndex(0), 0);
  assert.equal(cloudSpriteFrameIndex(CLOUD_SPRITE_VARIANT_COUNT), 0);
  assert.equal(cloudSpriteFrameIndex(-1), CLOUD_SPRITE_VARIANT_COUNT - 1);
  assert.deepEqual(cloudSpriteSourceRect(2), {
    x: CLOUD_SPRITE_FRAME_SIZE * 2,
    y: 0,
    width: CLOUD_SPRITE_FRAME_SIZE,
    height: CLOUD_SPRITE_FRAME_SIZE
  });
  assert.throws(() => cloudSpriteFrameIndex(1.5), /integer/);
});

test("clouds fade without ever becoming fully opaque", () => {
  assert.ok(CLOUD_MAX_ALPHA <= 0.6, "clouds must leave terrain legible in darkness");
  assert.equal(cloudLifecycleAlpha(0), 0);
  assert.ok(cloudLifecycleAlpha(0.1) > 0);
  assert.ok(cloudLifecycleAlpha(0.1) < CLOUD_MAX_ALPHA);
  assert.equal(cloudLifecycleAlpha(0.22), CLOUD_MAX_ALPHA);
  assert.equal(cloudLifecycleAlpha(0.5), CLOUD_MAX_ALPHA);
  assert.equal(cloudLifecycleAlpha(0.78), CLOUD_MAX_ALPHA);
  assert.ok(cloudLifecycleAlpha(0.9) > 0);
  assert.ok(cloudLifecycleAlpha(0.9) < CLOUD_MAX_ALPHA);
  assert.equal(cloudLifecycleAlpha(1), 0);
  assert.throws(() => cloudLifecycleAlpha(NaN), /finite/);
});
