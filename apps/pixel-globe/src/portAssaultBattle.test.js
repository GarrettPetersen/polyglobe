import test from "node:test";
import assert from "node:assert/strict";
import {
  PORT_ASSAULT_OUTCOME,
  createPortAssaultScenario,
  forecastPortAssault,
  portAssaultGarrisonCount,
  portAssaultPresentationAt,
  portAssaultUnitStats,
  simulatePortAssault
} from "./portAssaultBattle.js";

function combatant(id, crewTypeId = "swordsman", experienceStars = 1, auxiliary = false) {
  return { id, appearanceId: `${crewTypeId}-appearance`, crewTypeId, experienceStars, auxiliary };
}

function scenario({ attackerCount = 8, defenderCount = 8, dockKind = "wood", fortified = true } = {}) {
  return createPortAssaultScenario({
    cityId: "lisbon|portugal",
    attackers: Array.from({ length: attackerCount }, (_, index) => combatant(`crew-${index}`)),
    defenders: Array.from({ length: defenderCount }, (_, index) => combatant(`guard-${index}`)),
    shipHitPoints: 80,
    dockKind,
    fortified
  });
}

test("assault simulation is repeatable for one seed and varies across real battle seeds", () => {
  const input = scenario();
  const repeated = simulatePortAssault(input, 42, { collectPresentation: false });
  assert.deepEqual(repeated, simulatePortAssault(input, 42, { collectPresentation: false }));
  const outcomes = new Set();
  const casualties = new Set();
  for (let seed = 1; seed <= 60; seed += 1) {
    const result = simulatePortAssault(input, seed, { collectPresentation: false });
    outcomes.add(result.outcome);
    casualties.add(result.attackerCasualtyIds.length);
  }
  assert.deepEqual(outcomes, new Set([PORT_ASSAULT_OUTCOME.VICTORY, PORT_ASSAULT_OUTCOME.DEFEAT]));
  assert.ok(casualties.size >= 3);
});

test("forecast reports the distribution produced by the same battle rules", () => {
  const forecast = forecastPortAssault(scenario(), { seedKey: "voyage-1|lisbon|day-12", sampleCount: 64 });
  assert.ok(forecast.successPercent > 0 && forecast.successPercent < 100);
  assert.ok(forecast.expectedCasualties > 0);
  assert.ok(forecast.casualtyRangeLow <= forecast.expectedCasualties);
  assert.ok(forecast.casualtyRangeHigh >= forecast.expectedCasualties);
  assert.equal(forecast.sampleCount, 64);
});

test("experience, arms, and armour modify concrete combat stats", () => {
  const novice = portAssaultUnitStats(combatant("novice", "gunner", 0));
  const master = portAssaultUnitStats(combatant("master", "gunner", 3), {
    meleeDamageMultiplier: 1,
    arrowDamageMultiplier: 1,
    firearmDamageMultiplier: 1.2,
    defenseMultiplier: 1.15,
    hitPointsMultiplier: 1.1
  });
  assert.ok(master.attack > novice.attack);
  assert.ok(master.defense > novice.defense);
  assert.ok(master.hitPoints > novice.hitPoints);
});

test("shield blocks negate damage and are represented in the battle timeline", () => {
  const input = createPortAssaultScenario({
    cityId: "rhodes|ottoman",
    attackers: [combatant("attacker", "swordsman", 3)],
    defenders: [combatant("shield", "shieldman", 3)],
    shipHitPoints: 100,
    dockKind: "stone",
    fortified: true
  });
  const results = Array.from({ length: 20 }, (_, index) => simulatePortAssault(input, index + 1));
  assert.ok(results.some((result) => result.events.some((event) => event.type === "block")));
  const battle = results[0];
  const presentation = portAssaultPresentationAt(battle, Math.min(1000, battle.durationMs));
  assert.ok(Array.isArray(presentation.units));
});

test("garrisons scale with population and capitals but remain bounded", () => {
  const village = portAssaultGarrisonCount({ population: 1000 });
  const city = portAssaultGarrisonCount({ population: 100000 });
  const capital = portAssaultGarrisonCount({ population: 100000, isFactionCapital: true });
  assert.ok(village < city);
  assert.ok(city < capital);
  assert.ok(capital <= 24);
});

test("combat contracts reject duplicate IDs and unknown unit types", () => {
  assert.throws(() => createPortAssaultScenario({
    cityId: "lisbon|portugal",
    attackers: [combatant("same"), combatant("same")],
    defenders: [combatant("guard")],
    shipHitPoints: 20,
    dockKind: "wood",
    fortified: true
  }), /Duplicate/);
  assert.throws(() => portAssaultUnitStats(combatant("bad", "wizard")), /Unknown/);
});
