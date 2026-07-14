import assert from "node:assert/strict";
import test from "node:test";

import { SHIP_ROWING_FRAME_COUNT, rowingOarPose } from "./shipRowingAnimation.js";

test("the rowing cycle has six distinct exaggerated phases", () => {
  const poses = Array.from({ length: SHIP_ROWING_FRAME_COUNT }, (_, frame) => rowingOarPose(frame));
  assert.equal(SHIP_ROWING_FRAME_COUNT, 6);
  assert.equal(new Set(poses.map((pose) => `${pose.sweep},${pose.lift}`)).size, 6);
  assert.ok(Math.max(...poses.map((pose) => pose.sweep)) >= 0.45);
  assert.ok(Math.min(...poses.map((pose) => pose.sweep)) <= -0.45);
  assert.ok(Math.max(...poses.map((pose) => pose.lift)) >= 0.1);
  assert.ok(Math.min(...poses.map((pose) => pose.lift)) <= -0.1);
});

test("rowing poses loop and allow a smaller paddle-specific excursion", () => {
  assert.deepEqual(rowingOarPose(6), rowingOarPose(0));
  assert.deepEqual(rowingOarPose(-1), rowingOarPose(5));
  assert.deepEqual(rowingOarPose(2, { sweepScale: 0.3, liftScale: 0.04 }), {
    sweep: -0.054,
    lift: -0.036000000000000004
  });
});

test("rowing poses reject malformed frame and scale inputs", () => {
  assert.throws(() => rowingOarPose(0.5), /integer/);
  assert.throws(() => rowingOarPose(0, { sweepScale: 0 }), /sweep scale/);
  assert.throws(() => rowingOarPose(0, { liftScale: Number.NaN }), /lift scale/);
});
