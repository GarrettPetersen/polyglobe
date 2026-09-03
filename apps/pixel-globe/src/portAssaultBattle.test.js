import test from "node:test";
import assert from "node:assert/strict";
import {
  PORT_ASSAULT_OUTCOME,
  PORT_ASSAULT_MAX_GARRISON,
  PORT_ASSAULT_MIN_GARRISON,
  PORT_ASSAULT_PROFILE_ID,
  createPortAssaultScenario,
  forecastPortAssault,
  portAssaultAttackProfileAtDistance,
  portAssaultDamageAfterMitigation,
  portAssaultGarrisonCount,
  portAssaultKnockbackDistance,
  portAssaultLandingDurationMs,
  portAssaultPresentationAt,
  portAssaultShipHitPointsAt,
  portAssaultShipImpactShakeAt,
  portAssaultUnitStats,
  simulatePortAssault
} from "./portAssaultBattle.js";
import { shipStatsForSlug } from "./shipStats.js";
import {
  cityCombatProfileForAppearance,
  cityCrewTypeForAppearance,
  cityGarrisonAppearanceIds
} from "../city-visualizer/cityPeople.js";

function combatant(
  id,
  crewTypeId = "swordsman",
  experienceStars = 1,
  auxiliary = false,
  combatProfileId = crewTypeId
) {
  return {
    id,
    appearanceId: `${crewTypeId}-appearance`,
    crewTypeId,
    combatProfileId,
    experienceStars,
    auxiliary
  };
}

function scenario({ attackerCount = 8, defenderCount = 8, dockKind = "wood", fortified = true } = {}) {
  return createPortAssaultScenario({
    cityId: "lisbon|portugal",
    attackers: Array.from({ length: attackerCount }, (_, index) => combatant(`crew-${index}`)),
    defenders: Array.from({ length: defenderCount }, (_, index) => combatant(`guard-${index}`)),
    shipHitPoints: 80,
    shipMaxHitPoints: 100,
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
    armorCoverageBonus: 0.16
  });
  assert.ok(master.attack > novice.attack);
  assert.ok(master.defense > novice.defense);
  assert.ok(master.hitPoints > novice.hitPoints);
  assert.ok(master.armorCoverage > novice.armorCoverage);
});

test("matchlocks trade the hardest ranged hit for the slowest reload", () => {
  const hunter = portAssaultUnitStats(combatant("hunter", "hunter", 0));
  const archer = portAssaultUnitStats(combatant("archer", "archer", 0));
  const crossbowman = portAssaultUnitStats(combatant("crossbowman", "crossbowman", 0));
  const gunner = portAssaultUnitStats(combatant("gunner", "gunner", 0));

  assert.ok(gunner.attack > crossbowman.attack * 1.5);
  assert.ok(hunter.cooldownMs < archer.cooldownMs);
  assert.ok(archer.cooldownMs < crossbowman.cooldownMs);
  assert.ok(crossbowman.cooldownMs < gunner.cooldownMs);
  assert.ok(gunner.cooldownMs >= 6000);
});

test("ranged combatants switch to an independently tuned melee attack up close", () => {
  const gunner = portAssaultUnitStats(combatant("gunner", "gunner", 0));
  const firearm = portAssaultAttackProfileAtDistance(gunner, 0.12);
  const closeAttack = portAssaultAttackProfileAtDistance(gunner, 0.02);

  assert.equal(firearm.attackType, "firearm");
  assert.equal(closeAttack.attackType, "melee");
  assert.ok(closeAttack.attack < firearm.attack);
  assert.ok(closeAttack.cooldownMs < firearm.cooldownMs);
  assert.throws(() => portAssaultAttackProfileAtDistance(gunner, -0.1), /distance/);

  const closeBattle = simulatePortAssault(createPortAssaultScenario({
    cityId: "london|england",
    attackers: [combatant("archer", "archer", 1)],
    defenders: [combatant("shield", "shieldman", 3)],
    shipHitPoints: 100,
    shipMaxHitPoints: 100,
    dockKind: "wood",
    fortified: true
  }), 1);
  const archerAttackTypes = closeBattle.events
    .filter((event) => event.type === "attack" && event.unitId === "archer")
    .map((event) => event.attackType);
  assert.ok(archerAttackTypes.includes("arrow"));
  assert.ok(archerAttackTypes.includes("melee"));
});

test("culture-specific profiles give cavalry, ronin, samurai, and tribal spearmen distinct identities", () => {
  const cavalier = portAssaultUnitStats(combatant(
    "cavalier",
    "swordsman",
    0,
    false,
    PORT_ASSAULT_PROFILE_ID.CAVALIER
  ));
  const samurai = portAssaultUnitStats(combatant(
    "samurai",
    "samurai",
    0,
    false,
    PORT_ASSAULT_PROFILE_ID.SAMURAI
  ));
  const ronin = portAssaultUnitStats(combatant(
    "ronin",
    "ronin",
    0,
    false,
    PORT_ASSAULT_PROFILE_ID.RONIN
  ));
  const tribalSpearman = portAssaultUnitStats(combatant(
    "tribal",
    "warrior",
    0,
    false,
    PORT_ASSAULT_PROFILE_ID.TRIBAL_SPEARMAN
  ));

  assert.ok(cavalier.movementPerSecond > samurai.movementPerSecond);
  assert.ok(cavalier.attack > samurai.attack);
  assert.ok(cavalier.defense > samurai.defense);
  assert.ok(samurai.attack > ronin.attack);
  assert.ok(samurai.defense > ronin.defense);
  assert.ok(samurai.hitPoints > ronin.hitPoints);
  assert.ok(ronin.movementPerSecond > samurai.movementPerSecond);
  assert.equal(ronin.armorCoverage, 0);
  assert.ok(samurai.armorCoverage > ronin.armorCoverage);
  assert.ok(samurai.attack > tribalSpearman.attack);
  assert.ok(tribalSpearman.movementPerSecond > samurai.movementPerSecond);
  assert.ok(tribalSpearman.range > samurai.range);
  assert.ok(cavalier.armorCoverage > samurai.armorCoverage);
  assert.ok(samurai.armorCoverage > portAssaultUnitStats(combatant("sword", "swordsman", 0)).armorCoverage);
  assert.ok(portAssaultUnitStats(combatant("sword", "swordsman", 0)).armorCoverage >
    tribalSpearman.armorCoverage);
  assert.ok(portAssaultUnitStats(combatant("spear", "spearman", 0)).antiMountedDamageMultiplier > 1);
});

test("armour strongly checks arrows while matchlocks retain penetration", () => {
  const common = {
    attackPower: 18,
    targetDefense: 8,
    targetArmorCoverage: 0.8
  };
  const arrowDamage = portAssaultDamageAfterMitigation({
    ...common,
    attackType: "arrow",
    armorPenetration: 0.05
  });
  const matchlockDamage = portAssaultDamageAfterMitigation({
    ...common,
    attackType: "firearm",
    armorPenetration: 0.82
  });

  assert.ok(matchlockDamage > arrowDamage * 2);
  const swordsman = portAssaultUnitStats(combatant("sword", "swordsman", 0));
  const halberdier = portAssaultUnitStats(combatant("halberd", "halberdier", 0));
  assert.ok(halberdier.armorPenetration > swordsman.armorPenetration);
});

test("harder hits and cavalry charge momentum produce longer knockback", () => {
  const glancingArrow = portAssaultKnockbackDistance({ attackType: "arrow", damage: 4 });
  const hardArrow = portAssaultKnockbackDistance({ attackType: "arrow", damage: 12 });
  const standingSword = portAssaultKnockbackDistance({
    attackType: "melee",
    damage: 12,
    unitKnockbackMultiplier: 1.4
  });
  const chargingCavalier = portAssaultKnockbackDistance({
    attackType: "melee",
    damage: 20,
    unitKnockbackMultiplier: 1.4,
    chargeKnockbackMultiplier: 3.2
  });

  assert.ok(hardArrow > glancingArrow);
  assert.ok(chargingCavalier > standingSword * 2);

  const chargeBattle = simulatePortAssault(createPortAssaultScenario({
    cityId: "calais|france",
    attackers: [combatant("cavalier", "swordsman", 0, false, PORT_ASSAULT_PROFILE_ID.CAVALIER)],
    defenders: [combatant("tribal", "warrior", 0, false, PORT_ASSAULT_PROFILE_ID.TRIBAL_SPEARMAN)],
    shipHitPoints: 100,
    shipMaxHitPoints: 100,
    dockKind: "wood",
    fortified: false
  }), 7);
  const chargeHit = chargeBattle.events.find((event) =>
    (event.type === "hit" || event.type === "death") && event.attackerId === "cavalier"
  );
  assert.ok(chargeHit.chargeMomentum > 0.5);
  assert.ok(Math.abs(chargeHit.knockbackPositionDelta) > 0.04);
});

test("shield blocks negate damage and are represented in the battle timeline", () => {
  const input = createPortAssaultScenario({
    cityId: "rhodes|ottoman",
    attackers: [combatant("attacker", "swordsman", 3)],
    defenders: [combatant("shield", "shieldman", 3)],
    shipHitPoints: 100,
    shipMaxHitPoints: 100,
    dockKind: "stone",
    fortified: true
  });
  const results = Array.from({ length: 20 }, (_, index) => simulatePortAssault(input, index + 1));
  assert.ok(results.some((result) => result.events.some((event) => event.type === "block")));
  const battle = results[0];
  const presentation = portAssaultPresentationAt(battle, Math.min(1000, battle.durationMs));
  assert.ok(Array.isArray(presentation.units));
});

test("a fallen combatant retains the exact start time of its terminal death animation", () => {
  const input = createPortAssaultScenario({
    cityId: "lisbon|portugal",
    attackers: [combatant("master", "swordsman", 3)],
    defenders: [combatant("novice", "sailor", 0)],
    shipHitPoints: 80,
    shipMaxHitPoints: 100,
    dockKind: "wood",
    fortified: false
  });
  const battle = simulatePortAssault(input, 11);
  const death = battle.events.find((event) => event.type === "death");
  assert.ok(death, "the test battle must produce a casualty");
  const presentation = portAssaultPresentationAt(battle, death.timeMs);
  const fallen = presentation.units.find(({ id }) => id === death.unitId);
  assert.equal(fallen.animationId, "death");
  assert.equal(fallen.animationStartedAtMs, death.timeMs);
});

test("attackers remain at the ship until their one-shot landing completes", () => {
  const battle = simulatePortAssault(scenario({ attackerCount: 1, defenderCount: 1 }), 19);
  const jumpEvent = battle.events.find((event) => event.type === "jump");
  const landingEvent = battle.events.find((event) => event.type === "dock-land");
  assert.ok(jumpEvent);
  assert.ok(landingEvent);
  assert.ok(landingEvent.timeMs - jumpEvent.timeMs >= portAssaultLandingDurationMs("wood"));
  const jumpFrames = battle.tracks["crew-0"].filter(({ animationId }) => animationId === "jump");
  assert.ok(jumpFrames.length >= 2);
  assert.ok(jumpFrames.every(({ position }) => position === 0.04));
  assert.ok(jumpFrames.every(({ animationStartedAtMs }) => animationStartedAtMs === jumpEvent.timeMs));
});

test("assault reinforcements deploy in separated three-person waves", () => {
  const battle = simulatePortAssault(scenario({ attackerCount: 12, defenderCount: 12 }), 19);
  const jumpTimes = battle.events
    .filter(({ type }) => type === "jump")
    .map(({ timeMs }) => timeMs);
  assert.equal(jumpTimes.length, 12);
  for (let waveStart = 3; waveStart < jumpTimes.length; waveStart += 3) {
    assert.ok(jumpTimes[waveStart] - jumpTimes[waveStart - 1] >= 700);
  }
});

test("ship damage presentation retains current and maximum hull and drives a short impact shake", () => {
  const battle = simulatePortAssault(scenario({ attackerCount: 1, defenderCount: 8 }), 4);
  const hit = battle.events.find(({ type }) => type === "ship-hit");
  assert.ok(hit, "the test battle must reach and damage the ship");
  assert.equal(battle.outcome, PORT_ASSAULT_OUTCOME.DEFEAT);
  assert.equal(battle.finalShipHitPoints, 0);
  const hullAfterSimultaneousHits = battle.events
    .filter(({ type, timeMs }) => type === "ship-hit" && timeMs === hit.timeMs)
    .at(-1).shipHitPoints;
  const presentation = portAssaultPresentationAt(battle, hit.timeMs);
  assert.equal(presentation.shipHitPoints, hullAfterSimultaneousHits);
  assert.equal(presentation.shipMaxHitPoints, 100);
  assert.equal(portAssaultShipHitPointsAt(battle, hit.timeMs - 1), battle.initialShipHitPoints);
  assert.notDeepEqual(portAssaultShipImpactShakeAt(battle, hit.timeMs), { x: 0, y: 0 });
  const lastHit = battle.events.filter(({ type }) => type === "ship-hit").at(-1);
  assert.deepEqual(portAssaultShipImpactShakeAt(battle, lastHit.timeMs + 220), { x: 0, y: 0 });
  assert.deepEqual(
    portAssaultShipImpactShakeAt(battle, hit.timeMs, { reducedMotion: true }),
    { x: 0, y: 0 }
  );
});

test("successful melee hits displace targets in the attack direction", () => {
  const battle = simulatePortAssault(scenario({ attackerCount: 2, defenderCount: 2 }), 7);
  const meleeHit = battle.events.find((event) =>
    (event.type === "hit" || event.type === "death") && event.attackType === "melee"
  );
  assert.ok(meleeHit, "the test battle must include a successful melee hit");
  assert.notEqual(meleeHit.knockbackPositionDelta, 0);
  const attacker = battle.combatants.find(({ id }) => id === meleeHit.attackerId);
  assert.equal(Math.sign(meleeHit.knockbackPositionDelta), attacker.side === "attacker" ? 1 : -1);
});

test("garrisons scale with population and capitals but remain bounded", () => {
  const village = portAssaultGarrisonCount({ population: 500 });
  const town = portAssaultGarrisonCount({ population: 25_000 });
  const city = portAssaultGarrisonCount({ population: 100_000 });
  const capital = portAssaultGarrisonCount({ population: 100_000, isFactionCapital: true });
  const worldCity = portAssaultGarrisonCount({ population: 680_000, isFactionCapital: true });
  assert.equal(village, PORT_ASSAULT_MIN_GARRISON);
  assert.ok(village < town);
  assert.ok(town < city);
  assert.ok(village < city);
  assert.ok(city < capital);
  assert.equal(worldCity, PORT_ASSAULT_MAX_GARRISON);
});

test("the largest ship crew has an uncertain fight against the strongest garrison benchmark", () => {
  const city = {
    cityId: "istanbul|turkey",
    cityType: "mediterranean",
    country: "Turkey",
    population: 353_846,
    populationProfileId: "islamicate",
    isFactionCapital: true
  };
  const attackerTypes = ["sailor", "swordsman", "gunner", "archer"];
  const attackers = Array.from(
    { length: shipStatsForSlug("ship-of-the-line").crewCapacity },
    (_, index) => combatant(`crew-${index}`, attackerTypes[index % attackerTypes.length], index % 4)
  );
  const defenders = cityGarrisonAppearanceIds(
    city,
    portAssaultGarrisonCount(city),
    "port-assault"
  ).map((appearanceId, index) => combatant(
    `guard-${index}`,
    cityCrewTypeForAppearance(appearanceId),
    2,
    false,
    cityCombatProfileForAppearance(appearanceId)
  ));
  const forecast = forecastPortAssault(createPortAssaultScenario({
    cityId: city.cityId,
    attackers,
    defenders,
    shipHitPoints: shipStatsForSlug("ship-of-the-line").hitPoints,
    shipMaxHitPoints: shipStatsForSlug("ship-of-the-line").hitPoints,
    fortified: true,
    dockKind: "stone"
  }), {
    seedKey: "largest-crew-v-best-garrison",
    sampleCount: 64
  });
  assert.ok(forecast.successPercent >= 40 && forecast.successPercent <= 60);
});

test("combat contracts reject duplicate IDs and unknown unit types", () => {
  assert.throws(() => createPortAssaultScenario({
    cityId: "lisbon|portugal",
    attackers: [combatant("same"), combatant("same")],
    defenders: [combatant("guard")],
    shipHitPoints: 20,
    shipMaxHitPoints: 20,
    dockKind: "wood",
    fortified: true
  }), /Duplicate/);
  assert.throws(() => createPortAssaultScenario({
    cityId: "lisbon|portugal",
    attackers: [combatant("crew")],
    defenders: [combatant("guard")],
    shipHitPoints: 20,
    dockKind: "wood",
    fortified: true
  }), /maximum hit points/);
  assert.throws(() => portAssaultUnitStats(combatant("bad", "wizard")), /Unknown/);
});
