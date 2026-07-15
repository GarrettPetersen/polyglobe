export const SHORE_BATTERY_DISABLE_MINUTES = 3 * 24 * 60;
export const SHORE_BATTERY_RANGE_PX = 76;
export const SHORE_BATTERY_RELOAD_SECONDS = 14;
export const SHORE_BATTERY_HIT_POINTS_PER_GUN = 8;

const DISABLED_UNTIL_PREFIX = "shoreBatteryDisabledUntil:";

export function shoreBatteryId(city) {
  assertCity(city);
  return `shore-battery:${city.portId || `city-${city.tileId}`}`;
}

export function shoreBatteryGunCount(city) {
  assertCity(city);
  if (city.isFactionCapital) return 4;
  return (city.population || 0) >= 50000 ? 2 : 1;
}

export function shoreBatteryMayDemandToll(city) {
  return shoreBatteryGunCount(city) >= 2;
}

export function createShoreBatteryState(city, flags, simMinute) {
  assertCity(city);
  assertFlags(flags);
  assertMinute(simMinute);
  const gunCount = shoreBatteryGunCount(city);
  const maxHitPoints = gunCount * SHORE_BATTERY_HIT_POINTS_PER_GUN;
  const disabledUntilMinute = readDisabledUntil(flags, city);
  return {
    id: shoreBatteryId(city),
    cityTileId: city.tileId,
    portId: city.portId || `city-${city.tileId}`,
    factionId: city.factionId,
    cultureType: city.cityType || null,
    gunCount,
    maxHitPoints,
    hitPoints: disabledUntilMinute > simMinute ? 0 : maxHitPoints,
    disabledUntilMinute: disabledUntilMinute > simMinute ? disabledUntilMinute : null,
    cooldownSeconds: 0,
    shotSequence: 0,
    engagedTargetIds: new Set(),
    playerHailed: false
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
  state.disabledUntilMinute = null;
  state.hitPoints = state.maxHitPoints;
  state.engagedTargetIds.clear();
  state.playerHailed = false;
  return true;
}

export function damageShoreBattery(state, flags, damage, simMinute) {
  assertState(state);
  assertFlags(flags);
  assertMinute(simMinute);
  if (!Number.isFinite(damage) || damage <= 0) throw new Error(`Invalid shore battery damage: ${damage}`);
  if (shoreBatteryIsDisabled(state, simMinute)) {
    return { hitPoints: 0, disabled: true, newlyDisabled: false };
  }
  state.hitPoints = Math.max(0, state.hitPoints - damage);
  if (state.hitPoints > 0) return { hitPoints: state.hitPoints, disabled: false, newlyDisabled: false };
  state.disabledUntilMinute = simMinute + SHORE_BATTERY_DISABLE_MINUTES;
  flags[disabledFlagKey(state.portId)] = state.disabledUntilMinute;
  state.engagedTargetIds.clear();
  state.playerHailed = false;
  return { hitPoints: 0, disabled: true, newlyDisabled: true };
}

export function shoreBatteryIsDisabled(state, simMinute) {
  assertState(state);
  assertMinute(simMinute);
  return state.hitPoints <= 0 && state.disabledUntilMinute !== null && simMinute < state.disabledUntilMinute;
}

export function shoreBatteryCanFire(state, simMinute) {
  return !shoreBatteryIsDisabled(state, simMinute) && state.cooldownSeconds <= 0;
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
  passageRefusalActive
}) {
  for (const [key, value] of Object.entries({
    playerHostile,
    hostileByWar,
    withinWeaponRange,
    withinTollRange,
    tollDemandEligible,
    playerHailed,
    passageRefusalActive
  })) {
    if (typeof value !== "boolean") throw new Error(`Invalid shore battery player response ${key}: ${value}`);
  }
  const confronted = playerHailed || passageRefusalActive;
  const shouldConfront = hostileByWar
    ? withinWeaponRange
    : tollDemandEligible && withinTollRange;
  return {
    shouldHail: playerHostile && shouldConfront && !confronted,
    shouldEngage: playerHostile && withinWeaponRange && hostileByWar && confronted
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

function disabledFlagKey(portId) {
  return `${DISABLED_UNTIL_PREFIX}${portId}`;
}

function assertCity(city) {
  if (!city || !Number.isInteger(city.tileId) || !city.factionId) throw new Error("Invalid shore battery city");
}

function assertFlags(flags) {
  if (!flags || typeof flags !== "object") throw new Error("Shore battery flags must be an object");
}

function assertMinute(value) {
  if (!Number.isFinite(value) || value < 0) throw new Error(`Invalid shore battery simulation minute: ${value}`);
}

function assertState(state) {
  if (!state || typeof state.id !== "string" || !(state.engagedTargetIds instanceof Set)) {
    throw new Error("Invalid shore battery state");
  }
}
