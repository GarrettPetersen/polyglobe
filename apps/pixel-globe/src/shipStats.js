import { SHIP_TOP_SPEED_SCALE } from "./gamePacing.js";
import { damageResistanceRollSucceeds } from "./perkSystem.js";

export const DEFAULT_PLAYER_SHIP_SLUG = "brigantine";
export const SHIP_PROPULSION_SAIL = "sail";
export const SHIP_PROPULSION_OAR = "oar";
export const SHIP_PROPULSION_OAR_SAIL = "oar-sail";
export const SHIP_UPWIND_FORGIVENESS_DEG = 8;
export const MEDITERRANEAN_GALLEY_SLUG = "mediterranean-galley";
export const GALLEASS_SLUG = "galleass";
export const JAPANESE_UMI_BUNE_SLUG = "japanese-kuribune";
export const JAPANESE_KOBAYA_SLUG = "japanese-kobaya";
export const JAPANESE_SEKIBUNE_SLUG = "japanese-sekibune";
export const JAPANESE_ATAKEBUNE_SLUG = "japanese-atakebune";
export const JAPANESE_SHIP_SLUGS = Object.freeze([
  JAPANESE_UMI_BUNE_SLUG,
  JAPANESE_KOBAYA_SLUG,
  JAPANESE_SEKIBUNE_SLUG,
  JAPANESE_ATAKEBUNE_SLUG
]);
export const JAPANESE_ARMED_SHIP_SLUGS = Object.freeze([
  JAPANESE_KOBAYA_SLUG,
  JAPANESE_SEKIBUNE_SLUG,
  JAPANESE_ATAKEBUNE_SLUG
]);

const SHIP_PROPULSIONS = new Set([
  SHIP_PROPULSION_SAIL,
  SHIP_PROPULSION_OAR,
  SHIP_PROPULSION_OAR_SAIL
]);
const SHIP_CREW_PROTECTION = Object.freeze({
  "fishing-lugger": 10,
  "small-cog": 25,
  holk: 35,
  dhow: 5,
  "ocean-dhow": 15,
  sampan: 8,
  "large-junk": 60,
  "javanese-jong": 55,
  "pirate-brig": 45,
  galleon: 60,
  fluyt: 35,
  carrack: 50,
  "ship-of-the-line": 65,
  "medium-junk": 45,
  xebec: 30,
  caravel: 30,
  "square-rigged-caravel": 25,
  brigantine: 35,
  "small-junk": 30,
  felucca: 5,
  cutter: 15,
  ketch: 15,
  "mediterranean-galley": 20,
  galleass: 55,
  "joseon-turtle-ship": 100,
  "joseon-panokseon": 65,
  "japanese-kuribune": 8,
  "japanese-kobaya": 35,
  "japanese-sekibune": 45,
  "japanese-atakebune": 70,
  "spanish-nao": 35,
  "portuguese-carrack": 55,
  "viking-longship": 35,
  "polynesian-voyaging-canoe": 5,
  "mesoamerican-dugout-canoe": 0,
  "nusantaran-outrigger": 5,
  kelulus: 15,
  penjajap: 25,
  lancaran: 40,
  "royal-lancaran": 55,
  "ottoman-coastal-trader": 30
});

const DEG_TO_RAD = Math.PI / 180;
const SHIP_MASS_PER_HIT_POINT = 10;
const SHIP_LABELS = Object.freeze({
  "fishing-lugger": "Fishing Barque",
  "small-cog": "Small Cog",
  holk: "Holk",
  dhow: "Dhow",
  "ocean-dhow": "Ocean Dhow",
  sampan: "Sampan",
  "large-junk": "Large Junk",
  "javanese-jong": "Javanese Jong",
  "pirate-brig": "Heavy Caravel",
  galleon: "Galleon",
  fluyt: "Urca",
  carrack: "Carrack",
  "ship-of-the-line": "Great Carrack",
  "medium-junk": "Medium Junk",
  xebec: "Xebec",
  caravel: "Caravel",
  "square-rigged-caravel": "Square-Rigged Caravel",
  brigantine: "Brigantine",
  "small-junk": "Small Junk",
  felucca: "Felucca",
  cutter: "Coastal Pinnace",
  ketch: "Lateen Barque",
  [MEDITERRANEAN_GALLEY_SLUG]: "Mediterranean Galley",
  [GALLEASS_SLUG]: "Galleass",
  "joseon-turtle-ship": "Turtle Ship",
  "joseon-panokseon": "Panokseon",
  // Keep the legacy slug for save compatibility; the source vessel is an umi-bune.
  "japanese-kuribune": "Umi-bune",
  "japanese-kobaya": "Kobaya",
  "japanese-sekibune": "Sekibune",
  "japanese-atakebune": "Atakebune",
  "spanish-nao": "Spanish Nao",
  "portuguese-carrack": "Portuguese Carrack",
  "viking-longship": "Viking Longship",
  "polynesian-voyaging-canoe": "Polynesian Voyaging Canoe",
  "mesoamerican-dugout-canoe": "Dugout Canoe",
  "nusantaran-outrigger": "Nusantaran Outrigger",
  kelulus: "Kelulus",
  penjajap: "Penjajap",
  lancaran: "Lancaran",
  "royal-lancaran": "Royal Lancaran",
  // Keep the legacy slug for save compatibility; use the period Ottoman vessel name in-game.
  "ottoman-coastal-trader": "Kancabash"
});

const rawShipStats = [
  stats("fishing-lugger", 0, 0.021, 0.028, 48, 2.90, 35, 18, 3),
  stats("small-cog", 2, 0.016, 0.026, 58, 2.00, 70, 70, 6),
  stats("holk", 4, 0.015, 0.031, 58, 1.75, 150, 250, 7),
  stats("dhow", 0, 0.030, 0.029, 38, 3.50, 12, 10, 3),
  stats("ocean-dhow", 2, 0.022, 0.034, 40, 2.55, 105, 125, 7),
  stats("sampan", 0, 0.026, 0.026, 45, 3.40, 30, 25, 2),
  stats("large-junk", 24, 0.015, 0.038, 50, 1.75, 220, 360, 8),
  stats("javanese-jong", 8, 0.011, 0.034, 56, 1.25, 400, 600, 9),
  stats("pirate-brig", 18, 0.020, 0.041, 42, 2.35, 190, 130, 7),
  stats("galleon", 32, 0.013, 0.037, 55, 1.55, 360, 420, 9),
  stats("fluyt", 12, 0.012, 0.036, 58, 1.45, 260, 520, 7),
  stats("carrack", 26, 0.012, 0.034, 60, 1.35, 340, 480, 9),
  stats("ship-of-the-line", 50, 0.010, 0.045, 58, 1.15, 620, 260, 10),
  stats("medium-junk", 12, 0.018, 0.036, 48, 2.10, 135, 170, 7),
  stats("xebec", 16, 0.024, 0.043, 34, 2.80, 130, 85, 6),
  stats("caravel", 8, 0.019, 0.036, 44, 2.35, 110, 120, 7),
  stats("square-rigged-caravel", 4, 0.020, 0.034, 52, 2.30, 90, 100, 6),
  stats("brigantine", 14, 0.021, 0.040, 40, 2.45, 155, 115, 7),
  stats("small-junk", 4, 0.023, 0.032, 43, 2.70, 75, 80, 5),
  stats("felucca", 0, 0.029, 0.031, 30, 3.35, 35, 20, 3),
  stats("cutter", 4, 0.028, 0.035, 32, 3.25, 60, 30, 4),
  stats("ketch", 4, 0.024, 0.035, 34, 2.85, 75, 60, 6),
  stats(MEDITERRANEAN_GALLEY_SLUG, 12, 0.026, 0.040, 38, 2.55, 210, 90, 5, SHIP_PROPULSION_OAR_SAIL),
  // A galleass trades a galley's speed and agility for a much larger hull and gun deck.
  stats(GALLEASS_SLUG, 36, 0.017, 0.034, 42, 1.65, 420, 160, 7, SHIP_PROPULSION_OAR_SAIL, 0, 60),
  stats("joseon-turtle-ship", 30, 0.017, 0.034, 50, 1.85, 450, 90, 9, SHIP_PROPULSION_OAR_SAIL, 40),
  stats("joseon-panokseon", 20, 0.020, 0.035, 52, 2.20, 280, 150, 7, SHIP_PROPULSION_OAR_SAIL),
  stats("japanese-kuribune", 0, 0.028, 0.034, 42, 3.30, 50, 55, 5, SHIP_PROPULSION_OAR_SAIL),
  stats("japanese-kobaya", 0, 0.027, 0.038, 0, 3.15, 90, 65, 6, SHIP_PROPULSION_OAR),
  stats("japanese-sekibune", 0, 0.023, 0.038, 46, 2.55, 170, 110, 6, SHIP_PROPULSION_OAR_SAIL),
  stats("japanese-atakebune", 6, 0.015, 0.032, 54, 1.70, 380, 170, 5, SHIP_PROPULSION_OAR_SAIL),
  stats("spanish-nao", 8, 0.017, 0.034, 54, 1.90, 130, 180, 8),
  stats("portuguese-carrack", 22, 0.013, 0.036, 58, 1.45, 310, 440, 9),
  stats("viking-longship", 0, 0.030, 0.043, 55, 2.75, 180, 90, 9, SHIP_PROPULSION_OAR_SAIL),
  stats(
    "polynesian-voyaging-canoe",
    0,
    0.031,
    0.038,
    28,
    3.15,
    45,
    42,
    7,
    SHIP_PROPULSION_SAIL
  ),
  stats(
    "mesoamerican-dugout-canoe",
    0,
    0.014,
    0.010,
    0,
    3.80,
    30,
    16,
    3,
    SHIP_PROPULSION_OAR
  ),
  stats("nusantaran-outrigger", 0, 0.022, 0.035, 48, 2.50, 100, 130, 8, SHIP_PROPULSION_SAIL),
  stats(
    "kelulus",
    0,
    0.027,
    0.039,
    46,
    2.90,
    95,
    65,
    6,
    SHIP_PROPULSION_OAR_SAIL,
    0,
    11
  ),
  stats("penjajap", 2, 0.028, 0.042, 44, 3.05, 115, 45, 6, SHIP_PROPULSION_OAR_SAIL, 0, 14),
  stats("lancaran", 6, 0.024, 0.041, 48, 2.60, 195, 95, 7, SHIP_PROPULSION_OAR_SAIL, 0, 27),
  stats("royal-lancaran", 10, 0.019, 0.040, 50, 2.20, 305, 160, 8, SHIP_PROPULSION_OAR_SAIL, 0, 43),
  stats("ottoman-coastal-trader", 8, 0.017, 0.035, 55, 1.90, 170, 240, 7)
];

export const SHIP_STATS = Object.freeze(rawShipStats);
export const SHIP_STATS_BY_SLUG = new Map(SHIP_STATS.map((entry) => [entry.slug, entry]));

export function shipStatsForSlug(slug) {
  const entry = SHIP_STATS_BY_SLUG.get(slug);
  if (!entry) throw new Error(`Missing ship stats for ship type: ${slug}`);
  return entry;
}

export function shipLabelForSlug(slug) {
  shipStatsForSlug(slug);
  const label = SHIP_LABELS[slug];
  if (!label) throw new Error(`Missing ship label for ship type: ${slug}`);
  return label;
}

export function validateShipStatsForSlugs(slugs) {
  const missing = slugs.filter((slug) => !SHIP_STATS_BY_SLUG.has(slug));
  if (missing.length > 0) {
    throw new Error(`Missing ship stats for ship types: ${missing.join(", ")}`);
  }
  const missingLabels = slugs.filter((slug) => !SHIP_LABELS[slug]);
  if (missingLabels.length > 0) {
    throw new Error(`Missing ship labels for ship types: ${missingLabels.join(", ")}`);
  }
}

export function shipHullResistsDamage(stats, {
  bonusResistanceChance = 0,
  includeIntrinsicArmor = true,
  roll
} = {}) {
  if (!stats || typeof stats !== "object") throw new Error("Ship armor requires ship stats");
  if (!Number.isInteger(stats.armor) || stats.armor < 0 || stats.armor > 75) {
    throw new Error(`Invalid ship armor for ${stats.slug}: ${stats.armor}`);
  }
  if (typeof includeIntrinsicArmor !== "boolean") {
    throw new Error(`Invalid intrinsic ship armor setting: ${includeIntrinsicArmor}`);
  }
  return damageResistanceRollSucceeds([
    includeIntrinsicArmor ? stats.armor / 100 : 0,
    bonusResistanceChance
  ], roll);
}

export function reconcileShipHullForCurrentStats(stats, hitPoints, maxHitPoints) {
  if (!stats || !Number.isInteger(stats.hitPoints) || stats.hitPoints <= 0) {
    throw new Error("Ship hull reconciliation requires current ship stats");
  }
  if (!Number.isFinite(hitPoints) || hitPoints < 0) {
    throw new Error(`Invalid saved ship hit points: ${hitPoints}`);
  }
  if (!Number.isFinite(maxHitPoints) || maxHitPoints <= 0) {
    throw new Error(`Invalid saved ship maximum hit points: ${maxHitPoints}`);
  }
  const condition = Math.min(1, hitPoints / maxHitPoints);
  return Object.freeze({
    hitPoints: stats.hitPoints * condition,
    maxHitPoints: stats.hitPoints
  });
}

function stats(
  slug,
  cannons,
  accelerationRad,
  topSpeedRad,
  baseUpwindStallAngleDeg,
  turnRateRad,
  mass,
  cargoCapacity,
  seaworthiness,
  propulsion = SHIP_PROPULSION_SAIL,
  armor = 0,
  crewCapacityOverride = null
) {
  assertSlug(slug);
  assertInteger(`${slug}.cannons`, cannons, 0);
  assertFinitePositive(`${slug}.accelerationRad`, accelerationRad);
  assertFinitePositive(`${slug}.topSpeedRad`, topSpeedRad);
  assertFiniteRange(`${slug}.upwindStallAngleDeg`, baseUpwindStallAngleDeg, 0, 89);
  assertFinitePositive(`${slug}.turnRateRad`, turnRateRad);
  assertInteger(`${slug}.mass`, mass, 1);
  assertInteger(`${slug}.cargoCapacity`, cargoCapacity, 0);
  assertInteger(`${slug}.seaworthiness`, seaworthiness, 1);
  if (seaworthiness > 10) throw new Error(`Invalid ${slug}.seaworthiness: ${seaworthiness}`);
  if (!SHIP_PROPULSIONS.has(propulsion)) throw new Error(`Invalid ${slug}.propulsion: ${propulsion}`);
  const crewProtection = SHIP_CREW_PROTECTION[slug];
  assertInteger(`${slug}.crewProtection`, crewProtection, 0);
  if (crewProtection > 100) throw new Error(`Invalid ${slug}.crewProtection: ${crewProtection}`);
  assertInteger(`${slug}.armor`, armor, 0);
  if (armor > 75) throw new Error(`Invalid ${slug}.armor: ${armor}`);
  if (crewCapacityOverride !== null) {
    assertInteger(`${slug}.crewCapacityOverride`, crewCapacityOverride, 1);
  }
  if (propulsion === SHIP_PROPULSION_OAR && baseUpwindStallAngleDeg !== 0) {
    throw new Error(`Oar-powered ship ${slug} must have a zero-degree wind dead zone`);
  }
  const effectiveUpwindStallAngleDeg = propulsion === SHIP_PROPULSION_OAR
    ? 0
    : Math.max(0, baseUpwindStallAngleDeg - SHIP_UPWIND_FORGIVENESS_DEG);

  const hitPoints = Math.max(3, Math.round(mass / SHIP_MASS_PER_HIT_POINT));
  const crewCapacity = crewCapacityOverride ??
    Math.max(1, Math.round(mass / 12 + cannons * 0.75));
  return Object.freeze({
    slug,
    cannons,
    accelerationRad,
    topSpeedRad: topSpeedRad * SHIP_TOP_SPEED_SCALE,
    upwindStallAngleDeg: effectiveUpwindStallAngleDeg,
    upwindStallAngleRad: effectiveUpwindStallAngleDeg * DEG_TO_RAD,
    turnRateRad,
    mass,
    crewCapacity,
    hitPoints,
    cargoCapacity,
    seaworthiness,
    armor,
    crewProtection,
    propulsion,
  });
}

function assertSlug(slug) {
  if (typeof slug !== "string" || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
    throw new Error(`Invalid ship stat slug: ${slug}`);
  }
}

function assertInteger(label, value, min) {
  if (!Number.isInteger(value) || value < min) {
    throw new Error(`Invalid ${label}: ${value}`);
  }
}

function assertFinitePositive(label, value) {
  assertFiniteRange(label, value, Number.MIN_VALUE, Infinity);
}

function assertFiniteRange(label, value, min, max) {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new Error(`Invalid ${label}: ${value}`);
  }
}
