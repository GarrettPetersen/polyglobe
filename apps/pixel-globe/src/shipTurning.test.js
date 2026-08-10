import assert from "node:assert/strict";
import test from "node:test";

import {
  SHIP_TURN_MOMENTUM_FOLLOW_RATIO,
  contactPushOffVelocity,
  oarPivotTurnRate,
  shipDirectionMakesForwardProgress,
  shipTurnRate,
  steerShipMomentumThroughTurn,
  updateBoundaryContactLatch
} from "./shipTurning.js";

test("open-water rudder authority scales with speed above a small stall-recovery floor", () => {
  const stats = { turnRateRad: 2.4, topSpeedRad: 0.04 };
  assert.equal(shipTurnRate({ ...stats, speedRad: 0 }), 0.6);
  assert.equal(shipTurnRate({ ...stats, speedRad: 0.005 }), 0.6);
  assert.equal(shipTurnRate({ ...stats, speedRad: 0.02 }), 1.2);
  assert.equal(shipTurnRate({ ...stats, speedRad: 0.08 }), 2.4);
});

test("bank contact remains latched until the ship has actually moved clear", () => {
  const normal = [1, 0, 0];
  const collided = updateBoundaryContactLatch({
    latchedContact: null,
    probedContact: null,
    collisionNormal: normal,
    collided: true,
    movedPx: 0,
    releaseDistancePx: 6
  });
  assert.deepEqual(collided, { normal, clearTravelPx: 0 });

  const stillLatched = updateBoundaryContactLatch({
    latchedContact: collided,
    probedContact: null,
    collisionNormal: null,
    collided: false,
    movedPx: 2,
    releaseDistancePx: 6
  });
  assert.deepEqual(stillLatched, { normal, clearTravelPx: 2 });

  assert.equal(updateBoundaryContactLatch({
    latchedContact: stillLatched,
    probedContact: null,
    collisionNormal: null,
    collided: false,
    movedPx: 4,
    releaseDistancePx: 6
  }), null);
});

test("a fresh boundary probe refreshes a latched contact", () => {
  const probed = { normal: [0, 1, 0], clearTravelPx: 0 };
  assert.deepEqual(updateBoundaryContactLatch({
    latchedContact: { normal: [1, 0, 0], clearTravelPx: 5 },
    probedContact: probed,
    collisionNormal: null,
    collided: false,
    movedPx: 1,
    releaseDistancePx: 6
  }), probed);
});

test("minimum rudder authority can be configured without exceeding full authority", () => {
  assert.equal(shipTurnRate({
    turnRateRad: 2,
    speedRad: 0,
    topSpeedRad: 0.04,
    minimumRudderAuthority: 0.2
  }), 0.4);
  assert.throws(() => shipTurnRate({
    turnRateRad: 2,
    speedRad: 0,
    topSpeedRad: 0.04,
    minimumRudderAuthority: 1.1
  }), /between zero and one/);
});

test("bank contact permits a full assisted pivot without steerageway", () => {
  assert.equal(shipTurnRate({
    turnRateRad: 2,
    speedRad: 0,
    topSpeedRad: 0.04,
    assistedPivot: true,
    assistedMultiplier: 2.4
  }), 4.8);
});

test("opposed oar banks pivot small craft faster than heavy galleasses", () => {
  const rowboat = oarPivotTurnRate({ turnRateRad: 3.8, mass: 30, rowerRatio: 1 });
  const galley = oarPivotTurnRate({ turnRateRad: 2.55, mass: 210, rowerRatio: 1 });
  const galleass = oarPivotTurnRate({ turnRateRad: 1.65, mass: 420, rowerRatio: 1 });
  assert.ok(rowboat > galley);
  assert.ok(galley > galleass);
  assert.ok(galleass > 0);
  assert.equal(oarPivotTurnRate({ turnRateRad: 2, mass: 90, rowerRatio: 0 }), 0);
});

test("a moving ship bends its momentum through a turn without hitting an invisible wall", () => {
  const turn = 20 * Math.PI / 180;
  const velocity = [0.01, 0, 0];
  const steered = steerShipMomentumThroughTurn({
    velocity,
    previousHeading: [1, 0, 0],
    nextHeading: [Math.cos(turn), Math.sin(turn), 0],
    surfaceNormal: [0, 0, 1]
  });
  const velocityTurn = Math.atan2(steered[1], steered[0]);

  assert.ok(Math.abs(Math.hypot(...steered) - Math.hypot(...velocity)) < 1e-12);
  assert.ok(velocityTurn > 0);
  assert.ok(velocityTurn < turn);
  assert.ok(Math.abs(velocityTurn - turn * SHIP_TURN_MOMENTUM_FOLLOW_RATIO) < 1e-12);
});

test("an oar pivot can rotate the hull without manufacturing momentum", () => {
  const velocity = [0.004, 0, 0];
  assert.deepEqual(steerShipMomentumThroughTurn({
    velocity,
    previousHeading: [1, 0, 0],
    nextHeading: [0, 1, 0],
    surfaceNormal: [0, 0, 1],
    followRatio: 0
  }), velocity);
  assert.deepEqual(steerShipMomentumThroughTurn({
    velocity: [0, 0, 0],
    previousHeading: [1, 0, 0],
    nextHeading: [0, 1, 0],
    surfaceNormal: [0, 0, 1]
  }), [0, 0, 0]);
});

test("pushing away from a bank removes bankward momentum and guarantees escape speed", () => {
  assert.deepEqual(contactPushOffVelocity({
    velocity: [0.003, 0.001, 0],
    desiredDirection: [-1, 0, 0],
    obstacleNormal: [1, 0, 0],
    minimumEscapeSpeedRad: 0.0015
  }), [-0.0015, 0.001, 0]);
});

test("bank contact does not help input aimed into or along the bank", () => {
  const velocity = [0.001, 0.002, 0];
  assert.deepEqual(contactPushOffVelocity({
    velocity,
    desiredDirection: [0, 1, 0],
    obstacleNormal: [1, 0, 0],
    minimumEscapeSpeedRad: 0.0015
  }), velocity);
  assert.deepEqual(contactPushOffVelocity({
    velocity,
    desiredDirection: [1, 0, 0],
    obstacleNormal: [1, 0, 0],
    minimumEscapeSpeedRad: 0.0015
  }), velocity);
});

test("shoreline fallbacks keep making progress in the steered direction", () => {
  const desiredDirection = [1, 0, 0];
  assert.equal(shipDirectionMakesForwardProgress({
    direction: [0.08, Math.sqrt(1 - 0.08 ** 2), 0],
    desiredDirection
  }), true);
  assert.equal(shipDirectionMakesForwardProgress({
    direction: [-0.08, Math.sqrt(1 - 0.08 ** 2), 0],
    desiredDirection
  }), false);
  assert.equal(shipDirectionMakesForwardProgress({
    direction: [-1, 0, 0],
    desiredDirection
  }), false);
});

test("turning helpers reject invalid motion data", () => {
  assert.throws(() => shipTurnRate({ turnRateRad: 2, speedRad: -1, topSpeedRad: 0.04 }), /non-negative/);
  assert.throws(() => contactPushOffVelocity({
    velocity: [0, 0, 0],
    desiredDirection: [2, 0, 0],
    obstacleNormal: [1, 0, 0],
    minimumEscapeSpeedRad: 0.001
  }), /normalized/);
  assert.throws(() => steerShipMomentumThroughTurn({
    velocity: [0.01, 0, 0],
    previousHeading: [1, 0, 0],
    nextHeading: [0, 1, 0],
    surfaceNormal: [0, 0, 1],
    followRatio: 1.1
  }), /between zero and one/);
});
