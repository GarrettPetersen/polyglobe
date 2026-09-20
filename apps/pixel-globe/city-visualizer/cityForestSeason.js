const SEASONAL_TREE_PRESENTATIONS = new Set(["larch", "cherry", "deciduous"]);
const AUTUMN_PHASES = new Set(["autumn", "falling-leaf"]);
const FOREST_GREEN_HEX = new Set(["165a4c", "239063", "1ebc73"]);

const AUTUMN_YELLOW_PALETTE = Object.freeze({
  "165a4c": "676633",
  "239063": "a2a947",
  "1ebc73": "d5e04b"
});

const AUTUMN_RED_PALETTE = Object.freeze({
  "165a4c": "9e4539",
  "239063": "cd683d",
  "1ebc73": "fbb954"
});

const WINTER_TRUNK_PALETTE = Object.freeze({
  "165a4c": "3e3546",
  "239063": "625565",
  "1ebc73": "966c6c"
});

export function cityForestSeason({ placements, presentations }) {
  if (!Array.isArray(placements) || !(presentations instanceof Map)) {
    throw new Error("City forest season requires tree placements and presentations");
  }
  const foreground = placements.filter(({ depth }) => depth === 1);
  if (foreground.length === 0) return frozenForestSeason("foliage", 0);
  const seasonal = foreground.flatMap((placement) => {
    if (!SEASONAL_TREE_PRESENTATIONS.has(placement.presentationPolicy)) return [];
    const presentation = presentations.get(placement.id);
    if (!presentation?.phase) {
      throw new Error(`Missing foreground tree presentation: ${placement.id}`);
    }
    return [presentation];
  });
  const autumnCount = seasonal.filter(({ phase }) => AUTUMN_PHASES.has(phase)).length;
  if (autumnCount > 0) {
    return frozenForestSeason("autumn", seasonalForestCoverage(autumnCount, foreground.length));
  }
  const winterCount = seasonal.filter(({ phase }) => phase === "bare").length;
  if (winterCount > 0) {
    return frozenForestSeason("winter", seasonalForestCoverage(winterCount, foreground.length));
  }
  return frozenForestSeason("foliage", 0);
}

export function cityForestSeasonalPaletteRgb({
  season,
  seed,
  x,
  y,
  red,
  green,
  blue
}) {
  requireSeason(season);
  if (typeof seed !== "string" || seed === "") throw new Error("City forest palette requires a seed");
  if (![x, y, red, green, blue].every(Number.isInteger)) {
    throw new Error("City forest palette coordinates and channels must be integers");
  }
  for (const [channel, value] of Object.entries({ red, green, blue })) {
    if (value < 0 || value > 255) throw new Error(`Invalid city forest ${channel} channel: ${value}`);
  }
  const sourceHex = rgbHex(red, green, blue);
  if (season.kind === "foliage" || !FOREST_GREEN_HEX.has(sourceHex)) {
    return Object.freeze({ red, green, blue });
  }
  // Distant crowns are only a few pixels wide. A six-pixel cell keeps each
  // implied tree coherent while allowing evergreen and deciduous clusters to mix.
  const clusterHash = stableHash(`${seed}:${Math.floor(x / 6)}:${Math.floor(y / 6)}`);
  if (clusterHash % 10_000 >= Math.round(season.coverage * 10_000)) {
    return Object.freeze({ red, green, blue });
  }
  const palette = season.kind === "winter"
    ? WINTER_TRUNK_PALETTE
    : clusterHash % 2 === 0 ? AUTUMN_YELLOW_PALETTE : AUTUMN_RED_PALETTE;
  return parseHex(palette[sourceHex]);
}

function seasonalForestCoverage(seasonalCount, foregroundCount) {
  const share = seasonalCount / foregroundCount;
  return Math.round(Math.min(0.9, 0.32 + share * 0.58) * 100) / 100;
}

function frozenForestSeason(kind, coverage) {
  const season = Object.freeze({ kind, coverage });
  requireSeason(season);
  return season;
}

function requireSeason(season) {
  if (!season || !["foliage", "autumn", "winter"].includes(season.kind) ||
      !Number.isFinite(season.coverage) || season.coverage < 0 || season.coverage > 1 ||
      (season.kind === "foliage" && season.coverage !== 0)) {
    throw new Error(`Invalid city forest season: ${season?.kind}:${season?.coverage}`);
  }
}

function rgbHex(red, green, blue) {
  return [red, green, blue]
    .map((component) => component.toString(16).padStart(2, "0"))
    .join("");
}

function parseHex(hex) {
  if (typeof hex !== "string" || !/^[0-9a-f]{6}$/.test(hex)) {
    throw new Error(`Invalid city forest palette color: ${hex}`);
  }
  return Object.freeze({
    red: Number.parseInt(hex.slice(0, 2), 16),
    green: Number.parseInt(hex.slice(2, 4), 16),
    blue: Number.parseInt(hex.slice(4, 6), 16)
  });
}

function stableHash(value) {
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
