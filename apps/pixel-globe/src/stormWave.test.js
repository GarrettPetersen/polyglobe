import assert from "node:assert/strict";
import test from "node:test";

import {
  OVERBOARD_SWIM_MAX_SECONDS,
  OVERBOARD_SWIM_MIN_SECONDS,
  FIRST_BREAKING_WAVE_MAX_SECONDS,
  FIRST_BREAKING_WAVE_MIN_SECONDS,
  REPEAT_BREAKING_WAVE_MIN_SECONDS,
  STORM_BREAKING_WAVE_DURATION_SECONDS,
  STORM_BREAKING_WAVE_MIN_INTENSITY,
  STORM_BREAKING_WAVE_RESET_INTENSITY,
  STORM_BREAKING_WAVE_SHIP_LIFT_MAX_PX,
  STORM_OVERBOARD_MIN_INTENSITY,
  createStormWaveState,
  overboardFlightLiftPx,
  overboardSwimDurationSeconds,
  stormWaveCrewLossChance,
  stormWaveCrestParticles,
  stormWaveFrame,
  stormWaveImpactSoundVolume,
  stormWaveShipLiftPx,
  stormWaveSweptCrewCount,
  restoreOverboardCrew,
  snapshotOverboardCrew,
  updateStormWaveState
} from "./stormWave.js";

test("breaking storm waves use the existing wind-aligned swell direction", () => {
  const state = createStormWaveState();
  updateStormWaveState(state, {
    dt: 0,
    intensity: 1,
    eligible: true,
    flow: { x: 3, y: 4 },
    random: () => 0.25,
    immediate: true
  });
  assert.ok(state.active);
  assert.equal(state.active.flow.x, 0.6);
  assert.equal(state.active.flow.y, 0.8);

  state.active.elapsedSeconds = STORM_BREAKING_WAVE_DURATION_SECONDS / 2;
  const frame = stormWaveFrame(state.active, 455, 256);
  assert.ok(Math.abs(frame.center.x - 455 / 2) < 0.001);
  assert.ok(Math.abs(frame.center.y - 256 / 2) < 0.001);
  assert.ok(frame.wash > 0.99);
  assert.ok(stormWaveCrestParticles(state.active, 455, 256).length > 100);
  assert.equal(
    stormWaveShipLiftPx(state.active, 455, 256),
    -STORM_BREAKING_WAVE_SHIP_LIFT_MAX_PX
  );
});

test("a breaking crest lifts the ship only while its front crosses the hull", () => {
  const state = createStormWaveState();
  updateStormWaveState(state, {
    dt: 0,
    intensity: 1,
    eligible: true,
    flow: { x: 1, y: 0 },
    random: () => 0.25,
    immediate: true
  });
  assert.equal(stormWaveShipLiftPx(state.active, 455, 256), 0);
  state.active.elapsedSeconds = STORM_BREAKING_WAVE_DURATION_SECONDS / 2;
  assert.equal(stormWaveShipLiftPx(state.active, 455, 256), -3);
  state.active.elapsedSeconds = STORM_BREAKING_WAVE_DURATION_SECONDS;
  assert.equal(stormWaveShipLiftPx(state.active, 455, 256), 0);
});

test("every active storm can show breakers without making mild storms sweep crew", () => {
  const state = createStormWaveState();
  updateStormWaveState(state, {
    dt: 0,
    intensity: STORM_BREAKING_WAVE_MIN_INTENSITY,
    eligible: true,
    flow: { x: 1, y: 0 },
    random: () => 0.25,
    immediate: true
  });

  assert.ok(state.active);
  assert.equal(stormWaveCrewLossChance({
    seaworthiness: 1,
    intensity: STORM_OVERBOARD_MIN_INTENSITY - 0.01
  }), 0);
  assert.ok(stormWaveCrewLossChance({
    seaworthiness: 1,
    intensity: STORM_OVERBOARD_MIN_INTENSITY
  }) > 0);
});

test("a breaking wave resolves exactly one impact", () => {
  const state = createStormWaveState();
  const options = {
    intensity: 0.9,
    eligible: true,
    flow: { x: 1, y: 0 },
    random: () => 0.1,
    immediate: true
  };
  updateStormWaveState(state, { ...options, dt: 0 });
  const first = updateStormWaveState(state, {
    ...options,
    dt: STORM_BREAKING_WAVE_DURATION_SECONDS * 0.51
  });
  assert.ok(first.impact);
  const second = updateStormWaveState(state, { ...options, dt: 0.1 });
  assert.equal(second.impact, null);
});

test("the first breaker arrives promptly and later fronts remain distinct", () => {
  const state = createStormWaveState();
  updateStormWaveState(state, {
    dt: 0,
    intensity: 0.9,
    eligible: true,
    flow: { x: 1, y: 0 },
    random: () => 0.5
  });
  assert.ok(state.secondsUntilNextWave >= FIRST_BREAKING_WAVE_MIN_SECONDS);
  assert.ok(state.secondsUntilNextWave <= FIRST_BREAKING_WAVE_MAX_SECONDS);

  updateStormWaveState(state, {
    dt: state.secondsUntilNextWave,
    intensity: 0.9,
    eligible: true,
    flow: { x: 1, y: 0 },
    random: () => 0.5
  });
  assert.ok(state.active);
  updateStormWaveState(state, {
    dt: STORM_BREAKING_WAVE_DURATION_SECONDS,
    intensity: 0.9,
    eligible: true,
    flow: { x: 1, y: 0 },
    random: () => 0.5
  });
  assert.equal(state.active, null);
  assert.ok(state.secondsUntilNextWave >= REPEAT_BREAKING_WAVE_MIN_SECONDS);
});

test("brief eligibility and intensity dips pause rather than discard the first crest", () => {
  const state = createStormWaveState();
  const update = (overrides = {}) => updateStormWaveState(state, {
    dt: 0,
    intensity: 0.9,
    eligible: true,
    flow: { x: 1, y: 0 },
    random: () => 0.5,
    ...overrides
  });
  update();
  const pendingSeconds = state.secondsUntilNextWave;
  update({ dt: 2, eligible: false });
  assert.equal(state.secondsUntilNextWave, pendingSeconds);
  update({ dt: 2, intensity: STORM_BREAKING_WAVE_MIN_INTENSITY - 0.01 });
  assert.equal(state.secondsUntilNextWave, pendingSeconds);
  update({ dt: 0, intensity: STORM_BREAKING_WAVE_RESET_INTENSITY - 0.01 });
  assert.equal(state.secondsUntilNextWave, null);
});

test("seaworthy ocean ships are dramatically safer than shallow craft", () => {
  const frail = stormWaveCrewLossChance({ seaworthiness: 1, intensity: 1 });
  const oceanGoing = stormWaveCrewLossChance({ seaworthiness: 9, intensity: 1 });
  const exceptional = stormWaveCrewLossChance({ seaworthiness: 10, intensity: 1 });
  assert.ok(frail > 0.4);
  assert.ok(oceanGoing < 0.003);
  assert.ok(exceptional < 0.0003);
  assert.ok(frail > oceanGoing * 100);
});

test("the captain is never counted among swept crew", () => {
  assert.equal(stormWaveSweptCrewCount({
    crew: 1,
    seaworthiness: 1,
    intensity: 1,
    random: () => 0
  }), 0);
  assert.equal(stormWaveSweptCrewCount({
    crew: 200,
    seaworthiness: 1,
    intensity: 1,
    random: sequenceRandom([0, 0.999])
  }), 5);
});

test("wave impact audio stays subdued unless the breaker is large or sweeps crew", () => {
  const small = stormWaveImpactSoundVolume({
    intensity: STORM_BREAKING_WAVE_MIN_INTENSITY,
    sweptCrewCount: 0
  });
  const large = stormWaveImpactSoundVolume({ intensity: 1, sweptCrewCount: 0 });
  const sweeping = stormWaveImpactSoundVolume({ intensity: 1, sweptCrewCount: 3 });
  assert.equal(small, 0.18);
  assert.equal(large, 0.38);
  assert.equal(sweeping, 0.56);
  assert.ok(small < large && large < sweeping);
});

test("overboard crew swim for one to three active minutes", () => {
  assert.equal(overboardSwimDurationSeconds(() => 0), OVERBOARD_SWIM_MIN_SECONDS);
  assert.equal(overboardSwimDurationSeconds(() => 1), OVERBOARD_SWIM_MAX_SECONDS);
  assert.equal(overboardFlightLiftPx(0, 1), 0);
  assert.ok(overboardFlightLiftPx(0.5, 1) < -10);
  assert.ok(Math.abs(overboardFlightLiftPx(1, 1)) < 1e-9);
});

test("overboard crew round-trip through voyage saves", () => {
  const entry = {
    id: "overboard-1",
    kind: "generic",
    character: null,
    position: [1, 0, 0],
    startPosition: [0.999, 0.04, 0],
    ageSeconds: 4,
    flightSeconds: 0.8,
    remainingSeconds: 71,
    seed: 42,
    variant: 1,
    splashed: true
  };
  const snapshot = snapshotOverboardCrew([entry]);
  entry.position[0] = 0;
  const restored = restoreOverboardCrew(snapshot);
  assert.deepEqual(restored, snapshot);
  assert.notEqual(restored[0], snapshot[0]);
  assert.deepEqual(restoreOverboardCrew(undefined), []);
});

function sequenceRandom(values) {
  let index = 0;
  return () => values[Math.min(index++, values.length - 1)];
}
