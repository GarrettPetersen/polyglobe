import assert from "node:assert/strict";
import test from "node:test";

import {
  CITY_ANIMATION_PLAYBACK,
  cityAnimationFrame
} from "./cityAnimationFrame.js";

const FRAMES = Object.freeze([
  Object.freeze({ id: "standing", duration: 200 }),
  Object.freeze({ id: "falling", duration: 100 }),
  Object.freeze({ id: "fallen", duration: 400 })
]);

test("looping city animations wrap while one-shot deaths remain on the fallen frame", () => {
  assert.equal(cityAnimationFrame(FRAMES, 0).id, "standing");
  assert.equal(cityAnimationFrame(FRAMES, 700).id, "standing");
  assert.equal(cityAnimationFrame(FRAMES, 699, CITY_ANIMATION_PLAYBACK.ONCE).id, "fallen");
  assert.equal(cityAnimationFrame(FRAMES, 700, CITY_ANIMATION_PLAYBACK.ONCE).id, "fallen");
  assert.equal(cityAnimationFrame(FRAMES, 10_000, CITY_ANIMATION_PLAYBACK.ONCE).id, "fallen");
});

test("city animation frame selection rejects malformed playback contracts", () => {
  assert.throws(() => cityAnimationFrame([], 0), /at least one frame/);
  assert.throws(() => cityAnimationFrame(FRAMES, -1), /elapsed time/);
  assert.throws(() => cityAnimationFrame(FRAMES, 0, "reverse"), /playback/);
  assert.throws(() => cityAnimationFrame([{ duration: 0 }], 0), /frame duration/);
});
