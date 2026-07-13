import { SHIP_TOP_SPEED_SCALE } from "./gamePacing.js";

export const DEFAULT_PLAYER_SHIP_SLUG = "brigantine";
export const SHIP_PROPULSION_SAIL = "sail";
export const SHIP_PROPULSION_OAR = "oar";
export const SHIP_PROPULSION_OAR_SAIL = "oar-sail";

const SHIP_PROPULSIONS = new Set([
  SHIP_PROPULSION_SAIL,
  SHIP_PROPULSION_OAR,
  SHIP_PROPULSION_OAR_SAIL
]);

const DEG_TO_RAD = Math.PI / 180;
const SHIP_MASS_PER_HIT_POINT = 10;
const SHIP_LABELS = Object.freeze({
  "fishing-lugger": "Fishing Barque",
  "small-dhow": "Small Dhow",
  "small-cog": "Small Cog",
  dhow: "Dhow",
  sampan: "Sampan",
  "large-junk": "Large Junk",
  "pirate-brig": "Heavy Caravel",
  "pirate-frigate": "Armed Galleon",
  galleon: "Galleon",
  frigate: "Great Galleon",
  fluyt: "Urca",
  carrack: "Carrack",
  "ship-of-the-line": "Great Carrack",
  "medium-junk": "Medium Junk",
  "pirate-brigantine": "Light Brigantine",
  xebec: "Xebec",
  caravel: "Caravel",
  "small-carrack": "Small Carrack",
  "square-rigged-caravel": "Square-Rigged Caravel",
  brigantine: "Brigantine",
  corvette: "Armed Caravel",
  "small-junk": "Small Junk",
  "pirate-sloop": "Small Pinnace",
  "lateen-xebec": "Lateen Xebec",
  felucca: "Felucca",
  cutter: "Coastal Pinnace",
  "lateen-dhow": "Lateen Dhow",
  ketch: "Lateen Barque",
  "square-sail-trader": "Square-Sail Trader",
  "dhow-felucca": "Dhow-Felucca",
  "mediterranean-galley": "Mediterranean Galley",
  "polynesian-voyaging-canoe": "Polynesian Voyaging Canoe",
  "mesoamerican-dugout-canoe": "Mesoamerican Dugout Canoe"
});

const rawShipStats = [
  stats("fishing-lugger", 0, 0.021, 0.028, 48, 2.90, 35, 18, 3),
  stats("small-dhow", 0, 0.027, 0.032, 34, 3.20, 38, 28, 4),
  stats("small-cog", 2, 0.016, 0.026, 58, 2.00, 70, 70, 6),
  stats("dhow", 4, 0.022, 0.033, 42, 2.80, 55, 45, 5),
  stats("sampan", 0, 0.026, 0.026, 45, 3.40, 30, 25, 2),
  stats("large-junk", 24, 0.015, 0.038, 50, 1.75, 220, 360, 8),
  stats("pirate-brig", 18, 0.020, 0.041, 42, 2.35, 190, 130, 7),
  stats("pirate-frigate", 36, 0.017, 0.046, 45, 1.95, 300, 190, 8),
  stats("galleon", 32, 0.013, 0.037, 55, 1.55, 360, 420, 9),
  stats("frigate", 40, 0.018, 0.047, 43, 2.05, 320, 180, 8),
  stats("fluyt", 12, 0.012, 0.036, 58, 1.45, 260, 520, 7),
  stats("carrack", 26, 0.012, 0.034, 60, 1.35, 340, 480, 9),
  stats("ship-of-the-line", 50, 0.010, 0.045, 58, 1.15, 620, 260, 10),
  stats("medium-junk", 12, 0.018, 0.036, 48, 2.10, 135, 170, 7),
  stats("pirate-brigantine", 12, 0.022, 0.041, 38, 2.65, 135, 80, 6),
  stats("xebec", 16, 0.024, 0.043, 34, 2.80, 130, 85, 6),
  stats("caravel", 8, 0.019, 0.036, 44, 2.35, 110, 120, 7),
  stats("small-carrack", 10, 0.015, 0.033, 54, 1.90, 150, 210, 7),
  stats("square-rigged-caravel", 4, 0.020, 0.034, 52, 2.30, 90, 100, 6),
  stats("brigantine", 14, 0.021, 0.040, 40, 2.45, 155, 115, 7),
  stats("corvette", 18, 0.020, 0.042, 42, 2.35, 190, 90, 7),
  stats("small-junk", 4, 0.023, 0.032, 43, 2.70, 75, 80, 5),
  stats("pirate-sloop", 6, 0.026, 0.035, 34, 3.05, 75, 35, 4),
  stats("lateen-xebec", 6, 0.027, 0.036, 32, 3.00, 70, 40, 5),
  stats("felucca", 0, 0.029, 0.031, 30, 3.35, 35, 20, 3),
  stats("cutter", 4, 0.028, 0.035, 32, 3.25, 60, 30, 4),
  stats("lateen-dhow", 2, 0.027, 0.032, 34, 3.00, 45, 35, 4),
  stats("ketch", 4, 0.024, 0.035, 34, 2.85, 75, 60, 6),
  stats("square-sail-trader", 2, 0.020, 0.034, 52, 2.30, 65, 95, 5),
  stats("dhow-felucca", 0, 0.030, 0.032, 30, 3.40, 35, 18, 3),
  stats("mediterranean-galley", 12, 0.026, 0.040, 38, 2.55, 210, 90, 5, SHIP_PROPULSION_OAR_SAIL),
  stats("polynesian-voyaging-canoe", 0, 0.031, 0.038, 28, 3.15, 45, 42, 7),
  stats("mesoamerican-dugout-canoe", 0, 0.018, 0.016, 0, 3.80, 30, 16, 3, SHIP_PROPULSION_OAR)
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

function stats(
  slug,
  cannons,
  accelerationRad,
  topSpeedRad,
  upwindStallAngleDeg,
  turnRateRad,
  mass,
  cargoCapacity,
  seaworthiness,
  propulsion = SHIP_PROPULSION_SAIL
) {
  assertSlug(slug);
  assertInteger(`${slug}.cannons`, cannons, 0);
  assertFinitePositive(`${slug}.accelerationRad`, accelerationRad);
  assertFinitePositive(`${slug}.topSpeedRad`, topSpeedRad);
  assertFiniteRange(`${slug}.upwindStallAngleDeg`, upwindStallAngleDeg, 0, 89);
  assertFinitePositive(`${slug}.turnRateRad`, turnRateRad);
  assertInteger(`${slug}.mass`, mass, 1);
  assertInteger(`${slug}.cargoCapacity`, cargoCapacity, 0);
  assertInteger(`${slug}.seaworthiness`, seaworthiness, 1);
  if (seaworthiness > 10) throw new Error(`Invalid ${slug}.seaworthiness: ${seaworthiness}`);
  if (!SHIP_PROPULSIONS.has(propulsion)) throw new Error(`Invalid ${slug}.propulsion: ${propulsion}`);
  if (propulsion === SHIP_PROPULSION_OAR && upwindStallAngleDeg !== 0) {
    throw new Error(`Oar-powered ship ${slug} must have a zero-degree wind dead zone`);
  }

  const hitPoints = Math.max(3, Math.round(mass / SHIP_MASS_PER_HIT_POINT));
  const crewCapacity = Math.max(2, Math.round(mass / 12 + cannons * 0.75));
  return Object.freeze({
    slug,
    cannons,
    accelerationRad,
    topSpeedRad: topSpeedRad * SHIP_TOP_SPEED_SCALE,
    upwindStallAngleDeg,
    upwindStallAngleRad: upwindStallAngleDeg * DEG_TO_RAD,
    turnRateRad,
    mass,
    crewCapacity,
    hitPoints,
    cargoCapacity,
    seaworthiness,
    propulsion
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
