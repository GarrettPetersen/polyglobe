import assert from "node:assert/strict";
import test from "node:test";

import { shipStatsForSlug } from "./shipStats.js";
import {
  HYBRID_ROWING_SPEED_RATIO,
  SAIL_CLOSE_HAULED_ANGLE_RANGE_RAD,
  SAIL_CLOSE_HAULED_EFFICIENCY,
  SHIP_DRAG_PER_SECOND,
  SHIP_MINIMUM_POWERED_SPEED_RAD,
  SHIP_STALLED_DRAG_MULTIPLIER,
  sailingEfficiencyForAlignment,
  shipDragFactor,
  shipHasWindDeadZone,
  shipPropulsionPerformance
} from "./shipPropulsion.js";

test("world and lake sailing share one drag curve", () => {
  assert.equal(shipDragFactor(false, 1), Math.exp(-SHIP_DRAG_PER_SECOND));
  assert.equal(
    shipDragFactor(true, 1),
    Math.exp(-SHIP_DRAG_PER_SECOND * SHIP_STALLED_DRAG_MULTIPLIER)
  );
  assert.ok(shipDragFactor(true, 1) < shipDragFactor(false, 1));
});

test("the shared sail curve stalls upwind and peaks across the wind", () => {
  const brigantine = shipStatsForSlug("brigantine");
  assert.equal(sailingEfficiencyForAlignment(brigantine, -1), 0);
  assert.equal(sailingEfficiencyForAlignment(brigantine, 0), 1);
  assert.ok(sailingEfficiencyForAlignment(brigantine, 1) > 0);
});

test("ships now make progress inside their former upwind boundary", () => {
  const brigantine = shipStatsForSlug("brigantine");
  const oldBoundaryAngle = 35 * Math.PI / 180;
  const currentBoundaryAngle = brigantine.upwindStallAngleRad;

  assert.ok(sailingEfficiencyForAlignment(brigantine, -Math.cos(oldBoundaryAngle)) > 0);
  assert.equal(sailingEfficiencyForAlignment(brigantine, -Math.cos(currentBoundaryAngle)), 0);
});

test("close-hauled ships reach useful power soon after clearing the no-go zone", () => {
  const brigantine = shipStatsForSlug("brigantine");
  const courseAngle = brigantine.upwindStallAngleRad + 6 * Math.PI / 180;
  const efficiency = sailingEfficiencyForAlignment(brigantine, -Math.cos(courseAngle));

  assert.equal(SAIL_CLOSE_HAULED_ANGLE_RANGE_RAD, Math.PI / 15);
  assert.equal(SAIL_CLOSE_HAULED_EFFICIENCY, 0.46);
  assert.ok(efficiency >= 0.22);
  assert.ok(efficiency < SAIL_CLOSE_HAULED_EFFICIENCY);
});

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
  const galley = shipStatsForSlug("mediterranean-galley");
  const rowing = shipPropulsionPerformance(galley, {
    windStrength: 0.8,
    sailEfficiency: 0
  });
  const sailing = shipPropulsionPerformance(galley, {
    windStrength: 1,
    sailEfficiency: 1
  });

  assert.equal(shipHasWindDeadZone(galley), false);
  assert.equal(rowing.stalled, false);
  assert.equal(rowing.rowing, true);
  assert.equal(rowing.maxSpeedRad, galley.topSpeedRad * HYBRID_ROWING_SPEED_RATIO);
  assert.equal(sailing.rowing, false);
  assert.ok(sailing.maxSpeedRad > rowing.maxSpeedRad * 2);
});

test("oar-sail ships row whenever weak wind would be slower than their oars", () => {
  const galley = shipStatsForSlug("mediterranean-galley");
  const performance = shipPropulsionPerformance(galley, {
    windStrength: 0.025,
    sailEfficiency: 1,
    minimumSailSpeed: SHIP_MINIMUM_POWERED_SPEED_RAD
  });

  assert.equal(performance.rowing, true);
  assert.equal(performance.stalled, false);
  assert.equal(performance.maxSpeedRad, galley.topSpeedRad * HYBRID_ROWING_SPEED_RATIO);
});

test("oar-sail ships row on inefficient non-stalled headings when rowing is faster", () => {
  const galley = shipStatsForSlug("mediterranean-galley");
  const performance = shipPropulsionPerformance(galley, {
    windStrength: 0.8,
    sailEfficiency: 0.4,
    minimumSailSpeed: SHIP_MINIMUM_POWERED_SPEED_RAD
  });

  assert.equal(performance.rowing, true);
  assert.equal(performance.stalled, false);
  assert.equal(performance.maxSpeedRad, galley.topSpeedRad * HYBRID_ROWING_SPEED_RATIO);
});

test("the minimum powered speed remains available to sail-only ships", () => {
  const brigantine = shipStatsForSlug("brigantine");
  const performance = shipPropulsionPerformance(brigantine, {
    windStrength: 0,
    sailEfficiency: 0.01,
    minimumSailSpeed: SHIP_MINIMUM_POWERED_SPEED_RAD
  });

  assert.equal(performance.rowing, false);
  assert.equal(performance.stalled, false);
  assert.ok(performance.maxSpeedRad >= SHIP_MINIMUM_POWERED_SPEED_RAD);
});

test("rowing power falls gracefully as an oar crew is depleted", () => {
  const canoe = shipStatsForSlug("mesoamerican-dugout-canoe");
  const fullCrew = shipPropulsionPerformance(canoe, {
    windStrength: 0.8,
    sailEfficiency: 0,
    rowerRatio: 1
  });
  const quarterCrew = shipPropulsionPerformance(canoe, {
    windStrength: 0.8,
    sailEfficiency: 0,
    rowerRatio: 0.25
  });

  assert.equal(quarterCrew.rowing, true);
  assert.equal(quarterCrew.maxSpeedRad, fullCrew.maxSpeedRad * 0.5);
  assert.equal(quarterCrew.accelerationFactor, fullCrew.accelerationFactor * 0.5);
});

test("a depleted hybrid crew still uses its sails when they are stronger", () => {
  const galley = shipStatsForSlug("mediterranean-galley");
  const performance = shipPropulsionPerformance(galley, {
    windStrength: 1,
    sailEfficiency: 0.45,
    rowerRatio: 0.1
  });

  assert.equal(performance.rowing, false);
  assert.equal(performance.stalled, false);
  assert.ok(performance.maxSpeedRad > 0);
});

test("an oar craft with no living crew cannot propel itself", () => {
  const canoe = shipStatsForSlug("mesoamerican-dugout-canoe");
  const performance = shipPropulsionPerformance(canoe, {
    windStrength: 1,
    sailEfficiency: 0,
    rowerRatio: 0
  });

  assert.equal(performance.rowing, false);
  assert.equal(performance.stalled, true);
  assert.equal(performance.maxSpeedRad, 0);
  assert.equal(performance.accelerationFactor, 0);
});

test("sampans must tack because their current sprite has no rowing mode", () => {
  const sampan = shipStatsForSlug("sampan");
  const performance = shipPropulsionPerformance(sampan, {
    windStrength: 0.8,
    sailEfficiency: 0
  });

  assert.equal(shipHasWindDeadZone(sampan), true);
  assert.equal(performance.stalled, true);
  assert.equal(performance.rowing, false);
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
