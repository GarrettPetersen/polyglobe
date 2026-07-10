export const CHARACTER_PORTRAIT_ASSET_VERSION = "portrait-semantic-palette-2";
export const CHARACTER_PORTRAIT_MANIFEST_URL = `/assets/characters/generated/character-portraits.json?v=${CHARACTER_PORTRAIT_ASSET_VERSION}`;
export const PORTRAIT_ROLE_SKIN = 1;
export const PORTRAIT_ROLE_HAIR = 2;
export const PORTRAIT_ROLE_CLOTH = 3;
export const PORTRAIT_ROLE_ACCENT = 4;

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
  if (!Array.isArray(manifest.skinTones) || manifest.skinTones.length === 0) {
    throw new Error("Character portrait manifest has no skin tones");
  }
  if (!Array.isArray(manifest.hairTones) || manifest.hairTones.length === 0) {
    throw new Error("Character portrait manifest has no hair tones");
  }
  if (!Array.isArray(manifest.outfitPalettes) || manifest.outfitPalettes.length === 0) {
    throw new Error("Character portrait manifest has no outfit palettes");
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
    validateTagList(character.roles, `${character.id}.roles`);
    validateTagList(character.regions, `${character.id}.regions`);
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
      validatePortraitRoleMap(
        expression.roleMap,
        expression.width,
        expression.height,
        `${character.id}.${expression.id}`
      );
    }
  }

  const skinToneIds = new Set();
  for (const skinTone of manifest.skinTones) {
    assertSlug(skinTone.id, "skin tone id");
    if (skinToneIds.has(skinTone.id)) throw new Error(`Duplicate skin tone id: ${skinTone.id}`);
    skinToneIds.add(skinTone.id);
    validateRamp(skinTone.ramp, `${skinTone.id}.ramp`);
  }

  const hairToneIds = new Set();
  for (const hairTone of manifest.hairTones) {
    assertSlug(hairTone.id, "hair tone id");
    if (hairToneIds.has(hairTone.id)) throw new Error(`Duplicate hair tone id: ${hairTone.id}`);
    hairToneIds.add(hairTone.id);
    validateRamp(hairTone.ramp, `${hairTone.id}.ramp`);
  }

  const outfitIds = new Set();
  for (const palette of manifest.outfitPalettes) {
    assertSlug(palette.id, "outfit palette id");
    if (outfitIds.has(palette.id)) throw new Error(`Duplicate outfit palette id: ${palette.id}`);
    outfitIds.add(palette.id);
    for (const key of ["clothRamp", "accentRamp"]) {
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

function validateTagList(tags, label) {
  if (!Array.isArray(tags) || tags.length === 0) throw new Error(`${label} must be a non-empty array`);
  for (const tag of tags) assertSlug(tag, label);
}

export function assignPortCityCharacters(portCities, manifest) {
  validateCharacterPortraitManifest(manifest);
  const cities = [...portCities].sort((a, b) => stableCityKey(a).localeCompare(stableCityKey(b)));
  const assignments = new Map();
  const used = new Set();
  for (const city of cities) {
    const key = stableCityKey(city);
    const region = portraitRegionForCity(city);
    const sourcePool = characterSourcesForRole(manifest, "factor", region);
    assignments.set(city.tileId, {
      ...assignCharacterVariant(key, region, sourcePool, manifest, used),
      cityKey: key,
      role: "factor"
    });
  }
  return assignments;
}

export function assignNpcShipCaptains(npcShips, manifest) {
  validateCharacterPortraitManifest(manifest);
  const assignments = new Map();
  const used = new Set();
  const piratePool = manifest.sourceCharacters.filter((source) => (
    source.roles.includes("captain") && source.roles.includes("pirate")
  ));
  if (piratePool.length === 0) throw new Error("Character portrait manifest has no pirate captains");

  for (const ship of [...npcShips].sort((a, b) => a.id.localeCompare(b.id))) {
    const region = portraitRegionForNpcShip(ship);
    const regionalPool = manifest.sourceCharacters.filter((source) => (
      source.roles.includes("captain") && source.regions.includes(region)
    ));
    const useRegional = regionalPool.length > 0 && hashString32(`${ship.id}|regional-captain`) % 4 === 0;
    const sourcePool = useRegional ? regionalPool : piratePool;
    assignments.set(ship.id, {
      ...assignCharacterVariant(`captain|${ship.id}`, region, sourcePool, manifest, used),
      npcShipId: ship.id,
      role: "captain"
    });
  }
  return assignments;
}

function assignCharacterVariant(key, region, sourcePool, manifest, used) {
  if (sourcePool.length === 0) throw new Error(`No character portrait sources available for ${key}`);
  const skinTones = tonesForRegion(manifest.skinTones, SKIN_TONE_IDS_BY_REGION[region]);
  const hairTones = tonesForRegion(manifest.hairTones, HAIR_TONE_IDS_BY_REGION[region]);
  const stylesPerSource = skinTones.length * hairTones.length * manifest.outfitPalettes.length;
  const capacity = sourcePool.length * stylesPerSource;
  let comboIndex = hashString32(key) % capacity;
  let attempts = 0;
  while (attempts < capacity) {
    const sourceIndex = comboIndex % sourcePool.length;
    const styleIndex = Math.floor(comboIndex / sourcePool.length);
    const skinToneIndex = styleIndex % skinTones.length;
    const hairAndOutfitIndex = Math.floor(styleIndex / skinTones.length);
    const hairToneIndex = hairAndOutfitIndex % hairTones.length;
    const outfitIndex = Math.floor(hairAndOutfitIndex / hairTones.length);
    const source = sourcePool[sourceIndex];
    const skinTone = skinTones[skinToneIndex];
    const hairTone = hairTones[hairToneIndex];
    const outfit = manifest.outfitPalettes[outfitIndex];
    const variantId = `${source.id}-${skinTone.id}-${hairTone.id}-${outfit.id}`;
    if (!used.has(variantId)) {
      used.add(variantId);
      return assignedCharacter(variantId, region, source, skinTone, hairTone, outfit);
    }
    comboIndex = (comboIndex + 1) % capacity;
    attempts += 1;
  }
  throw new Error(`Not enough unique character variants for ${key}`);
}

function assignedCharacter(id, region, source, skinTone, hairTone, outfit) {
  return {
    id,
    region,
    sourceId: source.id,
    sourceLabel: source.label,
    sourceRoles: source.roles,
    sourceRegions: source.regions,
    skinToneId: skinTone.id,
    skinToneLabel: skinTone.label,
    hairToneId: hairTone.id,
    hairToneLabel: hairTone.label,
    outfitId: outfit.id,
    outfitLabel: outfit.label,
    palette: {
      skinRamp: skinTone.ramp,
      hairRamp: hairTone.ramp,
      clothRamp: outfit.clothRamp,
      accentRamp: outfit.accentRamp
    },
    expressions: source.expressions.map((expression) => ({
      id: expression.id,
      label: expression.label,
      src: expression.src,
      width: expression.width,
      height: expression.height,
      roleMap: expression.roleMap
    }))
  };
}

function characterSourcesForRole(manifest, role, region) {
  const roleSources = manifest.sourceCharacters.filter((source) => source.roles.includes(role));
  const regional = roleSources.filter((source) => source.regions.includes(region));
  if (regional.length > 0) return regional;
  const global = roleSources.filter((source) => source.regions.includes("global"));
  if (global.length > 0) return global;
  if (roleSources.length > 0) return roleSources;
  throw new Error(`Character portrait manifest has no sources for role ${role}`);
}

function tonesForRegion(tones, preferredIds) {
  if (!preferredIds) return tones;
  const preferred = tones.filter((tone) => preferredIds.includes(tone.id));
  return preferred.length > 0 ? preferred : tones;
}

const SKIN_TONE_IDS_BY_REGION = Object.freeze({
  "northern-europe": ["porcelain", "fair", "golden"],
  mediterranean: ["fair", "golden", "olive", "tan"],
  europe: ["porcelain", "fair", "golden", "olive"],
  "east-asia": ["fair", "golden", "olive", "tan"],
  "south-asia": ["olive", "tan", "brown", "deep-brown"],
  "indian-ocean": ["olive", "tan", "brown", "deep-brown"],
  africa: ["tan", "brown", "deep-brown", "ebony"],
  americas: ["golden", "olive", "tan", "brown"]
});

const HAIR_TONE_IDS_BY_REGION = Object.freeze({
  "northern-europe": ["black", "dark-brown", "chestnut", "golden-blond", "ash-blond", "silver"],
  mediterranean: ["black", "dark-brown", "chestnut", "auburn", "silver"],
  europe: ["black", "dark-brown", "chestnut", "auburn", "golden-blond", "ash-blond", "silver"],
  "east-asia": ["black", "dark-brown"],
  "south-asia": ["black", "dark-brown"],
  "indian-ocean": ["black", "dark-brown", "chestnut"],
  africa: ["black", "dark-brown"],
  americas: ["black", "dark-brown", "chestnut"]
});

function portraitRegionForCity(city) {
  if (city.cityType === "east-asian") return "east-asia";
  if (city.cityType === "south-asian" || city.cityType === "southeast-asian") return "south-asia";
  if (city.cityType === "sub-saharan") return "africa";
  if (city.cityType === "islamic-desert") return "indian-ocean";
  if (city.cityType === "northern-european") return "northern-europe";
  if (city.cityType === "mediterranean") return "mediterranean";
  if (city.cityType === "meso-american" || city.cityType === "andean") return "americas";
  if (Number.isFinite(city.lon) && city.lon < -25) return "americas";
  return "global";
}

function portraitRegionForNpcShip(ship) {
  const routeRegion = ship.currentPort?.routeRegion || ship.plan?.origin?.routeRegion;
  if (routeRegion === "east-asia") return "east-asia";
  if (routeRegion === "south-asia" || routeRegion === "southeast-asia") return "south-asia";
  if (routeRegion === "indian-ocean") return "indian-ocean";
  if (routeRegion === "africa") return "africa";
  if (routeRegion === "americas") return "americas";
  if (routeRegion === "europe") {
    return ship.profileId === "mediterranean" ? "mediterranean" : "northern-europe";
  }
  if (ship.profileId === "east-asia") return "east-asia";
  if (ship.profileId === "indian-ocean") return "indian-ocean";
  if (ship.profileId === "mediterranean") return "mediterranean";
  if (ship.profileId === "atlantic-coast") return "northern-europe";
  return "global";
}

export function characterExpression(character, expressionId = "neutral") {
  const exact = character?.expressions?.find((expression) => expression.id === expressionId);
  if (exact) return exact;
  const neutral = character?.expressions?.find((expression) => expression.id === "neutral");
  return neutral || character?.expressions?.[0] || null;
}

export function recolorPortraitImage(sourceImage, palette, roleMap) {
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
  applyPortraitPaletteSwap(image.data, canvas.width, canvas.height, palette, roleMap);
  ctx.putImageData(image, 0, 0);
  return canvas;
}

export function classifyPortraitRoles(data, width, height) {
  if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) {
    throw new Error(`Invalid portrait dimensions: ${width}x${height}`);
  }
  if (data.length !== width * height * 4) {
    throw new Error(`Portrait pixel buffer length does not match ${width}x${height}`);
  }
  const pixels = portraitPixelMetadata(data, width, height);
  const skinSamples = collectSkinSamples(pixels, width, height, false);
  if (skinSamples.length === 0) skinSamples.push(...collectSkinSamples(pixels, width, height, true));
  const skinMask = buildSkinMask(pixels, skinSamples);
  const hairGroup = dominantHairGroup(pixels, skinMask, width, height);
  const outfitGroups = dominantOutfitGroups(pixels, skinMask, width, height);
  const roles = new Uint8Array(width * height);

  for (const pixel of pixels) {
    if (!pixel.opaque || pixel.hsl.l < 0.08) continue;
    if (skinMask[pixel.index]) {
      roles[pixel.index] = PORTRAIT_ROLE_SKIN;
    } else if (pixelIsHair(pixel, hairGroup, width, height)) {
      roles[pixel.index] = PORTRAIT_ROLE_HAIR;
    } else if (pixelMayBeOutfit(pixel, width, height)) {
      const outfitRole = outfitRoleForPixel(pixel, outfitGroups);
      if (outfitRole === "cloth") roles[pixel.index] = PORTRAIT_ROLE_CLOTH;
      if (outfitRole === "accent") roles[pixel.index] = PORTRAIT_ROLE_ACCENT;
    }
  }
  return roles;
}

export function encodePortraitRoleMap(roles) {
  const packed = new Uint8Array(Math.ceil(roles.length / 2));
  for (let index = 0; index < roles.length; index++) {
    const role = roles[index];
    if (role < 0 || role > PORTRAIT_ROLE_ACCENT) {
      throw new Error(`Cannot encode portrait role ${role} at pixel ${index}`);
    }
    const shift = index % 2 === 0 ? 0 : 4;
    packed[Math.floor(index / 2)] |= role << shift;
  }
  let binary = "";
  for (const byte of packed) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function decodePortraitRoleMap(roleMap, pixelCount) {
  if (typeof roleMap !== "string" || roleMap.length === 0) {
    throw new Error("Portrait role map must be a non-empty base64 string");
  }
  const binary = atob(roleMap);
  if (binary.length !== Math.ceil(pixelCount / 2)) {
    throw new Error(`Portrait role map has ${binary.length} bytes; expected ${Math.ceil(pixelCount / 2)}`);
  }
  const roles = new Uint8Array(pixelCount);
  for (let index = 0; index < pixelCount; index++) {
    const byte = binary.charCodeAt(Math.floor(index / 2));
    roles[index] = index % 2 === 0 ? byte & 0x0f : byte >> 4;
  }
  return roles;
}

export function validatePortraitRoleMap(roleMap, width, height, label = "portrait") {
  const pixelCount = width * height;
  const roles = decodePortraitRoleMap(roleMap, pixelCount);
  for (let index = 0; index < roles.length; index++) {
    const role = roles[index];
    if (![PORTRAIT_ROLE_SKIN, PORTRAIT_ROLE_HAIR, PORTRAIT_ROLE_CLOTH, PORTRAIT_ROLE_ACCENT].includes(role)) {
      if (role !== 0) throw new Error(`${label} has an unknown portrait role ${role} at pixel ${index}`);
    }
  }
}

export function applyPortraitPaletteSwap(data, width, height, palette, roleMap) {
  if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) {
    throw new Error(`Invalid portrait dimensions: ${width}x${height}`);
  }
  if (data.length !== width * height * 4) {
    throw new Error(`Portrait pixel buffer length does not match ${width}x${height}`);
  }
  const roles = decodePortraitRoleMap(roleMap, width * height);
  const ramps = new Map([
    [PORTRAIT_ROLE_SKIN, palette.skinRamp.map(hexToRgb)],
    [PORTRAIT_ROLE_HAIR, palette.hairRamp.map(hexToRgb)],
    [PORTRAIT_ROLE_CLOTH, palette.clothRamp.map(hexToRgb)],
    [PORTRAIT_ROLE_ACCENT, palette.accentRamp.map(hexToRgb)]
  ]);

  for (let pixel = 0; pixel < roles.length; pixel++) {
    const ramp = ramps.get(roles[pixel]);
    if (!ramp) continue;
    const offset = pixel * 4;
    const hsl = rgbToHsl(data[offset], data[offset + 1], data[offset + 2]);
    const next = rampColor(ramp, hsl.l);
    data[offset] = next.r;
    data[offset + 1] = next.g;
    data[offset + 2] = next.b;
  }
}

function portraitPixelMetadata(data, width, height) {
  const pixels = new Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = x + y * width;
      const offset = index * 4;
      const r = data[offset];
      const g = data[offset + 1];
      const b = data[offset + 2];
      pixels[index] = {
        index,
        offset,
        x,
        y,
        r,
        g,
        b,
        opaque: data[offset + 3] > 0,
        hsl: rgbToHsl(r, g, b)
      };
    }
  }
  return pixels;
}

function collectSkinSamples(pixels, width, height, relaxed) {
  const centerX = width * 0.5;
  const centerY = height * (relaxed ? 0.42 : 0.43);
  const radiusX = width * (relaxed ? 0.2 : 0.13);
  const radiusY = height * (relaxed ? 0.22 : 0.14);
  const samples = [];
  for (const pixel of pixels) {
    if (!pixel.opaque || !isPlausibleSkinColor(pixel)) continue;
    const dx = (pixel.x - centerX) / radiusX;
    const dy = (pixel.y - centerY) / radiusY;
    if (dx * dx + dy * dy > 1) continue;
    samples.push(pixel);
  }
  return samples;
}

function isPlausibleSkinColor(pixel) {
  const { r, g, b, hsl } = pixel;
  const warmHue = hsl.h <= 52 || hsl.h >= 348;
  return warmHue
    && hsl.s >= 0.1
    && hsl.l >= 0.12
    && hsl.l <= 0.96
    && r >= g * 0.9
    && g >= b * 0.78
    && r - b >= 8;
}

function buildSkinMask(pixels, samples) {
  const mask = new Uint8Array(pixels.length);
  if (samples.length === 0) return mask;
  const uniqueSamples = deduplicateRgbSamples(samples);
  for (const pixel of pixels) {
    if (!pixel.opaque || !isPlausibleSkinColor(pixel)) continue;
    if (minimumRgbDistance(pixel, uniqueSamples) <= 24) mask[pixel.index] = 1;
  }
  return mask;
}

function deduplicateRgbSamples(samples) {
  const unique = new Map();
  for (const sample of samples) unique.set(`${sample.r},${sample.g},${sample.b}`, sample);
  return [...unique.values()];
}

function minimumRgbDistance(pixel, samples) {
  let best = Infinity;
  for (const sample of samples) {
    const dr = pixel.r - sample.r;
    const dg = pixel.g - sample.g;
    const db = pixel.b - sample.b;
    best = Math.min(best, Math.sqrt(dr * dr + dg * dg + db * db));
  }
  return best;
}

function dominantOutfitGroups(pixels, skinMask, width, height) {
  const counts = new Map();
  const minY = height * 0.62;
  const minX = width * 0.12;
  const maxX = width * 0.88;
  for (const pixel of pixels) {
    if (!pixel.opaque || skinMask[pixel.index] || pixel.hsl.l < 0.1) continue;
    if (pixel.y < minY || pixel.x < minX || pixel.x > maxX) continue;
    const group = outfitColorGroup(pixel.hsl);
    counts.set(group, (counts.get(group) || 0) + 1);
  }
  const ranked = [...counts.entries()]
    .filter(([, count]) => count >= 4)
    .sort((a, b) => b[1] - a[1]);
  return new Map(ranked.map(([group], index) => [group, index % 2 === 0 ? "cloth" : "accent"]));
}

function dominantHairGroup(pixels, skinMask, width, height) {
  const counts = new Map();
  for (const pixel of pixels) {
    if (!pixel.opaque || skinMask[pixel.index] || pixel.hsl.l < 0.1) continue;
    if (pixel.y > height * 0.68 || pixel.x < width * 0.08 || pixel.x > width * 0.92) continue;
    if (!pixelNearMask(pixel, skinMask, width, height, 3)) continue;
    const group = outfitColorGroup(pixel.hsl);
    counts.set(group, (counts.get(group) || 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || null;
}

function pixelNearMask(pixel, mask, width, height, radius) {
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (Math.abs(dx) + Math.abs(dy) > radius) continue;
      const x = pixel.x + dx;
      const y = pixel.y + dy;
      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      if (mask[x + y * width]) return true;
    }
  }
  return false;
}

function pixelIsHair(pixel, hairGroup, width, height) {
  if (!hairGroup || outfitColorGroup(pixel.hsl) !== hairGroup || pixel.hsl.l < 0.1) return false;
  return pixel.y < height * 0.68 || pixel.x < width * 0.28 || pixel.x > width * 0.72;
}

function outfitColorGroup(hsl) {
  if (hsl.s < 0.14) {
    if (hsl.l < 0.32) return "neutral-dark";
    if (hsl.l < 0.68) return "neutral-mid";
    return "neutral-light";
  }
  return `hue-${Math.floor(((hsl.h + 15) % 360) / 30)}`;
}

function outfitRoleForPixel(pixel, groups) {
  return groups.get(outfitColorGroup(pixel.hsl)) || null;
}

function pixelMayBeOutfit(pixel, width, height) {
  if (pixel.y >= height * 0.48) return true;
  if (pixel.y < height * 0.2) return true;
  return pixel.x < width * 0.24 || pixel.x > width * 0.76;
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
