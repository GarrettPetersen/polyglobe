import assert from "node:assert/strict";
import test from "node:test";

import { applyWhaleTowPull, whaleTowKinematics } from "./whaleTowPhysics.js";

const DISTANCE_RAD = 0.03;
const MAXIMUM_ROPE_LENGTH_RAD = 0.03;
const WHALE_SPEED_RAD = 0.01;
const SHIP_POSITION = [1, 0, 0];
const WHALE_POSITION = [Math.cos(DISTANCE_RAD), 0, Math.sin(DISTANCE_RAD)];
const AWAY_FROM_SHIP = [-Math.sin(DISTANCE_RAD), 0, Math.cos(DISTANCE_RAD)];
const TOWARD_SHIP = AWAY_FROM_SHIP.map((value) => -value);

function kinematics({
  shipVelocity = [0, 0, 0],
  whaleHeading = AWAY_FROM_SHIP,
  whalePosition = WHALE_POSITION,
  maximumRopeLengthRad = MAXIMUM_ROPE_LENGTH_RAD
} = {}) {
  return whaleTowKinematics({
    shipPosition: SHIP_POSITION,
    shipVelocity,
    whalePosition,
    whaleHeading,
    whaleSpeedRad: WHALE_SPEED_RAD,
    maximumRopeLengthRad,
    tautToleranceRad: 0.0001
  });
}

test("a taut harpoon line pulls the ship toward a whale moving away", () => {
  const tow = kinematics();
  const velocity = applyWhaleTowPull([0, 0, 0], tow, 0.5);

  assert.equal(tow.hasTension, true);
  assert.ok(Math.abs(tow.separationSpeedRad - WHALE_SPEED_RAD) < 1e-12);
  assert.ok(Math.abs(velocity[2] - WHALE_SPEED_RAD * 0.5) < 1e-12);
  assert.ok(Math.abs(velocity[0]) < 1e-12);
});

test("a harpoon line goes slack when the whale closes on the ship", () => {
  const tow = kinematics({ whaleHeading: TOWARD_SHIP });
  const velocity = applyWhaleTowPull([0, 0, 0], tow, 0.5);

  assert.equal(tow.hasTension, false);
  assert.ok(tow.separationSpeedRad < 0);
  assert.deepEqual(velocity, [0, 0, 0]);
});

test("spare line transmits no force even while the whale swims away", () => {
  const slackDistance = 0.02;
  const tow = kinematics({
    whalePosition: [Math.cos(slackDistance), 0, Math.sin(slackDistance)]
  });

  assert.equal(tow.hasTension, false);
  assert.ok(Math.abs(tow.spareLineRad - 0.01) < 1e-12);
  assert.deepEqual(applyWhaleTowPull([0, 0, 0], tow, 1), [0, 0, 0]);
});

test("tow tension preserves lateral ship velocity and never pushes away from the whale", () => {
  const shipVelocity = [0, 0.004, -0.002];
  const tow = kinematics({ shipVelocity });
  const velocity = applyWhaleTowPull(shipVelocity, tow, 0.25);

  assert.equal(tow.hasTension, true);
  assert.equal(velocity[1], shipVelocity[1]);
  assert.ok(velocity[2] > shipVelocity[2]);
});

test("a coincident whale leaves the fully slack line force-free", () => {
  const tow = kinematics({ whalePosition: SHIP_POSITION });

  assert.equal(tow.hasTension, false);
  assert.equal(tow.towardWhale, null);
  assert.deepEqual(applyWhaleTowPull([0.001, 0, 0], tow, 1), [0.001, 0, 0]);
});
