import assert from "node:assert/strict";
import test from "node:test";

import {
  npcLocalResponseSpeedPx,
  npcVisualMovementStepPx
} from "./npcLocalMovement.js";
import { shipStatsForSlug } from "./shipStats.js";

const PIRATE_BRIG = shipStatsForSlug("pirate-brig");

test("local combat movement cannot spend offscreen strategic route progress", () => {
  const ordinary = npcVisualMovementStepPx({
    distancePx: 100,
    maxStepPx: 3,
    routeAdvancePx: 18,
    catchupPx: 2,
    stormResponsePx: 0,
    localResponsePx: 0.25,
    riverRailPx: 0,
    localNavigationActive: false
  });
  const combat = npcVisualMovementStepPx({
    distancePx: 100,
    maxStepPx: 3,
    routeAdvancePx: 18,
    catchupPx: 2,
    stormResponsePx: 0,
    localResponsePx: 0.25,
    riverRailPx: 0,
    localNavigationActive: true
  });
  assert.equal(ordinary, 3);
  assert.equal(combat, 0.25);
});

test("a sailing pirate loses local combat speed head to wind", () => {
  assert.equal(npcLocalResponseSpeedPx(PIRATE_BRIG, {
    windStrength: 0.8,
    sailEfficiency: 0,
    rowerRatio: 1,
    nominalSpeedPx: 8
  }), 0);
  const beamReachSpeed = npcLocalResponseSpeedPx(PIRATE_BRIG, {
    windStrength: 0.8,
    sailEfficiency: 1,
    rowerRatio: 1,
    nominalSpeedPx: 8
  });
  assert.ok(beamReachSpeed > 6 && beamReachSpeed < 8);
});

test("oared local combat speed follows the available rowing crew", () => {
  const canoe = shipStatsForSlug("mesoamerican-dugout-canoe");
  const fullCrew = npcLocalResponseSpeedPx(canoe, {
    windStrength: 0,
    sailEfficiency: 0,
    rowerRatio: 1,
    nominalSpeedPx: 8
  });
  const quarterCrew = npcLocalResponseSpeedPx(canoe, {
    windStrength: 0,
    sailEfficiency: 0,
    rowerRatio: 0.25,
    nominalSpeedPx: 8
  });
  assert.equal(fullCrew, 8);
  assert.equal(quarterCrew, 4);
});
