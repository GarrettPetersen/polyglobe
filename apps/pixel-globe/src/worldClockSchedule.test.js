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

test("normal-speed frame slicing polls politics about once per real second", () => {
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
  assert.equal(checks, 4, "initial polling plus one check at each of three hour boundaries");
});

test("periodic politics polling rejects malformed clock state", () => {
  assert.throws(() => periodicGameHourPeriod(-1, 60), /previous game-hour period/);
  assert.throws(() => periodicGameHourPeriod(null, Number.NaN), /current game-clock minute/);
});
