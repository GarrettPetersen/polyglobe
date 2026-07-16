import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  FIRE_FRAME_COUNT,
  FIRE_FRAME_HEIGHT,
  FIRE_FRAME_MS,
  FIRE_FRAME_WIDTH,
  FIRE_SOUND_FAR_PX,
  FIRE_SOUND_NEAR_PX,
  fireAnimationFrame,
  fireSoundPresence
} from "./fireEffects.js";

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

test("the reusable fire assets have their exact production formats", () => {
  const fireSheet = readFileSync(new URL("public/assets/misc/fire.png", APP_ROOT));
  assert.equal(fireSheet.toString("ascii", 1, 4), "PNG");
  assert.equal(fireSheet.readUInt32BE(16), FIRE_FRAME_WIDTH * FIRE_FRAME_COUNT);
  assert.equal(fireSheet.readUInt32BE(20), FIRE_FRAME_HEIGHT);

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
