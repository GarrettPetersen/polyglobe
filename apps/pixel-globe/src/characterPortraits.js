export const CHARACTER_PORTRAIT_ASSET_VERSION = "portrait-palette-1";
export const CHARACTER_PORTRAIT_MANIFEST_URL = `/assets/characters/generated/character-portraits.json?v=${CHARACTER_PORTRAIT_ASSET_VERSION}`;

export async function loadCharacterPortraitManifest() {
  const res = await fetch(CHARACTER_PORTRAIT_MANIFEST_URL);
  if (!res.ok) throw new Error(`Failed to load character portrait manifest: HTTP ${res.status}`);
  const manifest = await res.json();
  validateCharacterPortraitManifest(manifest);
  return manifest;
}

export function validateCharacterPortraitManifest(manifest) {
  if (!manifest || typeof manifest !== "object") {
    throw new Error("Character portrait manifest must be an object");
  }
  if (!Array.isArray(manifest.sourceCharacters) || manifest.sourceCharacters.length === 0) {
    throw new Error("Character portrait manifest has no source characters");
  }
  if (!Array.isArray(manifest.paletteVariants) || manifest.paletteVariants.length === 0) {
    throw new Error("Character portrait manifest has no palette variants");
  }

  const characterIds = new Set();
  for (const character of manifest.sourceCharacters) {
    assertSlug(character.id, "character id");
    if (characterIds.has(character.id)) throw new Error(`Duplicate source character id: ${character.id}`);
    characterIds.add(character.id);
    if (typeof character.label !== "string" || character.label.trim() === "") {
      throw new Error(`Source character ${character.id} is missing a label`);
    }
    if (!Array.isArray(character.expressions) || character.expressions.length === 0) {
      throw new Error(`Source character ${character.id} has no expressions`);
    }
    const expressionIds = new Set();
    for (const expression of character.expressions) {
      assertSlug(expression.id, `expression id for ${character.id}`);
      if (expressionIds.has(expression.id)) {
        throw new Error(`Duplicate expression ${expression.id} for source character ${character.id}`);
      }
      expressionIds.add(expression.id);
      if (typeof expression.src !== "string" || !expression.src.startsWith("/assets/characters/")) {
        throw new Error(`Expression ${character.id}.${expression.id} has invalid src: ${expression.src}`);
      }
    }
  }

  const paletteIds = new Set();
  for (const palette of manifest.paletteVariants) {
    assertSlug(palette.id, "palette id");
    if (paletteIds.has(palette.id)) throw new Error(`Duplicate palette id: ${palette.id}`);
    paletteIds.add(palette.id);
    for (const key of ["skinRamp", "hairRamp", "clothRamp", "accentRamp"]) {
      validateRamp(palette[key], `${palette.id}.${key}`);
    }
  }
}

function assertSlug(value, label) {
  if (typeof value !== "string" || !/^[a-z0-9][a-z0-9-]*$/.test(value)) {
    throw new Error(`Invalid ${label}: ${value}`);
  }
}

function validateRamp(ramp, label) {
  if (!Array.isArray(ramp) || ramp.length < 3) throw new Error(`${label} must have at least three colors`);
  for (const color of ramp) {
    if (typeof color !== "string" || !/^#[0-9a-fA-F]{6}$/.test(color)) {
      throw new Error(`${label} has invalid color: ${color}`);
    }
  }
}

export function assignPortCityCharacters(portCities, manifest) {
  validateCharacterPortraitManifest(manifest);
  const cities = [...portCities].sort((a, b) => stableCityKey(a).localeCompare(stableCityKey(b)));
  const capacity = manifest.sourceCharacters.length * manifest.paletteVariants.length;
  if (cities.length > capacity) {
    throw new Error(`Not enough character portrait variants for port cities: ${cities.length} ports, ${capacity} variants`);
  }

  const assignments = new Map();
  const used = new Set();
  for (const city of cities) {
    const key = stableCityKey(city);
    let comboIndex = hashString32(key) % capacity;
    while (used.has(comboIndex)) comboIndex = (comboIndex + 1) % capacity;
    used.add(comboIndex);

    const sourceIndex = comboIndex % manifest.sourceCharacters.length;
    const paletteIndex = Math.floor(comboIndex / manifest.sourceCharacters.length);
    const source = manifest.sourceCharacters[sourceIndex];
    const palette = manifest.paletteVariants[paletteIndex];
    assignments.set(city.tileId, {
      id: `${source.id}-${palette.id}`,
      cityKey: key,
      sourceId: source.id,
      sourceLabel: source.label,
      paletteId: palette.id,
      paletteLabel: palette.label,
      palette,
      expressions: source.expressions.map((expression) => ({
        id: expression.id,
        label: expression.label,
        src: expression.src
      }))
    });
  }
  return assignments;
}

export function characterExpression(character, expressionId = "neutral") {
  const exact = character?.expressions?.find((expression) => expression.id === expressionId);
  if (exact) return exact;
  const neutral = character?.expressions?.find((expression) => expression.id === "neutral");
  return neutral || character?.expressions?.[0] || null;
}

export function recolorPortraitImage(sourceImage, palette) {
  if (!sourceImage) throw new Error("Cannot recolor a missing portrait image");
  if (!palette) throw new Error("Cannot recolor portrait without a palette variant");
  const canvas = document.createElement("canvas");
  canvas.width = sourceImage.naturalWidth || sourceImage.width;
  canvas.height = sourceImage.naturalHeight || sourceImage.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Could not create canvas for portrait palette swap");
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sourceImage, 0, 0);
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  applyPaletteSwap(image.data, palette);
  ctx.putImageData(image, 0, 0);
  return canvas;
}

function applyPaletteSwap(data, palette) {
  const skinRamp = palette.skinRamp.map(hexToRgb);
  const hairRamp = palette.hairRamp.map(hexToRgb);
  const clothRamp = palette.clothRamp.map(hexToRgb);
  const accentRamp = palette.accentRamp.map(hexToRgb);

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] <= 0) continue;
    const original = { r: data[i], g: data[i + 1], b: data[i + 2] };
    const hsl = rgbToHsl(original.r, original.g, original.b);
    if (hsl.l < 0.08) continue;

    let next = null;
    if (isSkinPixel(hsl)) {
      next = rampColor(skinRamp, hsl.l);
    } else if (isHairPixel(hsl)) {
      next = rampColor(hairRamp, hsl.l);
    } else if (hsl.s > 0.16) {
      const ramp = hsl.h > 25 && hsl.h < 70 ? accentRamp : clothRamp;
      next = rampColor(ramp, hsl.l);
    }

    if (!next) continue;
    data[i] = next.r;
    data[i + 1] = next.g;
    data[i + 2] = next.b;
  }
}

function isSkinPixel(hsl) {
  return hsl.h >= 12 && hsl.h <= 55 && hsl.s >= 0.12 && hsl.s <= 0.72 && hsl.l >= 0.22 && hsl.l <= 0.86;
}

function isHairPixel(hsl) {
  return hsl.l >= 0.1 && hsl.l <= 0.48 && hsl.s <= 0.55;
}

function rampColor(ramp, lightness) {
  const t = clamp01((lightness - 0.12) / 0.72);
  const scaled = t * (ramp.length - 1);
  const index = Math.min(ramp.length - 2, Math.max(0, Math.floor(scaled)));
  const localT = scaled - index;
  return lerpRgb(ramp[index], ramp[index + 1], localT);
}

function lerpRgb(a, b, t) {
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t)
  };
}

function hexToRgb(hex) {
  const n = Number.parseInt(hex.slice(1), 16);
  return {
    r: (n >> 16) & 255,
    g: (n >> 8) & 255,
    b: n & 255
  };
}

function rgbToHsl(r, g, b) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  return { h: h * 60, s, l };
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function stableCityKey(city) {
  return `${city.displayCity || city.city}|${city.country}|${city.tileId}`;
}

function hashString32(value) {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
