import {
  WEATHER_DAYS,
  WEATHER_MINUTES_PER_DAY,
  dateToSubsolarLatDeg,
  windAtLatLonDeg
} from "./weather.js";
import { shipStatsForSlug } from "./shipStats.js";
import {
  DIPLOMACY_WAR,
  NEUTRAL_FACTION_ID,
  PIRATE_FACTION_ID,
  assertFactionId,
  diplomacyBetween
} from "./factions.js";
import {
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
  fisheryForHabitat,
  harvestFishery
} from "./fishEcology.js";

const EARTH_RADIUS_KM = 6371;
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const ROUTE_MONTHS = 12;
const ROUTE_MONTH_DAYS = WEATHER_DAYS / ROUTE_MONTHS;
const ROUTE_MONTH_MINUTES = ROUTE_MONTH_DAYS * WEATHER_MINUTES_PER_DAY;
const ROUTE_MAX_MONTH_STEPS = 18;
const ROUTE_CACHE_LIMIT = 1800;
const ROUTE_WIND_SEED = 90210;
const NPC_FLEET_TARGET = 192;
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
const NPC_FISH_GOOD_ID = "fish";
const FISHING_GROUND_TARGET = 220;
const FISHING_GROUND_SAMPLE_DISTANCES_KM = Object.freeze([220, 520, 1100, 2100, 3400]);
const FISHING_GROUND_SAMPLE_BEARINGS_DEG = Object.freeze([0, 45, 90, 135, 180, 225, 270, 315]);
const FISHING_GROUND_MIN_EXPECTED_CATCH = 5;
const FISHING_GROUND_TRAVEL_COST_PER_KM = 0.035;
const FISHING_GROUND_LONG_RANGE_COST_PER_KM = 0.018;
const FISHING_GROUND_CATCH_RATIO = 0.72;

export const NPC_ROLE_MERCHANT = "merchant";
export const NPC_ROLE_FISHERMAN = "fisherman";
export const NPC_ROLE_WARSHIP = "warship";
export const NPC_ROLE_PIRATE = "pirate";

const NPC_ROLE_SET = new Set([NPC_ROLE_MERCHANT, NPC_ROLE_FISHERMAN, NPC_ROLE_WARSHIP, NPC_ROLE_PIRATE]);
const PIRATE_SHIP_SLUGS = Object.freeze([
  "pirate-sloop",
  "pirate-brigantine",
  "pirate-brig",
  "pirate-frigate"
]);

export const NPC_SHIP_SLUGS = Object.freeze([
  "fishing-lugger",
  "small-junk",
  "medium-junk",
  "large-junk",
  "sampan",
  "small-dhow",
  "dhow",
  "lateen-dhow",
  "dhow-felucca",
  "felucca",
  "xebec",
  "lateen-xebec",
  "caravel",
  "small-carrack",
  "carrack",
  "fluyt",
  "brigantine",
  "galleon",
  "cutter",
  "square-sail-trader",
  "square-rigged-caravel",
  "corvette",
  "frigate",
  "ship-of-the-line",
  ...PIRATE_SHIP_SLUGS
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
  laneNode("sunda", "Sunda Strait", -6.1, 105.8),
  laneNode("manila", "Manila Bay", 14.5, 120.8),
  laneNode("canton", "Pearl River", 22.4, 113.8),
  laneNode("nagasaki", "Nagasaki", 32.7, 129.8),
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
  laneEdge("malacca", "sunda", "strait"),
  laneEdge("malacca", "manila", "monsoon"),
  laneEdge("malacca", "canton", "monsoon"),
  laneEdge("sunda", "manila", "monsoon"),
  laneEdge("manila", "canton", "coastal"),
  laneEdge("canton", "nagasaki", "coastal")
]);

const FLEET_PROFILES = Object.freeze([
  profile("east-asia", 34, {
    fishers: ["sampan", "small-junk"],
    merchants: ["sampan", "small-junk", "medium-junk", "large-junk"],
    warships: ["small-junk", "medium-junk", "large-junk"]
  }, isEastAsiaPort, "regional"),
  profile("indian-ocean", 34, {
    fishers: ["small-dhow", "dhow-felucca", "felucca"],
    merchants: ["small-dhow", "dhow-felucca", "lateen-dhow", "dhow"],
    warships: ["lateen-dhow", "dhow", "xebec"]
  }, isIndianOceanPort, "regional"),
  profile("mediterranean", 28, {
    fishers: ["fishing-lugger", "felucca", "cutter"],
    merchants: ["felucca", "lateen-xebec", "xebec"],
    warships: ["lateen-xebec", "xebec", "caravel", "galleon"]
  }, isMediterraneanPort, "regional"),
  profile("atlantic-coast", 30, {
    fishers: ["fishing-lugger", "cutter", "felucca"],
    merchants: ["cutter", "square-sail-trader", "caravel", "small-carrack", "brigantine", "fluyt"],
    warships: ["square-rigged-caravel", "caravel", "brigantine", "corvette", "frigate"]
  }, isAtlanticPort, "regional"),
  profile("cape-trade", 44, {
    fishers: ["fishing-lugger", "cutter", "small-dhow"],
    merchants: ["square-sail-trader", "caravel", "small-carrack", "brigantine", "carrack", "fluyt", "galleon"],
    warships: ["caravel", "brigantine", "corvette", "galleon", "frigate"]
  }, isLongRangePort, "interregional"),
  profile("wide-world", 24, {
    fishers: ["fishing-lugger", "cutter", "small-dhow"],
    merchants: ["caravel", "small-carrack", "brigantine", "carrack", "fluyt", "galleon"],
    warships: ["brigantine", "corvette", "galleon", "frigate", "ship-of-the-line"]
  }, isAnyUsablePort, "interregional")
]);

export function createNpcSeaRouteSystem({ ports, startMinute, economy, fishState = null }) {
  if (!economy) throw new Error("NPC sea routes require a world economy");
  const usablePorts = ports
    .filter(isAnyUsablePort)
    .map((port) => ({
      ...port,
      factionId: assertFactionId(port.factionId),
      routeRegion: portRouteRegion(port),
      routeAnchors: anchorIdsForPort(port)
    }))
    .filter((port) => port.routeAnchors.length > 0);
  if (usablePorts.length < 8) {
    throw new Error(`NPC sea routes need at least 8 usable ports, got ${usablePorts.length}`);
  }

  const laneNodes = new Map(LANE_NODES.map((node) => [node.id, node]));
  const baseEdges = buildDirectedLaneEdges(laneNodes);
  const system = {
    ports: usablePorts,
    economy,
    laneNodes,
    baseEdges,
    routeCache: new Map(),
    edgeCostCache: new Map(),
    fishState,
    fishingGrounds: fishState ? buildFishingGrounds(usablePorts, fishState, startMinute) : [],
    pirateHideouts: choosePirateHideouts(usablePorts),
    pirateHideoutDangerUntil: new Map(),
    ships: [],
    shipById: new Map()
  };
  system.ships = createNpcFleet(system, startMinute);
  if (system.ships.length === 0) throw new Error("NPC sea routes created no ships");
  system.shipById = new Map(system.ships.map((ship) => [ship.id, ship]));
  if (system.shipById.size !== system.ships.length) throw new Error("NPC sea routes created duplicate ship ids");
  return system;
}

function choosePirateHideouts(ports) {
  const count = Math.min(
    ports.length - 1,
    PIRATE_HIDEOUT_MAX_COUNT,
    Math.max(PIRATE_HIDEOUT_MIN_COUNT, Math.round(ports.length * PIRATE_HIDEOUT_PORT_FRACTION))
  );
  return [...ports]
    .sort((a, b) => (
      hashString32(`${a.tileId}|${a.city}|pirate-hideout`) -
      hashString32(`${b.tileId}|${b.city}|pirate-hideout`)
    ))
    .slice(0, count);
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
  let changed = false;
  for (const ship of system.ships) {
    if (settleNpcShipToClock(system, ship, npcEffectiveClock(ship, clockMinutes), 5)) changed = true;
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
  if (role === NPC_ROLE_WARSHIP) return "Warship";
  if (role === NPC_ROLE_PIRATE) return "Pirate";
  throw new Error(`Unknown NPC ship role: ${role}`);
}

export function npcShipHasCombatGrace(system, shipId) {
  const ship = requiredNpcShip(system, shipId);
  return shipHasCombatGrace(ship);
}

export function damageNpcShip(system, shipId, amount) {
  const ship = requiredNpcShip(system, shipId);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error(`Invalid NPC ship damage: ${amount}`);
  ship.hitPoints = Math.max(1, ship.hitPoints - Math.round(amount));
  if (ship.role === NPC_ROLE_PIRATE && ship.hitPoints / ship.maxHitPoints <= PIRATE_HIDEOUT_RETREAT_HULL_RATIO) {
    ship.seekingHideout = true;
  }
  const surrenderHitPoints = Math.max(1, Math.floor(ship.maxHitPoints * 0.16));
  return {
    hitPoints: ship.hitPoints,
    maxHitPoints: ship.maxHitPoints,
    shouldSurrender: ship.hitPoints <= surrenderHitPoints
  };
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
  const ship = requiredNpcShip(system, shipId);
  if (!ship.visualNavigation) return;
  const position = normalizedVector(vector, `NPC ship ${shipId} released position`);
  synchronizeNpcRouteClock(ship, clockMinutes, position);
  ship.visualNavigation = null;
}

function createNpcFleet(system, startMinute) {
  const ships = [];
  for (const profileSpec of FLEET_PROFILES) {
    const pool = rankedProfilePorts(system.ports, profileSpec);
    if (pool.length < 2) continue;
    const count = Math.min(profileSpec.count, pool.length * 2);
    for (let i = 0; i < count; i++) {
      const seed = hashString32(`${profileSpec.id}|${i}|npc`);
      const origin = pool[seed % pool.length];
      const role = npcRoleForSeed(seed, origin.factionId, profileSpec.mode);
      const slug = npcShipSlugForRole(profileSpec, role, seed);
      const stats = shipStatsForSlug(slug);
      const ship = {
        id: `${profileSpec.id}-${i}`,
        factionId: role === NPC_ROLE_PIRATE ? PIRATE_FACTION_ID : origin.factionId,
        role,
        profileId: profileSpec.id,
        mode: profileSpec.mode,
        slugs: profileSlugsForRole(profileSpec, role),
        slug,
        seed,
        hitPoints: stats.hitPoints,
        maxHitPoints: stats.hitPoints,
        cargoCapacity: stats.cargoCapacity,
        cargo: {},
        cargoCost: {},
        specie: npcStartingSpecieForRole(role, stats),
        lifetimeProfit: 0,
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
      const phaseDays = (seed >>> 12) % 96;
      assignNpcPlan(system, ship, startMinute - phaseDays * WEATHER_MINUTES_PER_DAY);
      settleNpcShipToClock(system, ship, startMinute, 96);
      ships.push(ship);
    }
  }
  return ships.slice(0, NPC_FLEET_TARGET);
}

function npcRoleForSeed(seed, originFactionId, profileMode) {
  const roll = (seed >>> 5) % 100;
  if (roll < 62) return NPC_ROLE_MERCHANT;
  if (roll < 76 && profileMode === "regional") return NPC_ROLE_FISHERMAN;
  if (roll < 91) return originFactionId === NEUTRAL_FACTION_ID ? NPC_ROLE_MERCHANT : NPC_ROLE_WARSHIP;
  return NPC_ROLE_PIRATE;
}

function npcShipSlugForRole(profileSpec, role, seed) {
  if (!NPC_ROLE_SET.has(role)) throw new Error(`Unknown NPC ship role: ${role}`);
  const pool = profileSlugsForRole(profileSpec, role);
  return weightedCheapShipSlug(pool, hashString32(`${seed}|${role}|hull`));
}

function profileSlugsForRole(profileSpec, role) {
  if (role === NPC_ROLE_PIRATE) return PIRATE_SHIP_SLUGS;
  if (role === NPC_ROLE_WARSHIP) return profileSpec.warshipSlugs;
  if (role === NPC_ROLE_FISHERMAN) return profileSpec.fisherSlugs;
  return profileSpec.merchantSlugs;
}

function npcStartingSpecieForRole(role, stats) {
  if (role === NPC_ROLE_MERCHANT) return 900 + stats.cargoCapacity * 18;
  if (role === NPC_ROLE_FISHERMAN) return 120 + stats.cargoCapacity * 4;
  return 250 + stats.cannons * 12;
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
  if (ship.role === NPC_ROLE_MERCHANT && !ship.finalDestination && npcCargoUnits(ship) === 0) {
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
    if (ship.role === NPC_ROLE_PIRATE && ship.seekingHideout) ship.finalDestination = null;
    const reachedHideout = ship.role === NPC_ROLE_PIRATE &&
      ship.hideoutDestinationTileId === ship.currentPort.tileId &&
      (!ship.finalDestination || samePort(ship.currentPort, ship.finalDestination));
    if (reachedHideout) {
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
      else if (npcCargoUnits(ship) > 0) sellNpcCargo(system, ship, ship.currentPort);
    } else if (ship.role === NPC_ROLE_MERCHANT && reachedTradingDestination) {
      ship.finalDestination = null;
      sellNpcCargo(system, ship, ship.currentPort);
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
  const profileSpec = FLEET_PROFILES.find((item) => item.id === ship.profileId);
  if (!profileSpec) throw new Error(`Unknown NPC fleet profile: ${ship.profileId}`);
  const seed = hashString32(`${ship.id}|${origin.tileId}|dest`);
  const candidates = system.ports
    .filter((port) => !samePort(port, origin))
    .filter((port) => !shipHasCombatGrace(ship) || npcPortIsSafeForShip(system, ship, port))
    .filter((port) => !npcNeedsFriendlyTradePort(ship) || npcMerchantCanTradeAtPort(ship, port))
    .filter((port) => profileSpec.mode === "regional"
      ? profileSpec.portPredicate(port) && distanceKm(origin, port) >= NPC_MIN_TRIP_DISTANCE_KM
      : port.routeRegion !== origin.routeRegion && longRangePairAllowed(origin, port))
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
  const seed = hashString32(`${ship.id}|${origin.tileId}|fishery`);
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
  const expectedCatch = Math.min(
    ship.cargoCapacity,
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
  const seed = hashString32(`${ship.id}|${origin.tileId}|fish-sale`);
  const candidates = system.ports
    .filter((port) => !samePort(port, origin))
    .filter((port) => npcMerchantCanTradeAtPort(ship, port))
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
  const requested = Math.max(1, Math.floor(ship.cargoCapacity * FISHING_GROUND_CATCH_RATIO));
  const result = harvestFishery(system.fishState, fishery, requested, clockMinutes, {
    actor: "npc",
    ignoreCooldown: true
  });
  if (result.quantity <= 0) return result;
  ship.cargo[NPC_FISH_GOOD_ID] = (ship.cargo[NPC_FISH_GOOD_ID] || 0) + result.quantity;
  ship.cargoCost[NPC_FISH_GOOD_ID] = ship.cargoCost[NPC_FISH_GOOD_ID] || 0;
  return result;
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

function npcMerchantCanTradeAtPort(ship, port) {
  return diplomacyBetween(ship.factionId, port.factionId) !== DIPLOMACY_WAR;
}

function npcNeedsFriendlyTradePort(ship) {
  return ship.role === NPC_ROLE_MERCHANT || ship.role === NPC_ROLE_FISHERMAN;
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
    const saleValue = cargoSaleValue(system.economy, destination, ship.cargo);
    const cargoCost = Object.values(ship.cargoCost).reduce((sum, value) => sum + value, 0);
    return (saleValue - cargoCost + saleValue * 0.04) / distancePenalty;
  }
  const trade = planNpcTrade(system.economy, origin, destination, {
    cargoCapacity: ship.cargoCapacity,
    specie: ship.specie
  });
  return trade.expectedProfit / distancePenalty;
}

function buyNpcCargo(system, ship, origin, destination) {
  if (ship.role !== NPC_ROLE_MERCHANT) throw new Error(`NPC ${ship.id} cannot buy trade cargo as ${ship.role}`);
  if (!npcMerchantCanTradeAtPort(ship, origin) || !npcMerchantCanTradeAtPort(ship, destination)) {
    throw new Error(`NPC merchant ${ship.id} cannot trade across a hostile port route`);
  }
  const plan = planNpcTrade(system.economy, origin, destination, {
    cargoCapacity: ship.cargoCapacity,
    specie: ship.specie
  });
  for (const line of plan.lines) {
    const quantity = maximumPortSaleQuantity(
      system.economy,
      origin,
      line.goodId,
      line.quantity,
      ship.specie
    );
    if (quantity <= 0) continue;
    const transaction = executePortSale(system.economy, origin, line.goodId, quantity);
    ship.specie -= transaction.total;
    ship.cargo[line.goodId] = (ship.cargo[line.goodId] || 0) + quantity;
    ship.cargoCost[line.goodId] = (ship.cargoCost[line.goodId] || 0) + transaction.total;
  }
}

function sellNpcCargo(system, ship, port) {
  if (npcNeedsFriendlyTradePort(ship) && !npcMerchantCanTradeAtPort(ship, port)) {
    throw new Error(`NPC ${ship.role} ${ship.id} cannot trade at hostile port ${portName(port)}`);
  }
  for (const [goodId, held] of Object.entries(ship.cargo)) {
    tradeGoodById(goodId);
    if (!Number.isInteger(held) || held <= 0) throw new Error(`NPC ship ${ship.id} has invalid ${goodId} cargo: ${held}`);
    const quantity = maximumPortPurchaseQuantity(system.economy, port, goodId, held);
    if (quantity <= 0) continue;
    const transaction = executePortPurchase(system.economy, port, goodId, quantity);
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

function receiveNpcLoot(ship, loot) {
  ship.specie += loot.specie;
  let free = ship.cargoCapacity - npcCargoUnits(ship);
  for (const [goodId, available] of Object.entries(loot.cargo)) {
    const good = tradeGoodById(goodId);
    const quantity = Math.min(available, Math.floor(free / good.unitSize));
    if (quantity <= 0) continue;
    ship.cargo[goodId] = (ship.cargo[goodId] || 0) + quantity;
    ship.cargoCost[goodId] = ship.cargoCost[goodId] || 0;
    free -= quantity * good.unitSize;
  }
}

function npcCargoUnits(ship) {
  let units = 0;
  for (const [goodId, quantity] of Object.entries(ship.cargo)) {
    const good = tradeGoodById(goodId);
    if (!Number.isInteger(quantity) || quantity < 0) throw new Error(`NPC ship ${ship.id} has invalid ${goodId} cargo: ${quantity}`);
    units += quantity * good.unitSize;
  }
  if (units > ship.cargoCapacity) {
    throw new Error(`NPC ship ${ship.id} exceeds cargo capacity: ${units}/${ship.cargoCapacity}`);
  }
  return units;
}

function chooseSeasonalHop(system, ship, origin, desiredDestination, startMinute) {
  const candidates = system.ports
    .filter((port) => !samePort(port, origin) && !samePort(port, desiredDestination))
    .filter((port) => !npcNeedsFriendlyTradePort(ship) || npcMerchantCanTradeAtPort(ship, port))
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

function routeBetweenPorts(system, origin, destination, shipSlug, startMinute) {
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
    const held = vectorToLatLon(ship.visualNavigation.vector);
    return {
      id: ship.id,
      slug: ship.slug,
      lat: held.lat,
      lon: held.lon,
      vector: ship.visualNavigation.vector.slice(),
      heading: ship.visualNavigation.heading.slice(),
      routeVector: ship.visualNavigation.vector.slice(),
      routeHeading: ship.visualNavigation.heading.slice(),
      routeKey: `held:${segment?.startMinute ?? plan.endMinute}`,
      profileId: ship.profileId,
      factionId: ship.factionId,
      role: ship.role,
      hitPoints: ship.hitPoints,
      maxHitPoints: ship.maxHitPoints,
      combatGrace: ship.graceUntilPortVisit > ship.portVisits,
      cargo: { ...ship.cargo },
      specie: Math.floor(ship.specie)
    };
  }
  const t = clamp01((clockMinutes - segment.startMinute) / (segment.endMinute - segment.startMinute));
  const position = slerpPoint(segment.from, segment.to, t);
  const routeVector = latLonToVector(position.lat, position.lon);
  const routeHeading = headingVectorAt(position, segment.from, segment.to);
  const actualVector = ship.visualNavigation?.vector || routeVector;
  const actualHeading = ship.visualNavigation?.heading || routeHeading;
  const actual = vectorToLatLon(actualVector);
  return {
    id: ship.id,
    slug: ship.slug,
    lat: actual.lat,
    lon: actual.lon,
    vector: actualVector.slice(),
    heading: actualHeading.slice(),
    routeVector,
    routeHeading,
    routeKey: `${segment.from.id}->${segment.to.id}@${segment.startMinute}`,
    profileId: ship.profileId,
    factionId: ship.factionId,
    role: ship.role,
    hitPoints: ship.hitPoints,
    maxHitPoints: ship.maxHitPoints,
    combatGrace: ship.graceUntilPortVisit > ship.portVisits,
    cargo: { ...ship.cargo },
    specie: Math.floor(ship.specie)
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
  const baseKmPerDay = clamp(stats.topSpeedRad * 7200, 115, 360);
  const kindMul = edge.kind === "strait" ? 0.78 : edge.kind === "coastal" || edge.kind === "port" ? 0.88 : 1;
  const days = distance / Math.max(25, baseKmPerDay * factor * kindMul);
  const result = Math.max(0.12, days);
  rememberCache(system.edgeCostCache, key, result, ROUTE_CACHE_LIMIT * 4);
  return result;
}

function routeWindProgressFactor(stats, bearing, wind, edgeKind) {
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
  return clamp(efficiency * windPower, 0.04, 1.2);
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
  return distanceKm(a, b) > 2800;
}

function isAnyUsablePort(port) {
  return Number.isFinite(port.lat) && Number.isFinite(port.lon) && Number.isFinite(port.population);
}

function isEastAsiaPort(port) {
  return port.cityType === "east-asian" || (port.lon >= 105 && port.lon <= 145 && port.lat >= 10 && port.lat <= 42);
}

function isIndianOceanPort(port) {
  return port.cityType === "south-asian" ||
    port.cityType === "southeast-asian" ||
    (port.lon >= 38 && port.lon <= 86 && port.lat >= -12 && port.lat <= 28);
}

function isMediterraneanPort(port) {
  return port.cityType === "mediterranean" ||
    (port.lon >= -7 && port.lon <= 42 && port.lat >= 30 && port.lat <= 46);
}

function isAtlanticPort(port) {
  return port.cityType === "northern-european" ||
    (port.lon >= -85 && port.lon <= 20 && port.lat >= -36 && port.lat <= 58);
}

function isLongRangePort(port) {
  return isAnyUsablePort(port) && [
    "europe",
    "south-asia",
    "east-asia",
    "indian-ocean",
    "africa",
    "americas"
  ].includes(portRouteRegion(port));
}

function portRouteRegion(port) {
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
  const region = portRouteRegion(port);
  if (region === "east-asia") return nearestAnchors(port, ["canton", "nagasaki", "manila"], 2);
  if (region === "southeast-asia") return nearestAnchors(port, ["malacca", "sunda", "manila"], 2);
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

function profile(id, count, shipPools, portPredicate, mode) {
  const fisherSlugs = Object.freeze([...(shipPools.fishers || shipPools.merchants)]);
  const merchantSlugs = Object.freeze([...shipPools.merchants]);
  const warshipSlugs = Object.freeze([...shipPools.warships]);
  if (fisherSlugs.length === 0 || merchantSlugs.length === 0 || warshipSlugs.length === 0) {
    throw new Error(`NPC fleet profile ${id} needs fisher, merchant, and warship hulls`);
  }
  for (const slug of [...fisherSlugs, ...merchantSlugs, ...warshipSlugs]) shipStatsForSlug(slug);
  return Object.freeze({ id, count, fisherSlugs, merchantSlugs, warshipSlugs, portPredicate, mode });
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
  const dot = clamp(av[0] * bv[0] + av[1] * bv[1] + av[2] * bv[2], -1, 1);
  const omega = Math.acos(dot);
  if (omega < 1e-6) {
    return {
      lat: a.lat + (b.lat - a.lat) * t,
      lon: normalizeLonDeg(a.lon + shortestLonDeltaDeg(a.lon, b.lon) * t)
    };
  }
  const sinOmega = Math.sin(omega);
  const s0 = Math.sin((1 - t) * omega) / sinOmega;
  const s1 = Math.sin(t * omega) / sinOmega;
  const v = [
    av[0] * s0 + bv[0] * s1,
    av[1] * s0 + bv[1] * s1,
    av[2] * s0 + bv[2] * s1
  ];
  return vectorToLatLon(v);
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

function hashString32(value) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}
