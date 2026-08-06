export const CREW_SURRENDER_ACTIVE_RATIO = 0.4;

export function activeCombatCrew(totalCrew, woundedCrew = 0) {
  requireCrewCount(totalCrew, "total combat crew");
  requireCrewCount(woundedCrew, "wounded combat crew");
  if (woundedCrew > totalCrew) {
    throw new Error(`Wounded combat crew exceeds the crew: ${woundedCrew}/${totalCrew}`);
  }
  return totalCrew - woundedCrew;
}

export function applyCrewWounds({
  totalCrew,
  woundedCrew = 0,
  crewDamage,
  hitChance,
  crewProtection,
  crewProtectionPenetration = 0,
  preserveFinalCrew = false,
  random = Math.random
}) {
  const activeBefore = activeCombatCrew(totalCrew, woundedCrew);
  requireCrewCount(crewDamage, "crew damage");
  if (crewDamage <= 0) throw new Error(`Crew damage must be positive: ${crewDamage}`);
  const effectiveChance = effectiveCrewHitChance(
    hitChance,
    crewProtection,
    crewProtectionPenetration
  );
  if (typeof preserveFinalCrew !== "boolean") {
    throw new Error(`Invalid final-crew protection: ${preserveFinalCrew}`);
  }
  if (typeof random !== "function") throw new Error("Crew wounds require a random source");

  const maximumNewWounds = Math.max(0, activeBefore - Number(preserveFinalCrew));
  let newWounds = 0;
  for (let index = 0; index < crewDamage && newWounds < maximumNewWounds; index++) {
    const roll = random();
    requireUnitInterval(roll, "crew wound roll", { upperExclusive: true });
    if (roll < effectiveChance) newWounds += 1;
  }
  const wounded = woundedCrew + newWounds;
  return Object.freeze({
    woundedCrew: wounded,
    newWounds,
    activeCrew: totalCrew - wounded,
    effectiveChance,
    protected: effectiveChance === 0
  });
}

export function effectiveCrewHitChance(hitChance, crewProtection, crewProtectionPenetration = 0) {
  requireUnitInterval(hitChance, "crew hit chance");
  if (!Number.isInteger(crewProtection) || crewProtection < 0 || crewProtection > 100) {
    throw new Error(`Invalid crew protection: ${crewProtection}`);
  }
  requireUnitInterval(crewProtectionPenetration, "crew protection penetration");
  if (crewProtection === 100) return 0;
  const effectiveProtection = crewProtection * (1 - crewProtectionPenetration);
  return hitChance * (1 - effectiveProtection / 100);
}

export function crewWoundsForceSurrender(totalCrew, woundedCrew) {
  const active = activeCombatCrew(totalCrew, woundedCrew);
  if (totalCrew === 0 || woundedCrew <= 0) return false;
  return active <= Math.max(1, Math.ceil(totalCrew * CREW_SURRENDER_ACTIVE_RATIO));
}

export function clearCombatWounds(combatant) {
  if (!combatant || typeof combatant !== "object") throw new Error("Combat wound recovery requires a combatant");
  const wounded = combatant.woundedCrew ?? 0;
  requireCrewCount(wounded, "recovering wounded crew");
  if (wounded === 0) return false;
  combatant.woundedCrew = 0;
  return true;
}

function requireCrewCount(value, label) {
  if (!Number.isInteger(value) || value < 0) throw new Error(`Invalid ${label}: ${value}`);
}

function requireUnitInterval(value, label, { upperExclusive = false } = {}) {
  const invalidUpper = upperExclusive ? value >= 1 : value > 1;
  if (!Number.isFinite(value) || value < 0 || invalidUpper) {
    throw new Error(`Invalid ${label}: ${value}`);
  }
}
