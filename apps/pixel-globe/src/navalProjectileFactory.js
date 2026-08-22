import { NAVAL_CANNON_ARC_HEIGHT_PX, NAVAL_CANNON_SPEED_PX } from "./navalWeapons.js";

export function createPortableNavalProjectile({
  weapon,
  startX,
  startY,
  targetX,
  targetY,
  seed,
  arcHeightUnit,
  launchDelaySeconds = 0,
  launchSoundDistancePx = 0,
  damageScale = 1,
  hullDamageAttempts = 1,
  crewDamageScale = 1,
  operatorShare = 1
}) {
  validatePortableProjectileInput({
    weapon,
    startX,
    startY,
    targetX,
    targetY,
    seed,
    arcHeightUnit,
    launchDelaySeconds,
    launchSoundDistancePx,
    damageScale,
    hullDamageAttempts,
    crewDamageScale,
    operatorShare
  });
  const range = Math.hypot(targetX - startX, targetY - startY);
  return {
    kind: weapon.animationKind,
    portable: true,
    weaponId: weapon.itemId,
    startX,
    startY,
    targetX,
    targetY,
    age: 0,
    duration: Math.max(0.1, range / (NAVAL_CANNON_SPEED_PX * weapon.speedScale)),
    arcHeight: (NAVAL_CANNON_ARC_HEIGHT_PX + arcHeightUnit * 4) * weapon.arcHeightScale,
    damage: weapon.hullDamage * damageScale,
    hullDamage: weapon.hullDamage * damageScale,
    hullHitChance: weapon.hullHitChance,
    hullDamageAttempts,
    crewDamage: weapon.crewDamage * crewDamageScale,
    crewHitChance: weapon.crewHitChance,
    crewFatalityChance: weapon.crewFatalityChance,
    crewProtectionPenetration: weapon.crewProtectionPenetration,
    projectileSize: weapon.projectileSize,
    smokeScale: weapon.smokeScale,
    incendiary: weapon.incendiary === true,
    launchDelaySeconds,
    launchSoundDistancePx,
    operatorShare,
    launched: false,
    seed
  };
}

function validatePortableProjectileInput(values) {
  if (!values.weapon || typeof values.weapon !== "object" ||
      typeof values.weapon.itemId !== "string" || values.weapon.itemId === "") {
    throw new Error("Portable naval projectile requires a weapon");
  }
  if (!Number.isFinite(values.weapon.crewFatalityChance) ||
      values.weapon.crewFatalityChance < 0 || values.weapon.crewFatalityChance > 1) {
    throw new Error(`Portable naval projectile has invalid crew fatality chance: ${values.weapon.crewFatalityChance}`);
  }
  for (const key of [
    "startX", "startY", "targetX", "targetY", "arcHeightUnit",
    "launchDelaySeconds", "launchSoundDistancePx", "damageScale"
  ]) {
    if (!Number.isFinite(values[key])) {
      throw new Error(`Portable naval projectile has invalid ${key}: ${values[key]}`);
    }
  }
  if (!Number.isInteger(values.seed) || values.seed < 0) {
    throw new Error(`Portable naval projectile has invalid seed: ${values.seed}`);
  }
  if (values.arcHeightUnit < 0 || values.arcHeightUnit > 1 ||
      values.launchDelaySeconds < 0 || values.launchSoundDistancePx < 0 ||
      values.damageScale <= 0) {
    throw new Error("Portable naval projectile has an out-of-range scalar");
  }
  for (const key of ["hullDamageAttempts", "crewDamageScale", "operatorShare"]) {
    if (!Number.isInteger(values[key]) || values[key] <= 0) {
      throw new Error(`Portable naval projectile has invalid ${key}: ${values[key]}`);
    }
  }
}
