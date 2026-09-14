import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

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

test("casualties and rescuable sailors share white sprites at the original size", () => {
  const main = readFileSync(new URL("./main.js", import.meta.url), "utf8");
  const source = (name) => {
    const start = main.indexOf(`function ${name}(`);
    assert.ok(start >= 0);
    return main.slice(start, main.indexOf("\nfunction ", start));
  };
  const draws = [];
  const runtime = {
    CREW_STATUS_ICON_WIDTH: 3, CREW_STATUS_ICON_HEIGHT: 6,
    tintStatusIconImage: (source, width, height, color) => ({ source, width, height, color }),
    crewDeathEffects: [effect({ arrowEmbedded: false })],
    crewDeathEffectFrame,
    crewDeathEffectScreenPoint: () => ({ x: 50, y: 40 }),
    overboardCrew: [{ ageSeconds: 0, flightSeconds: 1 }],
    overboardCrewScreenPoint: () => ({ x: 50, y: 40 }),
    drawOverboardSplash: () => {},
    pointNearScreen: () => true,
    worldRenderer: { drawAtlasSprite: (draw) => draws.push(draw) }
  };
  runInNewContext([
    source("createWorldCrewImage"), source("drawCrewDeathEffectsWebGL"), source("drawOverboardCrewWebGL")
  ].join("\n"), runtime);
  runtime.worldCrewImage = runtime.createWorldCrewImage({});
  runtime.drawCrewDeathEffectsWebGL(0, {});
  assert.equal(draws.length, 1);
  assert.equal(draws[0].source.color, "#ffffff");
  assert.equal(draws[0].destinationRect.width, 3);
  assert.equal(draws[0].destinationRect.height, 6);
  assert.equal(draws[0].alpha, 1);
  draws.length = 0;
  runtime.drawOverboardCrewWebGL(0, {});
  assert.equal(draws.length, 1);
  assert.equal(draws[0].source, runtime.worldCrewImage);
  assert.equal(draws[0].destinationRect.width, 3);
  assert.equal(draws[0].destinationRect.height, 6);
  draws.length = 0;
  runtime.overboardCrew[0].ageSeconds = 1;
  runtime.drawOverboardCrewWebGL(1000, {});
  assert.equal(draws.length, 2);
  assert.ok(draws.every((draw) => draw.source === runtime.worldCrewImage));
  assert.equal(draws[0].destinationRect.height + draws[1].destinationRect.height, 6);
  assert.equal(draws[1].alpha, 0.44);
});
