import assert from "node:assert/strict";
import test from "node:test";

import {
  EARLY_SAILING_HELP_TRIGGER_SECONDS,
  EARLY_SAILING_HELP_WINDOW_SECONDS,
  STALL_TUTORIAL_TRIGGER_SECONDS,
  createSailingTutorialState,
  earlySailingHelpWindowIsActive,
  sailingHelpPages,
  updateEarlySailingHelpState,
  updateSailingTutorialState
} from "./sailingTutorial.js";

function update(state, overrides = {}) {
  return updateSailingTutorialState(state, {
    dt: 1,
    alreadyShown: false,
    eligible: true,
    stalled: true,
    ...overrides
  });
}

function updateEarly(state, overrides = {}) {
  return updateEarlySailingHelpState(state, {
    dt: 1,
    movedPx: 0,
    alreadyShown: false,
    eligible: true,
    ...overrides
  });
}

test("the tacking tutorial appears after a sustained stall", () => {
  const state = createSailingTutorialState();
  for (let second = 1; second < STALL_TUTORIAL_TRIGGER_SECONDS; second++) {
    assert.equal(update(state), false);
  }
  assert.equal(update(state), true);
});

test("the stall timer keeps counting after steering is released", () => {
  const state = createSailingTutorialState();
  update(state);
  update(state);
  assert.equal(update(state, { activelySteering: false }), false);
  assert.equal(state.activeStallSeconds, 3);
  assert.equal(update(state, { activelySteering: false }), false);
  assert.equal(update(state, { activelySteering: false }), true);
});

test("the stall timer resets when the player turns clear or becomes ineligible", () => {
  const state = createSailingTutorialState();
  update(state);
  update(state);
  assert.equal(update(state, { stalled: false }), false);
  assert.equal(state.activeStallSeconds, 0);
  update(state);
  assert.equal(update(state, { eligible: false }), false);
  assert.equal(state.activeStallSeconds, 0);
});

test("the tacking tutorial stays quiet once it has been shown", () => {
  const state = createSailingTutorialState();
  for (let second = 0; second < STALL_TUTORIAL_TRIGGER_SECONDS + 2; second++) {
    assert.equal(update(state, { alreadyShown: true }), false);
  }
  assert.equal(state.activeStallSeconds, 0);
});

test("early sailing help appears after ten continuous seconds with little movement", () => {
  const state = createSailingTutorialState();
  for (let second = 1; second < EARLY_SAILING_HELP_TRIGGER_SECONDS; second++) {
    assert.equal(updateEarly(state), false);
  }
  assert.equal(updateEarly(state), true);
  assert.equal(state.earlyWindowSeconds, EARLY_SAILING_HELP_TRIGGER_SECONDS);
});

test("meaningful movement resets the early stuck timer", () => {
  const state = createSailingTutorialState();
  for (let second = 0; second < 6; second++) updateEarly(state);
  assert.equal(updateEarly(state, { movedPx: 2 }), false);
  assert.equal(state.lowMovementSeconds, 0);
  for (let second = 1; second < EARLY_SAILING_HELP_TRIGGER_SECONDS; second++) {
    assert.equal(updateEarly(state), false);
  }
  assert.equal(updateEarly(state), true);
});

test("early sailing help expires after the first ninety active-play seconds", () => {
  const state = createSailingTutorialState({ earlyWindowSeconds: 81 });
  for (let second = 0; second < 12; second++) assert.equal(updateEarly(state), false);
  assert.equal(state.earlyWindowSeconds, EARLY_SAILING_HELP_WINDOW_SECONDS);
  assert.equal(earlySailingHelpWindowIsActive(state), false);
});

test("early sailing help stays quiet once shown", () => {
  const state = createSailingTutorialState();
  for (let second = 0; second < 15; second++) {
    assert.equal(updateEarly(state, { alreadyShown: true }), false);
  }
  assert.equal(state.earlyWindowSeconds, 0);
  assert.equal(state.lowMovementSeconds, 0);
});

test("sailing help uses the active device's control language", () => {
  const touch = sailingHelpPages("touch");
  const mouse = sailingHelpPages("mouse");
  const keyboard = sailingHelpPages("keyboard");
  const controller = sailingHelpPages("controller");

  assert.equal(touch.length, 3);
  assert.match(touch[0].body, /Touch and hold/);
  assert.match(mouse[0].body, /Click and hold/);
  assert.match(keyboard[0].body, /WASD or an arrow key/);
  assert.match(controller[0].body, /left stick/);
  assert.match(mouse[1].body, /zigzag.*tacking/i);
  assert.match(keyboard[2].body, /haul along the shore/i);
});
