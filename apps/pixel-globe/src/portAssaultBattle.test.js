import test from "node:test";
import assert from "node:assert/strict";
import {
  PORT_ASSAULT_OUTCOME,
  PORT_ASSAULT_RESULT_PRESENTATION_DURATION_MS,
  PORT_ASSAULT_FIREARM_SMOKE_DURATION_MS,
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
  resolvePortAssaultCrewFates,
  simulatePortAssault
} from "./portAssaultBattle.js";
import { shipStatsForSlug } from "./shipStats.js";
import {
  PORT_ASSAULT_LANE_COUNT,
  PORT_ASSAULT_LANE_SPACING,
  portAssaultBodyRadius,
  portAssaultGroundDistance
} from "./portAssaultFormation.js";
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
    casualties.add(result.attackerDownedIds.length);
  }
  assert.deepEqual(outcomes, new Set([PORT_ASSAULT_OUTCOME.VICTORY, PORT_ASSAULT_OUTCOME.DEFEAT]));
  assert.ok(casualties.size >= 3);
});

test("forecast reports the distribution produced by the same battle rules", () => {
  const forecast = forecastPortAssault(scenario(), { seedKey: "voyage-1|lisbon|day-12", sampleCount: 64 });
  assert.ok(forecast.successPercent > 0 && forecast.successPercent < 100);
  assert.ok(forecast.expectedCasualties > 0);
  assert.ok(forecast.expectedDeaths > 0);
  assert.ok(forecast.expectedWounded > 0);
  assert.equal(
    forecast.expectedCasualties,
    forecast.expectedDeaths + forecast.expectedWounded
  );
  assert.ok(forecast.casualtyRangeLow <= forecast.expectedCasualties);
  assert.ok(forecast.casualtyRangeHigh >= forecast.expectedCasualties);
  assert.equal(forecast.sampleCount, 64);
});

test("land-assault downed crew resolve deterministically into deaths and persistent wounds", () => {
  const combatants = Array.from({ length: 80 }, (_, index) => combatant(
    `crew-${index}`,
    "swordsman",
    index % 4
  ));
  const downedIds = combatants.map(({ id }) => id);
  const defeat = resolvePortAssaultCrewFates({
    combatants,
    downedIds,
    outcome: PORT_ASSAULT_OUTCOME.DEFEAT,
    woundSurvivalBonus: 0,
    seed: 71
  });
  const treatedVictory = resolvePortAssaultCrewFates({
    combatants,
    downedIds,
    outcome: PORT_ASSAULT_OUTCOME.VICTORY,
    woundSurvivalBonus: 0.28,
    seed: 71
  });

  assert.deepEqual(defeat, resolvePortAssaultCrewFates({
    combatants,
    downedIds,
    outcome: PORT_ASSAULT_OUTCOME.DEFEAT,
    woundSurvivalBonus: 0,
    seed: 71
  }));
  assert.equal(defeat.deathIds.length + defeat.wounds.length, downedIds.length);
  assert.equal(treatedVictory.deathIds.length + treatedVictory.wounds.length, downedIds.length);
  assert.ok(treatedVictory.wounds.length > defeat.wounds.length);
  assert.ok(treatedVictory.wounds.every(({ recoveryDays, recoveryMinutes }) => (
    recoveryDays >= 3 && recoveryDays <= 14 && recoveryMinutes === recoveryDays * 24 * 60
  )));
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

test("matchlock discharge presentation remains anchored for the full smoke plume", () => {
  const battle = simulatePortAssault(createPortAssaultScenario({
    cityId: "london|england",
    attackers: [combatant("gunner", "gunner", 1)],
    defenders: [combatant("guard", "swordsman", 1)],
    shipHitPoints: 100,
    shipMaxHitPoints: 100,
    dockKind: "wood",
    fortified: false
  }), 17);
  const discharge = battle.events.find((event) => (
    event.type === "attack" && event.attackType === "firearm"
  ));

  assert.ok(discharge, "the test battle must include a matchlock discharge");
  assert.ok(Number.isFinite(discharge.position));
  assert.ok(discharge.position >= 0 && discharge.position <= 1);
  assert.ok(Number.isFinite(discharge.lane));
  assert.ok(discharge.lane >= 0 && discharge.lane <= 3);
  assert.ok(portAssaultPresentationAt(
    battle,
    discharge.timeMs + PORT_ASSAULT_FIREARM_SMOKE_DURATION_MS - 1
  ).events.includes(discharge));
  assert.ok(!portAssaultPresentationAt(
    battle,
    discharge.timeMs + PORT_ASSAULT_FIREARM_SMOKE_DURATION_MS
  ).events.includes(discharge));
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
  assert.ok(Math.hypot(chargeHit.knockbackPositionDelta,
    chargeHit.knockbackLaneDelta * PORT_ASSAULT_LANE_SPACING) > 0.04);
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

test("victorious attackers keep marching into the city while the result is shown", () => {
  const battle = simulatePortAssault(scenario({ attackerCount: 12, defenderCount: 8 }), 1);
  assert.equal(battle.outcome, PORT_ASSAULT_OUTCOME.VICTORY);
  const resultFrame = portAssaultPresentationAt(battle, battle.durationMs);
  const marchingFrame = portAssaultPresentationAt(battle, battle.durationMs + 1_000);
  const survivingAttackers = resultFrame.units.filter((unit) => (
    unit.side === "attacker" && unit.alive
  ));
  const marchingById = new Map(marchingFrame.units.map((unit) => [unit.id, unit]));

  assert.ok(survivingAttackers.length > 0);
  assert.ok(survivingAttackers.some((unit) => (
    marchingById.get(unit.id)?.position > unit.position
  )));
  assert.ok([...marchingById.values()].some((unit) => (
    unit.side === "attacker" && unit.alive && unit.animationId === "walk"
  )));

  const enteredCity = portAssaultPresentationAt(
    battle,
    battle.durationMs + PORT_ASSAULT_RESULT_PRESENTATION_DURATION_MS
  );
  assert.equal(
    enteredCity.units.filter((unit) => unit.side === "attacker" && unit.alive).length,
    0
  );
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

test("assault reinforcements deploy in separated four-person waves", () => {
  const battle = simulatePortAssault(scenario({ attackerCount: 12, defenderCount: 12 }), 19);
  const jumpTimes = battle.events
    .filter(({ type }) => type === "jump")
    .map(({ timeMs }) => timeMs);
  assert.equal(jumpTimes.length, 12);
  for (let waveStart = 4; waveStart < jumpTimes.length; waveStart += 4) {
    assert.ok(jumpTimes[waveStart] - jumpTimes[waveStart - 1] >= 400);
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

test("a much larger crew can replenish its front line against a strong garrison but still takes casualties", () => {
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
  // This mixed-experience crew should be favored, but the strongest capital
  // garrison is no longer facing guns that reload while moving and fighting.
  assert.ok(forecast.successPercent > 50, `Large crew is not favored: ${forecast.successPercent}%`);
  assert.ok(forecast.expectedCasualties >= defenders.length / 2);
  assert.ok(forecast.expectedCasualties < attackers.length);
});

test("weapon reach distinguishes swords, spears, and polearms by ground distance", () => {
  const sword = portAssaultUnitStats(combatant("sword", "swordsman", 0));
  const origin = { position: 0.5, lane: 0 };
  const diagonal = { position: 0.515, lane: 0.032 / PORT_ASSAULT_LANE_SPACING };
  const distance = portAssaultGroundDistance(origin, diagonal);
  assert.ok(distance > sword.range, "the sword cannot hit diagonally across this gap");
  for (const profile of ["spearman", "tribal-spearman", "yari-ashigaru", "halberdier"]) {
    const stats = portAssaultUnitStats(combatant(profile, profile, 0));
    assert.ok(distance <= stats.range, `${profile} should reach across the same gap`);
    assert.ok(portAssaultGroundDistance(origin, { position: 0.5, lane: 2 }) > stats.range,
      `${profile} must not strike across two full lanes`);
  }
  assert.ok(portAssaultGroundDistance(origin, { position: 0.511, lane: 0.020 / PORT_ASSAULT_LANE_SPACING }) < sword.range,
    "a sword can strike a sufficiently close neighbor between the wider lane centers");
});

function assertAttackReach(battle) {
  const statsById = new Map(battle.combatants.map((unit) => [unit.id,
    portAssaultUnitStats(combatant(unit.id, unit.combatProfileId, 0))]));
  let attacks = 0;
  for (const event of battle.events) {
    if (event.type !== "attack") continue;
    attacks += 1;
    const distance = portAssaultGroundDistance(event, { position: event.targetPosition, lane: event.targetLane });
    const attack = portAssaultAttackProfileAtDistance(statsById.get(event.unitId), distance);
    assert.equal(event.attackType, attack.attackType, `seed ${battle.seed}: wrong close-combat attack for ${event.unitId}`);
    assert.ok(distance <= attack.range, `seed ${battle.seed}: ${event.unitId} hit ${event.targetId} outside ${attack.range}`);
    assert.equal(typeof event.facingRight, "boolean");
  }
  assert.ok(attacks > 0, "the formations must actually engage");
}

test("every pair of combat profiles closes to real attack reach without a stalled duel", () => {
  const profiles = Object.values(PORT_ASSAULT_PROFILE_ID);
  for (const [a, attackerProfile] of profiles.entries()) {
    for (const [d, defenderProfile] of profiles.entries()) {
      const battle = simulatePortAssault(createPortAssaultScenario({
        ...scenario({ attackerCount: 1, defenderCount: 1 }),
        attackers: [combatant("attacker", attackerProfile)],
        defenders: [combatant("defender", defenderProfile)]
      }), a * profiles.length + d);
      assertAttackReach(battle);
      assert.ok(battle.events.some(({ type }) => type === "death"),
        `${attackerProfile}/${defenderProfile} must fight to a casualty`);
    }
  }
});

test("crowded mixed formations preserve body spacing, reach, deployment and replay contracts", () => {
  const profiles = Object.values(PORT_ASSAULT_PROFILE_ID);
  for (const dockKind of ["wood", "stone", "none"]) {
    for (const attackerCount of [12, shipStatsForSlug("ship-of-the-line").crewCapacity]) {
      const input = createPortAssaultScenario({
        ...scenario({ dockKind }),
        attackers: Array.from({ length: attackerCount }, (_, i) => combatant(`crew-${i}`, profiles[i % profiles.length], i % 4)),
        defenders: Array.from({ length: 35 }, (_, i) => combatant(`guard-${i}`, profiles[(i + 7) % profiles.length], i % 4))
      });
      const battle = simulatePortAssault(input, attackerCount);
      assertAttackReach(battle);
      const statsById = new Map(battle.combatants.map((unit) => [unit.id,
        portAssaultUnitStats(combatant(unit.id, unit.combatProfileId, 0))]));
      const tracks = Object.entries(battle.tracks);
      for (let index = 0; index < tracks[0][1].length; index += 1) {
        const occupants = tracks.flatMap(([id, track]) => {
          const frame = track[index];
          assert.ok(frame.lane >= 0 && frame.lane <= PORT_ASSAULT_LANE_COUNT - 1);
          assert.ok(frame.position >= 0 && frame.position <= 1);
          assert.ok(Number.isFinite(frame.animationStartedAtMs));
          return frame.hidden || !frame.alive ? [] : [{ id, ...frame, stats: statsById.get(id) }];
        });
        for (let i = 0; i < occupants.length; i += 1) {
          for (let j = i + 1; j < occupants.length; j += 1) {
            const left = occupants[i];
            const right = occupants[j];
            assert.ok(portAssaultGroundDistance(left, right) + 1e-9 >= portAssaultBodyRadius(left) + portAssaultBodyRadius(right),
              `${dockKind} ${attackerCount} at ${left.timeMs}: ${left.id}/${right.id} overlapped`);
          }
        }
      }
      const forecastBattle = simulatePortAssault(input, attackerCount, { collectPresentation: false });
      for (const key of ["outcome", "durationMs", "attackerDownedIds", "defenderCasualtyIds", "finalShipHitPoints"]) {
        assert.deepEqual(battle[key], forecastBattle[key], `collecting the replay changed ${key}`);
      }
      for (const landing of battle.events.filter(({ type }) => type === "jump")) {
        assert.ok(!battle.events.some((event) => event.type === "attack" && event.targetId === landing.unitId &&
          event.timeMs < landing.timeMs + portAssaultLandingDurationMs(dockKind)), "airborne soldiers cannot be attacked");
      }
    }
  }
});

test("lane crossings interpolate smoothly between authoritative steps", () => {
  const battle = simulatePortAssault(scenario({ attackerCount: 12, defenderCount: 8 }), 19);
  for (const [id, track] of Object.entries(battle.tracks)) {
    const index = track.findIndex((frame, i) => i < track.length - 1 && !frame.hidden &&
      frame.animationId === "walk" && frame.lane !== track[i + 1].lane && track[i + 1].animationId === "walk");
    if (index < 0) continue;
    const before = track[index];
    const after = track[index + 1];
    const unit = portAssaultPresentationAt(battle, (before.timeMs + after.timeMs) / 2).units.find((unit) => unit.id === id);
    assert.equal(unit.lane, (before.lane + after.lane) / 2);
    return;
  }
  assert.fail("the battle must include a lane crossing");
});

test("combat contracts reject duplicate IDs and unknown unit types", () => {
  assert.throws(() => createPortAssaultScenario({
    ...scenario(), attackers: [combatant("same")], defenders: [combatant("same")]
  }), /Duplicate/);
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

test("rear ranks spread into the fight rather than waiting in a blocked queue", () => {
  for (const seed of [1, 19, 42]) {
    const battle = simulatePortAssault(createPortAssaultScenario({
      ...scenario(),
      attackers: Array.from({ length: 24 }, (_, i) => combatant(`a${i}`)),
      defenders: Array.from({ length: 24 }, (_, i) => combatant(`d${i}`))
    }), seed);
    const engaged = new Set(battle.events.filter(event => event.type === "attack" &&
      event.unitId.startsWith("a") && event.timeMs <= 30_000).map(event => event.unitId));
    assert.ok(engaged.size >= 9, `Only ${engaged.size} of 24 attackers joined by 30 seconds (seed ${seed})`);
  }
});

test("a full Great Carrack can deploy its mixed crew and meets the garrison inland", () => {
  const capacity = shipStatsForSlug("ship-of-the-line").crewCapacity;
  const profiles = ["gunner", "archer", "spearman", "swordsman"];
  const battle = simulatePortAssault(createPortAssaultScenario({
    ...scenario(), dockKind: "stone",
    attackers: Array.from({ length: capacity }, (_, i) => combatant(`a${i}`, profiles[i % 4])),
    defenders: Array.from({ length: PORT_ASSAULT_MAX_GARRISON }, (_, i) => combatant(`d${i}`, profiles[i % 4]))
  }), 19);
  const jumps = battle.events.filter(event => event.type === "jump");
  assert.equal(jumps.length, capacity, "reinforcements must not be trapped aboard");
  assert.ok(jumps.at(-1).timeMs < 80000);
  for (const landing of battle.events.filter(event => event.type === "dock-land")) {
    const frames = battle.tracks[landing.unitId].filter(frame =>
      frame.timeMs >= landing.timeMs - 200 && frame.timeMs <= landing.timeMs + 1000);
    for (let index = 1; index < frames.length; index++) {
      assert.ok(frames[index].position >= frames[index - 1].position - 1e-9,
        `${landing.unitId} walked back toward the ship immediately after landing`);
    }
  }
  const attacks = battle.events.filter(event => event.type === "attack");
  const first = attacks[0];
  assert.ok(Math.min(first.position, first.targetPosition) > .5,
    "the first clash must leave deployment space behind the landing force");
  assert.ok(new Set(attacks.filter(event => event.unitId.startsWith("a")).map(event => event.unitId)).size > capacity / 2);
});

test("mixed formations skirmish, retreat between volleys, and enter melee sooner against cavalry", () => {
  const makeBattle = enemyType => simulatePortAssault(createPortAssaultScenario({
    ...scenario({ dockKind: "stone" }),
    attackers: Array.from({ length: 12 }, (_, i) => combatant(`a${i}`, i < 6 ? "gunner" : "spearman")),
    defenders: Array.from({ length: 12 }, (_, i) => combatant(`d${i}`,
      enemyType || (i < 6 ? "gunner" : "spearman")))
  }), 19);
  const mixed = makeBattle(null);
  const cavalry = makeBattle("horseman");
  const firstAttack = (battle, type) => battle.events.find(event => event.type === "attack" && event.attackType === type);
  assert.ok(firstAttack(mixed, "firearm").timeMs < firstAttack(mixed, "melee").timeMs);
  assert.ok(firstAttack(cavalry, "melee").timeMs < firstAttack(mixed, "melee").timeMs,
    "charging cavalry must shorten the skirmish through actual movement");
  const gunShots = mixed.events.filter(event => event.type === "attack" && event.attackType === "firearm" && event.unitId.startsWith("a"));
  assert.ok(gunShots.some(shot => {
    const track = mixed.tracks[shot.unitId];
    return track.some((frame, i) => i > 0 && frame.timeMs > shot.timeMs + 1100 &&
      frame.timeMs < shot.timeMs + 4000 && frame.animationId === "walk" &&
      frame.position < track[i - 1].position);
  }), "a discharged arquebusier retreats while reloading");
});

test("both firearm profiles stand still for a complete reload between shots", () => {
  for (const type of ["gunner", "teppo-ashigaru"]) {
    const input = createPortAssaultScenario({ ...scenario(), dockKind: "stone",
      attackers: Array.from({ length: 6 }, (_, i) => combatant(`a${i}`, type)),
      defenders: Array.from({ length: 6 }, (_, i) => combatant(`d${i}`, type)) });
    const battle = simulatePortAssault(input, 19);
    let cycles = 0;
    for (const [id, track] of Object.entries(battle.tracks)) {
      for (let i = 1; i < track.length; i++) {
        const frame = track[i];
        if (frame.animationId !== "reload") continue;
        assert.equal(frame.position, track[i - 1].position, `${id} reloaded while advancing`);
        assert.equal(frame.lane, track[i - 1].lane, `${id} reloaded while sidestepping`);
        assert.ok(frame.animationDurationMs > 0);
        const between = portAssaultPresentationAt(battle, frame.timeMs + 100).units.find(unit => unit.id === id);
        assert.equal(between.position, frame.position, "reload playback cannot slide into the next movement step");
        assert.equal(between.lane, frame.lane);
      }
      const shots = battle.events.filter(event => event.type === "attack" && event.attackType === "firearm" && event.unitId === id);
      for (let i = 1; i < shots.length; i++) {
        const frames = track.filter(frame => frame.timeMs > shots[i - 1].timeMs && frame.timeMs < shots[i].timeMs);
        const reloads = frames.filter(frame => frame.animationId === "reload");
        assert.ok(reloads.length * 200 >= portAssaultUnitStats(combatant(id, type)).cooldownMs * .88,
          `${id} fired without completing its stationary reload`);
        assert.ok(frames.some(frame => frame.animationId === "walk"), "soldiers seek cover before loading");
        cycles++;
      }
    }
    assert.ok(cycles >= 5, `${type} must exercise repeated reloads`);
  }
});

test("threatened gunners pause reload progress while retreating and resume the unfinished animation", () => {
  const troops = side => Array.from({ length: 6 }, (_, i) => combatant(`${side}${i}`, i % 2 ? "spearman" : "gunner"));
  const battle = simulatePortAssault(createPortAssaultScenario({ ...scenario(),
    dockKind: "stone", attackers: troops("a"), defenders: troops("d") }), 1);
  let interruptions = 0;
  for (const track of Object.values(battle.tracks)) {
    for (let i = 0; i < track.length - 2; i++) {
      const before = track[i];
      if (before.animationId !== "reload" || track[i + 1].animationId !== "walk") continue;
      let next = i + 1;
      while (next < track.length && track[next].animationId === "walk") next++;
      const resumed = track[next];
      if (resumed?.animationId !== "reload") continue;
      assert.equal(resumed.timeMs - resumed.animationStartedAtMs,
        before.timeMs - before.animationStartedAtMs + 200,
        "moving time must neither complete the reload nor restart it from scratch");
      interruptions++;
    }
  }
  assert.ok(interruptions > 0, "the battle must exercise a reload interrupted by retreat");
});

test("landing waves send cavalry, then skirmishers, then infantry across varied lanes", () => {
  const types = ["swordsman", "gunner", "horseman", "archer", "spearman", "teppo-ashigaru", "cavalier"];
  const attackers = Array.from({ length: 28 }, (_, i) => combatant(`deployment-${i}`, types[i % types.length]));
  const input = createPortAssaultScenario({ ...scenario(), attackers,
    defenders: Array.from({ length: 35 }, (_, i) => combatant(`guard-${i}`, "shieldman")) });
  const battle = simulatePortAssault(input, 19);
  const byId = new Map(attackers.map(unit => [unit.id, unit]));
  const priority = id => {
    const stats = portAssaultUnitStats(byId.get(id));
    return stats.mounted ? 0 : stats.attackType !== "melee" ? 1 : 2;
  };
  const jumps = battle.events.filter(event => event.type === "jump");
  assert.equal(jumps.length, attackers.length);
  for (let i = 1; i < jumps.length; i++) {
    assert.ok(priority(jumps[i].unitId) >= priority(jumps[i - 1].unitId), "later roles must not precede the cavalry/skirmisher screen");
  }
  for (let i = 0; i < jumps.length; i += 4) {
    assert.equal(new Set(jumps.slice(i, i + 4).map(event =>
      battle.tracks[event.unitId].find(frame => !frame.hidden).lane)).size, 4);
  }
  for (const type of types) {
    const lanes = jumps.filter(event => byId.get(event.unitId).combatProfileId === type).map(event =>
      battle.tracks[event.unitId].find(frame => !frame.hidden).lane);
    assert.ok(new Set(lanes).size > 1, `${type} is locked to one lane`);
  }
  assert.deepEqual(input.attackers.map(unit => unit.id), attackers.map(unit => unit.id), "deployment must not reorder the caller's crew roster");
});

test("a dominant troop type takes four places per pass without delaying the other arms", () => {
  const attackers = [
    ...Array.from({ length: 20 }, (_, i) => combatant(`gun-${i}`, "gunner")),
    ...Array.from({ length: 4 }, (_, i) => combatant(`pike-${i}`, "spearman")),
    ...Array.from({ length: 4 }, (_, i) => combatant(`horse-${i}`, "horseman"))
  ];
  const battle = simulatePortAssault(createPortAssaultScenario({ ...scenario(), attackers,
    defenders: Array.from({ length: 35 }, (_, i) => combatant(`guard-${i}`, "shieldman")) }), 19);
  const byId = new Map(attackers.map(unit => [unit.id, unit.combatProfileId]));
  const jumps = battle.events.filter(event => event.type === "jump");
  assert.deepEqual(jumps.slice(0, 12).map(event => byId.get(event.unitId)), [
    ...Array(4).fill("horseman"), ...Array(4).fill("gunner"), ...Array(4).fill("spearman")
  ]);
  assert.equal(jumps.length, attackers.length);
  assert.equal(new Set(jumps.map(event => event.unitId)).size, attackers.length);
  assert.ok(jumps.slice(12).every(event => byId.get(event.unitId) === "gunner"));
});

test("deployment rotates frontline exposure without using crew seniority", () => {
  const attackers = Array.from({ length: 12 }, (_, i) => combatant(`rotation-${i}`, "gunner"));
  const make = roster => createPortAssaultScenario({ ...scenario(), attackers: roster });
  const jumps = (roster, seed) => simulatePortAssault(make(roster), seed).events
    .filter(event => event.type === "jump").map(event => event.unitId);
  assert.deepEqual(jumps(attackers, 42), jumps([...attackers].reverse(), 42));
  assert.notDeepEqual(jumps(attackers, 42).slice(0, 4), jumps(attackers, 43).slice(0, 4));
});
