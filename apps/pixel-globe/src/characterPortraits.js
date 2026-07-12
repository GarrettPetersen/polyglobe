import { assignRegionalCharacterName } from "./characterNames.js";
import { portPersonalityForKey } from "./portDialoguePersonality.js";

export const CHARACTER_PORTRAIT_ASSET_VERSION = "portrait-semantic-palette-4";
export const CHARACTER_PORTRAIT_MANIFEST_URL = `/assets/characters/generated/character-portraits.json?v=${CHARACTER_PORTRAIT_ASSET_VERSION}`;
export const PORTRAIT_ROLE_SKIN = 1;
export const PORTRAIT_ROLE_HAIR = 2;
export const PORTRAIT_ROLE_CLOTH = 3;
export const PORTRAIT_ROLE_ACCENT = 4;
export const PORTRAIT_ROLE_EYE = 5;

const EXPRESSION_FALLBACK_IDS = Object.freeze({
  angry: Object.freeze(["stern", "shouting", "annoyed", "determined"]),
  afraid: Object.freeze(["worried", "surprised", "concerned", "wary"]),
  happy: Object.freeze(["laughing", "pleased", "smile", "soft-smile"]),
  sad: Object.freeze(["worried", "concerned", "pained", "hurt", "weary"]),
  concerned: Object.freeze(["worried", "wary", "afraid", "sad", "serious"]),
  wary: Object.freeze(["concerned", "skeptical", "stern", "serious", "afraid"]),
  stern: Object.freeze(["serious", "determined", "skeptical", "angry"]),
  attentive: Object.freeze(["thoughtful", "knowing", "serious"]),
  pleased: Object.freeze(["happy", "soft-smile", "smile", "laughing"]),
  thoughtful: Object.freeze(["attentive", "knowing", "skeptical"])
});

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
  if (!Array.isArray(manifest.eyeTones) || manifest.eyeTones.length === 0) {
    throw new Error("Character portrait manifest has no eye tones");
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
    validateAgeRange(character.minAge, character.maxAge, character.id);
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

  const eyeToneIds = new Set();
  for (const eyeTone of manifest.eyeTones) {
    assertSlug(eyeTone.id, "eye tone id");
    if (eyeToneIds.has(eyeTone.id)) throw new Error(`Duplicate eye tone id: ${eyeTone.id}`);
    eyeToneIds.add(eyeTone.id);
    validateRamp(eyeTone.ramp, `${eyeTone.id}.ramp`);
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

function validateAgeRange(minAge, maxAge, label) {
  if (!Number.isInteger(minAge) || !Number.isInteger(maxAge) || minAge < 5 || maxAge > 90 || minAge > maxAge) {
    throw new Error(`${label} has invalid portrait age range: ${minAge}-${maxAge}`);
  }
}

export function assignPortCityCharacters(portCities, manifest, usedNames) {
  validateCharacterPortraitManifest(manifest);
  assertUsedNames(usedNames);
  const cities = [...portCities].sort((a, b) => stableCityKey(a).localeCompare(stableCityKey(b)));
  const assignments = new Map();
  const used = new Set();
  for (const city of cities) {
    const key = stableCityKey(city);
    const region = portraitRegionForCity(city);
    const sourcePool = characterSourcesForRole(manifest, "factor", region);
    const character = assignCharacterVariant(key, region, sourcePool, manifest, used);
    assignments.set(city.tileId, {
      ...character,
      ...assignRegionalCharacterName({
        identityKey: key,
        city,
        sourceId: character.sourceId,
        sourceLabel: character.sourceLabel,
        usedNames
      }),
      cityKey: key,
      role: "factor",
      personalityId: portPersonalityForKey(key)
    });
  }
  return assignments;
}

export function assignNpcShipCaptains(npcShips, manifest, usedNames) {
  validateCharacterPortraitManifest(manifest);
  assertUsedNames(usedNames);
  const assignments = new Map();
  const used = new Set();
  const piratePool = manifest.sourceCharacters.filter((source) => (
    source.roles.includes("captain") && source.roles.includes("pirate")
  ));
  if (piratePool.length === 0) throw new Error("Character portrait manifest has no pirate captains");
  const nonPirateCaptainPool = manifest.sourceCharacters.filter((source) => (
    source.roles.includes("captain") && !source.roles.includes("pirate")
  ));
  if (nonPirateCaptainPool.length === 0) throw new Error("Character portrait manifest has no non-pirate captains");

  for (const ship of [...npcShips].sort((a, b) => a.id.localeCompare(b.id))) {
    const region = portraitRegionForNpcShip(ship);
    const regionalPool = manifest.sourceCharacters.filter((source) => (
      source.roles.includes("captain") && !source.roles.includes("pirate") && source.regions.includes(region)
    ));
    const sourcePool = ship.role === "pirate"
      ? piratePool
      : regionalPool.length > 0
        ? regionalPool
        : nonPirateCaptainPool;
    const identityKey = `captain|${ship.id}`;
    const character = assignCharacterVariant(identityKey, region, sourcePool, manifest, used);
    assignments.set(ship.id, {
      ...character,
      ...assignRegionalCharacterName({
        identityKey,
        ship,
        sourceId: character.sourceId,
        sourceLabel: character.sourceLabel,
        usedNames
      }),
      npcShipId: ship.id,
      role: "captain"
    });
  }
  return assignments;
}

export function playerCharacterPortraitSummary(manifest) {
  validateCharacterPortraitManifest(manifest);
  const multipleExpressions = manifest.sourceCharacters.filter((source) => source.expressions.length > 1);
  const eligibleCaptains = multipleExpressions.filter((source) => source.roles.includes("captain"));
  return Object.freeze({
    total: manifest.sourceCharacters.length,
    multipleExpressions: multipleExpressions.length,
    eligibleCaptains: eligibleCaptains.length
  });
}

export function generatePlayerCharacter({ identityKey, homePort, manifest, usedNames }) {
  validateCharacterPortraitManifest(manifest);
  assertUsedNames(usedNames);
  if (typeof identityKey !== "string" || identityKey.trim() === "") {
    throw new Error("Player character generation requires an identity key");
  }
  if (!homePort || typeof homePort !== "object") {
    throw new Error("Player character generation requires a home port");
  }
  const sourcePool = manifest.sourceCharacters.filter((source) => (
    source.roles.includes("captain") && source.expressions.length > 1
  ));
  if (sourcePool.length === 0) {
    throw new Error("Character portrait manifest has no multi-expression player captains");
  }
  const region = portraitRegionForCity(homePort);
  const character = assignCharacterVariant(`player|${identityKey}`, region, sourcePool, manifest, new Set());
  const name = assignRegionalCharacterName({
    identityKey: `player|${identityKey}`,
    city: homePort,
    sourceId: character.sourceId,
    sourceLabel: character.sourceLabel,
    usedNames
  });
  if (character.expressions.length < 2) {
    throw new Error(`Generated player character ${character.id} does not have multiple expressions`);
  }
  return Object.freeze({
    ...character,
    ...name,
    role: "player-captain",
    homePortTileId: homePort.tileId,
    homePortName: homePort.displayCity || homePort.city
  });
}

export function generatePassengerCharacter({
  identityKey,
  originPort,
  destinationPort,
  scenarioId = "",
  namePortPreference = "origin",
  manifest,
  usedNames
}) {
  validateCharacterPortraitManifest(manifest);
  assertUsedNames(usedNames);
  if (typeof identityKey !== "string" || identityKey.trim() === "") {
    throw new Error("Passenger character generation requires an identity key");
  }
  if (!originPort || typeof originPort !== "object") {
    throw new Error("Passenger character generation requires an origin port");
  }
  if (!destinationPort || typeof destinationPort !== "object") {
    throw new Error("Passenger character generation requires a destination port");
  }
  const namePort = namePortPreference === "destination" ? destinationPort : originPort;
  const regionPort = scenarioId === "return-home" ? destinationPort : namePort;
  const region = portraitRegionForCity(regionPort);
  const sourcePool = characterSourcesForRole(manifest, "factor", region);
  const key = `passenger|${identityKey}`;
  const character = assignCharacterVariant(key, region, sourcePool, manifest, new Set());
  const name = assignRegionalCharacterName({
    identityKey: key,
    city: namePort,
    sourceId: character.sourceId,
    sourceLabel: character.sourceLabel,
    usedNames
  });
  return Object.freeze({
    ...character,
    ...name,
    role: "passenger",
    originPortTileId: originPort.tileId,
    destinationPortTileId: destinationPort.tileId
  });
}

function assertUsedNames(usedNames) {
  if (!(usedNames instanceof Set)) throw new Error("Character assignment requires a shared used-name Set");
}

function assignCharacterVariant(key, region, sourcePool, manifest, used) {
  if (sourcePool.length === 0) throw new Error(`No character portrait sources available for ${key}`);
  const skinTones = tonesForRegion(manifest.skinTones, SKIN_TONE_IDS_BY_REGION[region]);
  const regionalHairTones = tonesForRegion(manifest.hairTones, HAIR_TONE_IDS_BY_REGION[region]);
  const eyeTones = tonesForRegion(manifest.eyeTones, EYE_TONE_IDS_BY_REGION[region]);
  const sourceStyles = sourcePool.map((source) => {
    const age = ageForSource(key, source);
    const hairTones = hairTonesForAge(regionalHairTones, age);
    return {
      source,
      age,
      hairTones,
      count: skinTones.length * hairTones.length * eyeTones.length * manifest.outfitPalettes.length
    };
  });
  const startSourceIndex = hashString32(`${key}|source`) % sourceStyles.length;
  for (let sourceAttempt = 0; sourceAttempt < sourceStyles.length; sourceAttempt++) {
    const entry = sourceStyles[(startSourceIndex + sourceAttempt) % sourceStyles.length];
    const { source, age, hairTones } = entry;
    let styleIndex = hashString32(`${key}|${source.id}|style`) % entry.count;
    for (let styleAttempt = 0; styleAttempt < entry.count; styleAttempt++) {
      const skinToneIndex = styleIndex % skinTones.length;
      const hairEyeAndOutfitIndex = Math.floor(styleIndex / skinTones.length);
      const hairToneIndex = hairEyeAndOutfitIndex % hairTones.length;
      const eyeAndOutfitIndex = Math.floor(hairEyeAndOutfitIndex / hairTones.length);
      const eyeToneIndex = eyeAndOutfitIndex % eyeTones.length;
      const outfitIndex = Math.floor(eyeAndOutfitIndex / eyeTones.length);
      const skinTone = skinTones[skinToneIndex];
      const hairTone = hairTones[hairToneIndex];
      const eyeTone = eyeTones[eyeToneIndex];
      const outfit = manifest.outfitPalettes[outfitIndex];
      const variantId = `${source.id}-${skinTone.id}-${hairTone.id}-${eyeTone.id}-${outfit.id}`;
      if (!used.has(variantId)) {
        used.add(variantId);
        return assignedCharacterVariant(variantId, region, source, skinTone, hairTone, eyeTone, outfit, age);
      }
      styleIndex = (styleIndex + 1) % entry.count;
    }
  }
  throw new Error(`Not enough unique character variants for ${key}`);
}

function hairTonesForAge(tones, age) {
  const ageAppropriate = tones.filter((tone) => tone.id !== "silver" || age >= 45);
  return ageAppropriate.length > 0 ? ageAppropriate : tones;
}

function ageForSource(key, source) {
  const span = source.maxAge - source.minAge + 1;
  return source.minAge + hashString32(`${key}|${source.id}|age`) % span;
}

function assignedCharacterVariant(id, region, source, skinTone, hairTone, eyeTone, outfit, age) {
  return assignedCharacter(id, region, source, skinTone, hairTone, eyeTone, outfit, age);
}

function assignedCharacter(id, region, source, skinTone, hairTone, eyeTone, outfit, age) {
  const palette = {
    skinRamp: skinTone.ramp,
    hairRamp: hairTone.ramp,
    eyeRamp: eyeTone.ramp,
    clothRamp: outfit.clothRamp,
    accentRamp: outfit.accentRamp
  };
  return {
    id,
    region,
    sourceId: source.id,
    sourceLabel: source.label,
    sourceRoles: source.roles,
    sourceRegions: source.regions,
    skinToneId: skinTone?.id || null,
    skinToneLabel: skinTone?.label || null,
    hairToneId: hairTone?.id || null,
    hairToneLabel: hairTone?.label || null,
    eyeToneId: eyeTone?.id || null,
    eyeToneLabel: eyeTone?.label || null,
    outfitId: outfit?.id || null,
    outfitLabel: outfit?.label || null,
    minAge: source.minAge,
    maxAge: source.maxAge,
    age,
    palette,
    paletteSwapped: true,
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
  "east-asia": ["black", "dark-brown", "silver"],
  "south-asia": ["black", "dark-brown", "silver"],
  "indian-ocean": ["black", "dark-brown", "chestnut", "silver"],
  africa: ["black", "dark-brown", "silver"],
  americas: ["black", "dark-brown", "chestnut", "silver"]
});

const EYE_TONE_IDS_BY_REGION = Object.freeze({
  "northern-europe": ["dark-brown", "brown", "hazel", "green", "gray", "blue"],
  mediterranean: ["dark-brown", "brown", "hazel", "green"],
  europe: ["dark-brown", "brown", "hazel", "green", "gray", "blue"],
  "east-asia": ["dark-brown", "brown"],
  "south-asia": ["dark-brown", "brown", "hazel"],
  "indian-ocean": ["dark-brown", "brown", "hazel"],
  africa: ["dark-brown", "brown"],
  americas: ["dark-brown", "brown"]
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
  for (const fallbackId of EXPRESSION_FALLBACK_IDS[expressionId] || []) {
    const fallback = character?.expressions?.find((expression) => expression.id === fallbackId);
    if (fallback) return fallback;
  }
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
  const skin = buildSkinAnalysis(pixels, skinSamples, width, height);
  const outfitGroups = dominantOutfitGroups(pixels, skin.mask, width, height);
  const hairMask = buildHairMask(pixels, skin.mask, skin.faceMask, outfitGroups, width, height);
  const faceBounds = maskBounds(skin.faceMask, width);
  const eyeMask = buildEyeMask(pixels, skin.mask, hairMask, skin.faceMask, width, height);
  const roles = new Uint8Array(width * height);

  for (const pixel of pixels) {
    if (!pixel.opaque || pixel.hsl.l < 0.12) continue;
    if (eyeMask[pixel.index]) {
      roles[pixel.index] = PORTRAIT_ROLE_EYE;
    } else if (skin.mask[pixel.index]) {
      roles[pixel.index] = PORTRAIT_ROLE_SKIN;
    } else if (hairMask[pixel.index]) {
      roles[pixel.index] = PORTRAIT_ROLE_HAIR;
    } else if (pixelMayBeOutfit(pixel, faceBounds, width, height)) {
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
    if (role < 0 || role > PORTRAIT_ROLE_EYE) {
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
    if (![PORTRAIT_ROLE_SKIN, PORTRAIT_ROLE_HAIR, PORTRAIT_ROLE_CLOTH, PORTRAIT_ROLE_ACCENT, PORTRAIT_ROLE_EYE].includes(role)) {
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
    [PORTRAIT_ROLE_EYE, palette.eyeRamp.map(hexToRgb)],
    [PORTRAIT_ROLE_CLOTH, palette.clothRamp.map(hexToRgb)],
    [PORTRAIT_ROLE_ACCENT, palette.accentRamp.map(hexToRgb)]
  ]);
  const strengths = new Map([
    [PORTRAIT_ROLE_SKIN, 0.82],
    [PORTRAIT_ROLE_HAIR, 0.76],
    [PORTRAIT_ROLE_EYE, 0.92],
    [PORTRAIT_ROLE_CLOTH, 0.72],
    [PORTRAIT_ROLE_ACCENT, 0.68]
  ]);

  for (let pixel = 0; pixel < roles.length; pixel++) {
    const role = roles[pixel];
    const ramp = ramps.get(role);
    if (!ramp) continue;
    const offset = pixel * 4;
    const hsl = rgbToHsl(data[offset], data[offset + 1], data[offset + 2]);
    const target = rampColor(ramp, hsl.l);
    const next = lerpRgb(
      { r: data[offset], g: data[offset + 1], b: data[offset + 2] },
      target,
      strengths.get(role)
    );
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
  const radiusX = width * (relaxed ? 0.18 : 0.09);
  const radiusY = height * (relaxed ? 0.2 : 0.11);
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

function buildSkinAnalysis(pixels, samples, width, height) {
  const empty = {
    mask: new Uint8Array(pixels.length),
    faceMask: new Uint8Array(pixels.length)
  };
  if (samples.length === 0) return empty;
  const sampleIndices = new Set(samples.map((sample) => sample.index));
  const faceSamples = deduplicateRgbSamples(samples);
  const candidateMask = new Uint8Array(pixels.length);
  for (const pixel of pixels) {
    if (!pixel.opaque || !isPlausibleSkinColor(pixel)) continue;
    if (minimumRgbDistance(pixel, faceSamples) <= 20) candidateMask[pixel.index] = 1;
  }

  const mask = new Uint8Array(pixels.length);
  const faceMask = new Uint8Array(pixels.length);
  const candidates = connectedMaskComponents(candidateMask, width, height);
  const primaryFace = candidates
    .map((component) => ({ component, score: faceComponentScore(component, sampleIndices, width, height) }))
    .sort((a, b) => b.score - a.score || b.component.length - a.component.length)[0]?.component || null;
  if (primaryFace) {
    for (const index of primaryFace) {
      mask[index] = 1;
      faceMask[index] = 1;
    }
  }
  for (const component of candidates) {
    if (component === primaryFace || !plausibleSecondarySkinComponent(component, width, height)) continue;
    for (const index of component) mask[index] = 1;
  }
  return { mask, faceMask };
}

function faceComponentScore(component, sampleIndices, width, height) {
  let sampleHits = 0;
  let centerHits = 0;
  for (const index of component) {
    const x = index % width;
    const y = Math.floor(index / width);
    if (sampleIndices.has(index)) sampleHits += 1;
    if (x >= width * 0.34 && x <= width * 0.66 && y >= height * 0.25 && y <= height * 0.57) {
      centerHits += 1;
    }
  }
  return sampleHits * 8 + centerHits * 3 - component.length * 0.04;
}

function plausibleSecondarySkinComponent(component, width, height) {
  if (component.length < 2 || component.length > width * height * 0.075) return false;
  const bounds = componentBounds(component, width);
  const centerX = (bounds.left + bounds.right) * 0.5;
  const centerY = (bounds.top + bounds.bottom) * 0.5;
  const sideLimb = centerY >= height * 0.38 && centerY <= height * 0.88
    && (centerX <= width * 0.38 || centerX >= width * 0.62);
  const neck = centerY >= height * 0.48 && centerY <= height * 0.68
    && centerX >= width * 0.36 && centerX <= width * 0.64
    && component.length <= width * height * 0.025;
  return sideLimb || neck;
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
    if (!pixel.opaque || skinMask[pixel.index] || pixel.hsl.l < 0.16) continue;
    if (pixel.y < minY || pixel.x < minX || pixel.x > maxX) continue;
    const group = outfitColorGroup(pixel.hsl);
    counts.set(group, (counts.get(group) || 0) + 1);
  }
  const ranked = [...counts.entries()]
    .filter(([, count]) => count >= 4)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2);
  return new Map(ranked.map(([group], index) => [group, index === 0 ? "cloth" : "accent"]));
}

function buildHairMask(pixels, skinMask, faceMask, outfitGroups, width, height) {
  const mask = new Uint8Array(pixels.length);
  const faceBounds = maskBounds(faceMask, width);
  if (!faceBounds) return mask;
  const counts = new Map();
  for (const pixel of pixels) {
    if (!pixel.opaque || skinMask[pixel.index] || pixel.hsl.l < 0.14) continue;
    if (!pixelInHairZone(pixel, faceBounds, width, height)) continue;
    if (!pixelNearMask(pixel, faceMask, width, height, 3)) continue;
    const group = outfitColorGroup(pixel.hsl);
    if (outfitGroups.has(group)) continue;
    counts.set(group, (counts.get(group) || 0) + (pixel.y <= faceBounds.top + faceBounds.height * 0.5 ? 2 : 1));
  }
  const hairGroup = [...counts.entries()]
    .filter(([, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  if (!hairGroup) return mask;

  const candidates = new Uint8Array(pixels.length);
  for (const pixel of pixels) {
    if (!pixel.opaque || skinMask[pixel.index] || pixel.hsl.l < 0.14) continue;
    if (!pixelInHairZone(pixel, faceBounds, width, height)) continue;
    if (outfitColorGroup(pixel.hsl) !== hairGroup) continue;
    if (pixelInsideLowerFace(pixel, faceBounds)) continue;
    candidates[pixel.index] = 1;
  }
  for (const component of connectedMaskComponents(candidates, width, height)) {
    const touchesFace = component.some((index) => pixelNearMask(pixels[index], faceMask, width, height, 3));
    if (!touchesFace) continue;
    for (const index of component) mask[index] = 1;
  }
  return mask;
}

function buildEyeMask(pixels, skinMask, hairMask, faceMask, width, height) {
  const mask = new Uint8Array(pixels.length);
  const faceBounds = maskBounds(faceMask, width);
  if (!faceBounds) return mask;
  const minY = faceBounds.top + faceBounds.height * 0.24;
  const maxY = faceBounds.top + faceBounds.height * 0.62;
  const candidates = new Uint8Array(pixels.length);
  for (const pixel of pixels) {
    if (!pixel.opaque || skinMask[pixel.index] || hairMask[pixel.index]) continue;
    if (pixel.x < faceBounds.left || pixel.x > faceBounds.right || pixel.y < minY || pixel.y > maxY) continue;
    if (pixel.hsl.l < 0.13 || pixel.hsl.l > 0.78 || pixel.hsl.s < 0.16) continue;
    if (!pixelNearMask(pixel, faceMask, width, height, 2)) continue;
    candidates[pixel.index] = 1;
  }

  const maxComponentWidth = Math.max(3, Math.ceil(faceBounds.width * 0.28));
  const maxComponentHeight = Math.max(3, Math.ceil(faceBounds.height * 0.34));
  const components = connectedMaskComponents(candidates, width, height)
    .filter((component) => component.length <= 12)
    .map((component) => ({ component, bounds: componentBounds(component, width) }))
    .filter(({ bounds }) => bounds.width <= maxComponentWidth && bounds.height <= maxComponentHeight);
  const centerX = (faceBounds.left + faceBounds.right) * 0.5;
  const left = components.filter(({ bounds }) => (bounds.left + bounds.right) * 0.5 < centerX);
  const right = components.filter(({ bounds }) => (bounds.left + bounds.right) * 0.5 > centerX);
  let best = null;
  for (const leftEye of left) {
    for (const rightEye of right) {
      const leftCenter = componentCenter(leftEye.bounds);
      const rightCenter = componentCenter(rightEye.bounds);
      const separation = rightCenter.x - leftCenter.x;
      if (separation < Math.max(2, faceBounds.width * 0.16) || separation > faceBounds.width * 0.82) continue;
      if (Math.abs(leftCenter.y - rightCenter.y) > Math.max(2, faceBounds.height * 0.16)) continue;
      const symmetry = Math.abs((centerX - leftCenter.x) - (rightCenter.x - centerX));
      const colorDistance = componentColorDistance(leftEye.component, rightEye.component, pixels);
      const sizeDifference = Math.abs(leftEye.component.length - rightEye.component.length);
      const score = Math.abs(leftCenter.y - rightCenter.y) * 12 + symmetry * 4 + colorDistance + sizeDifference * 5;
      if (!best || score < best.score) best = { leftEye, rightEye, score };
    }
  }
  const selected = best
    ? [best.leftEye, best.rightEye]
    : bestEyeComponentsBySide(left, right, faceBounds);
  for (const eye of selected) {
    for (const index of eye.component) mask[index] = 1;
  }
  return mask;
}

function bestEyeComponentsBySide(left, right, faceBounds) {
  const centerX = (faceBounds.left + faceBounds.right) * 0.5;
  const expectedY = faceBounds.top + faceBounds.height * 0.43;
  const expectedOffset = faceBounds.width * 0.23;
  const bestOnSide = (components, direction) => components
    .map((eye) => {
      const center = componentCenter(eye.bounds);
      const expectedX = centerX + expectedOffset * direction;
      return {
        eye,
        score: Math.abs(center.y - expectedY) * 10 + Math.abs(center.x - expectedX) * 4 + eye.component.length
      };
    })
    .sort((a, b) => a.score - b.score)[0]?.eye || null;
  return [bestOnSide(left, -1), bestOnSide(right, 1)].filter(Boolean);
}

function componentCenter(bounds) {
  return {
    x: (bounds.left + bounds.right) * 0.5,
    y: (bounds.top + bounds.bottom) * 0.5
  };
}

function componentColorDistance(a, b, pixels) {
  const left = averageComponentColor(a, pixels);
  const right = averageComponentColor(b, pixels);
  return Math.hypot(left.r - right.r, left.g - right.g, left.b - right.b);
}

function averageComponentColor(component, pixels) {
  const total = component.reduce((sum, index) => ({
    r: sum.r + pixels[index].r,
    g: sum.g + pixels[index].g,
    b: sum.b + pixels[index].b
  }), { r: 0, g: 0, b: 0 });
  return {
    r: total.r / component.length,
    g: total.g / component.length,
    b: total.b / component.length
  };
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

function pixelInHairZone(pixel, faceBounds, width, height) {
  const padX = Math.max(4, Math.round(faceBounds.width * 0.5));
  const minX = Math.max(width * 0.06, faceBounds.left - padX);
  const maxX = Math.min(width * 0.94, faceBounds.right + padX);
  const minY = Math.max(height * 0.08, faceBounds.top - Math.max(5, faceBounds.height * 0.55));
  const maxY = Math.min(height * 0.72, faceBounds.bottom + Math.max(5, faceBounds.height * 0.45));
  return pixel.x >= minX && pixel.x <= maxX && pixel.y >= minY && pixel.y <= maxY;
}

function pixelInsideLowerFace(pixel, faceBounds) {
  const insetX = Math.max(1, Math.floor(faceBounds.width * 0.16));
  return pixel.x > faceBounds.left + insetX
    && pixel.x < faceBounds.right - insetX
    && pixel.y > faceBounds.top + faceBounds.height * 0.38
    && pixel.y < faceBounds.bottom;
}

function outfitColorGroup(hsl) {
  if (hsl.s < 0.14) {
    if (hsl.l < 0.32) return "neutral-dark";
    if (hsl.l < 0.68) return "neutral-mid";
    return "neutral-light";
  }
  return `hue-${Math.floor(((hsl.h + 10) % 360) / 20)}`;
}

function outfitRoleForPixel(pixel, groups) {
  return groups.get(outfitColorGroup(pixel.hsl)) || null;
}

function pixelMayBeOutfit(pixel, faceBounds, width, height) {
  if (pixel.y >= height * 0.52) return true;
  if (!faceBounds) return pixel.y >= height * 0.48;
  const aboveFace = pixel.y <= faceBounds.top + Math.max(2, faceBounds.height * 0.12)
    && pixel.x >= faceBounds.left - 8
    && pixel.x <= faceBounds.right + 8;
  const besideFace = pixel.y <= faceBounds.bottom + 4
    && (pixel.x < faceBounds.left - 2 || pixel.x > faceBounds.right + 2);
  return aboveFace || besideFace;
}

function connectedMaskComponents(mask, width, height) {
  const visited = new Uint8Array(mask.length);
  const components = [];
  const neighbors = [
    [-1, -1], [0, -1], [1, -1],
    [-1, 0], [1, 0],
    [-1, 1], [0, 1], [1, 1]
  ];
  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || visited[start]) continue;
    const component = [];
    const queue = [start];
    visited[start] = 1;
    for (let cursor = 0; cursor < queue.length; cursor++) {
      const index = queue[cursor];
      component.push(index);
      const x = index % width;
      const y = Math.floor(index / width);
      for (const [dx, dy] of neighbors) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
        const next = nx + ny * width;
        if (!mask[next] || visited[next]) continue;
        visited[next] = 1;
        queue.push(next);
      }
    }
    components.push(component);
  }
  return components;
}

function componentBounds(component, width) {
  let left = Infinity;
  let right = -Infinity;
  let top = Infinity;
  let bottom = -Infinity;
  for (const index of component) {
    const x = index % width;
    const y = Math.floor(index / width);
    left = Math.min(left, x);
    right = Math.max(right, x);
    top = Math.min(top, y);
    bottom = Math.max(bottom, y);
  }
  return { left, right, top, bottom, width: right - left + 1, height: bottom - top + 1 };
}

function maskBounds(mask, width) {
  const indices = [];
  for (let index = 0; index < mask.length; index++) {
    if (mask[index]) indices.push(index);
  }
  return indices.length > 0 ? componentBounds(indices, width) : null;
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
