import assert from "node:assert/strict";
import test from "node:test";

import {
  MARKET_PURSE_FEEDBACK_DURATION_MS,
  createMarketPurseFeedbackState,
  marketPurseFeedbackEntries,
  recordMarketPurseTransaction
} from "./marketPurseFeedback.js";

test("rapid market transactions remain separate and drift in a compact pile", () => {
  const state = createMarketPurseFeedbackState();
  recordMarketPurseTransaction(state, { deltaDoubloons: -12, marketId: "lisbon", startedAtMs: 100 });
  recordMarketPurseTransaction(state, { deltaDoubloons: 15, marketId: "lisbon", startedAtMs: 120 });
  const entries = marketPurseFeedbackEntries(state, { marketId: "lisbon", nowMs: 500 });
  assert.deepEqual(entries.map(entry => entry.deltaDoubloons), [-12, 15]);
  assert.ok(Math.abs(entries[0].offsetY - entries[1].offsetY) >= 8);
  assert.ok(entries.every(entry => entry.alpha > 0));
});

test("market feedback is scoped, bounded, expires, and respects reduced motion", () => {
  const state = createMarketPurseFeedbackState();
  for (let index = 0; index < 10; index++) {
    recordMarketPurseTransaction(state, {
      deltaDoubloons: index + 1,
      marketId: index === 9 ? "porto" : "lisbon",
      startedAtMs: index
    });
  }
  assert.equal(state.entries.length, 8);
  const still = marketPurseFeedbackEntries(state, {
    marketId: "porto",
    nowMs: 100,
    reducedMotion: true
  });
  assert.equal(still.length, 1);
  assert.equal(still[0].offsetX, 0);
  assert.equal(marketPurseFeedbackEntries(state, {
    marketId: "porto",
    nowMs: MARKET_PURSE_FEEDBACK_DURATION_MS + 20
  }).length, 0);
});
