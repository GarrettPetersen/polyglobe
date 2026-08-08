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

  const canDamageHull = projectile.damage > 0;
  const resisted = canDamageHull && allowHullResistance &&
    shipHullResistsDamage(target.stats, { roll: random() });
  const damage = canDamageHull && !resisted ? projectile.damage : 0;
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
