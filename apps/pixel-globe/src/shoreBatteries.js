import { applyCrewCasualties, crewWoundsForceSurrender } from "./combatWounds.js";

export const SHORE_BATTERY_DISABLE_DAYS = 3;
export const SHORE_BATTERY_DISABLE_MINUTES = SHORE_BATTERY_DISABLE_DAYS * 24 * 60;
export const SHORE_BATTERY_RANGE_PX = 76;
export const SHORE_BATTERY_RELOAD_SECONDS = 14;
export const SHORE_BATTERY_HIT_POINTS_PER_GUN = 16;
export const SHORE_BATTERY_GARRISON_PER_GUN = 6;
export const SHORE_BATTERY_CREW_PROTECTION = 65;
export const SHORE_BATTERY_PORTABLE_HIT_CHANCE_SCALE = 0.25;
export const SHORE_BATTERY_NOTICE_RADIUS_PX = 148;
export const SHORE_BATTERY_MAX_LEVEL = 4;

export function shoreBatteryPlayerEngagementRange({
  batteryRangePx,
  playerWeaponRangePx,
  commissioned
}) {
  for (const [label, value] of [
    ["battery range", batteryRangePx],
    ["player weapon range", playerWeaponRangePx]
  ]) {
    if (!Number.isFinite(value) || value < 0) throw new Error(`Invalid ${label}: ${value}`);
  }
  if (typeof commissioned !== "boolean") {
    throw new Error(`Invalid commissioned attack state: ${commissioned}`);
  }
  return commissioned ? Math.max(batteryRangePx, playerWeaponRangePx) : batteryRangePx;
}

const SHORE_BATTERY_LEVELS = Object.freeze([
  null,
  Object.freeze({ level: 1, id: "outpost", label: "harbor watch", gunCount: 1 }),
  Object.freeze({ level: 2, id: "battery", label: "shore battery", gunCount: 2 }),
  Object.freeze({ level: 3, id: "fortress", label: "harbor fortress", gunCount: 4 }),
  Object.freeze({ level: 4, id: "arsenal", label: "capital arsenal", gunCount: 6 })
]);

const DISABLED_UNTIL_PREFIX = "shoreBatteryDisabledUntil:";
const DISABLED_BY_SHIP_PREFIX = "shoreBatteryDisabledByShip:";
const WAR_WARNING_SEEN_PREFIX = "shoreBatteryWarWarningSeen:";
const UPGRADE_LEVEL_PREFIX = "shoreBatteryUpgradeLevel:";

export function shoreBatteryId(city) {
  assertCity(city);
  return `shore-battery:${city.portId || `city-${city.tileId}`}`;
}

export function shoreBatteryLevel(city, flags = null) {
  assertCity(city);
  if (flags !== null) assertFlags(flags);
  const population = Number.isFinite(city.population) ? city.population : 0;
  const baseLevel = city.isFactionCapital
    ? population >= 100000 ? 4 : 3
    : population >= 200000
      ? 3
      : population >= 50000
        ? 2
        : 1;
  return Math.min(SHORE_BATTERY_MAX_LEVEL, baseLevel + readUpgradeLevel(flags, city));
}

export function shoreBatteryTier(city, flags = null) {
  return SHORE_BATTERY_LEVELS[shoreBatteryLevel(city, flags)];
}

export function shoreBatteryGunCount(city, flags = null) {
  return shoreBatteryTier(city, flags).gunCount;
}

export function upgradeShoreBattery(city, flags, levels = 1) {
  assertCity(city);
  assertFlags(flags);
  if (!Number.isInteger(levels) || levels <= 0) {
    throw new Error(`Invalid shore battery upgrade increment: ${levels}`);
  }
  const before = shoreBatteryLevel(city, flags);
  const base = shoreBatteryLevel(city);
  const after = Math.min(SHORE_BATTERY_MAX_LEVEL, before + levels);
  flags[upgradeFlagKey(city.portId || `city-${city.tileId}`)] = after - base;
  return Object.freeze({
    cityTileId: city.tileId,
    cityName: city.portAlias || city.displayCity || city.city,
    before,
    after,
    gunCount: SHORE_BATTERY_LEVELS[after].gunCount,
    upgraded: after > before
  });
}

export function shoreBatteryMayDemandToll(city, flags = null) {
  return shoreBatteryGunCount(city, flags) >= 2;
}

export function shoreBatteryWarWarningSeen(flags, factionId) {
  assertFlags(flags);
  assertFactionId(factionId);
  const value = flags[warWarningSeenFlagKey(factionId)];
  if (value === undefined) return false;
  if (value !== true) throw new Error(`Invalid shore battery warning memory for ${factionId}: ${value}`);
  return true;
}

export function rememberShoreBatteryWarWarning(flags, factionId) {
  assertFlags(flags);
  assertFactionId(factionId);
  flags[warWarningSeenFlagKey(factionId)] = true;
}

export function createShoreBatteryState(city, flags, simMinute) {
  assertCity(city);
  assertFlags(flags);
  assertMinute(simMinute);
  const tier = shoreBatteryTier(city, flags);
  const gunCount = tier.gunCount;
  const maxHitPoints = gunCount * SHORE_BATTERY_HIT_POINTS_PER_GUN;
  const maxGarrison = gunCount * SHORE_BATTERY_GARRISON_PER_GUN;
  const disabledUntilMinute = readDisabledUntil(flags, city);
  const disabled = disabledUntilMinute > simMinute;
  return {
    id: shoreBatteryId(city),
    cityTileId: city.tileId,
    cityName: city.portAlias || city.displayCity || city.city,
    portId: city.portId || `city-${city.tileId}`,
    factionId: city.factionId,
    cultureType: city.cityType || null,
    batteryLevel: tier.level,
    batteryTierId: tier.id,
    gunCount,
    maxHitPoints,
    maxGarrison,
    garrisonCrew: maxGarrison,
    woundedGarrison: 0,
    hitPoints: disabled ? 0 : maxHitPoints,
    disabledUntilMinute: disabled ? disabledUntilMinute : null,
    disabledByShipLabel: disabled ? readDisabledByShip(flags, city) : null,
    cooldownSeconds: 0,
    shotSequence: 0,
    engagedTargetIds: new Set(),
    playerHailed: false,
    playerAttackActive: false,
    playerAttackRecorded: false
  };
}

export function updateShoreBatteryState(state, flags, simMinute, dt) {
  assertState(state);
  assertFlags(flags);
  assertMinute(simMinute);
  if (!Number.isFinite(dt) || dt < 0) throw new Error(`Invalid shore battery elapsed time: ${dt}`);
  state.cooldownSeconds = Math.max(0, state.cooldownSeconds - dt);
  if (state.disabledUntilMinute === null || simMinute < state.disabledUntilMinute) return false;
  delete flags[disabledFlagKey(state.portId)];
  delete flags[disabledByShipFlagKey(state.portId)];
  state.disabledUntilMinute = null;
  state.disabledByShipLabel = null;
  state.hitPoints = state.maxHitPoints;
  state.garrisonCrew = state.maxGarrison;
  state.woundedGarrison = 0;
  state.engagedTargetIds.clear();
  state.playerHailed = false;
  state.playerAttackActive = false;
  state.playerAttackRecorded = false;
  return true;
}

export function damageShoreBattery(state, flags, damage, simMinute, attackerShipLabel) {
  assertState(state);
  assertFlags(flags);
  assertMinute(simMinute);
  if (!Number.isFinite(damage) || damage <= 0) throw new Error(`Invalid shore battery damage: ${damage}`);
  assertAttackerShipLabel(attackerShipLabel);
  if (shoreBatteryIsDisabled(state, simMinute)) {
    return { hitPoints: 0, disabled: true, newlyDisabled: false };
  }
  state.hitPoints = Math.max(0, state.hitPoints - damage);
  if (state.hitPoints > 0) return { hitPoints: state.hitPoints, disabled: false, newlyDisabled: false };
  disableShoreBattery(state, flags, simMinute, attackerShipLabel);
  return { hitPoints: 0, disabled: true, newlyDisabled: true };
}

export function damageShoreBatteryCrew(
  state,
  flags,
  { crewDamage, crewHitChance, crewFatalityChance = 0, crewProtectionPenetration = 0 },
  simMinute,
  attackerShipLabel,
  random = Math.random
) {
  assertState(state);
  assertFlags(flags);
  assertMinute(simMinute);
  assertAttackerShipLabel(attackerShipLabel);
  if (shoreBatteryIsDisabled(state, simMinute)) {
    return {
      totalCrew: state.garrisonCrew,
      woundedGarrison: state.woundedGarrison,
      newWounds: 0,
      newDeaths: 0,
      disabled: true,
      newlyDisabled: false
    };
  }
  const result = applyCrewCasualties({
    totalCrew: state.garrisonCrew,
    woundedCrew: state.woundedGarrison,
    crewDamage,
    hitChance: crewHitChance,
    fatalityChance: crewFatalityChance,
    crewProtection: SHORE_BATTERY_CREW_PROTECTION,
    crewProtectionPenetration,
    preserveFinalCrew: true,
    random
  });
  state.garrisonCrew = result.totalCrew;
  state.woundedGarrison = result.woundedCrew;
  const surrendered = crewWoundsForceSurrender(state.garrisonCrew, state.woundedGarrison);
  if (!surrendered) {
    return { ...result, disabled: false, newlyDisabled: false };
  }
  state.hitPoints = 0;
  disableShoreBattery(state, flags, simMinute, attackerShipLabel);
  return { ...result, disabled: true, newlyDisabled: true };
}

export function shoreBatteryPortableImpact({
  crewDamage,
  crewHitChance,
  crewFatalityChance = 0,
  crewProtectionPenetration = 0,
  hullDamage,
  hullHitChance = 1
}) {
  if (!Number.isInteger(crewDamage) || crewDamage <= 0) {
    throw new Error(`Invalid shore battery portable crew damage: ${crewDamage}`);
  }
  for (const [label, value] of [
    ["hit chance", crewHitChance],
    ["fatality chance", crewFatalityChance],
    ["protection penetration", crewProtectionPenetration]
  ]) {
    if (!Number.isFinite(value) || value < 0 || value > 1) {
      throw new Error(`Invalid shore battery portable ${label}: ${value}`);
    }
  }
  if (!Number.isFinite(hullDamage) || hullDamage < 0) {
    throw new Error(`Invalid shore battery portable hull damage: ${hullDamage}`);
  }
  if (!Number.isFinite(hullHitChance) || hullHitChance < 0 || hullHitChance > 1) {
    throw new Error(`Invalid shore battery portable hull hit chance: ${hullHitChance}`);
  }
  return Object.freeze({
    crewDamage,
    crewHitChance: crewHitChance * SHORE_BATTERY_PORTABLE_HIT_CHANCE_SCALE,
    crewFatalityChance,
    crewProtectionPenetration,
    hullDamage,
    hullHitChance
  });
}

export function shoreBatteryMayReceivePlayerPortableFire(state, playerId) {
  assertState(state);
  if (typeof playerId !== "string" || !playerId) {
    throw new Error(`Invalid shore battery player id: ${playerId}`);
  }
  return state.playerAttackActive && state.engagedTargetIds.has(playerId);
}

export function shoreBatteryRecoveryStatus(state, simMinute) {
  assertState(state);
  assertMinute(simMinute);
  if (!shoreBatteryIsDisabled(state, simMinute)) return null;
  return {
    attackerShipLabel: state.disabledByShipLabel || "an unidentified warship",
    disabledUntilMinute: state.disabledUntilMinute,
    daysRemaining: Math.max(1, Math.ceil((state.disabledUntilMinute - simMinute) / (24 * 60)))
  };
}

export function shoreBatteryIsDisabled(state, simMinute) {
  assertState(state);
  assertMinute(simMinute);
  return state.hitPoints <= 0 && state.disabledUntilMinute !== null && simMinute < state.disabledUntilMinute;
}

export function shoreBatteryCanFire(state, simMinute) {
  return !shoreBatteryIsDisabled(state, simMinute) &&
    state.garrisonCrew - state.woundedGarrison > 0 && state.cooldownSeconds <= 0;
}

export function clearShoreBatteryCombatWounds(state) {
  assertState(state);
  if (state.woundedGarrison === 0) return false;
  state.woundedGarrison = 0;
  return true;
}

export function shoreBatteryDisabledNotice(state) {
  assertState(state);
  return `${state.cityName.toUpperCase()} BATTERY DISABLED (${SHORE_BATTERY_DISABLE_DAYS} DAYS)`;
}

export function shoreBatterySurrenderNotice({
  captainName,
  nationalityAdjective,
  portName,
  playerPoint,
  surrenderPoint
}) {
  for (const [label, value] of Object.entries({ captainName, nationalityAdjective, portName })) {
    if (typeof value !== "string" || !value.trim()) {
      throw new Error(`Shore battery surrender notice requires ${label}`);
    }
  }
  assertPoint(playerPoint, "player");
  assertPoint(surrenderPoint, "surrender");
  if (Math.hypot(
    surrenderPoint.x - playerPoint.x,
    surrenderPoint.y - playerPoint.y
  ) > SHORE_BATTERY_NOTICE_RADIUS_PX) {
    return null;
  }
  return `${captainName.toUpperCase()}, ${nationalityAdjective.toUpperCase()} CAPTAIN, ` +
    `SURRENDERED TO ${portName.toUpperCase()}`;
}

export function armShoreBatteryReload(state) {
  assertState(state);
  state.cooldownSeconds = SHORE_BATTERY_RELOAD_SECONDS;
  state.shotSequence += 1;
}

export function shoreBatteryPlayerResponse({
  playerHostile,
  hostileByWar,
  withinWeaponRange,
  withinTollRange,
  tollDemandEligible,
  playerHailed,
  playerAttackActive,
  passageRefusalActive,
  warWarningSeen,
  playerCombatActive
}) {
  for (const [key, value] of Object.entries({
    playerHostile,
    hostileByWar,
    withinWeaponRange,
    withinTollRange,
    tollDemandEligible,
    playerHailed,
    playerAttackActive,
    passageRefusalActive,
    warWarningSeen,
    playerCombatActive
  })) {
    if (typeof value !== "boolean") throw new Error(`Invalid shore battery player response ${key}: ${value}`);
  }
  const confronted = hostileByWar
    ? playerHailed || passageRefusalActive || warWarningSeen || playerCombatActive
    : playerHailed || passageRefusalActive;
  const shouldConfront = hostileByWar
    ? withinWeaponRange
    : tollDemandEligible && withinTollRange;
  return {
    shouldHail: playerHostile && shouldConfront && !confronted,
    shouldEngage: withinWeaponRange && (
      playerAttackActive || (playerHostile && hostileByWar && confronted)
    )
  };
}

function readDisabledUntil(flags, city) {
  const value = flags[disabledFlagKey(city.portId || `city-${city.tileId}`)];
  if (value === undefined) return 0;
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`Invalid shore battery disabled time for ${city.portId || city.tileId}: ${value}`);
  }
  return value;
}

function readDisabledByShip(flags, city) {
  const value = flags[disabledByShipFlagKey(city.portId || `city-${city.tileId}`)];
  if (value === undefined) return null;
  assertAttackerShipLabel(value);
  return value.trim();
}

function disabledFlagKey(portId) {
  return `${DISABLED_UNTIL_PREFIX}${portId}`;
}

function disabledByShipFlagKey(portId) {
  return `${DISABLED_BY_SHIP_PREFIX}${portId}`;
}

function warWarningSeenFlagKey(factionId) {
  return `${WAR_WARNING_SEEN_PREFIX}${factionId}`;
}

function upgradeFlagKey(portId) {
  return `${UPGRADE_LEVEL_PREFIX}${portId}`;
}

function readUpgradeLevel(flags, city) {
  if (flags === null) return 0;
  const portId = city.portId || `city-${city.tileId}`;
  const value = flags[upgradeFlagKey(portId)];
  if (value === undefined) return 0;
  if (!Number.isInteger(value) || value < 0 || value >= SHORE_BATTERY_MAX_LEVEL) {
    throw new Error(`Invalid shore battery upgrade level for ${portId}: ${value}`);
  }
  return value;
}

function disableShoreBattery(state, flags, simMinute, attackerShipLabel) {
  state.disabledUntilMinute = simMinute + SHORE_BATTERY_DISABLE_MINUTES;
  state.disabledByShipLabel = attackerShipLabel.trim();
  flags[disabledFlagKey(state.portId)] = state.disabledUntilMinute;
  flags[disabledByShipFlagKey(state.portId)] = state.disabledByShipLabel;
  state.engagedTargetIds.clear();
  state.playerHailed = false;
  state.playerAttackActive = false;
}

function assertAttackerShipLabel(value) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("Shore battery damage requires a specific attacking ship label");
  }
}

function assertCity(city) {
  const cityName = city?.portAlias || city?.displayCity || city?.city;
  if (!city || !Number.isInteger(city.tileId) || !city.factionId || typeof cityName !== "string" || !cityName.trim()) {
    throw new Error("Invalid shore battery city");
  }
}

function assertFlags(flags) {
  if (!flags || typeof flags !== "object") throw new Error("Shore battery flags must be an object");
}

function assertFactionId(factionId) {
  if (typeof factionId !== "string" || !factionId.trim()) {
    throw new Error(`Invalid shore battery faction: ${factionId}`);
  }
}

function assertMinute(value) {
  if (!Number.isFinite(value) || value < 0) throw new Error(`Invalid shore battery simulation minute: ${value}`);
}

function assertState(state) {
  if (!state || typeof state.id !== "string" || typeof state.cityName !== "string" || !state.cityName.trim() ||
      !(state.engagedTargetIds instanceof Set)) {
    throw new Error("Invalid shore battery state");
  }
  if (typeof state.playerAttackActive !== "boolean") {
    throw new Error(`Invalid shore battery player attack state: ${state.playerAttackActive}`);
  }
  if (!Number.isInteger(state.maxGarrison) || state.maxGarrison <= 0 ||
      !Number.isInteger(state.garrisonCrew) || state.garrisonCrew <= 0 ||
      state.garrisonCrew > state.maxGarrison ||
      !Number.isInteger(state.woundedGarrison) || state.woundedGarrison < 0 ||
      state.woundedGarrison >= state.garrisonCrew) {
    throw new Error(
      `Invalid shore battery garrison: ${state?.garrisonCrew} crew, ${state?.woundedGarrison} wounded, ${state?.maxGarrison} maximum`
    );
  }
}

function assertPoint(point, label) {
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    throw new Error(`Shore battery surrender notice requires a finite ${label} point`);
  }
}
