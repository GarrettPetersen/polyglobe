import assert from "node:assert/strict";
import test from "node:test";

import {
  ADAPTIVE_RENDER_COOLDOWN_MAX_MS,
  adaptiveRenderCooldownMs,
  shouldRenderFrame
} from "./frameRenderPolicy.js";

function frameState(overrides = {}) {
  return {
    forceRender: false,
    dirty: false,
    continuousAnimation: false,
    simulationPaused: false,
    nowMs: 2000,
    lastRenderCompletedAtMs: 1400,
    renderCooldownMs: 0,
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

test("live world animation leaves a recovery interval after an expensive render", () => {
  assert.equal(shouldRenderFrame(frameState({
    dirty: true,
    nowMs: 2000,
    lastRenderCompletedAtMs: 1980,
    renderCooldownMs: 30
  })), false);
  assert.equal(shouldRenderFrame(frameState({
    dirty: true,
    nowMs: 2010,
    lastRenderCompletedAtMs: 1980,
    renderCooldownMs: 30
  })), true);
});

test("paused animation respects recovery while forced captures remain immediate", () => {
  assert.equal(shouldRenderFrame(frameState({
    simulationPaused: true,
    dirty: true,
    nowMs: 2000,
    lastRenderCompletedAtMs: 1999,
    renderCooldownMs: 30
  })), false);
  assert.equal(shouldRenderFrame(frameState({
    forceRender: true,
    nowMs: 2000,
    lastRenderCompletedAtMs: 1999,
    renderCooldownMs: 30
  })), true);
});

test("adaptive render cooldown preserves full-density motion and gives minimum density one frame of rest", () => {
  assert.equal(adaptiveRenderCooldownMs(1), 0);
  assert.equal(adaptiveRenderCooldownMs(0.3), ADAPTIVE_RENDER_COOLDOWN_MAX_MS);
  assert.equal(adaptiveRenderCooldownMs(0), ADAPTIVE_RENDER_COOLDOWN_MAX_MS);
  assert.ok(adaptiveRenderCooldownMs(0.65) > 0);
  assert.ok(adaptiveRenderCooldownMs(0.65) < ADAPTIVE_RENDER_COOLDOWN_MAX_MS);
  assert.throws(() => adaptiveRenderCooldownMs(-0.1), /unit visual density/);
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
  assert.throws(
    () => shouldRenderFrame(frameState({ renderCooldownMs: -1 })),
    /finite timing values/
  );
});
