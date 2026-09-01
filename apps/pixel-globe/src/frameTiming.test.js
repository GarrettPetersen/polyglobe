import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_SIMULATION_FRAME_SECONDS,
  boundedSimulationSeconds,
  elapsedRealSeconds
} from "./frameTiming.js";

test("real frame time remains independent from the bounded simulation step", () => {
  assert.equal(elapsedRealSeconds(1_000, 1_100), 0.1);
  assert.equal(boundedSimulationSeconds(0.1), MAX_SIMULATION_FRAME_SECONDS);
});

test("normal frame time remains unchanged for both clock domains", () => {
  const realSeconds = elapsedRealSeconds(1_000, 1_000 + 1000 / 60);
  assert.equal(boundedSimulationSeconds(realSeconds), realSeconds);
});

test("frame timing rejects invalid and reversed timestamps", () => {
  assert.throws(() => elapsedRealSeconds(Number.NaN, 100), /previous frame timestamp/);
  assert.throws(() => elapsedRealSeconds(100, -1), /current frame timestamp/);
  assert.throws(() => elapsedRealSeconds(100, 99), /moved backwards/);
  assert.throws(() => boundedSimulationSeconds(-0.1), /real frame duration/);
});
