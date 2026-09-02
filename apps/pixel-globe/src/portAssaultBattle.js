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

export const PORT_ASSAULT_STEP_MS = 200;
export const PORT_ASSAULT_MAX_DURATION_MS = 120_000;
export const PORT_ASSAULT_FORECAST_SAMPLES = 32;

const TRACK_INTERVAL_MS = PORT_ASSAULT_STEP_MS;
const SHIP_ATTACK_INTERVAL_MS = 900;
const EXPERIENCE_ATTACK_MULTIPLIER = 0.08;
const EXPERIENCE_DEFENSE_MULTIPLIER = 0.05;
const EXPERIENCE_HIT_POINTS_MULTIPLIER = 0.06;

const UNIT_TYPES = Object.freeze({
  sailor: unitType(8, 5, 28, PORT_ASSAULT_ATTACK_TYPE.MELEE, 0.026, 1200, 0.043),
  warrior: unitType(9, 6, 32, PORT_ASSAULT_ATTACK_TYPE.MELEE, 0.027, 1150, 0.042),
  swordsman: unitType(11, 7, 34, PORT_ASSAULT_ATTACK_TYPE.MELEE, 0.028, 1080, 0.041),
  ronin: unitType(13, 8, 38, PORT_ASSAULT_ATTACK_TYPE.MELEE, 0.029, 1020, 0.042),
  spearman: unitType(10, 8, 36, PORT_ASSAULT_ATTACK_TYPE.MELEE, 0.036, 1200, 0.039),
  halberdier: unitType(12, 8, 38, PORT_ASSAULT_ATTACK_TYPE.MELEE, 0.036, 1280, 0.037),
  shieldman: unitType(8, 11, 44, PORT_ASSAULT_ATTACK_TYPE.MELEE, 0.027, 1250, 0.035, 0.34),
  archer: unitType(9, 4, 27, PORT_ASSAULT_ATTACK_TYPE.ARROW, 0.18, 1800, 0.038),
  crossbowman: unitType(12, 5, 30, PORT_ASSAULT_ATTACK_TYPE.ARROW, 0.17, 2300, 0.035),
  hunter: unitType(8, 5, 30, PORT_ASSAULT_ATTACK_TYPE.ARROW, 0.16, 1650, 0.04),
  gunner: unitType(15, 4, 28, PORT_ASSAULT_ATTACK_TYPE.FIREARM, 0.2, 3000, 0.034)
});

const DEFAULT_MODIFIERS = Object.freeze({
  meleeDamageMultiplier: 1,
  arrowDamageMultiplier: 1,
  firearmDamageMultiplier: 1,
  defenseMultiplier: 1,
  hitPointsMultiplier: 1
});

export function portAssaultUnitType(crewTypeId) {
  const type = UNIT_TYPES[crewTypeId];
  if (!type) throw new Error(`Unknown port assault crew type: ${crewTypeId}`);
  return type;
}

export function portAssaultUnitStats(combatant, modifiers = DEFAULT_MODIFIERS) {
  validateCombatant(combatant);
  validateModifiers(modifiers);
  const base = portAssaultUnitType(combatant.crewTypeId);
  const stars = combatant.experienceStars;
  const damageMultiplier = {
    [PORT_ASSAULT_ATTACK_TYPE.MELEE]: modifiers.meleeDamageMultiplier,
    [PORT_ASSAULT_ATTACK_TYPE.ARROW]: modifiers.arrowDamageMultiplier,
    [PORT_ASSAULT_ATTACK_TYPE.FIREARM]: modifiers.firearmDamageMultiplier
  }[base.attackType];
  return Object.freeze({
    attack: base.attack * (1 + stars * EXPERIENCE_ATTACK_MULTIPLIER) * damageMultiplier,
    defense: base.defense * (1 + stars * EXPERIENCE_DEFENSE_MULTIPLIER) * modifiers.defenseMultiplier,
    hitPoints: Math.round(
      base.hitPoints * (1 + stars * EXPERIENCE_HIT_POINTS_MULTIPLIER) * modifiers.hitPointsMultiplier
    ),
    attackType: base.attackType,
    range: base.range,
    cooldownMs: base.cooldownMs,
    movementPerSecond: base.movementPerSecond,
    blockChance: base.blockChance
  });
}

export function portAssaultGarrisonCount(city) {
  if (!city || typeof city !== "object") throw new Error("Port assault garrison requires a city");
  if (!Number.isFinite(city.population) || city.population < 0) {
    throw new Error(`Invalid port assault city population: ${city.population}`);
  }
  const populationRank = Math.max(0, Math.floor(Math.log10(Math.max(1000, city.population)) * 3 - 8));
  return Math.min(24, 5 + populationRank + (city.isFactionCapital === true ? 5 : 0));
}

export function createPortAssaultScenario({
  cityId,
  attackers,
  defenders,
  shipHitPoints,
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
  if (typeof fortified !== "boolean") throw new Error("Port assault fortification must be boolean");
  if (!["wood", "stone", "none"].includes(dockKind)) {
    throw new Error(`Invalid port assault dock: ${dockKind}`);
  }
  validateModifiers(attackerModifiers);
  validateModifiers(defenderModifiers);
  return Object.freeze({
    cityId,
    attackers: Object.freeze(attackers.map(freezeCombatant)),
    defenders: Object.freeze(defenders.map(freezeCombatant)),
    shipHitPoints,
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
    if (!attackers.some((unit) => unit.alive)) {
      winner = PORT_ASSAULT_SIDE.DEFENDER;
      break;
    }
    if (!defenders.some((unit) => unit.alive) &&
        attackers.some((unit) => unit.alive && unit.position >= 0.985)) {
      winner = PORT_ASSAULT_SIDE.ATTACKER;
      break;
    }

    for (const unit of initiativeOrder) {
      if (!unit.alive || timeMs < unit.spawnAtMs) continue;
      unit.moving = false;
      if (!unit.spawned) {
        unit.spawned = true;
        pushEvent(events, { timeMs, type: "jump", unitId: unit.id, dockKind: scenario.dockKind });
      }
      const landingDurationMs = scenario.dockKind === "none" ? 720 : 520;
      if (!unit.landed && timeMs >= unit.spawnAtMs + landingDurationMs) {
        unit.landed = true;
        pushEvent(events, {
          timeMs,
          type: scenario.dockKind === "none" ? "splash" : "dock-land",
          unitId: unit.id,
          dockKind: scenario.dockKind
        });
      }
      if (unit.actionUntilMs > timeMs) continue;
      const opponents = unit.side === PORT_ASSAULT_SIDE.ATTACKER ? defenders : attackers;
      const target = nearestLivingOpponent(unit, opponents, timeMs);
      if (target && Math.abs(target.position - unit.position) <= unit.stats.range) {
        if (timeMs >= unit.nextAttackAtMs) attackUnit(unit, target, timeMs, random, events);
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
        if (timeMs >= unit.nextAttackAtMs) {
          const damage = Math.max(1, Math.round(unit.stats.attack * (0.38 + random() * 0.18)));
          shipHitPoints = Math.max(0, shipHitPoints - damage);
          unit.nextAttackAtMs = timeMs + SHIP_ATTACK_INTERVAL_MS;
          unit.actionAnimationId = "attack";
          unit.actionUntilMs = timeMs + 520;
          pushEvent(events, { timeMs, type: "ship-hit", unitId: unit.id, damage, shipHitPoints });
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
    units: Object.freeze(units),
    events: Object.freeze(battle.events.filter((event) => (
      event.timeMs > elapsedMs - eventPresentationDurationMs(event.type) && event.timeMs <= elapsedMs
    )))
  });
}

function eventPresentationDurationMs(type) {
  if (["splash", "dock-land", "death"].includes(type)) return 500;
  if (["attack", "block", "hit", "ship-hit"].includes(type)) return 220;
  return PORT_ASSAULT_STEP_MS;
}

function createBattleUnits(combatants, side, modifiers, random) {
  return combatants.map((combatant, index) => {
    const stats = portAssaultUnitStats(combatant, modifiers);
    const group = Math.floor(index / 3);
    const spawnAtMs = 300 + group * 680 + (index % 3) * 120 + Math.floor(random() * 180);
    return {
      ...combatant,
      side,
      stats,
      hitPoints: stats.hitPoints,
      alive: true,
      spawnAtMs,
      nextAttackAtMs: spawnAtMs + Math.floor(random() * stats.cooldownMs),
      position: side === PORT_ASSAULT_SIDE.ATTACKER ? 0.04 : 0.96,
      lane: (index + Math.floor(random() * 4)) % 4,
      initiative: random(),
      actionAnimationId: null,
      actionUntilMs: 0,
      moving: false,
      spawned: side === PORT_ASSAULT_SIDE.DEFENDER,
      landed: side === PORT_ASSAULT_SIDE.DEFENDER
    };
  });
}

function attackUnit(attacker, target, timeMs, random, events) {
  attacker.nextAttackAtMs = timeMs + attacker.stats.cooldownMs * (0.88 + random() * 0.24);
  attacker.actionAnimationId = "attack";
  attacker.actionUntilMs = timeMs + Math.min(520, attacker.stats.cooldownMs * 0.45);
  pushEvent(events, {
    timeMs,
    type: "attack",
    unitId: attacker.id,
    targetId: target.id,
    attackType: attacker.stats.attackType
  });
  const attackRatio = attacker.stats.attack / Math.max(1, target.stats.defense);
  const hitChance = clamp(0.42 + Math.log2(attackRatio) * 0.16, 0.18, 0.82);
  if (random() >= hitChance) return;
  if (target.stats.blockChance > 0 && random() < target.stats.blockChance) {
    target.actionAnimationId = "block";
    target.actionUntilMs = timeMs + 480;
    pushEvent(events, { timeMs, type: "block", unitId: target.id, attackerId: attacker.id });
    return;
  }
  const rawDamage = attacker.stats.attack * (0.72 + random() * 0.56) - target.stats.defense * 0.34;
  const damage = Math.max(1, Math.round(rawDamage));
  target.hitPoints = Math.max(0, target.hitPoints - damage);
  target.actionAnimationId = target.hitPoints === 0 ? "death" : "hit";
  target.actionUntilMs = target.hitPoints === 0 ? Number.POSITIVE_INFINITY : timeMs + 360;
  pushEvent(events, {
    timeMs,
    type: target.hitPoints === 0 ? "death" : "hit",
    unitId: target.id,
    attackerId: attacker.id,
    attackType: attacker.stats.attackType,
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
    const entry = {
      timeMs,
      hidden,
      position: unit.position,
      lane: unit.lane,
      animationId: resolvedAnimation(unit, timeMs, dockKind),
      alive: unit.alive,
      inWater: unit.side === PORT_ASSAULT_SIDE.ATTACKER && dockKind === "none" &&
        timeMs >= unit.spawnAtMs && timeMs < unit.spawnAtMs + 1250
    };
    tracks[unit.id].push(Object.freeze(entry));
  }
}

function resolvedAnimation(unit, timeMs, dockKind) {
  if (timeMs < unit.spawnAtMs) return "idle";
  if (!unit.alive) return "death";
  if (unit.side === PORT_ASSAULT_SIDE.ATTACKER &&
      timeMs - unit.spawnAtMs < (dockKind === "none" ? 720 : 520)) return "jump";
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
  for (const key of ["id", "appearanceId", "crewTypeId"]) {
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
  portAssaultUnitType(combatant.crewTypeId);
}

function validateModifiers(modifiers) {
  if (!modifiers || typeof modifiers !== "object" || Array.isArray(modifiers)) {
    throw new Error("Port assault modifiers must be an object");
  }
  for (const key of Object.keys(DEFAULT_MODIFIERS)) {
    if (!Number.isFinite(modifiers[key]) || modifiers[key] < 0.5 || modifiers[key] > 3) {
      throw new Error(`Invalid port assault modifier ${key}: ${modifiers[key]}`);
    }
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

function unitType(attack, defense, hitPoints, attackType, range, cooldownMs, movementPerSecond, blockChance = 0) {
  return Object.freeze({ attack, defense, hitPoints, attackType, range, cooldownMs, movementPerSecond, blockChance });
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
