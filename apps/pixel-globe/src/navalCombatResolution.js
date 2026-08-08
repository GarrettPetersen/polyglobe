import { applyCrewWounds, crewWoundsForceSurrender } from "./combatWounds.js";
import { shipHullResistsDamage } from "./shipStats.js";

export function resolveNavalProjectileImpact({
  projectile,
  target,
  random,
  allowHullResistance = true
}) {
  validateProjectile(projectile);
  validateTarget(target);
  if (typeof random !== "function") throw new Error("Naval impact requires a random source");
  if (typeof allowHullResistance !== "boolean") {
    throw new Error(`Invalid naval hull resistance setting: ${allowHullResistance}`);
  }

  let woundedCrew = target.woundedCrew;
  let newWounds = 0;
  if (projectile.crewDamage > 0) {
    const wounds = applyCrewWounds({
      totalCrew: target.crew,
      woundedCrew,
      crewDamage: projectile.crewDamage,
      hitChance: projectile.crewHitChance,
      crewProtection: target.stats.crewProtection,
      crewProtectionPenetration: projectile.crewProtectionPenetration,
      random
    });
    woundedCrew = wounds.woundedCrew;
    newWounds = wounds.newWounds;
  }

  const rolledHullDamage = projectileHullDamage(projectile, random);
  const canDamageHull = rolledHullDamage > 0;
  const resisted = canDamageHull && allowHullResistance &&
    shipHullResistsDamage(target.stats, { roll: random() });
  const damage = canDamageHull && !resisted ? rolledHullDamage : 0;
  const hitPoints = Math.max(0, target.hitPoints - damage);
  const surrendered = target.surrendered === true ||
    crewWoundsForceSurrender(target.crew, woundedCrew);

  return Object.freeze({
    hitPoints,
    woundedCrew,
    newWounds,
    damage,
    resisted,
    surrendered
  });
}

export function projectileHullDamage(projectile, random) {
  if (!projectile || typeof projectile !== "object") {
    throw new Error("Hull damage roll requires a projectile");
  }
  if (typeof random !== "function") throw new Error("Hull damage roll requires a random source");
  if (!Number.isFinite(projectile.damage) || projectile.damage < 0) {
    throw new Error(`Invalid projectile hull damage: ${projectile.damage}`);
  }
  const hitChance = projectile.hullHitChance ?? 1;
  if (!Number.isFinite(hitChance) || hitChance < 0 || hitChance > 1) {
    throw new Error(`Invalid projectile hull hit chance: ${hitChance}`);
  }
  const attempts = projectile.hullDamageAttempts ?? 1;
  if (!Number.isInteger(attempts) || attempts <= 0) {
    throw new Error(`Invalid projectile hull damage attempts: ${attempts}`);
  }
  if (projectile.damage === 0 || hitChance === 0) return 0;
  if (hitChance === 1) return projectile.damage;

  const damagePerAttempt = projectile.damage / attempts;
  let hits = 0;
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (random() < hitChance) hits += 1;
  }
  return damagePerAttempt * hits;
}

function validateProjectile(projectile) {
  if (!projectile || typeof projectile !== "object") {
    throw new Error("Naval impact requires a projectile");
  }
  for (const key of ["damage", "crewDamage", "crewHitChance", "crewProtectionPenetration"]) {
    if (!Number.isFinite(projectile[key]) || projectile[key] < 0) {
      throw new Error(`Invalid naval projectile ${key}: ${projectile[key]}`);
    }
  }
  if (!Number.isInteger(projectile.crewDamage)) {
    throw new Error(`Naval projectile crew damage must be an integer: ${projectile.crewDamage}`);
  }
  if (projectile.crewHitChance > 1 || projectile.crewProtectionPenetration > 1) {
    throw new Error("Naval projectile crew probabilities must be at most one");
  }
  const hullHitChance = projectile.hullHitChance ?? 1;
  if (!Number.isFinite(hullHitChance) || hullHitChance < 0 || hullHitChance > 1) {
    throw new Error(`Invalid naval projectile hull hit chance: ${hullHitChance}`);
  }
}

function validateTarget(target) {
  if (!target || typeof target !== "object") throw new Error("Naval impact requires a target");
  if (!Number.isFinite(target.hitPoints) || target.hitPoints < 0) {
    throw new Error(`Invalid naval target hull: ${target.hitPoints}`);
  }
  for (const [key, value] of [["crew", target.crew], ["wounded crew", target.woundedCrew]]) {
    if (!Number.isInteger(value) || value < 0) throw new Error(`Invalid naval target ${key}: ${value}`);
  }
  if (target.woundedCrew > target.crew) {
    throw new Error(`Naval target wounds exceed crew: ${target.woundedCrew}/${target.crew}`);
  }
  if (!target.stats || typeof target.stats !== "object") {
    throw new Error("Naval target requires ship stats");
  }
}
