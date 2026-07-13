import { shipLabelForSlug, shipStatsForSlug } from "./shipStats.js";

const MINUTES_PER_DAY = 24 * 60;
const NORMAL_BUILD_INTERVAL_DAYS = 5200;
const FAMOUS_BUILD_INTERVAL_DAYS = 1800;
const NORMAL_LISTING_DAYS = 180;
const FAMOUS_LISTING_DAYS = 240;
const GOSSIP_RADIUS_KM = 1800;

export const FAMOUS_SHIPBUILDING_TOWNS = Object.freeze([
  "Lisbon", "Porto", "Seville", "Cadiz", "London", "Bristol", "Southampton", "Portsmouth",
  "Amsterdam", "Antwerp", "Venice", "Genova", "Genoa", "Ragusa", "Istanbul", "Alexandria",
  "Goa", "Calicut", "Cochin", "Malacca", "Aceh", "Guangzhou", "Quanzhou", "Hangzhou",
  "Nanjing", "Nagasaki"
]);

const FAMOUS_TOWN_KEYS = new Set(FAMOUS_SHIPBUILDING_TOWNS.map(normalizeName));

const REGION_SHIP_POOLS = Object.freeze({
  "northern-european": Object.freeze([
    "fishing-lugger", "small-cog", "square-sail-trader", "square-rigged-caravel", "caravel",
    "small-carrack", "brigantine", "fluyt", "carrack", "galleon", "pirate-frigate", "ship-of-the-line"
  ]),
  mediterranean: Object.freeze([
    "fishing-lugger", "felucca", "lateen-xebec", "xebec", "square-rigged-caravel", "caravel",
    "small-carrack", "brigantine", "carrack", "galleon", "pirate-frigate", "ship-of-the-line"
  ]),
  "islamic-desert": Object.freeze([
    "felucca", "small-dhow", "lateen-dhow", "dhow-felucca", "dhow", "lateen-xebec", "xebec",
    "small-carrack", "carrack", "galleon"
  ]),
  "east-asian": Object.freeze(["sampan", "small-junk", "medium-junk", "large-junk"]),
  "south-asian": Object.freeze([
    "felucca", "small-dhow", "lateen-dhow", "dhow-felucca", "dhow", "small-junk", "medium-junk",
    "large-junk", "small-carrack", "carrack"
  ]),
  "southeast-asian": Object.freeze([
    "sampan", "small-dhow", "lateen-dhow", "dhow", "small-junk", "medium-junk", "large-junk",
    "small-carrack", "carrack"
  ]),
  polynesian: Object.freeze([
    "sampan", "small-dhow", "lateen-dhow", "small-junk", "medium-junk"
  ]),
  mesoamerican: Object.freeze([
    "fishing-lugger", "small-cog", "square-sail-trader", "square-rigged-caravel", "caravel",
    "small-carrack", "brigantine", "carrack", "galleon"
  ]),
  andean: Object.freeze([
    "fishing-lugger", "small-cog", "square-sail-trader", "square-rigged-caravel", "caravel",
    "small-carrack", "brigantine", "carrack", "galleon"
  ]),
  "sub-saharan": Object.freeze([
    "fishing-lugger", "felucca", "small-dhow", "lateen-dhow", "dhow-felucca", "dhow", "caravel",
    "small-carrack", "carrack"
  ])
});

for (const pool of Object.values(REGION_SHIP_POOLS)) {
  for (const slug of pool) shipStatsForSlug(slug);
}

export function createWorldShipyards({ ports, startMinute }) {
  if (!Array.isArray(ports) || ports.length === 0) throw new Error("World shipyards require ports");
  if (!Number.isFinite(startMinute)) throw new Error(`Invalid shipyard start minute: ${startMinute}`);
  const yards = new Map();
  for (const port of ports) {
    const yard = createShipyard(port, startMinute);
    if (yards.has(yard.portId)) throw new Error(`Duplicate shipyard port tile: ${yard.portId}`);
    yards.set(yard.portId, yard);
  }
  return { version: 1, lastMinute: startMinute, yards };
}

export function snapshotWorldShipyards(system) {
  assertShipyardSystem(system);
  return {
    version: 1,
    lastMinute: system.lastMinute,
    yards: [...system.yards.values()].map((yard) => ({
      portId: yard.portId,
      buildNumber: yard.buildNumber,
      listing: yard.listing ? { ...yard.listing } : null,
      nextBuildMinute: yard.nextBuildMinute
    }))
  };
}

export function restoreWorldShipyards(system, snapshot) {
  assertShipyardSystem(system);
  if (!snapshot || snapshot.version !== 1 || !Array.isArray(snapshot.yards)) {
    throw new Error("Unsupported shipyard save data");
  }
  if (!Number.isFinite(snapshot.lastMinute)) throw new Error("Invalid saved shipyard minute");
  for (const saved of snapshot.yards) {
    const yard = system.yards.get(saved.portId);
    if (!yard) throw new Error(`Saved shipyard port is missing: ${saved.portId}`);
    if (!Number.isInteger(saved.buildNumber) || saved.buildNumber < 0) {
      throw new Error(`Invalid saved shipyard build number: ${saved.buildNumber}`);
    }
    if (!Number.isFinite(saved.nextBuildMinute)) {
      throw new Error(`Invalid saved shipyard build minute: ${saved.nextBuildMinute}`);
    }
  }
  for (const saved of snapshot.yards) {
    const yard = system.yards.get(saved.portId);
    yard.buildNumber = saved.buildNumber;
    yard.listing = saved.listing ? { ...saved.listing } : null;
    yard.nextBuildMinute = saved.nextBuildMinute;
  }
  system.lastMinute = snapshot.lastMinute;
  return system;
}

export function advanceWorldShipyards(system, simMinute) {
  assertShipyardSystem(system);
  if (!Number.isFinite(simMinute)) throw new Error(`Invalid shipyard minute: ${simMinute}`);
  if (simMinute <= system.lastMinute) return false;
  let changed = false;
  for (const yard of system.yards.values()) {
    if (yard.listing && simMinute >= yard.listing.expiresMinute) {
      yard.listing = null;
      changed = true;
    }
    while (simMinute >= yard.nextBuildMinute) {
      yard.buildNumber += 1;
      yard.listing = generateShipyardListing(yard, yard.buildNumber, yard.nextBuildMinute);
      yard.nextBuildMinute += shipyardBuildIntervalDays(yard, yard.buildNumber) * MINUTES_PER_DAY;
      changed = true;
    }
    if (yard.listing && simMinute >= yard.listing.expiresMinute) {
      yard.listing = null;
      changed = true;
    }
  }
  system.lastMinute = simMinute;
  return changed;
}

export function shipyardAtPort(system, port) {
  assertShipyardSystem(system);
  const yard = system.yards.get(requiredPortId(port));
  if (!yard) throw new Error(`No shipyard exists at ${portName(port)}`);
  return yard;
}

export function claimShipyardListing(system, port, listingId) {
  const yard = shipyardAtPort(system, port);
  if (!yard.listing || yard.listing.id !== listingId) {
    throw new Error(`Shipyard listing is no longer available: ${listingId}`);
  }
  const listing = yard.listing;
  yard.listing = null;
  return listing;
}

export function shipyardRumorForPort(system, port, maxDistanceKm = GOSSIP_RADIUS_KM) {
  assertShipyardSystem(system);
  if (!Number.isFinite(maxDistanceKm) || maxDistanceKm <= 0) {
    throw new Error(`Invalid shipyard gossip radius: ${maxDistanceKm}`);
  }
  const candidates = [];
  for (const yard of system.yards.values()) {
    if (!yard.listing || yard.portId === port.tileId) continue;
    const distanceKm = greatCircleDistanceKm(port, yard);
    if (distanceKm > maxDistanceKm) continue;
    candidates.push({ yard, listing: yard.listing, distanceKm });
  }
  candidates.sort((a, b) => a.distanceKm - b.distanceKm || a.yard.portId - b.yard.portId);
  const nearest = candidates[0];
  if (!nearest) return null;
  return Object.freeze({
    portId: nearest.yard.portId,
    portName: nearest.yard.portName,
    shipSlug: nearest.listing.shipSlug,
    shipLabel: nearest.listing.shipLabel,
    price: nearest.listing.price,
    distanceKm: Math.round(nearest.distanceKm)
  });
}

export function generateShipyardListing(yard, buildNumber, builtMinute) {
  if (!yard || typeof yard !== "object") throw new Error("Shipyard listing requires a yard");
  if (!Number.isInteger(buildNumber) || buildNumber < 0) throw new Error(`Invalid shipyard build number: ${buildNumber}`);
  if (!Number.isFinite(builtMinute)) throw new Error(`Invalid shipyard build minute: ${builtMinute}`);
  const pool = REGION_SHIP_POOLS[yard.cityType];
  if (!pool) throw new Error(`No shipyard hull pool for region: ${yard.cityType}`);
  const seed = hashString32(`${yard.portId}|${buildNumber}|hull`);
  const masterworkChance = yard.famous ? 0.055 : 0.008;
  const masterwork = hashUnit(`${seed}|masterwork`) < masterworkChance;
  const qualityBudget = masterwork ? Infinity : shipyardQualityBudget(yard);
  const eligible = pool
    .map((slug) => ({ slug, price: shipConstructionPrice(slug) }))
    .filter((entry) => entry.price <= qualityBudget)
    .sort((a, b) => a.price - b.price || a.slug.localeCompare(b.slug));
  const candidates = eligible.length > 0 ? eligible : [{ slug: pool[0], price: shipConstructionPrice(pool[0]) }];
  const wealthFraction = clamp((yard.wealthScale - 0.45) / 3.75 + (yard.famous ? 0.18 : 0), 0, 1);
  const roll = hashUnit(`${seed}|rank`);
  const rankFraction = Math.pow(roll, 2.15 - wealthFraction * 1.15);
  const selected = candidates[Math.min(candidates.length - 1, Math.floor(rankFraction * candidates.length))];
  const priceVariation = 0.94 + hashUnit(`${seed}|price`) * 0.14;
  const price = roundToHundred(selected.price * priceVariation);
  const listingDays = yard.famous ? FAMOUS_LISTING_DAYS : NORMAL_LISTING_DAYS;
  return Object.freeze({
    id: `shipyard-${yard.portId}-${buildNumber}`,
    portId: yard.portId,
    portName: yard.portName,
    shipSlug: selected.slug,
    shipLabel: shipLabelForSlug(selected.slug),
    price,
    builtMinute,
    expiresMinute: builtMinute + listingDays * MINUTES_PER_DAY,
    masterwork
  });
}

export function shipConstructionPrice(slug) {
  const stats = shipStatsForSlug(slug);
  return roundToHundred(
    2000 +
    stats.mass * 75 +
    stats.cargoCapacity * 55 +
    stats.cannons * 700 +
    stats.crewCapacity * 180 +
    stats.seaworthiness * 500
  );
}

export function shipyardQualityBudget(yard) {
  const famousBonus = yard.famous ? 26000 : 0;
  return 7000 + yard.wealthScale * 22000 + famousBonus;
}

function createShipyard(port, startMinute) {
  const portId = requiredPortId(port);
  const cityType = port.cityType;
  if (!REGION_SHIP_POOLS[cityType]) throw new Error(`No shipyard profile for city type: ${cityType}`);
  const population = Math.max(1000, port.population || 10000);
  const wealthScale = clamp(Math.sqrt(population / 30000), 0.45, 4.2);
  const famous = FAMOUS_TOWN_KEYS.has(normalizeName(port.city)) || FAMOUS_TOWN_KEYS.has(normalizeName(port.displayCity));
  const yard = {
    portId,
    portName: portName(port),
    cityType,
    lat: Number(port.lat) || 0,
    lon: Number(port.lon) || 0,
    wealthScale,
    famous,
    buildNumber: 0,
    listing: null,
    nextBuildMinute: startMinute
  };
  const intervalDays = shipyardBuildIntervalDays(yard, 0);
  const listingDays = famous ? FAMOUS_LISTING_DAYS : NORMAL_LISTING_DAYS;
  const ageDays = hashUnit(`${portId}|shipyard-phase`) * intervalDays;
  const previousBuildMinute = startMinute - ageDays * MINUTES_PER_DAY;
  if (ageDays < listingDays) yard.listing = generateShipyardListing(yard, 0, previousBuildMinute);
  yard.nextBuildMinute = previousBuildMinute + intervalDays * MINUTES_PER_DAY;
  return yard;
}

function shipyardBuildIntervalDays(yard, buildNumber) {
  const base = yard.famous ? FAMOUS_BUILD_INTERVAL_DAYS : NORMAL_BUILD_INTERVAL_DAYS;
  const wealthFactor = clamp(yard.wealthScale, 0.65, 2.8);
  const variation = 0.78 + hashUnit(`${yard.portId}|${buildNumber}|interval`) * 0.44;
  return Math.max(240, Math.round(base / wealthFactor * variation));
}

function greatCircleDistanceKm(a, b) {
  const lat1 = toRadians(Number(a.lat) || 0);
  const lat2 = toRadians(Number(b.lat) || 0);
  const dLat = lat2 - lat1;
  const dLon = toRadians((Number(b.lon) || 0) - (Number(a.lon) || 0));
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

function requiredPortId(port) {
  if (!Number.isInteger(port?.tileId) || port.tileId < 0) throw new Error("Shipyard port requires a tileId");
  return port.tileId;
}

function portName(port) {
  return String(port?.displayCity || port?.city || "Port");
}

function normalizeName(value) {
  return String(value || "").trim().toLowerCase();
}

function toRadians(value) {
  return value * Math.PI / 180;
}

function roundToHundred(value) {
  return Math.max(100, Math.round(value / 100) * 100);
}

function hashUnit(value) {
  return (hashString32(String(value)) & 0xffff) / 0xffff;
}

function hashString32(value) {
  let h = 0x811c9dc5;
  for (let index = 0; index < value.length; index++) {
    h ^= value.charCodeAt(index);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function assertShipyardSystem(system) {
  if (!system || system.version !== 1 || !(system.yards instanceof Map)) {
    throw new Error("Invalid world shipyards");
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
