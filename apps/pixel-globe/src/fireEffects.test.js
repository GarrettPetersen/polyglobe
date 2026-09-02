import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  createCanvas,
  loadImage
} from "../../../examples/globe-demo/node_modules/canvas/index.js";

import {
  FIRE_FRAME_COUNT,
  FIRE_FRAME_HEIGHT,
  FIRE_FRAME_MS,
  FIRE_FRAME_WIDTH,
  FIRE_RESURRECT_64_HEX,
  FIRE_SOUND_FAR_PX,
  FIRE_SOUND_NEAR_PX,
  FIRE_VARIANT_COUNT,
  FIRE_VARIANT_IDS,
  fireAnimationFrame,
  fireSoundPresence,
  fireVariantIndex
} from "./fireEffects.js";
import { RESURRECT_64_HEX } from "./waterLatitudePalette.js";

const APP_ROOT = new URL("..", import.meta.url);

test("fire animation cycles through every frame and supports stable staggering", () => {
  const frames = Array.from(
    { length: FIRE_FRAME_COUNT },
    (_, index) => fireAnimationFrame(index * FIRE_FRAME_MS, 0)
  );
  assert.deepEqual(frames, [0, 1, 2, 3, 4, 5, 6, 7]);
  assert.equal(fireAnimationFrame(0, 11), 7);
  assert.equal(fireAnimationFrame(FIRE_FRAME_MS, 11), 0);
  assert.equal(fireAnimationFrame(FIRE_FRAME_COUNT * FIRE_FRAME_MS, 0), 0);
});

test("fire crackle fades smoothly with distance", () => {
  assert.equal(fireSoundPresence(0), 1);
  assert.equal(fireSoundPresence(FIRE_SOUND_NEAR_PX), 1);
  assert.equal(fireSoundPresence(FIRE_SOUND_FAR_PX), 0);
  assert.ok(fireSoundPresence(60) > fireSoundPresence(120));
  assert.throws(() => fireSoundPresence(-1), /Invalid fire sound distance/);
});

test("burning cities select deterministically from every authored fire silhouette", () => {
  assert.equal(FIRE_VARIANT_COUNT, 20);
  assert.equal(new Set(FIRE_VARIANT_IDS).size, FIRE_VARIANT_COUNT);
  const selected = new Set();
  for (let seed = 0; seed < 10_000; seed += 1) selected.add(fireVariantIndex(seed));
  assert.deepEqual([...selected].sort((a, b) => a - b), [...FIRE_VARIANT_IDS.keys()]);
  assert.equal(fireVariantIndex(117), fireVariantIndex(117));
  assert.throws(() => fireVariantIndex(1.5), /variant seed/);
  assert.equal(
    FIRE_RESURRECT_64_HEX.every((hex) => RESURRECT_64_HEX.includes(hex)),
    true
  );
});

test("fire is composited after the evening and night palette grade", () => {
  const mainSource = readFileSync(new URL("src/main.js", APP_ROOT), "utf8");
  assert.match(
    mainSource,
    /worldRenderer\.endFrame\([\s\S]*?drawVisibleWorldFiresEmissive\(layers\.offset, nowMs\)/
  );
  assert.doesNotMatch(
    mainSource,
    /drawCitySpriteWebGL[\s\S]*?drawOnFireWebGL/
  );
});

test("the reusable fire assets have their exact production formats and Resurrect 64 colors", async () => {
  const fireSheet = readFileSync(new URL("public/assets/misc/fire.png", APP_ROOT));
  assert.equal(fireSheet.toString("ascii", 1, 4), "PNG");
  assert.equal(fireSheet.readUInt32BE(16), FIRE_FRAME_WIDTH * FIRE_FRAME_COUNT);
  assert.equal(fireSheet.readUInt32BE(20), FIRE_FRAME_HEIGHT * FIRE_VARIANT_COUNT);
  const fireImage = await loadImage(fireSheet);
  const fireCanvas = createCanvas(fireImage.width, fireImage.height);
  const fireContext = fireCanvas.getContext("2d");
  fireContext.drawImage(fireImage, 0, 0);
  const pixels = fireContext.getImageData(0, 0, fireImage.width, fireImage.height).data;
  const opaqueColors = new Set();
  const occupiedCells = new Set();
  for (let offset = 0; offset < pixels.length; offset += 4) {
    if (pixels[offset + 3] === 0) continue;
    assert.equal(pixels[offset + 3], 255, "fire pixels must have hard alpha");
    const pixelIndex = offset / 4;
    const x = pixelIndex % fireImage.width;
    const y = Math.floor(pixelIndex / fireImage.width);
    occupiedCells.add(
      `${Math.floor(y / FIRE_FRAME_HEIGHT)}:${Math.floor(x / FIRE_FRAME_WIDTH)}`
    );
    opaqueColors.add(
      [pixels[offset], pixels[offset + 1], pixels[offset + 2]]
        .map((channel) => channel.toString(16).padStart(2, "0"))
        .join("")
    );
  }
  assert.equal(occupiedCells.size, FIRE_VARIANT_COUNT * FIRE_FRAME_COUNT);
  assert.deepEqual([...opaqueColors].sort(), [...FIRE_RESURRECT_64_HEX].sort());

  const crackle = readFileSync(
    new URL("public/assets/sfx/three-kingdoms-stratagem-fire-crackle-loop.ogg", APP_ROOT)
  );
  assert.equal(crackle.toString("ascii", 0, 4), "OggS");

  const credits = readFileSync(new URL("public/assets/CREDITS.md", APP_ROOT), "utf8");
  assert.match(credits, /DevKidd - "Pixel Fire Asset Pack" \(itch\.io asset license\)/i);
  assert.doesNotMatch(credits, /Garrett Petersen - fire animation/i);
  assert.match(credits, /Three Kingdoms Stratagem - fire crackle loop/i);

  const fireLicense = readFileSync(
    new URL("public/assets/licenses/devkidd-pixel-fire-asset-pack.txt", APP_ROOT),
    "utf8"
  );
  assert.match(fireLicense, /https:\/\/devkidd\.itch\.io\/pixel-fire-asset-pack/);
});
