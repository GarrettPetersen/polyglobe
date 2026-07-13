import assert from "node:assert/strict";
import test from "node:test";

import {
  WATER_HEX_WAVE_AMPLITUDE_PX,
  WATER_HEX_WAVE_PERIOD_MS,
  globeWaterHexWaveOffset,
  localWaterHexWaveOffset
} from "./waterHexWave.js";

test("water hex swell stays pixel-snapped and within one pixel", () => {
  for (let nowMs = 0; nowMs < WATER_HEX_WAVE_PERIOD_MS; nowMs += 137) {
    const offset = globeWaterHexWaveOffset(nowMs, 37.2, -18.5);
    assert.equal(Number.isInteger(offset), true);
    assert.ok(Math.abs(offset) <= WATER_HEX_WAVE_AMPLITUDE_PX);
  }
});

test("water hex swell is slow, periodic, and phase-staggered", () => {
  assert.equal(globeWaterHexWaveOffset(0, 0, 0), 0);
  assert.equal(globeWaterHexWaveOffset(WATER_HEX_WAVE_PERIOD_MS / 4, 0, 0), 1);
  assert.equal(
    globeWaterHexWaveOffset(731, 12, 44),
    globeWaterHexWaveOffset(731 + WATER_HEX_WAVE_PERIOD_MS, 12, 44)
  );
  assert.notEqual(
    localWaterHexWaveOffset(0, 0, 0),
    localWaterHexWaveOffset(0, 60, 0)
  );
});

test("globe water phase joins cleanly across the date line", () => {
  for (const nowMs of [0, 900, 2400, 5100, 8100]) {
    assert.equal(
      globeWaterHexWaveOffset(nowMs, 24, -180),
      globeWaterHexWaveOffset(nowMs, 24, 180)
    );
  }
});

test("water hex swell rejects invalid coordinates and time", () => {
  assert.throws(() => globeWaterHexWaveOffset(Number.NaN, 0, 0), /invalid time/);
  assert.throws(() => globeWaterHexWaveOffset(0, Number.NaN, 0), /invalid spatial phase/);
  assert.throws(() => localWaterHexWaveOffset(0, 0, Number.POSITIVE_INFINITY), /invalid spatial phase/);
});
