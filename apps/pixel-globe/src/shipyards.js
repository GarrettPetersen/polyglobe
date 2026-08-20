import {
  FUSTA_SLUG,
  GALLEASS_SLUG,
  JOSEON_HYEOPSEON_SLUG,
  JAPANESE_SHIP_SLUGS,
  JAPANESE_UMI_BUNE_SLUG,
  shipLabelForProse,
  shipLabelForSlug,
  shipStatsForSlug
} from "./shipStats.js";
import { JAPANESE_POLITY_FACTION_IDS } from "./factions.js";

const MINUTES_PER_DAY = 24 * 60;
const SHIPYARD_SNAPSHOT_VERSION = 6;
const LEGACY_BUILD_TIME_SCALE = 0.75;
const NORMAL_BUILD_INTERVAL_DAYS = 1200;
const FAMOUS_BUILD_INTERVAL_DAYS = 480;
const NORMAL_LISTING_DAYS = 180;
const FAMOUS_LISTING_DAYS = 240;
const MATERIAL_RETRY_DAYS = 30;
const MAX_MATERIAL_DELAY_DAYS = 180;
const PLAYER_BACKED_BUILD_INTERVAL_MULTIPLIER = 0.62;
const PLAYER_BACKED_DIVIDEND_RATE = 0.22;
const PLAYER_BACKED_CONSTRUCTION_COST_RATE = 0.64;
const MAX_PLAYER_ACCOUNT_ENTRIES = 96;
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
  [FUSTA_SLUG]: 3200,
  [JOSEON_HYEOPSEON_SLUG]: 9000,
  penjajap: 7000,
  lancaran: 18000,
  "royal-lancaran": 42000,
  [GALLEASS_SLUG]: 76000,
  "square-rigged-caravel": 4000
});

const FACTION_SHIPS = Object.freeze({
  joseon: Object.freeze([
    JOSEON_HYEOPSEON_SLUG,
    JOSEON_HYEOPSEON_SLUG,
    JOSEON_PANOKSEON_SLUG,
    JOSEON_TURTLE_SHIP_SLUG
  ]),
  ...Object.fromEntries(JAPANESE_POLITY_FACTION_IDS.map((factionId) => [factionId, JAPANESE_SHIP_SLUGS])),
  spain: Object.freeze([SPANISH_NAO_SLUG]),
  portugal: Object.freeze([PORTUGUESE_CARRACK_SLUG]),
  ottoman: Object.freeze([OTTOMAN_COASTAL_TRADER_SLUG]),
  venice: Object.freeze([GALLEASS_SLUG]),
  hospitallers: Object.freeze([FUSTA_SLUG, "mediterranean-galley"])
});

export const FAMOUS_SHIPBUILDING_TOWNS = Object.freeze([
  "Lisbon", "Porto", "Seville", "Cadiz", "London", "Bristol", "Southampton", "Portsmouth",
  "Amsterdam", "Antwerp", "Venice", "Genova", "Genoa", "Ragusa", "Istanbul", "Alexandria",
  "Goa", "Calicut", "Cochin", "Malacca", "Aceh", "Guangzhou", "Quanzhou", "Hangzhou",
  "Nanjing", "Nagasaki", "Seoul", "Busan", "Tongyeong", "Yeosu"
]);

export const SHIPBUILDING_MATERIAL_GOOD_IDS = Object.freeze([
  "timber",
  "iron",
  "naval-stores"
]);

const FAMOUS_TOWN_KEYS = new Set(FAMOUS_SHIPBUILDING_TOWNS.map(normalizeName));

const REGION_SHIP_POOLS = Object.freeze({
  "northern-european": Object.freeze([
    "fishing-lugger", "small-cog", "small-cog", "holk", "holk", "cutter", "ketch", "square-rigged-caravel",
    "caravel", "caravel", "brigantine", "fluyt", "carrack", "galleon", "ship-of-the-line"
  ]),
  mediterranean: Object.freeze([
    "fishing-lugger", "felucca", FUSTA_SLUG, FUSTA_SLUG, "cutter", "ketch", "xebec", "xebec",
    "mediterranean-galley",
    "square-rigged-caravel", "caravel", "caravel", "brigantine", "carrack", "galleon", "ship-of-the-line"
  ]),
  "islamic-desert": Object.freeze([
    "felucca", "dhow", "dhow", "felucca", "dhow", "ocean-dhow", "ocean-dhow",
    "ocean-dhow", "ketch", "ketch", "xebec", "xebec", "caravel", "carrack", "galleon"
  ]),
  "east-asian": Object.freeze(["sampan", "small-junk", "medium-junk", "large-junk"]),
  "south-asian": Object.freeze([
    "felucca", "dhow", "dhow", "felucca", "dhow", "ocean-dhow", "ocean-dhow",
    "ocean-dhow", "ketch", "ketch", "xebec", "caravel", "carrack"
  ]),
  "southeast-asian": Object.freeze([
    "sampan", "dhow", "dhow", "kelulus", "kelulus", "penjajap", "penjajap",
    "nusantaran-outrigger", "nusantaran-outrigger", "small-junk", "lancaran", "lancaran",
    "medium-junk", "royal-lancaran", "large-junk", "javanese-jong", "javanese-jong", "caravel", "carrack"
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
  return { version: 1, seedKey, lastMinute: startMinute, yards, npcSales: [] };
}

export function addWorldShipyardPort(system, port, startMinute = system?.lastMinute) {
  assertShipyardSystem(system);
  if (!Number.isFinite(startMinute)) throw new Error(`Invalid shipyard port start minute: ${startMinute}`);
  const yard = createShipyard(port, startMinute, system.seedKey);
  if (system.yards.has(yard.portId)) throw new Error(`Shipyard port already exists: ${yard.portId}`);
  system.yards.set(yard.portId, yard);
  return yard;
}

export function worldShipyardHasPort(system, port) {
  assertShipyardSystem(system);
  return system.yards.has(requiredPortId(port));
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
  replacement.buildStartedMinute = Math.min(
    previous.buildStartedMinute,
    replacement.buildStartedMinute,
    replacement.nextBuildMinute
  );
  replacement.materialDelayDays = previous.materialDelayDays;
  replacement.playerBacking = previous.playerBacking ? { ...previous.playerBacking } : null;
  replacement.playerDividendBalance = previous.playerDividendBalance;
  replacement.lifetimePlayerDividends = previous.lifetimePlayerDividends;
  replacement.playerPendingSales = previous.playerPendingSales.map((sale) => ({ ...sale }));
  replacement.playerAccounts = previous.playerAccounts
    ? copyPlayerShipyardAccounts(previous.playerAccounts)
    : null;
  system.yards.set(portId, replacement);
  return replacement;
}

export function snapshotWorldShipyards(system) {
  assertShipyardSystem(system);
  return {
    version: SHIPYARD_SNAPSHOT_VERSION,
    lastMinute: system.lastMinute,
    npcSales: system.npcSales.map((sale) => ({ ...sale })),
    yards: [...system.yards.values()].map((yard) => ({
      portId: yard.portId,
      buildNumber: yard.buildNumber,
      listing: yard.listing ? { ...yard.listing } : null,
      nextBuildMinute: yard.nextBuildMinute,
      buildStartedMinute: yard.buildStartedMinute,
      materialDelayDays: yard.materialDelayDays,
      playerBacking: yard.playerBacking ? { ...yard.playerBacking } : null,
      playerDividendBalance: yard.playerDividendBalance,
      lifetimePlayerDividends: yard.lifetimePlayerDividends,
      playerPendingSales: yard.playerPendingSales.map((sale) => ({ ...sale })),
      playerAccounts: yard.playerAccounts ? snapshotPlayerShipyardAccounts(yard.playerAccounts) : null
    }))
  };
}

export function restoreWorldShipyards(system, snapshot, { seedKey = system?.seedKey } = {}) {
  assertShipyardSystem(system);
  validateOptionalSeedKey(seedKey, "restored shipyard");
  if (
    !snapshot ||
    ![1, 2, 3, 4, 5, SHIPYARD_SNAPSHOT_VERSION].includes(snapshot.version) ||
    !Array.isArray(snapshot.yards) ||
    (snapshot.version >= 3 && !Array.isArray(snapshot.npcSales))
  ) {
    throw new Error("Unsupported shipyard save data");
  }
  if (!Number.isFinite(snapshot.lastMinute)) throw new Error("Invalid saved shipyard minute");
  system.seedKey = seedKey;
  system.npcSales = snapshot.version >= 3
    ? snapshot.npcSales.map((sale) => restoreNpcSale(sale))
    : [];
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
    if (snapshot.version >= 3 && (
      !Number.isInteger(saved.materialDelayDays) || saved.materialDelayDays < 0 ||
      !Number.isInteger(saved.playerDividendBalance) || saved.playerDividendBalance < 0 ||
      !Number.isInteger(saved.lifetimePlayerDividends) || saved.lifetimePlayerDividends < 0 ||
      (snapshot.version >= 4 && !Array.isArray(saved.playerPendingSales)) ||
      (snapshot.version >= 5 && (
        !Number.isFinite(saved.buildStartedMinute) ||
        saved.buildStartedMinute > saved.nextBuildMinute ||
        Boolean(saved.playerBacking) !== Boolean(saved.playerAccounts)
      ))
    )) {
      throw new Error(`Invalid saved shipyard accounts: ${saved.portId}`);
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
    yard.materialDelayDays = snapshot.version >= 3 ? saved.materialDelayDays : 0;
    yard.playerBacking = snapshot.version >= 3 && saved.playerBacking
      ? restorePlayerBacking(saved.playerBacking, yard.portId)
      : null;
    yard.playerDividendBalance = snapshot.version >= 3 ? saved.playerDividendBalance : 0;
    yard.lifetimePlayerDividends = snapshot.version >= 3 ? saved.lifetimePlayerDividends : 0;
    yard.playerPendingSales = snapshot.version >= 4
      ? saved.playerPendingSales.map(restorePlayerPendingSale)
      : [];
    yard.buildStartedMinute = snapshot.version >= 5
      ? saved.buildStartedMinute
      : inferredShipyardBuildStartedMinute(yard);
    yard.playerAccounts = snapshot.version >= 5 && saved.playerAccounts
      ? migrateVersionFivePlayerShipyardAccounts(
          restorePlayerShipyardAccounts(saved.playerAccounts, yard),
          yard,
          snapshot.version
        )
      : migratePlayerShipyardAccounts(yard);
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

export function advanceWorldShipyards(system, simMinute, materialMarket = null) {
  assertShipyardSystem(system);
  if (!Number.isFinite(simMinute)) throw new Error(`Invalid shipyard minute: ${simMinute}`);
  if (simMinute <= system.lastMinute) return false;
  let changed = false;
  for (const yard of system.yards.values()) {
    if (yard.listing && simMinute >= yard.listing.expiresMinute) {
      completeShipyardSale(system, yard, yard.listing, "npc");
      yard.listing = null;
      changed = true;
    }
    while (simMinute >= yard.nextBuildMinute) {
      const buildMinute = yard.nextBuildMinute;
      const plannedListing = generateShipyardListing(yard, yard.buildNumber + 1, buildMinute);
      const materialResult = acquireShipbuildingMaterials(yard, plannedListing, materialMarket);
      if (!materialResult.ready) {
        yard.materialDelayDays += MATERIAL_RETRY_DAYS;
        yard.nextBuildMinute += MATERIAL_RETRY_DAYS * MINUTES_PER_DAY;
        changed = true;
        continue;
      }
      if (yard.listing) completeShipyardSale(system, yard, yard.listing, "npc", buildMinute);
      yard.buildNumber += 1;
      yard.listing = plannedListing;
      yard.materialDelayDays = 0;
      if (yard.playerBacking) recordPlayerShipyardConstruction(yard, plannedListing, buildMinute);
      yard.buildStartedMinute = buildMinute;
      yard.nextBuildMinute += shipyardBuildIntervalDays(yard, yard.buildNumber) * MINUTES_PER_DAY;
      changed = true;
    }
    if (yard.listing && simMinute >= yard.listing.expiresMinute) {
      completeShipyardSale(system, yard, yard.listing, "npc");
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
  completeShipyardSale(system, yard, listing, "player", system.lastMinute);
  yard.listing = null;
  return listing;
}

export function claimNpcShipyardSale(system, {
  portId,
  factionId,
  allowedSlugs,
  mode = "regional"
}) {
  assertShipyardSystem(system);
  if (!Number.isInteger(portId)) throw new Error(`NPC shipyard sale requires a port id: ${portId}`);
  if (typeof factionId !== "string" || factionId === "") throw new Error("NPC shipyard sale requires a faction");
  if (!Array.isArray(allowedSlugs) || allowedSlugs.length === 0) {
    throw new Error("NPC shipyard sale requires allowed hulls");
  }
  const allowed = new Set(allowedSlugs);
  const candidateIndex = system.npcSales.findIndex((sale) => (
    sale.portId === portId &&
    sale.factionId === factionId &&
    allowed.has(sale.shipSlug) &&
    (mode === "regional" || shipStatsForSlug(sale.shipSlug).seaworthiness >= 5)
  ));
  if (candidateIndex < 0) return null;
  return system.npcSales.splice(candidateIndex, 1)[0];
}

export function npcShipyardSales(system) {
  assertShipyardSystem(system);
  return system.npcSales.slice();
}

export function claimNpcShipyardSaleById(system, saleId) {
  assertShipyardSystem(system);
  if (typeof saleId !== "string" || saleId === "") throw new Error("NPC shipyard sale requires an id");
  const index = system.npcSales.findIndex((sale) => sale.id === saleId);
  if (index < 0) throw new Error(`NPC shipyard sale is missing: ${saleId}`);
  return system.npcSales.splice(index, 1)[0];
}

export function fundPlayerShipyard(system, port, {
  investedMinute,
  seedCapital,
  materialContributions
}) {
  const yard = shipyardAtPort(system, port);
  if (yard.playerBacking) throw new Error(`${yard.portName} shipyard is already player-backed`);
  if (!Number.isFinite(investedMinute)) throw new Error(`Invalid shipyard investment minute: ${investedMinute}`);
  if (!Number.isInteger(seedCapital) || seedCapital < 100000) {
    throw new Error(`Shipyard seed capital must be at least 100000 doubloons: ${seedCapital}`);
  }
  for (const goodId of SHIPBUILDING_MATERIAL_GOOD_IDS) {
    if (!Number.isInteger(materialContributions?.[goodId]) || materialContributions[goodId] <= 0) {
      throw new Error(`Shipyard investment requires ${goodId}`);
    }
  }
  yard.playerBacking = Object.freeze({
    investedMinute,
    seedCapital,
    materialContributions: Object.freeze({ ...materialContributions })
  });
  yard.playerAccounts = createPlayerShipyardAccounts(yard.playerBacking);
  yard.famous = true;
  const acceleratedBuildMinute = investedMinute + 90 * MINUTES_PER_DAY;
  if (acceleratedBuildMinute < yard.nextBuildMinute) {
    yard.buildStartedMinute = investedMinute;
    yard.nextBuildMinute = acceleratedBuildMinute;
  }
  return yard;
}

export function claimPlayerShipyardPayout(system, port) {
  const yard = shipyardAtPort(system, port);
  const amount = yard.playerDividendBalance;
  if (!Number.isInteger(amount) || amount < 0) throw new Error(`Invalid shipyard dividend balance: ${amount}`);
  const sales = yard.playerPendingSales.map((sale) => Object.freeze({ ...sale }));
  if (amount > 0) recordPlayerShipyardPayout(yard, amount, system.lastMinute);
  yard.playerDividendBalance = 0;
  yard.playerPendingSales = [];
  return Object.freeze({ amount, sales });
}

export function playerShipyardLedger(yard, simMinute) {
  if (!yard?.playerBacking || !yard.playerAccounts) {
    throw new Error("Player shipyard ledger requires a player-backed yard");
  }
  if (!Number.isFinite(simMinute)) throw new Error(`Invalid shipyard ledger minute: ${simMinute}`);
  const plannedListing = generateShipyardListing(
    yard,
    yard.buildNumber + 1,
    yard.nextBuildMinute
  );
  const buildDuration = Math.max(1, yard.nextBuildMinute - yard.buildStartedMinute);
  const progress = clamp((simMinute - yard.buildStartedMinute) / buildDuration, 0, 1);
  const accounts = yard.playerAccounts;
  const constructionCost = playerBackedConstructionCost(plannedListing);
  const workInProgressExpenses = Math.round(constructionCost * progress);
  const constructionExpenses = accounts.constructionExpenses + workInProgressExpenses;
  const cashBalance = accounts.capitalContributions + accounts.salesRevenue -
    constructionExpenses - accounts.playerPayouts;
  const journalEntries = accounts.entries.map((entry) => Object.freeze({ ...entry }));
  if (workInProgressExpenses > 0) {
    journalEntries.push(Object.freeze({
      id: `yard-account-work-in-progress-${yard.buildNumber + 1}`,
      kind: "construction-progress",
      simMinute,
      amount: -workInProgressExpenses,
      description: `${plannedListing.shipLabel} construction in progress`,
      shipSlug: plannedListing.shipSlug,
      progress
    }));
  }
  return Object.freeze({
    portId: yard.portId,
    portName: yard.portName,
    investedMinute: yard.playerBacking.investedMinute,
    materialContributions: Object.freeze({ ...yard.playerBacking.materialContributions }),
    currentBuild: Object.freeze({
      shipSlug: plannedListing.shipSlug,
      shipLabel: plannedListing.shipLabel,
      startedMinute: yard.buildStartedMinute,
      completeMinute: yard.nextBuildMinute,
      progress,
      constructionCost,
      accruedConstructionCost: workInProgressExpenses,
      daysRemaining: Math.max(0, Math.ceil((yard.nextBuildMinute - simMinute) / MINUTES_PER_DAY)),
      materialDelayDays: yard.materialDelayDays
    }),
    finishedShip: yard.listing ? Object.freeze({
      ...yard.listing,
      daysRemaining: Math.max(0, Math.ceil((yard.listing.expiresMinute - simMinute) / MINUTES_PER_DAY))
    }) : null,
    accounts: Object.freeze({
      capitalContributions: accounts.capitalContributions,
      salesRevenue: accounts.salesRevenue,
      constructionExpenses,
      postedConstructionExpenses: accounts.constructionExpenses,
      workInProgressExpenses,
      playerSharesEarned: yard.lifetimePlayerDividends,
      playerPayouts: accounts.playerPayouts,
      outstandingPlayerShare: yard.playerDividendBalance,
      cashBalance,
      entries: Object.freeze(journalEntries)
    })
  });
}

export function availablePlayerShipyardPayouts(system) {
  assertShipyardSystem(system);
  return Object.freeze([...system.yards.values()]
    .filter((yard) => yard.playerBacking && yard.playerDividendBalance > 0)
    .map((yard) => Object.freeze({
      portId: yard.portId,
      portName: yard.portName,
      amount: yard.playerDividendBalance
    }))
    .sort((a, b) => a.portId - b.portId));
}

export function shipbuildingMaterialRequirements(shipSlug) {
  const stats = shipStatsForSlug(shipSlug);
  return Object.freeze({
    timber: Math.max(2, Math.ceil((stats.mass + stats.cargoCapacity * 0.35) / 22)),
    iron: Math.max(1, Math.ceil((stats.mass * 0.18 + stats.cannons * 2.5) / 12)),
    "naval-stores": Math.max(1, Math.ceil((stats.mass + stats.seaworthiness * 5) / 45))
  });
}

export function shipyardDailyMaterialDemand(yard) {
  const representativeSlug = representativeShipyardHull(yard);
  const requirements = shipbuildingMaterialRequirements(representativeSlug);
  const intervalDays = shipyardBuildIntervalDays(yard, Math.max(1, yard.buildNumber + 1));
  return Object.freeze(Object.fromEntries(
    SHIPBUILDING_MATERIAL_GOOD_IDS.map((goodId) => [goodId, requirements[goodId] / intervalDays * 0.2])
  ));
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
  const localYard = shipyardAtPort(system, port);
  if (localYard.listing && (!eligiblePortIds || eligiblePortIds.has(localYard.portId))) {
    return shipyardListingNotice(localYard, localYard.listing, 0, true);
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
  return shipyardListingNotice(nearest.yard, nearest.listing, nearest.distanceKm, false);
}

function shipyardListingNotice(yard, listing, distanceKm, local) {
  return Object.freeze({
    portId: yard.portId,
    portName: yard.portName,
    shipSlug: listing.shipSlug,
    shipLabel: listing.shipLabel,
    shipProseLabel: shipLabelForProse(listing.shipSlug),
    price: listing.price,
    distanceKm: Math.round(distanceKm),
    local
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
  const masterworkChance = yard.playerBacking ? 0.42 : yard.famous ? 0.18 : 0.025;
  const scheduledMasterwork = yard.playerBacking
    ? buildNumber % 2 === 0
    : yard.famous && buildNumber % 4 === 0;
  const masterwork = scheduledMasterwork || hashUnit(`${seed}|masterwork`) < masterworkChance;
  const qualityBudget = masterwork ? Infinity : shipyardQualityBudget(yard);
  const eligible = pool
    .map((slug) => ({ slug, price: shipConstructionPrice(slug) }))
    .filter((entry) => entry.price <= qualityBudget)
    .sort((a, b) => a.price - b.price || a.slug.localeCompare(b.slug));
  const candidates = eligible.length > 0 ? eligible : [{ slug: pool[0], price: shipConstructionPrice(pool[0]) }];
  const wealthFraction = clamp(
    (yard.wealthScale - 0.45) / 3.75 + (yard.famous ? 0.3 : 0) + (yard.playerBacking ? 0.3 : 0),
    0,
    1
  );
  const roll = hashUnit(`${seed}|rank`);
  const rankFraction = Math.pow(roll, 1.75 - wealthFraction * 1.25);
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
  if (factionShips && JAPANESE_POLITY_FACTION_IDS.includes(yard.factionId)) return factionShips;
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
  const famousBonus = yard.famous ? 50000 : 0;
  const playerBonus = yard.playerBacking ? 60000 : 0;
  return 7000 + yard.wealthScale * 22000 + famousBonus + playerBonus;
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
    nextBuildMinute: startMinute,
    buildStartedMinute: startMinute,
    materialDelayDays: 0,
    playerBacking: null,
    playerDividendBalance: 0,
    lifetimePlayerDividends: 0,
    playerPendingSales: [],
    playerAccounts: null
  };
  const intervalDays = shipyardBuildIntervalDays(yard, 0);
  const listingDays = famous ? FAMOUS_LISTING_DAYS : NORMAL_LISTING_DAYS;
  const ageDays = hashUnit(shipyardSeedKey(seedKey, `${portId}|shipyard-phase`)) * intervalDays;
  const previousBuildMinute = startMinute - ageDays * MINUTES_PER_DAY;
  if (ageDays < listingDays) yard.listing = generateShipyardListing(yard, 0, previousBuildMinute);
  yard.buildStartedMinute = previousBuildMinute;
  yard.nextBuildMinute = previousBuildMinute + intervalDays * MINUTES_PER_DAY;
  return yard;
}

function shipyardBuildIntervalDays(yard, buildNumber) {
  const base = yard.famous ? FAMOUS_BUILD_INTERVAL_DAYS : NORMAL_BUILD_INTERVAL_DAYS;
  const wealthFactor = clamp(yard.wealthScale, 0.65, 2.8);
  const variation = 0.78 + hashUnit(
    shipyardSeedKey(yard.seedKey, `${yard.portId}|${buildNumber}|interval`)
  ) * 0.44;
  const backingFactor = yard.playerBacking ? PLAYER_BACKED_BUILD_INTERVAL_MULTIPLIER : 1;
  return Math.max(120, Math.round(base / wealthFactor * variation * backingFactor));
}

function representativeShipyardHull(yard) {
  const pool = [...new Set(shipPoolForYard(yard))].sort((a, b) => (
    shipConstructionPrice(a) - shipConstructionPrice(b) || a.localeCompare(b)
  ));
  return pool[Math.floor((pool.length - 1) * (yard.playerBacking ? 0.85 : yard.famous ? 0.65 : 0.4))];
}

function acquireShipbuildingMaterials(yard, listing, materialMarket) {
  if (!materialMarket) return { ready: true, emergencyProcurement: false };
  if (typeof materialMarket.available !== "function" || typeof materialMarket.consume !== "function") {
    throw new Error("Shipyard material market requires available and consume functions");
  }
  const requirements = shipbuildingMaterialRequirements(listing.shipSlug);
  const missing = SHIPBUILDING_MATERIAL_GOOD_IDS.filter((goodId) => (
    materialMarket.available(yard.portId, goodId) + 1e-9 < requirements[goodId]
  ));
  if (missing.length > 0 && yard.materialDelayDays < MAX_MATERIAL_DELAY_DAYS) {
    return { ready: false, missing };
  }
  for (const goodId of SHIPBUILDING_MATERIAL_GOOD_IDS) {
    const available = Math.max(0, materialMarket.available(yard.portId, goodId));
    const quantity = Math.min(requirements[goodId], available);
    if (quantity > 0) materialMarket.consume(yard.portId, goodId, quantity);
  }
  return { ready: true, emergencyProcurement: missing.length > 0 };
}

function completeShipyardSale(system, yard, listing, buyer, soldMinute = listing.expiresMinute) {
  if (buyer !== "player" && buyer !== "npc") throw new Error(`Unknown shipyard buyer: ${buyer}`);
  if (yard.playerBacking) {
    const dividend = Math.max(100, Math.round(listing.price * PLAYER_BACKED_DIVIDEND_RATE / 100) * 100);
    yard.playerDividendBalance += dividend;
    yard.lifetimePlayerDividends += dividend;
    yard.playerPendingSales.push(Object.freeze({
      id: `${listing.id}:${buyer}-player-share`,
      shipSlug: listing.shipSlug,
      price: listing.price,
      dividend,
      buyer,
      soldMinute
    }));
    if (yard.playerPendingSales.length > 64) {
      yard.playerPendingSales.splice(0, yard.playerPendingSales.length - 64);
    }
    recordPlayerShipyardSale(yard, listing, buyer, dividend, soldMinute);
  }
  if (buyer === "npc") {
    system.npcSales.push(Object.freeze({
      id: `${listing.id}:npc-sale`,
      portId: yard.portId,
      factionId: yard.factionId,
      shipSlug: listing.shipSlug,
      price: listing.price,
      soldMinute
    }));
    if (system.npcSales.length > 512) system.npcSales.splice(0, system.npcSales.length - 512);
  }
}

function createPlayerShipyardAccounts(backing) {
  const accounts = {
    capitalContributions: backing.seedCapital,
    salesRevenue: 0,
    constructionExpenses: 0,
    playerPayouts: 0,
    nextEntryNumber: 1,
    entries: []
  };
  appendPlayerShipyardAccountEntry(accounts, {
    kind: "capital",
    simMinute: backing.investedMinute,
    amount: backing.seedCapital,
    description: "Owner's seed capital",
    materialContributions: backing.materialContributions
  });
  return accounts;
}

function recordPlayerShipyardConstruction(yard, listing, simMinute) {
  const accounts = requiredPlayerShipyardAccounts(yard);
  const cost = playerBackedConstructionCost(listing);
  accounts.constructionExpenses += cost;
  appendPlayerShipyardAccountEntry(accounts, {
    kind: "construction",
    simMinute,
    amount: -cost,
    description: `${listing.shipLabel} construction`,
    shipSlug: listing.shipSlug,
    materials: shipbuildingMaterialRequirements(listing.shipSlug)
  });
}

function playerBackedConstructionCost(listing) {
  if (!listing || !Number.isInteger(listing.price) || listing.price <= 0) {
    throw new Error(`Invalid player-backed ship construction price: ${listing?.price}`);
  }
  return roundToHundred(listing.price * PLAYER_BACKED_CONSTRUCTION_COST_RATE);
}

function recordPlayerShipyardSale(yard, listing, buyer, dividend, simMinute) {
  const accounts = requiredPlayerShipyardAccounts(yard);
  accounts.salesRevenue += listing.price;
  appendPlayerShipyardAccountEntry(accounts, {
    kind: "sale",
    simMinute,
    amount: listing.price,
    description: `${listing.shipLabel} sold`,
    shipSlug: listing.shipSlug,
    buyer,
    playerShare: dividend
  });
}

function recordPlayerShipyardPayout(yard, amount, simMinute) {
  const accounts = requiredPlayerShipyardAccounts(yard);
  accounts.playerPayouts += amount;
  appendPlayerShipyardAccountEntry(accounts, {
    kind: "payout",
    simMinute,
    amount: -amount,
    description: "Owner's share paid"
  });
}

function requiredPlayerShipyardAccounts(yard) {
  if (!yard.playerAccounts) throw new Error(`Player-backed shipyard has no accounts: ${yard.portId}`);
  return yard.playerAccounts;
}

function appendPlayerShipyardAccountEntry(accounts, entry) {
  const id = `yard-account-${accounts.nextEntryNumber}`;
  accounts.nextEntryNumber += 1;
  accounts.entries.push(Object.freeze({ id, ...entry }));
  if (accounts.entries.length > MAX_PLAYER_ACCOUNT_ENTRIES) {
    accounts.entries.splice(0, accounts.entries.length - MAX_PLAYER_ACCOUNT_ENTRIES);
  }
}

function snapshotPlayerShipyardAccounts(accounts) {
  return {
    capitalContributions: accounts.capitalContributions,
    salesRevenue: accounts.salesRevenue,
    constructionExpenses: accounts.constructionExpenses,
    playerPayouts: accounts.playerPayouts,
    nextEntryNumber: accounts.nextEntryNumber,
    entries: accounts.entries.map(copyPlayerShipyardAccountEntry)
  };
}

function copyPlayerShipyardAccounts(accounts) {
  return {
    ...snapshotPlayerShipyardAccounts(accounts),
    entries: accounts.entries.map((entry) => Object.freeze(copyPlayerShipyardAccountEntry(entry)))
  };
}

function copyPlayerShipyardAccountEntry(entry) {
  return {
    ...entry,
    ...(entry.materialContributions
      ? { materialContributions: { ...entry.materialContributions } }
      : {}),
    ...(entry.materials ? { materials: { ...entry.materials } } : {})
  };
}

function restorePlayerShipyardAccounts(saved, yard) {
  for (const key of ["capitalContributions", "salesRevenue", "constructionExpenses", "playerPayouts"]) {
    if (!Number.isInteger(saved[key]) || saved[key] < 0) {
      throw new Error(`Invalid saved shipyard account ${key}: ${yard.portId}`);
    }
  }
  if (!Number.isInteger(saved.nextEntryNumber) || saved.nextEntryNumber < 1 || !Array.isArray(saved.entries)) {
    throw new Error(`Invalid saved shipyard account journal: ${yard.portId}`);
  }
  const accounts = {
    capitalContributions: saved.capitalContributions,
    salesRevenue: saved.salesRevenue,
    constructionExpenses: saved.constructionExpenses,
    playerPayouts: saved.playerPayouts,
    nextEntryNumber: saved.nextEntryNumber,
    entries: saved.entries.map((entry) => restorePlayerShipyardAccountEntry(entry, yard.portId))
  };
  if (accounts.playerPayouts > yard.lifetimePlayerDividends) {
    throw new Error(`Shipyard payouts exceed earned shares: ${yard.portId}`);
  }
  return accounts;
}

function restorePlayerShipyardAccountEntry(entry, portId) {
  if (!entry || typeof entry.id !== "string" || !["capital", "construction", "sale", "payout", "legacy"].includes(entry.kind) ||
      !Number.isFinite(entry.simMinute) || !Number.isInteger(entry.amount) ||
      typeof entry.description !== "string" || entry.description === "") {
    throw new Error(`Invalid saved shipyard account entry: ${portId}`);
  }
  if (entry.legacyAccount !== undefined &&
      !["sales", "construction", "payouts"].includes(entry.legacyAccount)) {
    throw new Error(`Invalid saved shipyard legacy account: ${portId}`);
  }
  if (entry.shipSlug) shipStatsForSlug(entry.shipSlug);
  return Object.freeze(copyPlayerShipyardAccountEntry(entry));
}

function migratePlayerShipyardAccounts(yard) {
  if (!yard.playerBacking) return null;
  const accounts = createPlayerShipyardAccounts(yard.playerBacking);
  const pendingRevenue = yard.playerPendingSales.reduce((sum, sale) => sum + sale.price, 0);
  const paidShares = yard.lifetimePlayerDividends - yard.playerDividendBalance;
  const inferredRevenue = inferredSalesRevenueForPlayerShare(yard.lifetimePlayerDividends);
  const historicalRevenue = Math.max(pendingRevenue, inferredRevenue);
  const historicalConstruction = roundToHundred(
    historicalRevenue * PLAYER_BACKED_CONSTRUCTION_COST_RATE
  );
  if (historicalRevenue > 0) accounts.salesRevenue = historicalRevenue;
  if (historicalConstruction > 0) accounts.constructionExpenses = historicalConstruction;
  if (paidShares > 0) accounts.playerPayouts = paidShares;
  appendMigratedPlayerShipyardEntries(accounts, yard.playerBacking.investedMinute, {
    revenue: historicalRevenue,
    construction: historicalConstruction,
    payouts: paidShares
  });
  return accounts;
}

function migrateVersionFivePlayerShipyardAccounts(accounts, yard, snapshotVersion) {
  if (snapshotVersion !== 5) return accounts;
  const retainedEntries = accounts.entries.filter((entry) => (
    entry.kind !== "legacy" || entry.description !== "Earlier shipyard accounts"
  ));
  const explicitRevenue = retainedEntries.reduce((sum, entry) => (
    sum + (entry.kind === "sale" ? entry.amount : 0)
  ), 0);
  const explicitConstruction = retainedEntries.reduce((sum, entry) => (
    sum + (entry.kind === "construction" ? -entry.amount : 0)
  ), 0);
  const explicitPayouts = retainedEntries.reduce((sum, entry) => (
    sum + (entry.kind === "payout" ? -entry.amount : 0)
  ), 0);
  const explicitPlayerShares = retainedEntries.reduce((sum, entry) => (
    sum + (entry.kind === "sale" ? entry.playerShare || 0 : 0)
  ), 0);
  const historicalShares = Math.max(0, yard.lifetimePlayerDividends - explicitPlayerShares);
  const recordedHistoricalRevenue = Math.max(0, accounts.salesRevenue - explicitRevenue);
  const historicalRevenue = Math.max(
    recordedHistoricalRevenue,
    inferredSalesRevenueForPlayerShare(historicalShares)
  );
  const recordedHistoricalConstruction = Math.max(
    0,
    accounts.constructionExpenses - explicitConstruction
  );
  const historicalConstruction = Math.max(
    recordedHistoricalConstruction,
    roundToHundred(historicalRevenue * PLAYER_BACKED_CONSTRUCTION_COST_RATE)
  );
  const historicalPayouts = Math.max(0, accounts.playerPayouts - explicitPayouts);
  accounts.salesRevenue = explicitRevenue + historicalRevenue;
  accounts.constructionExpenses = explicitConstruction + historicalConstruction;
  accounts.playerPayouts = explicitPayouts + historicalPayouts;
  accounts.entries = retainedEntries;
  appendMigratedPlayerShipyardEntries(accounts, yard.playerBacking.investedMinute, {
    revenue: historicalRevenue,
    construction: historicalConstruction,
    payouts: historicalPayouts
  });
  accounts.entries.sort((a, b) => a.simMinute - b.simMinute);
  return accounts;
}

function inferredSalesRevenueForPlayerShare(playerShare) {
  if (!Number.isInteger(playerShare) || playerShare < 0) {
    throw new Error(`Invalid historical shipyard player share: ${playerShare}`);
  }
  return playerShare === 0
    ? 0
    : roundToHundred(playerShare / PLAYER_BACKED_DIVIDEND_RATE);
}

function appendMigratedPlayerShipyardEntries(accounts, simMinute, amounts) {
  const entries = [
    ["sales", amounts.revenue, "Earlier ship sales (estimated)"],
    ["construction", -amounts.construction, "Earlier shipbuilding costs (estimated)"],
    ["payouts", -amounts.payouts, "Earlier owner dividends"]
  ];
  for (const [legacyAccount, amount, description] of entries) {
    if (amount === 0) continue;
    appendPlayerShipyardAccountEntry(accounts, {
      kind: "legacy",
      legacyAccount,
      simMinute,
      amount,
      description
    });
  }
}

function inferredShipyardBuildStartedMinute(yard) {
  return yard.nextBuildMinute - shipyardBuildIntervalDays(yard, yard.buildNumber) * MINUTES_PER_DAY;
}

function restoreNpcSale(sale) {
  if (!sale || typeof sale.id !== "string" || !Number.isInteger(sale.portId) ||
      typeof sale.factionId !== "string" || typeof sale.shipSlug !== "string" ||
      !Number.isInteger(sale.price) || !Number.isFinite(sale.soldMinute)) {
    throw new Error("Invalid saved NPC shipyard sale");
  }
  shipStatsForSlug(sale.shipSlug);
  return Object.freeze({ ...sale });
}

function restorePlayerPendingSale(sale) {
  if (!sale || typeof sale.id !== "string" || typeof sale.shipSlug !== "string" ||
      !Number.isInteger(sale.price) || sale.price <= 0 ||
      !Number.isInteger(sale.dividend) || sale.dividend <= 0 ||
      !["player", "npc"].includes(sale.buyer) || !Number.isFinite(sale.soldMinute)) {
    throw new Error("Invalid saved player shipyard sale");
  }
  shipStatsForSlug(sale.shipSlug);
  return Object.freeze({ ...sale });
}

function restorePlayerBacking(backing, portId) {
  if (!Number.isFinite(backing.investedMinute) || !Number.isInteger(backing.seedCapital) ||
      backing.seedCapital < 100000 || !backing.materialContributions) {
    throw new Error(`Invalid player-backed shipyard at ${portId}`);
  }
  for (const goodId of SHIPBUILDING_MATERIAL_GOOD_IDS) {
    if (!Number.isInteger(backing.materialContributions[goodId]) || backing.materialContributions[goodId] <= 0) {
      throw new Error(`Invalid player-backed shipyard material at ${portId}: ${goodId}`);
    }
  }
  return Object.freeze({
    investedMinute: backing.investedMinute,
    seedCapital: backing.seedCapital,
    materialContributions: Object.freeze({ ...backing.materialContributions })
  });
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
  if (!system || system.version !== 1 || !(system.yards instanceof Map) || !Array.isArray(system.npcSales) ||
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
