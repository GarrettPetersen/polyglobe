import {
  GALLEASS_SLUG,
  JAPANESE_SHIP_SLUGS,
  JAPANESE_UMI_BUNE_SLUG,
  shipLabelForSlug,
  shipStatsForSlug
} from "./shipStats.js";

const MINUTES_PER_DAY = 24 * 60;
const SHIPYARD_SNAPSHOT_VERSION = 2;
const LEGACY_BUILD_TIME_SCALE = 0.75;
const NORMAL_BUILD_INTERVAL_DAYS = 3900;
const FAMOUS_BUILD_INTERVAL_DAYS = 1350;
const NORMAL_LISTING_DAYS = 180;
const FAMOUS_LISTING_DAYS = 240;
const GOSSIP_RADIUS_KM = 1800;
const JOSEON_TURTLE_SHIP_SLUG = "joseon-turtle-ship";
const JOSEON_PANOKSEON_SLUG = "joseon-panokseon";
const SPANISH_NAO_SLUG = "spanish-nao";
const PORTUGUESE_CARRACK_SLUG = "portuguese-carrack";
const OTTOMAN_COASTAL_TRADER_SLUG = "ottoman-coastal-trader";
const ACCESSIBLE_SHIP_PRICES = Object.freeze({
  dhow: 1400,
  "ocean-dhow": 4800,
  "mesoamerican-dugout-canoe": 1400,
  "fishing-lugger": 1800,
  felucca: 1800,
  sampan: 1800,
  [JAPANESE_UMI_BUNE_SLUG]: 2200,
  "polynesian-voyaging-canoe": 2400,
  cutter: 3000,
  "small-cog": 3400,
  ketch: 3600,
  "small-junk": 3800,
  "nusantaran-outrigger": 4000,
  kelulus: 4200,
  penjajap: 7000,
  lancaran: 18000,
  "royal-lancaran": 42000,
  [GALLEASS_SLUG]: 76000,
  "square-rigged-caravel": 4000
});

const FACTION_SHIPS = Object.freeze({
  joseon: Object.freeze([JOSEON_TURTLE_SHIP_SLUG, JOSEON_PANOKSEON_SLUG]),
  japan: JAPANESE_SHIP_SLUGS,
  spain: Object.freeze([SPANISH_NAO_SLUG]),
  portugal: Object.freeze([PORTUGUESE_CARRACK_SLUG]),
  ottoman: Object.freeze([OTTOMAN_COASTAL_TRADER_SLUG]),
  venice: Object.freeze([GALLEASS_SLUG]),
  hospitallers: Object.freeze(["mediterranean-galley"])
});

export const FAMOUS_SHIPBUILDING_TOWNS = Object.freeze([
  "Lisbon", "Porto", "Seville", "Cadiz", "London", "Bristol", "Southampton", "Portsmouth",
  "Amsterdam", "Antwerp", "Venice", "Genova", "Genoa", "Ragusa", "Istanbul", "Alexandria",
  "Goa", "Calicut", "Cochin", "Malacca", "Aceh", "Guangzhou", "Quanzhou", "Hangzhou",
  "Nanjing", "Nagasaki", "Seoul", "Busan", "Tongyeong", "Yeosu"
]);

const FAMOUS_TOWN_KEYS = new Set(FAMOUS_SHIPBUILDING_TOWNS.map(normalizeName));

const REGION_SHIP_POOLS = Object.freeze({
  "northern-european": Object.freeze([
    "fishing-lugger", "small-cog", "small-cog", "cutter", "ketch", "square-rigged-caravel",
    "caravel", "caravel", "brigantine", "fluyt", "carrack", "galleon", "ship-of-the-line"
  ]),
  mediterranean: Object.freeze([
    "fishing-lugger", "felucca", "cutter", "ketch", "xebec", "xebec", "mediterranean-galley",
    "square-rigged-caravel", "caravel", "caravel", "brigantine", "carrack", "galleon", "ship-of-the-line"
  ]),
  "islamic-desert": Object.freeze([
    "felucca", "dhow", "dhow", "felucca", "dhow", "ocean-dhow", "ocean-dhow",
    "ocean-dhow", "ketch", "ketch", "xebec", "xebec", "caravel", "carrack", "galleon"
  ]),
  "east-asian": Object.freeze(["sampan", "small-junk", "medium-junk", "large-junk"]),
  "south-asian": Object.freeze([
    "felucca", "dhow", "dhow", "felucca", "dhow", "ocean-dhow", "ocean-dhow",
    "ocean-dhow", "ketch", "small-junk", "medium-junk", "large-junk", "caravel", "carrack"
  ]),
  "southeast-asian": Object.freeze([
    "sampan", "dhow", "dhow", "kelulus", "kelulus", "penjajap", "penjajap",
    "nusantaran-outrigger", "nusantaran-outrigger", "small-junk", "lancaran", "lancaran",
    "medium-junk", "royal-lancaran", "large-junk", "caravel", "carrack"
  ]),
  polynesian: Object.freeze(["polynesian-voyaging-canoe"]),
  mesoamerican: Object.freeze(["mesoamerican-dugout-canoe"]),
  andean: Object.freeze(["mesoamerican-dugout-canoe"]),
  "sub-saharan": Object.freeze([
    "fishing-lugger", "felucca", "dhow", "dhow", "felucca", "dhow", "ocean-dhow",
    "ocean-dhow", "ketch", "caravel", "caravel", "carrack"
  ])
});

for (const pool of Object.values(REGION_SHIP_POOLS)) {
  for (const slug of pool) shipStatsForSlug(slug);
}

export function createWorldShipyards({ ports, startMinute, seedKey = null }) {
  if (!Array.isArray(ports) || ports.length === 0) throw new Error("World shipyards require ports");
  if (!Number.isFinite(startMinute)) throw new Error(`Invalid shipyard start minute: ${startMinute}`);
  validateOptionalSeedKey(seedKey, "shipyard");
  const yards = new Map();
  for (const port of ports) {
    const yard = createShipyard(port, startMinute, seedKey);
    if (yards.has(yard.portId)) throw new Error(`Duplicate shipyard port tile: ${yard.portId}`);
    yards.set(yard.portId, yard);
  }
  return { version: 1, seedKey, lastMinute: startMinute, yards };
}

export function addWorldShipyardPort(system, port, startMinute = system?.lastMinute) {
  assertShipyardSystem(system);
  if (!Number.isFinite(startMinute)) throw new Error(`Invalid shipyard port start minute: ${startMinute}`);
  const yard = createShipyard(port, startMinute, system.seedKey);
  if (system.yards.has(yard.portId)) throw new Error(`Shipyard port already exists: ${yard.portId}`);
  system.yards.set(yard.portId, yard);
  return yard;
}

export function replaceWorldShipyardPort(system, port, startMinute = system?.lastMinute) {
  assertShipyardSystem(system);
  if (!Number.isFinite(startMinute)) throw new Error(`Invalid replacement shipyard minute: ${startMinute}`);
  const portId = requiredPortId(port);
  const previous = system.yards.get(portId);
  if (!previous) throw new Error(`Replacement shipyard port does not exist: ${portId}`);
  const replacement = createShipyard(port, startMinute, system.seedKey);
  replacement.buildNumber = previous.buildNumber;
  replacement.listing = previous.listing;
  replacement.nextBuildMinute = Math.min(previous.nextBuildMinute, replacement.nextBuildMinute);
  system.yards.set(portId, replacement);
  return replacement;
}

export function snapshotWorldShipyards(system) {
  assertShipyardSystem(system);
  return {
    version: SHIPYARD_SNAPSHOT_VERSION,
    lastMinute: system.lastMinute,
    yards: [...system.yards.values()].map((yard) => ({
      portId: yard.portId,
      buildNumber: yard.buildNumber,
      listing: yard.listing ? { ...yard.listing } : null,
      nextBuildMinute: yard.nextBuildMinute
    }))
  };
}

export function restoreWorldShipyards(system, snapshot, { seedKey = system?.seedKey } = {}) {
  assertShipyardSystem(system);
  validateOptionalSeedKey(seedKey, "restored shipyard");
  if (
    !snapshot ||
    (snapshot.version !== 1 && snapshot.version !== SHIPYARD_SNAPSHOT_VERSION) ||
    !Array.isArray(snapshot.yards)
  ) {
    throw new Error("Unsupported shipyard save data");
  }
  if (!Number.isFinite(snapshot.lastMinute)) throw new Error("Invalid saved shipyard minute");
  system.seedKey = seedKey;
  for (const yard of system.yards.values()) yard.seedKey = seedKey;
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
    yard.listing = restoreShipyardListing(yard, saved);
    yard.nextBuildMinute = snapshot.version === 1 && saved.nextBuildMinute > snapshot.lastMinute
      ? Math.round(
          snapshot.lastMinute +
          (saved.nextBuildMinute - snapshot.lastMinute) * LEGACY_BUILD_TIME_SCALE
        )
      : saved.nextBuildMinute;
  }
  system.lastMinute = snapshot.lastMinute;
  return system;
}

function restoreShipyardListing(yard, saved) {
  if (!saved.listing) return null;
  const regionalPool = shipPoolForYard(yard);
  if (!regionalPool) throw new Error(`No shipyard hull pool for region: ${yard.cityType}`);
  if (!regionalPool.includes(saved.listing.shipSlug)) {
    return generateShipyardListing(yard, saved.buildNumber, saved.listing.builtMinute);
  }
  return {
    ...saved.listing,
    price: shipyardListingPrice(
      saved.listing.shipSlug,
      shipyardListingSeed(yard, saved.buildNumber)
    )
  };
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

export function shipyardRumorForPort(
  system,
  port,
  sailingDistanceKm,
  maxDistanceKm = GOSSIP_RADIUS_KM,
  eligiblePortIds = null
) {
  assertShipyardSystem(system);
  assertSailingDistanceResolver(sailingDistanceKm);
  if (!Number.isFinite(maxDistanceKm) || maxDistanceKm <= 0) {
    throw new Error(`Invalid shipyard gossip radius: ${maxDistanceKm}`);
  }
  const nearest = nearestShipyardListingForPort(system, port, sailingDistanceKm, eligiblePortIds);
  if (!nearest || nearest.distanceKm > maxDistanceKm) return null;
  return nearest;
}

export function nearestShipyardListingForPort(
  system,
  port,
  sailingDistanceKm,
  eligiblePortIds = null
) {
  assertShipyardSystem(system);
  assertSailingDistanceResolver(sailingDistanceKm);
  const portId = requiredPortId(port);
  const candidates = [];
  for (const yard of system.yards.values()) {
    if (!yard.listing || yard.portId === portId) continue;
    if (eligiblePortIds && !eligiblePortIds.has(yard.portId)) continue;
    const distanceKm = sailingDistanceKm(portId, yard.portId);
    if (distanceKm === null) continue;
    if (!Number.isInteger(distanceKm) || distanceKm < 0) {
      throw new Error(`Shipyard sailing distance is invalid: ${distanceKm}`);
    }
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
  const regionalPool = shipPoolForYard(yard);
  if (!regionalPool) throw new Error(`No shipyard hull pool for region: ${yard.cityType}`);
  const pool = regionalPool;
  const seed = shipyardListingSeed(yard, buildNumber);
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
  const price = shipyardListingPrice(selected.slug, seed);
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

function shipPoolForYard(yard) {
  const regionalPool = REGION_SHIP_POOLS[yard.cityType];
  if (!regionalPool) return null;
  const factionShips = FACTION_SHIPS[yard.factionId];
  if (yard.factionId === "japan") return factionShips;
  if (factionShips) return [...regionalPool, ...factionShips];
  return regionalPool;
}

function shipyardListingSeed(yard, buildNumber) {
  return hashString32(shipyardSeedKey(yard.seedKey, `${yard.portId}|${buildNumber}|hull`));
}

function shipyardListingPrice(slug, seed) {
  const priceVariation = 0.94 + hashUnit(`${seed}|price`) * 0.14;
  return roundToHundred(shipConstructionPrice(slug) * priceVariation);
}

export function shipConstructionPrice(slug) {
  const stats = shipStatsForSlug(slug);
  const accessiblePrice = ACCESSIBLE_SHIP_PRICES[slug];
  if (accessiblePrice !== undefined) return accessiblePrice;
  return roundToHundred(
    2000 +
    stats.mass * 75 +
    stats.cargoCapacity * 55 +
    stats.cannons * 700 +
    stats.crewCapacity * 180 +
    stats.seaworthiness * 500
  );
}

export function shipTradeInValue(slug) {
  return roundToHundred(shipConstructionPrice(slug) * 0.5);
}

export function shipyardPurchaseTerms(listingPrice, currentShipSlug) {
  if (!Number.isInteger(listingPrice) || listingPrice <= 0) {
    throw new Error(`Invalid shipyard listing price: ${listingPrice}`);
  }
  const tradeInValue = shipTradeInValue(currentShipSlug);
  return Object.freeze({
    listingPrice,
    tradeInValue,
    netPrice: listingPrice - tradeInValue
  });
}

export function shipReplacementTermsWithoutTradeIn(listingPrice) {
  if (!Number.isInteger(listingPrice) || listingPrice < 0) {
    throw new Error(`Invalid replacement ship price: ${listingPrice}`);
  }
  return Object.freeze({
    listingPrice,
    tradeInValue: 0,
    netPrice: listingPrice
  });
}

export function shipyardQualityBudget(yard) {
  const famousBonus = yard.famous ? 26000 : 0;
  return 7000 + yard.wealthScale * 22000 + famousBonus;
}

function createShipyard(port, startMinute, seedKey) {
  const portId = requiredPortId(port);
  const cityType = port.cityType;
  if (!REGION_SHIP_POOLS[cityType]) throw new Error(`No shipyard profile for city type: ${cityType}`);
  const population = Math.max(1000, port.population || 10000);
  const wealthScale = clamp(Math.sqrt(population / 30000), 0.45, 4.2);
  const famous = port.settlementType !== "village" && (
    FAMOUS_TOWN_KEYS.has(normalizeName(port.city)) ||
    FAMOUS_TOWN_KEYS.has(normalizeName(port.displayCity))
  );
  const yard = {
    portId,
    seedKey,
    portName: portName(port),
    cityType,
    factionId: port.factionId || "neutral",
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
  const ageDays = hashUnit(shipyardSeedKey(seedKey, `${portId}|shipyard-phase`)) * intervalDays;
  const previousBuildMinute = startMinute - ageDays * MINUTES_PER_DAY;
  if (ageDays < listingDays) yard.listing = generateShipyardListing(yard, 0, previousBuildMinute);
  yard.nextBuildMinute = previousBuildMinute + intervalDays * MINUTES_PER_DAY;
  return yard;
}

function shipyardBuildIntervalDays(yard, buildNumber) {
  const base = yard.famous ? FAMOUS_BUILD_INTERVAL_DAYS : NORMAL_BUILD_INTERVAL_DAYS;
  const wealthFactor = clamp(yard.wealthScale, 0.65, 2.8);
  const variation = 0.78 + hashUnit(
    shipyardSeedKey(yard.seedKey, `${yard.portId}|${buildNumber}|interval`)
  ) * 0.44;
  return Math.max(240, Math.round(base / wealthFactor * variation));
}

function assertSailingDistanceResolver(resolver) {
  if (typeof resolver !== "function") {
    throw new Error("Shipyard hinting requires the precomputed sailing-distance resolver");
  }
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
  if (!system || system.version !== 1 || !(system.yards instanceof Map) ||
      (system.seedKey !== null && (typeof system.seedKey !== "string" || system.seedKey.trim() === ""))) {
    throw new Error("Invalid world shipyards");
  }
}

function shipyardSeedKey(seedKey, value) {
  return seedKey === null ? value : `${seedKey}|${value}`;
}

function validateOptionalSeedKey(value, label) {
  if (value !== null && (typeof value !== "string" || value.trim() === "")) {
    throw new Error(`${label} seed must be null or a non-empty string`);
  }
  return value;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
