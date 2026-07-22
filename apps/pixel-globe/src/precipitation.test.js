import assert from "node:assert/strict";
import test from "node:test";
import {
  PRECIPITATION_RAIN,
  PRECIPITATION_SNOW,
  precipitationKindForConditions,
  snowWaveOffset
} from "./precipitation.js";

test("snow takes visual priority over rain and storm precipitation", () => {
  assert.equal(precipitationKindForConditions({ raining: true, snowing: true, storming: true }), PRECIPITATION_SNOW);
  assert.equal(precipitationKindForConditions({ raining: false, snowing: true, storming: true }), PRECIPITATION_SNOW);
  assert.equal(precipitationKindForConditions({ raining: true, snowing: false, storming: false }), PRECIPITATION_RAIN);
  assert.equal(precipitationKindForConditions({ raining: false, snowing: false, storming: true }), PRECIPITATION_RAIN);
  assert.equal(precipitationKindForConditions({ raining: false, snowing: false, storming: false }), null);
});

test("snow wave drifts to both sides and returns to its starting point", () => {
  const periodMs = 2000;
  assert.ok(Math.abs(snowWaveOffset(0, 0, 4, periodMs)) < 1e-9);
  assert.equal(snowWaveOffset(periodMs / 4, 0, 4, periodMs), 4);
  assert.ok(Math.abs(snowWaveOffset(periodMs / 2, 0, 4, periodMs)) < 1e-9);
  assert.equal(snowWaveOffset(periodMs * 3 / 4, 0, 4, periodMs), -4);
  assert.ok(Math.abs(snowWaveOffset(periodMs, 0, 4, periodMs)) < 1e-9);
});

test("precipitation helpers reject malformed animation state", () => {
  assert.throws(
    () => precipitationKindForConditions({ raining: 1, snowing: false, storming: false }),
    /raining flag/
  );
  assert.throws(() => snowWaveOffset(100, 0, -1, 2000), /amplitude/);
  assert.throws(() => snowWaveOffset(100, 0, 1, 0), /period/);
});
