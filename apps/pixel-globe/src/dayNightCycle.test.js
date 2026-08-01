import assert from "node:assert/strict";
import test from "node:test";

import {
  FIRST_DAY_NIGHT_NOTICE_SUNRISE,
  FIRST_DAY_NIGHT_NOTICE_SUNSET,
  advanceFirstDayNightNoticeState,
  createFirstDayNightNoticeState,
  restoreFirstDayNightNoticeState,
  snapshotFirstDayNightNoticeState
} from "./dayNightCycle.js";

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
