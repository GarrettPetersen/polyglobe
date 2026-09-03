export const PORT_ASSAULT_ATTACK_TYPE = Object.freeze({
  MELEE: "melee",
  ARROW: "arrow",
  FIREARM: "firearm"
});

export const PORT_ASSAULT_SIDE = Object.freeze({
  ATTACKER: "attacker",
  DEFENDER: "defender"
});

export const PORT_ASSAULT_OUTCOME = Object.freeze({
  VICTORY: "victory",
  DEFEAT: "defeat"
});

export const PORT_ASSAULT_PROFILE_ID = Object.freeze({
  SAILOR: "sailor",
  HUNTER: "hunter",
  GUNNER: "gunner",
  ARCHER: "archer",
  CAVALIER: "cavalier",
  CROSSBOWMAN: "crossbowman",
  HALBERDIER: "halberdier",
  HORSEMAN: "horseman",
  SHIELDMAN: "shieldman",
  SPEARMAN: "spearman",
  SWORDSMAN: "swordsman",
  ISLAMICATE_WARRIOR: "islamicate-warrior",
  MING_CROSSBOWMAN: "ming-crossbowman",
  MING_SWORDSMAN: "ming-swordsman",
  HORSE_SAMURAI: "horse-samurai",
  SAMURAI: "samurai",
  TEPPO_ASHIGARU: "teppo-ashigaru",
  TRIBAL_SPEARMAN: "tribal-spearman",
  YARI_ASHIGARU: "yari-ashigaru",
  YUMI_SAMURAI: "yumi-samurai"
});

export const PORT_ASSAULT_STEP_MS = 200;
export const PORT_ASSAULT_MAX_DURATION_MS = 120_000;
export const PORT_ASSAULT_FORECAST_SAMPLES = 32;
export const PORT_ASSAULT_MIN_GARRISON = 5;
export const PORT_ASSAULT_MAX_GARRISON = 35;

const TRACK_INTERVAL_MS = PORT_ASSAULT_STEP_MS;
const GARRISON_CAPITAL_BONUS = 5;
// Beijing sets the population ceiling; the 35-man cap leaves a full Great Carrack near even
// with the strongest current capital roster after culture, experience, and waves are applied.
const GARRISON_WORLD_CITY_POPULATION = 680_000;
const GARRISON_MINIMUM_POPULATION = 500;
const GARRISON_MAX_NON_CAPITAL = PORT_ASSAULT_MAX_GARRISON - GARRISON_CAPITAL_BONUS;
const PORT_ASSAULT_WAVE_SIZE = 3;
const PORT_ASSAULT_FIRST_WAVE_DELAY_MS = 300;
// Distinct small waves keep large assaults readable without extending beyond the battle clock.
const PORT_ASSAULT_WAVE_INTERVAL_MS = 1_200;
const PORT_ASSAULT_WAVE_MEMBER_INTERVAL_MS = 140;
const PORT_ASSAULT_WAVE_JITTER_MS = 180;
export const PORT_ASSAULT_SHIP_IMPACT_SHAKE_DURATION_MS = 220;
const PORT_ASSAULT_SHIP_IMPACT_SHAKE_STEP_MS = 36;
const NO_PORT_ASSAULT_SHIP_IMPACT_SHAKE = Object.freeze({ x: 0, y: 0 });
const PORT_ASSAULT_SHIP_IMPACT_SHAKE_PATTERN = Object.freeze([
  Object.freeze({ x: -1, y: 0 }),
  Object.freeze({ x: 1, y: 1 }),
  Object.freeze({ x: -1, y: -1 }),
  Object.freeze({ x: 1, y: 0 }),
  Object.freeze({ x: -1, y: 0 }),
  Object.freeze({ x: 0, y: 0 }),
  Object.freeze({ x: 0, y: 0 })
]);
const EXPERIENCE_ATTACK_MULTIPLIER = 0.08;
const EXPERIENCE_DEFENSE_MULTIPLIER = 0.05;
const EXPERIENCE_HIT_POINTS_MULTIPLIER = 0.06;
const RANGED_MELEE_RANGE = 0.03;
const FULL_CHARGE_DISTANCE = 0.12;
const MOMENTUM_DECAY_PER_STEP = 0.16;
const BASE_KNOCKBACK_POSITION_BY_ATTACK_TYPE = Object.freeze({
  [PORT_ASSAULT_ATTACK_TYPE.MELEE]: 0.006,
  [PORT_ASSAULT_ATTACK_TYPE.ARROW]: 0.002,
  [PORT_ASSAULT_ATTACK_TYPE.FIREARM]: 0.0045
});
const ARMOR_RESISTANCE_BY_ATTACK_TYPE = Object.freeze({
  [PORT_ASSAULT_ATTACK_TYPE.MELEE]: 0.5,
  [PORT_ASSAULT_ATTACK_TYPE.ARROW]: 0.75,
  [PORT_ASSAULT_ATTACK_TYPE.FIREARM]: 0.18
});
const DEFAULT_MODIFIERS = Object.freeze({
  meleeDamageMultiplier: 1,
  arrowDamageMultiplier: 1,
  firearmDamageMultiplier: 1,
  defenseMultiplier: 1,
  armorCoverageBonus: 0
});

const UNIT_TYPES = Object.freeze({
  [PORT_ASSAULT_PROFILE_ID.SAILOR]: unitType({
    attack: 8, defense: 5, hitPoints: 28, range: 0.026, cooldownMs: 1200,
    movementPerSecond: 0.043, armorCoverage: 0.05, armorPenetration: 0.08
  }),
  [PORT_ASSAULT_PROFILE_ID.HUNTER]: rangedUnitType({
    attack: 8, defense: 5, hitPoints: 30, attackType: PORT_ASSAULT_ATTACK_TYPE.ARROW,
    range: 0.16, cooldownMs: 2600, movementPerSecond: 0.04, armorCoverage: 0.08,
    armorPenetration: 0.05, meleeAttack: 7, meleeCooldownMs: 1400, meleeArmorPenetration: 0.08
  }),
  [PORT_ASSAULT_PROFILE_ID.GUNNER]: rangedUnitType({
    attack: 20, defense: 4, hitPoints: 28, attackType: PORT_ASSAULT_ATTACK_TYPE.FIREARM,
    range: 0.2, cooldownMs: 6000, movementPerSecond: 0.034, armorCoverage: 0.12,
    armorPenetration: 0.82, meleeAttack: 7, meleeCooldownMs: 1550, meleeArmorPenetration: 0.08
  }),
  [PORT_ASSAULT_PROFILE_ID.ARCHER]: rangedUnitType({
    attack: 9, defense: 4, hitPoints: 27, attackType: PORT_ASSAULT_ATTACK_TYPE.ARROW,
    range: 0.18, cooldownMs: 3000, movementPerSecond: 0.038, armorCoverage: 0.1,
    armorPenetration: 0.05, meleeAttack: 6, meleeCooldownMs: 1450, meleeArmorPenetration: 0.08
  }),
  [PORT_ASSAULT_PROFILE_ID.CAVALIER]: unitType({
    attack: 18, defense: 12, hitPoints: 48, range: 0.031, cooldownMs: 1250,
    movementPerSecond: 0.076, armorCoverage: 0.9, armorPenetration: 0.25,
    mounted: true, knockbackMultiplier: 1.4,
    chargeDamageMultiplier: 1.45, chargeKnockbackMultiplier: 3.2
  }),
  [PORT_ASSAULT_PROFILE_ID.CROSSBOWMAN]: rangedUnitType({
    attack: 12, defense: 5, hitPoints: 30, attackType: PORT_ASSAULT_ATTACK_TYPE.ARROW,
    range: 0.17, cooldownMs: 4400, movementPerSecond: 0.035, armorCoverage: 0.18,
    armorPenetration: 0.35, meleeAttack: 7, meleeCooldownMs: 1550, meleeArmorPenetration: 0.08
  }),
  [PORT_ASSAULT_PROFILE_ID.HALBERDIER]: unitType({
    attack: 13, defense: 8, hitPoints: 40, range: 0.042, cooldownMs: 1400,
    movementPerSecond: 0.035, armorCoverage: 0.45, armorPenetration: 0.3,
    antiMountedDamageMultiplier: 1.3, knockbackMultiplier: 1.55
  }),
  [PORT_ASSAULT_PROFILE_ID.HORSEMAN]: unitType({
    attack: 15, defense: 8, hitPoints: 42, range: 0.03, cooldownMs: 1150,
    movementPerSecond: 0.082, armorCoverage: 0.55, armorPenetration: 0.2,
    mounted: true, knockbackMultiplier: 1.3,
    chargeDamageMultiplier: 1.35, chargeKnockbackMultiplier: 2.8
  }),
  [PORT_ASSAULT_PROFILE_ID.SHIELDMAN]: unitType({
    attack: 8, defense: 11, hitPoints: 44, range: 0.027, cooldownMs: 1250,
    movementPerSecond: 0.035, armorCoverage: 0.6, armorPenetration: 0.08,
    blockChance: 0.34
  }),
  [PORT_ASSAULT_PROFILE_ID.SPEARMAN]: unitType({
    attack: 10, defense: 8, hitPoints: 36, range: 0.038, cooldownMs: 1200,
    movementPerSecond: 0.039, armorCoverage: 0.32, armorPenetration: 0.15,
    antiMountedDamageMultiplier: 1.45, knockbackMultiplier: 1.3
  }),
  [PORT_ASSAULT_PROFILE_ID.SWORDSMAN]: unitType({
    attack: 11, defense: 7, hitPoints: 34, range: 0.028, cooldownMs: 1080,
    movementPerSecond: 0.041, armorCoverage: 0.38, armorPenetration: 0.2,
    knockbackMultiplier: 1.1
  }),
  [PORT_ASSAULT_PROFILE_ID.ISLAMICATE_WARRIOR]: unitType({
    attack: 11, defense: 10, hitPoints: 39, range: 0.029, cooldownMs: 1020,
    movementPerSecond: 0.045, armorCoverage: 0.48, armorPenetration: 0.18,
    blockChance: 0.28, knockbackMultiplier: 1.1
  }),
  [PORT_ASSAULT_PROFILE_ID.MING_CROSSBOWMAN]: rangedUnitType({
    attack: 11, defense: 6, hitPoints: 32, attackType: PORT_ASSAULT_ATTACK_TYPE.ARROW,
    range: 0.17, cooldownMs: 3800, movementPerSecond: 0.038, armorCoverage: 0.28,
    armorPenetration: 0.3, meleeAttack: 7, meleeCooldownMs: 1450, meleeArmorPenetration: 0.1
  }),
  [PORT_ASSAULT_PROFILE_ID.MING_SWORDSMAN]: unitType({
    attack: 10, defense: 7, hitPoints: 34, range: 0.028, cooldownMs: 950,
    movementPerSecond: 0.045, armorCoverage: 0.35, armorPenetration: 0.18,
    knockbackMultiplier: 1.1
  }),
  [PORT_ASSAULT_PROFILE_ID.HORSE_SAMURAI]: unitType({
    attack: 17, defense: 10, hitPoints: 46, range: 0.032, cooldownMs: 1100,
    movementPerSecond: 0.075, armorCoverage: 0.68, armorPenetration: 0.25,
    mounted: true, knockbackMultiplier: 1.35,
    chargeDamageMultiplier: 1.4, chargeKnockbackMultiplier: 3
  }),
  [PORT_ASSAULT_PROFILE_ID.SAMURAI]: unitType({
    attack: 14, defense: 8, hitPoints: 40, range: 0.03, cooldownMs: 950,
    movementPerSecond: 0.046, armorCoverage: 0.62, armorPenetration: 0.28,
    knockbackMultiplier: 1.25
  }),
  [PORT_ASSAULT_PROFILE_ID.TEPPO_ASHIGARU]: rangedUnitType({
    attack: 21, defense: 5, hitPoints: 31, attackType: PORT_ASSAULT_ATTACK_TYPE.FIREARM,
    range: 0.205, cooldownMs: 6200, movementPerSecond: 0.037, armorCoverage: 0.25,
    armorPenetration: 0.82, meleeAttack: 8, meleeCooldownMs: 1450, meleeArmorPenetration: 0.12
  }),
  [PORT_ASSAULT_PROFILE_ID.TRIBAL_SPEARMAN]: unitType({
    attack: 9, defense: 4, hitPoints: 27, range: 0.04, cooldownMs: 1050,
    movementPerSecond: 0.052, armorCoverage: 0.04, armorPenetration: 0.08,
    antiMountedDamageMultiplier: 1.35, knockbackMultiplier: 1.35
  }),
  [PORT_ASSAULT_PROFILE_ID.YARI_ASHIGARU]: unitType({
    attack: 11, defense: 7, hitPoints: 36, range: 0.044, cooldownMs: 1100,
    movementPerSecond: 0.043, armorCoverage: 0.28, armorPenetration: 0.15,
    antiMountedDamageMultiplier: 1.5, knockbackMultiplier: 1.45
  }),
  [PORT_ASSAULT_PROFILE_ID.YUMI_SAMURAI]: rangedUnitType({
    attack: 11, defense: 6, hitPoints: 34, attackType: PORT_ASSAULT_ATTACK_TYPE.ARROW,
    range: 0.22, cooldownMs: 3400, movementPerSecond: 0.042, armorCoverage: 0.58,
    armorPenetration: 0.08, meleeAttack: 9, meleeCooldownMs: 1150, meleeArmorPenetration: 0.2
  })
});

export function portAssaultUnitProfile(combatProfileId) {
  const type = UNIT_TYPES[combatProfileId];
  if (!type) throw new Error(`Unknown port assault combat profile: ${combatProfileId}`);
  return type;
}

export function portAssaultUnitStats(combatant, modifiers = DEFAULT_MODIFIERS) {
  validateCombatant(combatant);
  validateModifiers(modifiers);
  const base = portAssaultUnitProfile(combatant.combatProfileId);
  const stars = combatant.experienceStars;
  const experienceAttackMultiplier = 1 + stars * EXPERIENCE_ATTACK_MULTIPLIER;
  const damageMultiplier = damageMultiplierForType(base.attackType, modifiers);
  return Object.freeze({
    attack: base.attack * experienceAttackMultiplier * damageMultiplier,
    defense: base.defense * (1 + stars * EXPERIENCE_DEFENSE_MULTIPLIER) * modifiers.defenseMultiplier,
    hitPoints: Math.round(base.hitPoints * (1 + stars * EXPERIENCE_HIT_POINTS_MULTIPLIER)),
    attackType: base.attackType,
    range: base.range,
    cooldownMs: base.cooldownMs,
    movementPerSecond: base.movementPerSecond,
    blockChance: base.blockChance,
    armorCoverage: clamp(base.armorCoverage + modifiers.armorCoverageBonus, 0, 1),
    armorPenetration: base.armorPenetration,
    antiMountedDamageMultiplier: base.antiMountedDamageMultiplier,
    mounted: base.mounted,
    knockbackMultiplier: base.knockbackMultiplier,
    chargeDamageMultiplier: base.chargeDamageMultiplier,
    chargeKnockbackMultiplier: base.chargeKnockbackMultiplier,
    meleeFallback: base.meleeFallback
      ? Object.freeze({
          attack: base.meleeFallback.attack * experienceAttackMultiplier * modifiers.meleeDamageMultiplier,
          attackType: PORT_ASSAULT_ATTACK_TYPE.MELEE,
          range: base.meleeFallback.range,
          cooldownMs: base.meleeFallback.cooldownMs,
          armorPenetration: base.meleeFallback.armorPenetration
        })
      : null
  });
}

export function portAssaultAttackProfileAtDistance(stats, distance) {
  validateAttackStats(stats);
  if (!Number.isFinite(distance) || distance < 0) {
    throw new Error(`Invalid port assault attack distance: ${distance}`);
  }
  if (stats.meleeFallback && distance <= stats.meleeFallback.range) return stats.meleeFallback;
  return stats;
}

export function portAssaultKnockbackDistance({
  attackType,
  damage,
  unitKnockbackMultiplier = 1,
  chargeKnockbackMultiplier = 1
}) {
  const baseDistance = BASE_KNOCKBACK_POSITION_BY_ATTACK_TYPE[attackType];
  if (!baseDistance) throw new Error(`Unknown port assault knockback attack type: ${attackType}`);
  requirePositiveNumber(damage, "damage");
  requirePositiveNumber(unitKnockbackMultiplier, "unitKnockbackMultiplier");
  requirePositiveNumber(chargeKnockbackMultiplier, "chargeKnockbackMultiplier");
  const damageMultiplier = clamp(damage / 8, 0.6, 2.2);
  return baseDistance * damageMultiplier * unitKnockbackMultiplier * chargeKnockbackMultiplier;
}

export function portAssaultDamageAfterMitigation({
  attackPower,
  attackType,
  armorPenetration,
  targetDefense,
  targetArmorCoverage
}) {
  requirePositiveCombatValue(attackPower, "attackPower");
  requireNonNegativeCombatValue(targetDefense, "targetDefense");
  requireUnitInterval(armorPenetration, "armorPenetration");
  requireUnitInterval(targetArmorCoverage, "targetArmorCoverage");
  const armorResistance = ARMOR_RESISTANCE_BY_ATTACK_TYPE[attackType];
  if (!armorResistance) throw new Error(`Unknown port assault armor attack type: ${attackType}`);
  const unmitigatedDamage = Math.max(1, attackPower - targetDefense * 0.34);
  const effectiveCoverage = targetArmorCoverage * (1 - armorPenetration);
  return Math.max(1, Math.round(unmitigatedDamage * (1 - effectiveCoverage * armorResistance)));
}

export function portAssaultGarrisonCount(city) {
  if (!city || typeof city !== "object") throw new Error("Port assault garrison requires a city");
  if (!Number.isFinite(city.population) || city.population < 0) {
    throw new Error(`Invalid port assault city population: ${city.population}`);
  }
  const populationShare = clamp(
    (city.population - GARRISON_MINIMUM_POPULATION) /
      (GARRISON_WORLD_CITY_POPULATION - GARRISON_MINIMUM_POPULATION),
    0,
    1
  );
  const populationGarrison = Math.round(
    PORT_ASSAULT_MIN_GARRISON +
      (GARRISON_MAX_NON_CAPITAL - PORT_ASSAULT_MIN_GARRISON) * Math.sqrt(populationShare)
  );
  return Math.min(
    PORT_ASSAULT_MAX_GARRISON,
    populationGarrison + (city.isFactionCapital === true ? GARRISON_CAPITAL_BONUS : 0)
  );
}

export function portAssaultLandingDurationMs(dockKind) {
  if (dockKind !== "wood" && dockKind !== "stone" && dockKind !== "none") {
    throw new Error(`Invalid port assault dock: ${dockKind}`);
  }
  return dockKind === "none" ? 720 : 520;
}

export function createPortAssaultScenario({
  cityId,
  attackers,
  defenders,
  shipHitPoints,
  shipMaxHitPoints,
  fortified,
  dockKind,
  attackerModifiers = DEFAULT_MODIFIERS,
  defenderModifiers = DEFAULT_MODIFIERS
}) {
  if (typeof cityId !== "string" || cityId.trim() === "") {
    throw new Error("Port assault scenario requires a canonical city ID");
  }
  validateCombatants(attackers, PORT_ASSAULT_SIDE.ATTACKER);
  validateCombatants(defenders, PORT_ASSAULT_SIDE.DEFENDER);
  if (attackers.length === 0) throw new Error("Port assault requires at least one attacker");
  if (defenders.length === 0) throw new Error("Port assault requires at least one defender");
  if (!Number.isFinite(shipHitPoints) || shipHitPoints <= 0) {
    throw new Error(`Invalid assault ship hit points: ${shipHitPoints}`);
  }
  if (!Number.isFinite(shipMaxHitPoints) || shipMaxHitPoints <= 0 ||
      shipHitPoints > shipMaxHitPoints) {
    throw new Error(`Invalid assault ship maximum hit points: ${shipHitPoints}/${shipMaxHitPoints}`);
  }
  if (typeof fortified !== "boolean") throw new Error("Port assault fortification must be boolean");
  portAssaultLandingDurationMs(dockKind);
  validateModifiers(attackerModifiers);
  validateModifiers(defenderModifiers);
  return Object.freeze({
    cityId,
    attackers: Object.freeze(attackers.map(freezeCombatant)),
    defenders: Object.freeze(defenders.map(freezeCombatant)),
    shipHitPoints,
    shipMaxHitPoints,
    fortified,
    dockKind,
    attackerModifiers: freezeModifiers(attackerModifiers),
    defenderModifiers: freezeModifiers(defenderModifiers)
  });
}

export function simulatePortAssault(scenario, seed, { collectPresentation = true } = {}) {
  validateScenario(scenario);
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) {
    throw new Error(`Port assault seed must be an unsigned integer: ${seed}`);
  }
  const random = createRandom(seed);
  const attackers = createBattleUnits(
    scenario.attackers,
    PORT_ASSAULT_SIDE.ATTACKER,
    scenario.attackerModifiers,
    random
  );
  const defenders = createBattleUnits(
    scenario.defenders,
    PORT_ASSAULT_SIDE.DEFENDER,
    scenario.defenderModifiers,
    random
  );
  const units = [...attackers, ...defenders];
  const initiativeOrder = [...units].sort((left, right) => (
    left.initiative - right.initiative || left.id.localeCompare(right.id)
  ));
  const events = collectPresentation ? [] : null;
  const tracks = collectPresentation
    ? Object.fromEntries(units.map((unit) => [unit.id, []]))
    : null;
  let shipHitPoints = scenario.shipHitPoints;
  let timeMs = 0;
  let winner = null;
  let nextTrackMs = 0;

  while (winner === null && timeMs <= PORT_ASSAULT_MAX_DURATION_MS) {
    if (!defenders.some((unit) => unit.alive) &&
        attackers.some((unit) => unit.alive && unit.position >= 0.985)) {
      winner = PORT_ASSAULT_SIDE.ATTACKER;
      break;
    }

    for (const unit of initiativeOrder) {
      if (!unit.alive || timeMs < unit.spawnAtMs) continue;
      if (!unit.moving && unit.momentum > 0) {
        unit.momentum = Math.max(0, unit.momentum - MOMENTUM_DECAY_PER_STEP);
      }
      unit.moving = false;
      if (!unit.spawned) {
        unit.spawned = true;
        unit.jumpStartedAtMs = timeMs;
        pushEvent(events, { timeMs, type: "jump", unitId: unit.id, dockKind: scenario.dockKind });
      }
      const landingDurationMs = portAssaultLandingDurationMs(scenario.dockKind);
      if (!unit.landed && timeMs >= unit.jumpStartedAtMs + landingDurationMs) {
        unit.landed = true;
        pushEvent(events, {
          timeMs,
          type: scenario.dockKind === "none" ? "splash" : "dock-land",
          unitId: unit.id,
          dockKind: scenario.dockKind
        });
      }
      if (!unit.landed) continue;
      if (unit.actionUntilMs > timeMs) continue;
      const opponents = unit.side === PORT_ASSAULT_SIDE.ATTACKER ? defenders : attackers;
      const target = nearestLivingOpponent(unit, opponents, timeMs);
      const targetDistance = target ? Math.abs(target.position - unit.position) : null;
      const attackProfile = target
        ? portAssaultAttackProfileAtDistance(unit.stats, targetDistance)
        : null;
      if (target && targetDistance <= attackProfile.range) {
        if (timeMs >= nextAttackAtMs(unit, attackProfile)) {
          attackUnit(unit, target, attackProfile, timeMs, random, events);
        }
        continue;
      }
      const direction = unit.side === PORT_ASSAULT_SIDE.ATTACKER ? 1 : -1;
      const goal = unit.side === PORT_ASSAULT_SIDE.ATTACKER ? 1 : 0;
      if (!target && Math.abs(goal - unit.position) <= 0.015) {
        if (unit.side === PORT_ASSAULT_SIDE.ATTACKER) {
          winner = PORT_ASSAULT_SIDE.ATTACKER;
          pushEvent(events, { timeMs, type: "breach", unitId: unit.id });
          break;
        }
        const closeAttack = portAssaultAttackProfileAtDistance(unit.stats, 0);
        if (timeMs >= nextAttackAtMs(unit, closeAttack)) {
          const damage = Math.max(1, Math.round(closeAttack.attack * (0.38 + random() * 0.18)));
          shipHitPoints = Math.max(0, shipHitPoints - damage);
          setNextAttackAtMs(unit, closeAttack, timeMs + closeAttack.cooldownMs);
          unit.actionAnimationId = "attack";
          unit.actionStartedAtMs = timeMs;
          unit.actionUntilMs = timeMs + attackActionDurationMs(closeAttack.attackType);
          pushEvent(events, {
            timeMs,
            type: "ship-hit",
            unitId: unit.id,
            attackType: closeAttack.attackType,
            damage,
            shipHitPoints
          });
          if (shipHitPoints === 0) winner = PORT_ASSAULT_SIDE.DEFENDER;
        }
        continue;
      }
      const movement = unit.stats.movementPerSecond * (PORT_ASSAULT_STEP_MS / 1000);
      const desired = target ? target.position - direction * Math.min(unit.stats.range * 0.78, 0.025) : goal;
      const previousPosition = unit.position;
      unit.position = direction > 0
        ? Math.min(desired, unit.position + movement)
        : Math.max(desired, unit.position - movement);
      unit.moving = unit.position !== previousPosition;
      if (unit.moving && unit.stats.chargeDamageMultiplier > 1) {
        unit.momentum = Math.min(
          1,
          unit.momentum + Math.abs(unit.position - previousPosition) / FULL_CHARGE_DISTANCE
        );
      }
    }
    if (collectPresentation && timeMs >= nextTrackMs) {
      recordTracks(tracks, units, timeMs, scenario.dockKind);
      nextTrackMs += TRACK_INTERVAL_MS;
    }
    timeMs += PORT_ASSAULT_STEP_MS;
  }

  if (winner === null) {
    const attackerPower = remainingPower(units, PORT_ASSAULT_SIDE.ATTACKER);
    const defenderPower = remainingPower(units, PORT_ASSAULT_SIDE.DEFENDER) + shipHitPoints * 0.02;
    winner = attackerPower > defenderPower ? PORT_ASSAULT_SIDE.ATTACKER : PORT_ASSAULT_SIDE.DEFENDER;
    pushEvent(events, { timeMs, type: "time-limit", attackerPower, defenderPower });
  }
  if (collectPresentation) recordTracks(tracks, units, timeMs, scenario.dockKind);
  const attackerCasualtyIds = units
    .filter((unit) => unit.side === PORT_ASSAULT_SIDE.ATTACKER && !unit.alive && !unit.auxiliary)
    .map((unit) => unit.id);
  const auxiliaryCasualtyIds = units
    .filter((unit) => unit.side === PORT_ASSAULT_SIDE.ATTACKER && !unit.alive && unit.auxiliary)
    .map((unit) => unit.id);
  const defenderCasualtyIds = units
    .filter((unit) => unit.side === PORT_ASSAULT_SIDE.DEFENDER && !unit.alive)
    .map((unit) => unit.id);
  pushEvent(events, { timeMs, type: "result", winner });
  return Object.freeze({
    seed,
    outcome: winner === PORT_ASSAULT_SIDE.ATTACKER
      ? PORT_ASSAULT_OUTCOME.VICTORY
      : PORT_ASSAULT_OUTCOME.DEFEAT,
    winner,
    durationMs: timeMs,
    initialShipHitPoints: scenario.shipHitPoints,
    maxShipHitPoints: scenario.shipMaxHitPoints,
    finalShipHitPoints: shipHitPoints,
    attackerCasualtyIds: Object.freeze(attackerCasualtyIds),
    auxiliaryCasualtyIds: Object.freeze(auxiliaryCasualtyIds),
    defenderCasualtyIds: Object.freeze(defenderCasualtyIds),
    events: events ? Object.freeze(events.map(Object.freeze)) : Object.freeze([]),
    tracks: tracks ? freezeTracks(tracks) : null,
    combatants: collectPresentation
      ? Object.freeze(units.map((unit) => Object.freeze({
          id: unit.id,
          side: unit.side,
          appearanceId: unit.appearanceId,
          combatProfileId: unit.combatProfileId,
          attackType: unit.stats.attackType,
          lane: unit.lane,
          auxiliary: unit.auxiliary
        })))
      : Object.freeze([])
  });
}

export function forecastPortAssault(
  scenario,
  { seedKey, sampleCount = PORT_ASSAULT_FORECAST_SAMPLES } = {}
) {
  validateScenario(scenario);
  if (typeof seedKey !== "string" || seedKey.trim() === "") {
    throw new Error("Port assault forecast requires a stable seed key");
  }
  if (!Number.isInteger(sampleCount) || sampleCount < 16 || sampleCount > 256) {
    throw new Error(`Invalid port assault forecast sample count: ${sampleCount}`);
  }
  const results = [];
  let victories = 0;
  for (let index = 0; index < sampleCount; index += 1) {
    const result = simulatePortAssault(scenario, hashString32(`${seedKey}|forecast|${index}`), {
      collectPresentation: false
    });
    results.push(result);
    if (result.outcome === PORT_ASSAULT_OUTCOME.VICTORY) victories += 1;
  }
  const casualties = results
    .map((result) => result.attackerCasualtyIds.length + result.auxiliaryCasualtyIds.length)
    .sort((a, b) => a - b);
  const hullDamage = results.map((result) => result.initialShipHitPoints - result.finalShipHitPoints);
  const expectedCasualties = casualties.reduce((sum, value) => sum + value, 0) / sampleCount;
  return Object.freeze({
    sampleCount,
    successChance: victories / sampleCount,
    successPercent: Math.round(victories / sampleCount * 100),
    expectedCasualties,
    expectedCasualtiesRounded: Math.round(expectedCasualties),
    casualtyRangeLow: percentile(casualties, 0.1),
    casualtyRangeHigh: percentile(casualties, 0.9),
    expectedHullDamage: Math.round(hullDamage.reduce((sum, value) => sum + value, 0) / sampleCount)
  });
}

export function portAssaultPresentationAt(battle, elapsedMs) {
  if (!battle?.tracks || !Array.isArray(battle.combatants)) {
    throw new Error("Port assault presentation requires a recorded battle");
  }
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) {
    throw new Error(`Invalid port assault presentation time: ${elapsedMs}`);
  }
  const units = [];
  for (const combatant of battle.combatants) {
    const track = battle.tracks[combatant.id];
    if (!track) throw new Error(`Port assault has no track for ${combatant.id}`);
    const frame = trackFrameAt(track, elapsedMs);
    if (!frame || frame.hidden) continue;
    units.push(Object.freeze({ ...combatant, ...frame }));
  }
  return Object.freeze({
    elapsedMs,
    durationMs: battle.durationMs,
    finished: elapsedMs >= battle.durationMs,
    outcome: elapsedMs >= battle.durationMs ? battle.outcome : null,
    shipHitPoints: portAssaultShipHitPointsAt(battle, elapsedMs),
    shipMaxHitPoints: battle.maxShipHitPoints,
    units: Object.freeze(units),
    events: Object.freeze(battle.events.filter((event) => (
      event.timeMs > elapsedMs - eventPresentationDurationMs(event.type) && event.timeMs <= elapsedMs
    )))
  });
}

export function portAssaultShipHitPointsAt(battle, elapsedMs) {
  validateRecordedBattleTime(battle, elapsedMs);
  let hitPoints = battle.initialShipHitPoints;
  for (const event of battle.events) {
    if (event.timeMs > elapsedMs) break;
    if (event.type !== "ship-hit") continue;
    validateShipHitEvent(event, battle.maxShipHitPoints);
    hitPoints = event.shipHitPoints;
  }
  return hitPoints;
}

export function portAssaultShipImpactShakeAt(battle, elapsedMs, { reducedMotion = false } = {}) {
  validateRecordedBattleTime(battle, elapsedMs);
  if (typeof reducedMotion !== "boolean") {
    throw new Error(`Port assault reduced-motion preference must be boolean: ${reducedMotion}`);
  }
  if (reducedMotion) return NO_PORT_ASSAULT_SHIP_IMPACT_SHAKE;
  let latestHit = null;
  let simultaneousDamage = 0;
  for (const event of battle.events) {
    if (event.timeMs > elapsedMs) break;
    if (event.type !== "ship-hit") continue;
    validateShipHitEvent(event, battle.maxShipHitPoints);
    if (!latestHit || event.timeMs !== latestHit.timeMs) simultaneousDamage = 0;
    latestHit = event;
    simultaneousDamage += event.damage;
  }
  if (!latestHit) return NO_PORT_ASSAULT_SHIP_IMPACT_SHAKE;
  const ageMs = elapsedMs - latestHit.timeMs;
  if (ageMs >= PORT_ASSAULT_SHIP_IMPACT_SHAKE_DURATION_MS) {
    return NO_PORT_ASSAULT_SHIP_IMPACT_SHAKE;
  }
  const phase = Math.min(
    PORT_ASSAULT_SHIP_IMPACT_SHAKE_PATTERN.length - 1,
    Math.floor(ageMs / PORT_ASSAULT_SHIP_IMPACT_SHAKE_STEP_MS)
  );
  const direction = PORT_ASSAULT_SHIP_IMPACT_SHAKE_PATTERN[phase];
  const force = Math.min(3, Math.max(1, Math.ceil(simultaneousDamage / 6)));
  const amplitude = phase >= 4 ? 1 : force;
  return Object.freeze({ x: direction.x * amplitude, y: direction.y * amplitude });
}

function eventPresentationDurationMs(type) {
  if (["splash", "dock-land", "death"].includes(type)) return 500;
  if (["attack", "hit"].includes(type)) return 360;
  if (type === "block") return 220;
  if (type === "ship-hit") return PORT_ASSAULT_SHIP_IMPACT_SHAKE_DURATION_MS;
  return PORT_ASSAULT_STEP_MS;
}

function validateRecordedBattleTime(battle, elapsedMs) {
  if (!battle || !Array.isArray(battle.events) ||
      !Number.isFinite(battle.initialShipHitPoints) || battle.initialShipHitPoints <= 0 ||
      !Number.isFinite(battle.maxShipHitPoints) || battle.maxShipHitPoints <= 0 ||
      battle.initialShipHitPoints > battle.maxShipHitPoints) {
    throw new Error("Port assault ship timeline requires a recorded battle");
  }
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) {
    throw new Error(`Invalid port assault ship timeline time: ${elapsedMs}`);
  }
}

function validateShipHitEvent(event, maxShipHitPoints) {
  if (!Number.isFinite(event.timeMs) || event.timeMs < 0 ||
      !Number.isFinite(event.damage) || event.damage <= 0 ||
      !Number.isFinite(event.shipHitPoints) || event.shipHitPoints < 0 ||
      event.shipHitPoints > maxShipHitPoints) {
    throw new Error(`Invalid port assault ship-hit event for ${event.unitId}`);
  }
}

function createBattleUnits(combatants, side, modifiers, random) {
  return combatants.map((combatant, index) => {
    const stats = portAssaultUnitStats(combatant, modifiers);
    const wave = Math.floor(index / PORT_ASSAULT_WAVE_SIZE);
    const wavePosition = index % PORT_ASSAULT_WAVE_SIZE;
    const spawnAtMs = PORT_ASSAULT_FIRST_WAVE_DELAY_MS +
      wave * PORT_ASSAULT_WAVE_INTERVAL_MS +
      wavePosition * PORT_ASSAULT_WAVE_MEMBER_INTERVAL_MS +
      Math.floor(random() * PORT_ASSAULT_WAVE_JITTER_MS);
    return {
      ...combatant,
      side,
      stats,
      hitPoints: stats.hitPoints,
      alive: true,
      spawnAtMs,
      nextPrimaryAttackAtMs: spawnAtMs + Math.floor(random() * stats.cooldownMs),
      nextMeleeAttackAtMs: stats.meleeFallback
        ? spawnAtMs + Math.floor(random() * stats.meleeFallback.cooldownMs)
        : null,
      position: side === PORT_ASSAULT_SIDE.ATTACKER ? 0.04 : 0.96,
      lane: (index + Math.floor(random() * 4)) % 4,
      initiative: random(),
      actionAnimationId: null,
      actionStartedAtMs: 0,
      actionUntilMs: 0,
      moving: false,
      momentum: 0,
      spawned: side === PORT_ASSAULT_SIDE.DEFENDER,
      landed: side === PORT_ASSAULT_SIDE.DEFENDER,
      jumpStartedAtMs: null
    };
  });
}

function attackUnit(attacker, target, attackProfile, timeMs, random, events) {
  const chargeMomentum = attacker.momentum;
  const chargeDamageMultiplier = 1 +
    (attacker.stats.chargeDamageMultiplier - 1) * chargeMomentum;
  const chargeKnockbackMultiplier = 1 +
    (attacker.stats.chargeKnockbackMultiplier - 1) * chargeMomentum;
  attacker.momentum = 0;
  setNextAttackAtMs(
    attacker,
    attackProfile,
    timeMs + attackProfile.cooldownMs * (0.88 + random() * 0.24)
  );
  attacker.actionAnimationId = "attack";
  attacker.actionStartedAtMs = timeMs;
  attacker.actionUntilMs = timeMs + attackActionDurationMs(attackProfile.attackType);
  pushEvent(events, {
    timeMs,
    type: "attack",
    unitId: attacker.id,
    targetId: target.id,
    attackType: attackProfile.attackType,
    chargeMomentum
  });
  const matchupMultiplier = target.stats.mounted
    ? attacker.stats.antiMountedDamageMultiplier
    : 1;
  const effectiveAttack = attackProfile.attack * chargeDamageMultiplier * matchupMultiplier;
  const attackRatio = effectiveAttack / Math.max(1, target.stats.defense);
  const hitChance = clamp(0.42 + Math.log2(attackRatio) * 0.16, 0.18, 0.82);
  if (random() >= hitChance) return;
  if (target.stats.blockChance > 0 && random() < target.stats.blockChance) {
    target.actionAnimationId = "block";
    target.actionStartedAtMs = timeMs;
    target.actionUntilMs = timeMs + 480;
    pushEvent(events, { timeMs, type: "block", unitId: target.id, attackerId: attacker.id });
    return;
  }
  const damage = portAssaultDamageAfterMitigation({
    attackPower: effectiveAttack * (0.72 + random() * 0.56),
    attackType: attackProfile.attackType,
    armorPenetration: attackProfile.armorPenetration,
    targetDefense: target.stats.defense,
    targetArmorCoverage: target.stats.armorCoverage
  });
  const positionBeforeHit = target.position;
  const direction = attacker.side === PORT_ASSAULT_SIDE.ATTACKER ? 1 : -1;
  const knockbackDistance = portAssaultKnockbackDistance({
    attackType: attackProfile.attackType,
    damage,
    unitKnockbackMultiplier: attacker.stats.knockbackMultiplier,
    chargeKnockbackMultiplier
  });
  target.position = clamp(target.position + direction * knockbackDistance, 0, 1);
  const knockbackPositionDelta = target.position - positionBeforeHit;
  target.hitPoints = Math.max(0, target.hitPoints - damage);
  target.actionAnimationId = target.hitPoints === 0 ? "death" : "hit";
  target.actionStartedAtMs = timeMs;
  target.actionUntilMs = target.hitPoints === 0 ? Number.POSITIVE_INFINITY : timeMs + 360;
  pushEvent(events, {
    timeMs,
    type: target.hitPoints === 0 ? "death" : "hit",
    unitId: target.id,
    attackerId: attacker.id,
    attackType: attackProfile.attackType,
    chargeMomentum,
    knockbackPositionDelta,
    damage,
    hitPoints: target.hitPoints
  });
  if (target.hitPoints === 0) target.alive = false;
}

function nearestLivingOpponent(unit, opponents, timeMs) {
  let selected = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const candidate of opponents) {
    if (!candidate.alive || timeMs < candidate.spawnAtMs) continue;
    const distance = Math.abs(candidate.position - unit.position) + Math.abs(candidate.lane - unit.lane) * 0.006;
    if (distance < bestDistance || (distance === bestDistance && candidate.id < selected.id)) {
      selected = candidate;
      bestDistance = distance;
    }
  }
  return selected;
}

function recordTracks(tracks, units, timeMs, dockKind) {
  for (const unit of units) {
    const hidden = timeMs < unit.spawnAtMs;
    const animationId = resolvedAnimation(unit, timeMs, dockKind);
    const animationStartedAtMs = animationId === "jump"
      ? unit.jumpStartedAtMs
      : animationId === unit.actionAnimationId
        ? unit.actionStartedAtMs
        : 0;
    if (!Number.isFinite(animationStartedAtMs) || animationStartedAtMs > timeMs) {
      throw new Error(`Invalid port assault animation start for ${unit.id}: ${animationStartedAtMs}`);
    }
    const entry = {
      timeMs,
      hidden,
      position: unit.position,
      lane: unit.lane,
      animationId,
      animationStartedAtMs,
      alive: unit.alive,
      inWater: unit.side === PORT_ASSAULT_SIDE.ATTACKER && dockKind === "none" &&
        unit.landed && timeMs < unit.jumpStartedAtMs + 1250
    };
    tracks[unit.id].push(Object.freeze(entry));
  }
}

function resolvedAnimation(unit, timeMs, dockKind) {
  if (timeMs < unit.spawnAtMs) return "idle";
  if (!unit.alive) return "death";
  if (unit.side === PORT_ASSAULT_SIDE.ATTACKER &&
      !unit.landed) {
    portAssaultLandingDurationMs(dockKind);
    return "jump";
  }
  if (unit.actionUntilMs > timeMs) {
    if (!unit.actionAnimationId) throw new Error(`Port assault unit ${unit.id} lost its action animation`);
    return unit.actionAnimationId;
  }
  return unit.moving ? "walk" : "idle";
}

function trackFrameAt(track, elapsedMs) {
  if (track.length === 0 || elapsedMs < track[0].timeMs) return null;
  let low = 0;
  let high = track.length - 1;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (track[middle].timeMs <= elapsedMs) low = middle;
    else high = middle - 1;
  }
  const before = track[low];
  const after = track[Math.min(track.length - 1, low + 1)];
  if (before.hidden || before.animationId === "death" || after.timeMs === before.timeMs) return before;
  if (
    after.position !== before.position &&
    ["hit", "death"].includes(after.animationId) &&
    after.animationStartedAtMs === after.timeMs
  ) {
    return before;
  }
  const t = clamp((elapsedMs - before.timeMs) / (after.timeMs - before.timeMs), 0, 1);
  return Object.freeze({
    ...before,
    position: before.position + (after.position - before.position) * t
  });
}

function remainingPower(units, side) {
  return units
    .filter((unit) => unit.side === side && unit.alive)
    .reduce((sum, unit) => sum + unit.hitPoints + unit.stats.attack * 1.5 + unit.stats.defense, 0);
}

function nextAttackAtMs(unit, attackProfile) {
  return attackProfile === unit.stats.meleeFallback
    ? unit.nextMeleeAttackAtMs
    : unit.nextPrimaryAttackAtMs;
}

function setNextAttackAtMs(unit, attackProfile, timeMs) {
  if (!Number.isFinite(timeMs) || timeMs < 0) {
    throw new Error(`Invalid next attack time for ${unit.id}: ${timeMs}`);
  }
  if (attackProfile === unit.stats.meleeFallback) unit.nextMeleeAttackAtMs = timeMs;
  else if (attackProfile === unit.stats) unit.nextPrimaryAttackAtMs = timeMs;
  else throw new Error(`Port assault unit ${unit.id} received an unknown attack profile`);
}

function damageMultiplierForType(attackType, modifiers) {
  if (attackType === PORT_ASSAULT_ATTACK_TYPE.MELEE) return modifiers.meleeDamageMultiplier;
  if (attackType === PORT_ASSAULT_ATTACK_TYPE.ARROW) return modifiers.arrowDamageMultiplier;
  if (attackType === PORT_ASSAULT_ATTACK_TYPE.FIREARM) return modifiers.firearmDamageMultiplier;
  throw new Error(`Unknown port assault attack type: ${attackType}`);
}

function attackActionDurationMs(attackType) {
  if (attackType === PORT_ASSAULT_ATTACK_TYPE.MELEE) return 1000;
  if (attackType === PORT_ASSAULT_ATTACK_TYPE.ARROW) return 1500;
  if (attackType === PORT_ASSAULT_ATTACK_TYPE.FIREARM) return 1100;
  throw new Error(`Unknown port assault attack type: ${attackType}`);
}

function validateAttackStats(stats) {
  if (!stats || typeof stats !== "object" || !Number.isFinite(stats.attack) || stats.attack <= 0) {
    throw new Error("Port assault attack profile requires valid unit stats");
  }
  damageMultiplierForType(stats.attackType, DEFAULT_MODIFIERS);
  if (!Number.isFinite(stats.range) || stats.range <= 0 ||
      !Number.isFinite(stats.cooldownMs) || stats.cooldownMs <= 0) {
    throw new Error("Port assault attack profile has invalid range or cooldown");
  }
  requireUnitInterval(stats.armorPenetration, "armorPenetration");
}

function validateScenario(scenario) {
  if (!scenario || typeof scenario !== "object") throw new Error("Port assault scenario is required");
  createPortAssaultScenario(scenario);
}

function validateCombatants(combatants, side) {
  if (!Array.isArray(combatants)) throw new Error(`Port assault ${side} combatants must be an array`);
  const ids = new Set();
  for (const combatant of combatants) {
    validateCombatant(combatant);
    if (ids.has(combatant.id)) throw new Error(`Duplicate port assault combatant ID: ${combatant.id}`);
    ids.add(combatant.id);
  }
}

function validateCombatant(combatant) {
  if (!combatant || typeof combatant !== "object" || Array.isArray(combatant)) {
    throw new Error("Port assault combatant must be an object");
  }
  for (const key of ["id", "appearanceId", "crewTypeId", "combatProfileId"]) {
    if (typeof combatant[key] !== "string" || combatant[key].trim() === "") {
      throw new Error(`Port assault combatant requires ${key}`);
    }
  }
  if (!Number.isInteger(combatant.experienceStars) || combatant.experienceStars < 0 || combatant.experienceStars > 3) {
    throw new Error(`Invalid port assault experience for ${combatant.id}: ${combatant.experienceStars}`);
  }
  if (combatant.auxiliary !== undefined && typeof combatant.auxiliary !== "boolean") {
    throw new Error(`Invalid auxiliary flag for ${combatant.id}`);
  }
  portAssaultUnitProfile(combatant.combatProfileId);
}

function validateModifiers(modifiers) {
  if (!modifiers || typeof modifiers !== "object" || Array.isArray(modifiers)) {
    throw new Error("Port assault modifiers must be an object");
  }
  for (const key of [
    "meleeDamageMultiplier",
    "arrowDamageMultiplier",
    "firearmDamageMultiplier",
    "defenseMultiplier"
  ]) {
    if (!Number.isFinite(modifiers[key]) || modifiers[key] < 0.5 || modifiers[key] > 3) {
      throw new Error(`Invalid port assault modifier ${key}: ${modifiers[key]}`);
    }
  }
  if (!Number.isFinite(modifiers.armorCoverageBonus) ||
      modifiers.armorCoverageBonus < 0 || modifiers.armorCoverageBonus > 0.5) {
    throw new Error(`Invalid port assault modifier armorCoverageBonus: ${modifiers.armorCoverageBonus}`);
  }
  for (const key of Object.keys(modifiers)) {
    if (!(key in DEFAULT_MODIFIERS)) throw new Error(`Unknown port assault modifier: ${key}`);
  }
}

function freezeCombatant(combatant) {
  return Object.freeze({
    id: combatant.id,
    appearanceId: combatant.appearanceId,
    crewTypeId: combatant.crewTypeId,
    combatProfileId: combatant.combatProfileId,
    experienceStars: combatant.experienceStars,
    auxiliary: combatant.auxiliary === true
  });
}

function freezeModifiers(modifiers) {
  return Object.freeze(Object.fromEntries(Object.keys(DEFAULT_MODIFIERS).map((key) => [key, modifiers[key]])));
}

function freezeTracks(tracks) {
  return Object.freeze(Object.fromEntries(Object.entries(tracks).map(([id, track]) => [id, Object.freeze(track)])));
}

function unitType({
  attack,
  defense,
  hitPoints,
  attackType = PORT_ASSAULT_ATTACK_TYPE.MELEE,
  range,
  cooldownMs,
  movementPerSecond,
  armorCoverage,
  armorPenetration,
  antiMountedDamageMultiplier = 1,
  mounted = false,
  blockChance = 0,
  knockbackMultiplier = 1,
  chargeDamageMultiplier = 1,
  chargeKnockbackMultiplier = 1,
  meleeFallback = null
}) {
  const profile = {
    attack,
    defense,
    hitPoints,
    attackType,
    range,
    cooldownMs,
    movementPerSecond,
    armorCoverage,
    armorPenetration,
    antiMountedDamageMultiplier,
    mounted,
    blockChance,
    knockbackMultiplier,
    chargeDamageMultiplier,
    chargeKnockbackMultiplier,
    meleeFallback
  };
  validateUnitType(profile);
  return Object.freeze(profile);
}

function rangedUnitType({
  meleeAttack,
  meleeCooldownMs,
  meleeArmorPenetration,
  ...primary
}) {
  const { attackType } = primary;
  if (attackType !== PORT_ASSAULT_ATTACK_TYPE.ARROW && attackType !== PORT_ASSAULT_ATTACK_TYPE.FIREARM) {
    throw new Error(`Ranged port assault unit has invalid attack type: ${attackType}`);
  }
  return unitType({
    ...primary,
    meleeFallback: Object.freeze({
      attack: meleeAttack,
      attackType: PORT_ASSAULT_ATTACK_TYPE.MELEE,
      range: RANGED_MELEE_RANGE,
      cooldownMs: meleeCooldownMs,
      armorPenetration: meleeArmorPenetration
    })
  });
}

function validateUnitType(profile) {
  for (const key of [
    "attack",
    "defense",
    "hitPoints",
    "range",
    "cooldownMs",
    "movementPerSecond",
    "antiMountedDamageMultiplier",
    "knockbackMultiplier",
    "chargeDamageMultiplier",
    "chargeKnockbackMultiplier"
  ]) {
    if (!Number.isFinite(profile[key]) || profile[key] <= 0) {
      throw new Error(`Invalid port assault unit profile ${key}: ${profile[key]}`);
    }
  }
  if (!Number.isFinite(profile.blockChance) || profile.blockChance < 0 || profile.blockChance > 1) {
    throw new Error(`Invalid port assault unit block chance: ${profile.blockChance}`);
  }
  requireUnitInterval(profile.armorCoverage, "armorCoverage");
  requireUnitInterval(profile.armorPenetration, "armorPenetration");
  if (typeof profile.mounted !== "boolean") {
    throw new Error(`Invalid port assault unit mounted state: ${profile.mounted}`);
  }
  damageMultiplierForType(profile.attackType, DEFAULT_MODIFIERS);
  if (profile.meleeFallback) validateAttackStats(profile.meleeFallback);
}

function createRandom(seed) {
  let value = seed || 0x9e3779b9;
  return () => {
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    return (value >>> 0) / 0x100000000;
  };
}

function hashString32(value) {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function percentile(sorted, portion) {
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * portion))];
}

function pushEvent(events, event) {
  if (events) events.push(event);
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function requirePositiveNumber(value, label) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`Invalid port assault knockback ${label}: ${value}`);
  }
}

function requirePositiveCombatValue(value, label) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`Invalid port assault combat ${label}: ${value}`);
  }
}

function requireNonNegativeCombatValue(value, label) {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`Invalid port assault combat ${label}: ${value}`);
  }
}

function requireUnitInterval(value, label) {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`Invalid port assault combat ${label}: ${value}`);
  }
}
