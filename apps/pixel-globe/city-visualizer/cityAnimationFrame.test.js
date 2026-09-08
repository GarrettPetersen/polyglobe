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

test("reload clips stretch to the mechanical duration and finish without looping", () => {
  const frames = [{ duration: 100 }, { duration: 200 }, { duration: 100 }];
  const options = { durationMs: 6000 };
  assert.equal(cityAnimationFrame(frames, 0, CITY_ANIMATION_PLAYBACK.ONCE, options), frames[0]);
  assert.equal(cityAnimationFrame(frames, 3000, CITY_ANIMATION_PLAYBACK.ONCE, options), frames[1]);
  assert.equal(cityAnimationFrame(frames, 6000, CITY_ANIMATION_PLAYBACK.ONCE, options), frames[2]);
  assert.throws(() => cityAnimationFrame(frames, 0, CITY_ANIMATION_PLAYBACK.ONCE, { durationMs: 0 }), /duration/);
});
