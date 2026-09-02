import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_GAME_TIME_SCALE,
  SHIP_ACCELERATION_SCALE,
  SHIP_TOP_SPEED_SCALE,
  SHIP_TURN_RATE_SCALE,
  advanceGameClockMinutes,
  realSecondsPerGameDay,
  voyageDurationMultiplier
} from "./gamePacing.js";
import { boundedSimulationSeconds, elapsedRealSeconds } from "./frameTiming.js";

test("the default day-night cycle completes in thirty-two real seconds", () => {
  assert.equal(DEFAULT_GAME_TIME_SCALE, 2700);
  assert.equal(realSecondsPerGameDay(), 32);
});

test("calendar advancement is independent of render cadence and bounded physics steps", () => {
  const advanceAtHz = (hz) => {
    let minute = 120;
    let previousFrameMs = 0;
    let simulatedSeconds = 0;
    for (let frame = 0; frame < hz * 10; frame++) {
      const currentFrameMs = (frame + 1) * 1000 / hz;
      const elapsedSeconds = elapsedRealSeconds(previousFrameMs, currentFrameMs);
      minute = advanceGameClockMinutes(minute, { elapsedRealSeconds: elapsedSeconds });
      simulatedSeconds += boundedSimulationSeconds(elapsedSeconds);
      previousFrameMs = currentFrameMs;
    }
    return { minute, simulatedSeconds };
  };
  const slow = advanceAtHz(10);
  const normal = advanceAtHz(60);
  const fast = advanceAtHz(120);
  assert.ok(Math.abs(slow.minute - normal.minute) < 1e-8);
  assert.ok(Math.abs(normal.minute - fast.minute) < 1e-8);
  assert.ok(Math.abs(normal.minute - 570) < 1e-8);
  assert.ok(slow.simulatedSeconds < normal.simulatedSeconds);
});

test("calendar advancement rejects malformed timing", () => {
  assert.throws(() => advanceGameClockMinutes(0, 1), /named real-time timing/);
  assert.throws(
    () => advanceGameClockMinutes(Number.NaN, { elapsedRealSeconds: 1 }),
    /current game minute/
  );
  assert.throws(
    () => advanceGameClockMinutes(0, { elapsedRealSeconds: -1 }),
    /elapsed real time/
  );
  assert.throws(
    () => advanceGameClockMinutes(0, { elapsedRealSeconds: 1, timeScale: -1 }),
    /game time scale/
  );
});

test("a full day takes the configured real duration on slow and fast renderers", () => {
  for (const renderHz of [6, 10, 60, 120]) {
    let currentMinute = 0;
    let previousFrameMs = 0;
    const frameCount = realSecondsPerGameDay() * renderHz;
    for (let frame = 0; frame < frameCount; frame++) {
      const currentFrameMs = (frame + 1) * 1000 / renderHz;
      currentMinute = advanceGameClockMinutes(currentMinute, {
        elapsedRealSeconds: elapsedRealSeconds(previousFrameMs, currentFrameMs)
      });
      previousFrameMs = currentFrameMs;
    }
    assert.ok(
      Math.abs(currentMinute - 24 * 60) < 1e-8,
      `${renderHz} Hz completed ${currentMinute} game minutes`
    );
  }
});

test("the larger globe makes voyages last substantially longer in game time", () => {
  assert.equal(SHIP_TOP_SPEED_SCALE, 0.62);
  assert.equal(SHIP_ACCELERATION_SCALE, 0.16);
  assert.equal(SHIP_TURN_RATE_SCALE, 0.55);
  assert.ok(voyageDurationMultiplier({ previousTimeScale: 3600 }) > 2.52);
  assert.ok(voyageDurationMultiplier({ previousTimeScale: 3600 }) < 2.53);
});
