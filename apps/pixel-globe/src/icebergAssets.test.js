import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createCanvas, loadImage } from "../../../examples/globe-demo/node_modules/canvas/index.js";

import { ICEBERG_VARIANTS } from "./icebergSystem.js";
import { resolveShipCollision } from "./shipCollision.js";
import {
  shipFootprintFrame,
  translatedShipFootprint,
  validateShipFootprintFrames
} from "./shipFootprint.js";
import {
  SHIP_SPRITE_FRAME_SIZE,
  SHIP_SPRITE_HEADINGS,
  SHIP_SPRITE_SHEET_COLS
} from "./shipSpriteLayout.js";

const ASSET_ROOT = new URL("../public/assets/icebergs/", import.meta.url);
const MANIFEST = JSON.parse(readFileSync(new URL("manifest.json", ASSET_ROOT), "utf8"));

test("iceberg manifest supplies waterline and heading bakes for every physical size", () => {
  assert.equal(MANIFEST.frameSize, SHIP_SPRITE_FRAME_SIZE);
  assert.equal(MANIFEST.headings, SHIP_SPRITE_HEADINGS);
  assert.equal(MANIFEST.sheetCols, SHIP_SPRITE_SHEET_COLS);
  assert.deepEqual(
    MANIFEST.variants.map((variant) => variant.slug).sort(),
    ICEBERG_VARIANTS.map((variant) => variant.id).sort()
  );
  let previousTargetSize = 0;
  for (const variant of MANIFEST.variants) {
    assert.ok(variant.targetModelMaxDim > previousTargetSize);
    previousTargetSize = variant.targetModelMaxDim;
    validateShipFootprintFrames(variant.slug, variant.hullFootprints, SHIP_SPRITE_HEADINGS);
    for (const suffix of ["", "-sink-depth"]) {
      assert.equal(
        existsSync(new URL(`${variant.slug}-32-headings${suffix}.png`, ASSET_ROOT)),
        true,
        `Missing ${variant.slug}${suffix} sprite bake`
      );
    }
  }
});

test("every iceberg size has visible mass above and below its baked waterline", async () => {
  for (const variant of MANIFEST.variants) {
    const [sprite, sinkDepth] = await Promise.all([
      loadImage(fileURLToPath(new URL(`${variant.slug}-32-headings.png`, ASSET_ROOT))),
      loadImage(fileURLToPath(new URL(`${variant.slug}-32-headings-sink-depth.png`, ASSET_ROOT)))
    ]);
    const canvas = createCanvas(SHIP_SPRITE_FRAME_SIZE, SHIP_SPRITE_FRAME_SIZE);
    const context = canvas.getContext("2d");
    context.drawImage(
      sprite,
      0,
      0,
      SHIP_SPRITE_FRAME_SIZE,
      SHIP_SPRITE_FRAME_SIZE,
      0,
      0,
      SHIP_SPRITE_FRAME_SIZE,
      SHIP_SPRITE_FRAME_SIZE
    );
    const spriteData = context.getImageData(0, 0, canvas.width, canvas.height).data;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(
      sinkDepth,
      0,
      0,
      SHIP_SPRITE_FRAME_SIZE,
      SHIP_SPRITE_FRAME_SIZE,
      0,
      0,
      SHIP_SPRITE_FRAME_SIZE,
      SHIP_SPRITE_FRAME_SIZE
    );
    const depthData = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let abovePixels = 0;
    let submergedPixels = 0;
    for (let offset = 0; offset < spriteData.length; offset += 4) {
      assert.equal(spriteData[offset + 3], depthData[offset + 3]);
      if (spriteData[offset + 3] === 0) continue;
      if (depthData[offset] / 255 > variant.sinkWaterlineLevel) abovePixels++;
      else submergedPixels++;
    }
    assert.ok(abovePixels > 0, `${variant.slug} has no mass above water`);
    assert.ok(submergedPixels > 0, `${variant.slug} has no mass below water`);
  }
});

test("iceberg footprints use the shared ship collision solver", () => {
  const frames = validateShipFootprintFrames(
    "iceberg-large",
    MANIFEST.variants.find((variant) => variant.slug === "iceberg-large").hullFootprints,
    SHIP_SPRITE_HEADINGS
  );
  const frame = shipFootprintFrame(frames, { x: 1, y: 0 });
  const collision = resolveShipCollision({
    id: "test-ship",
    x: 0,
    y: 0,
    vx: 5,
    vy: 0,
    headingX: 1,
    headingY: 0,
    mass: 100,
    footprint: translatedShipFootprint(frame, 0, 0)
  }, {
    id: "test-iceberg",
    x: 4,
    y: 0,
    vx: 0,
    vy: 0,
    headingX: 1,
    headingY: 0,
    mass: 2100,
    footprint: translatedShipFootprint(frame, 4, 0)
  });
  assert.ok(collision);
  assert.ok(Math.hypot(collision.a.vx - 5, collision.a.vy) > 1, "The iceberg should deflect the vessel");
  assert.ok(Math.hypot(collision.b.vx, collision.b.vy) < 0.5, "The iceberg should barely move");
  assert.ok(Math.max(collision.a.damage, collision.b.damage) > 0);
});
