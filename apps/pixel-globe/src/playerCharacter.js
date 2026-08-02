import { generatePlayerCharacter } from "./characterPortraits.js";
import { characterWithBiography } from "./characterBiography.js";
import {
  NEUTRAL_FACTION_ID,
  PIRATE_FACTION_ID,
  factionById
} from "./factions.js";
import { shipStatsForSlug } from "./shipStats.js";

export const PLAYER_START_YEAR = 1522;

export const PLAYER_START_AREAS = Object.freeze([
  "northern-europe",
  "mediterranean",
  "east-asia",
  "india",
  "southeast-asia"
]);

export const PLAYER_STARTER_SHIPS = Object.freeze({
  europe: "fishing-lugger",
  ottoman: "felucca",
  "east-asia": "sampan",
  india: "dhow",
  "southeast-asia": "kelulus"
});

export const PLAYER_WHALING_STARTER_SHIPS = Object.freeze({
  europe: "small-cog",
  ottoman: "ketch",
  "east-asia": "small-junk",
  india: "ketch",
  "southeast-asia": "kelulus"
});

export const PLAYER_ARMED_STARTER_SHIPS = Object.freeze({
  europe: "small-cog",
  ottoman: "ketch",
  "east-asia": "small-junk",
  india: "ketch",
  "southeast-asia": "penjajap"
});

const JAPANESE_KURIBUNE_SLUG = "japanese-kuribune";

const EUROPEAN_FACTIONS = new Set([
  "england",
  "scotland",
  "france",
  "spain",
  "portugal",
  "habsburg",
  "hungary",
  "venice",
  "genoa",
  "papal-states",
  "hospitallers",
  "muscovy",
  "poland-lithuania",
  "sweden",
  "denmark-norway"
]);
const EAST_ASIAN_FACTIONS = new Set(["ming", "japan", "joseon"]);
const INDIAN_FACTIONS = new Set([
  "hormuz",
  "safavid",
  "vijayanagara",
  "gujarat",
  "bengal",
  "delhi"
]);
const SOUTHEAST_ASIAN_FACTIONS = new Set(["ayutthaya", "ternate", "tidore"]);
const ISLAMIC_MEDITERRANEAN_FACTIONS = new Set(["ottoman", "morocco", "crimea"]);
const ISLAMIC_MEDITERRANEAN_MAX_LONGITUDE = 40;
const PLAYER_HOME_EXCLUDED_CITY_TYPES = new Set(["mesoamerican", "andean", "sub-saharan"]);

export function playerStartRegionForFaction(factionId) {
  factionById(factionId);
  if (ISLAMIC_MEDITERRANEAN_FACTIONS.has(factionId)) return "ottoman";
  if (EAST_ASIAN_FACTIONS.has(factionId)) return "east-asia";
  if (INDIAN_FACTIONS.has(factionId)) return "india";
  if (SOUTHEAST_ASIAN_FACTIONS.has(factionId)) return "southeast-asia";
  if (EUROPEAN_FACTIONS.has(factionId)) return "europe";
  throw new Error(`Faction cannot provide a player starter ship: ${factionId}`);
}

export function playerStarterShipForFaction(factionId, { whaling = false, armed = false } = {}) {
  if (typeof whaling !== "boolean") throw new Error(`Invalid whaling starter flag: ${whaling}`);
  if (typeof armed !== "boolean") throw new Error(`Invalid armed starter flag: ${armed}`);
  if (whaling && armed) throw new Error("Starter ship cannot request separate whaling and armed campaigns");
  const region = playerStartRegionForFaction(factionId);
  const roster = whaling
    ? PLAYER_WHALING_STARTER_SHIPS
    : armed ? PLAYER_ARMED_STARTER_SHIPS : PLAYER_STARTER_SHIPS;
  const slug = factionId === "japan" && !armed
    ? JAPANESE_KURIBUNE_SLUG
    : roster[region];
  if (!slug) throw new Error(`No ${whaling ? "whaling " : armed ? "armed " : ""}starter ship for ${factionId}`);
  const stats = shipStatsForSlug(slug);
  if (whaling && stats.seaworthiness < 5) {
    throw new Error(`Whaling starter is not seaworthy: ${slug}`);
  }
  if (armed && stats.cannons <= 0) throw new Error(`Armed starter has no cannons: ${slug}`);
  return slug;
}

export function generatePlayerStartingProfile({
  identityKey,
  ports,
  portWeights,
  manifest,
  usedNames,
  startYear = PLAYER_START_YEAR
}) {
  if (typeof identityKey !== "string" || identityKey.trim() === "") {
    throw new Error("Player profile generation requires an identity key");
  }
  if (!Array.isArray(ports) || ports.length === 0) {
    throw new Error("Player profile generation requires port cities");
  }
  if (!Number.isInteger(startYear)) throw new Error(`Invalid player start year: ${startYear}`);

  const { homePort, startArea } = selectPlayerHomePort(identityKey, ports, portWeights);
  const nationality = factionById(homePort.factionId);
  const startRegion = playerStartRegionForFaction(nationality.id);
  const portStartArea = playerStartAreaForPort(homePort);
  if (portStartArea !== startArea) {
    throw new Error(
      `Player start area disagrees with ${homePort.displayCity || homePort.city}: ${startArea} != ${portStartArea}`
    );
  }
  const starterShipSlug = playerStarterShipForFaction(nationality.id);

  const baseCharacter = generatePlayerCharacter({
    identityKey,
    homePort,
    manifest,
    usedNames
  });
  const character = Object.freeze(characterWithBiography({
    ...baseCharacter,
    nationalityId: nationality.id,
    nationalityName: nationality.name,
    nationalityAdjective: nationality.adjective,
    homePortCountry: homePort.country,
    homePortRealmName: nationality.name,
    homePortLat: homePort.lat,
    homePortLon: homePort.lon,
    startRegion,
    starterShipSlug
  }, {
    identityKey,
    referenceYear: startYear,
    nationalityId: nationality.id,
    nationalityName: nationality.name,
    nationalityAdjective: nationality.adjective
  }));

  return Object.freeze({ character, homePort, nationality, startArea, startRegion, starterShipSlug });
}

export function resolvePlayerCharacterIdentityKey({ querySeed = null, generatedSeed }) {
  if (validPlayerCharacterSeed(querySeed)) return querySeed;
  if (validPlayerCharacterSeed(generatedSeed)) return generatedSeed;
  throw new Error("Player profile generation requires a valid generated identity seed");
}

export function validPlayerCharacterSeed(value) {
  return typeof value === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(value);
}

export function selectPlayerHomePort(identityKey, ports, portWeights) {
  if (typeof identityKey !== "string" || identityKey.trim() === "") {
    throw new Error("Player home selection requires an identity key");
  }
  if (!Array.isArray(ports) || ports.length === 0) {
    throw new Error("Player home selection requires port cities");
  }
  if (!(portWeights instanceof Map)) {
    throw new Error("Player home selection requires maritime port weights");
  }
  const pools = playerHomePortPools(ports);
  const availableAreas = PLAYER_START_AREAS.filter((area) => pools.get(area)?.length > 0);
  if (availableAreas.length === 0) {
    throw new Error(
      "No eligible Northern European, Mediterranean, East Asian, Indian, or Southeast Asian home ports"
    );
  }
  const startArea = chooseSeeded(availableAreas, `${identityKey}|home-area`);
  const homePort = chooseSeededWeighted(
    pools.get(startArea),
    portWeights,
    `${identityKey}|home-city|${startArea}`
  );
  return Object.freeze({ homePort, startArea });
}

export function playerStartAreaForPort(port) {
  if (!port || typeof port !== "object") return null;
  if (port.playerHomeExcluded) return null;
  if (port.settlementType === "village") return null;
  const faction = factionById(port.factionId);
  if ([NEUTRAL_FACTION_ID, PIRATE_FACTION_ID].includes(faction.id)) return null;
  if (PLAYER_HOME_EXCLUDED_CITY_TYPES.has(port.cityType)) return null;
  if (port.cityType === "northern-european") return "northern-europe";
  if (port.cityType === "mediterranean") return "mediterranean";
  if (port.cityType === "east-asian") return "east-asia";
  if (port.cityType === "south-asian") return "india";
  if (port.cityType === "southeast-asian") return "southeast-asia";
  if (port.cityType === "islamic-desert") {
    if (!Number.isFinite(port.lon)) {
      throw new Error(`Islamic-desert port has no longitude: ${port.displayCity || port.city}`);
    }
    return port.lon <= ISLAMIC_MEDITERRANEAN_MAX_LONGITUDE ? "mediterranean" : "india";
  }
  return null;
}

export function playerHomePortPools(ports) {
  const pools = new Map(PLAYER_START_AREAS.map((area) => [area, []]));
  for (const port of ports) {
    const area = playerStartAreaForPort(port);
    if (area) pools.get(area).push(port);
  }
  for (const portsInRegion of pools.values()) {
    portsInRegion.sort((a, b) => stablePortKey(a).localeCompare(stablePortKey(b)));
  }
  return pools;
}

function chooseSeeded(items, key) {
  if (!Array.isArray(items) || items.length === 0) throw new Error(`Cannot choose from an empty pool: ${key}`);
  return items[hashString32(key) % items.length];
}

function chooseSeededWeighted(items, weights, key) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error(`Cannot choose from an empty weighted pool: ${key}`);
  }
  let total = 0;
  for (const item of items) {
    const weight = weights.get(item.tileId);
    if (!Number.isFinite(weight) || weight <= 0) {
      throw new Error(`Invalid player home weight for port ${item.tileId}: ${weight}`);
    }
    total += weight;
  }
  let cursor = hashString32(key) / 0x100000000 * total;
  for (const item of items) {
    cursor -= weights.get(item.tileId);
    if (cursor < 0) return item;
  }
  throw new Error(`Weighted player home selection exceeded its total: ${key}`);
}

function stablePortKey(port) {
  return `${port.country || ""}|${port.displayCity || port.city || ""}|${port.tileId ?? ""}`;
}

function hashString32(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 0xc2b2ae35);
  hash ^= hash >>> 16;
  return hash >>> 0;
}
