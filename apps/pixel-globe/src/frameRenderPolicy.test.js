import assert from "node:assert/strict";
import test from "node:test";

import { shouldRenderFrame } from "./frameRenderPolicy.js";

function frameState(overrides = {}) {
  return {
    forceRender: false,
    dirty: false,
    continuousAnimation: false,
    simulationPaused: false,
    nowMs: 2000,
    lastStatusMs: 1500,
    statusIntervalMs: 1000,
    ...overrides
  };
}

test("static paused screens do not repaint on every animation frame", () => {
  assert.equal(shouldRenderFrame(frameState({ simulationPaused: true, nowMs: 10000 })), false);
  assert.equal(shouldRenderFrame(frameState({ simulationPaused: true, dirty: true })), true);
});

test("live play retains periodic status refreshes", () => {
  assert.equal(shouldRenderFrame(frameState({ nowMs: 2600 })), true);
  assert.equal(shouldRenderFrame(frameState({ nowMs: 2499 })), false);
});

test("explicit animation and forced renders bypass the paused-screen throttle", () => {
  assert.equal(shouldRenderFrame(frameState({
    simulationPaused: true,
    continuousAnimation: true
  })), true);
  assert.equal(shouldRenderFrame(frameState({ simulationPaused: true, forceRender: true })), true);
});

test("render policy rejects malformed state", () => {
  assert.throws(
    () => shouldRenderFrame(frameState({ dirty: null })),
    /boolean flags/
  );
  assert.throws(
    () => shouldRenderFrame(frameState({ statusIntervalMs: 0 })),
    /finite timing values/
  );
});
