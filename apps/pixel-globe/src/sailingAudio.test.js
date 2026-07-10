import assert from "node:assert/strict";
import test from "node:test";
import {
  SAILING_WIND_CONTEXT_DESERT,
  SAILING_WIND_CONTEXT_GENERAL,
  SAILING_WIND_CONTEXT_WINTER,
  createSailingAudioState,
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

test("wind and flag volume rise smoothly with current wind speed", () => {
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
  assert.ok(calm.flag > 0.5);
  assert.ok(moderate.harshWind > calm.harshWind);
  assert.ok(strong.harshWind > moderate.harshWind);
  assert.ok(moderate.flag > calm.flag);
  assert.equal(strong.flag, moderate.flag);
});

test("flag remains audible in a light wind that still stalls the ship", () => {
  const stalled = updateSailingAudioState(createSailingAudioState(), input({
    windStrength: 0.1,
    angleFromWindRad: Math.PI / 6
  }));

  assert.equal(stalled.harshWind, 0);
  assert.ok(stalled.flag >= 0.55);
});

test("flag flutter is strongest inside the no-go angle", () => {
  const state = createSailingAudioState();
  const stalled = updateSailingAudioState(state, input({ angleFromWindRad: Math.PI / 6 }));
  const reaching = updateSailingAudioState(state, input({ angleFromWindRad: Math.PI / 2 }));
  assert.ok(stalled.flag > 0.5);
  assert.equal(reaching.flag, 0);
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
