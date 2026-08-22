import assert from "node:assert/strict";
import test from "node:test";

import {
  CREW_DEATH_LAND_BURST_SECONDS,
  CREW_DEATH_SINK_SECONDS,
  CREW_DEATH_SURFACE_LAND,
  CREW_DEATH_SURFACE_SEA,
  advanceCrewDeathEffects,
  createCrewDeathEffect,
  crewDeathEffectFrame,
  crewDeathLandBurstPixels
} from "./crewDeathEffects.js";

function effect(overrides = {}) {
  return createCrewDeathEffect({
    id: "casualty-1",
    startPosition: [1, 0, 0],
    position: [0.999, 0.04, 0],
    flightSeconds: 1,
    landingSurface: CREW_DEATH_SURFACE_SEA,
    cause: "small-arms",
    arrowEmbedded: true,
    incomingDirection: { x: 1, y: 0 },
    seed: 7,
    variant: 1,
    ...overrides
  });
}

test("crew deaths reuse the overboard flight arc before sinking at sea", () => {
  const casualty = effect();
  casualty.ageSeconds = 0.5;
  const flight = crewDeathEffectFrame(casualty);
  assert.equal(flight.phase, "flight");
  assert.equal(flight.flightProgress, 0.5);
  assert.ok(flight.liftPx < 0);

  casualty.ageSeconds = 1 + CREW_DEATH_SINK_SECONDS / 2;
  const sink = crewDeathEffectFrame(casualty);
  assert.equal(sink.phase, "sink");
  assert.ok(Math.abs(sink.resolutionProgress - 0.5) < 1e-9);
  assert.equal(casualty.arrowEmbedded, true);
});

test("landed casualties burst and expire instead of becoming swimmers", () => {
  const casualty = effect({ landingSurface: CREW_DEATH_SURFACE_LAND });
  casualty.ageSeconds = 1 + CREW_DEATH_LAND_BURST_SECONDS / 2;
  assert.equal(crewDeathEffectFrame(casualty).phase, "burst");
  assert.equal(crewDeathLandBurstPixels(casualty).length, 12);
  assert.deepEqual(crewDeathLandBurstPixels(casualty), crewDeathLandBurstPixels(casualty));

  const survivors = advanceCrewDeathEffects(
    [casualty],
    CREW_DEATH_LAND_BURST_SECONDS / 2
  );
  assert.deepEqual(survivors, []);
});

test("crew death effects reject an ambiguous ejection direction", () => {
  assert.throws(
    () => effect({ incomingDirection: { x: 3, y: 0 } }),
    /not normalized/
  );
});
