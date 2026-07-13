export const RESURRECT_64_HEX = Object.freeze([
  "2e222f", "3e3546", "625565", "966c6c", "ab947a", "694f62", "7f708a", "9babb2",
  "c7dcd0", "ffffff", "6e2727", "b33831", "ea4f36", "f57d4a", "ae2334", "e83b3b",
  "fb6b1d", "f79617", "f9c22b", "7a3045", "9e4539", "cd683d", "e6904e", "fbb954",
  "4c3e24", "676633", "a2a947", "d5e04b", "fbff86", "165a4c", "239063", "1ebc73",
  "91db69", "cddf6c", "313638", "374e4a", "547e64", "92a984", "b2ba90", "0b5e65",
  "0b8a8f", "0eaf9b", "30e1b9", "8ff8e2", "323353", "484a77", "4d65b4", "4d9be6",
  "8fd3ff", "45293f", "6b3e75", "905ea9", "a884f3", "eaaded", "753c54", "a24b6f",
  "cf657f", "ed8099", "831c5d", "c32454", "f04f78", "f68181", "fca790", "fdcbb0"
]);

export const WATER_LATITUDE_BAND_DEGREES = 5;
export const WATER_LATITUDE_MAX_BAND = 18;

const WATER_RESURRECT_HEX = Object.freeze([
  "2e222f", "3e3546", "625565", "7f708a", "9babb2", "c7dcd0", "ffffff",
  "313638", "374e4a", "547e64", "92a984", "b2ba90",
  "0b5e65", "0b8a8f", "0eaf9b", "30e1b9", "8ff8e2",
  "323353", "484a77", "4d65b4", "4d9be6", "8fd3ff"
]);

const WATER_PALETTE = WATER_RESURRECT_HEX.map(parseHex);
const WATER_PALETTE_SET = new Set(WATER_RESURRECT_HEX);

const SOURCE_BASE_HEX = Object.freeze([
  "9babb2",
  "7e9ca3",
  "618c93",
  "457d84",
  "286d74",
  "0b5e65"
]);

const TROPICAL_BASE_HEX = Object.freeze([
  "30e1b9",
  "0eaf9b",
  "0b8a8f",
  "0b5e65",
  "0b5e65",
  "0b5e65"
]);

const TEMPERATE_BASE_HEX = Object.freeze([
  "9babb2",
  "9babb2",
  "7f708a",
  "484a77",
  "323353",
  "323353"
]);

const COLD_BASE_HEX = Object.freeze([
  "c7dcd0",
  "9babb2",
  "7f708a",
  "625565",
  "484a77",
  "323353"
]);

const SOURCE_BASE = SOURCE_BASE_HEX.map(parseHex);
const TROPICAL_BASE = TROPICAL_BASE_HEX.map(parseHex);
const TEMPERATE_BASE = TEMPERATE_BASE_HEX.map(parseHex);
const COLD_BASE = COLD_BASE_HEX.map(parseHex);

export function waterLatitudeBand(latDeg) {
  if (!Number.isFinite(latDeg) || latDeg < -90 || latDeg > 90) {
    throw new Error(`Invalid water latitude: ${latDeg}`);
  }
  return Math.min(WATER_LATITUDE_MAX_BAND, Math.round(Math.abs(latDeg) / WATER_LATITUDE_BAND_DEGREES));
}

export function waterLatitudeForBand(band) {
  assertBand(band);
  return band * WATER_LATITUDE_BAND_DEGREES;
}

export function waterDepthIndexForSpriteKey(key) {
  if (typeof key !== "string") throw new Error(`Invalid water sprite key: ${key}`);
  if (key.startsWith("water_shallow_")) return 0;
  const match = /^water_depth_0([1-4])_0[12]$/.exec(key);
  if (match) return Number(match[1]);
  if (/^water_deep_0[12]_0[12]$/.test(key)) return 5;
  throw new Error(`Unknown water sprite key: ${key}`);
}

export function waterPaletteHexForRgb(r, g, b, band, depthIndex) {
  assertChannel(r, "red");
  assertChannel(g, "green");
  assertChannel(b, "blue");
  assertBand(band);
  assertDepthIndex(depthIndex);

  const sourceBase = SOURCE_BASE[depthIndex];
  const targetBase = targetBaseForBand(band, depthIndex);
  const sourceBrightness = perceptualBrightness({ r, g, b });
  const baseBrightness = Math.max(1, perceptualBrightness(sourceBase));
  const brightnessRatio = clamp(sourceBrightness / baseBrightness, 0.24, 1.9);
  const desired = {
    r: clamp(targetBase.r * brightnessRatio, 0, 255),
    g: clamp(targetBase.g * brightnessRatio, 0, 255),
    b: clamp(targetBase.b * brightnessRatio, 0, 255)
  };
  return nearestWaterPaletteHex(desired);
}

export function waterPaletteHexForSourceHex(sourceHex, band, depthIndex) {
  const source = parseHex(sourceHex);
  return waterPaletteHexForRgb(source.r, source.g, source.b, band, depthIndex);
}

export function isResurrect64Hex(hex) {
  return RESURRECT_64_HEX.includes(normalizeHex(hex));
}

export function nearestResurrect64Hex(r, g, b) {
  assertChannel(r, "red");
  assertChannel(g, "green");
  assertChannel(b, "blue");
  let best = null;
  let bestDistance = Infinity;
  for (const hex of RESURRECT_64_HEX) {
    const candidate = parseHex(hex);
    const dr = r - candidate.r;
    const dg = g - candidate.g;
    const db = b - candidate.b;
    const distance = dr * dr * 2 + dg * dg * 4 + db * db * 3;
    if (distance >= bestDistance) continue;
    bestDistance = distance;
    best = candidate.hex;
  }
  if (!best) throw new Error("Resurrect 64 palette is empty");
  return best;
}

export function isWaterResurrectHex(hex) {
  return WATER_PALETTE_SET.has(normalizeHex(hex));
}

function targetBaseForBand(band, depthIndex) {
  const latitude = waterLatitudeForBand(band);
  if (latitude <= 40) {
    return mixRgb(TROPICAL_BASE[depthIndex], TEMPERATE_BASE[depthIndex], smoothstep(20, 40, latitude));
  }
  return mixRgb(TEMPERATE_BASE[depthIndex], COLD_BASE[depthIndex], smoothstep(40, 70, latitude));
}

function nearestWaterPaletteHex(color) {
  let best = WATER_PALETTE[0];
  let bestDistance = Infinity;
  for (const candidate of WATER_PALETTE) {
    const dr = color.r - candidate.r;
    const dg = color.g - candidate.g;
    const db = color.b - candidate.b;
    const distance = dr * dr * 2 + dg * dg * 4 + db * db * 3;
    if (distance >= bestDistance) continue;
    bestDistance = distance;
    best = candidate;
  }
  return best.hex;
}

function parseHex(value) {
  const hex = normalizeHex(value);
  if (!/^[0-9a-f]{6}$/.test(hex)) throw new Error(`Invalid palette color: ${value}`);
  return {
    hex,
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16)
  };
}

function normalizeHex(value) {
  return String(value || "").trim().toLowerCase().replace(/^#/, "");
}

function mixRgb(a, b, t) {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t
  };
}

function perceptualBrightness(color) {
  return color.r * 0.299 + color.g * 0.587 + color.b * 0.114;
}

function smoothstep(edge0, edge1, value) {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function assertChannel(value, label) {
  if (!Number.isInteger(value) || value < 0 || value > 255) throw new Error(`Invalid ${label} channel: ${value}`);
}

function assertBand(band) {
  if (!Number.isInteger(band) || band < 0 || band > WATER_LATITUDE_MAX_BAND) {
    throw new Error(`Invalid water latitude band: ${band}`);
  }
}

function assertDepthIndex(depthIndex) {
  if (!Number.isInteger(depthIndex) || depthIndex < 0 || depthIndex >= SOURCE_BASE.length) {
    throw new Error(`Invalid water depth index: ${depthIndex}`);
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
