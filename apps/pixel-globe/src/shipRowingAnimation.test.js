import assert from "node:assert/strict";
import test from "node:test";

import {
  SHIP_ROWING_MODE_AHEAD,
  SHIP_ROWING_MODE_ASTERN,
  SHIP_ROWING_MODE_IDLE,
  SHIP_ROWING_MODE_PIVOT_PORT,
  SHIP_ROWING_MODE_PIVOT_STARBOARD,
  SHIP_ROWING_ANIMATION_SPECS,
  SHIP_ROWING_FRAME_COUNT,
  normalizeShipRowingMode,
  rowingBankStrokeDirection,
  shipRowingAnimationFrameIndex,
  shipRowingModeIsActive,
  shipRowingModeIsPivot,
  shipRowingModeThrustDirection,
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

test("reverse strokes mirror fore-and-aft sweep while preserving blade immersion", () => {
  for (let frame = 0; frame < SHIP_ROWING_FRAME_COUNT; frame++) {
    const ahead = rowingOarPose(frame);
    const astern = rowingOarPose(frame, { strokeDirection: -1 });
    assert.equal(astern.sweep, -ahead.sweep);
    assert.equal(astern.lift, ahead.lift);
  }
});

test("astern animation runs the ordinary rowing bake backwards", () => {
  assert.deepEqual(
    Array.from({ length: SHIP_ROWING_FRAME_COUNT }, (_, frame) => (
      shipRowingAnimationFrameIndex(frame, SHIP_ROWING_MODE_ASTERN)
    )),
    [0, 5, 4, 3, 2, 1]
  );
  assert.equal(shipRowingAnimationFrameIndex(7, SHIP_ROWING_MODE_AHEAD), 1);
});

test("rowing modes distinguish thrust and opposed-bank pivots", () => {
  assert.equal(shipRowingModeIsActive(SHIP_ROWING_MODE_IDLE), false);
  assert.equal(shipRowingModeIsActive(SHIP_ROWING_MODE_AHEAD), true);
  assert.equal(shipRowingModeIsPivot(SHIP_ROWING_MODE_PIVOT_PORT), true);
  assert.equal(shipRowingModeIsPivot(SHIP_ROWING_MODE_PIVOT_STARBOARD), true);
  assert.equal(shipRowingModeThrustDirection(SHIP_ROWING_MODE_AHEAD), 1);
  assert.equal(shipRowingModeThrustDirection(SHIP_ROWING_MODE_ASTERN), -1);
  assert.equal(shipRowingModeThrustDirection(SHIP_ROWING_MODE_PIVOT_PORT), 0);
  assert.throws(() => normalizeShipRowingMode("sideways"), /Unknown ship rowing mode/);
});

test("opposed oar banks rotate the bow in the commanded direction", () => {
  assert.equal(rowingBankStrokeDirection(SHIP_ROWING_MODE_PIVOT_STARBOARD, -1), 1);
  assert.equal(rowingBankStrokeDirection(SHIP_ROWING_MODE_PIVOT_STARBOARD, 1), -1);
  assert.equal(rowingBankStrokeDirection(SHIP_ROWING_MODE_PIVOT_PORT, -1), -1);
  assert.equal(rowingBankStrokeDirection(SHIP_ROWING_MODE_PIVOT_PORT, 1), 1);
  assert.throws(
    () => rowingBankStrokeDirection(SHIP_ROWING_MODE_ASTERN, 1),
    /cannot stroke/
  );
});

test("rowing poses reject malformed frame and scale inputs", () => {
  assert.throws(() => rowingOarPose(0.5), /integer/);
  assert.throws(() => rowingOarPose(0, { sweepScale: 0 }), /sweep scale/);
  assert.throws(() => rowingOarPose(0, { liftScale: Number.NaN }), /lift scale/);
  assert.throws(() => rowingOarPose(0, { strokeDirection: 0 }), /stroke direction/);
});
