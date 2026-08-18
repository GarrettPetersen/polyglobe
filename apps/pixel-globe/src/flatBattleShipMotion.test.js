import assert from "node:assert/strict";
import test from "node:test";

import {
  FLAT_BATTLE_PIXELS_PER_RADIAN,
  advanceFlatBattleShipKinematics
} from "./flatBattleShipMotion.js";
import {
  SHIP_ROWING_MODE_AHEAD,
  SHIP_ROWING_MODE_ASTERN,
  SHIP_ROWING_MODE_IDLE,
  SHIP_ROWING_MODE_PIVOT_STARBOARD
} from "./shipRowingAnimation.js";
import { shipStatsForSlug } from "./shipStats.js";

function battleShip(slug, overrides = {}) {
  const stats = shipStatsForSlug(slug);
  return {
    stats,
    headingRad: 0,
    speedPx: 0,
    crew: stats.crewCapacity,
    woundedCrew: 0,
    rowing: false,
    rowingMode: SHIP_ROWING_MODE_IDLE,
    ...overrides
  };
}

test("flat battle modes share deterministic sail and oar kinematics", () => {
  const duelShip = battleShip("mediterranean-galley");
  const historicalShip = battleShip("mediterranean-galley");
  const input = {
    dt: 0.05,
    desiredHeadingRad: Math.PI / 5,
    rowingMode: SHIP_ROWING_MODE_AHEAD,
    windDirectionRad: 0,
    windStrength: 0.32
  };

  const duelResult = advanceFlatBattleShipKinematics({ ship: duelShip, ...input });
  const historicalResult = advanceFlatBattleShipKinematics({ ship: historicalShip, ...input });

  assert.deepEqual(historicalShip, duelShip);
  assert.deepEqual(historicalResult, duelResult);
});

test("shared flat battle oars pivot at low speed and row astern without reversing the bow", () => {
  const pivoting = battleShip("mediterranean-galley");
  advanceFlatBattleShipKinematics({
    ship: pivoting,
    dt: 0.1,
    desiredHeadingRad: Math.PI / 2,
    rowingMode: SHIP_ROWING_MODE_AHEAD,
    windDirectionRad: 0,
    windStrength: 0
  });
  assert.equal(pivoting.rowingMode, SHIP_ROWING_MODE_PIVOT_STARBOARD);
  assert.equal(pivoting.speedPx, 0);
  assert.ok(pivoting.headingRad > 0);

  const backing = battleShip("mediterranean-galley");
  const result = advanceFlatBattleShipKinematics({
    ship: backing,
    dt: 0.5,
    desiredHeadingRad: 0,
    rowingMode: SHIP_ROWING_MODE_ASTERN,
    windDirectionRad: 0,
    windStrength: 0
  });
  assert.equal(backing.headingRad, 0);
  assert.equal(backing.rowingMode, SHIP_ROWING_MODE_ASTERN);
  assert.ok(backing.speedPx < 0);
  assert.ok(Math.cos(result.movementHeadingRad) < 0);
});

test("shared flat battle propulsion respects crew-scaled hull speed", () => {
  const stats = shipStatsForSlug("fusta");
  const fullCrew = battleShip("fusta");
  const shortCrew = battleShip("fusta", { crew: Math.max(1, Math.floor(stats.crewCapacity / 4)) });
  for (let step = 0; step < 200; step++) {
    for (const ship of [fullCrew, shortCrew]) {
      advanceFlatBattleShipKinematics({
        ship,
        dt: 0.05,
        desiredHeadingRad: 0,
        rowingMode: SHIP_ROWING_MODE_AHEAD,
        windDirectionRad: Math.PI,
        windStrength: 0
      });
    }
  }
  assert.ok(fullCrew.speedPx > shortCrew.speedPx);
  assert.ok(fullCrew.speedPx <= stats.topSpeedRad * FLAT_BATTLE_PIXELS_PER_RADIAN + 1e-9);
});
