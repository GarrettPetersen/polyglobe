import assert from "node:assert/strict";
import test from "node:test";

import {
  MARKET_PURSE_FEEDBACK_DURATION_MS,
  createMarketPurseFeedbackState,
  marketPurseFeedbackLayerOpacity,
  marketPurseFeedbackLabelPosition,
  marketPurseFeedbackEntries,
  purseChangeFromDisplayedTotal,
  recordMarketPurseTransaction
} from "./marketPurseFeedback.js";

test("fading feedback keeps glyph rasters opaque and applies transparency while drawing", () => {
  assert.deepEqual(marketPurseFeedbackLayerOpacity(0.01), { shadow: 0.004, text: 0.01 });
  assert.throws(() => marketPurseFeedbackLayerOpacity(-0.01), /Invalid market purse feedback opacity/);
});

test("the first displayed total arms the purse without a popup", () => {
  assert.deepEqual(purseChangeFromDisplayedTotal(null, 40), { baseline: 40, delta: null });
  assert.deepEqual(purseChangeFromDisplayedTotal(40, 55), { baseline: 55, delta: 15 });
  assert.deepEqual(purseChangeFromDisplayedTotal(55, 43), { baseline: 43, delta: -12 });
  assert.deepEqual(purseChangeFromDisplayedTotal(43, 43), { baseline: 43, delta: null });
  assert.throws(() => purseChangeFromDisplayedTotal(null, -1), /Invalid doubloon total/);
});

test("rapid purse changes remain separate beside the doubloon count", () => {
  const state = createMarketPurseFeedbackState();
  recordMarketPurseTransaction(state, { deltaDoubloons: -12, startedAtMs: 100 });
  recordMarketPurseTransaction(state, { deltaDoubloons: 15, startedAtMs: 120 });
  const entries = marketPurseFeedbackEntries(state, { nowMs: 500 });
  assert.deepEqual(entries.map(entry => entry.deltaDoubloons), [-12, 15]);
  assert.ok(Math.abs(entries[0].offsetY - entries[1].offsetY) >= 8);
  assert.ok(entries.every(entry => entry.alpha > 0));
  const anchor = { x: 132, y: 8 };
  const positions = entries.map(entry => marketPurseFeedbackLabelPosition(anchor, entry));
  assert.ok(positions.every(({ x, y }) => x >= anchor.x && y >= anchor.y));
});

test("purse changes stay visible together, then expire, and respect reduced motion", () => {
  const state = createMarketPurseFeedbackState();
  for (let index = 0; index < 10; index++) {
    recordMarketPurseTransaction(state, {
      deltaDoubloons: index + 1,
      startedAtMs: index
    });
  }
  assert.equal(state.entries.length, 8);
  const still = marketPurseFeedbackEntries(state, {
    nowMs: 100,
    reducedMotion: true
  });
  assert.equal(still.length, 8);
  assert.ok(still.every((entry) => entry.offsetX === 0));
  assert.equal(marketPurseFeedbackEntries(state, {
    nowMs: MARKET_PURSE_FEEDBACK_DURATION_MS + 20
  }).length, 0);
});
