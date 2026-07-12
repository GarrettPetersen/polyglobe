import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_GAME_TIME_SCALE,
  SHIP_TOP_SPEED_SCALE,
  realSecondsPerGameDay,
  voyageDurationMultiplier
} from "./gamePacing.js";

test("the default day-night cycle completes in twelve real seconds", () => {
  assert.equal(DEFAULT_GAME_TIME_SCALE, 7200);
  assert.equal(realSecondsPerGameDay(), 12);
});

test("calendar and cruise changes make voyages last over twice as many game days", () => {
  assert.equal(SHIP_TOP_SPEED_SCALE, 0.85);
  assert.ok(voyageDurationMultiplier({ previousTimeScale: 3600 }) > 2.35);
  assert.ok(voyageDurationMultiplier({ previousTimeScale: 3600 }) < 2.36);
});
