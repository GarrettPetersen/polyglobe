import assert from "node:assert/strict";
import test from "node:test";

import {
  FISH_SCHOOL_ANIMATION_FRAME_COUNT,
  FISH_SCHOOL_ANIMATION_FRAME_MS,
  FISH_SCHOOL_MAX_FISH,
  fishSchoolAnimationFrame,
  fishSchoolAnimationTick,
  fishSchoolAnimationTime,
  fishSchoolFishOffset
} from "./fishSchoolAnimation.js";

test("fish schools render a twelve-frame pixel animation at eight frames per second", () => {
  assert.equal(FISH_SCHOOL_ANIMATION_FRAME_COUNT, 12);
  assert.equal(FISH_SCHOOL_ANIMATION_FRAME_MS, 125);
  assert.equal(
    FISH_SCHOOL_ANIMATION_FRAME_COUNT * FISH_SCHOOL_ANIMATION_FRAME_MS,
    1500
  );
});

test("fish school animation clock advances on exact frame boundaries", () => {
  assert.equal(fishSchoolAnimationTick(124.99), 0);
  assert.equal(fishSchoolAnimationTick(125), 1);
  assert.equal(fishSchoolAnimationTime(374.99), 250);
  assert.equal(fishSchoolAnimationTime(375), 375);
  assert.equal(fishSchoolAnimationFrame(1500), 0);
  assert.equal(fishSchoolAnimationFrame(0, 11), 11);
});

test("every school frame has a distinct phase-staggered arrangement", () => {
  const signatures = new Set();
  for (let frame = 0; frame < FISH_SCHOOL_ANIMATION_FRAME_COUNT; frame++) {
    const offsets = [];
    for (let fishIndex = 0; fishIndex < FISH_SCHOOL_MAX_FISH; fishIndex++) {
      offsets.push(fishSchoolFishOffset(frame, fishIndex));
    }
    signatures.add(JSON.stringify(offsets));
  }
  assert.equal(signatures.size, FISH_SCHOOL_ANIMATION_FRAME_COUNT);
});

test("fish move continuously by no more than one hard-edged pixel per frame", () => {
  for (let fishIndex = 0; fishIndex < FISH_SCHOOL_MAX_FISH; fishIndex++) {
    for (let frame = 0; frame < FISH_SCHOOL_ANIMATION_FRAME_COUNT; frame++) {
      const current = fishSchoolFishOffset(frame, fishIndex);
      const next = fishSchoolFishOffset(
        (frame + 1) % FISH_SCHOOL_ANIMATION_FRAME_COUNT,
        fishIndex
      );
      assert.ok(Number.isInteger(current.x));
      assert.ok(Number.isInteger(current.y));
      assert.ok(Math.abs(next.x - current.x) <= 1);
      assert.ok(Math.abs(next.y - current.y) <= 1);
      assert.ok(current.x >= 0 && current.x <= 2);
      assert.ok(current.y >= 0 && current.y <= 2);
    }
  }
});

test("fish school animation rejects invalid time, phases, frames, and fish indices", () => {
  assert.throws(() => fishSchoolAnimationTick(Number.NaN), /invalid time/);
  assert.throws(() => fishSchoolAnimationFrame(0, 0.5), /invalid phase/);
  assert.throws(
    () => fishSchoolFishOffset(FISH_SCHOOL_ANIMATION_FRAME_COUNT, 0),
    /invalid frame/
  );
  assert.throws(
    () => fishSchoolFishOffset(0, FISH_SCHOOL_MAX_FISH),
    /invalid fish index/
  );
});
