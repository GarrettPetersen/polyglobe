import assert from "node:assert/strict";
import test from "node:test";
import {
  SAILING_WIND_CONTEXT_DESERT,
  SAILING_WIND_CONTEXT_GENERAL,
  SAILING_WIND_CONTEXT_WINTER,
  createSailingAudioState,
  sailingStallFlapStrength,
  sailingStallWarningStrength,
  updateSailingAudioState
} from "./sailingAudio.js";

function input(overrides = {}) {
  return {
    dt: 1,
    paused: false,
    heading: [1, 0, 0],
    speedPx: 12,
    isRiver: false,
    windStrength: 0.9,
    windContext: SAILING_WIND_CONTEXT_GENERAL,
    angleFromWindRad: Math.PI / 2,
    stallAngleRad: Math.PI / 4,
    ...overrides
  };
}

test("only the wind loop matching the local climate is audible", () => {
  const contexts = [
    [SAILING_WIND_CONTEXT_GENERAL, "harshWind"],
    [SAILING_WIND_CONTEXT_WINTER, "winterWind"],
    [SAILING_WIND_CONTEXT_DESERT, "desertWind"]
  ];
  for (const [windContext, expectedKey] of contexts) {
    const targets = updateSailingAudioState(createSailingAudioState(), input({ windContext }));
    assert.ok(targets[expectedKey] > 0);
    for (const key of ["harshWind", "winterWind", "desertWind"]) {
      if (key !== expectedKey) assert.equal(targets[key], 0);
    }
  }
});

test("wind and stalled sail volume rise smoothly with current wind speed", () => {
  const calm = updateSailingAudioState(createSailingAudioState(), input({
    windStrength: 0.2,
    angleFromWindRad: Math.PI / 6
  }));
  const moderate = updateSailingAudioState(createSailingAudioState(), input({
    windStrength: 0.65,
    angleFromWindRad: Math.PI / 6
  }));
  const strong = updateSailingAudioState(createSailingAudioState(), input({
    windStrength: 1.1,
    angleFromWindRad: Math.PI / 6
  }));

  assert.equal(calm.harshWind, 0);
  assert.ok(calm.sailFlap > 0.8);
  assert.ok(moderate.harshWind > calm.harshWind);
  assert.ok(strong.harshWind > moderate.harshWind);
  assert.ok(moderate.sailFlap > calm.sailFlap);
  assert.equal(strong.sailFlap, moderate.sailFlap);
});

test("stalled sail remains prominent in a light wind", () => {
  const stalled = updateSailingAudioState(createSailingAudioState(), input({
    windStrength: 0.1,
    angleFromWindRad: Math.PI / 6
  }));

  assert.equal(stalled.harshWind, 0);
  assert.ok(stalled.sailFlap >= 0.82);
});

test("stall warning is full in the no-go angle and fades across the close-wind margin", () => {
  const stallAngle = Math.PI / 4;
  assert.equal(sailingStallWarningStrength(stallAngle - 0.1, stallAngle), 1);
  assert.ok(sailingStallWarningStrength(stallAngle + 0.15, stallAngle) > 0.4);
  assert.equal(sailingStallWarningStrength(stallAngle + Math.PI / 6, stallAngle), 0);
});

test("sail flapping is full inside the no-go angle and releases just outside it", () => {
  const state = createSailingAudioState();
  const stalled = updateSailingAudioState(state, input({ angleFromWindRad: Math.PI / 6 }));
  const justClear = updateSailingAudioState(state, input({ angleFromWindRad: Math.PI / 4 + 0.05 }));
  const reaching = updateSailingAudioState(state, input({ angleFromWindRad: Math.PI / 2 }));
  assert.equal(stalled.sailFlap, 1);
  assert.ok(justClear.sailFlap > 0);
  assert.ok(justClear.sailFlap < stalled.sailFlap);
  assert.equal(reaching.sailFlap, 0);
});

test("sail flapping uses each ship type's stall angle", () => {
  const courseAngle = 45 * Math.PI / 180;
  const closeWindedShip = sailingStallFlapStrength(courseAngle, 30 * Math.PI / 180);
  const squareRigger = sailingStallFlapStrength(courseAngle, 60 * Math.PI / 180);

  assert.equal(closeWindedShip, 0);
  assert.equal(squareRigger, 1);
});

test("underway ambience waits for sustained straight open-water sailing", () => {
  const state = createSailingAudioState();
  let targets;
  for (let second = 0; second < 3; second++) targets = updateSailingAudioState(state, input());
  assert.equal(targets.underway, 0);
  for (let second = 0; second < 9; second++) targets = updateSailingAudioState(state, input());
  assert.ok(targets.underway > 0.25);
  const cruisingVolume = targets.underway;

  targets = updateSailingAudioState(state, input({ heading: [0, 1, 0] }));
  assert.ok(targets.underway < cruisingVolume);
  targets = updateSailingAudioState(state, input({ heading: [0, 1, 0], isRiver: true }));
  assert.equal(targets.underway, 0);
});
