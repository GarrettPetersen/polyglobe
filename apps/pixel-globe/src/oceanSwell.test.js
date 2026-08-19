import assert from "node:assert/strict";
import test from "node:test";

import {
  CALM_SWELL_BAND_WIDTH,
  CALM_SWELL_PACKET_DURATION_MS,
  CALM_SWELL_PACKET_FADE_MS,
  CALM_SWELL_PACKET_PERIOD_MS,
  CALM_SWELL_WAVE_PERIOD_MS,
  OCEAN_SWELL_FRAME_COUNT,
  OCEAN_SWELL_SPATIAL_CYCLES,
  STORM_SWELL_MAX_AMPLITUDE_PX,
  STORM_SWELL_BAND_WIDTH,
  STORM_SWELL_PERIOD_MS,
  calmSwellEnvelope,
  oceanSwellOffset,
  oceanSwellState
} from "./oceanSwell.js";

const EASTWARD_PHASE = [1, 0, 0];

function swellState(options) {
  return oceanSwellState({ phaseAxis: EASTWARD_PHASE, ...options });
}

test("calm ocean swells arrive as brief low-amplitude packets", () => {
  assert.equal(calmSwellEnvelope(0), 0);
  assert.equal(calmSwellEnvelope(CALM_SWELL_PACKET_DURATION_MS), 0);
  assert.equal(calmSwellEnvelope(CALM_SWELL_PACKET_PERIOD_MS - 1), 0);
  assert.equal(calmSwellEnvelope(CALM_SWELL_PACKET_FADE_MS), 1);
  assert.equal(calmSwellEnvelope(CALM_SWELL_PACKET_DURATION_MS / 2), 1);
  assert.equal(
    calmSwellEnvelope(CALM_SWELL_PACKET_DURATION_MS - CALM_SWELL_PACKET_FADE_MS),
    1
  );

  const quiet = swellState({
    nowMs: CALM_SWELL_PACKET_DURATION_MS + 1000,
    stormStrength: 0,
    flowDirectionRad: 0
  });
  assert.equal(quiet.amplitudePx, 0);

  const crest = swellState({
    nowMs: CALM_SWELL_PACKET_DURATION_MS / 2,
    stormStrength: 0,
    flowDirectionRad: 0
  });
  assert.equal(crest.amplitudePx, 1);
  assert.equal(crest.travelPeriodMs, CALM_SWELL_WAVE_PERIOD_MS);
  assert.ok(
    CALM_SWELL_WAVE_PERIOD_MS / OCEAN_SWELL_FRAME_COUNT <= 150,
    "swell phase should advance on nearly every water animation tick"
  );
  assert.ok(
    CALM_SWELL_PACKET_DURATION_MS - CALM_SWELL_PACKET_FADE_MS * 2 >=
      CALM_SWELL_WAVE_PERIOD_MS,
    "a calm packet must hold its full amplitude through one complete wave traversal"
  );
  assert.ok(CALM_SWELL_PACKET_DURATION_MS < CALM_SWELL_PACKET_PERIOD_MS);
});

test("storms sustain stronger wind-driven swells", () => {
  const state = swellState({
    nowMs: CALM_SWELL_PACKET_DURATION_MS + 1000,
    stormStrength: 1,
    flowDirectionRad: Math.PI / 3
  });

  assert.equal(state.amplitudePx, STORM_SWELL_MAX_AMPLITUDE_PX);
  assert.equal(state.travelPeriodMs, STORM_SWELL_PERIOD_MS);
  assert.equal(STORM_SWELL_PERIOD_MS, CALM_SWELL_WAVE_PERIOD_MS);
  assert.ok(OCEAN_SWELL_SPATIAL_CYCLES <= 7);
  assert.equal(state.bandWidth, Math.round(STORM_SWELL_BAND_WIDTH * 64) / 64);
});

test("swell motion travels in distinct bands with settled water between them", () => {
  const state = swellState({ nowMs: 2800, stormStrength: 1, flowDirectionRad: 0 });
  let moving = 0;
  let settled = 0;
  for (let index = 0; index <= 200; index++) {
    const x = -1 + index / 100;
    const y = Math.sqrt(Math.max(0, 1 - x * x));
    const offset = oceanSwellOffset(state, [x, y, 0]);
    if (offset.x === 0 && offset.y === 0) settled++;
    else moving++;
  }

  assert.ok(moving > 0);
  assert.ok(settled > moving);
  assert.ok(CALM_SWELL_BAND_WIDTH < STORM_SWELL_BAND_WIDTH);
  assert.ok(STORM_SWELL_BAND_WIDTH <= 0.16, "one narrow hex row should carry each swell front");
});

test("visually settled water shares one terrain cache state", () => {
  const early = swellState({ nowMs: 100, stormStrength: 0, flowDirectionRad: 0 });
  const later = swellState({
    nowMs: CALM_SWELL_PACKET_DURATION_MS + 700,
    stormStrength: 0,
    flowDirectionRad: 2.4
  });

  assert.equal(early.amplitudePx, 0);
  assert.equal(later.amplitudePx, 0);
  assert.equal(early.cacheKey, later.cacheKey);
  assert.equal(early.frame, 0);
  assert.equal(later.frame, 0);
});

test("whole ocean sprites move along the wind without exceeding swell amplitude", () => {
  const eastward = swellState({ nowMs: 1733, stormStrength: 1, flowDirectionRad: 0 });
  const northward = swellState({ nowMs: 1733, stormStrength: 1, flowDirectionRad: Math.PI / 2 });
  const position = [0.8, 0.3, -0.519615242];
  const eastOffset = oceanSwellOffset(eastward, position);
  const northOffset = oceanSwellOffset(northward, position);

  assert.equal(eastOffset.y, 0);
  assert.equal(northOffset.x, 0);
  assert.ok(Math.abs(eastOffset.x) <= STORM_SWELL_MAX_AMPLITUDE_PX);
  assert.ok(Math.abs(northOffset.y) <= STORM_SWELL_MAX_AMPLITUDE_PX);
});

test("swell phase is anchored to globe position rather than screen position", () => {
  const state = swellState({ nowMs: 3500, stormStrength: 0.8, flowDirectionRad: 0.7 });
  const position = [0.2, 0.9, -0.38];
  assert.deepEqual(oceanSwellOffset(state, position), oceanSwellOffset(state, position));
  assert.throws(
    () => oceanSwellOffset(state, [0, Number.NaN, 1]),
    /finite globe position/
  );
});

test("swell phase advances along the wind axis rather than across it", () => {
  const state = swellState({ nowMs: 500, stormStrength: 1, flowDirectionRad: 0 });
  const origin = oceanSwellOffset(state, [0, 1, 0]);
  const alongWind = oceanSwellOffset(state, [0.04, Math.sqrt(1 - 0.04 ** 2), 0]);
  const acrossWind = oceanSwellOffset(state, [0, Math.sqrt(1 - 0.04 ** 2), 0.04]);

  assert.notDeepEqual(alongWind, origin);
  assert.deepEqual(acrossWind, origin);
});

test("swell cache state uses the exact phase represented by its frame", () => {
  const first = swellState({ nowMs: 1700, stormStrength: 1, flowDirectionRad: 0 });
  const sameFrame = swellState({ nowMs: 1710, stormStrength: 1, flowDirectionRad: 0 });

  assert.equal(first.cacheKey, sameFrame.cacheKey);
  assert.equal(first.cycle, sameFrame.cycle);
  assert.deepEqual(
    oceanSwellOffset(first, [0.4, 0.8, -0.4472135955]),
    oceanSwellOffset(sameFrame, [0.4, 0.8, -0.4472135955])
  );
});
