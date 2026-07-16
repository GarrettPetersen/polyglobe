import { assignRegionalCharacterName } from "./characterNames.js";
import { portPersonalityForKey } from "./portDialoguePersonality.js";

export const CHARACTER_PORTRAIT_ASSET_VERSION = "portrait-authored-sprites-9";
export const CHARACTER_PORTRAIT_MANIFEST_URL = `assets/characters/generated/character-portraits.json?v=${CHARACTER_PORTRAIT_ASSET_VERSION}`;

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
  const characterIds = new Set();
  for (const character of manifest.sourceCharacters) {
    assertSlug(character.id, "character id");
    if (characterIds.has(character.id)) throw new Error(`Duplicate source character id: ${character.id}`);
    characterIds.add(character.id);
    if (typeof character.label !== "string" || character.label.trim() === "") {
      throw new Error(`Source character ${character.id} is missing a label`);
    }
    if (character.sex !== "female" && character.sex !== "male") {
      throw new Error(`Source character ${character.id} has invalid sex: ${character.sex}`);
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
      if (typeof expression.src !== "string" || !expression.src.startsWith("assets/characters/")) {
        throw new Error(`Expression ${character.id}.${expression.id} has invalid src: ${expression.src}`);
      }
      if (expression.width !== 64 || expression.height !== 64) {
        throw new Error(`Expression ${character.id}.${expression.id} must be a native 64x64 sprite`);
      }
    }
  }
}

function assertSlug(value, label) {
  if (typeof value !== "string" || !/^[a-z0-9][a-z0-9-]*$/.test(value)) {
    throw new Error(`Invalid ${label}: ${value}`);
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
    const character = assignCharacterSprite(key, region, sourcePool, used);
    assignments.set(city.tileId, {
      ...character,
      ...assignRegionalCharacterName({
        identityKey: key,
        city,
        sex: character.sex,
        usedNames
      }),
      cityKey: key,
      role: "factor",
      personalityId: portPersonalityForKey(key)
    });
  }
  return assignments;
}

export function assignPortCityCharacterFromSource(city, sourceId, manifest, usedNames) {
  validateCharacterPortraitManifest(manifest);
  assertUsedNames(usedNames);
  if (!city || typeof city !== "object") throw new Error("Fixed port character requires a city");
  const source = manifest.sourceCharacters.find((entry) => entry.id === sourceId);
  if (!source) throw new Error(`Missing fixed port portrait source: ${sourceId}`);
  const key = stableCityKey(city);
  const region = portraitRegionForCity(city);
  const character = assignCharacterSprite(key, region, [source], new Set());
  return {
    ...character,
    ...assignRegionalCharacterName({
      identityKey: key,
      city,
      sex: character.sex,
      usedNames
    }),
    cityKey: key,
    role: "factor",
    personalityId: portPersonalityForKey(key)
  };
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
  for (const ship of [...npcShips].sort((a, b) => a.id.localeCompare(b.id))) {
    const region = portraitRegionForNpcShip(ship);
    const sourcePool = ship.role === "pirate"
      ? piratePool
      : characterSourcesForRole(manifest, "captain", region, { excludePirates: true });
    const identityKey = `captain|${ship.id}`;
    const character = assignCharacterSprite(identityKey, region, sourcePool, used);
    assignments.set(ship.id, {
      ...character,
      ...assignRegionalCharacterName({
        identityKey,
        ship,
        sex: character.sex,
        usedNames
      }),
      npcShipId: ship.id,
      role: "captain"
    });
  }
  return assignments;
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
  const region = portraitRegionForCity(homePort);
  const sourcePool = characterSourcesForRole(manifest, "captain", region, { excludePirates: true });
  const character = assignCharacterSprite(`player|${identityKey}`, region, sourcePool, new Set());
  const name = assignRegionalCharacterName({
    identityKey: `player|${identityKey}`,
    city: homePort,
    sex: character.sex,
    usedNames
  });
  return Object.freeze({
    ...character,
    ...name,
    role: "player-captain",
    homePortTileId: homePort.tileId,
    homePortName: homePort.displayCity || homePort.city
  });
}

export function generateCampaignContactCharacter({
  playerCharacter,
  homePort,
  goalType,
  excludedSourceId,
  manifest,
  usedNames
}) {
  validateCharacterPortraitManifest(manifest);
  assertUsedNames(usedNames);
  if (!playerCharacter?.id) throw new Error("Campaign contact generation requires a player character");
  if (!homePort || typeof homePort !== "object") {
    throw new Error("Campaign contact generation requires a home port");
  }
  if (!["explorer", "family-debt"].includes(goalType)) {
    throw new Error(`Unknown campaign contact goal type: ${goalType}`);
  }
  if (typeof excludedSourceId !== "string" || excludedSourceId === "") {
    throw new Error("Campaign contact generation requires the home factor portrait source");
  }
  return generateSpecialPortCharacter({
    identityKey: `campaign-contact|${goalType}|${playerCharacter.id}|${homePort.tileId}`,
    port: homePort,
    excludedSourceIds: [excludedSourceId],
    role: goalType === "explorer" ? "patron" : "creditor",
    manifest,
    usedNames
  });
}

export function generateSpecialPortCharacter({
  identityKey,
  port,
  excludedSourceIds = [],
  role,
  manifest,
  usedNames
}) {
  validateCharacterPortraitManifest(manifest);
  assertUsedNames(usedNames);
  if (typeof identityKey !== "string" || identityKey.trim() === "") {
    throw new Error("Special port character generation requires an identity key");
  }
  if (!port || typeof port !== "object") {
    throw new Error("Special port character generation requires a port");
  }
  if (!Array.isArray(excludedSourceIds) || excludedSourceIds.some((id) => typeof id !== "string" || id === "")) {
    throw new Error("Special port character exclusions must be portrait source ids");
  }
  if (typeof role !== "string" || role.trim() === "") {
    throw new Error("Special port character generation requires a role");
  }
  const excluded = new Set(excludedSourceIds);
  const region = portraitRegionForCity(port);
  const sourcePool = characterSourcesForRole(manifest, "factor", region)
    .filter((source) => !excluded.has(source.id));
  if (sourcePool.length === 0) {
    throw new Error(`Special character has no distinct portrait at ${port.displayCity || port.city}`);
  }
  const character = assignCharacterSprite(identityKey, region, sourcePool, new Set());
  return Object.freeze({
    ...character,
    ...assignRegionalCharacterName({
      identityKey,
      city: port,
      sex: character.sex,
      usedNames
    }),
    role,
    homePortTileId: port.tileId
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
  const character = assignCharacterSprite(key, region, sourcePool, new Set());
  const name = assignRegionalCharacterName({
    identityKey: key,
    city: namePort,
    sex: character.sex,
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

function assignCharacterSprite(key, region, sourcePool, used) {
  if (sourcePool.length === 0) throw new Error(`No character portrait sources available for ${key}`);
  const startSourceIndex = hashString32(`${key}|source`) % sourcePool.length;
  let source = null;
  for (let attempt = 0; attempt < sourcePool.length; attempt++) {
    const candidate = sourcePool[(startSourceIndex + attempt) % sourcePool.length];
    if (used.has(candidate.id)) continue;
    source = candidate;
    used.add(candidate.id);
    break;
  }
  source ||= sourcePool[startSourceIndex];
  const identitySuffix = hashString32(key).toString(16).padStart(8, "0");
  return assignedCharacter(`${source.id}-${identitySuffix}`, region, source, ageForSource(key, source));
}

function ageForSource(key, source) {
  const span = source.maxAge - source.minAge + 1;
  return source.minAge + hashString32(`${key}|${source.id}|age`) % span;
}

function assignedCharacter(id, region, source, age) {
  return {
    id,
    region,
    sourceId: source.id,
    sourceLabel: source.label,
    sex: source.sex,
    sourceRoles: source.roles,
    sourceRegions: source.regions,
    minAge: source.minAge,
    maxAge: source.maxAge,
    age,
    expressions: source.expressions.map((expression) => ({
      id: expression.id,
      label: expression.label,
      src: expression.src,
      width: expression.width,
      height: expression.height
    }))
  };
}

function characterSourcesForRole(manifest, role, region, { excludePirates = false } = {}) {
  const regional = manifest.sourceCharacters.filter((source) => (
    source.roles.includes(role)
      && source.regions.includes(region)
      && (!excludePirates || !source.roles.includes("pirate"))
  ));
  if (regional.length === 0) {
    throw new Error(`Character portrait manifest has no ${region} sources for role ${role}`);
  }
  return regional;
}

function portraitRegionForCity(city) {
  if (city.cityType === "east-asian") return "east-asia";
  if (city.cityType === "south-asian") return "south-asia";
  if (city.cityType === "southeast-asian") return "southeast-asia";
  if (city.cityType === "sub-saharan") return "africa";
  if (city.cityType === "polynesian") return "polynesia";
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
  if (routeRegion === "south-asia") return "south-asia";
  if (routeRegion === "southeast-asia") return "southeast-asia";
  if (routeRegion === "indian-ocean") return "indian-ocean";
  if (routeRegion === "africa") return "africa";
  if (routeRegion === "polynesia") return "polynesia";
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
