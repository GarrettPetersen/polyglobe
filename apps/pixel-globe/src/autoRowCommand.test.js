import assert from "node:assert/strict";
import test from "node:test";

import {
  cancelAutoRowCommand,
  createAutoRowCommandState,
  updateAutoRowCommand
} from "./autoRowCommand.js";

const input = (overrides = {}) => ({
  enabled: true,
  relativeControls: true,
  canRow: true,
  forwardHeld: false,
  reverseHeld: false,
  ...overrides
});

test("auto-row latches forward and a reverse tap cancels it", () => {
  const state = createAutoRowCommandState();
  assert.deepEqual(updateAutoRowCommand(state, input({ forwardHeld: true })), {
    ahead: true,
    astern: false
  });
  assert.deepEqual(updateAutoRowCommand(state, input()), { ahead: true, astern: false });
  assert.deepEqual(updateAutoRowCommand(state, input({ reverseHeld: true })), {
    ahead: false,
    astern: true
  });
  assert.deepEqual(updateAutoRowCommand(state, input()), { ahead: false, astern: false });
});

test("hold mode and absolute steering never retain a released command", () => {
  for (const override of [{ enabled: false }, { relativeControls: false }, { canRow: false }]) {
    const state = createAutoRowCommandState();
    updateAutoRowCommand(state, input({ forwardHeld: true }));
    assert.deepEqual(updateAutoRowCommand(state, input(override)), { ahead: false, astern: false });
    assert.equal(state.aheadLatched, false);
  }
});

test("cancelling auto-row is explicit and idempotent", () => {
  const state = createAutoRowCommandState();
  updateAutoRowCommand(state, input({ forwardHeld: true }));
  assert.equal(cancelAutoRowCommand(state), true);
  assert.equal(cancelAutoRowCommand(state), false);
});
