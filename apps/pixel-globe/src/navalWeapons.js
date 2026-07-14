export const NAVAL_WEAPON_CANNON = "cannon";
export const NAVAL_WEAPON_ARROW = "arrow";
export const NAVAL_FIRE_MODE_BROADSIDE = "broadside";
export const NAVAL_FIRE_MODE_AT_WILL = "at-will";
export const STANDARD_CANNON_RELOAD_SECONDS = 10;

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
  }),
  [NAVAL_WEAPON_ARROW]: Object.freeze({
    kind: NAVAL_WEAPON_ARROW,
    damage: 0.5,
    rangeScale: 0.5,
    speedScale: 1.35,
    arcHeightScale: 0.75,
    fireMode: NAVAL_FIRE_MODE_AT_WILL,
    reloadSeconds: 0.85
  })
});

export function navalWeaponForShip({ cultureType = null, cannons = 0, weaponKind = null }) {
  if (!Number.isInteger(cannons) || cannons < 0) throw new Error(`Invalid ship cannon count: ${cannons}`);
  if (cultureType !== null && (typeof cultureType !== "string" || cultureType === "")) {
    throw new Error(`Invalid ship culture type: ${cultureType}`);
  }
  if (weaponKind !== null) return navalWeaponSpec(weaponKind);
  if (PRE_GUNPOWDER_CULTURES.has(cultureType)) return NAVAL_WEAPON_SPECS[NAVAL_WEAPON_ARROW];
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

export function navalWeaponFiresAtWill(weapon) {
  return weapon?.fireMode === NAVAL_FIRE_MODE_AT_WILL;
}

export function navalArrowVolleyCount(crewCapacity) {
  if (!Number.isInteger(crewCapacity) || crewCapacity <= 0) {
    throw new Error(`Invalid arrow ship crew capacity: ${crewCapacity}`);
  }
  return Math.min(5, Math.max(2, Math.ceil(crewCapacity / 5)));
}
