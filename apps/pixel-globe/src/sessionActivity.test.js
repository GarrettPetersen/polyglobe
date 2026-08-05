import assert from "node:assert/strict";
import test from "node:test";

import {
  activeSessionFrameSeconds,
  createSessionActivityState,
  noteSessionActivity
} from "./sessionActivity.js";

test("session play advances while the player is recently active", () => {
  const state = createSessionActivityState(1_000, { idleTimeoutMs: 5_000 });
  assert.equal(activeSessionFrameSeconds(state, {
    nowMs: 2_000,
    elapsedSeconds: 1
  }), 1);
});

test("session play stops precisely at the inactivity cutoff", () => {
  const state = createSessionActivityState(1_000, { idleTimeoutMs: 5_000 });
  assert.equal(activeSessionFrameSeconds(state, {
    nowMs: 6_500,
    elapsedSeconds: 1
  }), 0.5);
  assert.equal(activeSessionFrameSeconds(state, {
    nowMs: 7_000,
    elapsedSeconds: 0.5
  }), 0);
});

test("new input resumes an idle session", () => {
  const state = createSessionActivityState(1_000, { idleTimeoutMs: 5_000 });
  noteSessionActivity(state, 20_000);
  assert.equal(activeSessionFrameSeconds(state, {
    nowMs: 20_050,
    elapsedSeconds: 0.05
  }), 0.05);
});

test("held controls keep deliberate sailing active", () => {
  const state = createSessionActivityState(1_000, { idleTimeoutMs: 5_000 });
  assert.equal(activeSessionFrameSeconds(state, {
    nowMs: 60_000,
    elapsedSeconds: 0.05,
    continuousInput: true
  }), 0.05);
  assert.equal(state.lastActivityMs, 60_000);
});

test("a suspended frame cannot backfill more than one idle window", () => {
  const state = createSessionActivityState(1_000, { idleTimeoutMs: 5_000 });
  assert.equal(activeSessionFrameSeconds(state, {
    nowMs: 61_000,
    elapsedSeconds: 60,
    continuousInput: true
  }), 5);
});

test("session activity rejects invalid clocks instead of hiding them", () => {
  const state = createSessionActivityState(1_000);
  assert.throws(() => noteSessionActivity(state, 999), /moved backwards/);
  assert.throws(() => activeSessionFrameSeconds(state, {
    nowMs: 2_000,
    elapsedSeconds: -1
  }), /Invalid session frame duration/);
});
