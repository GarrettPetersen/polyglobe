import assert from "node:assert/strict";
import test from "node:test";

import { shipStatsForSlug } from "./shipStats.js";
import {
  HYBRID_ROWING_SPEED_RATIO,
  shipHasWindDeadZone,
  shipPropulsionPerformance
} from "./shipPropulsion.js";

test("paddled canoes have no dead zone and keep their low speed into the wind", () => {
  const canoe = shipStatsForSlug("mesoamerican-dugout-canoe");
  const performance = shipPropulsionPerformance(canoe, {
    windStrength: 1.1,
    sailEfficiency: 0,
    minimumSailSpeed: 0.001
  });

  assert.equal(shipHasWindDeadZone(canoe), false);
  assert.equal(performance.stalled, false);
  assert.equal(performance.rowing, true);
  assert.equal(performance.maxSpeedRad, canoe.topSpeedRad);
  assert.equal(performance.accelerationFactor, 1);
});

test("oar-sail ships row slowly when their sails cannot make progress", () => {
  const sampan = shipStatsForSlug("sampan");
  const rowing = shipPropulsionPerformance(sampan, {
    windStrength: 0.8,
    sailEfficiency: 0
  });
  const sailing = shipPropulsionPerformance(sampan, {
    windStrength: 1,
    sailEfficiency: 1
  });

  assert.equal(shipHasWindDeadZone(sampan), false);
  assert.equal(rowing.stalled, false);
  assert.equal(rowing.rowing, true);
  assert.equal(rowing.maxSpeedRad, sampan.topSpeedRad * HYBRID_ROWING_SPEED_RATIO);
  assert.equal(sailing.rowing, false);
  assert.ok(sailing.maxSpeedRad > rowing.maxSpeedRad * 2);
});

test("sail-only ships still stall head to wind", () => {
  const brigantine = shipStatsForSlug("brigantine");
  const performance = shipPropulsionPerformance(brigantine, {
    windStrength: 0.8,
    sailEfficiency: 0
  });

  assert.equal(shipHasWindDeadZone(brigantine), true);
  assert.equal(performance.stalled, true);
  assert.equal(performance.rowing, false);
  assert.equal(performance.maxSpeedRad, Infinity);
});
