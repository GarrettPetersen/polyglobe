import { RESURRECT_64_HEX } from "./waterLatitudePalette.js";

const COLOR_RAMP_STEPS = 16;
const LITTLE_ENDIAN = new Uint8Array(new Uint32Array([0x01020304]).buffer)[0] === 0x04;

export const NIGHT_GRADE_HEX = Object.freeze([
  "2e222f", "3e3546", "45293f", "323353", "484a77", "625565",
  "6b3e75", "4d65b4", "7f708a", "905ea9", "a884f3", "9babb2"
]);

export const SUNSET_GRADE_HEX = Object.freeze([
  "2e222f", "45293f", "6e2727", "7a3045", "9e4539", "b33831",
  "cd683d", "ea4f36", "f57d4a", "e6904e", "fb6b1d", "f79617",
  "f9c22b", "fbb954", "fbff86", "fdcbb0"
]);

const RESURRECT_COLORS = RESURRECT_64_HEX.map(parsePaletteColor);
const RESURRECT_INDEX_BY_HEX = new Map(RESURRECT_COLORS.map((color, index) => [color.hex, index]));
const DOMINANT_WATER_LAND_PAIRS = Object.freeze([
  ["323353", "4c3e24"],
  ["9babb2", "a2a947"],
  ["0b8a8f", "676633"],
  ["0b5e65", "165a4c"],
  ["0eaf9b", "239063"],
  ["30e1b9", "f9c22b"]
]);
const NIGHT_CANDIDATES = paletteSubset(NIGHT_GRADE_HEX);
const SUNSET_CANDIDATES = paletteSubset(SUNSET_GRADE_HEX);
const NIGHT_TERRAIN_SEPARATION = paletteOverrideMap({
  "4c3e24": "3e3546",
  "676633": "45293f",
  "a2a947": "625565",
  "d5e04b": "905ea9",
  "165a4c": "3e3546",
  "239063": "625565",
  "1ebc73": "6b3e75",
  "91db69": "905ea9"
}, NIGHT_CANDIDATES, "night terrain separation");
const SUNSET_TERRAIN_SEPARATION = paletteOverrideMap({
  "323353": "45293f",
  "4c3e24": "6e2727",
  "676633": "b33831",
  "a2a947": "f79617",
  "d5e04b": "fbff86",
  "165a4c": "6e2727",
  "239063": "ea4f36",
  "1ebc73": "f57d4a",
  "91db69": "f79617",
  "f9c22b": "fbff86"
}, SUNSET_CANDIDATES, "sunset terrain separation");
const NIGHT_PALETTE_MAP = RESURRECT_COLORS.map((source) => nightTargetFor(source));
const SUNSET_PALETTE_MAP = RESURRECT_COLORS.map((source) => sunsetTargetFor(source));
const SOURCE_PALETTE_LUT = buildSourcePaletteLut();
const NIGHT_RGB_RAMP = buildRgbGradeRamp(NIGHT_PALETTE_MAP);
const SUNSET_RGB_RAMP = buildRgbGradeRamp(SUNSET_PALETTE_MAP);

export function applyDayNightPaletteGrade(data, width, height, light) {
  if (!(data instanceof Uint8ClampedArray)) throw new Error("Day/night grade requires clamped RGBA data");
  if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) {
    throw new Error(`Invalid day/night grade dimensions: ${width}x${height}`);
  }
  if (data.length !== width * height * 4) throw new Error("Day/night grade data length does not match dimensions");

  const sunsetStage = colorRampStage(light?.sunset);
  const nightStage = colorRampStage(light?.night);
  if (sunsetStage === 0 && nightStage === 0) return data;

  if (!LITTLE_ENDIAN || data.byteOffset % 4 !== 0) {
    applyByteGrade(data, SUNSET_RGB_RAMP[sunsetStage]);
    applyByteGrade(data, NIGHT_RGB_RAMP[nightStage]);
    return data;
  }

  const pixels = new Uint32Array(data.buffer, data.byteOffset, width * height);
  applyPackedGrade(pixels, SUNSET_RGB_RAMP[sunsetStage]);
  applyPackedGrade(pixels, NIGHT_RGB_RAMP[nightStage]);
  return data;
}

export function nightPaletteHexForSourceHex(sourceHex) {
  return NIGHT_PALETTE_MAP[nearestPaletteIndex(parsePaletteColor(sourceHex))].hex;
}

export function sunsetPaletteHexForSourceHex(sourceHex) {
  return SUNSET_PALETTE_MAP[nearestPaletteIndex(parsePaletteColor(sourceHex))].hex;
}

function nightTargetFor(source) {
  const terrainOverride = NIGHT_TERRAIN_SEPARATION.get(source.hex);
  if (terrainOverride) return terrainOverride;
  const desired = {
    l: clamp(source.lab.l * 0.8 - 0.01, 0.2, 0.76),
    a: source.lab.a * 0.28 + 0.018,
    b: source.lab.b * 0.2 - 0.085
  };
  const darkerCandidates = NIGHT_CANDIDATES.filter((candidate) => candidate.lab.l <= source.lab.l - 0.012);
  return nearestLabColor(desired, darkerCandidates.length > 0 ? darkerCandidates : NIGHT_CANDIDATES);
}

function sunsetTargetFor(source) {
  const terrainOverride = SUNSET_TERRAIN_SEPARATION.get(source.hex);
  if (terrainOverride) return terrainOverride;
  const highlight = smoothstep(0.35, 0.86, source.lab.l);
  const desired = {
    l: clamp(source.lab.l * 0.95 + 0.018, 0.24, 0.94),
    a: source.lab.a * 0.16 + mix(0.095, 0.05, highlight),
    b: source.lab.b * 0.12 + mix(0.035, 0.13, highlight)
  };
  return nearestLabColor(desired, SUNSET_CANDIDATES);
}

function buildSourcePaletteLut() {
  const lut = new Uint8Array(32 * 32 * 32);
  for (let r = 0; r < 32; r++) {
    for (let g = 0; g < 32; g++) {
      for (let b = 0; b < 32; b++) {
        const color = parsePaletteColor({
          r: Math.round(r * 255 / 31),
          g: Math.round(g * 255 / 31),
          b: Math.round(b * 255 / 31)
        });
        lut[(r << 10) | (g << 5) | b] = nearestPaletteIndex(color);
      }
    }
  }
  return lut;
}

function buildRgbGradeLut(paletteMap) {
  const lut = new Uint32Array(SOURCE_PALETTE_LUT.length);
  for (let i = 0; i < lut.length; i++) {
    const color = paletteMap[SOURCE_PALETTE_LUT[i]];
    lut[i] = LITTLE_ENDIAN
      ? color.r | (color.g << 8) | (color.b << 16)
      : color.packed;
  }
  return lut;
}

function buildRgbGradeRamp(targetMap) {
  const ramp = [];
  for (let stage = 0; stage <= COLOR_RAMP_STEPS; stage++) {
    if (stage === 0) {
      ramp.push(null);
      continue;
    }
    const progress = stage / COLOR_RAMP_STEPS;
    const desiredMap = RESURRECT_COLORS.map((source, index) => (
      mixLab(source.lab, targetMap[index].lab, progress)
    ));
    const stageMap = stage === COLOR_RAMP_STEPS
      ? [...targetMap]
      : desiredMap.map((desired) => nearestLabColor(desired, RESURRECT_COLORS));
    separateDominantTerrainColors(stageMap, desiredMap);
    ramp.push(buildRgbGradeLut(stageMap));
  }
  return Object.freeze(ramp);
}

function separateDominantTerrainColors(stageMap, desiredMap) {
  for (const [waterHex, landHex] of DOMINANT_WATER_LAND_PAIRS) {
    const waterIndex = paletteIndexForHex(waterHex);
    const landIndex = paletteIndexForHex(landHex);
    if (stageMap[waterIndex].hex !== stageMap[landIndex].hex) continue;
    const landCandidates = RESURRECT_COLORS.filter((color) => color.hex !== stageMap[waterIndex].hex);
    stageMap[landIndex] = nearestLabColor(desiredMap[landIndex], landCandidates);
  }
}

function paletteIndexForHex(hex) {
  const index = RESURRECT_INDEX_BY_HEX.get(hex);
  if (index === undefined) throw new Error(`Terrain separation contains an unknown source color: ${hex}`);
  return index;
}

function applyPackedGrade(pixels, lut) {
  if (!lut) return;
  for (let i = 0; i < pixels.length; i++) {
    const pixel = pixels[i];
    if ((pixel & 0xff000000) === 0) continue;
    pixels[i] = (pixel & 0xff000000) | lut[packedRgbLutIndex(pixel)];
  }
}

function applyByteGrade(data, lut) {
  if (!lut) return;
  for (let offset = 0; offset < data.length; offset += 4) {
    if (data[offset + 3] === 0) continue;
    writePackedRgb(data, offset, lut[rgbLutIndex(data[offset], data[offset + 1], data[offset + 2])]);
  }
}

function nearestPaletteIndex(color) {
  let bestIndex = 0;
  let bestDistance = Infinity;
  for (let i = 0; i < RESURRECT_COLORS.length; i++) {
    const distance = labDistanceSquared(color.lab, RESURRECT_COLORS[i].lab);
    if (distance >= bestDistance) continue;
    bestDistance = distance;
    bestIndex = i;
  }
  return bestIndex;
}

function nearestLabColor(desired, candidates) {
  let best = candidates[0];
  let bestDistance = Infinity;
  for (const candidate of candidates) {
    const distance = labDistanceSquared(desired, candidate.lab);
    if (distance >= bestDistance) continue;
    bestDistance = distance;
    best = candidate;
  }
  return best;
}

function labDistanceSquared(a, b) {
  const dl = (a.l - b.l) * 1.3;
  const da = a.a - b.a;
  const db = a.b - b.b;
  return dl * dl + da * da + db * db;
}

function mixLab(a, b, t) {
  return {
    l: mix(a.l, b.l, t),
    a: mix(a.a, b.a, t),
    b: mix(a.b, b.b, t)
  };
}

function paletteSubset(hexValues) {
  const allowed = new Set(hexValues);
  const colors = RESURRECT_COLORS.filter((color) => allowed.has(color.hex));
  if (colors.length !== allowed.size) throw new Error("Day/night grade contains a color outside Resurrect 64");
  return colors;
}

function paletteOverrideMap(entries, candidates, label) {
  const candidatesByHex = new Map(candidates.map((color) => [color.hex, color]));
  const overrides = new Map();
  for (const [sourceHex, targetHex] of Object.entries(entries)) {
    if (!RESURRECT_64_HEX.includes(sourceHex)) {
      throw new Error(`${label} contains an unknown source color: ${sourceHex}`);
    }
    const target = candidatesByHex.get(targetHex);
    if (!target) throw new Error(`${label} contains an invalid target color: ${targetHex}`);
    overrides.set(sourceHex, target);
  }
  return overrides;
}

function parsePaletteColor(value) {
  let hex;
  let r;
  let g;
  let b;
  if (typeof value === "string") {
    hex = value.trim().toLowerCase().replace(/^#/, "");
    if (!/^[0-9a-f]{6}$/.test(hex)) throw new Error(`Invalid palette color: ${value}`);
    r = Number.parseInt(hex.slice(0, 2), 16);
    g = Number.parseInt(hex.slice(2, 4), 16);
    b = Number.parseInt(hex.slice(4, 6), 16);
  } else {
    r = value.r;
    g = value.g;
    b = value.b;
    hex = [r, g, b].map((channel) => Math.round(channel).toString(16).padStart(2, "0")).join("");
  }
  return {
    hex,
    r,
    g,
    b,
    packed: (r << 16) | (g << 8) | b,
    lab: rgbToOklab(r, g, b)
  };
}

function rgbToOklab(r, g, b) {
  const lr = srgbToLinear(r / 255);
  const lg = srgbToLinear(g / 255);
  const lb = srgbToLinear(b / 255);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return {
    l: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  };
}

function srgbToLinear(value) {
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function rgbLutIndex(r, g, b) {
  return ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
}

function packedRgbLutIndex(pixel) {
  return ((pixel & 0xf8) << 7) | ((pixel & 0xf800) >>> 6) | ((pixel & 0xf80000) >>> 19);
}

function writePackedRgb(data, offset, packed) {
  if (LITTLE_ENDIAN) {
    data[offset] = packed & 0xff;
    data[offset + 1] = (packed >> 8) & 0xff;
    data[offset + 2] = (packed >> 16) & 0xff;
  } else {
    data[offset] = packed >> 16;
    data[offset + 1] = (packed >> 8) & 0xff;
    data[offset + 2] = packed & 0xff;
  }
}

function colorRampStage(value) {
  return Math.round(clamp(Number(value) || 0, 0, 1) * COLOR_RAMP_STEPS);
}

function smoothstep(edge0, edge1, value) {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function mix(a, b, t) {
  return a + (b - a) * t;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
