import assert from "node:assert/strict";
import test from "node:test";

import {
  WATER_HEX_WAVE_AMPLITUDE_PX,
  WATER_HEX_WAVE_FRAME_COUNT,
  WATER_HEX_WAVE_PERIOD_MS,
  globeWaterHexWaveFrame,
  localWaterHexWaveFrame,
  waterHexWaveBandsForFrame
} from "./waterHexWave.js";

test("water wave bands shift rows horizontally by at most one pixel", () => {
  for (let nowMs = 0; nowMs < WATER_HEX_WAVE_PERIOD_MS; nowMs += 137) {
    const frame = globeWaterHexWaveFrame(nowMs, 37.2, -18.5);
    const bands = waterHexWaveBandsForFrame(frame, 36);
    assert.equal(bands.reduce((height, band) => height + band.height, 0), 36);
    assert.ok(bands.every((band) => Number.isInteger(band.offsetX)));
    assert.ok(bands.every((band) => Math.abs(band.offsetX) <= WATER_HEX_WAVE_AMPLITUDE_PX));
  }
});

test("water rows ripple independently without moving vertically", () => {
  const bands = waterHexWaveBandsForFrame(3, 36);
  assert.ok(new Set(bands.map((band) => band.offsetX)).size >= 2);
  assert.equal(bands[0].y, 0);
  for (let i = 1; i < bands.length; i++) {
    assert.equal(bands[i].y, bands[i - 1].y + bands[i - 1].height);
  }
});

test("water row waves are slow, periodic, and phase-staggered", () => {
  assert.equal(
    globeWaterHexWaveFrame(731, 12, 44),
    globeWaterHexWaveFrame(731 + WATER_HEX_WAVE_PERIOD_MS, 12, 44)
  );
  assert.notEqual(
    localWaterHexWaveFrame(0, 0, 0),
    localWaterHexWaveFrame(0, 60, 0)
  );
});

test("globe water row phase joins cleanly across the date line", () => {
  for (const nowMs of [0, 900, 2400, 5100, 8100]) {
    assert.equal(
      globeWaterHexWaveFrame(nowMs, 24, -180),
      globeWaterHexWaveFrame(nowMs, 24, 180)
    );
  }
});

test("the complete pre-baked cycle contains distinct hard-edged frames", () => {
  const signatures = new Set();
  for (let frame = 0; frame < WATER_HEX_WAVE_FRAME_COUNT; frame++) {
    signatures.add(JSON.stringify(waterHexWaveBandsForFrame(frame, 36)));
  }
  assert.equal(signatures.size, WATER_HEX_WAVE_FRAME_COUNT);
});

test("water row waves reject invalid coordinates, time, frames, and sprite heights", () => {
  assert.throws(() => globeWaterHexWaveFrame(Number.NaN, 0, 0), /invalid time/);
  assert.throws(() => globeWaterHexWaveFrame(0, Number.NaN, 0), /invalid spatial phase/);
  assert.throws(() => localWaterHexWaveFrame(0, 0, Number.POSITIVE_INFINITY), /invalid spatial phase/);
  assert.throws(() => waterHexWaveBandsForFrame(WATER_HEX_WAVE_FRAME_COUNT, 36), /invalid frame/);
  assert.throws(() => waterHexWaveBandsForFrame(0, 0), /invalid sprite height/);
});
