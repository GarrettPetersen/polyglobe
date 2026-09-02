import assert from "node:assert/strict";
import test from "node:test";

import {
  SHIP_PROPULSION_SAIL,
  SHIP_STATS,
  shipStatsForSlug
} from "./shipStats.js";
import { WORLD_KINEMATIC_SCALE } from "./worldScale.js";
import {
  HYBRID_ROWING_SPEED_RATIO,
  MAX_EFFECTIVE_ROWERS,
  ROWING_ASTERN_ACCELERATION_RATIO,
  ROWING_ASTERN_SPEED_RATIO,
  ROWING_FOOD_CONSUMPTION_MULTIPLIER,
  SAIL_CLOSE_HAULED_ANGLE_RANGE_RAD,
  SAIL_CLOSE_HAULED_EFFICIENCY,
  SHIP_DRAG_PER_SECOND,
  SHIP_MINIMUM_POWERED_SPEED_RAD,
  SHIP_STALLED_DRAG_MULTIPLIER,
  rowingCrewRatio,
  sailWindSpeedFactor,
  sailingEfficiencyForAlignment,
  shipCanUseOars,
  shipDirectionalTranslationAllowed,
  shipDragFactor,
  shipHasWindDeadZone,
  shipPoweredAccelerationRad,
  shipPropulsionPerformance,
  shipVelocityLimitAfterPropulsion
} from "./shipPropulsion.js";

test("powered thrust compensates ordinary drag so low-acceleration hulls reach hull speed", () => {
  const carrack = shipStatsForSlug("ship-of-the-line");
  const targetSpeed = carrack.topSpeedRad;
  const dt = 1 / 60;
  let speed = 0;
  for (let frame = 0; frame < 60 * 30; frame++) {
    const acceleration = shipPoweredAccelerationRad({
      baseAccelerationRad: carrack.accelerationRad,
      speedTowardThrustRad: speed,
      poweredSpeedLimitRad: targetSpeed
    });
    speed = Math.min(targetSpeed, (speed + acceleration * dt) * shipDragFactor(false, dt));
  }
  assert.ok(speed >= targetSpeed * 0.99, `${speed} should approach ${targetSpeed}`);
});

test("sail power stays restrained in light airs and approaches hull speed in a strong breeze", () => {
  assert.equal(SHIP_MINIMUM_POWERED_SPEED_RAD, 0.006 * WORLD_KINEMATIC_SCALE);
  assert.equal(sailWindSpeedFactor(0), 0.08);
  assert.ok(sailWindSpeedFactor(0.2) < 0.18);
  assert.equal(sailWindSpeedFactor(0.5), 0.54);
  assert.ok(sailWindSpeedFactor(0.8) > 0.9);
  assert.equal(sailWindSpeedFactor(1), 1);
  assert.equal(sailWindSpeedFactor(2), 1);
});

test("light wind keeps every sail-only hull below half speed", () => {
  for (const stats of SHIP_STATS.filter((entry) => entry.propulsion === SHIP_PROPULSION_SAIL)) {
    const performance = shipPropulsionPerformance(stats, {
      windStrength: 0.2,
      sailEfficiency: 1,
      minimumSailSpeed: SHIP_MINIMUM_POWERED_SPEED_RAD
    });
    assert.ok(
      performance.maxSpeedRad < stats.topSpeedRad * 0.5,
      `${stats.slug} reaches ${(performance.maxSpeedRad / stats.topSpeedRad).toFixed(3)} hull speed`
    );
  }
});

test("world and lake sailing share one drag curve", () => {
  assert.equal(shipDragFactor(false, 1), Math.exp(-SHIP_DRAG_PER_SECOND));
  assert.equal(
    shipDragFactor(true, 1),
    Math.exp(-SHIP_DRAG_PER_SECOND * SHIP_STALLED_DRAG_MULTIPLIER)
  );
  assert.ok(shipDragFactor(true, 1) < shipDragFactor(false, 1));
});

test("propulsion limits preserve externally imparted motion through drag", () => {
  const dragFactor = shipDragFactor(true, 1 / 60);
  const whaleTowSpeed = 0.012;

  assert.equal(
    shipVelocityLimitAfterPropulsion({
      poweredSpeedLimitRad: 0,
      priorSpeedRad: whaleTowSpeed,
      dragFactor
    }),
    whaleTowSpeed * dragFactor
  );
  assert.equal(
    shipVelocityLimitAfterPropulsion({
      poweredSpeedLimitRad: 0.008,
      priorSpeedRad: 0,
      dragFactor
    }),
    0.008
  );
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
  assert.equal(sailing.rowing, true);
  assert.ok(sailing.maxSpeedRad > rowing.maxSpeedRad * 2);
});

test("oar craft can back water without reversing their sails", () => {
  const canoe = shipStatsForSlug("mesoamerican-dugout-canoe");
  const galley = shipStatsForSlug("mediterranean-galley");
  const canoeAstern = shipPropulsionPerformance(canoe, {
    windStrength: 1,
    sailEfficiency: 1,
    rowingDirection: -1
  });
  const galleyAstern = shipPropulsionPerformance(galley, {
    windStrength: 1,
    sailEfficiency: 1,
    rowingDirection: -1
  });

  assert.equal(canoeAstern.propulsionDirection, -1);
  assert.equal(canoeAstern.maxSpeedRad, canoe.topSpeedRad * ROWING_ASTERN_SPEED_RATIO);
  assert.equal(canoeAstern.accelerationFactor, ROWING_ASTERN_ACCELERATION_RATIO);
  assert.equal(galleyAstern.propulsionDirection, -1);
  assert.equal(
    galleyAstern.maxSpeedRad,
    galley.topSpeedRad * HYBRID_ROWING_SPEED_RATIO * ROWING_ASTERN_SPEED_RATIO
  );
  assert.ok(galleyAstern.maxSpeedRad < galley.topSpeedRad * HYBRID_ROWING_SPEED_RATIO);
});

test("only oared ships translate toward an aft directional input", () => {
  const brigantine = shipStatsForSlug("brigantine");
  const galley = shipStatsForSlug("mediterranean-galley");

  assert.equal(shipDirectionalTranslationAllowed(brigantine, -1), false);
  assert.equal(shipDirectionalTranslationAllowed(brigantine, -0.01), false);
  assert.equal(shipDirectionalTranslationAllowed(brigantine, 0), true);
  assert.equal(shipDirectionalTranslationAllowed(brigantine, 1), true);
  assert.equal(shipDirectionalTranslationAllowed(galley, -1), true);
  assert.throws(
    () => shipDirectionalTranslationAllowed(brigantine, -1.01),
    /Invalid directional translation alignment/
  );
});

test("hybrid oars add speed and acceleration without cancelling stronger sails", () => {
  const galley = shipStatsForSlug("mediterranean-galley");
  const sailingOnly = shipPropulsionPerformance(galley, {
    windStrength: 0.65,
    sailEfficiency: 1,
    rowingRequested: false
  });
  const sailingAndRowing = shipPropulsionPerformance(galley, {
    windStrength: 0.65,
    sailEfficiency: 1,
    rowingRequested: true
  });

  assert.equal(sailingOnly.rowing, false);
  assert.equal(sailingAndRowing.rowing, true);
  assert.ok(sailingAndRowing.maxSpeedRad > sailingOnly.maxSpeedRad);
  assert.equal(sailingAndRowing.maxSpeedRad, galley.topSpeedRad);
  assert.ok(sailingAndRowing.accelerationFactor > sailingOnly.accelerationFactor);
});

test("hull speed caps strong sails and combined oar-sail thrust", () => {
  const brigantine = shipStatsForSlug("brigantine");
  const fusta = shipStatsForSlug("fusta");
  const galeDrivenBrigantine = shipPropulsionPerformance(brigantine, {
    windStrength: 2,
    sailEfficiency: 1
  });
  const rowingFusta = shipPropulsionPerformance(fusta, {
    windStrength: 1,
    sailEfficiency: 1,
    rowingRequested: true
  });

  assert.equal(galeDrivenBrigantine.maxSpeedRad, brigantine.topSpeedRad);
  assert.equal(rowingFusta.maxSpeedRad, fusta.topSpeedRad);
});

test("oars stop producing power when directional input is released", () => {
  const canoe = shipStatsForSlug("mesoamerican-dugout-canoe");
  const galley = shipStatsForSlug("mediterranean-galley");
  const canoeCoasting = shipPropulsionPerformance(canoe, {
    windStrength: 0.8,
    sailEfficiency: 0,
    rowingRequested: false
  });
  const galleySailing = shipPropulsionPerformance(galley, {
    windStrength: 0.8,
    sailEfficiency: 0.4,
    rowingRequested: false
  });

  assert.equal(canoeCoasting.rowing, false);
  assert.equal(canoeCoasting.accelerationFactor, 0);
  assert.equal(canoeCoasting.maxSpeedRad, 0);
  assert.equal(canoeCoasting.stalled, true);
  assert.equal(galleySailing.rowing, false);
  assert.ok(galleySailing.maxSpeedRad > 0);
});

test("oar-sail ships combine weak wind with their oars", () => {
  const galley = shipStatsForSlug("mediterranean-galley");
  const performance = shipPropulsionPerformance(galley, {
    windStrength: 0.025,
    sailEfficiency: 1,
    minimumSailSpeed: SHIP_MINIMUM_POWERED_SPEED_RAD
  });

  assert.equal(performance.rowing, true);
  assert.equal(performance.stalled, false);
  assert.ok(performance.maxSpeedRad > galley.topSpeedRad * HYBRID_ROWING_SPEED_RATIO);
});

test("oar-sail ships combine oars with inefficient non-stalled sails", () => {
  const galley = shipStatsForSlug("mediterranean-galley");
  const sailingOnly = shipPropulsionPerformance(galley, {
    windStrength: 0.8,
    sailEfficiency: 0.4,
    minimumSailSpeed: SHIP_MINIMUM_POWERED_SPEED_RAD,
    rowingRequested: false
  });
  const combined = shipPropulsionPerformance(galley, {
    windStrength: 0.8,
    sailEfficiency: 0.4,
    minimumSailSpeed: SHIP_MINIMUM_POWERED_SPEED_RAD
  });

  assert.equal(combined.rowing, true);
  assert.equal(combined.stalled, false);
  assert.ok(combined.maxSpeedRad > sailingOnly.maxSpeedRad);
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

test("rowing crew power rises to a capped twenty-rower complement", () => {
  assert.equal(MAX_EFFECTIVE_ROWERS, 20);
  assert.equal(rowingCrewRatio(0, 40), 0);
  assert.equal(rowingCrewRatio(5, 40), 0.25);
  assert.equal(rowingCrewRatio(10.5, 40), 0.525);
  assert.equal(rowingCrewRatio(20, 40), 1);
  assert.equal(rowingCrewRatio(40, 40), 1);
  assert.equal(rowingCrewRatio(3, 3), 1);
  assert.equal(ROWING_FOOD_CONSUMPTION_MULTIPLIER, 1.15);
});

test("oar capability is explicit for pure and hybrid craft", () => {
  assert.equal(shipCanUseOars(shipStatsForSlug("mesoamerican-dugout-canoe")), true);
  assert.equal(shipCanUseOars(shipStatsForSlug("mediterranean-galley")), true);
  assert.equal(shipCanUseOars(shipStatsForSlug("brigantine")), false);
});

test("a depleted hybrid crew still adds its remaining oar power to stronger sails", () => {
  const galley = shipStatsForSlug("mediterranean-galley");
  const sailingOnly = shipPropulsionPerformance(galley, {
    windStrength: 1,
    sailEfficiency: 0.45,
    rowerRatio: 0.1,
    rowingRequested: false
  });
  const combined = shipPropulsionPerformance(galley, {
    windStrength: 1,
    sailEfficiency: 0.45,
    rowerRatio: 0.1
  });

  assert.equal(combined.rowing, true);
  assert.equal(combined.stalled, false);
  assert.ok(combined.maxSpeedRad > sailingOnly.maxSpeedRad);
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
