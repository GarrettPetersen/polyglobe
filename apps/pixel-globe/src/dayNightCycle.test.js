import assert from "node:assert/strict";
import test from "node:test";
import { realSecondsPerGameDay } from "./gamePacing.js";

import {
  DAY_NIGHT_FULL_DAY_ALTITUDE,
  DAY_NIGHT_FULL_NIGHT_ALTITUDE,
  DAY_NIGHT_WARM_END_ALTITUDE,
  DAY_NIGHT_WARM_START_ALTITUDE,
  FIRST_DAY_NIGHT_NOTICE_SUNRISE,
  FIRST_DAY_NIGHT_NOTICE_SUNSET,
  advanceFirstDayNightNoticeState,
  createFirstDayNightNoticeState,
  dayNightLightForSunAltitude,
  restoreFirstDayNightNoticeState,
  snapshotFirstDayNightNoticeState
} from "./dayNightCycle.js";

test("stylized dawn and dusk each span more than five seconds of the longer day", () => {
  assert.equal(DAY_NIGHT_FULL_DAY_ALTITUDE, 0.5);
  assert.equal(DAY_NIGHT_FULL_NIGHT_ALTITUDE, -0.5);
  assert.ok(Math.abs(equatorialCycleSecondsBetween(
    DAY_NIGHT_FULL_DAY_ALTITUDE,
    DAY_NIGHT_FULL_NIGHT_ALTITUDE
  ) - 16 / 3) < 1e-9);
  const warmSeconds = equatorialCycleSecondsBetween(
    DAY_NIGHT_WARM_END_ALTITUDE,
    DAY_NIGHT_WARM_START_ALTITUDE
  );
  assert.ok(warmSeconds > 4.8 && warmSeconds < 5);
});

test("visual twilight eases through warm light without changing full day or night", () => {
  assert.deepEqual(dayNightLightForSunAltitude(1), {
    sunAltitude: 1,
    night: 0,
    sunset: 0
  });
  assert.deepEqual(dayNightLightForSunAltitude(-1), {
    sunAltitude: -1,
    night: 1,
    sunset: 0
  });
  const horizon = dayNightLightForSunAltitude(0);
  assert.ok(horizon.sunset > 0.9);
  assert.ok(horizon.night < 0.1);
  assert.throws(() => dayNightLightForSunAltitude(Number.NaN), /unit value/);
});

test("a new voyage labels its first sunset and following sunrise once", () => {
  const state = createFirstDayNightNoticeState(0.6);

  assert.equal(advance(state, 0.31, 300), null);
  assert.equal(advance(state, 0.29, 301), FIRST_DAY_NIGHT_NOTICE_SUNSET);
  assert.equal(advance(state, -0.6, 700), null);
  assert.equal(advance(state, -0.31, 1000), null);
  assert.equal(advance(state, -0.29, 1001), FIRST_DAY_NIGHT_NOTICE_SUNRISE);
  assert.equal(advance(state, 0.6, 1100), null);
  assert.equal(advance(state, 0.29, 1300), null);
});

test("day/night guidance expires after the first voyage day", () => {
  const state = createFirstDayNightNoticeState(0.6);

  assert.equal(advance(state, 0.29, 1441), null);
  assert.deepEqual(snapshotFirstDayNightNoticeState(state), {
    sunsetShown: true,
    sunriseShown: true
  });
});

test("saved guidance resumes without repeating sunset and old saves remain quiet", () => {
  const state = createFirstDayNightNoticeState(0.6);
  assert.equal(advance(state, 0.29, 300), FIRST_DAY_NIGHT_NOTICE_SUNSET);
  const restored = restoreFirstDayNightNoticeState(
    snapshotFirstDayNightNoticeState(state),
    -0.6
  );

  assert.equal(advance(restored, -0.29, 1000), FIRST_DAY_NIGHT_NOTICE_SUNRISE);
  assert.equal(advance(restored, 0.29, 1200), null);

  const oldSave = restoreFirstDayNightNoticeState(undefined, 0.6);
  assert.equal(advance(oldSave, 0.29, 300), null);
});

test("day/night guidance rejects malformed saved and runtime state", () => {
  assert.throws(
    () => restoreFirstDayNightNoticeState({ sunsetShown: false, sunriseShown: true }, 0),
    /cannot precede sunset/
  );
  const state = createFirstDayNightNoticeState(0.5);
  assert.throws(() => advance(state, 0.2, -1), /elapsed minutes/);
  assert.throws(() => advance(state, 2, 1), /unit value/);
});

function advance(state, sunAltitude, elapsedVoyageMinutes) {
  return advanceFirstDayNightNoticeState(state, { sunAltitude, elapsedVoyageMinutes });
}

function equatorialCycleSecondsBetween(descendingStartAltitude, descendingEndAltitude) {
  const startAngle = Math.acos(descendingStartAltitude);
  const endAngle = Math.acos(descendingEndAltitude);
  return (endAngle - startAngle) / (Math.PI * 2) * realSecondsPerGameDay();
}
