import { generatePlayerCharacter } from "./characterPortraits.js";
import { factionById } from "./factions.js";
import { shipStatsForSlug } from "./shipStats.js";

export const PLAYER_START_YEAR = 1522;

export const PLAYER_START_REGIONS = Object.freeze([
  "europe",
  "ottoman",
  "east-asia",
  "india"
]);

export const PLAYER_STARTER_SHIPS = Object.freeze({
  europe: "fishing-lugger",
  ottoman: "felucca",
  "east-asia": "sampan",
  india: "small-dhow"
});

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
  "muscovy",
  "poland-lithuania",
  "denmark-norway"
]);
const EAST_ASIAN_FACTIONS = new Set(["ming", "japan", "joseon"]);
const INDIAN_FACTIONS = new Set(["vijayanagara", "gujarat", "bengal", "delhi"]);
const DAYS_PER_MONTH = Object.freeze([31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]);
const PLAYER_START_DAY_OF_YEAR = 80;
const MONTH_NAMES = Object.freeze([
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
]);

export function generatePlayerStartingProfile({
  identityKey,
  ports,
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

  const { homePort, startRegion } = selectPlayerHomePort(identityKey, ports);
  const nationality = factionById(homePort.factionId);
  const starterShipSlug = PLAYER_STARTER_SHIPS[startRegion];
  shipStatsForSlug(starterShipSlug);

  const baseCharacter = generatePlayerCharacter({
    identityKey,
    homePort,
    manifest,
    usedNames
  });
  const birthDate = generateBirthDate(identityKey, startYear, baseCharacter.age);
  const character = Object.freeze({
    ...baseCharacter,
    sex: baseCharacter.gender,
    birthDate,
    birthDateLabel: birthDate.label,
    age: birthDate.age,
    nationalityId: nationality.id,
    nationalityName: nationality.name,
    nationalityAdjective: nationality.adjective,
    homePortCountry: homePort.country,
    homePortRealmName: nationality.name,
    homePortLat: homePort.lat,
    homePortLon: homePort.lon,
    startRegion,
    starterShipSlug
  });

  return Object.freeze({ character, homePort, nationality, startRegion, starterShipSlug });
}

export function resolvePlayerCharacterIdentityKey({ querySeed = null, generatedSeed }) {
  if (validPlayerCharacterSeed(querySeed)) return querySeed;
  if (validPlayerCharacterSeed(generatedSeed)) return generatedSeed;
  throw new Error("Player profile generation requires a valid generated identity seed");
}

export function validPlayerCharacterSeed(value) {
  return typeof value === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(value);
}

export function selectPlayerHomePort(identityKey, ports) {
  if (typeof identityKey !== "string" || identityKey.trim() === "") {
    throw new Error("Player home selection requires an identity key");
  }
  if (!Array.isArray(ports) || ports.length === 0) {
    throw new Error("Player home selection requires port cities");
  }
  const pools = playerHomePortPools(ports);
  const availableRegions = PLAYER_START_REGIONS.filter((region) => pools.get(region)?.length > 0);
  if (availableRegions.length === 0) {
    throw new Error("No eligible European, Ottoman, East Asian, or Indian home ports");
  }
  const startRegion = chooseSeeded(availableRegions, `${identityKey}|home-region`);
  const homePort = chooseSeeded(pools.get(startRegion), `${identityKey}|home-city|${startRegion}`);
  return Object.freeze({ homePort, startRegion });
}

export function playerStartRegionForPort(port) {
  if (!port || typeof port !== "object") return null;
  if (port.playerHomeExcluded) return null;
  if (port.factionId === "ottoman") return "ottoman";
  if (port.cityType === "east-asian" && EAST_ASIAN_FACTIONS.has(port.factionId)) return "east-asia";
  if (port.cityType === "south-asian" && INDIAN_FACTIONS.has(port.factionId)) return "india";
  if (
    (port.cityType === "northern-european" || port.cityType === "mediterranean") &&
    EUROPEAN_FACTIONS.has(port.factionId)
  ) {
    return "europe";
  }
  return null;
}

export function playerHomePortPools(ports) {
  const pools = new Map(PLAYER_START_REGIONS.map((region) => [region, []]));
  for (const port of ports) {
    const region = playerStartRegionForPort(port);
    if (region) pools.get(region).push(port);
  }
  for (const portsInRegion of pools.values()) {
    portsInRegion.sort((a, b) => stablePortKey(a).localeCompare(stablePortKey(b)));
  }
  return pools;
}

function generateBirthDate(identityKey, startYear, age) {
  if (!Number.isInteger(age) || age < 5 || age > 90) throw new Error(`Invalid player age: ${age}`);
  const month = hashString32(`${identityKey}|birth-month`) % 12 + 1;
  const day = hashString32(`${identityKey}|birth-day`) % DAYS_PER_MONTH[month - 1] + 1;
  const birthdayDayOfYear = DAYS_PER_MONTH
    .slice(0, month - 1)
    .reduce((total, days) => total + days, day);
  const year = startYear - age - (birthdayDayOfYear > PLAYER_START_DAY_OF_YEAR ? 1 : 0);
  return Object.freeze({
    year,
    month,
    day,
    age,
    label: `${day} ${MONTH_NAMES[month - 1]} ${year}`
  });
}

function chooseSeeded(items, key) {
  if (!Array.isArray(items) || items.length === 0) throw new Error(`Cannot choose from an empty pool: ${key}`);
  return items[hashString32(key) % items.length];
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
