import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { haulFlatBattleShipAlongShore } from "./flatBattleShoreHauling.js";
import { advanceFlatBattleShipKinematics } from "./flatBattleShipMotion.js";
import { shipStatsForSlug } from "./shipStats.js";
import { SHIP_ROWING_MODE_IDLE } from "./shipRowingAnimation.js";

function ship() {
  const stats = shipStatsForSlug("galleon");
  return { x: 0.1, y: 0, stats, headingRad: Math.PI, speedPx: 0, crew: stats.crewCapacity,
    woundedCrew: 0, tackSide: 0, playerControlled: true, role: "galleon", sideId: "player" };
}
function haul(vessel, overrides = {}) {
  return haulFlatBattleShipAlongShore({ ship: vessel, dt: 0.1, desiredHeadingRad: 0,
    previousX: vessel.x, previousY: vessel.y, canOccupy: (x, y) => x >= 0, ...overrides });
}

test("a stalled ship can haul away from shore without first turning its bow", () => {
  const vessel = ship();
  for (let i = 0; i < 10; i++) haul(vessel);
  assert.ok(vessel.x > 5);
  assert.equal(vessel.headingRad, Math.PI);
});
test("hauling slides along a bank and never takes the hull through it", () => {
  const vessel = ship();
  for (let i = 0; i < 30; i++) {
    haul(vessel, { desiredHeadingRad: Math.PI });
    assert.ok(vessel.x >= 0);
  }
  assert.ok(Math.abs(vessel.y) > 10);
});
test("no input, no crew, and open water do not produce hauling", () => {
  for (const overrides of [{ desiredHeadingRad: null }, { canOccupy: () => true }]) {
    const vessel = ship();
    assert.equal(haul(vessel, overrides), 0);
    assert.equal(vessel.x, 0.1);
  }
  const vessel = ship();
  vessel.woundedCrew = vessel.crew;
  assert.equal(haul(vessel), 0);
});
test("hauling adds no speed to a ship already making progress and stops beyond reach of shore", () => {
  const vessel = ship();
  assert.equal(haul(vessel, { previousX: -1 }), 0);
  vessel.x = 10;
  assert.equal(haul(vessel), 0);
});
test("swept hauling cannot tunnel across a thin strip of land or an enclosed bank", () => {
  const vessel = ship();
  const inside = (x, y) => x >= 0 && x < 0.4 && Math.abs(y) < 0.2;
  assert.equal(haul(vessel, { dt: 1, canOccupy: inside }), 0);
  assert.equal(vessel.x, 0.1);
  assert.throws(() => haul(vessel, { dt: NaN }), /finite motion/);
});

for (const arena of ["lakeBattle", "historicalBattle"]) {
  test(`${arena} player motion actually applies shoreline hauling while stalled`, () => {
    const file = ts.createSourceFile(`${arena}.js`, readFileSync(new URL(`./${arena}.js`, import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
    const name = arena === "lakeBattle" ? "updateBattleShipMotion" : "moveShipWithStandardPropulsion";
    const code = file.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name).getText(file);
    const vessel = ship();
    const water = (x, y) => x >= 0;
    const context = {
      advanceFlatBattleShipKinematics, haulFlatBattleShipAlongShore,
      nudgeLakeBattleShipTowardClearWater() {}, moveShipInsideLake: () => 0,
      lakeBattleShipFitsInWater: (_state, _ship, x, y) => water(x, y), updateFlatBattleShipWake() {},
      HISTORICAL_BATTLE_FIXED_STEP_SECONDS: 0.05,
      historicalBattleMapEscapeAt: () => false,
      historicalBattleMapWaterAt: (_map, x, y) => water(x, y), updateHistoricalShipWake() {}
    };
    const move = runInNewContext(`${code}; ${name}`, context);
    const state = { wind: { directionRad: Math.PI, strength: 0 }, map: {} };
    for (let i = 0; i < 20; i++) {
      if (arena === "lakeBattle") move(state, vessel, 0, SHIP_ROWING_MODE_IDLE, 0.05, { hauling: true });
      else move(state, vessel, 0, SHIP_ROWING_MODE_IDLE);
    }
    assert.ok(vessel.x > 4, `moved away from the bank: ${vessel.x}`);
    const stoppedAt = vessel.x;
    if (arena === "lakeBattle") move(state, vessel, null, SHIP_ROWING_MODE_IDLE, 0.05, { hauling: true });
    else move(state, vessel, null, SHIP_ROWING_MODE_IDLE);
    assert.equal(vessel.x, stoppedAt, "releasing the steering input stops hauling");
  });
}
