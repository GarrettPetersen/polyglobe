export const DEFAULT_PLAYER_SHIP_SLUG = "brigantine";

const DEG_TO_RAD = Math.PI / 180;
const SHIP_LABELS = Object.freeze({
  "fishing-lugger": "Fishing Lugger",
  "small-dhow": "Small Dhow",
  "small-cog": "Small Cog",
  dhow: "Dhow",
  sampan: "Sampan",
  "large-junk": "Large Junk",
  "pirate-brig": "Pirate Brig",
  "pirate-frigate": "Pirate Frigate",
  galleon: "Galleon",
  frigate: "Frigate",
  fluyt: "Fluyt",
  carrack: "Carrack",
  "ship-of-the-line": "Ship of the Line",
  "medium-junk": "Medium Junk",
  "pirate-brigantine": "Pirate Brigantine",
  xebec: "Xebec",
  caravel: "Caravel",
  "small-carrack": "Small Carrack",
  "square-rigged-caravel": "Square-Rigged Caravel",
  brigantine: "Brigantine",
  corvette: "Corvette",
  "small-junk": "Small Junk",
  "pirate-sloop": "Pirate Sloop",
  "lateen-xebec": "Lateen Xebec",
  felucca: "Felucca",
  cutter: "Cutter",
  "lateen-dhow": "Lateen Dhow",
  ketch: "Ketch",
  "square-sail-trader": "Square-Sail Trader",
  "dhow-felucca": "Dhow-Felucca"
});

const rawShipStats = [
  stats("fishing-lugger", 0, 0.021, 0.028, 48, 2.90, 35, 18),
  stats("small-dhow", 0, 0.027, 0.032, 34, 3.20, 38, 28),
  stats("small-cog", 2, 0.016, 0.026, 58, 2.00, 70, 70),
  stats("dhow", 4, 0.022, 0.033, 42, 2.80, 55, 45),
  stats("sampan", 0, 0.026, 0.026, 45, 3.40, 30, 25),
  stats("large-junk", 24, 0.015, 0.038, 50, 1.75, 220, 360),
  stats("pirate-brig", 18, 0.020, 0.041, 42, 2.35, 190, 130),
  stats("pirate-frigate", 36, 0.017, 0.046, 45, 1.95, 300, 190),
  stats("galleon", 32, 0.013, 0.037, 55, 1.55, 360, 420),
  stats("frigate", 40, 0.018, 0.047, 43, 2.05, 320, 180),
  stats("fluyt", 12, 0.012, 0.036, 58, 1.45, 260, 520),
  stats("carrack", 26, 0.012, 0.034, 60, 1.35, 340, 480),
  stats("ship-of-the-line", 74, 0.010, 0.045, 58, 1.15, 620, 260),
  stats("medium-junk", 12, 0.018, 0.036, 48, 2.10, 135, 170),
  stats("pirate-brigantine", 12, 0.022, 0.041, 38, 2.65, 135, 80),
  stats("xebec", 16, 0.024, 0.043, 34, 2.80, 130, 85),
  stats("caravel", 8, 0.019, 0.036, 44, 2.35, 110, 120),
  stats("small-carrack", 10, 0.015, 0.033, 54, 1.90, 150, 210),
  stats("square-rigged-caravel", 4, 0.020, 0.034, 52, 2.30, 90, 100),
  stats("brigantine", 14, 0.021, 0.040, 40, 2.45, 155, 115),
  stats("corvette", 18, 0.020, 0.042, 42, 2.35, 190, 90),
  stats("small-junk", 4, 0.023, 0.032, 43, 2.70, 75, 80),
  stats("pirate-sloop", 6, 0.026, 0.035, 34, 3.05, 75, 35),
  stats("lateen-xebec", 6, 0.027, 0.036, 32, 3.00, 70, 40),
  stats("felucca", 0, 0.029, 0.031, 30, 3.35, 35, 20),
  stats("cutter", 4, 0.028, 0.035, 32, 3.25, 60, 30),
  stats("lateen-dhow", 2, 0.027, 0.032, 34, 3.00, 45, 35),
  stats("ketch", 4, 0.024, 0.035, 34, 2.85, 75, 60),
  stats("square-sail-trader", 2, 0.020, 0.034, 52, 2.30, 65, 95),
  stats("dhow-felucca", 0, 0.030, 0.032, 30, 3.40, 35, 18)
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

function stats(slug, cannons, accelerationRad, topSpeedRad, upwindStallAngleDeg, turnRateRad, hitPoints, cargoCapacity) {
  assertSlug(slug);
  assertInteger(`${slug}.cannons`, cannons, 0);
  assertFinitePositive(`${slug}.accelerationRad`, accelerationRad);
  assertFinitePositive(`${slug}.topSpeedRad`, topSpeedRad);
  assertFiniteRange(`${slug}.upwindStallAngleDeg`, upwindStallAngleDeg, 1, 89);
  assertFinitePositive(`${slug}.turnRateRad`, turnRateRad);
  assertInteger(`${slug}.hitPoints`, hitPoints, 1);
  assertInteger(`${slug}.cargoCapacity`, cargoCapacity, 0);

  return Object.freeze({
    slug,
    cannons,
    accelerationRad,
    topSpeedRad,
    upwindStallAngleDeg,
    upwindStallAngleRad: upwindStallAngleDeg * DEG_TO_RAD,
    turnRateRad,
    hitPoints,
    cargoCapacity
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
