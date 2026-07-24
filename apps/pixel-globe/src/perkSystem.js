const ADDITIVE_PERKS = new Set([
  "cargoCapacityFlat",
  "windwardAngleReductionDeg",
  "seaworthinessFlat",
  "assaultChanceBonus",
  "disguiseChanceBonus",
  "damageResistanceChance",
  "crewCasualtyResistanceChance",
  "hullRepairFractionPerDay"
]);

const MULTIPLICATIVE_PERKS = new Set([
  "topSpeedMultiplier",
  "accelerationMultiplier",
  "turnRateMultiplier",
  "hitPointsMultiplier",
  "fishingChanceMultiplier",
  "fishingHaulMultiplier",
  "scavengingChanceMultiplier",
  "scavengingYieldMultiplier",
  "foodDurationMultiplier",
  "cannonReloadMultiplier",
  "cannonSpreadMultiplier",
  "whalingChanceMultiplier",
  "tradePurchaseMultiplier",
  "tradeSaleMultiplier",
  "animalEncounterChanceMultiplier"
]);

export const MAX_DAMAGE_RESISTANCE_CHANCE = 0.8;
export const MAX_HULL_REPAIR_FRACTION_PER_DAY = 0.015;

export const PERK_KEYS = Object.freeze([
  ...ADDITIVE_PERKS,
  ...MULTIPLICATIVE_PERKS
].sort());

export function emptyPerkTotals() {
  return Object.freeze(Object.fromEntries(PERK_KEYS.map((key) => [
    key,
    MULTIPLICATIVE_PERKS.has(key) ? 1 : 0
  ])));
}

export function aggregatePerkSources(sources) {
  if (!Array.isArray(sources)) throw new Error("Perk aggregation requires a source list");
  const totals = { ...emptyPerkTotals() };
  for (const source of sources) {
    validatePerkSource(source);
    const quantity = source.quantity ?? 1;
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error(`Invalid perk source quantity for ${source.id}: ${quantity}`);
    }
    for (const [key, value] of Object.entries(source.perks)) {
      validatePerkValue(key, value, source.id);
      if (ADDITIVE_PERKS.has(key)) totals[key] += value * quantity;
      else totals[key] *= value ** quantity;
    }
  }
  totals.damageResistanceChance = combinedDamageResistanceChance([
    totals.damageResistanceChance
  ]);
  totals.crewCasualtyResistanceChance = clamp(totals.crewCasualtyResistanceChance, 0, 0.8);
  totals.assaultChanceBonus = clamp(totals.assaultChanceBonus, 0, 0.35);
  totals.disguiseChanceBonus = clamp(totals.disguiseChanceBonus, 0, 0.3);
  totals.tradePurchaseMultiplier = clamp(totals.tradePurchaseMultiplier, 0.9, 1);
  totals.tradeSaleMultiplier = clamp(totals.tradeSaleMultiplier, 1, 1.1);
  totals.animalEncounterChanceMultiplier = clamp(totals.animalEncounterChanceMultiplier, 1, 3);
  totals.cannonSpreadMultiplier = clamp(totals.cannonSpreadMultiplier, 0.55, 1);
  totals.hullRepairFractionPerDay = clamp(
    totals.hullRepairFractionPerDay,
    0,
    MAX_HULL_REPAIR_FRACTION_PER_DAY
  );
  return Object.freeze(totals);
}

export function combinedDamageResistanceChance(chances) {
  if (!Array.isArray(chances) || chances.length === 0) {
    throw new Error("Damage resistance requires at least one chance");
  }
  let total = 0;
  for (const chance of chances) {
    if (!Number.isFinite(chance) || chance < 0 || chance > 1) {
      throw new Error(`Invalid damage resistance chance: ${chance}`);
    }
    total += chance;
  }
  const normalizedTotal = Math.round(total * 1e12) / 1e12;
  return clamp(normalizedTotal, 0, MAX_DAMAGE_RESISTANCE_CHANCE);
}

export function damageResistanceRollSucceeds(chances, roll) {
  if (!Number.isFinite(roll) || roll < 0 || roll >= 1) {
    throw new Error(`Invalid damage resistance roll: ${roll}`);
  }
  return roll < combinedDamageResistanceChance(chances);
}

export function validatePerkSource(source) {
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    throw new Error("Perk source must be an object");
  }
  if (typeof source.id !== "string" || source.id.trim() === "") {
    throw new Error("Perk source requires an id");
  }
  if (!source.perks || typeof source.perks !== "object" || Array.isArray(source.perks)) {
    throw new Error(`Perk source ${source.id} requires perk data`);
  }
  if (Object.keys(source.perks).length === 0) throw new Error(`Perk source ${source.id} has no perks`);
  for (const [key, value] of Object.entries(source.perks)) validatePerkValue(key, value, source.id);
  return source;
}

export function effectiveShipStats(baseStats, perks) {
  if (!baseStats || typeof baseStats !== "object") throw new Error("Effective ship stats require base stats");
  validatePerkTotals(perks);
  const cargoCapacity = baseStats.cargoCapacity + Math.round(perks.cargoCapacityFlat);
  const upwindStallAngleDeg = Math.max(
    10,
    baseStats.upwindStallAngleDeg - perks.windwardAngleReductionDeg
  );
  return Object.freeze({
    ...baseStats,
    cargoCapacity,
    topSpeedRad: baseStats.topSpeedRad * perks.topSpeedMultiplier,
    accelerationRad: baseStats.accelerationRad * perks.accelerationMultiplier,
    turnRateRad: baseStats.turnRateRad * perks.turnRateMultiplier,
    hitPoints: Math.max(1, Math.round(baseStats.hitPoints * perks.hitPointsMultiplier)),
    seaworthiness: Math.max(0, baseStats.seaworthiness + perks.seaworthinessFlat),
    upwindStallAngleDeg,
    upwindStallAngleRad: upwindStallAngleDeg * Math.PI / 180
  });
}

export function perkEffectLabels(perks) {
  validatePerkBundle(perks);
  const labels = [];
  const percent = (value) => `${Math.round(Math.abs(value - 1) * 100)}%`;
  if (perks.cargoCapacityFlat) labels.push(`Cargo +${perks.cargoCapacityFlat}`);
  if (perks.topSpeedMultiplier) labels.push(`Top speed +${percent(perks.topSpeedMultiplier)}`);
  if (perks.accelerationMultiplier) labels.push(`Acceleration +${percent(perks.accelerationMultiplier)}`);
  if (perks.turnRateMultiplier) labels.push(`Turning +${percent(perks.turnRateMultiplier)}`);
  if (perks.hitPointsMultiplier) labels.push(`Hull +${percent(perks.hitPointsMultiplier)}`);
  if (perks.windwardAngleReductionDeg) labels.push(`Sail ${perks.windwardAngleReductionDeg} deg closer to wind`);
  if (perks.seaworthinessFlat) labels.push(`Seaworthiness +${perks.seaworthinessFlat}`);
  if (perks.fishingChanceMultiplier) labels.push(`Fishing odds +${percent(perks.fishingChanceMultiplier)}`);
  if (perks.fishingHaulMultiplier) labels.push(`Fishing haul +${percent(perks.fishingHaulMultiplier)}`);
  if (perks.scavengingChanceMultiplier) labels.push(`Scavenging odds +${percent(perks.scavengingChanceMultiplier)}`);
  if (perks.scavengingYieldMultiplier) labels.push(`Scavenging haul +${percent(perks.scavengingYieldMultiplier)}`);
  if (perks.assaultChanceBonus) labels.push(`City assault +${Math.round(perks.assaultChanceBonus * 100)}%`);
  if (perks.disguiseChanceBonus) {
    labels.push(`Hostile-port disguise +${Math.round(perks.disguiseChanceBonus * 100)}%`);
  }
  if (perks.foodDurationMultiplier) labels.push(`Food lasts ${percent(perks.foodDurationMultiplier)} longer`);
  if (perks.cannonReloadMultiplier) labels.push(`Cannon reload ${percent(perks.cannonReloadMultiplier)} faster`);
  if (perks.cannonSpreadMultiplier) labels.push(`Cannon spread -${percent(perks.cannonSpreadMultiplier)}`);
  if (perks.whalingChanceMultiplier) labels.push(`Whaling odds +${percent(perks.whalingChanceMultiplier)}`);
  if (perks.tradePurchaseMultiplier) labels.push(`Purchase prices -${percent(perks.tradePurchaseMultiplier)}`);
  if (perks.tradeSaleMultiplier) labels.push(`Sale prices +${percent(perks.tradeSaleMultiplier)}`);
  if (perks.animalEncounterChanceMultiplier) {
    labels.push(`Animal encounter odds +${percent(perks.animalEncounterChanceMultiplier)}`);
  }
  if (perks.damageResistanceChance) labels.push(`${Math.round(perks.damageResistanceChance * 100)}% hull-hit resistance`);
  if (perks.crewCasualtyResistanceChance) {
    labels.push(`${Math.round(perks.crewCasualtyResistanceChance * 100)}% casualty resistance`);
  }
  if (perks.hullRepairFractionPerDay) {
    const dailyPercent = Math.round(perks.hullRepairFractionPerDay * 10000) / 100;
    labels.push(`Repairs ${dailyPercent}% hull per day`);
  }
  return Object.freeze(labels);
}

function validatePerkTotals(perks) {
  if (!perks || typeof perks !== "object") throw new Error("Missing aggregated perks");
  for (const key of PERK_KEYS) validatePerkValue(key, perks[key], "aggregate");
}

function validatePerkBundle(perks) {
  if (!perks || typeof perks !== "object" || Array.isArray(perks)) throw new Error("Invalid perk bundle");
  for (const [key, value] of Object.entries(perks)) validatePerkValue(key, value, "bundle");
}

function validatePerkValue(key, value, sourceId) {
  if (!ADDITIVE_PERKS.has(key) && !MULTIPLICATIVE_PERKS.has(key)) {
    throw new Error(`Unknown perk ${key} on ${sourceId}`);
  }
  if (!Number.isFinite(value)) throw new Error(`Invalid perk ${key} on ${sourceId}: ${value}`);
  if (MULTIPLICATIVE_PERKS.has(key) && value <= 0) {
    throw new Error(`Multiplicative perk ${key} must be positive on ${sourceId}`);
  }
  if (ADDITIVE_PERKS.has(key) && value < 0) {
    throw new Error(`Additive perk ${key} cannot be negative on ${sourceId}`);
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
