import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_GAME_TIME_SCALE,
  SHIP_TOP_SPEED_SCALE,
  advanceGameClockMinutes,
  realSecondsPerGameDay,
  voyageDurationMultiplier
} from "./gamePacing.js";

test("the default day-night cycle completes in thirty-two real seconds", () => {
  assert.equal(DEFAULT_GAME_TIME_SCALE, 2700);
  assert.equal(realSecondsPerGameDay(), 32);
});

test("calendar advancement is independent of render cadence", () => {
  const advanceAtHz = (hz) => {
    let minute = 120;
    for (let frame = 0; frame < hz * 10; frame++) {
      minute = advanceGameClockMinutes(minute, 1 / hz);
    }
    return minute;
  };
  assert.ok(Math.abs(advanceAtHz(30) - advanceAtHz(60)) < 1e-8);
  assert.ok(Math.abs(advanceAtHz(60) - advanceAtHz(120)) < 1e-8);
  assert.ok(Math.abs(advanceAtHz(60) - 570) < 1e-8);
});

test("calendar advancement rejects malformed timing", () => {
  assert.throws(() => advanceGameClockMinutes(Number.NaN, 1), /current game minute/);
  assert.throws(() => advanceGameClockMinutes(0, -1), /elapsed game time/);
  assert.throws(() => advanceGameClockMinutes(0, 1, -1), /game time scale/);
});

test("the larger globe makes voyages last substantially longer in game time", () => {
  assert.equal(SHIP_TOP_SPEED_SCALE, 0.78);
  assert.ok(voyageDurationMultiplier({ previousTimeScale: 3600 }) > 2);
  assert.ok(voyageDurationMultiplier({ previousTimeScale: 3600 }) < 2.01);
});
