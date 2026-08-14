import assert from "node:assert/strict";
import test from "node:test";
import {
  PRECIPITATION_RAIN,
  PRECIPITATION_SNOW,
  precipitationKindForConditions,
  snowLandingOpacity,
  snowParticleOffset,
  snowfallPresentationStrength,
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

test("baked snow days always show gentle flakes and deepen with moisture", () => {
  assert.equal(snowfallPresentationStrength({
    snowDay: false,
    coldWater: false,
    cloudOpacity: 1,
    stormIntensity: 1
  }), 0);
  const drySnowDay = snowfallPresentationStrength({
    snowDay: true,
    coldWater: false,
    cloudOpacity: 0,
    stormIntensity: 0
  });
  assert.ok(drySnowDay > 0);
  const cloudySnowDay = snowfallPresentationStrength({
    snowDay: true,
    coldWater: false,
    cloudOpacity: 0.62,
    stormIntensity: 0
  });
  assert.ok(cloudySnowDay > drySnowDay);
  assert.ok(snowfallPresentationStrength({
    snowDay: false,
    coldWater: true,
    cloudOpacity: 0,
    stormIntensity: 0.9
  }) > 0.8);
  assert.ok(snowfallPresentationStrength({
    snowDay: false,
    coldWater: false,
    snowCoveredGround: true,
    cloudOpacity: 0.5,
    stormIntensity: 0
  }) > 0);
});

test("snow falls while wind advects it in both screen axes", () => {
  const offset = snowParticleOffset({
    progress: 0.5,
    elapsedMs: 500,
    phaseRad: 0,
    waveAmplitudePx: 0,
    wavePeriodMs: 2000,
    windFlowX: 0.6,
    windFlowY: 0.8,
    windTravelPx: 10,
    fallDistancePx: 24
  });
  assert.equal(offset.x, 3);
  assert.equal(offset.y, 14.2);
  assert.equal(snowLandingOpacity(0.5), 1);
  assert.equal(snowLandingOpacity(1), 0);
  assert.ok(snowLandingOpacity(0.92) > 0 && snowLandingOpacity(0.92) < 1);
});
