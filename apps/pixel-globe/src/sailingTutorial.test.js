import assert from "node:assert/strict";
import test from "node:test";

import {
  STALL_TUTORIAL_TRIGGER_SECONDS,
  createSailingTutorialState,
  updateSailingTutorialState
} from "./sailingTutorial.js";

function update(state, overrides = {}) {
  return updateSailingTutorialState(state, {
    dt: 1,
    alreadyShown: false,
    eligible: true,
    activelySteering: true,
    stalled: true,
    ...overrides
  });
}

test("the tacking tutorial appears after sustained active stalling", () => {
  const state = createSailingTutorialState();
  for (let second = 1; second < STALL_TUTORIAL_TRIGGER_SECONDS; second++) {
    assert.equal(update(state), false);
  }
  assert.equal(update(state), true);
});

test("the stall timer resets when the player turns clear or stops steering", () => {
  const state = createSailingTutorialState();
  update(state);
  update(state);
  assert.equal(update(state, { stalled: false }), false);
  assert.equal(state.activeStallSeconds, 0);
  update(state);
  assert.equal(update(state, { activelySteering: false }), false);
  assert.equal(state.activeStallSeconds, 0);
});

test("the tacking tutorial stays quiet once it has been shown", () => {
  const state = createSailingTutorialState();
  for (let second = 0; second < STALL_TUTORIAL_TRIGGER_SECONDS + 2; second++) {
    assert.equal(update(state, { alreadyShown: true }), false);
  }
  assert.equal(state.activeStallSeconds, 0);
});
