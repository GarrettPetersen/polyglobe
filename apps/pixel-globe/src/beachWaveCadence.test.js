import assert from "node:assert/strict";
import test from "node:test";

import {
  BEACH_WAVE_FRAME_COUNT,
  BEACH_WAVE_PERIOD_MS,
  beachWaveCadence,
  beachWaveState
} from "./beachWaveCadence.js";

test("neighboring beach connectors do not advance and recede in lockstep", () => {
  const cadences = Array.from({ length: 48 }, (_, index) => (
    beachWaveCadence({ a: 100 + index, b: 700 + index })
  ));
  assert.ok(new Set(cadences.map(({ phaseFrame }) => phaseFrame)).size >= 8);
  assert.equal(new Set(cadences.map(({ profileIndex }) => profileIndex)).size, 3);
});

test("beach cadence is independent of connector endpoint order", () => {
  assert.deepEqual(
    beachWaveCadence({ a: 91, b: 17 }),
    beachWaveCadence({ a: 17, b: 91 })
  );
});

test("beach waves remain bounded and loop on the shared raster cadence", () => {
  const call = { a: 12, b: 42 };
  for (let frame = 0; frame < BEACH_WAVE_FRAME_COUNT; frame += 1) {
    const clockMs = frame / BEACH_WAVE_FRAME_COUNT * BEACH_WAVE_PERIOD_MS;
    const state = beachWaveState(call, clockMs);
    assert.ok(state.reach >= 0.16 && state.reach <= 0.78);
    assert.ok(state.foamReach >= state.reach && state.foamReach <= 0.78);
    assert.ok(state.foamAlpha >= 0 && state.foamAlpha <= 0.92);
  }
  assert.deepEqual(beachWaveState(call, 0), beachWaveState(call, BEACH_WAVE_PERIOD_MS));
});

test("invalid beach cadence inputs fail loudly", () => {
  assert.throws(() => beachWaveCadence({ a: 4, b: 4 }), /two distinct integer tile ids/);
  assert.throws(() => beachWaveState({ a: 4, b: 5 }, -1), /Invalid beach wave clock/);
});
