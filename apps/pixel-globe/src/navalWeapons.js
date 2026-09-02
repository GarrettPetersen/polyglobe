export const NAVAL_WEAPON_CANNON = "cannon";
export const NAVAL_WEAPON_ARROW = "arrow";
export const NAVAL_FIRE_MODE_BROADSIDE = "broadside";
export const STANDARD_CANNON_RELOAD_SECONDS = 10;
export const NAVAL_CANNON_MUZZLE_FORE_AFT_SPAN_PX = 13;
export const NAVAL_CANNON_RANGE_PX = 74;
export const NAVAL_CANNON_RANGE_JITTER_PX = 15;
export const NAVAL_CANNON_SPEED_PX = 88;
export const NAVAL_CANNON_AIM_SPREAD_RAD = 0.18;
export const NAVAL_CANNON_ARC_HEIGHT_PX = 13;
export const NAVAL_BROADSIDE_HALF_ANGLE_RAD = 0.62;

const PRE_GUNPOWDER_CULTURES = new Set([
  "polynesian",
  "mesoamerican",
  "andean"
]);

const NAVAL_WEAPON_SPECS = Object.freeze({
  [NAVAL_WEAPON_CANNON]: Object.freeze({
    kind: NAVAL_WEAPON_CANNON,
    damage: 1,
    rangeScale: 1,
    speedScale: 1,
    arcHeightScale: 0.2,
    fireMode: NAVAL_FIRE_MODE_BROADSIDE,
    reloadSeconds: STANDARD_CANNON_RELOAD_SECONDS
  })
});

export function navalWeaponForShip({ cannons = 0 }) {
  if (!Number.isInteger(cannons) || cannons < 0) throw new Error(`Invalid ship cannon count: ${cannons}`);
  if (cannons > 0) return NAVAL_WEAPON_SPECS[NAVAL_WEAPON_CANNON];
  return null;
}

export function navalWeaponSpec(kind) {
  const spec = NAVAL_WEAPON_SPECS[kind];
  if (!spec) throw new Error(`Unknown naval weapon: ${kind}`);
  return spec;
}

export function isPreGunpowderCulture(cultureType) {
  return PRE_GUNPOWDER_CULTURES.has(cultureType);
}

export function navalWeaponUsesBroadside(weapon) {
  return weapon?.fireMode === NAVAL_FIRE_MODE_BROADSIDE;
}

export function accurateBroadsideShotIndex(projectileCount) {
  if (!Number.isInteger(projectileCount) || projectileCount <= 0) {
    throw new Error(`Invalid broadside projectile count: ${projectileCount}`);
  }
  return Math.floor(projectileCount / 2);
}

export function broadsideCannonCount(installedCannons) {
  requireNonNegativeInteger(installedCannons, "installed cannon count");
  return Math.ceil(installedCannons / 2);
}

export function cannonMuzzleForeAftSpan(projectileCount) {
  if (!Number.isInteger(projectileCount) || projectileCount <= 0) {
    throw new Error(`Invalid broadside projectile count: ${projectileCount}`);
  }
  return NAVAL_CANNON_MUZZLE_FORE_AFT_SPAN_PX +
    Math.min(9, Math.max(0, projectileCount - 7) * 0.38);
}

export function cannonReloadWorkRate(activeCrew, installedCannons) {
  requireNonNegativeNumber(activeCrew, "active cannon crew");
  requireNonNegativeInteger(installedCannons, "installed cannon count");
  if (installedCannons === 0) return 1;
  if (activeCrew === 0) return 0;
  return Math.min(1, activeCrew / installedCannons);
}

export function advanceCannonReload(cooldownSeconds, dt, activeCrew, installedCannons) {
  if (!Number.isFinite(cooldownSeconds) || cooldownSeconds < 0) {
    throw new Error(`Invalid cannon reload work: ${cooldownSeconds}`);
  }
  if (!Number.isFinite(dt) || dt < 0) throw new Error(`Invalid cannon reload timestep: ${dt}`);
  requireNonNegativeNumber(activeCrew, "active cannon crew");
  requireNonNegativeInteger(installedCannons, "installed cannon count");
  if (cooldownSeconds === 0 || installedCannons === 0) return 0;
  return Math.max(0, cooldownSeconds - dt * cannonReloadWorkRate(activeCrew, installedCannons));
}

function requireNonNegativeInteger(value, label) {
  if (!Number.isInteger(value) || value < 0) throw new Error(`Invalid ${label}: ${value}`);
}

function requireNonNegativeNumber(value, label) {
  if (!Number.isFinite(value) || value < 0) throw new Error(`Invalid ${label}: ${value}`);
}
