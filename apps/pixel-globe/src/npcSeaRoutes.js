import {
  WEATHER_DAYS,
  WEATHER_MINUTES_PER_DAY,
  dateToSubsolarLatDeg,
  windAtLatLonDeg
} from "./weather.js";
import {
  FUSTA_SLUG,
  GALLEASS_SLUG,
  JAPANESE_ARMED_SHIP_SLUGS,
  JAPANESE_ATAKEBUNE_SLUG,
  JAPANESE_KOBAYA_SLUG,
  JAPANESE_SEKIBUNE_SLUG,
  JAPANESE_SHIP_SLUGS,
  JAPANESE_UMI_BUNE_SLUG,
  SHIP_PROPULSION_OAR,
  SHIP_PROPULSION_OAR_SAIL,
  reconcileShipHullForCurrentStats,
  shipHullResistsDamage,
  shipStatsForSlug
} from "./shipStats.js";
import { HYBRID_ROUTE_PROGRESS_FLOOR } from "./shipPropulsion.js";
import { requireCityId, requireEntityId } from "./entityIds.js";
import {
  DIPLOMACY_WAR,
  NEUTRAL_FACTION_ID,
  PIRATE_FACTION_ID,
  assertFactionId,
  diplomacyBetween,
  isJapanesePolityFaction,
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
  npcWhalingCooldownMinutes,
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
  claimNpcShipyardSale,
  claimNpcShipyardSaleById,
  npcShipyardSales,
  registerShipyardTradeIn,
  shipConstructionPrice
} from "./shipyards.js";
import {
  PORTUGUESE_CARTAZ_DURATION_DAYS,
  PORTUGUESE_FACTION_ID,
  evaluateTradeAccess,
  portugueseCartazFee,
  portugueseCartazRequired,
  tradeTerms
} from "./tradePolicy.js";
import {
  activeTradeEmbargoOrders,
  createTradeEmbargoMemory,
  embargoOrderControlsGood,
  npcEmbargoInspectionOutcome,
  npcWillSmuggleEmbargoedCargo,
  TRADE_EMBARGO_RESTRICTION_BLOCKADE,
  TRADE_EMBARGO_RESTRICTION_EXPORTS,
  TRADE_EMBARGO_RESTRICTION_IMPORTS,
  tradeEmbargoOrdersForPurchase,
  tradeEmbargoOrdersForSale,
  tradeEmbargoOrdersForShipping,
  validateTradeEmbargoMemory
} from "./tradeEmbargoes.js";
import { validateForeignSettlementExpulsionMemory } from "./foreignSettlements.js";
import {
  createSuzeraintyMemory,
  suzeraintyTradePrivilege,
  validateSuzeraintyMemory
} from "./suzerainty.js";
import {
  factionExpansionTargetPriority,
  factionExpansionWarshipTarget
} from "./factionExpansion.js";

const EARTH_RADIUS_KM = 6371;
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const ROUTE_MONTHS = 12;
const ROUTE_MONTH_DAYS = WEATHER_DAYS / ROUTE_MONTHS;
const ROUTE_MONTH_MINUTES = ROUTE_MONTH_DAYS * WEATHER_MINUTES_PER_DAY;
const ROUTE_MAX_MONTH_STEPS = 18;
const ROUTE_CACHE_LIMIT = 1800;
export const NPC_SEA_ROUTE_SNAPSHOT_VERSION = 5;
const ROUTE_WIND_SEED = 90210;
const NPC_FLEET_TARGET = 212;
export const NPC_PACIFIC_FLEET_TARGET = 32;
export const NPC_WHALER_FLEET_TARGET = 5;
const NPC_ROUTE_WAIT_HOP_THRESHOLD_DAYS = 34;
const NPC_ROUTE_HOP_MAX_DAYS = 19;
const NPC_ROUTE_HOP_MAX_KM = 1650;
const NPC_MIN_TRIP_DISTANCE_KM = 180;
const NPC_ROUTE_MIN_DURATION_DAYS = 0.45;
const NATIONAL_CIRCUIT_MIN_SPAN_KM = 1600;
const NATIONAL_CIRCUIT_MAX_PORTS = 6;
const NPC_ENCOUNTER_SETTLEMENT_PLAN_LIMIT = 96;
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
const NPC_SHIPYARD_FLEET_GROWTH_RATIO = 1.15;
const NPC_SHIPYARD_PURCHASES_PER_MAINTENANCE = 2;
export const NPC_PORT_RESPONSE_BURNING = "burning-port";
export const NPC_PORT_RESPONSE_LOST = "lost-port";
export const NPC_PORT_RESPONSE_WAR_LOAN = "war-loan-offensive";
export const NPC_ENCOUNTER_ROUTE_POLICY_CONNECTED_PATROL = "connected-patrol";
export const NPC_CAPITAL_NAVAL_RESERVE_MAX = 3;
const NPC_PORT_RESPONSE_REASONS = new Set([
  NPC_PORT_RESPONSE_BURNING,
  NPC_PORT_RESPONSE_LOST,
  NPC_PORT_RESPONSE_WAR_LOAN
]);
const NPC_CAPITAL_NAVAL_RESERVE_TIER_TWO_SCORE = 160000;
const NPC_CAPITAL_NAVAL_RESERVE_TIER_THREE_SCORE = 500000;
const FISHING_GROUND_TARGET = 220;
const FISHING_GROUND_SAMPLE_DISTANCES_KM = Object.freeze([220, 520, 1100, 2100, 3400]);
const FISHING_GROUND_SAMPLE_BEARINGS_DEG = Object.freeze([0, 45, 90, 135, 180, 225, 270, 315]);
const FISHING_GROUND_MIN_EXPECTED_CATCH = 1;
const FISHING_GROUND_TRAVEL_COST_PER_KM = 0.035;
const FISHING_GROUND_LONG_RANGE_COST_PER_KM = 0.018;
const FISHING_GROUND_CATCH_RATIO = 0.72;
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

export function npcFleetOriginWeightsForPorts(ports) {
  if (!Array.isArray(ports) || ports.length === 0) {
    throw new Error("NPC fleet origin weights require ports");
  }
  const weights = new Map();
  for (const port of ports) {
    const cityId = requireCityId(port, "NPC fleet origin weight port");
    if (weights.has(cityId)) {
      throw new Error(`NPC fleet origin weights received duplicate city: ${cityId}`);
    }
    // Every eligible home remains possible even if it is outside the active fleet's busiest pools.
    weights.set(cityId, 1);
  }

  const usablePorts = ports
    .filter(isAnyUsablePort)
    .map(normalizeNpcRoutePort)
    .filter((port) => port.routeAnchors.length > 0);
  let remainingFleet = NPC_FLEET_TARGET;
  for (const profileSpec of FLEET_PROFILES) {
    if (remainingFleet <= 0) break;
    const pool = rankedProfilePorts(usablePorts, profileSpec);
    if (pool.length < 2) continue;
    const shipCount = Math.min(profileSpec.count, pool.length * 2, remainingFleet);
    addExpectedFleetOrigins(weights, pool, shipCount);
    remainingFleet -= shipCount;
  }
  for (const profileSpec of WHALER_PROFILES) {
    const pool = rankedProfilePorts(usablePorts, profileSpec);
    if (pool.length < profileSpec.minimumPorts) continue;
    addExpectedFleetOrigins(weights, pool, profileSpec.count);
  }
  return weights;
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
const INTERREGIONAL_PIRATE_SHIP_SLUGS = Object.freeze([
  "brigantine",
  "pirate-brig",
  "galleon"
]);
const INTERREGIONAL_NPC_SHIP_SLUGS = new Set([
  "ocean-dhow",
  "caravel",
  "square-rigged-caravel",
  "brigantine",
  "pirate-brig",
  "carrack",
  "fluyt",
  "galleon",
  "ship-of-the-line",
  "spanish-nao",
  "portuguese-carrack"
]);
const JOSEON_TURTLE_SHIP_SLUG = "joseon-turtle-ship";
const JOSEON_HYEOPSEON_SLUG = "joseon-hyeopseon";
const JOSEON_PANOKSEON_SLUG = "joseon-panokseon";
const PORTUGUESE_CARRACK_SLUG = "portuguese-carrack";
const SPANISH_NAO_SLUG = "spanish-nao";
const NUSANTARAN_OUTRIGGER_SLUG = "nusantaran-outrigger";
const KELULUS_SLUG = "kelulus";
const PENJAJAP_SLUG = "penjajap";
const LANCARAN_SLUG = "lancaran";
const ROYAL_LANCARAN_SLUG = "royal-lancaran";
const OTTOMAN_COASTAL_TRADER_SLUG = "ottoman-coastal-trader";
const JOSEON_WARSHIP_SLUGS = Object.freeze([
  JOSEON_HYEOPSEON_SLUG,
  JOSEON_HYEOPSEON_SLUG,
  JOSEON_PANOKSEON_SLUG,
  JOSEON_TURTLE_SHIP_SLUG
]);

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
    [JAPANESE_UMI_BUNE_SLUG],
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
  // These points follow the same contiguous navigable hex chain as the local
  // Dardanelles, Marmara, and Bosporus rails. Strategic and local navigation
  // must agree in narrow water or obstacle avoidance will make ships oscillate.
  laneNode("aegean", "Northern Aegean", 39.8952, 25.95852),
  laneNode("dardanelles-south", "Dardanelles South", 40.32832, 26.43773),
  laneNode("dardanelles-north", "Dardanelles North", 40.27811, 27.10846),
  laneNode("marmara-west", "Sea of Marmara West", 40.70369, 27.59271),
  laneNode("marmara-center", "Sea of Marmara", 40.64675, 28.26621),
  laneNode("marmara-east", "Sea of Marmara East", 40.5859, 28.93853),
  laneNode("constantinople", "Constantinople Roads", 41.06873, 28.76007),
  laneNode("black-sea", "Black Sea Entrance", 41.48853, 29.26074),
  laneNode("venice", "Venice Lagoon", 45.2, 12.5),
  laneNode("canaries", "Canaries", 28.1, -16.1),
  laneNode("cape-verde", "Cape Verde", 15.4, -23.8),
  laneNode("guinea", "Guinea Coast", 5.1, -2.2),
  // The Niger bends northeast into the Sahara before turning southeast to the
  // Gulf of Guinea. A direct inland-port-to-coast heading sends local river
  // navigation upstream toward Guinea, so preserve the real downstream bend.
  laneNode("niger-inner-delta", "Niger Inner Delta", 14.55, -3.8),
  laneNode("niger-bend", "Niger Bend", 16.45, -1.65),
  laneNode("niger-gao", "Niger at Gao", 16.25, -0.05),
  laneNode("niger-middle", "Middle Niger", 13.5, 2.15),
  laneNode("niger-lower", "Lower Niger", 8.1, 6.65),
  laneNode("niger-delta", "Niger Delta", 5.35, 6.4),
  laneNode("niger-bight", "Bight of Benin", 4.2, 5.95),
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
  laneEdge("sicily", "aegean", "coastal"),
  laneEdge("alexandria", "aegean", "coastal"),
  laneEdge("aegean", "dardanelles-south", "coastal"),
  laneEdge("dardanelles-south", "dardanelles-north", "strait"),
  laneEdge("dardanelles-north", "marmara-west", "strait"),
  laneEdge("marmara-west", "marmara-center", "coastal"),
  laneEdge("marmara-center", "marmara-east", "coastal"),
  laneEdge("marmara-east", "constantinople", "strait"),
  laneEdge("constantinople", "black-sea", "strait"),
  laneEdge("gibraltar", "canaries", "coastal"),
  laneEdge("canaries", "cape-verde", "bluewater"),
  laneEdge("cape-verde", "guinea", "coastal"),
  laneEdge("niger-inner-delta", "niger-bend", "river"),
  laneEdge("niger-bend", "niger-gao", "river"),
  laneEdge("niger-gao", "niger-middle", "river"),
  laneEdge("niger-middle", "niger-lower", "river"),
  laneEdge("niger-lower", "niger-delta", "river"),
  laneEdge("niger-delta", "niger-bight", "river"),
  laneEdge("niger-bight", "guinea", "coastal"),
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
  profile("pacific-islands", NPC_PACIFIC_FLEET_TARGET, {
    fishers: ["polynesian-voyaging-canoe"],
    merchants: ["polynesian-voyaging-canoe"],
    warships: ["polynesian-voyaging-canoe"]
  }, isPolynesianPort, "regional", nativeCoastalRoleWeights(), true),
  profile("mesoamerican-coast", 7, {
    fishers: ["mesoamerican-dugout-canoe"],
    merchants: ["mesoamerican-dugout-canoe"],
    warships: ["mesoamerican-dugout-canoe"]
  }, isMesoamericanVillagePort, "regional", mesoamericanVillageRoleWeights()),
  profile("andean-coast", 1, {
    fishers: ["mesoamerican-dugout-canoe"],
    merchants: ["mesoamerican-dugout-canoe"],
    warships: ["mesoamerican-dugout-canoe"]
  }, isAndeanCoastalPort, "regional", nativeCoastalRoleWeights()),
  profile("east-asia", 34, {
    fishers: ["sampan", "small-junk"],
    merchants: ["sampan", "small-junk", "medium-junk", "large-junk"],
    warships: ["small-junk", "medium-junk", "large-junk"]
  }, isEastAsiaPort, "regional"),
  profile("southeast-asia", 12, {
    fishers: ["sampan", "dhow"],
    merchants: [
      KELULUS_SLUG,
      KELULUS_SLUG,
      PENJAJAP_SLUG,
      NUSANTARAN_OUTRIGGER_SLUG,
      "small-junk",
      "javanese-jong"
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
    merchants: ["dhow", "felucca", "ocean-dhow", "ocean-dhow", "ocean-dhow"],
    warships: ["xebec", "xebec", "xebec"]
  }, isIndianOceanPort, "regional"),
  profile("mediterranean", 28, {
    fishers: ["fishing-lugger", "felucca", "cutter"],
    merchants: ["felucca", FUSTA_SLUG, "xebec", "xebec"],
    warships: [FUSTA_SLUG, FUSTA_SLUG, "xebec", "xebec", "mediterranean-galley", "mediterranean-galley", "caravel", "galleon"]
  }, isMediterraneanPort, "regional"),
  profile("atlantic-coast", 30, {
    fishers: ["fishing-lugger", "cutter", "felucca"],
    merchants: ["cutter", "small-cog", "holk", "holk", "caravel", "caravel", "brigantine", "fluyt"],
    warships: ["square-rigged-caravel", "caravel", "brigantine", "pirate-brig", "galleon"]
  }, isAtlanticPort, "regional"),
  profile("cape-trade", 44, {
    fishers: ["ocean-dhow", "caravel", "brigantine"],
    merchants: [
      "ocean-dhow", "caravel", "caravel", "brigantine", "carrack", "fluyt", "galleon"
    ],
    warships: ["caravel", "brigantine", "pirate-brig", "galleon", "ship-of-the-line"]
  }, isLongRangePort, "interregional"),
  profile("wide-world", 24, {
    fishers: ["ocean-dhow", "caravel", "brigantine"],
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
  ...JOSEON_WARSHIP_SLUGS,
  ...JAPANESE_SHIP_SLUGS,
  SPANISH_NAO_SLUG,
  PORTUGUESE_CARRACK_SLUG,
  OTTOMAN_COASTAL_TRADER_SLUG,
  FUSTA_SLUG,
  GALLEASS_SLUG
])]);

export function createNpcSeaRouteSystem({
  ports,
  startMinute,
  economy,
  fishState = null,
  fishingGroundIsNavigable = null,
  whaleMemory = null,
  seedKey = null,
  relationBetween = diplomacyBetween,
  foreignSettlementExpulsions = null,
  sovereignTradeOpenToFaction = defaultSovereignTradeOpenToFaction,
  suzeraintyMemory = createSuzeraintyMemory(startMinute),
  tradeEmbargoes = createTradeEmbargoMemory({
    startMinute,
    seedKey: seedKey || "npc-sea-routes"
  }),
  onForeignPortCall = null
}) {
  if (!Number.isFinite(startMinute) || startMinute < 0) {
    throw new Error(`NPC sea routes require a non-negative start minute: ${startMinute}`);
  }
  if (!economy) throw new Error("NPC sea routes require a world economy");
  if (fishState !== null && typeof fishingGroundIsNavigable !== "function") {
    throw new Error("NPC fishing grounds require a navigable-water resolver");
  }
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
  validateTradeEmbargoMemory(tradeEmbargoes);
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
  const baseEdges = pruneUninhabitedRiverTails(
    buildDirectedLaneEdges(laneNodes),
    usablePorts
  );
  const routeComponentByAnchorId = buildRouteAnchorComponents(laneNodes, baseEdges);
  const system = {
    ports: usablePorts,
    seedKey,
    economy,
    laneNodes,
    baseEdges,
    routeComponentByAnchorId,
    routeCache: new Map(),
    edgeCostCache: new Map(),
    relationBetween,
    foreignSettlementExpulsions,
    sovereignTradeOpenToFaction,
    suzeraintyMemory,
    tradeEmbargoes,
    onForeignPortCall,
    contactStartMinute: startMinute,
    fishState,
    fishingGroundIsNavigable,
    fishingGrounds: fishState
      ? buildFishingGrounds(usablePorts, fishState, startMinute, fishingGroundIsNavigable)
      : [],
    whaleMemory,
    whalingGrounds: whaleMemory ? buildWhalingGrounds() : [],
    pirateHideouts: choosePirateHideouts(usablePorts),
    pirateHideoutDangerUntil: new Map(),
    ships: [],
    shipById: new Map(),
    replacementQueue: [],
    capitalNavalReserveSlots: [],
    shipyardFleetGrowthLimit: 0
  };
  system.ships = createNpcFleet(system, startMinute);
  synchronizePacificFleet(system, startMinute);
  synchronizeNpcWhalerFleet(system, startMinute);
  synchronizeNationalPortCircuits(system, startMinute);
  if (system.ships.length === 0) throw new Error("NPC sea routes created no ships");
  system.shipById = new Map(system.ships.map((ship) => [ship.id, ship]));
  if (system.shipById.size !== system.ships.length) throw new Error("NPC sea routes created duplicate ship ids");
  system.capitalNavalReserveSlots = createInitialCapitalNavalReserveSlots(system, startMinute);
  system.shipyardFleetGrowthLimit = Math.ceil(system.ships.length * NPC_SHIPYARD_FLEET_GROWTH_RATIO);
  return system;
}

export function addNpcSeaRoutePort(system, port) {
  assertSaveableNpcRouteSystem(system);
  if (!isAnyUsablePort(port)) throw new Error(`NPC route port is unusable: ${portName(port)}`);
  const cityId = requireCityId(port, "NPC route port");
  if (system.ports.some((candidate) => candidate.cityId === cityId)) {
    throw new Error(`NPC route port already exists: ${cityId}`);
  }
  if (system.ports.some((candidate) => candidate.tileId === port.tileId)) {
    throw new Error(`NPC route port tile is already occupied: ${port.tileId}`);
  }
  const normalized = normalizeNpcRoutePort(port);
  if (normalized.routeAnchors.length === 0) {
    throw new Error(`NPC route port has no sea-lane anchors: ${portName(port)}`);
  }
  system.ports.push(normalized);
  system.routeCache.clear();
  system.edgeCostCache.clear();
  synchronizeNationalPortCircuits(system, system.economy.lastMinute);
  return normalized;
}

export function replaceNpcSeaRoutePort(system, port) {
  assertSaveableNpcRouteSystem(system);
  if (!isAnyUsablePort(port)) throw new Error(`NPC replacement route port is unusable: ${portName(port)}`);
  const cityId = requireCityId(port, "NPC replacement route port");
  const index = system.ports.findIndex((candidate) => candidate.cityId === cityId);
  if (index < 0) throw new Error(`NPC replacement route port does not exist: ${cityId}`);
  if (system.ports.some((candidate, candidateIndex) => (
    candidateIndex !== index && candidate.tileId === port.tileId
  ))) {
    throw new Error(`NPC replacement route port tile is already occupied: ${port.tileId}`);
  }
  const normalized = normalizeNpcRoutePort(port);
  if (normalized.routeAnchors.length === 0) {
    throw new Error(`NPC replacement route port has no sea-lane anchors: ${portName(port)}`);
  }
  system.ports[index] = normalized;
  system.routeCache.clear();
  system.edgeCostCache.clear();
  synchronizeNationalPortCircuits(system, system.economy.lastMinute);
  return normalized;
}

export function npcSeaRouteHasPort(system, port) {
  assertSaveableNpcRouteSystem(system);
  const cityId = requireCityId(port, "NPC route port lookup");
  return system.ports.some((candidate) => candidate.cityId === cityId);
}

export function npcSeaRoutePortSettlementType(system, port) {
  assertSaveableNpcRouteSystem(system);
  const cityId = requireCityId(port, "NPC route settlement lookup");
  const existing = system.ports.find((candidate) => candidate.cityId === cityId);
  if (!existing) throw new Error(`NPC route port does not exist: ${cityId}`);
  return existing.settlementType === "village" ? "village" : "city";
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
  const captainHomeCityId = requireEntityId(
    spec.captainHomeCityId,
    `NPC encounter ${spec.id} captain home`
  );
  requiredNpcRoutePort(system, captainHomeCityId, `NPC encounter ${spec.id} captain home`);
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
  const seed = hashString32(`${spec.id}|capture`);
  const ship = {
    id: spec.id,
    captainHomeCityId,
    factionId: spec.factionId,
    role: spec.role,
    profileId: spec.profileId || "wide-world",
    mode: "interregional",
    cultureType: spec.cultureType || null,
    slugs: [spec.shipSlug],
    slug: spec.shipSlug,
    seed,
    hitPoints: spec.hitPoints ?? stats.hitPoints,
    maxHitPoints: stats.hitPoints,
    cargoCapacity: stats.cargoCapacity,
    fishingNetId: spec.role === NPC_ROLE_FISHERMAN
      ? npcFishingNetForSeed(seed, stats.cargoCapacity).id
      : null,
    cargo: {},
    cargoCost: {},
    cargoOrigins: {},
    tradeEmbargoConvictions: 0,
    lastTradeEmbargoEnforcement: null,
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
    nationalCircuitId: null,
    nationalCircuitFactionId: null,
    nationalCircuitCityIds: [],
    capitalNavalReserveSlotId: null,
    capitalNavalReserveDestinationCityId: null,
    capitalNavalReserveDocked: false,
    portResponse: null,
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
  if (typeof spec.originCityId !== "string" || spec.originCityId === "") {
    throw new Error(`NPC route encounter requires an origin port: ${spec.id}`);
  }
  if (spec.destinationCityId !== undefined &&
      (typeof spec.destinationCityId !== "string" || spec.destinationCityId === "")) {
    throw new Error(`NPC route encounter has an invalid destination port: ${spec.id}`);
  }
  if (spec.departureDelayMinutes !== undefined && (
    !Number.isFinite(spec.departureDelayMinutes) || spec.departureDelayMinutes < 0
  )) {
    throw new Error(`NPC route encounter has an invalid departure delay: ${spec.id}`);
  }
  assertFactionId(spec.factionId);
  if (!NPC_ROLE_SET.has(spec.role)) throw new Error(`Unknown NPC route encounter role: ${spec.role}`);
  if (spec.encounter !== undefined && (!spec.encounter || typeof spec.encounter !== "object")) {
    throw new Error(`Invalid NPC route encounter metadata: ${spec.id}`);
  }
  if (spec.encounter?.routePolicy !== undefined &&
      spec.encounter.routePolicy !== NPC_ENCOUNTER_ROUTE_POLICY_CONNECTED_PATROL) {
    throw new Error(`Invalid NPC route encounter policy: ${spec.encounter.routePolicy}`);
  }
  if (spec.hiddenAtOrigin !== undefined && typeof spec.hiddenAtOrigin !== "boolean") {
    throw new Error(`Invalid NPC route encounter hideout state: ${spec.id}`);
  }
  const origin = requiredNpcRoutePort(system, spec.originCityId, "NPC route encounter origin");
  const destination = spec.destinationCityId === undefined
    ? null
    : requiredNpcRoutePort(system, spec.destinationCityId, "NPC route encounter destination");
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
  if (ship.encounter) {
    const savedOriginCityId = ship.encounter.originCityId;
    if (savedOriginCityId !== undefined && savedOriginCityId !== spec.originCityId) {
      throw new Error(`NPC route encounter origin does not match its route: ${spec.id}`);
    }
    ship.encounter.originCityId = spec.originCityId;
    if (destination && ship.encounter.destinationCityId !== undefined &&
        ship.encounter.destinationCityId !== spec.destinationCityId) {
      throw new Error(`NPC route encounter destination does not match its route: ${spec.id}`);
    }
    if (destination) ship.encounter.destinationCityId = spec.destinationCityId;
  }
  ship.replaceOnSink = spec.replaceOnSink !== false;
  if (spec.specie !== undefined) {
    if (!Number.isFinite(spec.specie) || spec.specie < 0) {
      throw new Error(`Invalid NPC route encounter specie: ${spec.id}`);
    }
    ship.specie = Math.floor(spec.specie);
  }
  if (spec.hiddenAtOrigin) enterPirateHideout(ship, clockMinutes);
  else if (destination) {
    const departureMinute = clockMinutes + (spec.departureDelayMinutes || 0);
    const route = routeBetweenPorts(system, origin, destination, ship.slug, departureMinute);
    ship.plan = buildNpcPlan(origin, destination, route, departureMinute);
    ship.finalDestination = destination;
    ship.visualNavigation = {
      vector: latLonToVector(origin.lat, origin.lon),
      heading: headingVectorAt(origin, origin, destination)
    };
  } else seedNpcShipOnRoute(system, ship, clockMinutes);
  system.ships.push(ship);
  system.shipById.set(ship.id, ship);
  return ship;
}

export function reconcileNpcRouteEncounterIdentity(system, shipId, {
  factionId,
  role,
  shipSlug
}) {
  assertSaveableNpcRouteSystem(system);
  assertFactionId(factionId);
  if (!NPC_ROLE_SET.has(role)) throw new Error(`Unknown NPC route encounter role: ${role}`);
  const stats = shipStatsForSlug(shipSlug);
  const ship = requiredNpcShip(system, shipId);
  const factionChanged = ship.factionId !== factionId;
  const roleChanged = ship.role !== role;
  const shipChanged = ship.slug !== shipSlug;
  if (shipChanged) {
    const cargoUnits = npcCargoUnits(ship);
    if (cargoUnits > stats.cargoCapacity) {
      throw new Error(
        `NPC route encounter ${shipId} carries ${cargoUnits} cargo but ${shipSlug} holds ${stats.cargoCapacity}`
      );
    }
    const hullFraction = ship.maxHitPoints > 0
      ? Math.max(0, Math.min(1, ship.hitPoints / ship.maxHitPoints))
      : 1;
    ship.slug = shipSlug;
    ship.slugs = [shipSlug];
    ship.maxHitPoints = stats.hitPoints;
    ship.hitPoints = Math.max(1, Math.round(stats.hitPoints * hullFraction));
    ship.cargoCapacity = stats.cargoCapacity;
  }
  ship.factionId = factionId;
  ship.role = role;
  if (role !== NPC_ROLE_FISHERMAN) ship.fishingNetId = null;
  return Object.freeze({
    changed: factionChanged || roleChanged || shipChanged,
    factionChanged,
    roleChanged,
    shipChanged
  });
}

export function stageNpcRouteEncounterAtDestination(
  system,
  shipId,
  clockMinutes,
  { holdProgress = null, originCityId = null } = {}
) {
  assertSaveableNpcRouteSystem(system);
  if (!Number.isFinite(clockMinutes) || clockMinutes < 0) {
    throw new Error(`Invalid NPC encounter staging clock: ${clockMinutes}`);
  }
  const ship = requiredNpcShip(system, shipId);
  const destinationCityId = ship.encounter?.destinationCityId;
  if (ship.encounter?.holdAtDestination !== true ||
      typeof destinationCityId !== "string" || destinationCityId === "") {
    throw new Error(`NPC encounter cannot be staged at a destination: ${shipId}`);
  }
  const destination = requiredNpcRoutePort(system, destinationCityId, "NPC encounter destination");
  if (holdProgress !== null &&
      (!Number.isFinite(holdProgress) || holdProgress <= 0 || holdProgress > 1)) {
    throw new Error(`Invalid NPC encounter staging progress: ${shipId}`);
  }
  if (originCityId !== null && (typeof originCityId !== "string" || originCityId === "")) {
    throw new Error(`Invalid NPC encounter staging origin: ${shipId}`);
  }
  if (originCityId !== null) {
    const savedOriginCityId = ship.encounter.originCityId;
    if (savedOriginCityId !== undefined && savedOriginCityId !== originCityId) {
      throw new Error(`NPC encounter staging origin changed: ${shipId}`);
    }
    ship.encounter.originCityId = originCityId;
  }
  if (
    ship.currentPort?.cityId === destinationCityId &&
    ship.plan?.segments?.length === 1 &&
    ship.plan.segments[0].kind === "wait"
  ) {
    const hasVisualPosition = Array.isArray(ship.visualNavigation?.vector) &&
      ship.visualNavigation.vector.length === 3;
    if ((holdProgress === null || holdProgress === ship.encounter.holdProgress) &&
        hasVisualPosition) return false;
    const restoredProgress = holdProgress ?? ship.encounter.holdProgress ?? 0.96;
    repositionHeldNpcRouteEncounter(system, ship, destination, restoredProgress, clockMinutes);
    return true;
  }
  const lastSail = [...(ship.plan?.segments || [])]
    .reverse()
    .find((segment) => segment.kind === "sail");
  if (!lastSail) throw new Error(`NPC delegation route has no sailing segment: ${ship.id}`);
  if (holdProgress !== null) ship.encounter.holdProgress = holdProgress;
  ship.currentPort = destination;
  ship.portVisits += 1;
  holdNpcRouteEncounterAtDestination(ship, destination, clockMinutes, lastSail);
  return true;
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
    capitalNavalReserveSlots: cloneJsonData(system.capitalNavalReserveSlots),
    pirateHideoutDangerUntil: [...system.pirateHideoutDangerUntil.entries()]
  };
}

export function snapshotNpcSeaRouteStrategicSystem(system) {
  const plan = createNpcSeaRouteStrategicSnapshotPlan(system);
  while (!advanceNpcSeaRouteStrategicSnapshotPlan(plan, {
    maxItems: Number.MAX_SAFE_INTEGER
  })) {
    // Worker transfer and explicit synchronous callers require a complete snapshot.
  }
  return plan.snapshot;
}

export function createNpcSeaRouteStrategicSnapshotPlan(system) {
  assertSaveableNpcRouteSystem(system);
  return {
    version: 1,
    system,
    destroyedReserveSlotIds: new Set(),
    phase: "ships",
    itemIndex: 0,
    snapshot: {
      version: NPC_SEA_ROUTE_SNAPSHOT_VERSION,
      ships: [],
      replacementQueue: [],
      capitalNavalReserveSlots: [],
      pirateHideoutDangerUntil: []
    }
  };
}

export function advanceNpcSeaRouteStrategicSnapshotPlan(plan, { maxItems = 12 } = {}) {
  assertNpcSeaRouteStrategicSnapshotPlan(plan);
  if (!Number.isInteger(maxItems) || maxItems <= 0) {
    throw new Error(`Invalid NPC strategic snapshot batch size: ${maxItems}`);
  }
  if (plan.phase === "complete") return true;
  const { system, snapshot } = plan;
  let remaining = maxItems;
  while (remaining > 0 && plan.phase !== "complete") {
    let source;
    let target;
    if (plan.phase === "ships") {
      source = system.ships;
      target = snapshot.ships;
    } else if (plan.phase === "replacement-queue") {
      source = system.replacementQueue;
      target = snapshot.replacementQueue;
    } else if (plan.phase === "reserve-slots") {
      source = system.capitalNavalReserveSlots;
      target = snapshot.capitalNavalReserveSlots;
    } else if (plan.phase === "hideout-danger") {
      source = [...system.pirateHideoutDangerUntil.entries()];
      target = snapshot.pirateHideoutDangerUntil;
    } else {
      throw new Error(`Unknown NPC strategic snapshot phase: ${plan.phase}`);
    }
    const end = Math.min(source.length, plan.itemIndex + remaining);
    for (; plan.itemIndex < end; plan.itemIndex++) {
      if (plan.phase === "ships") {
        const ship = source[plan.itemIndex];
        const destroyedSlotId = destroyedCapitalNavalReserveSlotId(
          ship,
          system.capitalNavalReserveSlots,
          "route snapshot"
        );
        if (destroyedSlotId !== null) {
          plan.destroyedReserveSlotIds.add(destroyedSlotId);
        } else {
          reconcileNpcCargoCapacity(ship, "route snapshot");
          target.push({ ...cloneJsonData(ship), visualNavigation: null });
        }
      } else if (plan.phase === "reserve-slots" &&
          plan.destroyedReserveSlotIds.has(source[plan.itemIndex].id)) {
        target.push(retiredCapitalNavalReserveSlot(source[plan.itemIndex]));
      } else {
        target.push(cloneJsonData(source[plan.itemIndex]));
      }
      remaining--;
    }
    if (plan.itemIndex < source.length) return false;
    plan.itemIndex = 0;
    plan.phase = plan.phase === "ships"
      ? "replacement-queue"
      : plan.phase === "replacement-queue"
        ? "reserve-slots"
        : plan.phase === "reserve-slots"
          ? "hideout-danger"
          : "complete";
  }
  return plan.phase === "complete";
}

function assertNpcSeaRouteStrategicSnapshotPlan(plan) {
  if (!plan || plan.version !== 1 || !plan.system || !plan.snapshot ||
      !(plan.destroyedReserveSlotIds instanceof Set) ||
      !Number.isInteger(plan.itemIndex) || plan.itemIndex < 0 ||
      typeof plan.phase !== "string") {
    throw new Error("Invalid NPC strategic snapshot plan");
  }
}

export function snapshotNpcSurrenderContinuity(system) {
  assertSaveableNpcRouteSystem(system);
  const surrenderedShips = system.ships.filter(shipHasCombatGrace);
  for (const ship of surrenderedShips) {
    if (!Number.isFinite(ship.hitPoints) || ship.hitPoints <= 0 ||
        !Number.isFinite(ship.maxHitPoints) || ship.hitPoints > ship.maxHitPoints ||
        !Number.isInteger(ship.specie) || ship.specie < 0) {
      throw new Error(`Invalid surrendered NPC ship state: ${ship.id}`);
    }
    inspectNpcCargo(ship);
  }
  return {
    version: 2,
    ships: surrenderedShips.map((ship) => ({
      id: ship.id,
      hitPointRatio: ship.hitPoints / ship.maxHitPoints,
      specie: ship.specie,
      cargo: cloneJsonData(ship.cargo),
      cargoCost: cloneJsonData(ship.cargoCost),
      seekingHideout: ship.seekingHideout,
      ship: {
        ...cloneJsonData(ship),
        visualNavigation: null
      }
    }))
  };
}

export function restoreNpcSurrenderContinuity(system, snapshot) {
  assertSaveableNpcRouteSystem(system);
  if (snapshot === undefined || snapshot === null) return 0;
  if (!snapshot || ![1, 2].includes(snapshot.version) || !Array.isArray(snapshot.ships)) {
    throw new Error("Unsupported NPC surrender continuity data");
  }
  const seenIds = new Set();
  let restoredCount = 0;
  for (const saved of snapshot.ships) {
    if (!saved || typeof saved.id !== "string" || saved.id === "" || seenIds.has(saved.id)) {
      throw new Error(`Invalid surrendered NPC ship id: ${saved?.id}`);
    }
    seenIds.add(saved.id);
    if (!Number.isFinite(saved.hitPointRatio) || saved.hitPointRatio <= 0 || saved.hitPointRatio > 1) {
      throw new Error(`Invalid surrendered NPC hull ratio: ${saved.id}`);
    }
    if (!Number.isInteger(saved.specie) || saved.specie < 0 ||
        !saved.cargo || typeof saved.cargo !== "object" || Array.isArray(saved.cargo) ||
        !saved.cargoCost || typeof saved.cargoCost !== "object" || Array.isArray(saved.cargoCost) ||
        typeof saved.seekingHideout !== "boolean") {
      throw new Error(`Invalid surrendered NPC continuity state: ${saved.id}`);
    }
    if (snapshot.version === 2 && (!saved.ship || saved.ship.id !== saved.id)) {
      throw new Error(`Surrendered NPC ship record is invalid: ${saved.id}`);
    }
    let ship = system.shipById.get(saved.id);
    if (!ship && saved.ship) {
      ship = cloneJsonData(saved.ship);
      reconcileRestoredNpcShip(ship, "surrender continuity restore");
      ship.visualNavigation = null;
      system.ships.push(ship);
      system.shipById.set(ship.id, ship);
    } else if (!ship) {
      console.warn(
        `[pixel-globe] omitted legacy surrendered ship absent from rebuilt traffic: ${saved.id}`
      );
      continue;
    }
    ship.hitPoints = Math.max(1, Math.round(ship.maxHitPoints * saved.hitPointRatio));
    ship.specie = saved.specie;
    ship.cargo = cloneJsonData(saved.cargo);
    ship.cargoCost = cloneJsonData(saved.cargoCost);
    ship.cargoOrigins = snapshot.version === 2
      ? cloneJsonData(saved.ship.cargoOrigins || {})
      : {};
    ship.tradeEmbargoConvictions = snapshot.version === 2
      ? saved.ship.tradeEmbargoConvictions ?? 0
      : 0;
    ship.lastTradeEmbargoEnforcement = snapshot.version === 2
      ? cloneJsonData(saved.ship.lastTradeEmbargoEnforcement ?? null)
      : null;
    ship.seekingHideout = saved.seekingHideout;
    ship.graceUntilPortVisit = Number.MAX_SAFE_INTEGER;
    reconcileNpcCargoCapacity(ship, "surrender continuity restore");
    restoredCount++;
  }
  if (restoredCount > 0) {
    synchronizeNationalPortCircuits(system, system.economy.lastMinute);
  }
  return restoredCount;
}

export function applyNpcSeaRouteSimulationSnapshot(
  system,
  snapshot,
  { preserveShipIds = [] } = {}
) {
  const plan = createNpcSeaRouteSimulationRestorePlan(system, snapshot, { preserveShipIds });
  while (!advanceNpcSeaRouteSimulationRestorePlan(plan, {
    maxItems: Number.MAX_SAFE_INTEGER
  })) {
    // Explicit synchronous callers require the complete strategic state.
  }
  return system;
}

export function createNpcSeaRouteSimulationRestorePlan(
  system,
  snapshot,
  { preserveShipIds = [] } = {}
) {
  assertSaveableNpcRouteSystem(system);
  if (!snapshot || snapshot.version !== NPC_SEA_ROUTE_SNAPSHOT_VERSION ||
      !Array.isArray(snapshot.ships) || !Array.isArray(snapshot.replacementQueue) ||
      !Array.isArray(snapshot.capitalNavalReserveSlots) ||
      !Array.isArray(snapshot.pirateHideoutDangerUntil)) {
    throw new Error("Unsupported NPC route simulation data");
  }
  if (!Array.isArray(preserveShipIds) ||
      preserveShipIds.some((id) => typeof id !== "string" || id === "")) {
    throw new Error("NPC simulation restore requires valid preserved ship ids");
  }
  const existingVisualNavigation = new Map();
  const currentShipById = new Map();
  for (const ship of system.ships) {
    currentShipById.set(ship.id, ship);
    if (ship.visualNavigation) existingVisualNavigation.set(ship.id, ship.visualNavigation);
  }
  const preservedIds = new Set(preserveShipIds);
  const currentReserveSlotsById = new Map(system.capitalNavalReserveSlots.map((slot) => [slot.id, slot]));
  const initialReserveSlotStateById = new Map(system.capitalNavalReserveSlots.map((slot) => (
    [slot.id, cloneJsonData(slot)]
  )));
  const protectedReserveSlotIds = new Set();
  for (const slot of system.capitalNavalReserveSlots) {
    if (slot.activeShipId !== null && preservedIds.has(slot.activeShipId)) {
      protectedReserveSlotIds.add(slot.id);
    }
  }
  for (const slot of snapshot.capitalNavalReserveSlots) {
    if (slot.activeShipId !== null && preservedIds.has(slot.activeShipId)) {
      protectedReserveSlotIds.add(slot.id);
    }
  }
  for (const shipId of preservedIds) {
    const slotId = currentShipById.get(shipId)?.capitalNavalReserveSlotId || null;
    if (slotId !== null) protectedReserveSlotIds.add(slotId);
  }
  return {
    version: 1,
    system,
    snapshot,
    preservedIds,
    initialShipIds: new Set(system.ships.map((ship) => ship.id)),
    initialReserveSlotIds: new Set(system.capitalNavalReserveSlots.map((slot) => slot.id)),
    existingVisualNavigation,
    currentShipById,
    currentReserveSlotsById,
    initialReserveSlotStateById,
    protectedReserveSlotIds,
    destroyedReserveShipIds: new Set(),
    destroyedReserveSlotIds: new Set(),
    phase: "snapshot-ships",
    itemIndex: 0,
    ships: [],
    includedIds: new Set(),
    shipById: new Map(),
    danger: new Map(),
    reserveSlots: []
  };
}

export function advanceNpcSeaRouteSimulationRestorePlan(plan, { maxItems = 12 } = {}) {
  assertNpcSeaRouteSimulationRestorePlan(plan);
  if (!Number.isInteger(maxItems) || maxItems <= 0) {
    throw new Error(`Invalid NPC simulation restore batch size: ${maxItems}`);
  }
  if (plan.phase === "complete") return true;
  let remaining = maxItems;
  while (remaining > 0 && plan.phase !== "complete") {
    if (plan.phase === "snapshot-ships") {
      const end = Math.min(plan.snapshot.ships.length, plan.itemIndex + remaining);
      for (; plan.itemIndex < end; plan.itemIndex++) {
        const simulatedShip = plan.snapshot.ships[plan.itemIndex];
        const ship = plan.preservedIds.has(simulatedShip.id)
          ? plan.currentShipById.get(simulatedShip.id)
          : {
              ...simulatedShip,
              cargo: { ...simulatedShip.cargo },
              cargoCost: { ...simulatedShip.cargoCost },
              visualNavigation: plan.existingVisualNavigation.get(simulatedShip.id) || null
            };
        if (ship) {
          const reserveSlots = plan.preservedIds.has(simulatedShip.id)
            ? plan.system.capitalNavalReserveSlots
            : plan.snapshot.capitalNavalReserveSlots;
          const destroyedSlotId = destroyedCapitalNavalReserveSlotId(
            ship,
            reserveSlots,
            "worker simulation"
          );
          if (destroyedSlotId !== null) {
            plan.destroyedReserveShipIds.add(ship.id);
            plan.destroyedReserveSlotIds.add(destroyedSlotId);
          } else {
            plan.ships.push(ship);
            plan.includedIds.add(ship.id);
          }
        }
        remaining--;
      }
      if (plan.itemIndex < plan.snapshot.ships.length) return false;
      plan.phase = "preserved-ships";
      plan.itemIndex = 0;
      continue;
    }
    if (plan.phase === "preserved-ships") {
      const currentShips = plan.system.ships;
      const end = Math.min(currentShips.length, plan.itemIndex + remaining);
      for (; plan.itemIndex < end; plan.itemIndex++) {
        const ship = currentShips[plan.itemIndex];
        if (plan.preservedIds.has(ship.id) && !plan.includedIds.has(ship.id) &&
            !plan.destroyedReserveShipIds.has(ship.id)) {
          plan.ships.push(ship);
          plan.includedIds.add(ship.id);
        }
        remaining--;
      }
      if (plan.itemIndex < currentShips.length) return false;
      plan.phase = "validate-ships";
      plan.itemIndex = 0;
      continue;
    }
    if (plan.phase === "validate-ships") {
      const end = Math.min(plan.ships.length, plan.itemIndex + remaining);
      for (; plan.itemIndex < end; plan.itemIndex++) {
        const ship = plan.ships[plan.itemIndex];
        if (!ship || typeof ship.id !== "string" || ship.id === "" || plan.shipById.has(ship.id)) {
          throw new Error(`Invalid simulated NPC ship id: ${ship?.id}`);
        }
        reconcileRestoredNpcShip(ship, "worker simulation");
        if (plan.preservedIds.has(ship.id)) {
          ship.visualNavigation = plan.existingVisualNavigation.get(ship.id) || null;
        }
        plan.shipById.set(ship.id, ship);
        remaining--;
      }
      if (plan.itemIndex < plan.ships.length) return false;
      plan.phase = "hideout-danger";
      plan.itemIndex = 0;
      continue;
    }
    if (plan.phase === "hideout-danger") {
      const entries = plan.snapshot.pirateHideoutDangerUntil;
      const end = Math.min(entries.length, plan.itemIndex + remaining);
      for (; plan.itemIndex < end; plan.itemIndex++) {
        const entry = entries[plan.itemIndex];
        if (!Array.isArray(entry) || !Number.isInteger(entry[0]) || !Number.isFinite(entry[1])) {
          throw new Error("Invalid simulated pirate hideout danger state");
        }
        plan.danger.set(entry[0], entry[1]);
        remaining--;
      }
      if (plan.itemIndex < entries.length) return false;
      plan.phase = "replacement-queue";
      plan.itemIndex = 0;
      continue;
    }
    if (plan.phase === "replacement-queue") {
      const replacements = plan.snapshot.replacementQueue;
      const end = Math.min(replacements.length, plan.itemIndex + remaining);
      for (; plan.itemIndex < end; plan.itemIndex++) {
        const replacement = replacements[plan.itemIndex];
        reconcileNpcNationalCircuitFields(replacement, `simulated replacement ${replacement.shipId}`);
        remaining--;
      }
      if (plan.itemIndex < replacements.length) return false;
      plan.phase = "reserve-slots";
      plan.itemIndex = 0;
      continue;
    }
    if (plan.phase === "reserve-slots") {
      const slots = plan.snapshot.capitalNavalReserveSlots;
      const end = Math.min(slots.length, plan.itemIndex + remaining);
      for (; plan.itemIndex < end; plan.itemIndex++) {
        const slot = slots[plan.itemIndex];
        if (!plan.protectedReserveSlotIds.has(slot.id) ||
            plan.currentReserveSlotsById.has(slot.id)) {
          const restoredSlot = {
            ...(plan.protectedReserveSlotIds.has(slot.id)
              ? plan.currentReserveSlotsById.get(slot.id)
              : slot)
          };
          plan.reserveSlots.push(validateCapitalNavalReserveSlot(
            plan.destroyedReserveSlotIds.has(slot.id)
              ? retiredCapitalNavalReserveSlot(restoredSlot)
              : restoredSlot
          ));
        }
        remaining--;
      }
      if (plan.itemIndex < slots.length) return false;
      plan.phase = "commit";
      plan.itemIndex = 0;
      continue;
    }
    if (plan.phase === "commit") {
      const { system } = plan;
      refreshLocallyAuthoritativeNpcRestoreState(plan);
      system.ships = plan.ships;
      system.shipById = plan.shipById;
      system.replacementQueue = plan.snapshot.replacementQueue;
      system.capitalNavalReserveSlots = plan.reserveSlots;
      reconcileCapitalNavalReserveShipsWithSnapshot(system, plan.ships);
      reconcileCapitalNavalReservePortsAfterOwnershipChange(system, new Set());
      validateCapitalNavalReserveAssignments(system);
      system.pirateHideoutDangerUntil = plan.danger;
      plan.phase = "complete";
      return true;
    }
    throw new Error(`Unknown NPC simulation restore phase: ${plan.phase}`);
  }
  return plan.phase === "complete";
}

function assertNpcSeaRouteSimulationRestorePlan(plan) {
  if (!plan || plan.version !== 1 || !plan.system || !plan.snapshot ||
      !(plan.preservedIds instanceof Set) || !(plan.existingVisualNavigation instanceof Map) ||
      !(plan.initialShipIds instanceof Set) || !(plan.initialReserveSlotIds instanceof Set) ||
      !(plan.currentShipById instanceof Map) || !(plan.currentReserveSlotsById instanceof Map) ||
      !(plan.initialReserveSlotStateById instanceof Map) ||
      !(plan.protectedReserveSlotIds instanceof Set) || !Array.isArray(plan.ships) ||
      !(plan.destroyedReserveShipIds instanceof Set) ||
      !(plan.destroyedReserveSlotIds instanceof Set) ||
      !(plan.includedIds instanceof Set) || !(plan.shipById instanceof Map) ||
      !(plan.danger instanceof Map) || !Array.isArray(plan.reserveSlots) ||
      !Number.isInteger(plan.itemIndex) || plan.itemIndex < 0 || typeof plan.phase !== "string") {
    throw new Error("Invalid NPC simulation restore plan");
  }
}

function refreshLocallyAuthoritativeNpcRestoreState(plan) {
  const liveSlotsById = new Map(plan.system.capitalNavalReserveSlots.map((slot) => [slot.id, slot]));
  const authoritativeSlotIds = new Set(
    [...plan.protectedReserveSlotIds].filter((slotId) => !plan.destroyedReserveSlotIds.has(slotId))
  );
  for (const [slotId, initialSlot] of plan.initialReserveSlotStateById) {
    const liveSlot = liveSlotsById.get(slotId);
    if (!liveSlot || !capitalNavalReserveSlotStatesMatch(liveSlot, initialSlot)) {
      authoritativeSlotIds.add(slotId);
    }
  }
  for (const liveSlot of plan.system.capitalNavalReserveSlots) {
    if (!plan.initialReserveSlotIds.has(liveSlot.id)) authoritativeSlotIds.add(liveSlot.id);
  }

  const liveAddedShipIds = new Set(plan.system.ships
    .filter((ship) => !plan.initialShipIds.has(ship.id))
    .map((ship) => ship.id));
  const authoritativeShipIds = new Set([...plan.preservedIds, ...liveAddedShipIds]);
  for (const shipId of plan.destroyedReserveShipIds) authoritativeShipIds.delete(shipId);
  for (const ship of plan.system.ships) {
    if (plan.destroyedReserveShipIds.has(ship.id)) continue;
    if (liveAddedShipIds.has(ship.id) && ship.capitalNavalReserveSlotId !== null) {
      authoritativeSlotIds.add(ship.capitalNavalReserveSlotId);
    }
  }
  for (const slotId of authoritativeSlotIds) {
    const activeShipId = liveSlotsById.get(slotId)?.activeShipId ?? null;
    if (activeShipId !== null) authoritativeShipIds.add(activeShipId);
  }
  const liveShipById = plan.system.shipById;
  const mergedShips = [];
  const mergedShipIds = new Set();
  const appendShip = (ship) => {
    if (!ship || typeof ship.id !== "string" || ship.id === "" || mergedShipIds.has(ship.id)) {
      throw new Error(`Invalid locally authoritative NPC ship: ${ship?.id}`);
    }
    mergedShips.push(ship);
    mergedShipIds.add(ship.id);
  };
  for (const stagedShip of plan.ships) {
    const slotId = stagedShip.capitalNavalReserveSlotId;
    if (slotId !== null && authoritativeSlotIds.has(slotId) &&
        liveSlotsById.get(slotId)?.activeShipId !== stagedShip.id) {
      continue;
    }
    if (!authoritativeShipIds.has(stagedShip.id)) {
      appendShip(stagedShip);
      continue;
    }
    const liveShip = liveShipById.get(stagedShip.id);
    if (liveShip && !mergedShipIds.has(liveShip.id)) appendShip(liveShip);
  }
  for (const liveShip of plan.system.ships) {
    if (authoritativeShipIds.has(liveShip.id) && !mergedShipIds.has(liveShip.id)) {
      appendShip(liveShip);
    }
  }
  plan.ships = mergedShips;
  plan.shipById = new Map(mergedShips.map((ship) => [ship.id, ship]));

  for (const ship of mergedShips) {
    if (authoritativeShipIds.has(ship.id) && ship.capitalNavalReserveSlotId !== null) {
      authoritativeSlotIds.add(ship.capitalNavalReserveSlotId);
    }
  }
  const mergedSlots = [];
  const mergedSlotIds = new Set();
  for (const stagedSlot of plan.reserveSlots) {
    if (!authoritativeSlotIds.has(stagedSlot.id)) {
      mergedSlots.push(stagedSlot);
      mergedSlotIds.add(stagedSlot.id);
      continue;
    }
    const liveSlot = liveSlotsById.get(stagedSlot.id);
    if (!liveSlot) continue;
    mergedSlots.push(validateCapitalNavalReserveSlot({ ...liveSlot }));
    mergedSlotIds.add(liveSlot.id);
  }
  for (const liveSlot of plan.system.capitalNavalReserveSlots) {
    if (plan.initialReserveSlotIds.has(liveSlot.id) || mergedSlotIds.has(liveSlot.id)) continue;
    mergedSlots.push(validateCapitalNavalReserveSlot({ ...liveSlot }));
    mergedSlotIds.add(liveSlot.id);
  }
  plan.reserveSlots = mergedSlots;
}

function capitalNavalReserveSlotStatesMatch(left, right) {
  return left.id === right.id &&
    left.factionId === right.factionId &&
    left.originCityId === right.originCityId &&
    left.profileId === right.profileId &&
    left.shipSlug === right.shipSlug &&
    left.stockedMinute === right.stockedMinute &&
    left.sourceSaleId === right.sourceSaleId &&
    left.activeShipId === right.activeShipId &&
    left.activationCount === right.activationCount &&
    left.allowedSlugs.length === right.allowedSlugs.length &&
    left.allowedSlugs.every((slug, index) => slug === right.allowedSlugs[index]);
}

function reconcileCapitalNavalReserveShipsWithSnapshot(system, ships) {
  const slotById = new Map(system.capitalNavalReserveSlots.map((slot) => [slot.id, slot]));
  const staleShipIds = new Set();
  for (const ship of ships) {
    if (ship.capitalNavalReserveSlotId === null) continue;
    const slot = slotById.get(ship.capitalNavalReserveSlotId);
    if (slot?.activeShipId === ship.id) continue;
    if (slot) {
      // A staged worker snapshot can finish copying an older sortie after its
      // finite slot has returned to store or launched a newer ship. The slot is
      // the authoritative reserve ledger, so the older worker copy must not
      // survive as a free additional warship.
      staleShipIds.add(ship.id);
      continue;
    }
    // Reserve slots are authoritative in a worker snapshot. A conquest can abolish a
    // faction's reserve while the corresponding ship is crossing the worker boundary.
    // Demobilize that ship instead of restoring a reference to a constitutional owner
    // which no longer exists.
    ship.capitalNavalReserveSlotId = null;
    ship.capitalNavalReserveDestinationCityId = null;
    ship.capitalNavalReserveDocked = false;
    ship.replaceOnSink = Boolean(npcControlledNavalBaseForShipOrNull(
      system,
      ship,
      ship.portResponse?.returnCityId ?? null
    ));
  }
  if (staleShipIds.size > 0) {
    system.ships = system.ships.filter((ship) => !staleShipIds.has(ship.id));
    for (const shipId of staleShipIds) system.shipById.delete(shipId);
  }
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
    suzeraintyMemory = system?.suzeraintyMemory,
    tradeEmbargoes = system?.tradeEmbargoes
  } = {}
) {
  assertSaveableNpcRouteSystem(system);
  validateOptionalSeedKey(seedKey, "restored NPC routes");
  if (!snapshot || ![1, 2, 3, 4, NPC_SEA_ROUTE_SNAPSHOT_VERSION].includes(snapshot.version) || !Array.isArray(snapshot.ships) ||
      !Array.isArray(snapshot.replacementQueue) || !Array.isArray(snapshot.pirateHideoutDangerUntil) ||
      (snapshot.version >= 3 && !Array.isArray(snapshot.capitalNavalReserveSlots))) {
    throw new Error("Unsupported NPC route save data");
  }
  const ships = cloneJsonData(snapshot.ships);
  const replacementQueue = cloneJsonData(snapshot.replacementQueue);
  if (snapshot.version === 1) migrateNpcRouteFactionsTo1522(ships, replacementQueue);
  if (snapshot.version < NPC_SEA_ROUTE_SNAPSHOT_VERSION) {
    migrateNpcRouteEntityReferences(system, ships, replacementQueue);
  }
  const shipById = new Map();
  for (const ship of ships) {
    if (!ship || typeof ship.id !== "string" || ship.id === "" || shipById.has(ship.id)) {
      throw new Error(`Invalid saved NPC ship id: ${ship?.id}`);
    }
    reconcileRestoredNpcShip(ship, "save restore");
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
  validateTradeEmbargoMemory(tradeEmbargoes);
  system.relationBetween = relationBetween;
  system.foreignSettlementExpulsions = foreignSettlementExpulsions;
  system.sovereignTradeOpenToFaction = sovereignTradeOpenToFaction;
  system.suzeraintyMemory = suzeraintyMemory;
  system.tradeEmbargoes = tradeEmbargoes;
  // Saved routes may have been calculated against an older lane graph. Avoid
  // reusing those cached paths while repairing and replanning the snapshot.
  system.routeCache.clear();
  system.edgeCostCache.clear();
  canonicalizeSavedNpcRoutePorts(system, ships);
  const repairedOverextendedShips = repairOverextendedNpcShips(
    system,
    ships,
    replacementQueue
  );
  if (repairedOverextendedShips > 0) {
    console.info(`Repaired ${repairedOverextendedShips} overextended NPC ship routes`);
  }
  const repairedRegionalRoutes = repairInvalidRegionalFishermanRoutes(system, ships);
  if (repairedRegionalRoutes > 0) {
    console.info(`Repaired ${repairedRegionalRoutes} saved regional fishing routes`);
  }
  const replannedRoutes = replanNpcRoutesForCurrentTopology(system, ships);
  if (replannedRoutes > 0) {
    console.info(`Replanned ${replannedRoutes} saved NPC routes for the current sea-lane topology`);
  }
  system.ships = ships;
  system.replacementQueue = replacementQueue;
  system.pirateHideoutDangerUntil = danger;
  synchronizePacificFleet(system, system.economy.lastMinute);
  synchronizeNpcWhalerFleet(system, system.economy.lastMinute);
  system.shipById = new Map(system.ships.map((ship) => [ship.id, ship]));
  system.capitalNavalReserveSlots = snapshot.version >= 3
    ? restoreCapitalNavalReserveSlots(system, snapshot.capitalNavalReserveSlots, snapshot.version)
    : createInitialCapitalNavalReserveSlots(system, system.economy.lastMinute);
  validateCapitalNavalReserveAssignments(system);
  synchronizeNationalPortCircuits(system, system.economy.lastMinute);
  if (system.shipById.size !== system.ships.length) {
    throw new Error("NPC route restore created duplicate ship ids");
  }
  return system;
}

function reconcileRestoredNpcShip(ship, context) {
  if (!ship || typeof ship.id !== "string" || ship.id === "") {
    throw new Error(`Invalid restored NPC ship id: ${ship?.id}`);
  }
  if (!Number.isFinite(ship.hitPoints) || ship.hitPoints <= 0 ||
      !Number.isFinite(ship.maxHitPoints) || ship.maxHitPoints <= 0) {
    throw new Error(`Invalid restored NPC hull: ${ship.id}`);
  }
  ship.cultureType = ship.cultureType || ship.currentPort?.cityType || null;
  ship.cartazUntilMinute = ship.cartazUntilMinute ?? 0;
  if (!Number.isFinite(ship.cartazUntilMinute) || ship.cartazUntilMinute < 0) {
    throw new Error(`Invalid restored NPC cartaz expiry: ${ship.id}`);
  }
  ship.cargoOrigins = ship.cargoOrigins || {};
  ship.tradeEmbargoConvictions = ship.tradeEmbargoConvictions ?? 0;
  ship.lastTradeEmbargoEnforcement = ship.lastTradeEmbargoEnforcement ?? null;
  if (ship.captainHomeCityId !== undefined && ship.captainHomeCityId !== null) {
    requireEntityId(ship.captainHomeCityId, `${context} ship ${ship.id} captain home`);
  }
  reconcileNpcNationalCircuitFields(ship, `${context} ship ${ship.id}`);
  reconcileNpcPortResponseFields(ship, `${context} ship ${ship.id}`);
  assertFactionId(ship.factionId);
  const stats = shipStatsForSlug(ship.slug);
  const reconciledHull = reconcileShipHullForCurrentStats(stats, ship.hitPoints, ship.maxHitPoints);
  ship.hitPoints = reconciledHull.hitPoints;
  ship.maxHitPoints = reconciledHull.maxHitPoints;
  reconcileNpcCargoCapacity(ship, context);
  return ship;
}

function destroyedCapitalNavalReserveSlotId(ship, reserveSlots, context) {
  if (ship?.hitPoints !== 0) return null;
  if (!Number.isFinite(ship.maxHitPoints) || ship.maxHitPoints <= 0) {
    throw new Error(`Invalid restored NPC hull: ${ship?.id}`);
  }
  if (ship.capitalNavalReserveSlotId === null || ship.capitalNavalReserveSlotId === undefined ||
      ship.replaceOnSink !== false) {
    throw new Error(`Destroyed ${context} NPC ship was not retired: ${ship.id}`);
  }
  const slot = reserveSlots.find((candidate) => candidate.id === ship.capitalNavalReserveSlotId);
  if (!slot || slot.activeShipId !== ship.id) {
    throw new Error(`Destroyed capital reserve ship does not match its slot: ${ship.id}`);
  }
  return slot.id;
}

function retiredCapitalNavalReserveSlot(slot) {
  return clearCapitalNavalReserveSlot(cloneJsonData(slot));
}

function clearCapitalNavalReserveSlot(slot) {
  slot.activeShipId = null;
  slot.shipSlug = null;
  slot.stockedMinute = null;
  slot.sourceSaleId = null;
  return slot;
}

function migrateNpcRouteFactionsTo1522(ships, replacementQueue) {
  for (const ship of ships) ship.factionId = migrateFactionIdTo1522(ship.factionId);
  for (const replacement of replacementQueue) {
    replacement.factionId = migrateFactionIdTo1522(replacement.factionId);
  }
}

function migrateNpcRouteEntityReferences(system, ships, replacementQueue) {
  for (const ship of ships) {
    if (Array.isArray(ship.nationalCircuitPortIds)) {
      ship.nationalCircuitCityIds = ship.nationalCircuitPortIds.map((tileId) => (
        cityIdForLegacyPortTile(system, tileId, `Legacy national circuit on ${ship.id}`)
      ));
      delete ship.nationalCircuitPortIds;
    }
    if (ship.capitalNavalReserveDestinationPortId !== undefined) {
      ship.capitalNavalReserveDestinationCityId = ship.capitalNavalReserveDestinationPortId === null
        ? null
        : cityIdForLegacyPortTile(
            system,
            ship.capitalNavalReserveDestinationPortId,
            `Legacy capital reserve destination on ${ship.id}`
          );
      delete ship.capitalNavalReserveDestinationPortId;
    }
    if (ship.portResponse) {
      ship.portResponse.targetCityId = cityIdForLegacyPortTile(
        system,
        ship.portResponse.targetPortId,
        `Legacy port-response target on ${ship.id}`
      );
      ship.portResponse.returnCityId = cityIdForLegacyPortTile(
        system,
        ship.portResponse.returnPortId,
        `Legacy port-response return on ${ship.id}`
      );
      delete ship.portResponse.targetPortId;
      delete ship.portResponse.returnPortId;
    }
    if (ship.encounter) {
      if (ship.encounter.originPortId !== undefined) {
        ship.encounter.originCityId = cityIdForLegacyPortTile(
          system,
          ship.encounter.originPortId,
          `Legacy encounter origin on ${ship.id}`
        );
        delete ship.encounter.originPortId;
      }
      if (ship.encounter.destinationPortId !== undefined) {
        ship.encounter.destinationCityId = cityIdForLegacyPortTile(
          system,
          ship.encounter.destinationPortId,
          `Legacy encounter destination on ${ship.id}`
        );
        delete ship.encounter.destinationPortId;
      }
    }
  }
  for (const replacement of replacementQueue) {
    replacement.originCityId = cityIdForLegacyPortTile(
      system,
      replacement.originPortId,
      `Legacy NPC replacement origin ${replacement.shipId}`
    );
    delete replacement.originPortId;
    if (Array.isArray(replacement.nationalCircuitPortIds)) {
      replacement.nationalCircuitCityIds = replacement.nationalCircuitPortIds.map((tileId) => (
        cityIdForLegacyPortTile(
          system,
          tileId,
          `Legacy replacement national circuit ${replacement.shipId}`
        )
      ));
      delete replacement.nationalCircuitPortIds;
    }
  }
}

function repairOverextendedNpcShips(system, ships, replacementQueue) {
  const regionalProfile = fleetProfileForId("east-asia");
  const japanesePorts = system.ports.filter((port) => (
    isJapanesePolityFaction(port.factionId) && regionalProfile.portPredicate(port)
  ));

  let repaired = 0;
  for (const ship of ships) {
    if (ship.encounter) continue;
    const profileSpec = fleetProfileForId(ship.profileId);
    if (npcShipSupportsFleetMode(ship.slug, profileSpec.mode)) continue;

    let repairedProfile = profileSpec;
    if (JAPANESE_SHIP_SLUGS.includes(ship.slug) && japanesePorts.length > 0) {
      repairedProfile = regionalProfile;
      ship.currentPort = nearestJapaneseFleetPort(japanesePorts, ship.currentPort, ship.factionId);
    } else {
      replaceNpcShipWithProfileHull(ship, profileSpec);
    }
    ship.profileId = repairedProfile.id;
    ship.mode = repairedProfile.mode;
    ship.slugs = profileSlugsForRole(repairedProfile, ship.role, ship.factionId).slice();
    ship.finalDestination = null;
    ship.plan = null;
    ship.clockOffsetMinutes = 0;
    ship.visualNavigation = null;
    assignNpcPlan(system, ship, system.economy.lastMinute);
    repaired++;
  }

  for (const replacement of replacementQueue) {
    const profileSpec = fleetProfileForId(replacement.profileId);
    if (profileSpec.mode !== "interregional") continue;
    const hasLocalJapaneseHull = replacement.slugs.some((slug) => (
      JAPANESE_SHIP_SLUGS.includes(slug)
    ));
    if (hasLocalJapaneseHull && japanesePorts.length > 0) {
      const previousOrigin = system.ports.find((port) => port.cityId === replacement.originCityId) ||
        japanesePorts[0];
      const origin = nearestJapaneseFleetPort(japanesePorts, previousOrigin, replacement.factionId);
      replacement.profileId = regionalProfile.id;
      replacement.slugs = profileSlugsForRole(
        regionalProfile,
        replacement.role,
        replacement.factionId
      ).slice();
      replacement.originCityId = requireCityId(origin, "NPC replacement origin");
    } else {
      const compatibleSlugs = replacement.slugs.filter((slug) => (
        npcShipSupportsFleetMode(slug, profileSpec.mode)
      ));
      if (compatibleSlugs.length === replacement.slugs.length) continue;
      replacement.slugs = compatibleSlugs.length > 0
        ? compatibleSlugs
        : compatibleProfileSlugs(profileSpec, replacement.role, replacement.factionId);
    }
    repaired++;
  }
  return repaired;
}

function replaceNpcShipWithProfileHull(ship, profileSpec) {
  const slugs = compatibleProfileSlugs(profileSpec, ship.role, ship.factionId);
  const slug = weightedCheapShipSlug(slugs, hashString32(`${ship.seed}|operating-range-repair`));
  const stats = shipStatsForSlug(slug);
  const hullRatio = ship.hitPoints / ship.maxHitPoints;
  ship.slug = slug;
  ship.maxHitPoints = stats.hitPoints;
  ship.hitPoints = Math.max(0.5, stats.hitPoints * hullRatio);
  ship.cargoCapacity = stats.cargoCapacity;
  ship.fishingNetId = ship.role === NPC_ROLE_FISHERMAN
    ? npcFishingNetForSeed(ship.seed, stats.cargoCapacity).id
    : null;
  reconcileNpcCargoCapacity(ship, "operating-range repair");
}

function compatibleProfileSlugs(profileSpec, role, factionId) {
  const slugs = profileSlugsForRole(profileSpec, role, factionId).filter((slug) => (
    npcShipSupportsFleetMode(slug, profileSpec.mode)
  ));
  if (slugs.length === 0) {
    throw new Error(`NPC fleet profile ${profileSpec.id} has no ${role} hull for ${profileSpec.mode} routes`);
  }
  return slugs;
}

function nearestJapaneseFleetPort(ports, position, factionId) {
  const nationalPorts = isJapanesePolityFaction(factionId)
    ? ports.filter((port) => port.factionId === factionId)
    : [];
  const candidates = nationalPorts.length > 0 ? nationalPorts : ports;
  return [...candidates].sort((a, b) => (
    distanceKm(position, a) - distanceKm(position, b) || a.tileId - b.tileId
  ))[0];
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

function repairInvalidRegionalFishermanRoutes(system, ships) {
  const startMinute = system.economy?.lastMinute;
  if (!Number.isFinite(startMinute)) {
    throw new Error(`Regional fishing-route repair requires a finite economy minute: ${startMinute}`);
  }
  let repaired = 0;
  for (const ship of ships) {
    if (ship.role !== NPC_ROLE_FISHERMAN || !ship.plan) continue;
    const profileSpec = fleetProfileForId(ship.profileId);
    if (profileSpec.mode !== "regional") continue;
    const profilePorts = system.ports.filter(profileSpec.portPredicate);
    if (profilePorts.length === 0) continue;
    const destinations = [
      ship.currentPort,
      ship.plan.origin,
      ship.plan.destination,
      ship.finalDestination
    ].filter(Boolean);
    const belongsToProfile = destinations.every((destination) => (
      regionalFishermanDestinationBelongsToProfile(profileSpec, profilePorts, destination)
    ));
    if (belongsToProfile) continue;

    const currentBelongsToProfile = regionalFishermanDestinationBelongsToProfile(
      profileSpec,
      profilePorts,
      ship.currentPort
    );
    if (!currentBelongsToProfile) {
      ship.currentPort = [...profilePorts].sort((a, b) => (
        distanceKm(ship.currentPort, a) - distanceKm(ship.currentPort, b) ||
        a.tileId - b.tileId
      ))[0];
    }
    ship.finalDestination = null;
    ship.plan = null;
    ship.clockOffsetMinutes = 0;
    ship.visualNavigation = null;
    assignNpcPlan(system, ship, startMinute);
    repaired++;
  }
  return repaired;
}

function regionalFishermanDestinationBelongsToProfile(profileSpec, profilePorts, destination) {
  if (destination.isFishingGround) {
    return profilePorts.some((port) => npcRoutePointsShareAnchor(port, destination));
  }
  return profileSpec.portPredicate(destination);
}

function replanNpcRoutesForCurrentTopology(system, ships) {
  const startMinute = system.economy?.lastMinute;
  if (!Number.isFinite(startMinute)) {
    throw new Error(`NPC route topology repair requires a finite economy minute: ${startMinute}`);
  }
  let replanned = 0;
  for (const ship of ships) {
    if (ship.hiddenAtHideout && ship.plan === null) continue;
    if (!npcPlanUsesObsoleteRouteTopology(system, ship.plan)) continue;
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

function npcPlanUsesObsoleteRouteTopology(system, plan) {
  if (!plan || !Array.isArray(plan.segments)) throw new Error("Saved NPC ship has no route segments");
  for (const segment of plan.segments) {
    if (segment.kind !== "sail") continue;
    const fromId = segment.from?.id;
    const toId = segment.to?.id;
    const fromIsLane = system.laneNodes.has(fromId);
    const toIsLane = system.laneNodes.has(toId);
    if (fromIsLane && toIsLane) {
      const edgeExists = (system.baseEdges.get(fromId) || []).some((edge) => edge.to === toId);
      if (!edgeExists) return true;
      continue;
    }
    if (fromIsLane && !currentRoutePointUsesAnchor(system, segment.to, fromId)) return true;
    if (toIsLane && !currentRoutePointUsesAnchor(system, segment.from, toId)) return true;
  }
  return false;
}

function currentRoutePointUsesAnchor(system, point, anchorId) {
  const tileId = Number.isInteger(point?.tileId) ? point.tileId : point?.port?.tileId;
  if (!Number.isInteger(tileId)) return true;
  const currentPoint = system.ports.find((port) => port.tileId === tileId) ||
    system.fishingGrounds.find((ground) => ground.tileId === tileId) ||
    system.whalingGrounds.find((ground) => ground.tileId === tileId);
  if (!currentPoint) return true;
  return currentPoint.routeAnchors.includes(anchorId);
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
  if (!system.fishingGroundIsNavigable(destination)) {
    throw new Error(`Saved NPC fishing ground is no longer navigable: ${destination.tileId}`);
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

export function applyNpcConquestOwnership(
  system,
  portFactionByCityId,
  collapsedFactionIds,
  factionSuccessors = new Map()
) {
  assertSaveableNpcRouteSystem(system);
  if (!(portFactionByCityId instanceof Map)) throw new Error("NPC conquest ownership requires a port faction map");
  if (!(collapsedFactionIds instanceof Set)) throw new Error("NPC conquest ownership requires collapsed factions");
  if (!(factionSuccessors instanceof Map)) throw new Error("NPC conquest ownership requires a successor map");
  for (const [cityId, factionId] of portFactionByCityId) {
    requireEntityId(cityId, "Conquered port");
    assertFactionId(factionId);
  }
  for (const factionId of collapsedFactionIds) assertFactionId(factionId);
  for (const [predecessorFactionId, successorFactionId] of factionSuccessors) {
    assertFactionId(predecessorFactionId);
    assertFactionId(successorFactionId);
  }

  for (const port of system.ports) synchronizeNpcPortFaction(port, portFactionByCityId);
  for (const ship of system.ships) {
    ship.factionId = factionSuccessors.get(ship.factionId) || ship.factionId;
    if (collapsedFactionIds.has(ship.factionId)) ship.factionId = NEUTRAL_FACTION_ID;
    if (ship.portResponse) {
      if (ship.factionId === NEUTRAL_FACTION_ID) ship.portResponse = null;
      else ship.portResponse.factionId = ship.factionId;
    }
    synchronizeNpcPortFaction(ship.currentPort, portFactionByCityId);
    synchronizeNpcPortFaction(ship.finalDestination, portFactionByCityId);
    synchronizeNpcPortFaction(ship.plan?.origin, portFactionByCityId);
    synchronizeNpcPortFaction(ship.plan?.destination, portFactionByCityId);
  }
  for (const replacement of system.replacementQueue) {
    replacement.factionId = factionSuccessors.get(replacement.factionId) || replacement.factionId;
    if (collapsedFactionIds.has(replacement.factionId)) replacement.factionId = NEUTRAL_FACTION_ID;
  }
  for (const slot of system.capitalNavalReserveSlots) {
    slot.factionId = factionSuccessors.get(slot.factionId) || slot.factionId;
  }
  reconcileCapitalNavalReservePortsAfterOwnershipChange(system, collapsedFactionIds);
  reconcileNpcPortResponseThreats(system, system.economy.lastMinute);
  validateCapitalNavalReserveAssignments(system);
  synchronizeExpansionistWarshipFleets(system, system.economy.lastMinute, collapsedFactionIds);
  system.routeCache.clear();
  system.edgeCostCache.clear();
  synchronizeNationalPortCircuits(system, system.economy.lastMinute);
  return system;
}

export function npcCapitalNavalReserveStatus(system, factionId) {
  assertSaveableNpcRouteSystem(system);
  assertFactionId(factionId);
  const slots = system.capitalNavalReserveSlots.filter((slot) => slot.factionId === factionId);
  return Object.freeze({
    factionId,
    targetCount: slots.length,
    stockedCount: slots.filter((slot) => slot.shipSlug !== null).length,
    activeCount: slots.filter((slot) => slot.activeShipId !== null).length,
    deployedCount: slots.filter((slot) => {
      const ship = slot.activeShipId ? system.shipById.get(slot.activeShipId) : null;
      return ship?.portResponse?.phase === "responding";
    }).length,
    inTransitCount: slots.filter((slot) => {
      const ship = slot.activeShipId ? system.shipById.get(slot.activeShipId) : null;
      return Boolean(ship && ship.capitalNavalReserveDestinationCityId !== null);
    }).length,
    vacantCount: slots.filter((slot) => slot.shipSlug === null && slot.activeShipId === null).length,
    slots: Object.freeze(slots.map((slot) => Object.freeze({ ...slot, allowedSlugs: Object.freeze([...slot.allowedSlugs]) })))
  });
}

export function npcFactionCanMaintainCapitalNavalReserve(system, factionId) {
  assertSaveableNpcRouteSystem(system);
  assertFactionId(factionId);
  if (factionId === NEUTRAL_FACTION_ID || factionId === PIRATE_FACTION_ID) return false;
  return system.ports.some((port) => (
    port.factionId === factionId && npcRoutePortAcceptsTraffic(port)
  ));
}

export function expandNpcCapitalNavalReserve(system, {
  factionId,
  slotCount,
  contractId
}) {
  assertSaveableNpcRouteSystem(system);
  assertFactionId(factionId);
  if (factionId === NEUTRAL_FACTION_ID || factionId === PIRATE_FACTION_ID) {
    throw new Error(`Capital reserve expansion requires a sovereign faction: ${factionId}`);
  }
  if (!Number.isInteger(slotCount) || slotCount <= 0) {
    throw new Error(`Capital reserve expansion requires a positive slot count: ${slotCount}`);
  }
  if (typeof contractId !== "string" || contractId.trim() === "") {
    throw new Error("Capital reserve expansion requires a contract id");
  }
  const controlledPorts = system.ports.filter((port) => (
    port.factionId === factionId && npcRoutePortAcceptsTraffic(port) &&
    capitalNavalReserveProfileOrNull(port)
  ));
  if (controlledPorts.length === 0) {
    throw new Error(`Capital reserve expansion has no naval port for ${factionId}`);
  }
  const origin = capitalNavalReservePort(controlledPorts, factionId);
  const profileSpec = capitalNavalReserveProfile(origin);
  const allowedSlugs = capitalNavalReserveSlugs(profileSpec, factionId);
  const slotIds = [];
  for (let index = 0; index < slotCount; index++) {
    const id = `capital-reserve:${factionId}:war-loan:${contractId}:${index}`;
    if (system.capitalNavalReserveSlots.some((slot) => slot.id === id)) {
      throw new Error(`Capital reserve expansion already exists: ${id}`);
    }
    system.capitalNavalReserveSlots.push(validateCapitalNavalReserveSlot({
      id,
      factionId,
      originCityId: requireCityId(origin, "Capital reserve origin"),
      profileId: profileSpec.id,
      allowedSlugs,
      shipSlug: null,
      stockedMinute: null,
      sourceSaleId: null,
      activeShipId: null,
      activationCount: 0
    }));
    slotIds.push(id);
  }
  validateCapitalNavalReserveAssignments(system);
  return Object.freeze(slotIds);
}

export function returnNpcWarLoanOffensiveShips(system, shipIds, clockMinutes) {
  assertSaveableNpcRouteSystem(system);
  if (!Array.isArray(shipIds) || shipIds.some((id) => typeof id !== "string" || id === "")) {
    throw new Error("War-loan demobilization requires ship ids");
  }
  if (!Number.isFinite(clockMinutes) || clockMinutes < 0) {
    throw new Error(`Invalid war-loan demobilization minute: ${clockMinutes}`);
  }
  let returned = 0;
  for (const shipId of new Set(shipIds)) {
    const ship = system.shipById.get(shipId);
    if (!ship?.portResponse || ship.portResponse.reason !== NPC_PORT_RESPONSE_WAR_LOAN ||
        ship.portResponse.phase !== "responding") {
      continue;
    }
    if (orderNpcPortResponseReturn(system, ship)) returned += 1;
  }
  if (returned > 0) validateCapitalNavalReserveAssignments(system);
  return returned;
}

export function orderNpcPortResponse(system, {
  factionId,
  targetCityId,
  reason,
  clockMinutes,
  threatUntilMinute = null,
  allowReinforcement = false
}) {
  assertSaveableNpcRouteSystem(system);
  assertFactionId(factionId);
  if (factionId === NEUTRAL_FACTION_ID || factionId === PIRATE_FACTION_ID) {
    throw new Error(`Port response requires a sovereign faction: ${factionId}`);
  }
  requireEntityId(targetCityId, "port-response target");
  if (!NPC_PORT_RESPONSE_REASONS.has(reason)) throw new Error(`Unknown port-response reason: ${reason}`);
  if (!Number.isFinite(clockMinutes) || clockMinutes < 0) {
    throw new Error(`Invalid port-response minute: ${clockMinutes}`);
  }
  if (typeof allowReinforcement !== "boolean") {
    throw new Error(`Invalid port-response reinforcement flag: ${allowReinforcement}`);
  }
  if (reason === NPC_PORT_RESPONSE_BURNING) {
    if (!Number.isFinite(threatUntilMinute) || threatUntilMinute <= clockMinutes) {
      throw new Error(`Burning-port response requires a future recovery minute: ${threatUntilMinute}`);
    }
  } else if (threatUntilMinute !== null) {
    throw new Error("A non-burning port response cannot have a battery recovery minute");
  }
  const target = requiredNpcRoutePort(system, targetCityId, "port-response target");
  const controlledPorts = system.ports.filter((port) => (
    port.factionId === factionId && npcRoutePortAcceptsTraffic(port)
  ));
  if (controlledPorts.length === 0) {
    return Object.freeze({ outcome: "no-controlled-port", factionId, targetCityId, shipId: null });
  }
  const existingReserveSlot = system.capitalNavalReserveSlots.find((slot) => (
    slot.factionId === factionId
  ));
  const returnPort = capitalNavalReserveRebasePortOrNull(
    controlledPorts,
    factionId,
    existingReserveSlot?.profileId ?? null
  );
  if (!returnPort) {
    throw new Error(`Port response has controlled ports but no return port for ${factionId}`);
  }
  const existing = system.ships.find((ship) => (
    ship.factionId === factionId && ship.role === NPC_ROLE_WARSHIP &&
    ship.portResponse?.targetCityId === targetCityId
  ));
  if (existing && !allowReinforcement) {
    assignNpcPortResponse(existing, {
      factionId,
      targetPort: target,
      targetCityId,
      returnCityId: existing.capitalNavalReserveSlotId
        ? requiredCapitalNavalReserveSlot(system, existing.capitalNavalReserveSlotId).originCityId
        : requireCityId(returnPort, "Port-response return port"),
      reason,
      clockMinutes,
      threatUntilMinute
    });
    return Object.freeze({
      outcome: "already-responding",
      factionId,
      targetCityId,
      shipId: existing.id
    });
  }

  const stockedSlot = system.capitalNavalReserveSlots.find((slot) => (
    slot.factionId === factionId && slot.shipSlug !== null && slot.activeShipId === null
  ));
  if (stockedSlot) {
    const ship = activateCapitalNavalReserveSlot(system, stockedSlot, target, {
      reason,
      clockMinutes,
      threatUntilMinute
    });
    return Object.freeze({
      outcome: "reserve-activated",
      factionId,
      targetCityId,
      shipId: ship.id,
      reserveSlotId: stockedSlot.id
    });
  }

  const unassigned = system.ships
    .filter((ship) => (
      ship.factionId === factionId && ship.role === NPC_ROLE_WARSHIP &&
      !ship.encounter && !ship.portResponse && !ship.capitalNavalReserveSlotId &&
      !shipHasCombatGrace(ship)
    ))
    .sort((a, b) => (
      distanceKm(a.currentPort, target) - distanceKm(b.currentPort, target) ||
      a.id.localeCompare(b.id)
    ))[0] || null;
  if (unassigned) {
    assignNpcPortResponse(unassigned, {
      factionId,
      targetPort: target,
      targetCityId,
      returnCityId: requireCityId(returnPort, "Port-response return port"),
      reason,
      clockMinutes,
      threatUntilMinute
    });
    return Object.freeze({
      outcome: "warship-recalled",
      factionId,
      targetCityId,
      shipId: unassigned.id
    });
  }

  const retasked = system.ships
    .filter((ship) => (
      ship.factionId === factionId && ship.role === NPC_ROLE_WARSHIP && ship.portResponse &&
      ship.portResponse.targetCityId !== targetCityId
    ))
    .sort((a, b) => (
      distanceKm(a.currentPort, target) - distanceKm(b.currentPort, target) ||
      a.id.localeCompare(b.id)
    ))[0] || null;
  if (!retasked) {
    return Object.freeze({ outcome: "no-warship-available", factionId, targetCityId, shipId: null });
  }
  assignNpcPortResponse(retasked, {
    factionId,
    targetPort: target,
    targetCityId,
    returnCityId: retasked.portResponse.returnCityId,
    reason,
    clockMinutes,
    threatUntilMinute
  });
  return Object.freeze({
    outcome: "warship-retasked",
    factionId,
    targetCityId,
    shipId: retasked.id
  });
}

function createInitialCapitalNavalReserveSlots(system, startMinute) {
  const portsByFactionId = new Map();
  for (const port of system.ports) {
    if (!npcRoutePortAcceptsTraffic(port) ||
        !capitalNavalReserveProfileOrNull(port) ||
        port.factionId === NEUTRAL_FACTION_ID || port.factionId === PIRATE_FACTION_ID) {
      continue;
    }
    const ports = portsByFactionId.get(port.factionId) || [];
    ports.push(port);
    portsByFactionId.set(port.factionId, ports);
  }
  const slots = [];
  for (const [factionId, ports] of [...portsByFactionId].sort(([a], [b]) => a.localeCompare(b))) {
    const origin = capitalNavalReservePort(ports, factionId);
    const profileSpec = capitalNavalReserveProfile(origin);
    const allowedSlugs = capitalNavalReserveSlugs(profileSpec, factionId);
    const targetCount = capitalNavalReserveTargetCount(ports);
    for (let index = 0; index < targetCount; index++) {
      const id = `capital-reserve:${factionId}:${index}`;
      const seed = hashString32(npcSeedKey(system, `${id}|initial-hull`));
      slots.push(validateCapitalNavalReserveSlot({
        id,
        factionId,
        originCityId: requireCityId(origin, "Capital reserve origin"),
        profileId: profileSpec.id,
        allowedSlugs,
        shipSlug: weightedCheapShipSlug(allowedSlugs, seed),
        stockedMinute: startMinute,
        sourceSaleId: null,
        activeShipId: null,
        activationCount: 0
      }));
    }
  }
  return slots;
}

function capitalNavalReserveTargetCount(ports) {
  if (!Array.isArray(ports) || ports.length === 0) {
    throw new Error("Capital naval reserve strength requires controlled ports");
  }
  const totalPopulation = ports.reduce((sum, port) => sum + Math.max(0, Number(port.population || 0)), 0);
  const largestPortPopulation = Math.max(...ports.map((port) => Math.max(0, Number(port.population || 0))));
  const powerScore = totalPopulation + largestPortPopulation + ports.length * 50000;
  if (powerScore >= NPC_CAPITAL_NAVAL_RESERVE_TIER_THREE_SCORE || ports.length >= 7) {
    return NPC_CAPITAL_NAVAL_RESERVE_MAX;
  }
  if (powerScore >= NPC_CAPITAL_NAVAL_RESERVE_TIER_TWO_SCORE || ports.length >= 3) return 2;
  return 1;
}

function capitalNavalReservePort(ports, factionId, profileId = null) {
  if (!Array.isArray(ports) || ports.length === 0) {
    throw new Error(`Capital naval reserve has no controlled port for ${factionId}`);
  }
  const selected = capitalNavalReservePortOrNull(ports, factionId, profileId);
  if (!selected) {
    throw new Error(`Capital naval reserve has no naval mobilization port for ${factionId}`);
  }
  return selected;
}

function capitalNavalReservePortOrNull(ports, factionId, profileId = null) {
  if (!Array.isArray(ports)) throw new Error(`Invalid capital naval reserve ports for ${factionId}`);
  const requiredProfile = profileId === null ? null : fleetProfileForId(profileId);
  const eligiblePorts = ports.filter((port) => (
    requiredProfile ? requiredProfile.portPredicate(port) : capitalNavalReserveProfileOrNull(port)
  ));
  if (eligiblePorts.length === 0) return null;
  const capitals = eligiblePorts.filter((port) => port.capitalOfFactionId === factionId);
  const candidates = capitals.length > 0 ? capitals : eligiblePorts;
  return [...candidates].sort((a, b) => (
    Number(b.isFactionCapital === true) - Number(a.isFactionCapital === true) ||
    Number(b.population || 0) - Number(a.population || 0) ||
    a.tileId - b.tileId
  ))[0];
}

function capitalNavalReserveRebasePortOrNull(ports, factionId, profileId) {
  if (!Array.isArray(ports)) throw new Error(`Invalid capital naval reserve ports for ${factionId}`);
  if (profileId !== null) fleetProfileForId(profileId);
  const navigablePorts = ports.filter((port) => (
    port.factionId === factionId && npcRoutePortAcceptsTraffic(port)
  ));
  const compatible = capitalNavalReservePortOrNull(navigablePorts, factionId, profileId);
  if (compatible) return compatible;
  if (navigablePorts.length === 0) return null;
  const capitals = navigablePorts.filter((port) => (
    port.capitalOfFactionId === factionId || port.isFactionCapital === true
  ));
  const candidates = capitals.length > 0 ? capitals : navigablePorts;
  return [...candidates].sort((a, b) => (
    Number(b.capitalOfFactionId === factionId) - Number(a.capitalOfFactionId === factionId) ||
    Number(b.isFactionCapital === true) - Number(a.isFactionCapital === true) ||
    Number(b.population || 0) - Number(a.population || 0) ||
    a.tileId - b.tileId
  ))[0];
}

function reconcileCapitalNavalReservePortsAfterOwnershipChange(system, collapsedFactionIds) {
  const removedSlotIds = new Set();
  const retiredShipIds = new Set();
  for (const slot of system.capitalNavalReserveSlots) {
    const storedOrigin = system.ports.find((port) => port.cityId === slot.originCityId);
    const originRemainsUsable = !collapsedFactionIds.has(slot.factionId) &&
      storedOrigin?.factionId === slot.factionId && npcRoutePortAcceptsTraffic(storedOrigin);
    if (originRemainsUsable) continue;

    const controlledPorts = system.ports.filter((port) => (
      port.factionId === slot.factionId && npcRoutePortAcceptsTraffic(port)
    ));
    const replacement = collapsedFactionIds.has(slot.factionId)
      ? null
      : capitalNavalReserveRebasePortOrNull(controlledPorts, slot.factionId, slot.profileId);
    if (!replacement) {
      removedSlotIds.add(slot.id);
      continue;
    }

    slot.originCityId = requireCityId(replacement, "Capital reserve replacement origin");
    if (slot.shipSlug !== null) {
      slot.shipSlug = null;
      slot.stockedMinute = null;
      slot.sourceSaleId = null;
    }
    if (slot.activeShipId === null) continue;
    const ship = system.shipById.get(slot.activeShipId);
    if (!ship || ship.capitalNavalReserveSlotId !== slot.id) {
      throw new Error(`Capital naval reserve lost its active ship while rebasing: ${slot.id}`);
    }
    if (ship.capitalNavalReserveDocked) {
      slot.activeShipId = null;
      ship.capitalNavalReserveSlotId = null;
      ship.capitalNavalReserveDestinationCityId = null;
      ship.capitalNavalReserveDocked = false;
      retiredShipIds.add(ship.id);
      continue;
    }
    if (ship.portResponse) ship.portResponse.returnCityId = replacement.cityId;
    if (ship.capitalNavalReserveDestinationCityId !== null) {
      ship.capitalNavalReserveDestinationCityId = replacement.cityId;
      ship.finalDestination = replacement;
    }
  }

  for (const ship of system.ships) {
    if (!removedSlotIds.has(ship.capitalNavalReserveSlotId)) continue;
    ship.capitalNavalReserveSlotId = null;
    ship.capitalNavalReserveDestinationCityId = null;
    ship.capitalNavalReserveDocked = false;
    ship.replaceOnSink = false;
    if (!ship.portResponse || ship.portResponse.phase === "returning") {
      retiredShipIds.add(ship.id);
    }
  }
  if (removedSlotIds.size > 0) {
    system.capitalNavalReserveSlots = system.capitalNavalReserveSlots.filter((slot) => (
      !removedSlotIds.has(slot.id)
    ));
  }
  retireNpcShipsWithoutReplacement(system, retiredShipIds);
}

function capitalNavalReserveProfile(origin) {
  const profileSpec = capitalNavalReserveProfileOrNull(origin);
  if (!profileSpec) throw new Error(`No capital naval reserve profile for ${portName(origin)}`);
  return profileSpec;
}

function capitalNavalReserveProfileOrNull(origin) {
  return FLEET_PROFILES.find((profile) => (
    profile.mode === "regional" && profile.portPredicate(origin)
  )) || FLEET_PROFILES.find((profile) => profile.portPredicate(origin));
}

function capitalNavalReserveSlugs(profileSpec, factionId) {
  const regionalSlugs = [
    ...profileSlugsForRole(profileSpec, NPC_ROLE_WARSHIP, factionId),
    ...profileSpec.merchantSlugs
  ];
  const landingSlugs = [...new Set(regionalSlugs)].filter((slug) => {
    const stats = shipStatsForSlug(slug);
    return stats.cannons > 0 && stats.crewCapacity >= 36 && npcShipSupportsFleetMode(slug, profileSpec.mode);
  });
  if (landingSlugs.length > 0) return landingSlugs;
  const armedSlugs = [...new Set(regionalSlugs)].filter((slug) => {
    const stats = shipStatsForSlug(slug);
    return stats.cannons > 0 && npcShipSupportsFleetMode(slug, profileSpec.mode);
  });
  if (armedSlugs.length > 0) return armedSlugs;
  const localSlugs = [...new Set(profileSlugsForRole(profileSpec, NPC_ROLE_WARSHIP, factionId))]
    .filter((slug) => npcShipSupportsFleetMode(slug, profileSpec.mode));
  if (localSlugs.length === 0) {
    throw new Error(`Capital naval reserve ${profileSpec.id} has no usable hulls for ${factionId}`);
  }
  return localSlugs;
}

function activateCapitalNavalReserveSlot(system, slot, target, {
  reason,
  clockMinutes,
  threatUntilMinute
}) {
  validateCapitalNavalReserveSlot(slot);
  if (slot.shipSlug === null || slot.activeShipId !== null) {
    throw new Error(`Capital naval reserve slot is not stocked: ${slot.id}`);
  }
  const origin = activeCapitalNavalReservePort(system, slot);
  const ship = createCapitalNavalReserveShip(system, slot, slot.shipSlug, origin, clockMinutes);
  slot.shipSlug = null;
  slot.stockedMinute = null;
  slot.sourceSaleId = null;
  slot.activeShipId = ship.id;
  assignNpcPortResponse(ship, {
    factionId: slot.factionId,
    targetPort: target,
    targetCityId: requireCityId(target, "Capital reserve response target"),
    returnCityId: slot.originCityId,
    reason,
    clockMinutes,
    threatUntilMinute
  });
  launchCapitalNavalReserveShip(system, ship, target, clockMinutes);
  system.ships.push(ship);
  system.shipById.set(ship.id, ship);
  validateCapitalNavalReserveAssignments(system);
  return ship;
}

function activeCapitalNavalReservePort(system, slot) {
  const storedCapital = system.ports.find((port) => port.cityId === slot.originCityId);
  if (storedCapital?.factionId === slot.factionId && npcRoutePortAcceptsTraffic(storedCapital)) {
    return storedCapital;
  }
  const controlledPorts = system.ports.filter((port) => (
    port.factionId === slot.factionId && npcRoutePortAcceptsTraffic(port)
  ));
  const replacement = capitalNavalReserveRebasePortOrNull(
    controlledPorts,
    slot.factionId,
    slot.profileId
  );
  if (!replacement) {
    throw new Error(`Capital naval reserve has no navigable port for ${slot.factionId}`);
  }
  slot.originCityId = requireCityId(replacement, "Capital reserve replacement origin");
  return replacement;
}

function createCapitalNavalReserveShip(system, slot, shipSlug, origin, clockMinutes) {
  const profileSpec = fleetProfileForId(slot.profileId);
  if (!slot.allowedSlugs.includes(shipSlug)) {
    throw new Error(`Capital naval reserve ${slot.id} cannot use ${shipSlug}`);
  }
  slot.activationCount += 1;
  const id = `${slot.id}:sortie:${slot.activationCount}`;
  if (system.shipById.has(id) || system.replacementQueue.some((entry) => entry.shipId === id)) {
    throw new Error(`Capital naval reserve sortie id is already used: ${id}`);
  }
  const seed = hashString32(npcSeedKey(system, `${id}|npc`));
  const ship = createNpcShipRecord({
    id,
    factionId: slot.factionId,
    role: NPC_ROLE_WARSHIP,
    profileSpec,
    slugs: slot.allowedSlugs,
    slug: shipSlug,
    seed,
    origin
  });
  ship.capitalNavalReserveSlotId = slot.id;
  ship.replaceOnSink = false;
  ship.specie = npcStartingSpecieForRole(NPC_ROLE_WARSHIP, shipStatsForSlug(shipSlug));
  ship.clockOffsetMinutes = 0;
  if (!Number.isFinite(clockMinutes)) throw new Error(`Invalid reserve launch minute: ${clockMinutes}`);
  return ship;
}

function launchCapitalNavalReserveShip(system, ship, desiredDestination, clockMinutes) {
  const origin = ship.currentPort;
  ship.capitalNavalReserveDocked = false;
  let destination = desiredDestination;
  if (samePort(origin, desiredDestination)) {
    destination = capitalNavalReservePatrolPort(system, ship, origin);
    ship.finalDestination = desiredDestination;
  } else {
    ship.finalDestination = desiredDestination;
  }
  const route = routeBetweenPorts(system, origin, destination, ship.slug, clockMinutes);
  ship.plan = buildNpcPlan(origin, destination, route, clockMinutes);
  ship.visualNavigation = {
    vector: latLonToVector(origin.lat, origin.lon),
    heading: headingVectorAt(origin, origin, destination)
  };
}

function assignNpcPortResponse(ship, {
  factionId,
  targetPort,
  targetCityId,
  returnCityId,
  reason,
  clockMinutes,
  threatUntilMinute
}) {
  ship.portResponse = {
    factionId,
    targetCityId,
    returnCityId,
    reason,
    phase: "responding",
    orderedMinute: clockMinutes,
    threatUntilMinute: reason === NPC_PORT_RESPONSE_BURNING ? threatUntilMinute : null
  };
  ship.capitalNavalReserveDestinationCityId = null;
  if (!targetPort || targetPort.cityId !== targetCityId) {
    throw new Error(`Port response ${ship.id} has a mismatched target port`);
  }
  ship.finalDestination = targetPort;
  reconcileNpcPortResponseFields(ship, ship.id);
}

function synchronizeExpansionistWarshipFleets(system, startMinute, collapsedFactionIds) {
  const factionIds = [...new Set(system.ports.map((port) => port.factionId))];
  const reservedIds = new Set([
    ...system.ships.map((ship) => ship.id),
    ...system.replacementQueue.map((replacement) => replacement.shipId)
  ]);
  let added = 0;
  for (const factionId of factionIds) {
    const target = factionExpansionWarshipTarget(factionId);
    if (target === 0 || collapsedFactionIds.has(factionId)) continue;
    const profileSpec = fleetProfileForId("indian-ocean");
    const pool = rankedProfilePorts(
      system.ports.filter((port) => port.factionId === factionId),
      profileSpec
    );
    if (pool.length === 0) continue;
    for (let index = 0; index < target; index++) {
      const id = `${factionId}-expansion-warship-${index}`;
      if (reservedIds.has(id)) continue;
      const seed = hashString32(npcSeedKey(system, `${id}|npc`));
      const origin = pool[index % pool.length];
      const slugs = profileSlugsForRole(profileSpec, NPC_ROLE_WARSHIP, factionId);
      const slug = npcShipSlugForRole(profileSpec, NPC_ROLE_WARSHIP, seed, factionId);
      const ship = createNpcShipRecord({
        id,
        factionId,
        role: NPC_ROLE_WARSHIP,
        profileSpec,
        slugs,
        slug,
        seed,
        origin
      });
      seedNpcShipOnRoute(system, ship, startMinute);
      system.ships.push(ship);
      system.shipById.set(ship.id, ship);
      reservedIds.add(id);
      added++;
    }
  }
  return added;
}

function synchronizeNpcPortFaction(port, portFactionByCityId) {
  if (!port) return;
  if (npcRouteSpatialObservation(port)) return;
  const factionId = portFactionByCityId.get(requireCityId(port, "NPC route port"));
  if (factionId) port.factionId = factionId;
}

function npcRouteSpatialObservation(destination) {
  return destination?.isFishingGround === true || destination?.isWhalingGround === true ||
    isSavedEncounterPoint(destination);
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
      hashString32(`${requireCityId(a, "Pirate hideout candidate")}|pirate-hideout`) -
      hashString32(`${requireCityId(b, "Pirate hideout candidate")}|pirate-hideout`)
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

function buildFishingGrounds(ports, fishState, startMinute, fishingGroundIsNavigable) {
  const byKey = new Map();
  for (const port of ports) {
    for (const distanceKmValue of FISHING_GROUND_SAMPLE_DISTANCES_KM) {
      for (const bearingDeg of FISHING_GROUND_SAMPLE_BEARINGS_DEG) {
        const point = destinationPoint(port, bearingDeg * DEG_TO_RAD, distanceKmValue);
        if (Math.abs(point.lat) > 70) continue;
        if (!fishingGroundIsNavigable(point)) continue;
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
  assertSaveableNpcRouteSystem(system);
  refreshPirateHideoutWarshipDanger(system, clockMinutes);
  let changed = reconcileNpcFleetCargo(system, "route update");
  if (reconcileNpcPortResponseThreats(system, clockMinutes)) changed = true;
  if (rerouteHostileNpcTradePlans(system, clockMinutes)) changed = true;
  if (spawnDueNpcReplacements(system, clockMinutes)) changed = true;
  if (restockCapitalNavalReserves(system, clockMinutes)) changed = true;
  if (purchaseNpcShipyardFleetGrowth(system, clockMinutes)) changed = true;
  for (const ship of system.ships) {
    if (settleNpcShipToClock(system, ship, npcEffectiveClock(ship, clockMinutes), 12)) changed = true;
  }
  if (demobilizeReturnedCapitalNavalReserves(system, clockMinutes)) changed = true;
  return changed;
}

export function npcSeaRouteEventSchedule(system) {
  assertSaveableNpcRouteSystem(system);
  const events = [];
  for (const ship of system.ships) {
    if (ship.hiddenAtHideout) {
      if (ship.plan !== null) {
        throw new Error(`Hidden NPC pirate unexpectedly has a route plan: ${ship.id}`);
      }
      const dangerUntil = system.pirateHideoutDangerUntil.get(ship.currentPort.tileId) || 0;
      const minute = Math.max(
        0,
        ship.hiddenUntilMinute - ship.clockOffsetMinutes,
        dangerUntil
      );
      if (!Number.isFinite(minute) || minute < 0) {
        throw new Error(`NPC pirate has an invalid hideout release minute: ${ship.id}`);
      }
      events.push(Object.freeze({ id: ship.id, minute }));
      continue;
    }
    if (!ship.plan || !Number.isFinite(ship.plan.endMinute)) {
      throw new Error(`NPC ship has no schedulable route plan: ${ship.id}`);
    }
    events.push(Object.freeze({
      id: ship.id,
      minute: Math.max(0, ship.plan.endMinute - ship.clockOffsetMinutes)
    }));
  }
  for (const replacement of system.replacementQueue) {
    events.push(Object.freeze({
      id: `replacement:${replacement.shipId}`,
      minute: replacement.readyMinute
    }));
  }
  return events;
}

export function updateNpcSeaRouteEvents(
  system,
  clockMinutes,
  shipIds,
  { maintenance = false } = {}
) {
  assertSaveableNpcRouteSystem(system);
  if (!Number.isFinite(clockMinutes)) {
    throw new Error(`Invalid NPC sea-route event minute: ${clockMinutes}`);
  }
  if (!Array.isArray(shipIds)) throw new Error("NPC sea-route events require ship ids");
  if (typeof maintenance !== "boolean") {
    throw new Error(`Invalid NPC sea-route maintenance flag: ${maintenance}`);
  }
  let changed = false;
  if (maintenance) {
    refreshPirateHideoutWarshipDanger(system, clockMinutes);
    if (reconcileNpcFleetCargo(system, "route update")) changed = true;
    if (reconcileNpcPortResponseThreats(system, clockMinutes)) changed = true;
    if (rerouteHostileNpcTradePlans(system, clockMinutes)) changed = true;
    if (spawnDueNpcReplacements(system, clockMinutes)) changed = true;
    if (restockCapitalNavalReserves(system, clockMinutes)) changed = true;
    if (purchaseNpcShipyardFleetGrowth(system, clockMinutes)) changed = true;
  }
  const seen = new Set();
  for (const shipId of shipIds) {
    if (typeof shipId !== "string" || shipId.length === 0 || seen.has(shipId)) {
      throw new Error(`Invalid scheduled NPC ship id: ${shipId}`);
    }
    seen.add(shipId);
    if (shipId.startsWith("replacement:")) continue;
    const ship = system.shipById.get(shipId);
    if (!ship) continue;
    if (settleNpcShipToClock(system, ship, npcEffectiveClock(ship, clockMinutes), 12)) {
      changed = true;
    }
  }
  if (demobilizeReturnedCapitalNavalReserves(system, clockMinutes)) changed = true;
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

function reconcileNpcPortResponseThreats(system, clockMinutes) {
  if (!Number.isFinite(clockMinutes) || clockMinutes < 0) {
    throw new Error(`Invalid port-response reconciliation minute: ${clockMinutes}`);
  }
  let changed = false;
  for (const ship of system.ships) {
    const response = ship.portResponse;
    if (!response || response.phase !== "responding") continue;
    const target = requiredNpcRoutePort(system, response.targetCityId, "port-response target");
    const resolved = response.reason === NPC_PORT_RESPONSE_BURNING
      ? clockMinutes >= response.threatUntilMinute
      : target.factionId === ship.factionId;
    if (!resolved) continue;
    if (orderNpcPortResponseReturn(system, ship)) changed = true;
  }
  return changed;
}

function orderNpcPortResponseReturn(system, ship) {
  const response = ship.portResponse;
  if (!response || response.phase !== "responding") return false;
  let returnPort;
  if (ship.capitalNavalReserveSlotId) {
    const slot = requiredCapitalNavalReserveSlot(system, ship.capitalNavalReserveSlotId);
    returnPort = activeCapitalNavalReservePort(system, slot);
    ship.capitalNavalReserveDestinationCityId = requireCityId(
      returnPort,
      "Capital reserve return destination"
    );
  } else {
    returnPort = npcPortResponseReturnPortOrNull(system, ship);
    if (!returnPort) {
      retireNpcShipsWithoutReplacement(system, new Set([ship.id]));
      return true;
    }
  }
  response.phase = "returning";
  response.returnCityId = requireCityId(returnPort, "Port-response return destination");
  ship.finalDestination = returnPort;
  return true;
}

function npcPortResponseReturnPortOrNull(system, ship) {
  const response = ship.portResponse;
  if (!response) throw new Error(`NPC response ship has no response order: ${ship.id}`);
  return npcControlledNavalBaseForShipOrNull(system, ship, response.returnCityId);
}

function npcControlledNavalBaseForShipOrNull(system, ship, preferredCityId = null) {
  if (preferredCityId !== null) {
    requireEntityId(preferredCityId, `Preferred NPC naval base for ${ship.id}`);
  }
  const controlledPorts = system.ports.filter((port) => (
    port.factionId === ship.factionId && npcRoutePortAcceptsTraffic(port)
  ));
  const orderedReturnPort = controlledPorts.find((port) => port.cityId === preferredCityId);
  return orderedReturnPort || capitalNavalReserveRebasePortOrNull(
    controlledPorts,
    ship.factionId,
    ship.profileId
  );
}

function retireNpcShipsWithoutReplacement(system, shipIds) {
  if (!(shipIds instanceof Set)) throw new Error("Retired NPC ships require an id set");
  if (shipIds.size === 0) return false;
  for (const shipId of shipIds) {
    const ship = system.shipById.get(shipId);
    if (!ship) throw new Error(`Retired NPC ship is missing: ${shipId}`);
    if (ship.capitalNavalReserveSlotId !== null) {
      throw new Error(`Retired NPC ship still occupies a reserve slot: ${shipId}`);
    }
    system.shipById.delete(shipId);
  }
  system.ships = system.ships.filter((ship) => !shipIds.has(ship.id));
  return true;
}

function demobilizeReturnedCapitalNavalReserves(system, clockMinutes) {
  const returned = system.ships.filter((ship) => ship.capitalNavalReserveDocked === true);
  if (returned.length === 0) return false;
  const returnedIds = new Set();
  for (const ship of returned) {
    const slot = requiredCapitalNavalReserveSlot(system, ship.capitalNavalReserveSlotId);
    if (slot.activeShipId !== ship.id || slot.shipSlug !== null) {
      throw new Error(`Capital naval reserve return does not match slot ${slot.id}`);
    }
    if (ship.currentPort.cityId !== slot.originCityId) {
      throw new Error(`Capital naval reserve ${ship.id} returned to the wrong port`);
    }
    slot.activeShipId = null;
    slot.shipSlug = ship.slug;
    slot.stockedMinute = clockMinutes;
    returnedIds.add(ship.id);
    system.shipById.delete(ship.id);
  }
  system.ships = system.ships.filter((ship) => !returnedIds.has(ship.id));
  validateCapitalNavalReserveAssignments(system);
  return true;
}

export function npcShipSnapshots(system, clockMinutes) {
  return system.ships
    .map((ship) => npcShipSnapshot(ship, npcEffectiveClock(ship, clockMinutes)))
    .filter(Boolean);
}

export function npcShipSnapshotForId(system, shipId, clockMinutes) {
  assertSaveableNpcRouteSystem(system);
  if (typeof shipId !== "string" || shipId === "") {
    throw new Error("NPC ship snapshot requires an id");
  }
  if (!Number.isFinite(clockMinutes) || clockMinutes < 0) {
    throw new Error(`Invalid NPC snapshot clock: ${clockMinutes}`);
  }
  const ship = system.shipById.get(shipId);
  return ship ? npcShipSnapshot(ship, npcEffectiveClock(ship, clockMinutes)) : null;
}

export function npcShipIdsAddedSinceSimulationSnapshot(system, snapshot) {
  assertSaveableNpcRouteSystem(system);
  if (!snapshot || snapshot.version !== NPC_SEA_ROUTE_SNAPSHOT_VERSION ||
      !Array.isArray(snapshot.ships)) {
    throw new Error("NPC simulation baseline requires a strategic route snapshot");
  }
  const baselineIds = new Set(snapshot.ships.map((ship) => ship.id));
  return Object.freeze(system.ships
    .filter((ship) => !baselineIds.has(ship.id))
    .map((ship) => ship.id));
}

export function createNpcShipSnapshotCache({ bucketCount = 6 } = {}) {
  if (!Number.isInteger(bucketCount) || bucketCount <= 0) {
    throw new Error(`Invalid NPC snapshot bucket count: ${bucketCount}`);
  }
  const cache = new Map();
  let bucket = 0;

  function refresh(system, clockMinutes, highPriorityShipIds = new Set()) {
    if (!system || !Array.isArray(system.ships) || !(system.shipById instanceof Map)) {
      throw new Error("NPC snapshot cache requires a route system");
    }
    if (!Number.isFinite(clockMinutes) || clockMinutes < 0) {
      throw new Error(`Invalid NPC snapshot clock: ${clockMinutes}`);
    }
    if (!(highPriorityShipIds instanceof Set)) {
      throw new Error("High-priority NPC snapshot ids must be a set");
    }
    for (const ship of system.ships) {
      if (cache.has(ship.id) &&
          !highPriorityShipIds.has(ship.id) &&
          snapshotBucketForId(ship.id, bucketCount) !== bucket) {
        continue;
      }
      cache.set(
        ship.id,
        npcShipSnapshot(ship, npcEffectiveClock(ship, clockMinutes))
      );
    }
    for (const shipId of cache.keys()) {
      if (!system.shipById.has(shipId)) cache.delete(shipId);
    }
    bucket = (bucket + 1) % bucketCount;
    return [...cache.values()].filter(Boolean);
  }

  function reset() {
    cache.clear();
    bucket = 0;
  }

  return Object.freeze({ refresh, reset });
}

function snapshotBucketForId(id, bucketCount) {
  let hash = 2166136261;
  for (let index = 0; index < id.length; index++) {
    hash ^= id.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % bucketCount;
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
  if (shipHasCombatGrace(ship)) {
    return {
      hitPoints: ship.hitPoints,
      maxHitPoints: ship.maxHitPoints,
      damage: 0,
      resisted: false,
      ignoredAfterSurrender: true,
      sunk: false,
      shouldSurrender: false
    };
  }
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
    ignoredAfterSurrender: false,
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
    if (ship.capitalNavalReserveSlotId !== null && ship.capitalNavalReserveSlotId !== undefined) {
      const slot = requiredCapitalNavalReserveSlot(system, ship.capitalNavalReserveSlotId);
      if (slot.activeShipId !== ship.id) {
        throw new Error(`Capital naval reserve slot lost the wrong ship: ${ship.id}`);
      }
      clearCapitalNavalReserveSlot(slot);
    }
    system.ships = system.ships.filter((entry) => entry.id !== ship.id);
    system.shipById.delete(ship.id);
    return { ship, replacement: null, delayDays: null, port: null };
  }
  const replacementPort = chooseNpcReplacementPort(system, ship);
  const yard = system.economy.shipyards?.yards?.get(
    requireCityId(replacementPort, "NPC replacement shipyard")
  ) || null;
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
    originCityId: requireCityId(replacementPort, "NPC replacement origin"),
    readyMinute: clockMinutes + delayDays * WEATHER_MINUTES_PER_DAY,
    nationalCircuitId: ship.nationalCircuitId,
    nationalCircuitFactionId: ship.nationalCircuitFactionId,
    nationalCircuitCityIds: ship.nationalCircuitCityIds.slice()
  };
  system.ships = system.ships.filter((entry) => entry.id !== ship.id);
  system.shipById.delete(ship.id);
  system.replacementQueue.push(replacement);
  system.replacementQueue.sort((a, b) => a.readyMinute - b.readyMinute || a.shipId.localeCompare(b.shipId));
  return { ship, replacement, delayDays, port: replacementPort };
}

export function surrenderNpcShip(system, loserId, winnerId = null, {
  preserveHull = false,
  retainLoot = false
} = {}) {
  const loser = requiredNpcShip(system, loserId);
  const winner = winnerId ? requiredNpcShip(system, winnerId) : null;
  if (winner?.id === loser.id) throw new Error("An NPC ship cannot surrender to itself");
  if (typeof preserveHull !== "boolean") throw new Error(`Invalid preserve-hull option: ${preserveHull}`);
  if (typeof retainLoot !== "boolean") throw new Error(`Invalid retain-loot option: ${retainLoot}`);
  if (winner && retainLoot) throw new Error("An NPC prize recipient cannot leave loot aboard");
  if (shipHasCombatGrace(loser)) throw new Error(`NPC ship already surrendered: ${loserId}`);

  const loot = {
    specie: Math.max(0, Math.floor(loser.specie)),
    cargo: { ...loser.cargo }
  };
  if (!retainLoot) {
    if (winner) receiveNpcLoot(winner, loot);
    loser.specie = 0;
    loser.cargo = {};
    loser.cargoCost = {};
    loser.cargoOrigins = {};
  }
  loser.graceUntilPortVisit = Number.MAX_SAFE_INTEGER;
  if (loser.role === NPC_ROLE_PIRATE) loser.seekingHideout = true;
  if (!preserveHull) loser.hitPoints = Math.max(1, Math.round(loser.maxHitPoints * 0.18));
  return loot;
}

export function claimSurrenderedNpcShipLoot(system, shipId) {
  const ship = requiredNpcShip(system, shipId);
  if (!shipHasCombatGrace(ship)) throw new Error(`NPC ship has not surrendered: ${shipId}`);
  const loot = {
    specie: Math.max(0, Math.floor(ship.specie)),
    cargo: { ...ship.cargo }
  };
  ship.specie = 0;
  ship.cargo = {};
  ship.cargoCost = {};
  ship.cargoOrigins = {};
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
      ships.push(createNpcProfileShip(system, profileSpec, pool, i, startMinute));
    }
  }
  return ships.slice(0, NPC_FLEET_TARGET);
}

function synchronizePacificFleet(system, startMinute) {
  const profileSpec = fleetProfileForId("pacific-islands");
  const pool = rankedProfilePorts(system.ports, profileSpec);
  if (pool.length < 2) return 0;
  const count = Math.min(profileSpec.count, pool.length * 2);
  const reservedIds = new Set([
    ...system.ships.map((ship) => ship.id),
    ...system.replacementQueue.map((replacement) => replacement.shipId)
  ]);
  let added = 0;
  for (let index = 0; index < count; index++) {
    const id = `${profileSpec.id}-${index}`;
    if (reservedIds.has(id)) continue;
    system.ships.push(createNpcProfileShip(system, profileSpec, pool, index, startMinute));
    reservedIds.add(id);
    added++;
  }
  if (added > 0) console.info(`Added ${added} Polynesian canoes to the regional Pacific fleet`);
  return added;
}

function createNpcProfileShip(system, profileSpec, pool, index, startMinute) {
  const seed = hashString32(npcSeedKey(system, `${profileSpec.id}|${index}|npc`));
  let origin = profileSpec.coverPorts ? pool[index % pool.length] : pool[seed % pool.length];
  const role = npcRoleForSeed(seed, origin.factionId, profileSpec);
  if (role === NPC_ROLE_PIRATE && npcPortHasMajorProtection(origin)) {
    const discreetOrigins = pool.filter((port) => !npcPortHasMajorProtection(port));
    if (discreetOrigins.length > 0) origin = discreetOrigins[seed % discreetOrigins.length];
  }
  const slugs = profileSlugsForRole(profileSpec, role, origin.factionId);
  const slug = npcShipSlugForRole(profileSpec, role, seed, origin.factionId);
  assertNpcShipSupportsFleetMode(slug, profileSpec, `${profileSpec.id}-${index}`);
  const ship = createNpcShipRecord({
    id: `${profileSpec.id}-${index}`,
    factionId: role === NPC_ROLE_PIRATE ? PIRATE_FACTION_ID : origin.factionId,
    role,
    profileSpec,
    slugs,
    slug,
    seed,
    origin
  });
  seedNpcShipOnRoute(system, ship, startMinute);
  return ship;
}

// Older snapshots could lose a profile ship's canonical home after both ends
// of its live route became coordinate-only fishing or whaling grounds. Rebuild
// the original home from the stable profile ship id and voyage seed—the same
// inputs used at creation—rather than guessing from its current coordinates.
export function legacyNpcProfileCaptainHomeCityId(system, ship) {
  assertSaveableNpcRouteSystem(system);
  if (!ship || typeof ship.id !== "string" || ship.id === "" ||
      typeof ship.profileId !== "string" || ship.profileId === "") {
    throw new Error("Legacy NPC profile captain-home repair requires a ship identity");
  }
  const profileSpec = WHALER_PROFILE_BY_ID.get(ship.profileId) ||
    FLEET_PROFILES.find((profile) => profile.id === ship.profileId) || null;
  if (profileSpec === null) return null;
  const idPrefix = `${profileSpec.id}-`;
  if (!ship.id.startsWith(idPrefix)) return null;
  const indexText = ship.id.slice(idPrefix.length);
  if (!/^\d+$/.test(indexText)) {
    throw new Error(`Legacy NPC profile ship has an invalid stable id: ${ship.id}`);
  }
  const index = Number(indexText);
  const pool = rankedProfilePorts(system.ports, profileSpec);
  const count = profileSpec.minimumPorts === undefined
    ? Math.min(profileSpec.count, pool.length * 2)
    : profileSpec.count;
  if (pool.length === 0 || index >= count) {
    throw new Error(
      `Legacy NPC profile ship ${ship.id} has no current canonical origin in ${profileSpec.id}`
    );
  }
  const seed = hashString32(npcSeedKey(system, `${profileSpec.id}|${index}|npc`));
  let origin = profileSpec.coverPorts ? pool[index % pool.length] : pool[seed % pool.length];
  if (ship.role === NPC_ROLE_PIRATE && npcPortHasMajorProtection(origin)) {
    const discreetOrigins = pool.filter((port) => !npcPortHasMajorProtection(port));
    if (discreetOrigins.length > 0) origin = discreetOrigins[seed % discreetOrigins.length];
  }
  return requireCityId(origin, `Legacy NPC profile ship ${ship.id} captain home`);
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

function synchronizeNationalPortCircuits(system, startMinute) {
  if (!Number.isFinite(startMinute)) {
    throw new Error(`Invalid national port circuit minute: ${startMinute}`);
  }
  const circuitSpecs = buildNationalPortCircuitSpecs(system);
  const specById = new Map(circuitSpecs.map((spec) => [spec.id, spec]));
  const assignedRecordsByCircuitId = new Map();
  const allRecords = [
    ...system.ships.map((ship) => ({ record: ship, active: true })),
    ...system.replacementQueue.map((replacement) => ({ record: replacement, active: false }))
  ];

  for (const { record, active } of allRecords) {
    const recordId = active ? record.id : record.shipId;
    reconcileNpcNationalCircuitFields(record, `${active ? "ship" : "replacement"} ${recordId}`);
    if (record.nationalCircuitId === null) continue;
    const spec = specById.get(record.nationalCircuitId);
    const compatible = spec &&
      record.factionId === spec.factionId &&
      record.role === NPC_ROLE_MERCHANT &&
      record.mode === "interregional" &&
      !record.encounter &&
      (!active || npcShipSupportsFleetMode(record.slug, "interregional"));
    if (!compatible) {
      clearNpcNationalCircuit(record);
      continue;
    }
    assignNpcNationalCircuit(record, spec);
    const assigned = assignedRecordsByCircuitId.get(spec.id) || [];
    assigned.push({ record, active, recordId });
    assignedRecordsByCircuitId.set(spec.id, assigned);
  }

  for (const [circuitId, assignments] of assignedRecordsByCircuitId) {
    assignments.sort((a, b) => Number(b.active) - Number(a.active) || a.recordId.localeCompare(b.recordId));
    for (const duplicate of assignments.slice(1)) clearNpcNationalCircuit(duplicate.record);
    assignedRecordsByCircuitId.set(circuitId, assignments.slice(0, 1));
  }

  const reservedIds = new Set([
    ...system.ships.map((ship) => ship.id),
    ...system.replacementQueue.map((replacement) => replacement.shipId)
  ]);
  let added = 0;
  for (const spec of circuitSpecs) {
    if (assignedRecordsByCircuitId.has(spec.id)) continue;
    const candidate = chooseExistingNationalCircuitShip(system, spec);
    if (candidate) {
      assignNpcNationalCircuit(candidate, spec);
      assignedRecordsByCircuitId.set(spec.id, [{ record: candidate, active: true, recordId: candidate.id }]);
      continue;
    }

    const profileSpec = fleetProfileForId("wide-world");
    const id = spec.id;
    if (reservedIds.has(id)) throw new Error(`National port circuit ship id is already reserved: ${id}`);
    const seed = hashString32(npcSeedKey(system, `${id}|npc`));
    const slugs = profileSlugsForRole(profileSpec, NPC_ROLE_MERCHANT, spec.factionId);
    const slug = npcShipSlugForRole(profileSpec, NPC_ROLE_MERCHANT, seed, spec.factionId);
    assertNpcShipSupportsFleetMode(slug, profileSpec, id);
    const origin = requiredNationalCircuitPort(system, spec.cityIds[0], id);
    const ship = createNpcShipRecord({
      id,
      factionId: spec.factionId,
      role: NPC_ROLE_MERCHANT,
      profileSpec,
      slugs,
      slug,
      seed,
      origin
    });
    assignNpcNationalCircuit(ship, spec);
    seedNpcShipOnRoute(system, ship, startMinute);
    system.ships.push(ship);
    reservedIds.add(id);
    assignedRecordsByCircuitId.set(spec.id, [{ record: ship, active: true, recordId: ship.id }]);
    added++;
  }

  system.shipById = new Map(system.ships.map((ship) => [ship.id, ship]));
  if (system.shipById.size !== system.ships.length) {
    throw new Error("National port circuits created duplicate NPC ship ids");
  }
  if (system.shipyardFleetGrowthLimit > 0) {
    system.shipyardFleetGrowthLimit = Math.max(
      system.shipyardFleetGrowthLimit,
      Math.ceil(system.ships.length * NPC_SHIPYARD_FLEET_GROWTH_RATIO)
    );
  }
  assertNationalPortCircuitCoverage(system, circuitSpecs);
  if (added > 0) console.info(`Added ${added} ocean-going ships to national port circuits`);
  return added;
}

function buildNationalPortCircuitSpecs(system) {
  const portsByFactionId = new Map();
  for (const port of system.ports) {
    if (!npcRoutePortAcceptsTraffic(port) ||
        port.factionId === NEUTRAL_FACTION_ID ||
        port.factionId === PIRATE_FACTION_ID) {
      continue;
    }
    const factionPorts = portsByFactionId.get(port.factionId) || [];
    factionPorts.push(port);
    portsByFactionId.set(port.factionId, factionPorts);
  }

  const specs = [];
  for (const [factionId, factionPorts] of [...portsByFactionId].sort(([a], [b]) => a.localeCompare(b))) {
    const networkGroups = connectedNationalPortGroups(system, factionPorts);
    for (const networkPorts of networkGroups) {
      if (!nationalPortGroupNeedsOceanCircuit(networkPorts)) continue;
      const hub = chooseNationalCircuitHub(networkPorts, factionId);
      const remotePorts = networkPorts
        .filter((port) => port.cityId !== hub.cityId)
        .sort((a, b) => a.cityId.localeCompare(b.cityId));
      const remotePortsPerCircuit = NATIONAL_CIRCUIT_MAX_PORTS - 1;
      const groupKey = requireCityId(hub, "National circuit hub");
      for (let offset = 0; offset < remotePorts.length; offset += remotePortsPerCircuit) {
        const chunk = remotePorts.slice(offset, offset + remotePortsPerCircuit);
        const orderedPorts = nearestNeighborPortOrder(hub, chunk);
        const circuitIndex = Math.floor(offset / remotePortsPerCircuit);
        specs.push(Object.freeze({
          id: `national-circuit:${factionId}:${groupKey}:${circuitIndex}`,
          factionId,
          cityIds: Object.freeze(orderedPorts.map((port) => requireCityId(port, "National circuit port")))
        }));
      }
    }
  }
  return specs;
}

function connectedNationalPortGroups(system, factionPorts) {
  const ungrouped = new Set(factionPorts);
  const groups = [];
  while (ungrouped.size > 0) {
    const first = [...ungrouped].sort((a, b) => a.cityId.localeCompare(b.cityId))[0];
    const group = [];
    const pending = [first];
    ungrouped.delete(first);
    while (pending.length > 0) {
      const current = pending.pop();
      group.push(current);
      for (const candidate of [...ungrouped]) {
        if (!npcPortsShareRouteNetwork(system, current, candidate)) continue;
        ungrouped.delete(candidate);
        pending.push(candidate);
      }
    }
    groups.push(group.sort((a, b) => a.cityId.localeCompare(b.cityId)));
  }
  return groups;
}

function nationalPortGroupNeedsOceanCircuit(ports) {
  if (ports.length < 2) return false;
  if (new Set(ports.map((port) => port.routeRegion)).size > 1) return true;
  for (let left = 0; left < ports.length; left++) {
    for (let right = left + 1; right < ports.length; right++) {
      if (distanceKm(ports[left], ports[right]) >= NATIONAL_CIRCUIT_MIN_SPAN_KM) return true;
    }
  }
  return false;
}

function chooseNationalCircuitHub(ports, factionId) {
  return [...ports].sort((a, b) => (
    Number(b.capitalOfFactionId === factionId) - Number(a.capitalOfFactionId === factionId) ||
    b.population - a.population ||
    a.cityId.localeCompare(b.cityId)
  ))[0];
}

function nearestNeighborPortOrder(hub, remotePorts) {
  const ordered = [hub];
  const remaining = new Set(remotePorts);
  while (remaining.size > 0) {
    const current = ordered[ordered.length - 1];
    const next = [...remaining].sort((a, b) => (
      distanceKm(current, a) - distanceKm(current, b) || a.cityId.localeCompare(b.cityId)
    ))[0];
    ordered.push(next);
    remaining.delete(next);
  }
  return ordered;
}

function chooseExistingNationalCircuitShip(system, spec) {
  const hub = requiredNationalCircuitPort(system, spec.cityIds[0], spec.id);
  return system.ships
    .filter((ship) => (
      ship.factionId === spec.factionId &&
      ship.role === NPC_ROLE_MERCHANT &&
      ship.mode === "interregional" &&
      ship.nationalCircuitId === null &&
      !ship.encounter &&
      ship.replaceOnSink !== false &&
      npcShipSupportsFleetMode(ship.slug, "interregional") &&
      npcPortsShareRouteNetwork(system, ship.currentPort, hub)
    ))
    .sort((a, b) => (
      distanceKm(a.currentPort, hub) - distanceKm(b.currentPort, hub) ||
      a.id.localeCompare(b.id)
    ))[0] || null;
}

function assignNpcNationalCircuit(record, spec) {
  record.nationalCircuitId = spec.id;
  record.nationalCircuitFactionId = spec.factionId;
  record.nationalCircuitCityIds = spec.cityIds.slice();
}

function clearNpcNationalCircuit(record) {
  record.nationalCircuitId = null;
  record.nationalCircuitFactionId = null;
  record.nationalCircuitCityIds = [];
}

function reconcileNpcNationalCircuitFields(record, label) {
  record.nationalCircuitId ??= null;
  record.nationalCircuitFactionId ??= null;
  record.nationalCircuitCityIds ??= [];
  const unassigned = record.nationalCircuitId === null &&
    record.nationalCircuitFactionId === null &&
    Array.isArray(record.nationalCircuitCityIds) &&
    record.nationalCircuitCityIds.length === 0;
  if (unassigned) return;
  if (typeof record.nationalCircuitId !== "string" || record.nationalCircuitId === "" ||
      typeof record.nationalCircuitFactionId !== "string" || record.nationalCircuitFactionId === "" ||
      !Array.isArray(record.nationalCircuitCityIds) || record.nationalCircuitCityIds.length < 2 ||
      record.nationalCircuitCityIds.length > NATIONAL_CIRCUIT_MAX_PORTS ||
      record.nationalCircuitCityIds.some((cityId) => typeof cityId !== "string" || cityId === "") ||
      new Set(record.nationalCircuitCityIds).size !== record.nationalCircuitCityIds.length) {
    throw new Error(`Invalid national port circuit fields on ${label}`);
  }
  assertFactionId(record.nationalCircuitFactionId);
}

function reconcileNpcPortResponseFields(ship, label) {
  ship.capitalNavalReserveSlotId ??= null;
  ship.capitalNavalReserveDestinationCityId ??= null;
  ship.capitalNavalReserveDocked ??= false;
  ship.portResponse ??= null;
  if (ship.capitalNavalReserveSlotId !== null &&
      (typeof ship.capitalNavalReserveSlotId !== "string" || ship.capitalNavalReserveSlotId === "")) {
    throw new Error(`Invalid capital naval reserve slot on ${label}`);
  }
  if (ship.capitalNavalReserveDestinationCityId !== null) {
    requireEntityId(ship.capitalNavalReserveDestinationCityId, `Capital naval reserve destination on ${label}`);
  }
  if (typeof ship.capitalNavalReserveDocked !== "boolean" ||
      (ship.capitalNavalReserveDocked && ship.capitalNavalReserveSlotId === null)) {
    throw new Error(`Invalid capital naval reserve docking state on ${label}`);
  }
  if (ship.portResponse === null) return;
  const response = ship.portResponse;
  if (response.factionId !== ship.factionId ||
      typeof response.targetCityId !== "string" || response.targetCityId === "" ||
      typeof response.returnCityId !== "string" || response.returnCityId === "" ||
      !NPC_PORT_RESPONSE_REASONS.has(response.reason) ||
      !["responding", "returning"].includes(response.phase) ||
      !Number.isFinite(response.orderedMinute) || response.orderedMinute < 0 ||
      (response.reason === NPC_PORT_RESPONSE_BURNING &&
        (!Number.isFinite(response.threatUntilMinute) ||
          response.threatUntilMinute <= response.orderedMinute)) ||
      ([NPC_PORT_RESPONSE_LOST, NPC_PORT_RESPONSE_WAR_LOAN].includes(response.reason) &&
        response.threatUntilMinute !== null)) {
    throw new Error(`Invalid port response on ${label}`);
  }
}

function validateCapitalNavalReserveSlot(slot) {
  if (!slot || typeof slot.id !== "string" || slot.id === "" ||
      typeof slot.originCityId !== "string" || slot.originCityId === "" ||
      typeof slot.profileId !== "string" ||
      slot.profileId === "" || !Array.isArray(slot.allowedSlugs) || slot.allowedSlugs.length === 0 ||
      new Set(slot.allowedSlugs).size !== slot.allowedSlugs.length ||
      !Number.isInteger(slot.activationCount) || slot.activationCount < 0 ||
      (slot.shipSlug !== null && !slot.allowedSlugs.includes(slot.shipSlug)) ||
      (slot.shipSlug === null ? slot.stockedMinute !== null :
        !Number.isFinite(slot.stockedMinute) || slot.stockedMinute < 0) ||
      (slot.sourceSaleId !== null &&
        (typeof slot.sourceSaleId !== "string" || slot.sourceSaleId === "")) ||
      (slot.activeShipId !== null &&
        (typeof slot.activeShipId !== "string" || slot.activeShipId === "")) ||
      (slot.shipSlug !== null && slot.activeShipId !== null)) {
    throw new Error(`Invalid capital naval reserve slot: ${slot?.id}`);
  }
  assertFactionId(slot.factionId);
  fleetProfileForId(slot.profileId);
  for (const slug of slot.allowedSlugs) shipStatsForSlug(slug);
  return slot;
}

function restoreCapitalNavalReserveSlots(system, savedSlots, snapshotVersion) {
  const slots = cloneJsonData(savedSlots);
  if (snapshotVersion < 4) {
    for (const slot of slots) {
      slot.originCityId = cityIdForLegacyPortTile(
        system,
        slot.originPortId,
        `Legacy capital naval reserve origin ${slot.id}`
      );
    }
  }
  for (const slot of slots) delete slot.originPortId;
  return slots.map(validateCapitalNavalReserveSlot);
}

function requiredCapitalNavalReserveSlot(system, slotId) {
  const slot = system.capitalNavalReserveSlots.find((candidate) => candidate.id === slotId);
  if (!slot) throw new Error(`Capital naval reserve slot is missing: ${slotId}`);
  return slot;
}

function validateCapitalNavalReserveAssignments(system) {
  if (!Array.isArray(system.capitalNavalReserveSlots)) {
    throw new Error("NPC routes require capital naval reserve slots");
  }
  const slotIds = new Set();
  const activeShipIds = new Set();
  for (const slot of system.capitalNavalReserveSlots) {
    validateCapitalNavalReserveSlot(slot);
    if (slotIds.has(slot.id)) throw new Error(`Duplicate capital naval reserve slot: ${slot.id}`);
    slotIds.add(slot.id);
    const origin = system.ports.find((port) => port.cityId === slot.originCityId);
    if (!origin) throw new Error(`Capital naval reserve port is missing: ${slot.id}`);
    if (origin.factionId !== slot.factionId || !npcRoutePortAcceptsTraffic(origin)) {
      throw new Error(`Capital naval reserve port is unusable: ${slot.id}`);
    }
    if (slot.activeShipId === null) continue;
    if (activeShipIds.has(slot.activeShipId)) {
      throw new Error(`Duplicate active capital reserve ship: ${slot.activeShipId}`);
    }
    const ship = system.shipById.get(slot.activeShipId);
    if (!ship || ship.capitalNavalReserveSlotId !== slot.id || ship.factionId !== slot.factionId) {
      throw new Error(`Capital naval reserve slot has an invalid active ship: ${slot.id}`);
    }
    activeShipIds.add(slot.activeShipId);
  }
  for (const ship of system.ships) {
    reconcileNpcPortResponseFields(ship, `ship ${ship.id}`);
    if (ship.capitalNavalReserveSlotId === null) continue;
    const slot = requiredCapitalNavalReserveSlot(system, ship.capitalNavalReserveSlotId);
    if (slot.activeShipId !== ship.id) {
      throw new Error(`Capital naval reserve ship has no active slot: ${ship.id}`);
    }
  }
  return system;
}

function requiredNationalCircuitPort(system, cityId, circuitId) {
  return requiredNpcRoutePort(system, cityId, `National port circuit ${circuitId}`);
}

function requiredNpcRoutePort(system, cityId, label) {
  requireEntityId(cityId, label);
  const matches = system.ports.filter((port) => port.cityId === cityId);
  if (matches.length !== 1) {
    throw new Error(`${label} resolves to ${matches.length} ports: ${cityId}`);
  }
  return matches[0];
}

function cityIdForLegacyPortTile(system, tileId, label) {
  if (!Number.isInteger(tileId)) throw new Error(`${label} has no legacy port tile`);
  const matches = system.ports.filter((port) => port.tileId === tileId);
  if (matches.length !== 1) {
    throw new Error(`${label} resolves to ${matches.length} ports at tile ${tileId}`);
  }
  return requireCityId(matches[0], label);
}

function assertNationalPortCircuitCoverage(system, circuitSpecs) {
  const assignments = new Map();
  for (const record of [...system.ships, ...system.replacementQueue]) {
    if (record.nationalCircuitId === null) continue;
    if (assignments.has(record.nationalCircuitId)) {
      throw new Error(`National port circuit has duplicate ships: ${record.nationalCircuitId}`);
    }
    assignments.set(record.nationalCircuitId, record);
  }
  for (const spec of circuitSpecs) {
    const record = assignments.get(spec.id);
    if (!record) throw new Error(`National port circuit has no ocean-going ship: ${spec.id}`);
    if (record.factionId !== spec.factionId ||
        record.nationalCircuitFactionId !== spec.factionId ||
        record.nationalCircuitCityIds.join(",") !== spec.cityIds.join(",")) {
      throw new Error(`National port circuit assignment is stale: ${spec.id}`);
    }
  }
}

function createNpcShipRecord({ id, factionId, role, profileSpec, slugs, slug, seed, origin }) {
  if (!NPC_ROLE_SET.has(role)) throw new Error(`Unknown NPC ship role: ${role}`);
  const stats = shipStatsForSlug(slug);
  return {
    id,
    captainHomeCityId: requireCityId(origin, `NPC profile ship ${id} captain home`),
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
    cargoOrigins: {},
    tradeEmbargoConvictions: 0,
    lastTradeEmbargoEnforcement: null,
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
    nationalCircuitId: null,
    nationalCircuitFactionId: null,
    nationalCircuitCityIds: [],
    capitalNavalReserveSlotId: null,
    capitalNavalReserveDestinationCityId: null,
    capitalNavalReserveDocked: false,
    portResponse: null,
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
    const origin = requiredNpcRoutePort(system, replacement.originCityId, "NPC replacement origin");
    const shipyardSale = claimNpcShipyardSale(system.economy.shipyards, {
      portId: origin.cityId,
      factionId: replacement.factionId,
      allowedSlugs: replacement.slugs,
      mode: replacement.mode
    });
    const shipyardWaitDays = replacement.shipyardWaitDays || 0;
    if (!shipyardSale && shipyardWaitDays < 360) {
      replacement.shipyardWaitDays = shipyardWaitDays + 30;
      replacement.readyMinute += 30 * WEATHER_MINUTES_PER_DAY;
      system.replacementQueue.push(replacement);
      system.replacementQueue.sort((a, b) => a.readyMinute - b.readyMinute || a.shipId.localeCompare(b.shipId));
      changed = true;
      continue;
    }
    const slug = shipyardSale?.shipSlug || weightedCheapShipSlug(replacement.slugs, replacement.seed);
    const profileSpec = fleetProfileForId(replacement.profileId);
    assertNpcShipSupportsFleetMode(slug, profileSpec, replacement.shipId);
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
    reconcileNpcNationalCircuitFields(replacement, `replacement ${replacement.shipId}`);
    ship.nationalCircuitId = replacement.nationalCircuitId;
    ship.nationalCircuitFactionId = replacement.nationalCircuitFactionId;
    ship.nationalCircuitCityIds = replacement.nationalCircuitCityIds.slice();
    assignNpcPlan(system, ship, replacement.readyMinute);
    settleNpcShipToClock(system, ship, clockMinutes, 96);
    system.ships.push(ship);
    system.shipById.set(ship.id, ship);
    changed = true;
  }
  return changed;
}

function restockCapitalNavalReserves(system, clockMinutes) {
  let purchases = 0;
  let changed = false;
  for (const sale of npcShipyardSales(system.economy.shipyards)) {
    if (purchases >= NPC_SHIPYARD_PURCHASES_PER_MAINTENANCE) break;
    const slot = system.capitalNavalReserveSlots.find((candidate) => (
      candidate.factionId === sale.factionId && candidate.shipSlug === null &&
      candidate.activeShipId === null && candidate.allowedSlugs.includes(sale.shipSlug)
    ));
    if (!slot) continue;
    const salePort = system.ports.find((port) => port.cityId === sale.portId);
    if (!salePort || salePort.factionId !== slot.factionId) continue;
    const capital = activeCapitalNavalReservePort(system, slot);
    claimNpcShipyardSaleById(system.economy.shipyards, sale.id);
    if (salePort.cityId === capital.cityId) {
      slot.shipSlug = sale.shipSlug;
      slot.stockedMinute = Math.max(clockMinutes, sale.soldMinute);
      slot.sourceSaleId = sale.id;
    } else {
      const ship = createCapitalNavalReserveShip(
        system,
        slot,
        sale.shipSlug,
        salePort,
        Math.max(clockMinutes, sale.soldMinute)
      );
      slot.activeShipId = ship.id;
      ship.capitalNavalReserveDestinationCityId = requireCityId(
        capital,
        "Capital reserve stocking destination"
      );
      launchCapitalNavalReserveShip(
        system,
        ship,
        capital,
        Math.max(clockMinutes, sale.soldMinute)
      );
      system.ships.push(ship);
      system.shipById.set(ship.id, ship);
      slot.sourceSaleId = sale.id;
    }
    purchases++;
    changed = true;
  }
  if (changed) validateCapitalNavalReserveAssignments(system);
  return changed;
}

function purchaseNpcShipyardFleetGrowth(system, clockMinutes) {
  const activeAndQueued = system.ships.length + system.replacementQueue.length;
  const fleetCanGrow = activeAndQueued < system.shipyardFleetGrowthLimit;
  let changed = false;
  let purchases = 0;
  for (const sale of npcShipyardSales(system.economy.shipyards)) {
    if (purchases >= NPC_SHIPYARD_PURCHASES_PER_MAINTENANCE) break;
    const origin = system.ports.find((port) => port.cityId === sale.portId);
    if (!origin) continue;
    const upgradingShip = npcShipyardUpgradeCandidate(system, origin, sale);
    if (upgradingShip) {
      claimNpcShipyardSaleById(system.economy.shipyards, sale.id);
      const tradedShipSlug = upgradingShip.slug;
      upgradeNpcShipHull(upgradingShip, sale.shipSlug);
      registerShipyardTradeIn(system.economy.shipyards, origin, {
        shipSlug: tradedShipSlug,
        seller: `npc:${upgradingShip.id}`,
        acquiredMinute: Math.max(clockMinutes, sale.soldMinute)
      });
      purchases++;
      changed = true;
      continue;
    }
    if (!fleetCanGrow ||
        system.ships.length + system.replacementQueue.length >= system.shipyardFleetGrowthLimit) {
      continue;
    }
    const purchaser = npcShipyardPurchaserForSale(system, origin, sale);
    if (!purchaser) continue;
    claimNpcShipyardSaleById(system.economy.shipyards, sale.id);
    const seed = hashString32(npcSeedKey(system, `${sale.id}|fleet-growth`));
    const id = `shipyard:${sale.id}`;
    if (system.shipById.has(id) || system.replacementQueue.some((entry) => entry.shipId === id)) {
      throw new Error(`NPC shipyard sale produced duplicate ship id: ${sale.id}`);
    }
    const slugs = profileSlugsForRole(purchaser.profileSpec, purchaser.role, sale.factionId);
    const ship = createNpcShipRecord({
      id,
      factionId: sale.factionId,
      role: purchaser.role,
      profileSpec: purchaser.profileSpec,
      slugs,
      slug: sale.shipSlug,
      seed,
      origin
    });
    seedNpcShipOnRoute(system, ship, Math.max(clockMinutes, sale.soldMinute));
    system.ships.push(ship);
    system.shipById.set(ship.id, ship);
    purchases++;
    changed = true;
  }
  return changed;
}

function npcShipyardUpgradeCandidate(system, origin, sale) {
  const salePrice = shipConstructionPrice(sale.shipSlug);
  const candidates = system.ships.filter((ship) => {
    if (ship.factionId !== sale.factionId || ship.currentPort?.tileId !== origin.tileId ||
        ship.visualNavigation || ship.plan || ship.encounter) return false;
    const profileSpec = fleetProfileForId(ship.profileId);
    return profileSlugsForRole(profileSpec, ship.role, ship.factionId).includes(sale.shipSlug) &&
      npcShipSupportsFleetMode(sale.shipSlug, profileSpec.mode) &&
      salePrice > shipConstructionPrice(ship.slug);
  });
  return candidates.sort((a, b) => (
    shipConstructionPrice(a.slug) - shipConstructionPrice(b.slug) || a.id.localeCompare(b.id)
  ))[0] || null;
}

function upgradeNpcShipHull(ship, shipSlug) {
  const stats = shipStatsForSlug(shipSlug);
  const hullRatio = clamp(ship.hitPoints / ship.maxHitPoints, 0, 1);
  ship.slug = shipSlug;
  ship.maxHitPoints = stats.hitPoints;
  ship.hitPoints = Math.max(1, Math.round(stats.hitPoints * hullRatio));
  ship.cargoCapacity = stats.cargoCapacity;
  if (ship.role === NPC_ROLE_FISHERMAN) {
    ship.fishingNetId = npcFishingNetForSeed(ship.seed, stats.cargoCapacity).id;
  }
  reconcileNpcCargoCapacity(ship, `shipyard upgrade to ${shipSlug}`);
}

function npcShipyardPurchaserForSale(system, origin, sale) {
  if (sale.factionId === PIRATE_FACTION_ID) return null;
  const candidates = [];
  for (const profileSpec of FLEET_PROFILES) {
    if (!profileSpec.portPredicate(origin) || !npcShipSupportsFleetMode(sale.shipSlug, profileSpec.mode)) continue;
    if (rankedProfilePorts(system.ports, profileSpec).length < 2) continue;
    for (const role of [NPC_ROLE_MERCHANT, NPC_ROLE_WARSHIP, NPC_ROLE_FISHERMAN]) {
      if (!profileSlugsForRole(profileSpec, role, sale.factionId).includes(sale.shipSlug)) continue;
      candidates.push({ profileSpec, role });
    }
  }
  if (candidates.length === 0) return null;
  const seed = hashString32(`${sale.id}|purchaser`);
  return candidates[seed % candidates.length];
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
    npcRoutePortAcceptsTraffic(port) &&
    !port.isFishingGround &&
    port.factionId === ship.factionId &&
    profileSpec.portPredicate(port)
  ));
  if (candidates.length === 0) {
    candidates = system.ports.filter((port) => (
      npcRoutePortAcceptsTraffic(port) && !port.isFishingGround && port.factionId === ship.factionId
    ));
  }
  if (candidates.length === 0) {
    candidates = system.ports.filter((port) => (
      npcRoutePortAcceptsTraffic(port) && !port.isFishingGround && port.factionId === NEUTRAL_FACTION_ID
    ));
  }
  if (candidates.length === 0) throw new Error(`No replacement shipyard for NPC ship ${ship.id}`);
  return [...candidates].sort((a, b) => (
    npcReplacementPortScore(system, b, ship) - npcReplacementPortScore(system, a, ship) ||
    a.tileId - b.tileId
  ))[0];
}

function npcReplacementPortScore(system, port, ship) {
  const yard = system.economy.shipyards?.yards?.get(
    requireCityId(port, "NPC replacement shipyard")
  );
  const shipbuilding = (yard?.wealthScale || 0.5) + (yard?.famous ? 1.2 : 0);
  const distancePenalty = distanceKm(ship.currentPort, port) / 5000;
  const variation = hashUnit(
    `${ship.id}|${requireCityId(port, "NPC replacement port")}|replacement-port`
  ) * 0.2;
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
  if (
    profileSpec.mode === "regional" &&
    isJapanesePolityFaction(factionId) &&
    role === NPC_ROLE_WARSHIP
  ) {
    const roll = hashUnit(`${seed}|japanese-warship-class`);
    if (roll < 0.45) return JAPANESE_KOBAYA_SLUG;
    if (roll < 0.85) return JAPANESE_SEKIBUNE_SLUG;
    return JAPANESE_ATAKEBUNE_SLUG;
  }
  if (profileSpec.mode === "regional" && isJapanesePolityFaction(factionId)) {
    const pool = profileSlugsForRole(profileSpec, role, factionId);
    return weightedCheapShipSlug(pool, hashString32(`${seed}|${role}|japanese-hull`));
  }
  if (factionId === "joseon" && role === NPC_ROLE_WARSHIP && profileSpec.id === "east-asia") {
    const roll = hashUnit(`${seed}|joseon-warship-class`);
    if (roll < 0.5) return JOSEON_HYEOPSEON_SLUG;
    if (roll < 0.85) return JOSEON_PANOKSEON_SLUG;
    return JOSEON_TURTLE_SHIP_SLUG;
  }
  if (
    role === NPC_ROLE_WARSHIP &&
    factionId === "venice" &&
    profileSpec.id === "mediterranean" &&
    hashUnit(`${seed}|venetian-galleass`) < 0.35
  ) {
    return GALLEASS_SLUG;
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
  if (profileSpec.mode === "regional" && isJapanesePolityFaction(factionId)) {
    if (role === NPC_ROLE_WARSHIP) return JAPANESE_ARMED_SHIP_SLUGS;
    if (role === NPC_ROLE_PIRATE) return [JAPANESE_KOBAYA_SLUG, JAPANESE_SEKIBUNE_SLUG];
    if (role === NPC_ROLE_WHALER || role === NPC_ROLE_FISHERMAN || role === NPC_ROLE_MERCHANT) {
      return [JAPANESE_UMI_BUNE_SLUG];
    }
  }
  if (factionId === "joseon" && role === NPC_ROLE_WARSHIP && profileSpec.id === "east-asia") {
    return JOSEON_WARSHIP_SLUGS;
  }
  if (
    factionId === "spain" &&
    [NPC_ROLE_MERCHANT, NPC_ROLE_WARSHIP].includes(role) &&
    ["atlantic-coast", "cape-trade", "wide-world"].includes(profileSpec.id)
  ) {
    const base = role === NPC_ROLE_WARSHIP ? profileSpec.warshipSlugs : profileSpec.merchantSlugs;
    return [...base, SPANISH_NAO_SLUG];
  }
  if (
    factionId === "portugal" &&
    role === NPC_ROLE_MERCHANT &&
    ["atlantic-coast", "cape-trade", "wide-world"].includes(profileSpec.id)
  ) {
    return [...profileSpec.merchantSlugs, PORTUGUESE_CARRACK_SLUG];
  }
  if (
    factionId === "ottoman" && role === NPC_ROLE_MERCHANT && profileSpec.id === "mediterranean"
  ) {
    return [...profileSpec.merchantSlugs, OTTOMAN_COASTAL_TRADER_SLUG];
  }
  if (
    factionId === "venice" && role === NPC_ROLE_WARSHIP && profileSpec.id === "mediterranean"
  ) {
    return [...profileSpec.warshipSlugs, GALLEASS_SLUG];
  }
  if (role === NPC_ROLE_PIRATE) {
    return profileSpec.mode === "interregional"
      ? INTERREGIONAL_PIRATE_SHIP_SLUGS
      : PIRATE_SHIP_SLUGS;
  }
  if (role === NPC_ROLE_WARSHIP) return profileSpec.warshipSlugs;
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

function npcShipSupportsFleetMode(slug, mode) {
  shipStatsForSlug(slug);
  if (mode === "regional") return true;
  if (mode === "interregional") return INTERREGIONAL_NPC_SHIP_SLUGS.has(slug);
  throw new Error(`Unknown NPC fleet operating mode: ${mode}`);
}

function assertNpcShipSupportsFleetMode(slug, profileSpec, shipId) {
  if (npcShipSupportsFleetMode(slug, profileSpec.mode)) return;
  throw new Error(
    `NPC ship ${shipId} cannot use ${slug} on ${profileSpec.mode} profile ${profileSpec.id}`
  );
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
  if (!Number.isInteger(maxPlans) || maxPlans < 1) {
    throw new Error(`Invalid NPC route settlement limit: ${maxPlans}`);
  }
  if (ship.hiddenAtHideout) {
    const dangerUntil = system.pirateHideoutDangerUntil.get(ship.currentPort.tileId) || 0;
    const effectiveDangerUntil = dangerUntil + ship.clockOffsetMinutes;
    if (clockMinutes < ship.hiddenUntilMinute || clockMinutes < effectiveDangerUntil) return false;
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
  const detailedPlanLimit = ship.encounter
    ? Math.max(maxPlans, NPC_ENCOUNTER_SETTLEMENT_PLAN_LIMIT)
    : maxPlans;
  while (ship.plan && clockMinutes >= ship.plan.endMinute && guard < detailedPlanLimit) {
    ship.currentPort = ship.plan.destination;
    ship.portVisits += 1;
    if (system.onForeignPortCall && !ship.currentPort.isFishingGround && !ship.currentPort.isWhalingGround &&
        ship.plan.endMinute >= system.contactStartMinute) {
      system.onForeignPortCall(ship.factionId, ship.currentPort.factionId, ship.plan.endMinute);
    }
    if (ship.capitalNavalReserveDestinationCityId === ship.currentPort.cityId) {
      if (!ship.capitalNavalReserveSlotId) {
        throw new Error(`Reserve-bound ship has no capital naval reserve slot: ${ship.id}`);
      }
      ship.plan = null;
      ship.finalDestination = null;
      ship.visualNavigation = null;
      ship.portResponse = null;
      ship.capitalNavalReserveDestinationCityId = null;
      ship.capitalNavalReserveDocked = true;
      changed = true;
      guard++;
      break;
    }
    if (ship.portResponse?.phase === "returning" &&
        ship.portResponse.returnCityId === ship.currentPort.cityId) {
      ship.portResponse = null;
      ship.finalDestination = null;
    }
    if (
      ship.encounter?.holdAtDestination === true &&
      ship.encounter.destinationCityId === ship.currentPort.cityId
    ) {
      const arrivalMinute = ship.plan.endMinute;
      const lastSail = [...ship.plan.segments].reverse().find((segment) => segment.kind === "sail");
      if (!lastSail) throw new Error(`NPC delegation route has no sailing segment: ${ship.id}`);
      holdNpcRouteEncounterAtDestination(ship, ship.currentPort, arrivalMinute, lastSail);
      changed = true;
      guard++;
      break;
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
  if (ship.plan && clockMinutes >= ship.plan.endMinute) {
    if (ship.encounter) {
      throw new Error(`NPC encounter ship ${ship.id} could not settle route updates`);
    }
    rebaseStaleNpcShipPlan(system, ship, clockMinutes);
    changed = true;
  }
  return changed;
}

function holdNpcRouteEncounterAtDestination(ship, destination, arrivalMinute, lastSail) {
  const holdProgress = ship.encounter?.holdProgress ?? 0.96;
  if (!Number.isFinite(holdProgress) || holdProgress <= 0 || holdProgress > 1) {
    throw new Error(`NPC delegation has an invalid holding progress: ${ship.id}`);
  }
  const holdVectors = vectorsForRouteSegment(lastSail);
  ship.encounter.holdApproachVectors = {
    from: [...holdVectors.from],
    to: [...holdVectors.to]
  };
  const heldPosition = slerpVector(holdVectors.from, holdVectors.to, holdProgress);
  const waitEndMinute = arrivalMinute + 200 * 365 * WEATHER_MINUTES_PER_DAY;
  ship.encounter.arrivedAtMinute ??= arrivalMinute;
  ship.finalDestination = null;
  ship.visualNavigation = {
    vector: heldPosition,
    heading: headingVectorForVectors(heldPosition, holdVectors.from, holdVectors.to)
  };
  ship.plan = {
    origin: destination,
    destination,
    segments: [{
      kind: "wait",
      startMinute: arrivalMinute,
      endMinute: waitEndMinute
    }],
    startMinute: arrivalMinute,
    endMinute: waitEndMinute
  };
}

function repositionHeldNpcRouteEncounter(system, ship, destination, holdProgress, clockMinutes) {
  const previousProgress = ship.encounter.holdProgress ?? 0.96;
  const savedApproach = ship.encounter.holdApproachVectors;
  let holdVectors;
  let effectiveProgress;
  if (savedApproach?.from && savedApproach?.to) {
    holdVectors = savedApproach;
    effectiveProgress = holdProgress;
  } else {
    const currentVector = ship.visualNavigation?.vector;
    if (Array.isArray(currentVector) && currentVector.length === 3) {
      holdVectors = {
        from: currentVector,
        to: latLonToVector(destination.lat, destination.lon)
      };
      const remainingProgress = Math.max(1e-6, 1 - previousProgress);
      effectiveProgress = Math.max(0, Math.min(1,
        (holdProgress - previousProgress) / remainingProgress
      ));
    } else {
      holdVectors = restoredEncounterApproachVectors(
        system,
        ship,
        destination,
        clockMinutes
      );
      effectiveProgress = holdProgress;
    }
    ship.encounter.holdApproachVectors = {
      from: [...holdVectors.from],
      to: [...holdVectors.to]
    };
  }
  const heldPosition = slerpVector(holdVectors.from, holdVectors.to, effectiveProgress);
  ship.encounter.holdProgress = holdProgress;
  ship.visualNavigation = {
    vector: heldPosition,
    heading: headingVectorForVectors(heldPosition, holdVectors.from, holdVectors.to)
  };
}

function restoredEncounterApproachVectors(system, ship, destination, clockMinutes) {
  const originCityId = ship.encounter?.originCityId;
  if (typeof originCityId !== "string" || originCityId === "") {
    throw new Error(`Held NPC encounter is missing its route origin: ${ship.id}`);
  }
  const origin = requiredNpcRoutePort(system, originCityId, "Held NPC encounter route origin");
  const route = routeBetweenPorts(system, origin, destination, ship.slug, clockMinutes);
  const lastSail = [...route.segments]
    .reverse()
    .find((segment) => segment.kind === "sail");
  if (!lastSail) throw new Error(`Held NPC encounter route has no sailing segment: ${ship.id}`);
  return vectorsForRouteSegment(lastSail);
}

function rebaseStaleNpcShipPlan(system, ship, clockMinutes) {
  assignNpcPlan(system, ship, clockMinutes);
  if (!ship.plan || ship.plan.startMinute !== clockMinutes || ship.plan.endMinute <= clockMinutes) {
    throw new Error(`NPC ship ${ship.id} could not rebase its stale route plan`);
  }
  ship.visualNavigation = null;
}

function chooseNpcDestination(system, ship, origin) {
  if (ship.capitalNavalReserveDestinationCityId !== null) {
    const destination = requiredNpcRoutePort(
      system,
      ship.capitalNavalReserveDestinationCityId,
      "Capital naval reserve destination"
    );
    if (samePort(origin, destination)) {
      throw new Error(`Capital naval reserve ship was not demobilized at ${portName(origin)}: ${ship.id}`);
    }
    return destination;
  }
  if (ship.portResponse) return chooseNpcPortResponseDestination(system, ship, origin);
  if (ship.encounter?.routePolicy === NPC_ENCOUNTER_ROUTE_POLICY_CONNECTED_PATROL) {
    return chooseConnectedEncounterPatrolDestination(system, ship, origin);
  }
  if (ship.role === NPC_ROLE_FISHERMAN) return chooseFishermanDestination(system, ship, origin);
  if (ship.role === NPC_ROLE_WHALER) return chooseWhalerDestination(system, ship, origin);
  if (ship.nationalCircuitId !== null) {
    return chooseNationalCircuitDestination(system, ship, origin);
  }
  const profileSpec = fleetProfileForId(ship.profileId);
  const seed = hashString32(`${ship.seed}|${routeLocationIdentity(origin)}|dest`);
  const candidates = system.ports
    .filter(npcRoutePortAcceptsTraffic)
    .filter((port) => !samePort(port, origin))
    .filter((port) => npcPortsShareRouteNetwork(system, origin, port))
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

function chooseConnectedEncounterPatrolDestination(system, ship, origin) {
  const seed = hashString32(`${ship.seed}|${routeLocationIdentity(origin)}|encounter-patrol`);
  const candidates = system.ports
    .filter(npcRoutePortAcceptsTraffic)
    .filter((port) => !samePort(port, origin))
    .filter((port) => npcPortsShareRouteNetwork(system, origin, port))
    .filter((port) => ship.role !== NPC_ROLE_PIRATE || !npcPortHasMajorProtection(port))
    .sort((a, b) => (
      distanceKm(origin, a) - distanceKm(origin, b) ||
      destinationRank(origin, a, seed) - destinationRank(origin, b, seed)
    ));
  if (candidates.length === 0) {
    throw new Error(`No connected encounter patrol for ${ship.id} from ${portName(origin)}`);
  }
  return candidates[0];
}

function chooseNpcPortResponseDestination(system, ship, origin) {
  reconcileNpcPortResponseFields(ship, `responding ship ${ship.id}`);
  const response = ship.portResponse;
  const destinationCityId = response.phase === "returning"
    ? response.returnCityId
    : response.targetCityId;
  const destination = requiredNpcRoutePort(system, destinationCityId, "Port-response destination");
  if (!samePort(origin, destination)) return destination;
  if (response.phase === "returning") {
    throw new Error(`Returning port-response ship was not released at ${portName(origin)}: ${ship.id}`);
  }
  return capitalNavalReservePatrolPort(system, ship, origin);
}

function capitalNavalReservePatrolPort(system, ship, origin) {
  const responseBaseId = ship.portResponse?.returnCityId ||
    ship.capitalNavalReserveDestinationCityId;
  const preferredBase = system.ports.find((port) => port.cityId === responseBaseId);
  if (preferredBase && !samePort(preferredBase, origin) &&
      npcPortsShareRouteNetwork(system, origin, preferredBase)) {
    return preferredBase;
  }
  const friendly = system.ports.filter((port) => (
    port.factionId === ship.factionId && !samePort(port, origin) &&
    npcRoutePortAcceptsTraffic(port) && npcPortsShareRouteNetwork(system, origin, port)
  ));
  const candidates = friendly.length > 0 ? friendly : system.ports.filter((port) => (
    !samePort(port, origin) && npcRoutePortAcceptsTraffic(port) &&
    npcPortsShareRouteNetwork(system, origin, port)
  ));
  if (candidates.length === 0) {
    throw new Error(`Capital naval reserve ${ship.id} has no patrol port from ${portName(origin)}`);
  }
  return [...candidates].sort((a, b) => (
    distanceKm(origin, a) - distanceKm(origin, b) || a.tileId - b.tileId
  ))[0];
}

function chooseNationalCircuitDestination(system, ship, origin) {
  reconcileNpcNationalCircuitFields(ship, `ship ${ship.id}`);
  if (ship.nationalCircuitFactionId !== ship.factionId) {
    throw new Error(`NPC ship ${ship.id} has a foreign national port circuit`);
  }
  const ports = ship.nationalCircuitCityIds.map((cityId) => {
    const port = requiredNationalCircuitPort(system, cityId, ship.nationalCircuitId);
    if (port.factionId !== ship.factionId || !npcRoutePortAcceptsTraffic(port)) {
      throw new Error(`NPC ship ${ship.id} has an unavailable national circuit port: ${cityId}`);
    }
    return port;
  });
  const originIndex = ports.findIndex((port) => samePort(port, origin));
  if (originIndex >= 0) return ports[(originIndex + 1) % ports.length];
  const reachable = ports.filter((port) => npcPortsShareRouteNetwork(system, origin, port));
  if (reachable.length === 0) {
    throw new Error(`NPC ship ${ship.id} cannot return to its national port circuit`);
  }
  return reachable.sort((a, b) => (
    distanceKm(origin, a) - distanceKm(origin, b) || a.tileId - b.tileId
  ))[0];
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
    profileSpec.groundIds.includes(ground.whalingGroundId) &&
    npcPortsShareRouteNetwork(system, origin, ground)
  ));
  if (grounds.length === 0) {
    throw new Error(`NPC whaler profile ${profileSpec.id} has no reachable hunting grounds`);
  }
  const seed = hashString32(`${ship.seed}|${routeLocationIdentity(origin)}|whaling-ground`);
  return grounds.sort((a, b) => (
    distanceKm(origin, a) - distanceKm(origin, b) ||
    destinationRank(origin, a, seed) - destinationRank(origin, b, seed)
  ))[0];
}

function chooseWhalerSalePort(system, ship, origin) {
  const profileSpec = fleetProfileForId(ship.profileId);
  const quantity = Math.max(1, ship.cargo[WHALE_BLUBBER_GOOD_ID] || ship.cargoCapacity);
  const seed = hashString32(`${ship.seed}|${routeLocationIdentity(origin)}|blubber-sale`);
  const candidates = system.ports
    .filter(npcRoutePortAcceptsTraffic)
    .filter((port) => !samePort(port, origin))
    .filter((port) => npcPortsShareRouteNetwork(system, origin, port))
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
  const seed = hashString32(`${ship.seed}|${routeLocationIdentity(origin)}|fishery`);
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
  const profileSpec = fleetProfileForId(ship.profileId);
  if (profileSpec.mode === "regional" && (
    ground.routeRegion !== origin.routeRegion ||
    !npcRoutePointsShareAnchor(origin, ground)
  )) return null;
  if (!npcPortsShareRouteNetwork(system, origin, ground)) return null;
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
  const seed = hashString32(`${ship.seed}|${routeLocationIdentity(origin)}|fish-sale`);
  const profileSpec = fleetProfileForId(ship.profileId);
  const candidates = system.ports
    .filter(npcRoutePortAcceptsTraffic)
    .filter((port) => !samePort(port, origin))
    .filter((port) => npcPortsShareRouteNetwork(system, origin, port))
    .filter((port) => (
      profileSpec.mode !== "regional" ||
      profileSpec.portPredicate(port) ||
      npcRoutePointsShareAnchor(origin, port)
    ))
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
    const cooldownMinutes = npcWhalingCooldownMinutes(system.whaleMemory);
    if (clockMinutes - ship.lastWhaleHuntMinute < cooldownMinutes) {
      return Object.freeze({ outcome: "cooldown", whale: null });
    }
  }
  const availableQuantity = npcCargoAvailableQuantity(ship, WHALE_BLUBBER_GOOD_ID);
  if (availableQuantity <= 0) return Object.freeze({ outcome: "hold-full", whale: null });

  const result = harvestWhaleForNpc(system.whaleMemory, latLonToVector(ground.lat, ground.lon), {
    maxDistanceRad: NPC_WHALING_RANGE_RAD,
    minimumLivingPopulation: NPC_WHALING_MIN_LIVING_POPULATION,
    protectSpeciesEquilibrium: true
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
  if (port?.isFishingGround || port?.isWhalingGround) return true;
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
    const expansionPriority = ship.role === NPC_ROLE_WARSHIP &&
      system.relationBetween(ship.factionId, destination.factionId) === DIPLOMACY_WAR
      ? factionExpansionTargetPriority(
          ship.factionId,
          destination.factionId,
          system.economy.lastMinute
        )
      : 0;
    return expansionPriority * 2500 + patrolFit * 1000 - variation * 0.05;
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
    const embargoOrders = [
      ...tradeEmbargoOrdersForPurchase(system.tradeEmbargoes, {
        sourceFactionId: origin.factionId,
        goodId: line.goodId,
        playerFactionId: ship.factionId
      }),
      ...tradeEmbargoOrdersForSale(system.tradeEmbargoes, {
        destinationFactionId: destination.factionId,
        goodId: line.goodId,
        playerFactionId: ship.factionId
      }),
      ...tradeEmbargoOrdersForShipping(system.tradeEmbargoes, {
        shipFactionId: ship.factionId,
        destinationFactionId: destination.factionId,
        goodId: line.goodId
      })
    ].filter((order, index, orders) => (
      orders.findIndex((candidate) => candidate.id === order.id) === index
    ));
    if (embargoOrders.length > 0 && !npcWillSmuggleEmbargoedCargo({
      shipId: ship.id,
      seed: system.tradeEmbargoes.seed,
      expectedProfit: line.expectedProfit,
      cargoValue: Math.max(1, tradeGoodById(line.goodId).basePrice * line.quantity)
    })) {
      continue;
    }
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
    recordNpcCargoOrigin(ship, line.goodId, stored, origin, system.economy.lastMinute);
  }
}

function sellNpcCargo(system, ship, port) {
  if (npcNeedsFriendlyTradePort(ship) && !npcMerchantCanTradeAtPort(system, ship, port)) {
    throw new Error(`NPC ${ship.role} ${ship.id} cannot trade at hostile port ${portName(port)}`);
  }
  enforceNpcTradeEmbargoAtPort(system, ship, port);
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
    consumeNpcCargoOrigins(ship, goodId, quantity);
  }
}

function enforceNpcTradeEmbargoAtPort(system, ship, port) {
  if (ship.role !== NPC_ROLE_MERCHANT || Object.keys(ship.cargoOrigins).length === 0) return null;
  const enforcerShips = system.ships.filter((candidate) => (
    candidate.id !== ship.id && candidate.role === NPC_ROLE_WARSHIP &&
    !shipHasCombatGrace(candidate) && candidate.currentPort && samePort(candidate.currentPort, port)
  ));
  if (enforcerShips.length === 0) return null;
  const enforcerFactionIds = [...new Set(enforcerShips.map((candidate) => candidate.factionId))];
  const violation = npcTradeEmbargoViolations(
    ship,
    system.tradeEmbargoes,
    enforcerFactionIds
  )[0] || null;
  if (!violation) return null;
  const cargoValue = Object.entries(violation.cargo).reduce((sum, [goodId, quantity]) => {
    const held = ship.cargo[goodId] || 0;
    return sum + (held > 0 ? npcCargoCost(ship, goodId) * quantity / held : 0);
  }, 0);
  const outcome = npcEmbargoInspectionOutcome({
    shipId: ship.id,
    enforcerFactionId: violation.enforcingFactionId,
    simMinute: system.economy.lastMinute,
    cargoValue: Math.max(1, cargoValue)
  });
  if (!outcome.caught) return Object.freeze({ caught: false, violation });
  const confiscated = {};
  for (const [goodId, requested] of Object.entries(violation.cargo)) {
    const held = ship.cargo[goodId] || 0;
    const quantity = Math.min(held, requested);
    if (quantity <= 0) continue;
    const remaining = held - quantity;
    const totalCost = npcCargoCost(ship, goodId);
    if (remaining > 0) {
      ship.cargo[goodId] = remaining;
      ship.cargoCost[goodId] = totalCost * (remaining / held);
    } else {
      delete ship.cargo[goodId];
      delete ship.cargoCost[goodId];
    }
    consumeNpcCargoOrigins(ship, goodId, quantity);
    confiscated[goodId] = quantity;
  }
  ship.specie = Math.max(0, ship.specie - outcome.fine);
  ship.tradeEmbargoConvictions += 1;
  ship.lastTradeEmbargoEnforcement = {
    orderId: violation.orderId,
    enforcingFactionId: violation.enforcingFactionId,
    simMinute: system.economy.lastMinute,
    fine: outcome.fine,
    confiscated
  };
  return Object.freeze({ caught: true, violation, fine: outcome.fine, confiscated });
}

function recordNpcCargoOrigin(ship, goodId, quantity, port, simMinute) {
  if (!Number.isInteger(quantity) || quantity <= 0 ||
      !Number.isInteger(port?.tileId) || port.tileId < 0 ||
      !Number.isFinite(simMinute) || simMinute < 0) {
    throw new Error(`NPC cargo provenance is invalid for ${ship.id}/${goodId}`);
  }
  assertFactionId(port.factionId);
  const origins = ship.cargoOrigins[goodId] || [];
  const previous = origins.at(-1);
  if (previous && previous.sourceTileId === port.tileId &&
      previous.sourceFactionId === port.factionId) {
    previous.quantity += quantity;
  } else {
    origins.push({
      sourceFactionId: port.factionId,
      sourceTileId: port.tileId,
      quantity,
      purchasedMinute: simMinute
    });
  }
  ship.cargoOrigins[goodId] = origins;
}

function consumeNpcCargoOrigins(ship, goodId, quantity) {
  if (!Number.isInteger(quantity) || quantity < 0) {
    throw new Error(`NPC cargo provenance consumption is invalid: ${goodId}=${quantity}`);
  }
  let remaining = quantity;
  const origins = ship.cargoOrigins[goodId] || [];
  while (remaining > 0 && origins.length > 0) {
    const origin = origins[0];
    const removed = Math.min(origin.quantity, remaining);
    origin.quantity -= removed;
    remaining -= removed;
    if (origin.quantity === 0) origins.shift();
  }
  if (origins.length > 0) ship.cargoOrigins[goodId] = origins;
  else delete ship.cargoOrigins[goodId];
  return quantity - remaining;
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
  reconcileNpcCargoOriginsToManifest(ship);
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
    consumeNpcCargoOrigins(ship, candidate.goodId, quantity);
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
  if (ship && typeof ship === "object") {
    ship.cargoOrigins ??= {};
    ship.tradeEmbargoConvictions ??= 0;
    ship.lastTradeEmbargoEnforcement ??= null;
  }
  if (!ship || typeof ship.id !== "string" || ship.id === "" ||
      !Number.isInteger(ship.cargoCapacity) || ship.cargoCapacity < 0 ||
      !ship.cargo || typeof ship.cargo !== "object" || Array.isArray(ship.cargo) ||
      !ship.cargoCost || typeof ship.cargoCost !== "object" || Array.isArray(ship.cargoCost) ||
      !ship.cargoOrigins || typeof ship.cargoOrigins !== "object" || Array.isArray(ship.cargoOrigins) ||
      !Number.isInteger(ship.tradeEmbargoConvictions) || ship.tradeEmbargoConvictions < 0) {
    throw new Error(`Invalid NPC cargo state: ${ship?.id}`);
  }
  let units = 0;
  for (const [goodId, quantity] of Object.entries(ship.cargo)) {
    const good = tradeGoodById(goodId);
    if (!Number.isInteger(quantity) || quantity < 0) throw new Error(`NPC ship ${ship.id} has invalid ${goodId} cargo: ${quantity}`);
    npcCargoCost(ship, goodId);
    units += quantity * good.unitSize;
  }
  for (const [goodId, origins] of Object.entries(ship.cargoOrigins)) {
    tradeGoodById(goodId);
    if (!Array.isArray(origins) || origins.length === 0) {
      throw new Error(`NPC ship ${ship.id} has invalid ${goodId} cargo origins`);
    }
    let recordedQuantity = 0;
    for (const origin of origins) {
      if (!origin || typeof origin !== "object" || Array.isArray(origin) ||
          !Number.isInteger(origin.sourceTileId) || origin.sourceTileId < 0 ||
          !Number.isInteger(origin.quantity) || origin.quantity <= 0 ||
          !Number.isFinite(origin.purchasedMinute) || origin.purchasedMinute < 0) {
        throw new Error(`NPC ship ${ship.id} has invalid ${goodId} cargo provenance`);
      }
      assertFactionId(origin.sourceFactionId);
      recordedQuantity += origin.quantity;
    }
    if (recordedQuantity > (ship.cargo[goodId] || 0)) {
      throw new Error(`NPC ship ${ship.id} has more ${goodId} provenance than cargo`);
    }
  }
  if (ship.lastTradeEmbargoEnforcement !== null && (
    !ship.lastTradeEmbargoEnforcement ||
    typeof ship.lastTradeEmbargoEnforcement !== "object" ||
    typeof ship.lastTradeEmbargoEnforcement.orderId !== "string" ||
    !Number.isFinite(ship.lastTradeEmbargoEnforcement.simMinute)
  )) {
    throw new Error(`NPC ship ${ship.id} has invalid trade embargo enforcement history`);
  }
  return units;
}

function reconcileNpcCargoOriginsToManifest(ship) {
  if (!ship || typeof ship !== "object") return;
  ship.cargoOrigins ??= {};
  for (const [goodId, origins] of Object.entries(ship.cargoOrigins)) {
    if (!Array.isArray(origins)) continue;
    let excess = origins.reduce((sum, origin) => sum + (Number(origin?.quantity) || 0), 0) -
      (Number(ship.cargo?.[goodId]) || 0);
    while (excess > 0 && origins.length > 0) {
      const origin = origins.at(-1);
      const removed = Math.min(excess, Number(origin?.quantity) || 0);
      origin.quantity -= removed;
      excess -= removed;
      if (origin.quantity <= 0) origins.pop();
    }
    if (origins.length === 0) delete ship.cargoOrigins[goodId];
  }
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

export function npcTradeEmbargoViolations(ship, embargoMemory, enforcingFactionIds) {
  inspectNpcCargo(ship);
  validateTradeEmbargoMemory(embargoMemory);
  if (!Array.isArray(enforcingFactionIds)) {
    throw new Error("NPC trade embargo inspection requires enforcing factions");
  }
  const enforcers = new Set(enforcingFactionIds.map(assertFactionId));
  const destinationFactionId = ship.plan?.destination?.factionId || ship.currentPort?.factionId || null;
  if (destinationFactionId !== null) assertFactionId(destinationFactionId);
  const violations = [];
  for (const order of activeTradeEmbargoOrders(embargoMemory)) {
    const authorizedEnforcers = order.followerFactionIds.filter((factionId) => (
      enforcers.has(factionId)
    ));
    if (authorizedEnforcers.length === 0) continue;
    const cargo = {};
    for (const [goodId, held] of Object.entries(ship.cargo)) {
      if (!embargoOrderControlsGood(order, goodId)) continue;
      let quantity = 0;
      if (order.restrictionKind === TRADE_EMBARGO_RESTRICTION_IMPORTS) {
        quantity = (ship.cargoOrigins[goodId] || [])
          .filter((origin) => origin.sourceFactionId === order.targetFactionId)
          .reduce((sum, origin) => sum + origin.quantity, 0);
      } else if (order.restrictionKind === TRADE_EMBARGO_RESTRICTION_EXPORTS) {
        quantity = destinationFactionId === order.targetFactionId ? held : 0;
      } else if (order.restrictionKind === TRADE_EMBARGO_RESTRICTION_BLOCKADE) {
        quantity = ship.factionId === order.targetFactionId ||
          destinationFactionId === order.targetFactionId ? held : 0;
      } else {
        throw new Error(`Unknown NPC trade restriction kind: ${order.restrictionKind}`);
      }
      if (quantity > 0) cargo[goodId] = Math.min(quantity, held);
    }
    const cargoQuantity = Object.values(cargo).reduce((sum, quantity) => sum + quantity, 0);
    if (cargoQuantity <= 0) continue;
    violations.push(Object.freeze({
      id: `trade-embargo:${order.id}`,
      regimeKind: "trade-embargo",
      orderId: order.id,
      authorityKind: order.authorityKind,
      issuerFactionId: order.issuerFactionId,
      targetFactionId: order.targetFactionId,
      scope: order.scope,
      restrictionKind: order.restrictionKind,
      enforcingFactionId: authorizedEnforcers[0],
      cargo: Object.freeze(cargo),
      cargoQuantity
    }));
  }
  return Object.freeze(violations);
}

function chooseSeasonalHop(system, ship, origin, desiredDestination, startMinute) {
  const profileSpec = fleetProfileForId(ship.profileId);
  const candidates = system.ports
    .filter((port) => !samePort(port, origin) && !samePort(port, desiredDestination))
    .filter((port) => npcPortsShareRouteNetwork(system, origin, port))
    .filter((port) => ship.role !== NPC_ROLE_PIRATE || !npcPortHasMajorProtection(port))
    .filter((port) => !npcNeedsFriendlyTradePort(ship) || npcMerchantCanTradeAtPort(system, ship, port))
    .filter((port) => (
      profileSpec.mode !== "regional" ||
      profileSpec.portPredicate(port) ||
      npcRoutePointsShareAnchor(origin, port)
    ))
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
  const key = `${routeLocationIdentity(origin)}|${routeLocationIdentity(destination)}|${shipSlug}|${startMonth}`;
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

function pruneUninhabitedRiverTails(baseEdges, ports) {
  const adjacency = cloneBaseAdjacency(baseEdges);
  const inhabitedAnchors = new Set(ports.flatMap((port) => port.routeAnchors));
  let changed = true;
  while (changed) {
    changed = false;
    for (const [anchorId, edges] of adjacency) {
      if (inhabitedAnchors.has(anchorId) || edges.length !== 1 || edges[0].kind !== "river") {
        continue;
      }
      const neighborId = edges[0].to;
      adjacency.set(anchorId, []);
      adjacency.set(
        neighborId,
        (adjacency.get(neighborId) || []).filter((edge) => edge.to !== anchorId)
      );
      changed = true;
    }
  }
  return adjacency;
}

function buildRouteAnchorComponents(laneNodes, baseEdges) {
  const componentByAnchorId = new Map();
  let componentId = 0;
  for (const anchorId of laneNodes.keys()) {
    if (componentByAnchorId.has(anchorId)) continue;
    const pending = [anchorId];
    componentByAnchorId.set(anchorId, componentId);
    while (pending.length > 0) {
      const currentId = pending.pop();
      for (const edge of baseEdges.get(currentId) || []) {
        if (!laneNodes.has(edge.to)) {
          throw new Error(`NPC lane component references an unknown anchor: ${edge.to}`);
        }
        if (componentByAnchorId.has(edge.to)) continue;
        componentByAnchorId.set(edge.to, componentId);
        pending.push(edge.to);
      }
    }
    componentId++;
  }
  if (componentByAnchorId.size !== laneNodes.size) {
    throw new Error("NPC lane components do not cover every route anchor");
  }
  return componentByAnchorId;
}

function npcPortsShareRouteNetwork(system, origin, destination) {
  if (!(system.routeComponentByAnchorId instanceof Map)) {
    throw new Error("NPC route network requires anchor components");
  }
  if (!Array.isArray(origin?.routeAnchors) || origin.routeAnchors.length === 0) {
    throw new Error(`NPC route origin has no anchors: ${portName(origin)}`);
  }
  if (!Array.isArray(destination?.routeAnchors) || destination.routeAnchors.length === 0) {
    throw new Error(`NPC route destination has no anchors: ${portName(destination)}`);
  }
  for (const originAnchorId of origin.routeAnchors) {
    const originComponentId = system.routeComponentByAnchorId.get(originAnchorId);
    if (originComponentId === undefined) {
      throw new Error(`Unknown NPC route origin anchor: ${originAnchorId}`);
    }
    for (const destinationAnchorId of destination.routeAnchors) {
      const destinationComponentId = system.routeComponentByAnchorId.get(destinationAnchorId);
      if (destinationComponentId === undefined) {
        throw new Error(`Unknown NPC route destination anchor: ${destinationAnchorId}`);
      }
      if (originComponentId === destinationComponentId) return true;
    }
  }
  return false;
}

function npcRoutePointsShareAnchor(origin, destination) {
  if (!Array.isArray(origin?.routeAnchors) || origin.routeAnchors.length === 0) {
    throw new Error(`NPC route origin has no anchors: ${portName(origin)}`);
  }
  if (!Array.isArray(destination?.routeAnchors) || destination.routeAnchors.length === 0) {
    throw new Error(`NPC route destination has no anchors: ${portName(destination)}`);
  }
  return origin.routeAnchors.some((anchorId) => destination.routeAnchors.includes(anchorId));
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
    .filter((port) => (
      profileSpec.mode !== "interregional" ||
      !isJapanesePolityFaction(port.factionId)
    ))
    .sort((a, b) => b.population - a.population || a.cityId.localeCompare(b.cityId))
    .slice(0, profileSpec.mode === "regional" ? 34 : 54);
}

function addExpectedFleetOrigins(weights, pool, shipCount) {
  if (!Number.isInteger(shipCount) || shipCount <= 0) {
    throw new Error(`NPC fleet origin weights received invalid ship count: ${shipCount}`);
  }
  const expectedOriginsPerPort = shipCount / pool.length;
  for (const port of pool) {
    const cityId = requireCityId(port, "NPC fleet origin weight port");
    const current = weights.get(cityId);
    if (!Number.isFinite(current) || current <= 0) {
      throw new Error(`NPC fleet origin weights are missing port ${cityId}`);
    }
    weights.set(cityId, current + expectedOriginsPerPort);
  }
}

function destinationRank(origin, candidate, seed) {
  const distance = distanceKm(origin, candidate);
  const ideal = origin.routeRegion === candidate.routeRegion ? 1150 : 7400;
  const populationBoost = Math.log10(Math.max(10, candidate.population || 10)) * -80;
  const jitter = hashString32(`${seed}|${routeLocationIdentity(candidate)}`) % 500;
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

function npcRoutePortAcceptsTraffic(port) {
  return isAnyUsablePort(port) && port.hiddenSettlement !== true && port.colonyAbandoned !== true;
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

function isAndeanCoastalPort(port) {
  return port.cityType === "andean" && port.manualRegion === "inca-coast";
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
  return isJapanesePolityFaction(port.factionId) && isEastAsiaPort(port);
}

function isNorthwestCoastWhalingPort(port) {
  return port.manualRegion === "northwest-coast";
}

function isNorthwestCoastRoutePoint(port) {
  if (isNorthwestCoastWhalingPort(port)) return true;
  if (!Number.isFinite(port?.lat) || !Number.isFinite(port?.lon)) return false;
  const lon = normalizeLonDeg(port.lon);
  return port.lat >= 40 && port.lat <= 61 && lon >= -150 && lon <= -118;
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
  // City art groups are cultural, not nautical. Ottoman and North African
  // Mediterranean ports use Islamic art, but must not inherit Indian Ocean
  // route anchors such as Hormuz and Aden.
  if (isMediterraneanOrBlackSeaRoutePort(port)) return "europe";
  if (port.cityType === "northern-european" || port.cityType === "mediterranean") return "europe";
  if (port.cityType === "sub-saharan") return "africa";
  if (port.cityType === "islamic-desert") return "indian-ocean";
  if (port.lon >= 35 && port.lon <= 90 && port.lat >= -12 && port.lat <= 30) return "indian-ocean";
  return "other";
}

function anchorIdsForPort(port) {
  // River membership follows canonical identity, including Djenné's retained
  // pre-correction ID. Renames must never turn an inland call into a sea leg.
  if (port.cityId === "dienne|senegal") return ["niger-inner-delta"];
  if (port.cityId === "tombouctou|mali") return ["niger-bend"];
  if (port.cityId === "gao|mali") return ["niger-gao"];
  if (isNorthwestCoastRoutePoint(port)) return ["yuquot"];
  const region = portRouteRegion(port);
  if (region === "east-asia") return nearestAnchors(port, ["canton", "nagasaki", "manila"], 2);
  if (region === "southeast-asia") {
    if (portName(port).toLowerCase() === "malacca") return ["malacca"];
    return nearestAnchors(port, ["malacca", "singapore", "sunda", "manila"], 2);
  }
  if (region === "south-asia") return nearestAnchors(port, ["goa", "ceylon", "arabian-sea"], 2);
  if (region === "indian-ocean") return nearestAnchors(port, ["aden", "hormuz", "red-sea", "zanzibar", "arabian-sea"], 2);
  if (region === "europe") {
    if (isBosporusRoutePort(port)) return ["constantinople"];
    if (isBlackSeaRoutePort(port)) return ["black-sea"];
    if (isDardanellesRoutePort(port)) {
      return nearestAnchors(port, ["dardanelles-south", "dardanelles-north"], 1);
    }
    if (isMarmaraRoutePort(port)) {
      return nearestAnchors(port, ["marmara-west", "marmara-center", "marmara-east"], 1);
    }
    if (port.lat > 46) return nearestAnchors(port, ["north-sea", "biscay", "gibraltar"], 2);
    return nearestAnchors(port, [
      "gibraltar",
      "sicily",
      "alexandria",
      "aegean",
      "dardanelles-south",
      "venice"
    ], 2);
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

function isMediterraneanOrBlackSeaRoutePort(port) {
  if ([
    "adriatic",
    "barbary-coast",
    "central-mediterranean",
    "eastern-mediterranean",
    "strait-of-gibraltar",
    "western-mediterranean"
  ].includes(port.manualRegion)) return true;
  if (!Number.isFinite(port?.lat) || !Number.isFinite(port?.lon)) return false;
  const lon = normalizeLonDeg(port.lon);
  const northAfricanAtlantic = port.lat >= 20 && port.lat <= 36 && lon >= -18 && lon < -5;
  const mediterraneanSouth = port.lat >= 30 && port.lat <= 38.5 && lon >= -6 && lon <= 36;
  const aegeanAndBlackSea = port.lat >= 38.5 && port.lat <= 48 && lon >= 20 && lon <= 42.5;
  return northAfricanAtlantic || mediterraneanSouth || aegeanAndBlackSea;
}

function isBosporusRoutePort(port) {
  const name = portName(port).toLowerCase();
  if (name === "istanbul" || name === "constantinople") return true;
  const lon = normalizeLonDeg(port.lon);
  return port.lat >= 40.85 && port.lat <= 41.25 && lon >= 28.65 && lon <= 29.35;
}

function isBlackSeaRoutePort(port) {
  const lon = normalizeLonDeg(port.lon);
  return (
    (port.lat >= 41 && port.lat <= 47.5 && lon >= 30 && lon <= 42.5) ||
    (port.lat >= 42 && port.lat <= 47.5 && lon >= 27 && lon < 30)
  );
}

function isDardanellesRoutePort(port) {
  const lon = normalizeLonDeg(port.lon);
  return port.lat >= 39.7 && port.lat <= 40.8 && lon >= 25.7 && lon <= 27.8;
}

function isMarmaraRoutePort(port) {
  const lon = normalizeLonDeg(port.lon);
  return port.lat >= 39.5 && port.lat <= 41 && lon > 27.8 && lon <= 29.5;
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

function profile(id, count, shipPools, portPredicate, mode, roleWeights = null, coverPorts = false) {
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
  if (mode === "interregional") {
    for (const slug of [...fisherSlugs, ...merchantSlugs, ...warshipSlugs]) {
      if (!npcShipSupportsFleetMode(slug, mode)) {
        throw new Error(`NPC fleet profile ${id} cannot send ${slug} on interregional routes`);
      }
    }
  }
  return Object.freeze({
    id,
    count,
    fisherSlugs,
    merchantSlugs,
    warshipSlugs,
    portPredicate,
    mode,
    roleWeights,
    coverPorts
  });
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
  return `${role}:${routeLocationIdentity(port)}`;
}

function samePort(a, b) {
  if (!a || !b) return false;
  const aCityId = typeof a.cityId === "string" && a.cityId !== "" ? requireCityId(a, "NPC route port") : null;
  const bCityId = typeof b.cityId === "string" && b.cityId !== "" ? requireCityId(b, "NPC route port") : null;
  if (aCityId !== null || bCityId !== null) return aCityId !== null && aCityId === bCityId;
  // IDENTITY_SPATIAL_EXCEPTION: two generated fishing-ground observations coincide only at the same tile.
  return Number.isInteger(a.tileId) && a.tileId === b.tileId;
}

function portName(port) {
  return port.displayCity || port.city || `tile ${port.tileId}`;
}

function portPoint(port) {
  return {
    id: `port:${routeLocationIdentity(port)}`,
    label: portName(port),
    lat: port.lat,
    lon: port.lon,
    port
  };
}

function routeLocationIdentity(port) {
  if (typeof port?.cityId === "string" && port.cityId !== "") {
    return requireCityId(port, "NPC route point");
  }
  // IDENTITY_SPATIAL_EXCEPTION: generated fishing/whaling grounds and capture points are observations,
  // so their exact water tile is the entity the route system needs to preserve.
  if (!Number.isInteger(port?.tileId)) throw new Error("NPC route point has no canonical or spatial identity");
  return `tile:${port.tileId}`;
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
      !Array.isArray(system.capitalNavalReserveSlots) ||
      !Number.isInteger(system.shipyardFleetGrowthLimit) || system.shipyardFleetGrowthLimit <= 0 ||
      !Array.isArray(system.whalingGrounds) ||
      !(system.routeComponentByAnchorId instanceof Map) ||
      !(system.routeCache instanceof Map) || !(system.edgeCostCache instanceof Map) ||
      (system.fishState !== null && typeof system.fishingGroundIsNavigable !== "function") ||
      (system.seedKey !== null && (typeof system.seedKey !== "string" || system.seedKey.trim() === "")) ||
      typeof system.relationBetween !== "function" ||
      typeof system.sovereignTradeOpenToFaction !== "function" ||
      !system.tradeEmbargoes) {
    throw new Error("Invalid NPC route system");
  }
  if (system.foreignSettlementExpulsions !== null) {
    validateForeignSettlementExpulsionMemory(system.foreignSettlementExpulsions);
  }
  validateSuzeraintyMemory(system.suzeraintyMemory);
  validateTradeEmbargoMemory(system.tradeEmbargoes);
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
