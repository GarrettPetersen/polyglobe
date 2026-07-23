import {
  assignRegionalCharacterName,
  assignRegionalFamilyMemberName
} from "./characterNames.js";
import { characterWithBiography } from "./characterBiography.js";
import { characterSkillIdsForIdentity } from "./characterSkills.js";
import { NEUTRAL_FACTION_ID, factionById } from "./factions.js";
import { portPersonalityForKey } from "./portDialoguePersonality.js";

export const CHARACTER_PORTRAIT_ASSET_VERSION = "portrait-authored-sprites-11";
export const CHARACTER_PORTRAIT_MANIFEST_URL = `assets/characters/generated/character-portraits.json?v=${CHARACTER_PORTRAIT_ASSET_VERSION}`;

const EXPRESSION_FALLBACK_IDS = Object.freeze({
  angry: Object.freeze(["stern", "shouting", "annoyed", "determined"]),
  afraid: Object.freeze(["worried", "surprised", "concerned", "wary"]),
  happy: Object.freeze(["laughing", "pleased", "smile", "soft-smile"]),
  overjoyed: Object.freeze(["laughing", "happy", "pleased", "smile", "soft-smile"]),
  sad: Object.freeze(["worried", "concerned", "pained", "hurt", "weary"]),
  crying: Object.freeze(["sad", "worried", "pained", "hurt", "concerned"]),
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

export function reconcileCharacterPortraitSexes(root, manifest) {
  if (!root || typeof root !== "object") {
    throw new Error("Portrait sex reconciliation requires an object graph");
  }
  validateCharacterPortraitManifest(manifest);
  const sourceSexById = new Map(
    manifest.sourceCharacters.map((character) => [character.id, character.sex])
  );
  const visited = new WeakSet();
  let correctedCount = 0;

  function visit(value) {
    if (!value || typeof value !== "object" || ArrayBuffer.isView(value) || visited.has(value)) return;
    visited.add(value);
    if (typeof value.sourceId === "string" && (value.sex === "female" || value.sex === "male")) {
      const reviewedSex = sourceSexById.get(value.sourceId);
      if (!reviewedSex) {
        throw new Error("Character uses an unknown portrait source: " + value.sourceId);
      }
      if (value.sex !== reviewedSex) {
        if (Object.isFrozen(value)) {
          throw new Error("Cannot reconcile frozen character portrait metadata: " + value.sourceId);
        }
        value.sex = reviewedSex;
        correctedCount += 1;
      }
    }
    if (Array.isArray(value) && value.length > 0 && typeof value[0] !== "object") return;
    for (const child of Object.values(value)) visit(child);
  }

  visit(root);
  return correctedCount;
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

export function assignPortCityCharacters(
  portCities,
  manifest,
  usedNames,
  { excludedSourceIds = [] } = {}
) {
  validateCharacterPortraitManifest(manifest);
  assertUsedNames(usedNames);
  const cities = [...portCities].sort((a, b) => stableCityKey(a).localeCompare(stableCityKey(b)));
  const assignments = new Map();
  const used = new Set();
  for (const city of cities) {
    const key = stableCityKey(city);
    const region = portraitRegionForCity(city);
    const sourcePool = characterSourcesForRole(manifest, "factor", region, { excludedSourceIds });
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

export function assignPortCityCharacterFromSource(
  city,
  sourceId,
  manifest,
  usedNames,
  { excludedSourceIds = [] } = {}
) {
  validateCharacterPortraitManifest(manifest);
  assertUsedNames(usedNames);
  if (!city || typeof city !== "object") throw new Error("Fixed port character requires a city");
  if (sourceIdExclusionSet(excludedSourceIds).has(sourceId)) {
    throw new Error(`Fixed port portrait source is reserved: ${sourceId}`);
  }
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

export function assignNpcShipCaptains(
  npcShips,
  manifest,
  usedNames,
  { excludedSourceIds = [] } = {}
) {
  validateCharacterPortraitManifest(manifest);
  assertUsedNames(usedNames);
  const assignments = new Map();
  const used = new Set();
  const excluded = sourceIdExclusionSet(excludedSourceIds);
  const piratePool = manifest.sourceCharacters.filter((source) => (
    source.roles.includes("captain") && source.roles.includes("pirate") &&
    !excluded.has(source.id)
  ));
  if (piratePool.length === 0) throw new Error("Character portrait manifest has no pirate captains");
  for (const ship of [...npcShips].sort((a, b) => a.id.localeCompare(b.id))) {
    const region = portraitRegionForNpcShip(ship);
    const sourcePool = ship.role === "pirate"
      ? piratePool
      : characterSourcesForRole(manifest, "captain", region, {
        excludePirates: true,
        excludedSourceIds
      });
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

export function assignMissingNpcShipCaptains(
  npcShips,
  assignments,
  manifest,
  usedNames,
  options = {}
) {
  if (!(assignments instanceof Map)) throw new Error("NPC captain reconciliation requires an assignment Map");
  const missingShips = [...npcShips].filter((ship) => !assignments.has(ship.id));
  if (missingShips.length === 0) return new Map();
  const additions = assignNpcShipCaptains(missingShips, manifest, usedNames, options);
  for (const [shipId, captain] of additions) assignments.set(shipId, captain);
  return additions;
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
  const sourcePool = characterSourcesForPlayer(manifest, region);
  const character = assignCharacterSprite(`player|${identityKey}`, region, sourcePool, new Set());
  const name = assignRegionalCharacterName({
    identityKey: `player|${identityKey}`,
    city: homePort,
    sex: character.sex,
    usedNames
  });
  return Object.freeze(characterWithBiography({
    ...character,
    ...name,
    skillIds: characterSkillIdsForIdentity(`player|${identityKey}`),
    role: "player-captain",
    homePortTileId: homePort.tileId,
    homePortName: homePort.displayCity || homePort.city
  }, portBiographyOptions(`player|${identityKey}`, homePort)));
}

export function generateCampaignContactCharacter({
  playerCharacter,
  homePort,
  goalType,
  excludedSourceId,
  excludedSourceIds = [],
  manifest,
  usedNames
}) {
  validateCharacterPortraitManifest(manifest);
  assertUsedNames(usedNames);
  if (!playerCharacter?.id) throw new Error("Campaign contact generation requires a player character");
  if (!homePort || typeof homePort !== "object") {
    throw new Error("Campaign contact generation requires a home port");
  }
  if (!["explorer", "family-debt", "white-whale-revenge"].includes(goalType)) {
    throw new Error(`Unknown campaign contact goal type: ${goalType}`);
  }
  if (typeof excludedSourceId !== "string" || excludedSourceId === "") {
    throw new Error("Campaign contact generation requires the home factor portrait source");
  }
  const reservedNames = new Set(usedNames);
  return generateSpecialPortCharacter({
    identityKey: `campaign-contact|${goalType}|${playerCharacter.id}|${homePort.tileId}`,
    port: homePort,
    excludedSourceIds: [excludedSourceId, ...excludedSourceIds],
    role: goalType === "explorer"
      ? "patron"
      : goalType === "family-debt" ? "creditor" : "old-whaler",
    manifest,
    usedNames: reservedNames
  });
}

export function generateSpecialPortCharacter({
  identityKey,
  port,
  excludedSourceIds = [],
  role,
  religionId = null,
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
  if (typeof role !== "string" || role.trim() === "") {
    throw new Error("Special port character generation requires a role");
  }
  const region = portraitRegionForCity(port);
  const sourcePool = characterSourcesForRole(manifest, "factor", region, { excludedSourceIds });
  const character = assignCharacterSprite(identityKey, region, sourcePool, new Set());
  return Object.freeze(characterWithBiography({
    ...character,
    ...assignRegionalCharacterName({
      identityKey,
      city: port,
      sex: character.sex,
      usedNames
    }),
    skillIds: characterSkillIdsForIdentity(identityKey, { traveler: true }),
    role,
    religionId,
    homePortTileId: port.tileId
  }, portBiographyOptions(identityKey, port)));
}

export function generatePassengerCharacter({
  identityKey,
  originPort,
  destinationPort,
  scenarioId = "",
  namePortPreference = "origin",
  excludedSourceIds = [],
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
  const sourcePool = characterSourcesForRole(manifest, "factor", region, { excludedSourceIds });
  const key = `passenger|${identityKey}`;
  const character = assignCharacterSprite(key, region, sourcePool, new Set());
  const name = assignRegionalCharacterName({
    identityKey: key,
    city: namePort,
    sex: character.sex,
    usedNames
  });
  return Object.freeze(characterWithBiography({
    ...character,
    ...name,
    skillIds: characterSkillIdsForIdentity(key, { traveler: true }),
    role: "passenger",
    originPortTileId: originPort.tileId,
    destinationPortTileId: destinationPort.tileId
  }, portBiographyOptions(key, namePort)));
}

export function generatePirateCaptiveCharacter({
  identityKey,
  homePort,
  excludedSourceIds = [],
  manifest,
  usedNames
}) {
  return generateRescuedTravelerCharacter({
    identityKey,
    homePort,
    excludedSourceIds,
    manifest,
    usedNames,
    rescueType: "pirate-captive"
  });
}

export function generateCastawayCharacter({
  identityKey,
  homePort,
  excludedSourceIds = [],
  manifest,
  usedNames
}) {
  return generateRescuedTravelerCharacter({
    identityKey,
    homePort,
    excludedSourceIds,
    manifest,
    usedNames,
    rescueType: "castaway"
  });
}

function generateRescuedTravelerCharacter({
  identityKey,
  homePort,
  excludedSourceIds,
  manifest,
  usedNames,
  rescueType
}) {
  validateCharacterPortraitManifest(manifest);
  assertUsedNames(usedNames);
  if (typeof identityKey !== "string" || identityKey.trim() === "") {
    throw new Error("Rescued traveler generation requires an identity key");
  }
  if (!homePort || typeof homePort !== "object") {
    throw new Error("Rescued traveler generation requires a home port");
  }
  if (rescueType !== "pirate-captive" && rescueType !== "castaway") {
    throw new Error(`Unknown rescued traveler character type: ${rescueType}`);
  }
  const region = portraitRegionForCity(homePort);
  const sourcePool = expressiveCivilianSources(manifest, excludedSourceIds);
  const key = `${rescueType}|${identityKey}`;
  const character = assignCharacterSprite(key, region, sourcePool, new Set());
  const name = assignRegionalCharacterName({
    identityKey: key,
    city: homePort,
    sex: character.sex,
    usedNames
  });
  return Object.freeze(characterWithBiography({
    ...character,
    ...name,
    skillIds: characterSkillIdsForIdentity(key, { traveler: true }),
    role: rescueType,
    homePortTileId: homePort.tileId,
    homePortName: homePort.displayCity || homePort.city,
    homePortCountry: homePort.country,
    goal: `Reunite with family in ${homePort.displayCity || homePort.city}`
  }, portBiographyOptions(key, homePort)));
}

export function generatePirateCaptiveFamilyMember({
  identityKey,
  captive,
  homePort,
  excludedSourceIds = [],
  manifest,
  usedNames
}) {
  return generateRescuedTravelerFamilyMember({
    identityKey,
    captive,
    homePort,
    excludedSourceIds,
    manifest,
    usedNames,
    rescueType: "pirate-captive"
  });
}

export function generateCastawayFamilyMember({
  identityKey,
  castaway,
  homePort,
  excludedSourceIds = [],
  manifest,
  usedNames
}) {
  return generateRescuedTravelerFamilyMember({
    identityKey,
    captive: castaway,
    homePort,
    excludedSourceIds,
    manifest,
    usedNames,
    rescueType: "castaway"
  });
}

function generateRescuedTravelerFamilyMember({
  identityKey,
  captive,
  homePort,
  excludedSourceIds,
  manifest,
  usedNames,
  rescueType
}) {
  validateCharacterPortraitManifest(manifest);
  assertUsedNames(usedNames);
  if (typeof identityKey !== "string" || identityKey.trim() === "") {
    throw new Error("Rescued traveler family generation requires an identity key");
  }
  if (!captive || typeof captive !== "object") {
    throw new Error("Rescued traveler family generation requires the traveler");
  }
  if (!homePort || typeof homePort !== "object") {
    throw new Error("Rescued traveler family generation requires a home port");
  }
  if (rescueType !== "pirate-captive" && rescueType !== "castaway") {
    throw new Error(`Unknown rescued traveler family type: ${rescueType}`);
  }
  const region = portraitRegionForCity(homePort);
  const sourcePool = expressiveCivilianSources(manifest, [captive.sourceId, ...excludedSourceIds]);
  const key = `${rescueType}-family|${identityKey}`;
  const character = assignCharacterSprite(key, region, sourcePool, new Set());
  const name = assignRegionalFamilyMemberName({
    identityKey: key,
    relative: captive,
    sex: character.sex,
    usedNames
  });
  return Object.freeze(characterWithBiography({
    ...character,
    ...name,
    skillIds: characterSkillIdsForIdentity(key, { traveler: true }),
    role: "family",
    homePortTileId: homePort.tileId,
    homePortName: homePort.displayCity || homePort.city,
    homePortCountry: homePort.country
  }, portBiographyOptions(key, homePort)));
}

function portBiographyOptions(identityKey, port) {
  const faction = typeof port.factionId === "string" ? factionById(port.factionId) : null;
  const sovereign = faction && faction.id !== NEUTRAL_FACTION_ID;
  return {
    identityKey,
    nationalityId: faction?.id || null,
    nationalityName: sovereign ? faction.name : null,
    nationalityAdjective: sovereign ? faction.adjective : null,
    homePort: port
  };
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

function characterSourcesForPlayer(manifest, region) {
  if (region !== "northern-europe" && region !== "mediterranean") {
    return characterSourcesForRole(manifest, "captain", region, { excludePirates: true });
  }
  const expressive = manifest.sourceCharacters.filter((source) => (
    source.regions.includes(region) &&
    source.expressions.length > 1 &&
    !source.roles.includes("pirate") &&
    (source.roles.includes("captain") || source.roles.includes("factor"))
  ));
  if (expressive.length === 0) {
    throw new Error(`Character portrait manifest has no expressive ${region} player sources`);
  }
  return expressive;
}

function expressiveCivilianSources(manifest, excludedSourceIds) {
  const excluded = sourceIdExclusionSet(excludedSourceIds);
  const sources = manifest.sourceCharacters.filter((source) => {
    if (excluded.has(source.id) || source.roles.includes("pirate")) return false;
    if (!source.roles.includes("civilian") && !source.roles.includes("factor")) return false;
    const expressions = new Set(source.expressions.map((expression) => expression.id));
    const hasSad = ["sad", "worried", "pained", "hurt", "concerned"].some((id) => expressions.has(id));
    const hasHappy = ["laughing", "happy", "pleased", "smile", "soft-smile"].some((id) => expressions.has(id));
    return source.expressions.length > 1 && hasSad && hasHappy;
  });
  if (sources.length === 0) {
    throw new Error("Character portrait manifest has no expressive pirate captive sources");
  }
  return sources;
}

function characterSourcesForRole(
  manifest,
  role,
  region,
  { excludePirates = false, excludedSourceIds = [] } = {}
) {
  const excluded = sourceIdExclusionSet(excludedSourceIds);
  const regional = manifest.sourceCharacters.filter((source) => (
    source.roles.includes(role)
      && source.regions.includes(region)
      && (!excludePirates || !source.roles.includes("pirate"))
      && !excluded.has(source.id)
  ));
  if (regional.length === 0) {
    throw new Error(`Character portrait manifest has no ${region} sources for role ${role}`);
  }
  return regional;
}

function sourceIdExclusionSet(sourceIds) {
  if (!Array.isArray(sourceIds) || sourceIds.some((id) => typeof id !== "string" || id === "")) {
    throw new Error("Character portrait exclusions must be source ids");
  }
  return new Set(sourceIds);
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
