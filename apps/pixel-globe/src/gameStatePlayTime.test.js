import assert from "node:assert/strict";
import test from "node:test";

import {
  advanceActivePlayTime,
  createGameState,
  validateGameState
} from "./gameState.js";

test("active play time advances explicitly and survives validation", () => {
  const state = createGameState({ cargoCapacity: 10 });
  assert.equal(state.activePlaySeconds, 0);
  assert.equal(advanceActivePlayTime(state, 0.25), 0.25);
  assert.equal(advanceActivePlayTime(state, 59.75), 60);
  assert.equal(validateGameState(state), state);
});

test("active play time rejects invalid durations and state", () => {
  const state = createGameState({ cargoCapacity: 10 });
  assert.throws(() => advanceActivePlayTime(state, -1), /Invalid active play duration/);
  assert.throws(() => advanceActivePlayTime(state, Number.NaN), /Invalid active play duration/);
  state.activePlaySeconds = -1;
  assert.throws(() => validateGameState(state), /Invalid active play time/);
});
