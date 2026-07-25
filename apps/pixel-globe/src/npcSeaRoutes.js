import {
  WEATHER_DAYS,
  WEATHER_MINUTES_PER_DAY,
  dateToSubsolarLatDeg,
  windAtLatLonDeg
} from "./weather.js";
import {
  SHIP_PROPULSION_OAR,
  SHIP_PROPULSION_OAR_SAIL,
  reconcileShipHullForCurrentStats,
  shipHullResistsDamage,
  shipStatsForSlug
} from "./shipStats.js";
import { HYBRID_ROUTE_PROGRESS_FLOOR } from "./shipPropulsion.js";
import {
  NEUTRAL_FACTION_ID,
  PIRATE_FACTION_ID,
  assertFactionId,
  diplomacyBetween,
  migrateFactionIdTo1522
} from "./factions.js";
import {
  WHALE_BLUBBER_GOOD_ID,
  cargoSaleValue,
  executePortPurchase,
  executePortSale,
  maximumPortPurchaseQuantity,
  maximumPortSaleQuantity,
  planNpcTrade,
  quotePortPurchase,
  tradeGoodById
} from "./economy.js";
import {
  NPC_WHALING_MIN_LIVING_POPULATION,
  harvestWhaleForNpc,
  validateWhaleMemory,
  whaleBlubberYield
} from "./whaleSystem.js";
import {
  fisheryForHabitat,
  harvestFishery
} from "./fishEcology.js";
import {
  fishingNetById,
  npcFishingNetExpectedHaul,
  npcFishingNetForSeed
} from "./fishingNets.js";
import { defaultSovereignTradeGrantedToFaction } from "./sovereignTradeAccess.js";
import {
  PORTUGUESE_CARTAZ_DURATION_DAYS,
  PORTUGUESE_FACTION_ID,
  evaluateTradeAccess,
  portugueseCartazFee,
  portugueseCartazRequired,
  tradeTerms
} from "./tradePolicy.js";
import { validateForeignSettlementExpulsionMemory } from "./foreignSettlements.js";
import {
  createSuzeraintyMemory,
  suzeraintyTradePrivilege,
  validateSuzeraintyMemory
} from "./suzerainty.js";

const EARTH_RADIUS_KM = 6371;
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const ROUTE_MONTHS = 12;
const ROUTE_MONTH_DAYS = WEATHER_DAYS / ROUTE_MONTHS;
const ROUTE_MONTH_MINUTES = ROUTE_MONTH_DAYS * WEATHER_MINUTES_PER_DAY;
const ROUTE_MAX_MONTH_STEPS = 18;
const ROUTE_CACHE_LIMIT = 1800;
export const NPC_SEA_ROUTE_SNAPSHOT_VERSION = 2;
const ROUTE_WIND_SEED = 90210;
const NPC_FLEET_TARGET = 192;
export const NPC_WHALER_FLEET_TARGET = 5;
const NPC_ROUTE_WAIT_HOP_THRESHOLD_DAYS = 34;
const NPC_ROUTE_HOP_MAX_DAYS = 19;
const NPC_ROUTE_HOP_MAX_KM = 1650;
const NPC_MIN_TRIP_DISTANCE_KM = 180;
const NPC_ROUTE_MIN_DURATION_DAYS = 0.45;
const PIRATE_HIDEOUT_PORT_FRACTION = 0.06;
const PIRATE_HIDEOUT_MIN_COUNT = 2;
const PIRATE_HIDEOUT_MAX_COUNT = 14;
const PIRATE_HIDEOUT_VISIT_PERCENT = 16;
const PIRATE_HIDEOUT_RETREAT_HULL_RATIO = 0.5;
const PIRATE_HIDEOUT_MIN_STAY_MINUTES = 18 * 60;
const PIRATE_HIDEOUT_STAY_SPREAD_MINUTES = 30 * 60;
const PIRATE_HIDEOUT_DANGER_RADIUS_KM = 120;
const PIRATE_HIDEOUT_DANGER_HOLD_MINUTES = 6 * 60;
export const MAJOR_PORT_PROTECTION_POPULATION = 80000;
const NPC_FISH_GOOD_ID = "fish";
const NPC_REPLACEMENT_MIN_DAYS = 90;
const NPC_REPLACEMENT_BASE_DAYS = 260;
const NPC_REPLACEMENT_SPREAD_DAYS = 220;
const FISHING_GROUND_TARGET = 220;
const FISHING_GROUND_SAMPLE_DISTANCES_KM = Object.freeze([220, 520, 1100, 2100, 3400]);
const FISHING_GROUND_SAMPLE_BEARINGS_DEG = Object.freeze([0, 45, 90, 135, 180, 225, 270, 315]);
const FISHING_GROUND_MIN_EXPECTED_CATCH = 1;
const FISHING_GROUND_TRAVEL_COST_PER_KM = 0.035;
const FISHING_GROUND_LONG_RANGE_COST_PER_KM = 0.018;
const FISHING_GROUND_CATCH_RATIO = 0.72;
const NPC_WHALING_COOLDOWN_MINUTES = 60 * WEATHER_MINUTES_PER_DAY;
const NPC_WHALING_RANGE_RAD = 1200 / EARTH_RADIUS_KM;
const routeSegmentVectorCache = new WeakMap();

export const NPC_ROLE_MERCHANT = "merchant";
export const NPC_ROLE_FISHERMAN = "fisherman";
export const NPC_ROLE_WHALER = "whaler";
export const NPC_ROLE_WARSHIP = "warship";
export const NPC_ROLE_PIRATE = "pirate";

export function npcPortHasMajorProtection(port) {
  return Boolean(port?.isFactionCapital) || Number(port?.population || 0) >= MAJOR_PORT_PROTECTION_POPULATION;
}

const NPC_ROLE_SET = new Set([
  NPC_ROLE_MERCHANT,
  NPC_ROLE_FISHERMAN,
  NPC_ROLE_WHALER,
  NPC_ROLE_WARSHIP,
  NPC_ROLE_PIRATE
]);
export const PIRATE_SHIP_SLUGS = Object.freeze([
  "cutter",
  "brigantine",
  "pirate-brig",
  "galleon"
]);
const JOSEON_TURTLE_SHIP_SLUG = "joseon-turtle-ship";
const JAPANESE_ATAKEBUNE_SLUG = "japanese-atakebune";
const PORTUGUESE_CARRACK_SLUG = "portuguese-carrack";
const NUSANTARAN_OUTRIGGER_SLUG = "nusantaran-outrigger";
const KELULUS_SLUG = "kelulus";
const PENJAJAP_SLUG = "penjajap";
const LANCARAN_SLUG = "lancaran";
const ROYAL_LANCARAN_SLUG = "royal-lancaran";
const OTTOMAN_COASTAL_TRADER_SLUG = "ottoman-coastal-trader";
const EAST_ASIAN_FACTION_WARSHIPS = Object.freeze({
  joseon: JOSEON_TURTLE_SHIP_SLUG,
  japan: JAPANESE_ATAKEBUNE_SLUG
});

const WHALER_PROFILES = Object.freeze([
  whalerProfile(
    "north-atlantic-whalers",
    2,
    ["fishing-lugger", "cutter", "small-cog"],
    ["biscay", "norwegian-sea", "north-atlantic", "newfoundland"],
    isNorthAtlanticWhalingPort,
    2
  ),
  whalerProfile(
    "japanese-coastal-whalers",
    2,
    ["sampan", "small-junk"],
    ["kii-coast", "sanriku"],
    isJapaneseWhalingPort,
    1
  ),
  whalerProfile(
    "northwest-coast-whalers",
    1,
    ["mesoamerican-dugout-canoe"],
    ["nootka-sound"],
    isNorthwestCoastWhalingPort,
    2
  )
]);
const WHALER_PROFILE_BY_ID = new Map(WHALER_PROFILES.map((profileSpec) => [profileSpec.id, profileSpec]));
if (WHALER_PROFILE_BY_ID.size !== WHALER_PROFILES.length) {
  throw new Error("NPC whaler profile ids must be unique");
}
if (WHALER_PROFILES.reduce((total, profileSpec) => total + profileSpec.count, 0) !== NPC_WHALER_FLEET_TARGET) {
  throw new Error(`NPC whaler profiles must total ${NPC_WHALER_FLEET_TARGET} ships`);
}

const WHALING_GROUND_SPECS = Object.freeze([
  Object.freeze({ id: "biscay", label: "Bay of Biscay whaling grounds", lat: 45.8, lon: -8.5, routeRegion: "europe", routeAnchors: ["biscay"] }),
  Object.freeze({ id: "norwegian-sea", label: "Norwegian Sea whaling grounds", lat: 63.0, lon: 1.5, routeRegion: "europe", routeAnchors: ["north-sea"] }),
  Object.freeze({ id: "north-atlantic", label: "North Atlantic whaling grounds", lat: 52.0, lon: -25.0, routeRegion: "europe", routeAnchors: ["biscay", "north-sea"] }),
  Object.freeze({ id: "newfoundland", label: "Newfoundland whaling grounds", lat: 49.5, lon: -48.0, routeRegion: "americas", routeAnchors: ["caribbean", "biscay"] }),
  Object.freeze({ id: "kii-coast", label: "Kii coast whaling grounds", lat: 33.1, lon: 135.7, routeRegion: "east-asia", routeAnchors: ["nagasaki"] }),
  Object.freeze({ id: "sanriku", label: "Sanriku whaling grounds", lat: 39.0, lon: 142.5, routeRegion: "east-asia", routeAnchors: ["nagasaki"] }),
  Object.freeze({ id: "nootka-sound", label: "Nootka Sound whaling grounds", lat: 49.2, lon: -128.0, routeRegion: "americas", routeAnchors: ["yuquot"] })
]);

const LANE_NODES = Object.freeze([
  laneNode("north-sea", "North Sea", 52.2, 3.4),
  laneNode("biscay", "Bay of Biscay", 45.2, -8.2),
  laneNode("gibraltar", "Gibraltar", 35.9, -5.5),
  laneNode("sicily", "Sicily Channel", 36.8, 13.4),
  laneNode("alexandria", "Alexandria Roads", 31.0, 29.2),
  laneNode("constantinople", "Constantinople", 41.0, 29.0),
  laneNode("venice", "Venice Lagoon", 45.2, 12.5),
  laneNode("canaries", "Canaries", 28.1, -16.1),
  laneNode("cape-verde", "Cape Verde", 15.4, -23.8),
  laneNode("guinea", "Guinea Coast", 5.1, -2.2),
  laneNode("brazil-bulge", "Brazil Bulge", -7.5, -34.5),
  laneNode("south-atlantic-turn", "South Atlantic Turn", -31.0, -18.0),
  laneNode("goodhope", "Cape of Good Hope", -34.4, 18.5),
  laneNode("mozambique", "Mozambique Channel", -18.2, 41.5),
  laneNode("zanzibar", "Zanzibar", -6.2, 39.3),
  laneNode("red-sea", "Red Sea", 19.0, 39.2),
  laneNode("aden", "Aden", 12.3, 44.7),
  laneNode("hormuz", "Hormuz", 26.4, 56.3),
  laneNode("arabian-sea", "Arabian Sea", 14.0, 62.0),
  laneNode("goa", "Goa Coast", 15.1, 73.6),
  laneNode("ceylon", "Ceylon", 6.5, 80.0),
  laneNode("malacca", "Strait of Malacca", 2.2, 101.0),
  laneNode("singapore", "Singapore Strait", 1.1, 104.1),
  laneNode("sunda", "Sunda Strait", -6.1, 105.8),
  laneNode("manila", "Manila Bay", 14.5, 120.8),
  laneNode("canton", "Pearl River", 22.4, 113.8),
  laneNode("nagasaki", "Nagasaki", 32.7, 129.8),
  laneNode("yuquot", "Yuquot", 49.6, -126.6),
  laneNode("new-guinea", "New Guinea", -6.0, 147.0),
  laneNode("fiji", "Fiji", -18.0, 178.0),
  laneNode("tahiti", "Tahiti", -17.5, -149.5),
  laneNode("caribbean", "Caribbean", 18.4, -67.0),
  laneNode("havana", "Havana", 23.1, -82.4),
  laneNode("magellan", "Magellan", -53.2, -70.9)
]);

const LANE_EDGES = Object.freeze([
  laneEdge("north-sea", "biscay", "coastal"),
  laneEdge("biscay", "gibraltar", "coastal"),
  laneEdge("gibraltar", "sicily", "strait"),
  laneEdge("sicily", "alexandria", "coastal"),
  laneEdge("sicily", "venice", "coastal"),
  laneEdge("alexandria", "constantinople", "coastal"),
  laneEdge("gibraltar", "canaries", "coastal"),
  laneEdge("canaries", "cape-verde", "bluewater"),
  laneEdge("cape-verde", "guinea", "coastal"),
  laneEdge("guinea", "goodhope", "coastal"),
  laneEdge("cape-verde", "brazil-bulge", "bluewater"),
  laneEdge("brazil-bulge", "south-atlantic-turn", "bluewater"),
  laneEdge("south-atlantic-turn", "goodhope", "bluewater"),
  laneEdge("canaries", "caribbean", "bluewater"),
  laneEdge("cape-verde", "caribbean", "bluewater"),
  laneEdge("caribbean", "havana", "coastal"),
  laneEdge("brazil-bulge", "caribbean", "bluewater"),
  laneEdge("south-atlantic-turn", "magellan", "bluewater"),
  laneEdge("goodhope", "mozambique", "bluewater"),
  laneEdge("goodhope", "zanzibar", "bluewater"),
  laneEdge("mozambique", "zanzibar", "coastal"),
  laneEdge("zanzibar", "aden", "monsoon"),
  laneEdge("aden", "red-sea", "strait"),
  laneEdge("aden", "arabian-sea", "monsoon"),
  laneEdge("hormuz", "arabian-sea", "monsoon"),
  laneEdge("arabian-sea", "goa", "monsoon"),
  laneEdge("goa", "ceylon", "coastal"),
  laneEdge("ceylon", "malacca", "monsoon"),
  laneEdge("malacca", "singapore", "strait"),
  laneEdge("singapore", "sunda", "strait"),
  laneEdge("singapore", "manila", "monsoon"),
  laneEdge("singapore", "canton", "monsoon"),
  laneEdge("sunda", "manila", "monsoon"),
  laneEdge("manila", "canton", "coastal"),
  laneEdge("canton", "nagasaki", "coastal"),
  laneEdge("sunda", "new-guinea", "bluewater"),
  laneEdge("manila", "new-guinea", "bluewater"),
  laneEdge("new-guinea", "fiji", "bluewater"),
  laneEdge("fiji", "tahiti", "bluewater"),
  laneEdge("tahiti", "magellan", "bluewater")
]);

const FLEET_PROFILES = Object.freeze([
  profile("pacific-islands", 6, {
    fishers: ["polynesian-voyaging-canoe"],
    merchants: ["polynesian-voyaging-canoe"],
    warships: ["polynesian-voyaging-canoe"]
  }, isPolynesianPort, "regional", nativeCoastalRoleWeights()),
  profile("mesoamerican-coast", 7, {
    fishers: ["mesoamerican-dugout-canoe"],
    merchants: ["mesoamerican-dugout-canoe"],
    warships: ["mesoamerican-dugout-canoe"]
  }, isMesoamericanVillagePort, "regional", mesoamericanVillageRoleWeights()),
  profile("east-asia", 34, {
    fishers: ["sampan", "small-junk"],
    merchants: ["sampan", "small-junk", "medium-junk", "large-junk"],
    warships: ["small-junk", "medium-junk", "large-junk"]
  }, isEastAsiaPort, "regional"),
  profile("southeast-asia", 10, {
    fishers: ["sampan", "dhow"],
    merchants: [
      KELULUS_SLUG,
      KELULUS_SLUG,
      PENJAJAP_SLUG,
      NUSANTARAN_OUTRIGGER_SLUG,
      "small-junk"
    ],
    warships: [
      PENJAJAP_SLUG,
      PENJAJAP_SLUG,
      LANCARAN_SLUG,
      LANCARAN_SLUG,
      ROYAL_LANCARAN_SLUG,
      "medium-junk"
    ]
  }, isSoutheastAsiaPort, "regional"),
  profile("indian-ocean", 28, {
    fishers: ["dhow", "felucca", "felucca"],
    merchants: ["dhow", "felucca", "dhow", "dhow"],
    warships: ["xebec", "xebec", "xebec"]
  }, isIndianOceanPort, "regional"),
  profile("mediterranean", 28, {
    fishers: ["fishing-lugger", "felucca", "cutter"],
    merchants: ["felucca", "xebec", "xebec"],
    warships: ["xebec", "xebec", "mediterranean-galley", "mediterranean-galley", "caravel", "galleon"]
  }, isMediterraneanPort, "regional"),
  profile("atlantic-coast", 30, {
    fishers: ["fishing-lugger", "cutter", "felucca"],
    merchants: ["cutter", "small-cog", "caravel", "caravel", "brigantine", "fluyt"],
    warships: ["square-rigged-caravel", "caravel", "brigantine", "pirate-brig", "galleon"]
  }, isAtlanticPort, "regional"),
  profile("cape-trade", 44, {
    fishers: ["fishing-lugger", "cutter", "dhow"],
    merchants: ["small-cog", "caravel", "caravel", "brigantine", "carrack", "fluyt", "galleon"],
    warships: ["caravel", "brigantine", "pirate-brig", "galleon", "ship-of-the-line"]
  }, isLongRangePort, "interregional"),
  profile("wide-world", 24, {
    fishers: ["fishing-lugger", "cutter", "dhow"],
    merchants: ["caravel", "caravel", "brigantine", "carrack", "fluyt", "galleon"],
    warships: ["brigantine", "pirate-brig", "galleon", "ship-of-the-line"]
  }, isWideWorldPort, "interregional")
]);

export const NPC_SHIP_SLUGS = Object.freeze([...new Set([
  ...FLEET_PROFILES.flatMap((profileSpec) => [
    ...profileSpec.fisherSlugs,
    ...profileSpec.merchantSlugs,
    ...profileSpec.warshipSlugs
  ]),
  ...WHALER_PROFILES.flatMap((profileSpec) => profileSpec.whalerSlugs),
  ...PIRATE_SHIP_SLUGS,
  ...Object.values(EAST_ASIAN_FACTION_WARSHIPS),
  PORTUGUESE_CARRACK_SLUG,
  OTTOMAN_COASTAL_TRADER_SLUG
])]);

export function createNpcSeaRouteSystem({
  ports,
  startMinute,
  economy,
  fishState = null,
  whaleMemory = null,
  seedKey = null,
  relationBetween = diplomacyBetween,
  foreignSettlementExpulsions = null,
  sovereignTradeOpenToFaction = defaultSovereignTradeOpenToFaction,
  suzeraintyMemory = createSuzeraintyMemory(startMinute),
  onForeignPortCall = null
}) {
  if (!Number.isFinite(startMinute) || startMinute < 0) {
    throw new Error(`NPC sea routes require a non-negative start minute: ${startMinute}`);
  }
  if (!economy) throw new Error("NPC sea routes require a world economy");
  if (whaleMemory !== null) validateWhaleMemory(whaleMemory);
  validateOptionalSeedKey(seedKey, "NPC routes");
  if (typeof relationBetween !== "function") throw new Error("NPC sea routes require a diplomacy resolver");
  if (foreignSettlementExpulsions !== null) {
    validateForeignSettlementExpulsionMemory(foreignSettlementExpulsions);
  }
  if (typeof sovereignTradeOpenToFaction !== "function") {
    throw new Error("NPC sea routes require a sovereign trade-access resolver");
  }
  validateSuzeraintyMemory(suzeraintyMemory);
  if (onForeignPortCall !== null && typeof onForeignPortCall !== "function") {
    throw new Error("NPC sea routes foreign port contact handler must be a function");
  }
  const usablePorts = ports
    .filter(isAnyUsablePort)
    .map(normalizeNpcRoutePort)
    .filter((port) => port.routeAnchors.length > 0);
  if (usablePorts.length < 8) {
    throw new Error(`NPC sea routes need at least 8 usable ports, got ${usablePorts.length}`);
  }

  const laneNodes = new Map(LANE_NODES.map((node) => [node.id, node]));
  const baseEdges = buildDirectedLaneEdges(laneNodes);
  const system = {
    ports: usablePorts,
    seedKey,
    economy,
    laneNodes,
    baseEdges,
    routeCache: new Map(),
    edgeCostCache: new Map(),
    relationBetween,
    foreignSettlementExpulsions,
    sovereignTradeOpenToFaction,
    suzeraintyMemory,
    onForeignPortCall,
    contactStartMinute: startMinute,
    fishState,
    fishingGrounds: fishState ? buildFishingGrounds(usablePorts, fishState, startMinute) : [],
    whaleMemory,
    whalingGrounds: whaleMemory ? buildWhalingGrounds() : [],
    pirateHideouts: choosePirateHideouts(usablePorts),
    pirateHideoutDangerUntil: new Map(),
    ships: [],
    shipById: new Map(),
    replacementQueue: []
  };
  system.ships = createNpcFleet(system, startMinute);
  synchronizeNpcWhalerFleet(system, startMinute);
  if (system.ships.length === 0) throw new Error("NPC sea routes created no ships");
  system.shipById = new Map(system.ships.map((ship) => [ship.id, ship]));
  if (system.shipById.size !== system.ships.length) throw new Error("NPC sea routes created duplicate ship ids");
  return system;
}

export function addNpcSeaRoutePort(system, port) {
  assertSaveableNpcRouteSystem(system);
  if (!isAnyUsablePort(port)) throw new Error(`NPC route port is unusable: ${portName(port)}`);
  if (system.ports.some((candidate) => candidate.tileId === port.tileId)) {
    throw new Error(`NPC route port already exists: ${port.tileId}`);
  }
  const normalized = normalizeNpcRoutePort(port);
  if (normalized.routeAnchors.length === 0) {
    throw new Error(`NPC route port has no sea-lane anchors: ${portName(port)}`);
  }
  system.ports.push(normalized);
  system.routeCache.clear();
  system.edgeCostCache.clear();
  return normalized;
}

export function npcSeaRouteHasPort(system, port) {
  assertSaveableNpcRouteSystem(system);
  if (!Number.isInteger(port?.tileId) || port.tileId < 0) {
    throw new Error("NPC route port lookup requires a tile id");
  }
  return system.ports.some((candidate) => candidate.tileId === port.tileId);
}

export function configureCaptureEncounter(system, spec, clockMinutes) {
  return configureNpcEncounter(system, spec, clockMinutes);
}

export function configureNpcEncounter(system, spec, clockMinutes) {
  assertSaveableNpcRouteSystem(system);
  if (!spec || typeof spec !== "object") throw new Error("NPC encounter specification is required");
  if (!Number.isFinite(clockMinutes)) throw new Error(`Invalid NPC encounter clock: ${clockMinutes}`);
  if (typeof spec.id !== "string" || spec.id.trim() === "") throw new Error("NPC encounter requires an id");
  if (!Number.isFinite(spec.headingDeg)) throw new Error(`Invalid NPC encounter heading: ${spec.id}`);
  if (system.shipById.has(spec.id)) throw new Error(`NPC encounter id already exists: ${spec.id}`);
  assertFactionId(spec.factionId);
  if (!NPC_ROLE_SET.has(spec.role)) throw new Error(`Unknown NPC encounter role: ${spec.role}`);
  if (spec.encounter !== undefined && (!spec.encounter || typeof spec.encounter !== "object")) {
    throw new Error(`Invalid NPC encounter metadata: ${spec.id}`);
  }
  if (spec.specie !== undefined && (!Number.isFinite(spec.specie) || spec.specie < 0)) {
    throw new Error(`Invalid NPC encounter specie: ${spec.id}`);
  }
  if (spec.durationDays !== undefined && (!Number.isFinite(spec.durationDays) || spec.durationDays <= 0)) {
    throw new Error(`Invalid NPC encounter duration: ${spec.id}`);
  }
  const stats = shipStatsForSlug(spec.shipSlug);
  const origin = capturePoint(spec.lat, spec.lon, `${spec.id}-origin`, {
    routeRegion: spec.routeRegion,
    cityType: spec.cultureType
  });
  const destination = destinationPoint(origin, spec.headingDeg * DEG_TO_RAD, 900);
  const destinationNode = capturePoint(destination.lat, destination.lon, `${spec.id}-destination`, {
    routeRegion: spec.routeRegion,
    cityType: spec.cultureType
  });
  const startMinute = clockMinutes - 60;
  const endMinute = clockMinutes + (spec.durationDays ?? 30) * WEATHER_MINUTES_PER_DAY;
  const vector = latLonToVector(origin.lat, origin.lon);
  const heading = headingVectorAt(origin, origin, destinationNode);
  const ship = {
    id: spec.id,
    factionId: spec.factionId,
    role: spec.role,
    profileId: spec.profileId || "wide-world",
    mode: "interregional",
    cultureType: spec.cultureType || null,
    slugs: [spec.shipSlug],
    slug: spec.shipSlug,
    seed: hashString32(`${spec.id}|capture`),
    hitPoints: spec.hitPoints ?? stats.hitPoints,
    maxHitPoints: stats.hitPoints,
    cargoCapacity: stats.cargoCapacity,
    fishingNetId: null,
    cargo: {},
    cargoCost: {},
    specie: spec.specie === undefined
      ? npcStartingSpecieForRole(spec.role, stats)
      : Math.max(0, Math.floor(spec.specie)),
    lifetimeProfit: 0,
    cartazUntilMinute: 0,
    portVisits: 0,
    graceUntilPortVisit: 0,
    seekingHideout: false,
    hideoutDestinationTileId: null,
    hiddenAtHideout: false,
    hiddenUntilMinute: 0,
    hideoutCooldownUntilPortVisit: 0,
    currentPort: origin,
    finalDestination: destinationNode,
    plan: {
      origin,
      destination: destinationNode,
      segments: [{ kind: "sail", from: origin, to: destinationNode, startMinute, endMinute }],
      startMinute,
      endMinute
    },
    clockOffsetMinutes: 0,
    visualNavigation: { vector, heading },
    encounter: spec.encounter ? cloneJsonData(spec.encounter) : null,
    replaceOnSink: spec.replaceOnSink !== false
  };
  system.ships.push(ship);
  system.shipById.set(ship.id, ship);
  return ship;
}

export function configureNpcRouteEncounter(system, spec, clockMinutes) {
  assertSaveableNpcRouteSystem(system);
  if (!spec || typeof spec !== "object") throw new Error("NPC route encounter specification is required");
  if (!Number.isFinite(clockMinutes)) throw new Error(`Invalid NPC route encounter clock: ${clockMinutes}`);
  if (typeof spec.id !== "string" || spec.id.trim() === "") {
    throw new Error("NPC route encounter requires an id");
  }
  if (system.shipById.has(spec.id)) throw new Error(`NPC route encounter id already exists: ${spec.id}`);
  if (!Number.isInteger(spec.originPortId)) {
    throw new Error(`NPC route encounter requires an origin port: ${spec.id}`);
  }
  assertFactionId(spec.factionId);
  if (!NPC_ROLE_SET.has(spec.role)) throw new Error(`Unknown NPC route encounter role: ${spec.role}`);
  if (spec.encounter !== undefined && (!spec.encounter || typeof spec.encounter !== "object")) {
    throw new Error(`Invalid NPC route encounter metadata: ${spec.id}`);
  }
  if (spec.hiddenAtOrigin !== undefined && typeof spec.hiddenAtOrigin !== "boolean") {
    throw new Error(`Invalid NPC route encounter hideout state: ${spec.id}`);
  }
  const origin = system.ports.find((port) => port.tileId === spec.originPortId);
  if (!origin) throw new Error(`NPC route encounter origin is missing: ${spec.originPortId}`);
  const profileSpec = Object.freeze({
    id: spec.profileId || "wide-world",
    mode: spec.mode || "interregional"
  });
  const ship = createNpcShipRecord({
    id: spec.id,
    factionId: spec.factionId,
    role: spec.role,
    profileSpec,
    slugs: [spec.shipSlug],
    slug: spec.shipSlug,
    seed: hashString32(`${system.seedKey}|${spec.id}|route-encounter`),
    origin
  });
  ship.encounter = spec.encounter ? cloneJsonData(spec.encounter) : null;
  ship.replaceOnSink = spec.replaceOnSink !== false;
  if (spec.specie !== undefined) {
    if (!Number.isFinite(spec.specie) || spec.specie < 0) {
      throw new Error(`Invalid NPC route encounter specie: ${spec.id}`);
    }
    ship.specie = Math.floor(spec.specie);
  }
  if (spec.hiddenAtOrigin) enterPirateHideout(ship, clockMinutes);
  else seedNpcShipOnRoute(system, ship, clockMinutes);
  system.ships.push(ship);
  system.shipById.set(ship.id, ship);
  return ship;
}

function capturePoint(lat, lon, label, { routeRegion = "wide-world", cityType = "northern-european" } = {}) {
  if (!Number.isFinite(lat) || lat < -89.999 || lat > 89.999) {
    throw new Error(`Invalid capture encounter latitude: ${lat}`);
  }
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
    throw new Error(`Invalid capture encounter longitude: ${lon}`);
  }
  return {
    id: `capture:${label}`,
    label,
    city: label,
    displayCity: label,
    country: "Capture scenario",
    cityType,
    population: 1,
    factionId: NEUTRAL_FACTION_ID,
    routeRegion,
    routeAnchors: [],
    tileId: -1 - hashString32(label),
    lat,
    lon
  };
}

export function snapshotNpcSeaRouteSystem(system) {
  assertSaveableNpcRouteSystem(system);
  reconcileNpcFleetCargo(system, "route snapshot");
  return {
    version: NPC_SEA_ROUTE_SNAPSHOT_VERSION,
    ships: cloneJsonData(system.ships),
    replacementQueue: cloneJsonData(system.replacementQueue),
    pirateHideoutDangerUntil: [...system.pirateHideoutDangerUntil.entries()]
  };
}

export function restoreNpcSeaRouteSystem(
  system,
  snapshot,
  {
    economy,
    fishState = null,
    whaleMemory = system?.whaleMemory || null,
    seedKey = system?.seedKey ?? null,
    relationBetween = system?.relationBetween || diplomacyBetween,
    foreignSettlementExpulsions = system?.foreignSettlementExpulsions ?? null,
    sovereignTradeOpenToFaction = system?.sovereignTradeOpenToFaction ||
      defaultSovereignTradeOpenToFaction,
    suzeraintyMemory = system?.suzeraintyMemory
  } = {}
) {
  assertSaveableNpcRouteSystem(system);
  validateOptionalSeedKey(seedKey, "restored NPC routes");
  if (!snapshot || ![1, NPC_SEA_ROUTE_SNAPSHOT_VERSION].includes(snapshot.version) || !Array.isArray(snapshot.ships) ||
      !Array.isArray(snapshot.replacementQueue) || !Array.isArray(snapshot.pirateHideoutDangerUntil)) {
    throw new Error("Unsupported NPC route save data");
  }
  const ships = cloneJsonData(snapshot.ships);
  const replacementQueue = cloneJsonData(snapshot.replacementQueue);
  if (snapshot.version === 1) migrateNpcRouteFactionsTo1522(ships, replacementQueue);
  const shipById = new Map();
  for (const ship of ships) {
    if (!ship || typeof ship.id !== "string" || ship.id === "" || shipById.has(ship.id)) {
      throw new Error(`Invalid saved NPC ship id: ${ship?.id}`);
    }
    if (!Number.isFinite(ship.hitPoints) || ship.hitPoints <= 0 ||
        !Number.isFinite(ship.maxHitPoints) || ship.maxHitPoints < ship.hitPoints) {
      throw new Error(`Invalid saved NPC hull: ${ship.id}`);
    }
    ship.cultureType = ship.cultureType || ship.currentPort?.cityType || null;
    ship.cartazUntilMinute = ship.cartazUntilMinute ?? 0;
    if (!Number.isFinite(ship.cartazUntilMinute) || ship.cartazUntilMinute < 0) {
      throw new Error(`Invalid saved NPC cartaz expiry: ${ship.id}`);
    }
    assertFactionId(ship.factionId);
    const stats = shipStatsForSlug(ship.slug);
    const reconciledHull = reconcileShipHullForCurrentStats(stats, ship.hitPoints, ship.maxHitPoints);
    ship.hitPoints = reconciledHull.hitPoints;
    ship.maxHitPoints = reconciledHull.maxHitPoints;
    reconcileNpcCargoCapacity(ship, "save restore");
    shipById.set(ship.id, ship);
  }
  const danger = new Map();
  for (const entry of snapshot.pirateHideoutDangerUntil) {
    if (!Array.isArray(entry) || !Number.isInteger(entry[0]) || !Number.isFinite(entry[1])) {
      throw new Error("Invalid saved pirate hideout danger state");
    }
    danger.set(entry[0], entry[1]);
  }
  system.economy = economy || system.economy;
  system.seedKey = seedKey;
  system.fishState = fishState;
  if (whaleMemory !== null) validateWhaleMemory(whaleMemory);
  system.whaleMemory = whaleMemory;
  system.whalingGrounds = whaleMemory ? buildWhalingGrounds() : [];
  if (typeof relationBetween !== "function") throw new Error("NPC sea routes require a diplomacy resolver");
  if (foreignSettlementExpulsions !== null) {
    validateForeignSettlementExpulsionMemory(foreignSettlementExpulsions);
  }
  if (typeof sovereignTradeOpenToFaction !== "function") {
    throw new Error("NPC sea routes require a sovereign trade-access resolver");
  }
  validateSuzeraintyMemory(suzeraintyMemory);
  system.relationBetween = relationBetween;
  system.foreignSettlementExpulsions = foreignSettlementExpulsions;
  system.sovereignTradeOpenToFaction = sovereignTradeOpenToFaction;
  system.suzeraintyMemory = suzeraintyMemory;
  canonicalizeSavedNpcRoutePorts(system, ships);
  const replannedRoutes = replanNpcRoutesWithRemovedLaneEdges(system, ships);
  if (replannedRoutes > 0) {
    console.info(`Replanned ${replannedRoutes} saved NPC routes for the current sea-lane topology`);
  }
  system.ships = ships;
  system.replacementQueue = replacementQueue;
  system.pirateHideoutDangerUntil = danger;
  system.routeCache.clear();
  system.edgeCostCache.clear();
  synchronizeNpcWhalerFleet(system, system.economy.lastMinute);
  system.shipById = new Map(system.ships.map((ship) => [ship.id, ship]));
  if (system.shipById.size !== system.ships.length) {
    throw new Error("NPC route restore created duplicate ship ids");
  }
  return system;
}

function migrateNpcRouteFactionsTo1522(ships, replacementQueue) {
  for (const ship of ships) ship.factionId = migrateFactionIdTo1522(ship.factionId);
  for (const replacement of replacementQueue) {
    replacement.factionId = migrateFactionIdTo1522(replacement.factionId);
  }
}

function canonicalizeSavedNpcRoutePorts(system, ships) {
  for (const ship of ships) {
    ship.currentPort = canonicalNpcRouteDestination(system, ship.currentPort);
    if (ship.finalDestination) {
      ship.finalDestination = canonicalNpcRouteDestination(system, ship.finalDestination);
    }
    if (!ship.plan || typeof ship.plan !== "object") {
      if (ship.hiddenAtHideout && ship.plan === null) continue;
      throw new Error(`Saved NPC ship has no route plan: ${ship.id}`);
    }
    ship.plan.origin = canonicalNpcRouteDestination(system, ship.plan.origin);
    ship.plan.destination = canonicalNpcRouteDestination(system, ship.plan.destination);
  }
}

function replanNpcRoutesWithRemovedLaneEdges(system, ships) {
  const startMinute = system.economy?.lastMinute;
  if (!Number.isFinite(startMinute)) {
    throw new Error(`NPC route topology repair requires a finite economy minute: ${startMinute}`);
  }
  let replanned = 0;
  for (const ship of ships) {
    if (ship.hiddenAtHideout && ship.plan === null) continue;
    if (!npcPlanUsesRemovedLaneEdge(system, ship.plan)) continue;
    const origin = canonicalNpcRouteDestination(system, ship.currentPort);
    const destination = canonicalNpcRouteDestination(system, ship.plan?.destination);
    const route = routeBetweenPorts(system, origin, destination, ship.slug, startMinute);
    ship.currentPort = origin;
    ship.plan = buildNpcPlan(origin, destination, route, startMinute);
    ship.clockOffsetMinutes = 0;
    ship.visualNavigation = null;
    replanned++;
  }
  return replanned;
}

function npcPlanUsesRemovedLaneEdge(system, plan) {
  if (!plan || !Array.isArray(plan.segments)) throw new Error("Saved NPC ship has no route segments");
  for (const segment of plan.segments) {
    if (segment.kind !== "sail") continue;
    const fromId = segment.from?.id;
    const toId = segment.to?.id;
    if (!system.laneNodes.has(fromId) || !system.laneNodes.has(toId)) continue;
    const edgeExists = (system.baseEdges.get(fromId) || []).some((edge) => edge.to === toId);
    if (!edgeExists) return true;
  }
  return false;
}

function canonicalNpcRouteDestination(system, destination) {
  if (!Number.isInteger(destination?.tileId)) {
    throw new Error(`Saved NPC route destination requires a tile id: ${destination?.tileId}`);
  }
  const canonical = system.ports.find((port) => port.tileId === destination.tileId) ||
    system.fishingGrounds.find((ground) => ground.tileId === destination.tileId) ||
    system.whalingGrounds.find((ground) => ground.tileId === destination.tileId);
  if (!canonical && isSavedEncounterPoint(destination)) return destination;
  if (!canonical && destination.isFishingGround === true) {
    return restoreSavedFishingGround(system, destination);
  }
  if (!canonical) {
    throw new Error(`Saved NPC route destination is absent from the current world: ${destination.tileId}`);
  }
  return canonical;
}

function restoreSavedFishingGround(system, destination) {
  if (!system.fishState) {
    throw new Error(`Saved NPC fishing ground has no current fish ecology: ${destination.tileId}`);
  }
  if (!destination.habitat || destination.habitat.tileId !== destination.tileId ||
      !["coastal", "open-ocean"].includes(destination.habitat.kind)) {
    throw new Error(`Saved NPC fishing ground has invalid habitat: ${destination.tileId}`);
  }
  if (!Number.isFinite(destination.lat) || !Number.isFinite(destination.lon) ||
      destination.lat < -70 || destination.lat > 70 ||
      destination.lon < -180 || destination.lon > 180) {
    throw new Error(`Saved NPC fishing ground has invalid position: ${destination.tileId}`);
  }
  const routeAnchors = anchorIdsForPort(destination);
  if (routeAnchors.length === 0) {
    throw new Error(`Saved NPC fishing ground has no current sea-lane anchors: ${destination.tileId}`);
  }
  const restored = {
    ...destination,
    factionId: NEUTRAL_FACTION_ID,
    routeRegion: portRouteRegion(destination),
    routeAnchors,
    habitat: {
      ...destination.habitat,
      lat: destination.lat,
      lon: destination.lon
    }
  };
  system.fishingGrounds.push(restored);
  return restored;
}

function isSavedEncounterPoint(destination) {
  return typeof destination?.id === "string" && destination.id.startsWith("capture:") &&
    destination.tileId < 0 && Number.isFinite(destination.lat) && Number.isFinite(destination.lon) &&
    destination.lat >= -89.999 && destination.lat <= 89.999 &&
    destination.lon >= -180 && destination.lon <= 180;
}

export function applyNpcConquestOwnership(system, portFactionByTileId, collapsedFactionIds) {
  assertSaveableNpcRouteSystem(system);
  if (!(portFactionByTileId instanceof Map)) throw new Error("NPC conquest ownership requires a port faction map");
  if (!(collapsedFactionIds instanceof Set)) throw new Error("NPC conquest ownership requires collapsed factions");
  for (const [tileId, factionId] of portFactionByTileId) {
    if (!Number.isInteger(tileId)) throw new Error(`Invalid conquered port tile: ${tileId}`);
    assertFactionId(factionId);
  }
  for (const factionId of collapsedFactionIds) assertFactionId(factionId);

  for (const port of system.ports) synchronizeNpcPortFaction(port, portFactionByTileId);
  for (const ship of system.ships) {
    if (collapsedFactionIds.has(ship.factionId)) ship.factionId = NEUTRAL_FACTION_ID;
    synchronizeNpcPortFaction(ship.currentPort, portFactionByTileId);
    synchronizeNpcPortFaction(ship.finalDestination, portFactionByTileId);
    synchronizeNpcPortFaction(ship.plan?.origin, portFactionByTileId);
    synchronizeNpcPortFaction(ship.plan?.destination, portFactionByTileId);
  }
  for (const replacement of system.replacementQueue) {
    if (collapsedFactionIds.has(replacement.factionId)) replacement.factionId = NEUTRAL_FACTION_ID;
  }
  system.routeCache.clear();
  system.edgeCostCache.clear();
  return system;
}

function synchronizeNpcPortFaction(port, portFactionByTileId) {
  if (!port) return;
  if (!Number.isInteger(port.tileId)) throw new Error("NPC route port has no tile id");
  const factionId = portFactionByTileId.get(port.tileId);
  if (factionId) port.factionId = factionId;
}

function choosePirateHideouts(ports) {
  const count = Math.min(
    ports.length - 1,
    PIRATE_HIDEOUT_MAX_COUNT,
    Math.max(PIRATE_HIDEOUT_MIN_COUNT, Math.round(ports.length * PIRATE_HIDEOUT_PORT_FRACTION))
  );
  const discreetPorts = ports.filter((port) => !npcPortHasMajorProtection(port));
  const candidates = discreetPorts.length >= count ? discreetPorts : ports;
  return [...candidates]
    .sort((a, b) => (
      hashString32(`${a.tileId}|${a.city}|pirate-hideout`) -
      hashString32(`${b.tileId}|${b.city}|pirate-hideout`)
    ))
    .slice(0, count);
}

function buildWhalingGrounds() {
  return WHALING_GROUND_SPECS.map((spec, index) => ({
    tileId: -2100000000 + index,
    isWhalingGround: true,
    whalingGroundId: spec.id,
    city: spec.label,
    displayCity: spec.label,
    country: "Open sea",
    cityType: "northern-european",
    population: 1000,
    factionId: NEUTRAL_FACTION_ID,
    routeRegion: spec.routeRegion,
    routeAnchors: spec.routeAnchors.slice(),
    lat: spec.lat,
    lon: spec.lon
  }));
}

function buildFishingGrounds(ports, fishState, startMinute) {
  const byKey = new Map();
  for (const port of ports) {
    for (const distanceKmValue of FISHING_GROUND_SAMPLE_DISTANCES_KM) {
      for (const bearingDeg of FISHING_GROUND_SAMPLE_BEARINGS_DEG) {
        const point = destinationPoint(port, bearingDeg * DEG_TO_RAD, distanceKmValue);
        if (Math.abs(point.lat) > 70) continue;
        const key = fishingGroundKey(point);
        if (byKey.has(key)) continue;
        const habitat = fishingGroundHabitat(point, distanceKmValue);
        const fishery = fisheryForHabitat(fishState, habitat, startMinute);
        if (!fishery || fishery.population < FISHING_GROUND_MIN_EXPECTED_CATCH) continue;
        const ground = {
          tileId: habitat.tileId,
          isFishingGround: true,
          city: `Fishing grounds ${key}`,
          displayCity: fishingGroundLabel(point, fishery.speciesLabel),
          country: "Open sea",
          cityType: "northern-european",
          population: Math.max(1000, fishery.capacity * 100),
          factionId: NEUTRAL_FACTION_ID,
          routeRegion: portRouteRegion(point),
          routeAnchors: anchorIdsForPort(point),
          lat: point.lat,
          lon: point.lon,
          habitat,
          speciesLabel: fishery.speciesLabel,
          initialDensity: fishery.density,
          initialPopulation: fishery.population
        };
        if (ground.routeAnchors.length === 0) continue;
        byKey.set(key, ground);
      }
    }
  }
  return [...byKey.values()]
    .sort((a, b) => (
      fishingGroundBaseScore(b) - fishingGroundBaseScore(a) ||
      a.tileId - b.tileId
    ))
    .slice(0, FISHING_GROUND_TARGET);
}

function fishingGroundBaseScore(ground) {
  const coldWaterBoost = Math.abs(ground.lat) >= 42 ? 1.35 : 1;
  return ground.initialPopulation * ground.initialDensity * coldWaterBoost;
}

function fishingGroundHabitat(point, distanceKmValue) {
  const latBucket = Math.round((point.lat + 90) * 10);
  const lonBucket = Math.round((normalizeLonDeg(point.lon) + 180) * 10);
  return {
    tileId: -1 - (latBucket * 3600 + lonBucket),
    kind: distanceKmValue <= 620 ? "coastal" : "open-ocean",
    lat: point.lat,
    lon: point.lon
  };
}

function fishingGroundKey(point) {
  return `${Math.round(point.lat * 10)},${Math.round(normalizeLonDeg(point.lon) * 10)}`;
}

function fishingGroundLabel(point, speciesLabel) {
  const latLabel = `${Math.abs(point.lat).toFixed(1)}${point.lat >= 0 ? "N" : "S"}`;
  const lonLabel = `${Math.abs(normalizeLonDeg(point.lon)).toFixed(1)}${point.lon >= 0 ? "E" : "W"}`;
  return `${speciesLabel} grounds ${latLabel} ${lonLabel}`;
}

export function updateNpcSeaRouteSystem(system, clockMinutes) {
  refreshPirateHideoutWarshipDanger(system, clockMinutes);
  let changed = reconcileNpcFleetCargo(system, "route update");
  if (rerouteHostileNpcTradePlans(system, clockMinutes)) changed = true;
  if (spawnDueNpcReplacements(system, clockMinutes)) changed = true;
  for (const ship of system.ships) {
    if (settleNpcShipToClock(system, ship, npcEffectiveClock(ship, clockMinutes), 12)) changed = true;
  }
  return changed;
}

function rerouteHostileNpcTradePlans(system, clockMinutes) {
  let changed = false;
  for (const ship of system.ships) {
    if (!npcNeedsFriendlyTradePort(ship)) continue;
    if (ship.finalDestination && !npcMerchantCanTradeAtPort(system, ship, ship.finalDestination)) {
      ship.finalDestination = null;
      changed = true;
    }
    if (!ship.plan?.destination || npcMerchantCanTradeAtPort(system, ship, ship.plan.destination)) continue;
    if (ship.visualNavigation) continue;
    ship.finalDestination = null;
    assignNpcPlan(system, ship, clockMinutes);
    changed = true;
  }
  return changed;
}

function refreshPirateHideoutWarshipDanger(system, clockMinutes) {
  const warships = system.ships
    .filter((ship) => ship.role === NPC_ROLE_WARSHIP && !ship.hiddenAtHideout)
    .map((ship) => npcShipSnapshot(ship, npcEffectiveClock(ship, clockMinutes)))
    .filter((snapshot) => snapshot && !snapshot.hidden);
  for (const hideout of system.pirateHideouts) {
    if (!warships.some((warship) => distanceKm(hideout, warship) <= PIRATE_HIDEOUT_DANGER_RADIUS_KM)) continue;
    const dangerUntil = clockMinutes + PIRATE_HIDEOUT_DANGER_HOLD_MINUTES;
    const existingDangerUntil = system.pirateHideoutDangerUntil.get(hideout.tileId) || 0;
    if (existingDangerUntil >= clockMinutes + PIRATE_HIDEOUT_DANGER_HOLD_MINUTES * 0.75) continue;
    system.pirateHideoutDangerUntil.set(
      hideout.tileId,
      Math.max(existingDangerUntil, dangerUntil)
    );
  }
}

export function npcShipSnapshots(system, clockMinutes) {
  return system.ships
    .map((ship) => npcShipSnapshot(ship, npcEffectiveClock(ship, clockMinutes)))
    .filter(Boolean);
}

export function npcRoleLabel(role) {
  if (role === NPC_ROLE_MERCHANT) return "Merchant";
  if (role === NPC_ROLE_FISHERMAN) return "Fisherman";
  if (role === NPC_ROLE_WHALER) return "Whaler";
  if (role === NPC_ROLE_WARSHIP) return "Warship";
  if (role === NPC_ROLE_PIRATE) return "Pirate";
  throw new Error(`Unknown NPC ship role: ${role}`);
}

export function npcShipHasCombatGrace(system, shipId) {
  const ship = requiredNpcShip(system, shipId);
  return shipHasCombatGrace(ship);
}

export function damageNpcShip(system, shipId, amount, options = {}) {
  const ship = requiredNpcShip(system, shipId);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error(`Invalid NPC ship damage: ${amount}`);
  if (!options || typeof options !== "object") throw new Error("NPC ship damage options must be an object");
  const bypassArmor = options.bypassArmor === true;
  const armorRoll = options.armorRoll ?? Math.random();
  const resisted = !bypassArmor && shipHullResistsDamage(shipStatsForSlug(ship.slug), {
    roll: armorRoll
  });
  const damage = resisted ? 0 : amount;
  ship.hitPoints = Math.max(0, ship.hitPoints - damage);
  if (ship.role === NPC_ROLE_PIRATE && ship.hitPoints > 0 && ship.hitPoints / ship.maxHitPoints <= PIRATE_HIDEOUT_RETREAT_HULL_RATIO) {
    ship.seekingHideout = true;
  }
  const surrenderHitPoints = Math.max(1, Math.floor(ship.maxHitPoints * 0.16));
  return {
    hitPoints: ship.hitPoints,
    maxHitPoints: ship.maxHitPoints,
    damage,
    resisted,
    sunk: ship.hitPoints <= 0,
    shouldSurrender: ship.hitPoints > 0 && ship.hitPoints <= surrenderHitPoints
  };
}

export function sinkNpcShip(system, shipId, clockMinutes) {
  const ship = requiredNpcShip(system, shipId);
  return removeNpcShipForReplacement(system, ship, clockMinutes);
}

export function captureSurrenderedNpcShip(system, shipId, clockMinutes) {
  const ship = requiredNpcShip(system, shipId);
  if (ship.specie !== 0 || npcCargoUnits(ship) !== 0) {
    throw new Error(`Captured NPC ship still carries unclaimed loot: ${shipId}`);
  }
  if (!shipHasCombatGrace(ship)) {
    throw new Error(`NPC ship has not surrendered: ${shipId}`);
  }
  return removeNpcShipForReplacement(system, ship, clockMinutes);
}

function removeNpcShipForReplacement(system, ship, clockMinutes) {
  if (!Number.isFinite(clockMinutes)) throw new Error(`Invalid NPC replacement minute: ${clockMinutes}`);
  if (ship.replaceOnSink === false) {
    system.ships = system.ships.filter((entry) => entry.id !== ship.id);
    system.shipById.delete(ship.id);
    return { ship, replacement: null, delayDays: null, port: null };
  }
  const replacementPort = chooseNpcReplacementPort(system, ship);
  const yard = system.economy.shipyards?.yards?.get(replacementPort.tileId) || null;
  const yardSpeed = clamp((yard?.wealthScale || 0.75) + (yard?.famous ? 0.8 : 0), 0.65, 3.4);
  const delayDays = Math.max(
    NPC_REPLACEMENT_MIN_DAYS,
    Math.round(
      NPC_REPLACEMENT_BASE_DAYS / yardSpeed +
      hashUnit(`${ship.id}|${ship.portVisits}|replacement-delay`) * NPC_REPLACEMENT_SPREAD_DAYS
    )
  );
  const replacement = {
    shipId: ship.id,
    factionId: ship.factionId,
    role: ship.role,
    profileId: ship.profileId,
    mode: ship.mode,
    cultureType: ship.cultureType || ship.currentPort?.cityType || null,
    slugs: ship.slugs.slice(),
    seed: hashString32(`${ship.seed}|${ship.portVisits}|replacement`),
    originPortId: replacementPort.tileId,
    readyMinute: clockMinutes + delayDays * WEATHER_MINUTES_PER_DAY
  };
  system.ships = system.ships.filter((entry) => entry.id !== ship.id);
  system.shipById.delete(ship.id);
  system.replacementQueue.push(replacement);
  system.replacementQueue.sort((a, b) => a.readyMinute - b.readyMinute || a.shipId.localeCompare(b.shipId));
  return { ship, replacement, delayDays, port: replacementPort };
}

export function surrenderNpcShip(system, loserId, winnerId = null, { preserveHull = false } = {}) {
  const loser = requiredNpcShip(system, loserId);
  const winner = winnerId ? requiredNpcShip(system, winnerId) : null;
  if (winner?.id === loser.id) throw new Error("An NPC ship cannot surrender to itself");
  if (typeof preserveHull !== "boolean") throw new Error(`Invalid preserve-hull option: ${preserveHull}`);

  const loot = {
    specie: Math.max(0, Math.floor(loser.specie)),
    cargo: { ...loser.cargo }
  };
  if (winner) receiveNpcLoot(winner, loot);

  loser.specie = 0;
  loser.cargo = {};
  loser.cargoCost = {};
  loser.graceUntilPortVisit = Number.MAX_SAFE_INTEGER;
  if (loser.role === NPC_ROLE_PIRATE) loser.seekingHideout = true;
  if (!preserveHull) loser.hitPoints = Math.max(1, Math.round(loser.maxHitPoints * 0.18));
  return loot;
}

export function updateNpcPirateHideoutPlayerThreat(system, { lat, lon, clockMinutes }) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(clockMinutes)) {
    throw new Error("Pirate hideout player threat requires a finite position and clock");
  }
  let changed = false;
  for (const hideout of system.pirateHideouts) {
    if (distanceKm(hideout, { lat, lon }) > PIRATE_HIDEOUT_DANGER_RADIUS_KM) continue;
    const dangerUntil = clockMinutes + PIRATE_HIDEOUT_DANGER_HOLD_MINUTES;
    if ((system.pirateHideoutDangerUntil.get(hideout.tileId) || 0) >=
        clockMinutes + PIRATE_HIDEOUT_DANGER_HOLD_MINUTES * 0.75) continue;
    system.pirateHideoutDangerUntil.set(hideout.tileId, dangerUntil);
    changed = true;
  }
  return changed;
}

export function setNpcShipVisualNavigation(system, shipId, vector, heading) {
  const ship = requiredNpcShip(system, shipId);
  const position = normalizedVector(vector, `NPC ship ${shipId} visual position`);
  const tangentHeading = normalizedTangent(heading, position, `NPC ship ${shipId} visual heading`);
  ship.visualNavigation = {
    vector: position,
    heading: tangentHeading
  };
}

export function releaseNpcShipVisualNavigation(system, shipId, clockMinutes, vector) {
  const ship = system.shipById?.get(shipId);
  if (!ship || !ship.visualNavigation) return false;
  const position = normalizedVector(vector, `NPC ship ${shipId} released position`);
  synchronizeNpcRouteClock(ship, clockMinutes, position);
  ship.visualNavigation = null;
  return true;
}

function createNpcFleet(system, startMinute) {
  const ships = [];
  for (const profileSpec of FLEET_PROFILES) {
    const pool = rankedProfilePorts(system.ports, profileSpec);
    if (pool.length < 2) continue;
    const count = Math.min(profileSpec.count, pool.length * 2);
    for (let i = 0; i < count; i++) {
      const seed = hashString32(npcSeedKey(system, `${profileSpec.id}|${i}|npc`));
      let origin = pool[seed % pool.length];
      const role = npcRoleForSeed(seed, origin.factionId, profileSpec);
      if (role === NPC_ROLE_PIRATE && npcPortHasMajorProtection(origin)) {
        const discreetOrigins = pool.filter((port) => !npcPortHasMajorProtection(port));
        if (discreetOrigins.length > 0) origin = discreetOrigins[seed % discreetOrigins.length];
      }
      const slugs = profileSlugsForRole(profileSpec, role, origin.factionId);
      const slug = npcShipSlugForRole(profileSpec, role, seed, origin.factionId);
      const ship = createNpcShipRecord({
        id: `${profileSpec.id}-${i}`,
        factionId: role === NPC_ROLE_PIRATE ? PIRATE_FACTION_ID : origin.factionId,
        role,
        profileSpec,
        slugs,
        slug,
        seed,
        origin
      });
      seedNpcShipOnRoute(system, ship, startMinute);
      ships.push(ship);
    }
  }
  return ships.slice(0, NPC_FLEET_TARGET);
}

function synchronizeNpcWhalerFleet(system, startMinute) {
  if (!system.whaleMemory) return 0;
  const desiredIds = new Set(WHALER_PROFILES.flatMap((profileSpec) => (
    Array.from({ length: profileSpec.count }, (_, index) => `${profileSpec.id}-${index}`)
  )));
  const obsoleteIds = new Set([
    ...system.ships
      .filter((ship) => ship.role === NPC_ROLE_WHALER && !desiredIds.has(ship.id))
      .map((ship) => ship.id),
    ...system.replacementQueue
      .filter((replacement) => replacement.role === NPC_ROLE_WHALER && !desiredIds.has(replacement.shipId))
      .map((replacement) => replacement.shipId)
  ]);
  if (obsoleteIds.size > 0) {
    system.ships = system.ships.filter((ship) => !obsoleteIds.has(ship.id));
    system.replacementQueue = system.replacementQueue.filter((replacement) => !obsoleteIds.has(replacement.shipId));
    console.info(`Replaced ${obsoleteIds.size} surplus NPC whalers with the current regional fleet`);
  }
  const reservedIds = new Set([
    ...system.ships.map((ship) => ship.id),
    ...system.replacementQueue.map((replacement) => replacement.shipId)
  ]);
  let added = 0;
  for (const profileSpec of WHALER_PROFILES) {
    const pool = rankedProfilePorts(system.ports, profileSpec);
    if (pool.length < profileSpec.minimumPorts) {
      throw new Error(
        `NPC whaling profile ${profileSpec.id} needs at least ${profileSpec.minimumPorts} ports, got ${pool.length}`
      );
    }
    for (let index = 0; index < profileSpec.count; index++) {
      const id = `${profileSpec.id}-${index}`;
      if (reservedIds.has(id)) continue;
      const seed = hashString32(npcSeedKey(system, `${profileSpec.id}|${index}|npc`));
      const origin = pool[seed % pool.length];
      const slugs = profileSlugsForRole(profileSpec, NPC_ROLE_WHALER, origin.factionId);
      const slug = npcShipSlugForRole(profileSpec, NPC_ROLE_WHALER, seed, origin.factionId);
      const ship = createNpcShipRecord({
        id,
        factionId: origin.factionId,
        role: NPC_ROLE_WHALER,
        profileSpec,
        slugs,
        slug,
        seed,
        origin
      });
      seedNpcShipOnRoute(system, ship, startMinute);
      system.ships.push(ship);
      reservedIds.add(id);
      added++;
    }
  }
  return added;
}

function createNpcShipRecord({ id, factionId, role, profileSpec, slugs, slug, seed, origin }) {
  if (!NPC_ROLE_SET.has(role)) throw new Error(`Unknown NPC ship role: ${role}`);
  const stats = shipStatsForSlug(slug);
  return {
    id,
    factionId,
    role,
    profileId: profileSpec.id,
    mode: profileSpec.mode,
    cultureType: origin.cityType,
    slugs: slugs.slice(),
    slug,
    seed,
    hitPoints: stats.hitPoints,
    maxHitPoints: stats.hitPoints,
    cargoCapacity: stats.cargoCapacity,
    fishingNetId: role === NPC_ROLE_FISHERMAN
      ? npcFishingNetForSeed(seed, stats.cargoCapacity).id
      : null,
    lastWhaleHuntMinute: null,
    cargo: {},
    cargoCost: {},
    specie: npcStartingSpecieForRole(role, stats),
    lifetimeProfit: 0,
    cartazUntilMinute: 0,
    portVisits: 0,
    graceUntilPortVisit: 0,
    seekingHideout: false,
    hideoutDestinationTileId: null,
    hiddenAtHideout: false,
    hiddenUntilMinute: 0,
    hideoutCooldownUntilPortVisit: 0,
    currentPort: origin,
    finalDestination: null,
    plan: null,
    clockOffsetMinutes: 0,
    visualNavigation: null
  };
}

function spawnDueNpcReplacements(system, clockMinutes) {
  let changed = false;
  while (system.replacementQueue.length > 0 && system.replacementQueue[0].readyMinute <= clockMinutes) {
    const replacement = system.replacementQueue.shift();
    if (system.shipById.has(replacement.shipId)) {
      throw new Error(`NPC replacement id is already active: ${replacement.shipId}`);
    }
    const origin = system.ports.find((port) => port.tileId === replacement.originPortId);
    if (!origin) throw new Error(`NPC replacement port is missing: ${replacement.originPortId}`);
    const slug = weightedCheapShipSlug(replacement.slugs, replacement.seed);
    const profileSpec = fleetProfileForId(replacement.profileId);
    const ship = createNpcShipRecord({
      id: replacement.shipId,
      factionId: replacement.factionId,
      role: replacement.role,
      profileSpec,
      slugs: replacement.slugs,
      slug,
      seed: replacement.seed,
      origin
    });
    ship.cultureType = replacement.cultureType || origin.cityType;
    assignNpcPlan(system, ship, replacement.readyMinute);
    settleNpcShipToClock(system, ship, clockMinutes, 96);
    system.ships.push(ship);
    system.shipById.set(ship.id, ship);
    changed = true;
  }
  return changed;
}

function chooseNpcReplacementPort(system, ship) {
  if (ship.role === NPC_ROLE_PIRATE) {
    const hideouts = [...system.pirateHideouts].sort((a, b) => (
      distanceKm(ship.currentPort, a) - distanceKm(ship.currentPort, b) || a.tileId - b.tileId
    ));
    if (hideouts.length > 0) return hideouts[0];
  }
  const profileSpec = fleetProfileForId(ship.profileId);
  let candidates = system.ports.filter((port) => (
    !port.isFishingGround &&
    port.factionId === ship.factionId &&
    profileSpec.portPredicate(port)
  ));
  if (candidates.length === 0) {
    candidates = system.ports.filter((port) => !port.isFishingGround && port.factionId === ship.factionId);
  }
  if (candidates.length === 0) {
    candidates = system.ports.filter((port) => !port.isFishingGround && port.factionId === NEUTRAL_FACTION_ID);
  }
  if (candidates.length === 0) throw new Error(`No replacement shipyard for NPC ship ${ship.id}`);
  return [...candidates].sort((a, b) => (
    npcReplacementPortScore(system, b, ship) - npcReplacementPortScore(system, a, ship) ||
    a.tileId - b.tileId
  ))[0];
}

function npcReplacementPortScore(system, port, ship) {
  const yard = system.economy.shipyards?.yards?.get(port.tileId);
  const shipbuilding = (yard?.wealthScale || 0.5) + (yard?.famous ? 1.2 : 0);
  const distancePenalty = distanceKm(ship.currentPort, port) / 5000;
  const variation = hashUnit(`${ship.id}|${port.tileId}|replacement-port`) * 0.2;
  return shipbuilding - distancePenalty + variation;
}

function npcRoleForSeed(seed, originFactionId, profileSpec) {
  if (profileSpec.roleWeights) {
    const roll = (seed >>> 5) % 100;
    const { merchant, fisherman, warship } = profileSpec.roleWeights;
    if (roll < merchant) return NPC_ROLE_MERCHANT;
    if (roll < merchant + fisherman) return NPC_ROLE_FISHERMAN;
    if (roll < merchant + fisherman + warship) {
      return originFactionId === NEUTRAL_FACTION_ID ? NPC_ROLE_MERCHANT : NPC_ROLE_WARSHIP;
    }
    return NPC_ROLE_PIRATE;
  }
  const roll = (seed >>> 5) % 100;
  if (roll < 64) return NPC_ROLE_MERCHANT;
  if (roll < 79 && profileSpec.mode === "regional") return NPC_ROLE_FISHERMAN;
  if (roll < 96) return originFactionId === NEUTRAL_FACTION_ID ? NPC_ROLE_MERCHANT : NPC_ROLE_WARSHIP;
  return NPC_ROLE_PIRATE;
}

function npcShipSlugForRole(profileSpec, role, seed, factionId) {
  if (!NPC_ROLE_SET.has(role)) throw new Error(`Unknown NPC ship role: ${role}`);
  const nationalWarship = EAST_ASIAN_FACTION_WARSHIPS[factionId];
  if (
    role === NPC_ROLE_WARSHIP &&
    profileSpec.id === "east-asia" &&
    nationalWarship &&
    hashUnit(`${seed}|national-warship`) < 0.4
  ) {
    return nationalWarship;
  }
  if (
    role === NPC_ROLE_MERCHANT &&
    factionId === "portugal" &&
    ["atlantic-coast", "cape-trade", "wide-world"].includes(profileSpec.id) &&
    hashUnit(`${seed}|portuguese-carrack`) < 0.45
  ) {
    return PORTUGUESE_CARRACK_SLUG;
  }
  if (
    role === NPC_ROLE_MERCHANT &&
    factionId === "ottoman" &&
    profileSpec.id === "mediterranean" &&
    hashUnit(`${seed}|ottoman-coastal-trader`) < 0.55
  ) {
    return OTTOMAN_COASTAL_TRADER_SLUG;
  }
  const pool = profileSlugsForRole(profileSpec, role, factionId);
  return weightedCheapShipSlug(pool, hashString32(`${seed}|${role}|hull`));
}

function profileSlugsForRole(profileSpec, role, factionId = null) {
  if (role === NPC_ROLE_PIRATE) return PIRATE_SHIP_SLUGS;
  if (role === NPC_ROLE_WARSHIP) {
    const nationalWarship = EAST_ASIAN_FACTION_WARSHIPS[factionId];
    return nationalWarship && profileSpec.id === "east-asia"
      ? [...profileSpec.warshipSlugs, nationalWarship]
      : profileSpec.warshipSlugs;
  }
  if (role === NPC_ROLE_FISHERMAN) return profileSpec.fisherSlugs;
  if (role === NPC_ROLE_WHALER) return profileSpec.whalerSlugs;
  return profileSpec.merchantSlugs;
}

function npcStartingSpecieForRole(role, stats) {
  if (role === NPC_ROLE_MERCHANT) return 900 + stats.cargoCapacity * 18;
  if (role === NPC_ROLE_FISHERMAN || role === NPC_ROLE_WHALER) {
    return 120 + stats.cargoCapacity * 4;
  }
  return 250 + stats.cannons * 12;
}

function fleetProfileForId(profileId) {
  const profileSpec = WHALER_PROFILE_BY_ID.get(profileId) ||
    FLEET_PROFILES.find((profile) => profile.id === profileId);
  if (!profileSpec) throw new Error(`Unknown NPC fleet profile: ${profileId}`);
  return profileSpec;
}

function weightedCheapShipSlug(slugs, seed) {
  const ranked = [...slugs]
    .map((slug) => ({ slug, expense: npcShipExpenseScore(shipStatsForSlug(slug)) }))
    .sort((a, b) => a.expense - b.expense || a.slug.localeCompare(b.slug));
  const weighted = ranked.map((entry, index) => ({ ...entry, weight: Math.pow(0.56, index) }));
  const total = weighted.reduce((sum, entry) => sum + entry.weight, 0);
  let cursor = (seed >>> 0) / 0x100000000 * total;
  for (const entry of weighted) {
    cursor -= entry.weight;
    if (cursor <= 0) return entry.slug;
  }
  return weighted[weighted.length - 1].slug;
}

function npcShipExpenseScore(stats) {
  return stats.mass + stats.cargoCapacity * 0.35 + stats.cannons * 9 + stats.seaworthiness * 4;
}

function assignNpcPlan(system, ship, startMinute) {
  const origin = ship.currentPort;
  let hideoutDestination = null;
  if (!ship.finalDestination && pirateShouldVisitHideout(ship)) {
    hideoutDestination = choosePirateHideoutDestination(system, ship, origin);
    ship.hideoutDestinationTileId = hideoutDestination.tileId;
  } else if (!ship.finalDestination) {
    ship.hideoutDestinationTileId = null;
  }
  const desiredDestination = ship.finalDestination || hideoutDestination || chooseNpcDestination(system, ship, origin);
  if (
    ship.role === NPC_ROLE_MERCHANT &&
    !ship.finalDestination &&
    npcCargoUnits(ship) === 0 &&
    npcMerchantCanTradeAtPort(system, ship, origin)
  ) {
    buyNpcCargo(system, ship, origin, desiredDestination);
  }
  let destination = desiredDestination;
  let route = routeBetweenPorts(system, origin, desiredDestination, ship.slug, startMinute);

  if (route.waitDays > NPC_ROUTE_WAIT_HOP_THRESHOLD_DAYS) {
    const hop = chooseSeasonalHop(system, ship, origin, desiredDestination, startMinute);
    if (hop) {
      destination = hop.port;
      ship.finalDestination = desiredDestination;
      route = hop.route;
    }
  } else {
    ship.finalDestination = null;
  }

  ship.plan = buildNpcPlan(origin, destination, route, startMinute);
}

function seedNpcShipOnRoute(system, ship, startMinute) {
  assignNpcPlan(system, ship, startMinute);
  const durationMinutes = ship.plan.endMinute - ship.plan.startMinute;
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    throw new Error(`NPC ship ${ship.id} received an invalid initial route duration: ${durationMinutes}`);
  }
  const elapsedMinutes = Math.min(
    durationMinutes - 1,
    Math.floor(durationMinutes * hashUnit(npcSeedKey(system, `${ship.id}|initial-route-progress`)))
  );
  ship.plan.startMinute -= elapsedMinutes;
  ship.plan.endMinute -= elapsedMinutes;
  for (const segment of ship.plan.segments) {
    segment.startMinute -= elapsedMinutes;
    segment.endMinute -= elapsedMinutes;
  }
}

function settleNpcShipToClock(system, ship, clockMinutes, maxPlans) {
  if (ship.hiddenAtHideout) {
    const dangerUntil = system.pirateHideoutDangerUntil.get(ship.currentPort.tileId) || 0;
    if (clockMinutes < ship.hiddenUntilMinute || clockMinutes < dangerUntil) return false;
    ship.hiddenAtHideout = false;
    ship.hiddenUntilMinute = 0;
    ship.seekingHideout = false;
    ship.hitPoints = ship.maxHitPoints;
    ship.graceUntilPortVisit = 0;
    ship.hideoutCooldownUntilPortVisit = ship.portVisits + 2;
    assignNpcPlan(system, ship, clockMinutes);
    ship.visualNavigation = {
      vector: latLonToVector(ship.currentPort.lat, ship.currentPort.lon),
      heading: headingVectorAt(ship.currentPort, ship.currentPort, ship.plan.destination)
    };
    return true;
  }
  let changed = false;
  let guard = 0;
  while (ship.plan && clockMinutes >= ship.plan.endMinute && guard < maxPlans) {
    ship.currentPort = ship.plan.destination;
    ship.portVisits += 1;
    if (system.onForeignPortCall && !ship.currentPort.isFishingGround && !ship.currentPort.isWhalingGround &&
        ship.plan.endMinute >= system.contactStartMinute) {
      system.onForeignPortCall(ship.factionId, ship.currentPort.factionId, ship.plan.endMinute);
    }
    if (ship.role === NPC_ROLE_PIRATE && ship.seekingHideout) ship.finalDestination = null;
    const reachedHideout = ship.role === NPC_ROLE_PIRATE &&
      ship.hideoutDestinationTileId === ship.currentPort.tileId &&
      (!ship.finalDestination || samePort(ship.currentPort, ship.finalDestination));
    if (reachedHideout) {
      if (npcCargoUnits(ship) > 0) sellNpcCargo(system, ship, ship.currentPort);
      enterPirateHideout(ship, ship.plan.endMinute);
      changed = true;
      guard++;
      break;
    }
    const reachedSafePort = npcPortIsSafeForShip(system, ship, ship.currentPort);
    if (!shipHasCombatGrace(ship) || reachedSafePort) ship.hitPoints = ship.maxHitPoints;
    if (reachedSafePort) ship.graceUntilPortVisit = 0;
    const reachedTradingDestination = !ship.finalDestination || samePort(ship.currentPort, ship.finalDestination);
    if (ship.role === NPC_ROLE_FISHERMAN && reachedTradingDestination) {
      ship.finalDestination = null;
      if (ship.currentPort.isFishingGround) harvestNpcFishingGround(system, ship, ship.currentPort, ship.plan.endMinute);
      else if (npcCargoUnits(ship) > 0 && npcMerchantCanTradeAtPort(system, ship, ship.currentPort)) {
        sellNpcCargo(system, ship, ship.currentPort);
      }
    } else if (ship.role === NPC_ROLE_WHALER && reachedTradingDestination) {
      ship.finalDestination = null;
      if (ship.currentPort.isWhalingGround) {
        harvestNpcWhalingGround(system, ship, ship.currentPort, ship.plan.endMinute);
      } else if (npcCargoUnits(ship) > 0 && npcMerchantCanTradeAtPort(system, ship, ship.currentPort)) {
        sellNpcCargo(system, ship, ship.currentPort);
      }
    } else if (ship.role === NPC_ROLE_MERCHANT && reachedTradingDestination) {
      ship.finalDestination = null;
      if (npcMerchantCanTradeAtPort(system, ship, ship.currentPort)) {
        sellNpcCargo(system, ship, ship.currentPort);
      }
    } else if (reachedTradingDestination) {
      ship.finalDestination = null;
      if (npcCargoUnits(ship) > 0) sellNpcCargo(system, ship, ship.currentPort);
    }
    assignNpcPlan(system, ship, ship.plan.endMinute);
    changed = true;
    guard++;
  }
  if (guard >= maxPlans) throw new Error(`NPC ship ${ship.id} could not settle route updates`);
  return changed;
}

function chooseNpcDestination(system, ship, origin) {
  if (ship.role === NPC_ROLE_FISHERMAN) return chooseFishermanDestination(system, ship, origin);
  if (ship.role === NPC_ROLE_WHALER) return chooseWhalerDestination(system, ship, origin);
  const profileSpec = fleetProfileForId(ship.profileId);
  const seed = hashString32(`${ship.seed}|${origin.tileId}|dest`);
  const candidates = system.ports
    .filter((port) => !samePort(port, origin))
    .filter((port) => ship.role !== NPC_ROLE_PIRATE || !npcPortHasMajorProtection(port))
    .filter((port) => !shipHasCombatGrace(ship) || npcPortIsSafeForShip(system, ship, port))
    .filter((port) => !npcNeedsFriendlyTradePort(ship) || npcMerchantCanTradeAtPort(system, ship, port))
    .filter((port) => profileSpec.mode === "regional"
      ? profileSpec.portPredicate(port) && distanceKm(origin, port) >= NPC_MIN_TRIP_DISTANCE_KM
      : !port.npcInterregionalTradeExcluded &&
        port.routeRegion !== origin.routeRegion &&
        longRangePairAllowed(origin, port))
    .map((port) => ({
      port,
      economicScore: npcDestinationEconomicScore(system, ship, origin, port)
    }))
    .sort((a, b) => (
      b.economicScore - a.economicScore ||
      destinationRank(origin, a.port, seed) - destinationRank(origin, b.port, seed)
    ));
  if (candidates.length === 0) {
    throw new Error(`No NPC destination candidates for ${ship.id} from ${portName(origin)}`);
  }
  return candidates[0].port;
}

function chooseWhalerDestination(system, ship, origin) {
  if (origin.isWhalingGround || npcCargoUnits(ship) > 0) {
    return chooseWhalerSalePort(system, ship, origin);
  }
  if (!system.whaleMemory || system.whalingGrounds.length === 0) {
    throw new Error(`NPC whaler ${ship.id} has no whaling grounds`);
  }
  const profileSpec = fleetProfileForId(ship.profileId);
  const grounds = system.whalingGrounds.filter((ground) => (
    profileSpec.groundIds.includes(ground.whalingGroundId)
  ));
  if (grounds.length !== profileSpec.groundIds.length) {
    throw new Error(`NPC whaler profile ${profileSpec.id} has missing hunting grounds`);
  }
  const seed = hashString32(`${ship.seed}|${origin.tileId}|whaling-ground`);
  return grounds.sort((a, b) => (
    distanceKm(origin, a) - distanceKm(origin, b) ||
    destinationRank(origin, a, seed) - destinationRank(origin, b, seed)
  ))[0];
}

function chooseWhalerSalePort(system, ship, origin) {
  const profileSpec = fleetProfileForId(ship.profileId);
  const quantity = Math.max(1, ship.cargo[WHALE_BLUBBER_GOOD_ID] || ship.cargoCapacity);
  const seed = hashString32(`${ship.seed}|${origin.tileId}|blubber-sale`);
  const candidates = system.ports
    .filter((port) => !samePort(port, origin))
    .filter(profileSpec.portPredicate)
    .filter((port) => npcMerchantCanTradeAtPort(system, ship, port))
    .map((port) => ({
      port,
      score: quotePortPurchase(system.economy, port, WHALE_BLUBBER_GOOD_ID, quantity) -
        distanceKm(origin, port) * FISHING_GROUND_TRAVEL_COST_PER_KM
    }))
    .sort((a, b) => (
      b.score - a.score ||
      destinationRank(origin, a.port, seed) - destinationRank(origin, b.port, seed)
    ));
  if (candidates.length === 0) {
    throw new Error(`No whale-blubber sale port candidates for ${ship.id} from ${portName(origin)}`);
  }
  return candidates[0].port;
}

function chooseFishermanDestination(system, ship, origin) {
  if (origin.isFishingGround || npcCargoUnits(ship) > 0) {
    return chooseFishermanSalePort(system, ship, origin, Math.max(1, ship.cargo[NPC_FISH_GOOD_ID] || ship.cargoCapacity));
  }
  const ground = chooseFishermanFishingGround(system, ship, origin);
  if (ground) return ground;
  return chooseFishermanSalePort(system, ship, origin, Math.max(1, Math.floor(ship.cargoCapacity * 0.5)));
}

function chooseFishermanFishingGround(system, ship, origin) {
  if (!system.fishState || system.fishingGrounds.length === 0) return null;
  const seed = hashString32(`${ship.seed}|${origin.tileId}|fishery`);
  const candidates = system.fishingGrounds
    .map((ground) => {
      const forecast = fishermanGroundForecast(system, ship, origin, ground);
      return forecast ? { ground, ...forecast } : null;
    })
    .filter(Boolean)
    .sort((a, b) => (
      b.score - a.score ||
      destinationRank(origin, a.ground, seed) - destinationRank(origin, b.ground, seed)
    ));
  return candidates[0]?.ground || null;
}

function fishermanGroundForecast(system, ship, origin, ground) {
  const fishery = fisheryForHabitat(system.fishState, ground.habitat, system.economy.lastMinute);
  if (!fishery) return null;
  const net = fishingNetById(ship.fishingNetId);
  const expectedCatch = Math.min(
    ship.cargoCapacity,
    npcFishingNetExpectedHaul(net.id),
    Math.max(0, Math.floor(fishery.population * FISHING_GROUND_CATCH_RATIO))
  );
  if (expectedCatch < FISHING_GROUND_MIN_EXPECTED_CATCH) return null;
  const salePort = chooseFishermanSalePort(system, ship, ground, expectedCatch);
  if (!salePort) return null;
  const saleValue = quotePortPurchase(system.economy, salePort, NPC_FISH_GOOD_ID, expectedCatch);
  const travelKm = distanceKm(origin, ground) + distanceKm(ground, salePort);
  const longRangeKm = Math.max(0, distanceKm(origin, ground) - 900);
  const travelCost = travelKm * FISHING_GROUND_TRAVEL_COST_PER_KM +
    longRangeKm * FISHING_GROUND_LONG_RANGE_COST_PER_KM;
  const densityBonus = 1 + Math.max(0, fishery.density - 0.35) * 0.42;
  return {
    expectedCatch,
    salePort,
    score: saleValue * densityBonus - travelCost
  };
}

function chooseFishermanSalePort(system, ship, origin, quantity) {
  const safeQuantity = Math.max(1, Math.min(ship.cargoCapacity, Math.floor(quantity)));
  const seed = hashString32(`${ship.seed}|${origin.tileId}|fish-sale`);
  const candidates = system.ports
    .filter((port) => !samePort(port, origin))
    .filter((port) => npcMerchantCanTradeAtPort(system, ship, port))
    .map((port) => ({
      port,
      score: fishermanSalePortScore(system, origin, port, safeQuantity)
    }))
    .sort((a, b) => (
      b.score - a.score ||
      destinationRank(origin, a.port, seed) - destinationRank(origin, b.port, seed)
    ));
  if (candidates.length === 0) {
    throw new Error(`No fisherman sale port candidates for ${ship.id} from ${portName(origin)}`);
  }
  return candidates[0].port;
}

function fishermanSalePortScore(system, origin, port, quantity) {
  const saleValue = quotePortPurchase(system.economy, port, NPC_FISH_GOOD_ID, quantity);
  const travelCost = distanceKm(origin, port) * FISHING_GROUND_TRAVEL_COST_PER_KM;
  const routePreference = port.routeRegion === "europe" ? 24 : 0;
  return saleValue + routePreference - travelCost;
}

function harvestNpcFishingGround(system, ship, ground, clockMinutes) {
  if (!system.fishState) return null;
  const fishery = fisheryForHabitat(system.fishState, ground.habitat, clockMinutes);
  if (!fishery) return null;
  const availableQuantity = npcCargoAvailableQuantity(ship, NPC_FISH_GOOD_ID);
  if (availableQuantity <= 0) return null;
  const requested = Math.min(
    availableQuantity,
    npcFishingNetExpectedHaul(ship.fishingNetId)
  );
  const result = harvestFishery(system.fishState, fishery, requested, clockMinutes, { actor: "npc" });
  if (result.quantity <= 0) return result;
  const stored = storeNpcCargo(ship, NPC_FISH_GOOD_ID, result.quantity, 0, "offscreen fishing");
  if (stored !== result.quantity) {
    throw new Error(`NPC fishing capacity changed during harvest: ${ship.id} stored ${stored}/${result.quantity}`);
  }
  return result;
}

function harvestNpcWhalingGround(system, ship, ground, clockMinutes) {
  if (!system.whaleMemory) throw new Error(`NPC whaler ${ship.id} has no whale population`);
  if (!ground.isWhalingGround) throw new Error(`NPC whaler ${ship.id} reached an invalid hunting ground`);
  if (ship.visualNavigation) {
    return Object.freeze({ outcome: "player-observed", whale: null });
  }
  if (ship.lastWhaleHuntMinute !== null) {
    if (!Number.isFinite(ship.lastWhaleHuntMinute)) {
      throw new Error(`NPC whaler ${ship.id} has an invalid hunt time: ${ship.lastWhaleHuntMinute}`);
    }
    if (clockMinutes - ship.lastWhaleHuntMinute < NPC_WHALING_COOLDOWN_MINUTES) {
      return Object.freeze({ outcome: "cooldown", whale: null });
    }
  }
  const availableQuantity = npcCargoAvailableQuantity(ship, WHALE_BLUBBER_GOOD_ID);
  if (availableQuantity <= 0) return Object.freeze({ outcome: "hold-full", whale: null });

  const result = harvestWhaleForNpc(system.whaleMemory, latLonToVector(ground.lat, ground.lon), {
    maxDistanceRad: NPC_WHALING_RANGE_RAD,
    minimumLivingPopulation: NPC_WHALING_MIN_LIVING_POPULATION
  });
  if (result.outcome !== "caught") return result;
  const harvestedQuantity = Math.min(availableQuantity, whaleBlubberYield(result.whale));
  const stored = storeNpcCargo(
    ship,
    WHALE_BLUBBER_GOOD_ID,
    harvestedQuantity,
    0,
    "offscreen whaling"
  );
  if (stored !== harvestedQuantity) {
    throw new Error(`NPC whaling capacity changed during harvest: ${ship.id} stored ${stored}/${harvestedQuantity}`);
  }
  ship.lastWhaleHuntMinute = clockMinutes;
  return Object.freeze({ ...result, quantity: stored });
}

function npcPortIsSafeForShip(system, ship, port) {
  if (port.isFishingGround) return true;
  if (ship.role === NPC_ROLE_PIRATE && system.pirateHideouts.some((hideout) => hideout.tileId === port.tileId)) {
    return true;
  }
  if (port.factionId === NEUTRAL_FACTION_ID) return true;
  if (ship.factionId === PIRATE_FACTION_ID) return port.factionId === PIRATE_FACTION_ID;
  return port.factionId === ship.factionId;
}

function pirateShouldVisitHideout(ship) {
  if (ship.role !== NPC_ROLE_PIRATE || ship.hiddenAtHideout) return false;
  if (ship.seekingHideout) return true;
  if (ship.portVisits < ship.hideoutCooldownUntilPortVisit) return false;
  return hashString32(`${ship.id}|${ship.portVisits}|lay-low`) % 100 < PIRATE_HIDEOUT_VISIT_PERCENT;
}

function choosePirateHideoutDestination(system, ship, origin) {
  const candidates = system.pirateHideouts
    .filter((port) => !samePort(port, origin))
    .sort((a, b) => (
      distanceKm(origin, a) - distanceKm(origin, b) ||
      destinationRank(origin, a, ship.seed) - destinationRank(origin, b, ship.seed)
    ));
  if (candidates.length === 0) throw new Error(`No pirate hideout destination for ${ship.id}`);
  return candidates[0];
}

function enterPirateHideout(ship, arrivalMinute) {
  const stayJitter = hashString32(`${ship.id}|${ship.portVisits}|hideout-stay`) / 0x100000000;
  ship.plan = null;
  ship.finalDestination = null;
  ship.hideoutDestinationTileId = null;
  ship.hiddenAtHideout = true;
  ship.hiddenUntilMinute = arrivalMinute + PIRATE_HIDEOUT_MIN_STAY_MINUTES +
    stayJitter * PIRATE_HIDEOUT_STAY_SPREAD_MINUTES;
}

function npcMerchantCanTradeAtPort(system, ship, port) {
  const relation = system.relationBetween(ship.factionId, port.factionId);
  return evaluateTradeAccess({
    port,
    traderFactionId: ship.factionId,
    relation,
    relationToFaction: (factionId) => system.relationBetween(ship.factionId, factionId),
    foreignSettlementExpulsions: system.foreignSettlementExpulsions,
    simMinute: system.economy.lastMinute,
    tradeAccessGranted: (policyId, factionId) => (
      system.sovereignTradeOpenToFaction(policyId, factionId)
    ),
    suzeraintyPrivilege: suzeraintyTradePrivilege(
      system.suzeraintyMemory,
      ship.factionId,
      port.factionId
    )
  }).allowed;
}

function defaultSovereignTradeOpenToFaction(policyId, factionId) {
  return defaultSovereignTradeGrantedToFaction(policyId, factionId);
}

function npcNeedsFriendlyTradePort(ship) {
  return ship.role === NPC_ROLE_MERCHANT ||
    ship.role === NPC_ROLE_FISHERMAN ||
    ship.role === NPC_ROLE_WHALER;
}

function shipHasCombatGrace(ship) {
  return ship.graceUntilPortVisit > ship.portVisits;
}

function npcDestinationEconomicScore(system, ship, origin, destination) {
  const distancePenalty = 1 + distanceKm(origin, destination) / 1400;
  if (ship.role !== NPC_ROLE_MERCHANT) {
    const targetDistance = ship.role === NPC_ROLE_WARSHIP ? 850 : 1250;
    const patrolFit = 1 / (1 + Math.abs(distanceKm(origin, destination) - targetDistance));
    const variation = destinationRank(origin, destination, ship.seed) / 0xffffffff;
    return patrolFit * 1000 - variation * 0.05;
  }
  if (npcCargoUnits(ship) > 0) {
    const saleValue = cargoSaleValue(
      system.economy,
      destination,
      ship.cargo,
      npcSaleMultiplier(system, ship, destination)
    );
    const cargoCost = Object.values(ship.cargoCost).reduce((sum, value) => sum + value, 0);
    return (saleValue - cargoCost + saleValue * 0.04) / distancePenalty;
  }
  const cartazCost = npcCartazVoyageCost(system, ship, origin, destination);
  if (!Number.isFinite(cartazCost) || cartazCost > ship.specie) return Number.NEGATIVE_INFINITY;
  const trade = planNpcTrade(system.economy, origin, destination, {
    cargoCapacity: ship.cargoCapacity,
    specie: ship.specie - cartazCost,
    purchasePriceMultiplier: npcPurchaseMultiplier(system, ship, origin),
    salePriceMultiplier: npcSaleMultiplier(system, ship, destination)
  });
  return (trade.expectedProfit - cartazCost) / distancePenalty;
}

function buyNpcCargo(system, ship, origin, destination) {
  if (ship.role !== NPC_ROLE_MERCHANT) throw new Error(`NPC ${ship.id} cannot buy trade cargo as ${ship.role}`);
  if (!npcMerchantCanTradeAtPort(system, ship, origin) ||
      !npcMerchantCanTradeAtPort(system, ship, destination)) {
    throw new Error(`NPC merchant ${ship.id} cannot trade across a hostile port route`);
  }
  const cartazCost = npcCartazVoyageCost(system, ship, origin, destination);
  if (!Number.isFinite(cartazCost) || cartazCost > ship.specie) return;
  const purchaseMultiplier = npcPurchaseMultiplier(system, ship, origin);
  const saleMultiplier = npcSaleMultiplier(system, ship, destination);
  const plan = planNpcTrade(system.economy, origin, destination, {
    cargoCapacity: ship.cargoCapacity,
    specie: ship.specie - cartazCost,
    purchasePriceMultiplier: purchaseMultiplier,
    salePriceMultiplier: saleMultiplier
  });
  if (plan.expectedProfit <= cartazCost) return;
  if (cartazCost > 0) {
    ship.specie -= cartazCost;
    ship.cartazUntilMinute = system.economy.lastMinute +
      PORTUGUESE_CARTAZ_DURATION_DAYS * WEATHER_MINUTES_PER_DAY;
  }
  for (const line of plan.lines) {
    const holdQuantity = npcCargoAvailableQuantity(ship, line.goodId);
    if (holdQuantity <= 0) break;
    const quantity = maximumPortSaleQuantity(
      system.economy,
      origin,
      line.goodId,
      Math.min(line.quantity, holdQuantity),
      ship.specie,
      purchaseMultiplier(line.goodId)
    );
    if (quantity <= 0) continue;
    const transaction = executePortSale(
      system.economy,
      origin,
      line.goodId,
      quantity,
      purchaseMultiplier(line.goodId)
    );
    ship.specie -= transaction.total;
    const stored = storeNpcCargo(ship, line.goodId, quantity, transaction.total, "port purchase");
    if (stored !== quantity) {
      throw new Error(`NPC port purchase exceeded available hold: ${ship.id} stored ${stored}/${quantity}`);
    }
  }
}

function sellNpcCargo(system, ship, port) {
  if (npcNeedsFriendlyTradePort(ship) && !npcMerchantCanTradeAtPort(system, ship, port)) {
    throw new Error(`NPC ${ship.role} ${ship.id} cannot trade at hostile port ${portName(port)}`);
  }
  for (const [goodId, held] of Object.entries(ship.cargo)) {
    tradeGoodById(goodId);
    if (!Number.isInteger(held) || held <= 0) throw new Error(`NPC ship ${ship.id} has invalid ${goodId} cargo: ${held}`);
    const saleMultiplier = npcSaleMultiplier(system, ship, port)(goodId);
    const quantity = maximumPortPurchaseQuantity(system.economy, port, goodId, held, saleMultiplier);
    if (quantity <= 0) continue;
    const transaction = executePortPurchase(system.economy, port, goodId, quantity, saleMultiplier);
    const totalCost = ship.cargoCost[goodId] || 0;
    const soldCost = totalCost * (quantity / held);
    ship.specie += transaction.total;
    ship.lifetimeProfit += transaction.total - soldCost;
    const remaining = held - quantity;
    if (remaining > 0) {
      ship.cargo[goodId] = remaining;
      ship.cargoCost[goodId] = totalCost - soldCost;
    } else {
      delete ship.cargo[goodId];
      delete ship.cargoCost[goodId];
    }
  }
}

function npcPurchaseMultiplier(system, ship, port) {
  return (goodId) => npcTradeTerms(system, ship, port, goodId).purchaseMultiplier;
}

function npcSaleMultiplier(system, ship, port) {
  return (goodId) => npcTradeTerms(system, ship, port, goodId).saleMultiplier;
}

function npcTradeTerms(system, ship, port, goodId) {
  return tradeTerms({
    port,
    traderFactionId: ship.factionId,
    relation: system.relationBetween(ship.factionId, port.factionId),
    relationToFaction: (factionId) => system.relationBetween(ship.factionId, factionId),
    foreignSettlementExpulsions: system.foreignSettlementExpulsions,
    suzeraintyPrivilege: suzeraintyTradePrivilege(
      system.suzeraintyMemory,
      ship.factionId,
      port.factionId
    ),
    goodId
  });
}

function npcCartazVoyageCost(system, ship, origin, destination) {
  if (ship.role !== NPC_ROLE_MERCHANT || ship.factionId === PORTUGUESE_FACTION_ID) return 0;
  if (ship.cartazUntilMinute > system.economy.lastMinute) return 0;
  const entersEnforcementZone = [origin, destination].some((port) => portugueseCartazRequired({
    traderFactionId: ship.factionId,
    latitudeDeg: port.lat,
    longitudeDeg: port.lon
  }));
  if (!entersEnforcementZone) return 0;
  const fee = portugueseCartazFee({
    traderFactionId: ship.factionId,
    relation: system.relationBetween(ship.factionId, PORTUGUESE_FACTION_ID),
    cargoCapacity: ship.cargoCapacity
  });
  return fee === null ? Number.POSITIVE_INFINITY : fee;
}

function receiveNpcLoot(ship, loot) {
  ship.specie += loot.specie;
  for (const [goodId, available] of Object.entries(loot.cargo)) {
    storeNpcCargo(ship, goodId, available, 0, "captured cargo");
  }
}

export function reconcileNpcCargoCapacity(ship, source) {
  if (typeof source !== "string" || source.trim() === "") {
    throw new Error("NPC cargo reconciliation requires a source");
  }
  const beforeUnits = inspectNpcCargo(ship);
  if (beforeUnits <= ship.cargoCapacity) return null;

  let excessUnits = beforeUnits - ship.cargoCapacity;
  const removed = {};
  const candidates = Object.entries(ship.cargo)
    .filter(([, quantity]) => quantity > 0)
    .map(([goodId, quantity]) => ({ goodId, quantity, good: tradeGoodById(goodId) }))
    .sort((a, b) => a.goodId.localeCompare(b.goodId));
  let randomState = hashString32(
    `${ship.id}|${ship.cargoCapacity}|${beforeUnits}|${candidates.map((item) => `${item.goodId}:${item.quantity}`).join("|")}`
  );

  while (excessUnits > 0) {
    if (candidates.length === 0) {
      throw new Error(`NPC ship ${ship.id} could not jettison ${excessUnits} excess cargo units`);
    }
    randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0;
    const candidateIndex = randomState % candidates.length;
    const candidate = candidates[candidateIndex];
    const quantity = Math.min(
      candidate.quantity,
      Math.ceil(excessUnits / candidate.good.unitSize)
    );
    const heldBefore = ship.cargo[candidate.goodId];
    const heldAfter = heldBefore - quantity;
    const costBefore = npcCargoCost(ship, candidate.goodId);
    removed[candidate.goodId] = (removed[candidate.goodId] || 0) + quantity;
    excessUnits = Math.max(0, excessUnits - quantity * candidate.good.unitSize);
    candidate.quantity = heldAfter;
    if (heldAfter > 0) {
      ship.cargo[candidate.goodId] = heldAfter;
      ship.cargoCost[candidate.goodId] = costBefore * (heldAfter / heldBefore);
    } else {
      delete ship.cargo[candidate.goodId];
      delete ship.cargoCost[candidate.goodId];
      candidates.splice(candidateIndex, 1);
    }
  }

  const afterUnits = npcCargoUnits(ship);
  const report = {
    shipId: ship.id,
    shipSlug: ship.slug,
    source,
    capacity: ship.cargoCapacity,
    beforeUnits,
    afterUnits,
    removed
  };
  console.warn("NPC cargo capacity exceeded; cargo was jettisoned", report);
  return report;
}

export function storeNpcCargo(ship, goodId, requestedQuantity, costBasis, source) {
  if (!Number.isInteger(requestedQuantity) || requestedQuantity < 0) {
    throw new Error(`NPC cargo storage requires a non-negative quantity: ${requestedQuantity}`);
  }
  if (!Number.isFinite(costBasis) || costBasis < 0) {
    throw new Error(`NPC cargo storage requires a non-negative cost basis: ${costBasis}`);
  }
  reconcileNpcCargoCapacity(ship, source);
  const quantity = Math.min(requestedQuantity, npcCargoAvailableQuantity(ship, goodId));
  if (quantity <= 0) return 0;
  const acceptedCost = requestedQuantity > 0 ? costBasis * (quantity / requestedQuantity) : 0;
  ship.cargo[goodId] = (ship.cargo[goodId] || 0) + quantity;
  ship.cargoCost[goodId] = npcCargoCost(ship, goodId) + acceptedCost;
  if (npcCargoUnits(ship) > ship.cargoCapacity) {
    throw new Error(`NPC cargo storage overflowed after capacity check: ${ship.id}`);
  }
  return quantity;
}

function npcCargoUnits(ship) {
  const units = inspectNpcCargo(ship);
  if (units > ship.cargoCapacity) {
    throw new Error(`NPC ship ${ship.id} exceeds cargo capacity: ${units}/${ship.cargoCapacity}`);
  }
  return units;
}

function inspectNpcCargo(ship) {
  if (!ship || typeof ship.id !== "string" || ship.id === "" ||
      !Number.isInteger(ship.cargoCapacity) || ship.cargoCapacity < 0 ||
      !ship.cargo || typeof ship.cargo !== "object" || Array.isArray(ship.cargo) ||
      !ship.cargoCost || typeof ship.cargoCost !== "object" || Array.isArray(ship.cargoCost)) {
    throw new Error(`Invalid NPC cargo state: ${ship?.id}`);
  }
  let units = 0;
  for (const [goodId, quantity] of Object.entries(ship.cargo)) {
    const good = tradeGoodById(goodId);
    if (!Number.isInteger(quantity) || quantity < 0) throw new Error(`NPC ship ${ship.id} has invalid ${goodId} cargo: ${quantity}`);
    npcCargoCost(ship, goodId);
    units += quantity * good.unitSize;
  }
  return units;
}

function npcCargoCost(ship, goodId) {
  const cost = ship.cargoCost[goodId] ?? 0;
  if (!Number.isFinite(cost) || cost < 0) {
    throw new Error(`NPC ship ${ship.id} has invalid ${goodId} cargo cost: ${cost}`);
  }
  return cost;
}

function reconcileNpcFleetCargo(system, source) {
  let changed = false;
  for (const ship of system.ships) {
    if (reconcileNpcCargoCapacity(ship, source)) changed = true;
  }
  return changed;
}

export function npcCargoAvailableQuantity(ship, goodId) {
  if (!ship || !Number.isInteger(ship.cargoCapacity) || ship.cargoCapacity < 0) {
    throw new Error(`NPC cargo availability requires a valid ship capacity: ${ship?.cargoCapacity}`);
  }
  const good = tradeGoodById(goodId);
  return Math.floor((ship.cargoCapacity - npcCargoUnits(ship)) / good.unitSize);
}

function chooseSeasonalHop(system, ship, origin, desiredDestination, startMinute) {
  const candidates = system.ports
    .filter((port) => !samePort(port, origin) && !samePort(port, desiredDestination))
    .filter((port) => ship.role !== NPC_ROLE_PIRATE || !npcPortHasMajorProtection(port))
    .filter((port) => !npcNeedsFriendlyTradePort(ship) || npcMerchantCanTradeAtPort(system, ship, port))
    .filter((port) => port.routeRegion === origin.routeRegion || distanceKm(origin, port) <= NPC_ROUTE_HOP_MAX_KM)
    .map((port) => ({
      port,
      distance: distanceKm(origin, port),
      towardFinal: distanceKm(port, desiredDestination)
    }))
    .filter((item) => item.distance >= NPC_MIN_TRIP_DISTANCE_KM && item.distance <= NPC_ROUTE_HOP_MAX_KM)
    .sort((a, b) => a.towardFinal - b.towardFinal || a.distance - b.distance)
    .slice(0, 12);

  for (const item of candidates) {
    const route = routeBetweenPorts(system, origin, item.port, ship.slug, startMinute);
    if (route.waitDays <= 12 && route.totalDays <= NPC_ROUTE_HOP_MAX_DAYS) {
      return { port: item.port, route };
    }
  }
  return null;
}

export function routeBetweenPorts(system, origin, destination, shipSlug, startMinute) {
  const startMonth = routeMonthIndex(startMinute);
  const key = `${origin.tileId}|${destination.tileId}|${shipSlug}|${startMonth}`;
  const cached = system.routeCache.get(key);
  if (cached) return cached;

  const route = computeSeasonalRoute(system, origin, destination, shipSlug, startMinute);
  rememberCache(system.routeCache, key, route, ROUTE_CACHE_LIMIT);
  return route;
}

function computeSeasonalRoute(system, origin, destination, shipSlug, startMinute) {
  const graph = routeGraphForPorts(system, origin, destination);
  const startId = portNodeId(origin, "origin");
  const destinationId = portNodeId(destination, "destination");
  const startMonth = routeMonthIndex(startMinute);
  const startStep = 0;
  const startKey = routeStateKey(startId, startStep);
  const distances = new Map([[startKey, 0]]);
  const previous = new Map();
  const open = [{ key: startKey, nodeId: startId, step: startStep, days: 0 }];

  while (open.length > 0) {
    open.sort((a, b) => a.days - b.days);
    const current = open.shift();
    if (current.days !== distances.get(current.key)) continue;
    if (current.nodeId === destinationId) {
      return materializeRoute(system, graph, previous, current.key, origin, destination, shipSlug, startMinute);
    }

    if (current.step < ROUTE_MAX_MONTH_STEPS) {
      const nextStep = current.step + 1;
      const waitDays = ROUTE_MONTH_DAYS;
      relaxRouteState({
        distances,
        previous,
        open,
        from: current,
        toNodeId: current.nodeId,
        toStep: nextStep,
        costDays: waitDays,
        action: { type: "wait", days: waitDays }
      });
    }

    const edges = graph.adjacency.get(current.nodeId) || [];
    for (const edge of edges) {
      const month = (startMonth + current.step) % ROUTE_MONTHS;
      const costDays = seasonalEdgeCostDays(system, graph.nodes, edge, shipSlug, month);
      if (!Number.isFinite(costDays)) continue;
      const nextStep = Math.max(current.step, Math.min(
        ROUTE_MAX_MONTH_STEPS,
        Math.floor((current.days + costDays) / ROUTE_MONTH_DAYS)
      ));
      relaxRouteState({
        distances,
        previous,
        open,
        from: current,
        toNodeId: edge.to,
        toStep: nextStep,
        costDays,
        action: { type: "edge", edge }
      });
    }
  }

  throw new Error(`No seasonal NPC route from ${portName(origin)} to ${portName(destination)} for ${shipSlug}`);
}

function relaxRouteState({ distances, previous, open, from, toNodeId, toStep, costDays, action }) {
  const toKey = routeStateKey(toNodeId, toStep);
  const nextDays = from.days + costDays;
  if (nextDays >= (distances.get(toKey) ?? Infinity)) return;
  distances.set(toKey, nextDays);
  previous.set(toKey, { fromKey: from.key, action });
  open.push({ key: toKey, nodeId: toNodeId, step: toStep, days: nextDays });
}

function materializeRoute(system, graph, previous, endKey, origin, destination, shipSlug, startMinute) {
  const actions = [];
  let cursor = endKey;
  while (previous.has(cursor)) {
    const entry = previous.get(cursor);
    actions.push(entry.action);
    cursor = entry.fromKey;
  }
  actions.reverse();

  const segments = [];
  let currentPoint = portPoint(origin);
  let elapsedDays = 0;
  let waitDays = 0;
  for (const action of actions) {
    if (action.type === "wait") {
      segments.push({
        kind: "wait",
        from: currentPoint,
        to: currentPoint,
        startOffsetMinutes: elapsedDays * WEATHER_MINUTES_PER_DAY,
        endOffsetMinutes: (elapsedDays + action.days) * WEATHER_MINUTES_PER_DAY
      });
      elapsedDays += action.days;
      if (segments.every((segment) => segment.kind === "wait")) waitDays += action.days;
      continue;
    }

    const from = graph.nodes.get(action.edge.from);
    const to = graph.nodes.get(action.edge.to);
    const month = routeMonthIndex(startMinute + elapsedDays * WEATHER_MINUTES_PER_DAY);
    const durationDays = seasonalEdgeCostDays(system, graph.nodes, action.edge, shipSlug, month);
    if (!Number.isFinite(durationDays)) {
      throw new Error(`Materialized route edge became unavailable: ${action.edge.from} -> ${action.edge.to}`);
    }
    currentPoint = from;
    segments.push({
      kind: "sail",
      from,
      to,
      startOffsetMinutes: elapsedDays * WEATHER_MINUTES_PER_DAY,
      endOffsetMinutes: (elapsedDays + durationDays) * WEATHER_MINUTES_PER_DAY
    });
    currentPoint = to;
    elapsedDays += durationDays;
  }

  if (segments.length === 0) {
    throw new Error(`Seasonal route from ${portName(origin)} to ${portName(destination)} has no segments`);
  }

  return {
    origin,
    destination,
    waitDays,
    totalDays: Math.max(NPC_ROUTE_MIN_DURATION_DAYS, elapsedDays),
    segments
  };
}

function buildNpcPlan(origin, destination, route, startMinute) {
  let endMinute = startMinute;
  const segments = [];
  for (const routeSegment of route.segments) {
    const routeStartMinute = startMinute + routeSegment.startOffsetMinutes;
    const routeEndMinute = startMinute + routeSegment.endOffsetMinutes;
    const start = Math.max(endMinute, routeStartMinute);
    const duration = Math.max(
      NPC_ROUTE_MIN_DURATION_DAYS * WEATHER_MINUTES_PER_DAY,
      routeEndMinute - routeStartMinute
    );
    const segment = {
      ...routeSegment,
      startMinute: start,
      endMinute: start + duration
    };
    delete segment.startOffsetMinutes;
    delete segment.endOffsetMinutes;
    segments.push(segment);
    endMinute = segment.endMinute;
  }

  return {
    origin,
    destination,
    segments,
    startMinute,
    endMinute
  };
}

function npcShipSnapshot(ship, clockMinutes) {
  if (ship.hiddenAtHideout) {
    return {
      id: ship.id,
      hidden: true,
      role: ship.role,
      factionId: ship.factionId
    };
  }
  const plan = ship.plan;
  if (!plan) return null;
  const segment = plan.segments.find((item) => clockMinutes >= item.startMinute && clockMinutes < item.endMinute);
  if (!segment || segment.kind === "wait") {
    if (!ship.visualNavigation) return null;
    return {
      id: ship.id,
      slug: ship.slug,
      routeVector: ship.visualNavigation.vector.slice(),
      routeHeading: ship.visualNavigation.heading.slice(),
      routeKey: `held:${segment?.startMinute ?? plan.endMinute}`,
      factionId: ship.factionId,
      role: ship.role,
      hitPoints: ship.hitPoints,
      maxHitPoints: ship.maxHitPoints,
      fishingNetId: ship.fishingNetId,
      combatGrace: ship.graceUntilPortVisit > ship.portVisits
    };
  }
  const t = clamp01((clockMinutes - segment.startMinute) / (segment.endMinute - segment.startMinute));
  const vectors = vectorsForRouteSegment(segment);
  const routeVector = slerpVector(vectors.from, vectors.to, t);
  const routeHeading = headingVectorForVectors(routeVector, vectors.from, vectors.to);
  return {
    id: ship.id,
    slug: ship.slug,
    routeVector,
    routeHeading,
    routeKey: `${segment.from.id}->${segment.to.id}@${segment.startMinute}`,
    factionId: ship.factionId,
    role: ship.role,
    hitPoints: ship.hitPoints,
    maxHitPoints: ship.maxHitPoints,
    fishingNetId: ship.fishingNetId,
    combatGrace: ship.graceUntilPortVisit > ship.portVisits
  };
}

function npcEffectiveClock(ship, clockMinutes) {
  return clockMinutes + ship.clockOffsetMinutes;
}

function requiredNpcShip(system, shipId) {
  const ship = system.shipById?.get(shipId);
  if (!ship) throw new Error(`Unknown NPC ship: ${shipId}`);
  return ship;
}

function synchronizeNpcRouteClock(ship, clockMinutes, vector) {
  const effectiveClock = npcEffectiveClock(ship, clockMinutes);
  const segment = ship.plan?.segments.find((item) => (
    item.kind === "sail" && effectiveClock >= item.startMinute && effectiveClock < item.endMinute
  ));
  if (!segment) return;
  const progress = routeProgressForVector(segment, vector);
  const reconciledClock = segment.startMinute + (segment.endMinute - segment.startMinute) * progress;
  ship.clockOffsetMinutes += reconciledClock - effectiveClock;
}

function routeProgressForVector(segment, vector) {
  const from = latLonToVector(segment.from.lat, segment.from.lon);
  const to = latLonToVector(segment.to.lat, segment.to.lon);
  const endpointDot = clamp(vectorDot(from, to), -1, 1);
  const arc = Math.acos(endpointDot);
  if (arc <= 1e-8) return 0;
  const orthogonal = normalizedVector([
    to[0] - from[0] * endpointDot,
    to[1] - from[1] * endpointDot,
    to[2] - from[2] * endpointDot
  ], "NPC route progress axis");
  const alongArc = Math.atan2(vectorDot(vector, orthogonal), vectorDot(vector, from));
  return clamp01(alongArc / arc);
}

function normalizedVector(vector, label) {
  if (!Array.isArray(vector) || vector.length !== 3 || vector.some((value) => !Number.isFinite(value))) {
    throw new Error(`${label} must be a finite 3D vector`);
  }
  const length = Math.hypot(vector[0], vector[1], vector[2]);
  if (length <= 1e-9) throw new Error(`${label} cannot be zero`);
  return [vector[0] / length, vector[1] / length, vector[2] / length];
}

function normalizedTangent(heading, position, label) {
  const direction = normalizedVector(heading, label);
  const radial = vectorDot(direction, position);
  return normalizedVector([
    direction[0] - position[0] * radial,
    direction[1] - position[1] * radial,
    direction[2] - position[2] * radial
  ], label);
}

function vectorDot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function routeGraphForPorts(system, origin, destination) {
  const nodes = new Map(system.laneNodes);
  const adjacency = cloneBaseAdjacency(system.baseEdges);
  addPortNode(nodes, adjacency, origin, "origin");
  addPortNode(nodes, adjacency, destination, "destination");
  return { nodes, adjacency };
}

function addPortNode(nodes, adjacency, port, role) {
  const id = portNodeId(port, role);
  nodes.set(id, {
    id,
    label: portName(port),
    lat: port.lat,
    lon: port.lon,
    port
  });
  for (const anchorId of port.routeAnchors) {
    if (!nodes.has(anchorId)) throw new Error(`Port ${portName(port)} uses unknown route anchor: ${anchorId}`);
    addDirectedEdge(adjacency, edgeRecord(id, anchorId, "port"));
    addDirectedEdge(adjacency, edgeRecord(anchorId, id, "port"));
  }
}

function buildDirectedLaneEdges(laneNodes) {
  const adjacency = new Map();
  for (const edge of LANE_EDGES) {
    if (!laneNodes.has(edge.a) || !laneNodes.has(edge.b)) {
      throw new Error(`Unknown lane edge endpoint: ${edge.a} -> ${edge.b}`);
    }
    addDirectedEdge(adjacency, edgeRecord(edge.a, edge.b, edge.kind));
    addDirectedEdge(adjacency, edgeRecord(edge.b, edge.a, edge.kind));
  }
  return adjacency;
}

function cloneBaseAdjacency(baseEdges) {
  const adjacency = new Map();
  for (const [nodeId, edges] of baseEdges.entries()) adjacency.set(nodeId, edges.slice());
  return adjacency;
}

function addDirectedEdge(adjacency, edge) {
  const edges = adjacency.get(edge.from) || [];
  edges.push(edge);
  adjacency.set(edge.from, edges);
}

function edgeRecord(from, to, kind) {
  return { id: `${from}->${to}:${kind}`, from, to, kind };
}

function seasonalEdgeCostDays(system, nodes, edge, shipSlug, month) {
  const key = `${edge.id}|${shipSlug}|${month}`;
  const cached = system.edgeCostCache.get(key);
  if (cached !== undefined) return cached;

  const from = nodes.get(edge.from);
  const to = nodes.get(edge.to);
  if (!from || !to) throw new Error(`Route edge references missing node: ${edge.from} -> ${edge.to}`);
  const distance = distanceKm(from, to);
  if (distance < 1) return 0.1;

  const stats = shipStatsForSlug(shipSlug);
  const bearing = bearingEastNorthRad(from, to);
  const samples = [0.22, 0.5, 0.78].map((t) => slerpPoint(from, to, t));
  let factorTotal = 0;
  for (const sample of samples) {
    const wind = windAtLatLonDeg(
      sample.lat,
      sample.lon,
      dateToSubsolarLatDeg(routeMonthDate(month)),
      {
        seed: ROUTE_WIND_SEED,
        simMinute: Math.floor((month + 0.5) * ROUTE_MONTH_MINUTES),
        noiseDirectionRad: 0.08,
        noiseStrength: 0.12
      }
    );
    const factor = routeWindProgressFactor(stats, bearing, wind, edge.kind);
    if (factor <= 0) {
      rememberCache(system.edgeCostCache, key, Infinity, ROUTE_CACHE_LIMIT * 4);
      return Infinity;
    }
    factorTotal += factor;
  }

  const factor = factorTotal / samples.length;
  const baseKmPerDay = clamp(
    stats.topSpeedRad * 7200,
    stats.propulsion === SHIP_PROPULSION_OAR ? 60 : 115,
    360
  );
  const kindMul = edge.kind === "strait" ? 0.78 : edge.kind === "coastal" || edge.kind === "port" ? 0.88 : 1;
  const days = distance / Math.max(25, baseKmPerDay * factor * kindMul);
  const result = Math.max(0.12, days);
  rememberCache(system.edgeCostCache, key, result, ROUTE_CACHE_LIMIT * 4);
  return result;
}

function routeWindProgressFactor(stats, bearing, wind, edgeKind) {
  if (stats.propulsion === SHIP_PROPULSION_OAR) return 1;
  const flow = normalizeAngleRad(wind.directionRad + Math.PI);
  const alignment = Math.cos(shortestAngleDelta(bearing, flow));
  const angleFromWind = Math.acos(clamp(-alignment, -1, 1));
  const stall = stats.upwindStallAngleRad;
  const narrow = edgeKind === "strait";
  let efficiency;
  if (angleFromWind <= stall) {
    if (narrow) {
      efficiency = 0.08;
    } else {
      const tackAngle = Math.min(Math.PI / 2 - 0.04, stall + 0.44);
      const tackingVmg = Math.max(0.18, Math.cos(tackAngle - angleFromWind));
      efficiency = directSailingEfficiency(stats, tackAngle) * tackingVmg * 0.72;
    }
  } else {
    efficiency = directSailingEfficiency(stats, angleFromWind);
  }
  const windPower = 0.34 + wind.strength * 0.92;
  const sailingProgress = clamp(efficiency * windPower, 0.04, 1.2);
  return stats.propulsion === SHIP_PROPULSION_OAR_SAIL
    ? Math.max(HYBRID_ROUTE_PROGRESS_FLOOR, sailingProgress)
    : sailingProgress;
}

function directSailingEfficiency(stats, angleFromWind) {
  const stallAngle = stats.upwindStallAngleRad;
  const closeHauledAngle = Math.min(Math.PI / 2 - 0.01, stallAngle + 0.44);
  if (angleFromWind <= stallAngle) return 0;
  if (angleFromWind <= closeHauledAngle) {
    const t = easeInOut((angleFromWind - stallAngle) / (closeHauledAngle - stallAngle));
    return 0.42 * t;
  }
  if (angleFromWind <= Math.PI / 2) {
    const t = easeInOut((angleFromWind - closeHauledAngle) / (Math.PI / 2 - closeHauledAngle));
    return 0.42 + (1 - 0.42) * t;
  }
  if (angleFromWind <= Math.PI * 0.75) {
    const t = (angleFromWind - Math.PI / 2) / (Math.PI * 0.25);
    return 1 - t * 0.15;
  }
  const t = (angleFromWind - Math.PI * 0.75) / (Math.PI * 0.25);
  return 0.85 - t * 0.3;
}

function rankedProfilePorts(ports, profileSpec) {
  return ports
    .filter(profileSpec.portPredicate)
    .sort((a, b) => b.population - a.population || portName(a).localeCompare(portName(b)))
    .slice(0, profileSpec.mode === "regional" ? 34 : 54);
}

function destinationRank(origin, candidate, seed) {
  const distance = distanceKm(origin, candidate);
  const ideal = origin.routeRegion === candidate.routeRegion ? 1150 : 7400;
  const populationBoost = Math.log10(Math.max(10, candidate.population || 10)) * -80;
  const jitter = hashString32(`${seed}|${candidate.tileId}`) % 500;
  return Math.abs(distance - ideal) + populationBoost + jitter;
}

function longRangePairAllowed(a, b) {
  const pair = new Set([a.routeRegion, b.routeRegion]);
  if (pair.has("east-asia") && pair.has("europe")) return true;
  if (pair.has("south-asia") && pair.has("europe")) return true;
  if (pair.has("indian-ocean") && pair.has("europe")) return true;
  if (pair.has("americas") && pair.has("europe")) return true;
  if (pair.has("africa") && pair.has("europe")) return true;
  if (pair.has("east-asia") && pair.has("indian-ocean")) return true;
  if (pair.has("east-asia") && pair.has("polynesia")) return true;
  return distanceKm(a, b) > 2800;
}

function isAnyUsablePort(port) {
  return Number.isFinite(port.lat) && Number.isFinite(port.lon) && Number.isFinite(port.population);
}

function normalizeNpcRoutePort(port) {
  return {
    ...port,
    factionId: assertFactionId(port.factionId),
    routeRegion: portRouteRegion(port),
    routeAnchors: anchorIdsForPort(port)
  };
}

function isEastAsiaPort(port) {
  if (isNativeCoastalPort(port)) return false;
  return port.cityType === "east-asian" || (port.lon >= 105 && port.lon <= 145 && port.lat >= 10 && port.lat <= 42);
}

function isIndianOceanPort(port) {
  return port.cityType === "south-asian" ||
    (port.lon >= 38 && port.lon <= 86 && port.lat >= -12 && port.lat <= 28);
}

function isSoutheastAsiaPort(port) {
  return port.cityType === "southeast-asian";
}

function isPolynesianPort(port) {
  return port.cityType === "polynesian";
}

function isMesoamericanVillagePort(port) {
  return port.cityType === "mesoamerican" &&
    port.settlementType === "village" &&
    port.manualRegion !== "northwest-coast";
}

function isMediterraneanPort(port) {
  return port.cityType === "mediterranean" ||
    (port.lon >= -7 && port.lon <= 42 && port.lat >= 30 && port.lat <= 46);
}

function isAtlanticPort(port) {
  if (isNativeCoastalPort(port)) return false;
  return port.cityType === "northern-european" ||
    (port.lon >= -85 && port.lon <= 20 && port.lat >= -36 && port.lat <= 58);
}

function isNorthAtlanticWhalingPort(port) {
  if (!isAtlanticPort(port) || port.lat < 35) return false;
  return port.routeAnchors.includes("north-sea") || port.routeAnchors.includes("biscay");
}

function isJapaneseWhalingPort(port) {
  return port.factionId === "japan" && isEastAsiaPort(port);
}

function isNorthwestCoastWhalingPort(port) {
  return port.manualRegion === "northwest-coast";
}

function isLongRangePort(port) {
  return isAnyUsablePort(port) && !isNativeCoastalPort(port) && [
    "europe",
    "south-asia",
    "east-asia",
    "indian-ocean",
    "africa",
    "americas",
    "polynesia"
  ].includes(portRouteRegion(port));
}

function isWideWorldPort(port) {
  return isAnyUsablePort(port) && !isNativeCoastalPort(port);
}

function isNativeCoastalPort(port) {
  return port.cityType === "polynesian" || port.cityType === "mesoamerican" || port.cityType === "andean";
}

function portRouteRegion(port) {
  if (port.cityType === "polynesian") return "polynesia";
  if (isEastAsiaPort(port)) return "east-asia";
  if (port.cityType === "southeast-asian") return "southeast-asia";
  if (port.cityType === "south-asian") return "south-asia";
  if (port.lon < -25) return "americas";
  if (port.cityType === "northern-european" || port.cityType === "mediterranean") return "europe";
  if (port.cityType === "sub-saharan") return "africa";
  if (port.cityType === "islamic-desert") return "indian-ocean";
  if (port.lon >= 35 && port.lon <= 90 && port.lat >= -12 && port.lat <= 30) return "indian-ocean";
  return "other";
}

function anchorIdsForPort(port) {
  if (isNorthwestCoastWhalingPort(port)) return ["yuquot"];
  const region = portRouteRegion(port);
  if (region === "east-asia") return nearestAnchors(port, ["canton", "nagasaki", "manila"], 2);
  if (region === "southeast-asia") {
    if (portName(port).toLowerCase() === "malacca") return ["malacca"];
    return nearestAnchors(port, ["malacca", "singapore", "sunda", "manila"], 2);
  }
  if (region === "south-asia") return nearestAnchors(port, ["goa", "ceylon", "arabian-sea"], 2);
  if (region === "indian-ocean") return nearestAnchors(port, ["aden", "hormuz", "red-sea", "zanzibar", "arabian-sea"], 2);
  if (region === "europe") {
    if (port.lat > 46) return nearestAnchors(port, ["north-sea", "biscay", "gibraltar"], 2);
    return nearestAnchors(port, ["gibraltar", "sicily", "alexandria", "constantinople", "venice"], 2);
  }
  if (region === "africa") {
    return port.lat < -5
      ? nearestAnchors(port, ["goodhope", "mozambique", "zanzibar"], 2)
      : nearestAnchors(port, ["guinea", "cape-verde", "zanzibar"], 2);
  }
  if (region === "polynesia") return nearestAnchors(port, ["new-guinea", "fiji", "tahiti"], 2);
  if (region === "americas") return nearestAnchors(port, ["caribbean", "havana", "brazil-bulge", "magellan"], 2);
  return nearestAnchors(port, LANE_NODES.map((node) => node.id), 2);
}

function nearestAnchors(port, anchorIds, count) {
  const byDistance = anchorIds
    .map((id) => {
      const node = LANE_NODES.find((item) => item.id === id);
      if (!node) throw new Error(`Unknown NPC route anchor: ${id}`);
      return { id, distance: distanceKm(port, node) };
    })
    .sort((a, b) => a.distance - b.distance)
    .slice(0, count)
    .map((item) => item.id);
  return byDistance;
}

function laneNode(id, label, lat, lon) {
  return Object.freeze({ id, label, lat, lon });
}

function laneEdge(a, b, kind) {
  return Object.freeze({ a, b, kind });
}

function profile(id, count, shipPools, portPredicate, mode, roleWeights = null) {
  const fisherSlugs = Object.freeze([...(shipPools.fishers || shipPools.merchants)]);
  const merchantSlugs = Object.freeze([...shipPools.merchants]);
  const warshipSlugs = Object.freeze([...shipPools.warships]);
  if (fisherSlugs.length === 0 || merchantSlugs.length === 0 || warshipSlugs.length === 0) {
    throw new Error(`NPC fleet profile ${id} needs fisher, merchant, and warship hulls`);
  }
  if (roleWeights) {
    const roles = ["merchant", "fisherman", "warship", "pirate"];
    for (const role of roles) {
      if (!Number.isInteger(roleWeights[role]) || roleWeights[role] < 0) {
        throw new Error(`NPC fleet profile ${id} has an invalid ${role} weight`);
      }
    }
    const total = roles.reduce((sum, role) => sum + roleWeights[role], 0);
    if (total !== 100) throw new Error(`NPC fleet profile ${id} role weights total ${total}, expected 100`);
  }
  for (const slug of [...fisherSlugs, ...merchantSlugs, ...warshipSlugs]) shipStatsForSlug(slug);
  return Object.freeze({ id, count, fisherSlugs, merchantSlugs, warshipSlugs, portPredicate, mode, roleWeights });
}

function whalerProfile(id, count, whalerSlugs, groundIds, portPredicate, minimumPorts) {
  if (!Number.isInteger(count) || count <= 0) throw new Error(`NPC whaler profile ${id} needs a positive count`);
  if (!Number.isInteger(minimumPorts) || minimumPorts <= 0) {
    throw new Error(`NPC whaler profile ${id} needs a positive minimum port count`);
  }
  if (whalerSlugs.length === 0) throw new Error(`NPC whaler profile ${id} needs at least one hull`);
  if (groundIds.length === 0) throw new Error(`NPC whaler profile ${id} needs at least one hunting ground`);
  for (const slug of whalerSlugs) shipStatsForSlug(slug);
  return Object.freeze({
    id,
    count,
    whalerSlugs: Object.freeze([...whalerSlugs]),
    groundIds: Object.freeze([...groundIds]),
    portPredicate,
    minimumPorts,
    mode: "regional"
  });
}

function nativeCoastalRoleWeights() {
  return Object.freeze({ merchant: 45, fisherman: 50, warship: 5, pirate: 0 });
}

function mesoamericanVillageRoleWeights() {
  return Object.freeze({ merchant: 30, fisherman: 70, warship: 0, pirate: 0 });
}

function portNodeId(port, role) {
  return `${role}:${port.tileId}`;
}

function samePort(a, b) {
  return a?.tileId === b?.tileId;
}

function portName(port) {
  return port.displayCity || port.city || `tile ${port.tileId}`;
}

function portPoint(port) {
  return { id: `port:${port.tileId}`, label: portName(port), lat: port.lat, lon: port.lon, port };
}

function routeStateKey(nodeId, step) {
  return `${nodeId}|${step}`;
}

function routeMonthIndex(clockMinutes) {
  const cycleMinutes = WEATHER_DAYS * WEATHER_MINUTES_PER_DAY;
  const minute = positiveModulo(clockMinutes, cycleMinutes);
  return Math.floor(minute / ROUTE_MONTH_MINUTES) % ROUTE_MONTHS;
}

function routeMonthDate(month) {
  const day = Math.floor(month * ROUTE_MONTH_DAYS + ROUTE_MONTH_DAYS / 2);
  return new Date(Date.UTC(2023, 0, 1 + day, 12, 0, 0, 0));
}

function rememberCache(cache, key, value, limit) {
  if (cache.size >= limit) cache.clear();
  cache.set(key, value);
}

function distanceKm(a, b) {
  const lat1 = a.lat * DEG_TO_RAD;
  const lat2 = b.lat * DEG_TO_RAD;
  const dLat = lat2 - lat1;
  const dLon = shortestLonDeltaDeg(a.lon, b.lon) * DEG_TO_RAD;
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(Math.max(0, 1 - s)));
}

function destinationPoint(origin, bearingRad, distanceKmValue) {
  const angularDistance = distanceKmValue / EARTH_RADIUS_KM;
  const lat1 = origin.lat * DEG_TO_RAD;
  const lon1 = origin.lon * DEG_TO_RAD;
  const sinLat1 = Math.sin(lat1);
  const cosLat1 = Math.cos(lat1);
  const sinDistance = Math.sin(angularDistance);
  const cosDistance = Math.cos(angularDistance);
  const lat2 = Math.asin(
    sinLat1 * cosDistance +
    cosLat1 * sinDistance * Math.sin(bearingRad)
  );
  const lon2 = lon1 + Math.atan2(
    Math.cos(bearingRad) * sinDistance * cosLat1,
    cosDistance - sinLat1 * Math.sin(lat2)
  );
  return {
    lat: lat2 * RAD_TO_DEG,
    lon: normalizeLonDeg(lon2 * RAD_TO_DEG)
  };
}

function bearingEastNorthRad(a, b) {
  const lat = ((a.lat + b.lat) / 2) * DEG_TO_RAD;
  const dx = shortestLonDeltaDeg(a.lon, b.lon) * Math.cos(lat);
  const dy = b.lat - a.lat;
  return Math.atan2(dy, dx);
}

function shortestLonDeltaDeg(a, b) {
  return ((((b - a + 180) % 360) + 360) % 360) - 180;
}

function slerpPoint(a, b, t) {
  const av = latLonToVector(a.lat, a.lon);
  const bv = latLonToVector(b.lat, b.lon);
  return vectorToLatLon(slerpVector(av, bv, t));
}

function vectorsForRouteSegment(segment) {
  let vectors = routeSegmentVectorCache.get(segment);
  if (vectors) return vectors;
  vectors = Object.freeze({
    from: Object.freeze(latLonToVector(segment.from.lat, segment.from.lon)),
    to: Object.freeze(latLonToVector(segment.to.lat, segment.to.lon))
  });
  routeSegmentVectorCache.set(segment, vectors);
  return vectors;
}

function slerpVector(av, bv, t) {
  const dot = clamp(vectorDot(av, bv), -1, 1);
  const omega = Math.acos(dot);
  if (omega < 1e-6) {
    return normalizedVector([
      av[0] + (bv[0] - av[0]) * t,
      av[1] + (bv[1] - av[1]) * t,
      av[2] + (bv[2] - av[2]) * t
    ], "NPC route interpolation");
  }
  const sinOmega = Math.sin(omega);
  const s0 = Math.sin((1 - t) * omega) / sinOmega;
  const s1 = Math.sin(t * omega) / sinOmega;
  return normalizedVector([
    av[0] * s0 + bv[0] * s1,
    av[1] * s0 + bv[1] * s1,
    av[2] * s0 + bv[2] * s1
  ], "NPC route interpolation");
}

function headingVectorForVectors(position, from, to) {
  const radial = vectorDot(position, to);
  const tangent = [
    to[0] - position[0] * radial,
    to[1] - position[1] * radial,
    to[2] - position[2] * radial
  ];
  if (Math.hypot(tangent[0], tangent[1], tangent[2]) > 1e-8) {
    return normalizedVector(tangent, "NPC route heading");
  }
  return normalizedVector([
    position[1] * from[2] - position[2] * from[1],
    position[2] * from[0] - position[0] * from[2],
    position[0] * from[1] - position[1] * from[0]
  ], "NPC route fallback heading");
}

function headingVectorAt(point, from, to) {
  const position = latLonToVector(point.lat, point.lon);
  const target = latLonToVector(to.lat, to.lon);
  const tangent = [
    target[0] - position[0] * (position[0] * target[0] + position[1] * target[1] + position[2] * target[2]),
    target[1] - position[1] * (position[0] * target[0] + position[1] * target[1] + position[2] * target[2]),
    target[2] - position[2] * (position[0] * target[0] + position[1] * target[1] + position[2] * target[2])
  ];
  const length = Math.hypot(tangent[0], tangent[1], tangent[2]);
  if (length > 1e-8) return [tangent[0] / length, tangent[1] / length, tangent[2] / length];
  const fallback = latLonToVector(from.lat, from.lon);
  return [
    position[1] * fallback[2] - position[2] * fallback[1],
    position[2] * fallback[0] - position[0] * fallback[2],
    position[0] * fallback[1] - position[1] * fallback[0]
  ];
}

function latLonToVector(latDeg, lonDeg) {
  const lat = latDeg * DEG_TO_RAD;
  const lon = lonDeg * DEG_TO_RAD;
  const c = Math.cos(lat);
  return [c * Math.cos(lon), Math.sin(lat), -c * Math.sin(lon)];
}

function vectorToLatLon(v) {
  const length = Math.hypot(v[0], v[1], v[2]);
  if (length <= 1e-9) throw new Error("Cannot convert zero vector to lat/lon");
  const x = v[0] / length;
  const y = v[1] / length;
  const z = v[2] / length;
  return {
    lat: Math.asin(clamp(y, -1, 1)) * RAD_TO_DEG,
    lon: normalizeLonDeg(Math.atan2(-z, x) * RAD_TO_DEG)
  };
}

function normalizeLonDeg(lonDeg) {
  return ((((lonDeg + 180) % 360) + 360) % 360) - 180;
}

function shortestAngleDelta(from, to) {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

function normalizeAngleRad(angle) {
  const twoPi = Math.PI * 2;
  return ((angle % twoPi) + twoPi) % twoPi;
}

function positiveModulo(value, modulo) {
  return ((value % modulo) + modulo) % modulo;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function clamp01(value) {
  return clamp(value, 0, 1);
}

function easeInOut(t) {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

function assertSaveableNpcRouteSystem(system) {
  if (!system || !Array.isArray(system.ships) || !(system.shipById instanceof Map) ||
      !Array.isArray(system.replacementQueue) || !(system.pirateHideoutDangerUntil instanceof Map) ||
      !Array.isArray(system.whalingGrounds) ||
      !(system.routeCache instanceof Map) || !(system.edgeCostCache instanceof Map) ||
      (system.seedKey !== null && (typeof system.seedKey !== "string" || system.seedKey.trim() === "")) ||
      typeof system.relationBetween !== "function" ||
      typeof system.sovereignTradeOpenToFaction !== "function") {
    throw new Error("Invalid NPC route system");
  }
  if (system.foreignSettlementExpulsions !== null) {
    validateForeignSettlementExpulsionMemory(system.foreignSettlementExpulsions);
  }
  validateSuzeraintyMemory(system.suzeraintyMemory);
}

function npcSeedKey(system, value) {
  return system.seedKey === null ? value : `${system.seedKey}|${value}`;
}

function validateOptionalSeedKey(value, label) {
  if (value !== null && (typeof value !== "string" || value.trim() === "")) {
    throw new Error(`${label} seed must be null or a non-empty string`);
  }
  return value;
}

function cloneJsonData(value) {
  return JSON.parse(JSON.stringify(value));
}

function hashString32(value) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function hashUnit(value) {
  return hashString32(value) / 0x100000000;
}
