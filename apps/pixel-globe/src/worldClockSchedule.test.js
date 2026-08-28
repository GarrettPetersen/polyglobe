import assert from "node:assert/strict";
import test from "node:test";
import {
  PERIODIC_WORLD_CHECK_INTERVAL_MINUTES,
  periodicGameHourPeriod
} from "./worldClockSchedule.js";
import { DEFAULT_GAME_TIME_SCALE, advanceGameClockMinutes } from "./gamePacing.js";

test("periodic politics polling runs once per in-game hour", () => {
  assert.equal(PERIODIC_WORLD_CHECK_INTERVAL_MINUTES, 60);
  const first = periodicGameHourPeriod(null, 47.5);
  assert.equal(first, 0);
  assert.equal(periodicGameHourPeriod(first, 59.999), 0);
  assert.equal(periodicGameHourPeriod(first, 60), 1);
});

test("normal-speed frame slicing follows the longer world's hourly political cadence", () => {
  const renderHz = 60;
  let currentMinute = 0;
  let previousPeriod = null;
  let checks = 0;
  for (let frame = 0; frame < renderHz * 3; frame++) {
    currentMinute = advanceGameClockMinutes(
      currentMinute,
      1 / renderHz,
      DEFAULT_GAME_TIME_SCALE
    );
    if (frame % 6 !== 5) continue;
    const period = periodicGameHourPeriod(previousPeriod, currentMinute);
    if (period !== previousPeriod) checks += 1;
    previousPeriod = period;
  }
  const elapsedGameMinutes = 3 * DEFAULT_GAME_TIME_SCALE / 60;
  const expectedChecks = 1 + Math.floor(elapsedGameMinutes / PERIODIC_WORLD_CHECK_INTERVAL_MINUTES);
  assert.equal(checks, expectedChecks, "initial polling plus each crossed game-hour boundary");
  assert.ok(
    PERIODIC_WORLD_CHECK_INTERVAL_MINUTES * 60 / DEFAULT_GAME_TIME_SCALE > 1,
    "the longer day should keep political polling slower than once per real second"
  );
});

test("periodic politics polling rejects malformed clock state", () => {
  assert.throws(() => periodicGameHourPeriod(-1, 60), /previous game-hour period/);
  assert.throws(() => periodicGameHourPeriod(null, Number.NaN), /current game-clock minute/);
});
