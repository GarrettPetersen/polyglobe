import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createCanvas, loadImage } from "../../../examples/globe-demo/node_modules/canvas/index.js";
import { RESURRECT_64_HEX } from "./waterLatitudePalette.js";

const vehicleRoot = join(dirname(fileURLToPath(import.meta.url)), "../public/assets/vehicles");
const FRAME_SIZE = 47;
const HEADING_COUNT = 32;
const SHEET_COLS = 8;
const VEHICLES = Object.freeze([
  Object.freeze({
    slug: "horse-cart",
    colorGrade: { exposure: 2.2, lift: 6 },
    creditKey: "horse",
    creator: "Jungle Jim",
    maxDrawPixels: 31
  }),
  Object.freeze({
    slug: "llama-caravan",
    colorGrade: { exposure: 1.9, lift: 8 },
    creditKey: "llama",
    creator: "Romulogan",
    maxDrawPixels: 13
  })
]);

for (const spec of VEHICLES) {
  test(`${spec.slug} bake provides six distinct hard-edged Resurrect walk frames`, async () => {
    const assetRoot = join(vehicleRoot, spec.slug);
    const manifest = JSON.parse(await readFile(join(assetRoot, "manifest.json"), "utf8"));
    assert.equal(manifest.frameSize, FRAME_SIZE);
    assert.equal(manifest.headings, HEADING_COUNT);
    assert.equal(manifest.animationFrames, 6);
    assert.equal(manifest.maxDrawPixels, spec.maxDrawPixels);
    assert.deepEqual(manifest.colorGrade, spec.colorGrade);
    assert.deepEqual(manifest.lighting, {
      azimuthBins: 16,
      elevationBins: 2,
      shadowFrameSize: 95,
      selfShadowed: true,
      groundY: 0
    });
    assert.equal(manifest[spec.creditKey].creator, spec.creator);
    assert.equal(manifest.files.length, manifest.animationFrames * 4);
    assert.ok(manifest.reviewFiles.length >= manifest.animationFrames);
    const palette = new Set(RESURRECT_64_HEX);
    const frameSignatures = new Set();

    for (let frameIndex = 0; frameIndex < manifest.animationFrames; frameIndex++) {
      const prefix = `${spec.slug}-walk-${frameIndex}-32-headings`;
      const image = await loadImage(join(assetRoot, `${prefix}.png`));
      assert.equal(image.width, FRAME_SIZE * SHEET_COLS);
      assert.equal(image.height, FRAME_SIZE * Math.ceil(HEADING_COUNT / SHEET_COLS));
      const canvas = createCanvas(image.width, image.height);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(image, 0, 0);
      const pixels = ctx.getImageData(0, 0, image.width, image.height).data;
      let opaquePixels = 0;
      let darkestPixels = 0;
      let totalLuminance = 0;
      for (let offset = 0; offset < pixels.length; offset += 4) {
        const alpha = pixels[offset + 3];
        assert.ok(alpha === 0 || alpha === 255, `${prefix} has partial alpha ${alpha}`);
        if (alpha === 0) continue;
        const hex = [pixels[offset], pixels[offset + 1], pixels[offset + 2]]
          .map((value) => value.toString(16).padStart(2, "0"))
          .join("");
        assert.ok(palette.has(hex), `${prefix} contains non-Resurrect color #${hex}`);
        if (hex === "2e222f") darkestPixels++;
        totalLuminance += pixels[offset] * 0.2126 + pixels[offset + 1] * 0.7152 + pixels[offset + 2] * 0.0722;
        opaquePixels++;
      }
      assert.ok(opaquePixels > 500, `${prefix} is blank`);
      assert.ok(totalLuminance / opaquePixels >= 60, `${prefix} is too dark`);
      assert.ok(darkestPixels / opaquePixels <= 0.4, `${prefix} collapses into its darkest color`);
      frameSignatures.add(frameSignature(ctx.getImageData(0, 0, FRAME_SIZE, FRAME_SIZE).data));

      await assertPackedLightingMask(assetRoot, prefix, "light", FRAME_SIZE);
      await assertPackedLightingMask(assetRoot, prefix, "shade", FRAME_SIZE);
      await assertPackedLightingMask(assetRoot, prefix, "shadow", manifest.lighting.shadowFrameSize);
    }
    assert.ok(frameSignatures.size >= 4, `only ${frameSignatures.size} distinct ${spec.slug} walk poses`);
  });
}

async function assertPackedLightingMask(assetRoot, prefix, kind, frameSize) {
  const image = await loadImage(join(assetRoot, `${prefix}-${kind}.png`));
  assert.equal(image.width, frameSize * SHEET_COLS);
  assert.equal(image.height, frameSize * Math.ceil(HEADING_COUNT / SHEET_COLS) * 2);
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0);
  const pixels = ctx.getImageData(0, 0, image.width, image.height).data;
  let packedPixels = 0;
  for (let offset = 0; offset < pixels.length; offset += 4) {
    const alpha = pixels[offset + 3];
    assert.ok(alpha === 0 || alpha === 255, `${prefix} ${kind} has partial alpha ${alpha}`);
    if (alpha === 0) continue;
    assert.ok(pixels[offset] !== 0 || pixels[offset + 1] !== 0, `${prefix} ${kind} has an empty bit field`);
    assert.equal(pixels[offset + 2], 0, `${prefix} ${kind} uses its reserved blue channel`);
    packedPixels++;
  }
  assert.ok(packedPixels > 0, `${prefix} ${kind} is blank`);
}

function frameSignature(pixels) {
  let hash = 2166136261;
  for (let offset = 0; offset < pixels.length; offset += 4) {
    hash ^= pixels[offset + 3] === 0 ? 0 : (pixels[offset] << 16) ^ (pixels[offset + 1] << 8) ^ pixels[offset + 2];
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
