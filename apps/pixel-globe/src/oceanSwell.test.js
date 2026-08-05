import assert from "node:assert/strict";
import test from "node:test";

import {
  CALM_SWELL_PACKET_DURATION_MS,
  CALM_SWELL_PACKET_PERIOD_MS,
  STORM_SWELL_MAX_AMPLITUDE_PX,
  calmSwellEnvelope,
  oceanSwellOffset,
  oceanSwellState
} from "./oceanSwell.js";

test("calm ocean swells arrive as brief low-amplitude packets", () => {
  assert.equal(calmSwellEnvelope(0), 0);
  assert.equal(calmSwellEnvelope(CALM_SWELL_PACKET_DURATION_MS), 0);
  assert.equal(calmSwellEnvelope(CALM_SWELL_PACKET_PERIOD_MS - 1), 0);
  assert.ok(calmSwellEnvelope(CALM_SWELL_PACKET_DURATION_MS / 2) > 0.99);

  const quiet = oceanSwellState({
    nowMs: CALM_SWELL_PACKET_DURATION_MS + 1000,
    stormStrength: 0,
    flowDirectionRad: 0
  });
  assert.equal(quiet.amplitudePx, 0);

  const crest = oceanSwellState({
    nowMs: CALM_SWELL_PACKET_DURATION_MS / 2,
    stormStrength: 0,
    flowDirectionRad: 0
  });
  assert.equal(crest.amplitudePx, 1);
});

test("storms sustain stronger wind-driven swells", () => {
  const state = oceanSwellState({
    nowMs: CALM_SWELL_PACKET_DURATION_MS + 1000,
    stormStrength: 1,
    flowDirectionRad: Math.PI / 3
  });

  assert.equal(state.amplitudePx, STORM_SWELL_MAX_AMPLITUDE_PX);
});

test("whole ocean sprites move along the wind without exceeding swell amplitude", () => {
  const eastward = oceanSwellState({ nowMs: 1733, stormStrength: 1, flowDirectionRad: 0 });
  const northward = oceanSwellState({ nowMs: 1733, stormStrength: 1, flowDirectionRad: Math.PI / 2 });
  const position = [0.8, 0.3, -0.519615242];
  const eastOffset = oceanSwellOffset(eastward, position);
  const northOffset = oceanSwellOffset(northward, position);

  assert.equal(eastOffset.y, 0);
  assert.equal(northOffset.x, 0);
  assert.ok(Math.abs(eastOffset.x) <= STORM_SWELL_MAX_AMPLITUDE_PX);
  assert.ok(Math.abs(northOffset.y) <= STORM_SWELL_MAX_AMPLITUDE_PX);
});

test("swell phase is anchored to globe position rather than screen position", () => {
  const state = oceanSwellState({ nowMs: 3500, stormStrength: 0.8, flowDirectionRad: 0.7 });
  const position = [0.2, 0.9, -0.38];
  assert.deepEqual(oceanSwellOffset(state, position), oceanSwellOffset(state, position));
  assert.throws(
    () => oceanSwellOffset(state, [0, Number.NaN, 1]),
    /finite globe position/
  );
});
