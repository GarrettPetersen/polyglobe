import assert from "node:assert/strict";
import test from "node:test";

import {
  SHIP_ROWING_ANIMATION_SPECS,
  SHIP_ROWING_FRAME_COUNT,
  rowingOarPose
} from "./shipRowingAnimation.js";
import { SHIP_PROPULSION_SAIL, SHIP_STATS } from "./shipStats.js";

test("every oar-capable hull has one runtime animation specification", () => {
  const expected = SHIP_STATS
    .filter((stats) => stats.propulsion !== SHIP_PROPULSION_SAIL)
    .map((stats) => stats.slug)
    .sort();
  assert.deepEqual([...SHIP_ROWING_ANIMATION_SPECS.keys()].sort(), expected);
  for (const slug of ["kelulus", "penjajap", "lancaran", "royal-lancaran"]) {
    assert.equal(SHIP_ROWING_ANIMATION_SPECS.get(slug).frames, SHIP_ROWING_FRAME_COUNT);
  }
});

test("the rowing cycle has six distinct exaggerated phases", () => {
  const poses = Array.from({ length: SHIP_ROWING_FRAME_COUNT }, (_, frame) => rowingOarPose(frame));
  assert.equal(SHIP_ROWING_FRAME_COUNT, 6);
  assert.equal(new Set(poses.map((pose) => `${pose.sweep},${pose.lift}`)).size, 6);
  assert.ok(Math.max(...poses.map((pose) => pose.sweep)) >= 0.45);
  assert.ok(Math.min(...poses.map((pose) => pose.sweep)) <= -0.45);
  assert.ok(Math.max(...poses.map((pose) => pose.lift)) >= 0.1);
  assert.ok(Math.min(...poses.map((pose) => pose.lift)) <= -0.1);
});

test("the submerged power stroke moves the blade aft and the raised recovery moves it forward", () => {
  const poses = Array.from({ length: SHIP_ROWING_FRAME_COUNT }, (_, frame) => rowingOarPose(frame));
  assert.ok(poses[3].sweep < poses[2].sweep, "submerged blade must sweep toward the stern");
  assert.ok(poses[0].sweep > poses[5].sweep, "raised blade must recover toward the bow");
  assert.ok(poses[2].lift < 0 && poses[3].lift < 0, "power stroke must stay submerged");
  assert.ok(poses[5].lift > 0 && poses[0].lift > 0, "recovery stroke must stay raised");
});

test("rowing poses loop and allow a smaller paddle-specific excursion", () => {
  assert.deepEqual(rowingOarPose(6), rowingOarPose(0));
  assert.deepEqual(rowingOarPose(-1), rowingOarPose(5));
  assert.deepEqual(rowingOarPose(2, { sweepScale: 0.3, liftScale: 0.04 }), {
    sweep: 0.054,
    lift: -0.036000000000000004
  });
});

test("rowing poses reject malformed frame and scale inputs", () => {
  assert.throws(() => rowingOarPose(0.5), /integer/);
  assert.throws(() => rowingOarPose(0, { sweepScale: 0 }), /sweep scale/);
  assert.throws(() => rowingOarPose(0, { liftScale: Number.NaN }), /lift scale/);
});
