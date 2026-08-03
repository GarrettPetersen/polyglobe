import assert from "node:assert/strict";
import test from "node:test";

import { advanceWorldEconomy, createWorldEconomy, tradeGoodById } from "./economy.js";
import { createGameState } from "./gameState.js";
import {
  NPC_ROLE_FISHERMAN,
  NPC_ROLE_MERCHANT,
  NPC_ROLE_PIRATE,
  NPC_ROLE_WHALER,
  NPC_ROLE_WARSHIP,
  NPC_PACIFIC_FLEET_TARGET,
  NPC_SEA_ROUTE_SNAPSHOT_VERSION,
  NPC_WHALER_FLEET_TARGET,
  NPC_SHIP_SLUGS,
  PIRATE_SHIP_SLUGS,
  addNpcSeaRoutePort,
  applyNpcConquestOwnership,
  captureSurrenderedNpcShip,
  configureNpcEncounter,
  configureNpcRouteEncounter,
  createNpcSeaRouteSystem,
  damageNpcShip,
  npcCargoAvailableQuantity,
  npcFleetOriginWeightsForPorts,
  npcPortHasMajorProtection,
  npcSeaRoutePortSettlementType,
  reconcileNpcCargoCapacity,
  routeBetweenPorts,
  npcSeaRouteEventSchedule,
  npcShipHasCombatGrace,
  npcShipSnapshots,
  releaseNpcShipVisualNavigation,
  replaceNpcSeaRoutePort,
  restoreNpcSeaRouteSystem,
  setNpcShipVisualNavigation,
  sinkNpcShip,
  snapshotNpcSeaRouteSystem,
  storeNpcCargo,
  surrenderNpcShip,
  updateNpcPirateHideoutPlayerThreat,
  updateNpcSeaRouteEvents,
  updateNpcSeaRouteSystem
} from "./npcSeaRoutes.js";
import { DIPLOMACY_WAR, PIRATE_FACTION_ID, diplomacyBetween } from "./factions.js";
import { JAPANESE_SHIP_SLUGS, shipStatsForSlug } from "./shipStats.js";
import { navalWeaponForShip } from "./navalWeapons.js";
import {
  fishingNetById,
  npcFishingNetExpectedHaul
} from "./fishingNets.js";
import { createWhaleMemory, seedWhalePopulation } from "./whaleSystem.js";

const PORTS = Object.freeze([
  port(1, "Lisbon", "Portugal", "mediterranean", 38.72, -9.14, 70000, "portugal"),
  port(2, "Seville", "Spain", "mediterranean", 37.39, -5.99, 90000, "spain"),
  port(3, "Genova", "Italy", "mediterranean", 44.41, 8.93, 70000, "genoa"),
  port(4, "Istanbul", "Turkey", "islamic-desert", 41.01, 28.98, 180000, "ottoman"),
  port(5, "Goa", "India", "south-asian", 15.3, 73.82, 60000, "portugal"),
  port(6, "Calicut", "India", "south-asian", 11.26, 75.78, 50000, "vijayanagara"),
  port(7, "Malacca", "Malaysia", "southeast-asian", 2.19, 102.25, 45000, "portugal"),
  port(8, "Guangzhou", "China", "east-asian", 23.13, 113.26, 120000, "ming"),
  port(9, "Nanjing", "China", "east-asian", 32.06, 118.79, 160000, "ming")
]);

const PACIFIC_PORTS = Object.freeze([
  port(20, "Fiji Village", "Fiji", "polynesian", -18.14, 178.44, 3500, "neutral"),
  port(21, "Tonga Village", "Tonga", "polynesian", -21.14, -175.2, 3000, "neutral"),
  port(22, "Samoa Village", "Samoa", "polynesian", -13.83, -171.75, 3000, "neutral"),
  port(23, "Tahiti Village", "French Polynesia", "polynesian", -17.55, -149.56, 3000, "neutral")
]);

const MESOAMERICAN_PORTS = Object.freeze([
  nativeVillage(port(30, "Xicalango", "Mexico", "mesoamerican", 18.65, -91.82, 2800, "neutral")),
  nativeVillage(port(31, "Chakan Putum", "Mexico", "mesoamerican", 19.35, -90.72, 2400, "neutral")),
  nativeVillage(port(32, "Cuzamil", "Mexico", "mesoamerican", 20.43, -86.92, 1800, "neutral")),
  nativeVillage(port(33, "Guanahani Village", "Bahamas", "mesoamerican", 24.06, -74.47, 1200, "neutral")),
  nativeVillage(port(34, "Coroa Vermelha Village", "Brazil", "mesoamerican", -16.33, -39.01, 1600, "neutral"))
]);

const NORTHWEST_COAST_PORTS = Object.freeze([
  Object.freeze({
    ...port(44, "Yuquot Village", "Nuu-chah-nulth", "mesoamerican", 49.59, -126.62, 1500, "neutral"),
    settlementType: "village",
    manualRegion: "northwest-coast",
    npcInterregionalTradeExcluded: true
  }),
  Object.freeze({
    ...port(45, "Ozette Village", "Makah", "mesoamerican", 48.15, -124.73, 1000, "neutral"),
    settlementType: "village",
    manualRegion: "northwest-coast",
    npcInterregionalTradeExcluded: true
  })
]);
const ALL_TEST_FISHING_GROUNDS_NAVIGABLE = () => true;

test("every NPC route hull is included in the sprite preload roster", () => {
  assert.ok(NPC_SHIP_SLUGS.includes("small-cog"));
  assert.ok(NPC_SHIP_SLUGS.includes("kelulus"));
  assert.ok(NPC_SHIP_SLUGS.includes("galleass"));
  for (const slug of NPC_SHIP_SLUGS) shipStatsForSlug(slug);
});

test("fleet-origin weights preserve every port while favoring active sailing origins", () => {
  const weights = npcFleetOriginWeightsForPorts(PORTS);
  assert.equal(weights.size, PORTS.length);
  assert.ok([...weights.values()].every((weight) => Number.isFinite(weight) && weight >= 1));
  assert.ok([...weights.values()].some((weight) => weight > 1));

  assert.throws(
    () => npcFleetOriginWeightsForPorts([PORTS[0], { ...PORTS[1], tileId: PORTS[0].tileId }]),
    /duplicate port tile/i
  );
});

test("voyage seeds vary NPC traffic while remaining deterministic", () => {
  const createSeededRoutes = (seedKey) => createNpcSeaRouteSystem({
    ports: PORTS,
    startMinute: 0,
    economy: createWorldEconomy({ ports: PORTS, startMinute: 0, seedKey }),
    seedKey
  });
  const first = createSeededRoutes("voyage-one");
  const repeated = createSeededRoutes("voyage-one");
  const second = createSeededRoutes("voyage-two");

  assert.deepEqual(snapshotNpcSeaRouteSystem(first), snapshotNpcSeaRouteSystem(repeated));
  assert.notDeepEqual(snapshotNpcSeaRouteSystem(first).ships, snapshotNpcSeaRouteSystem(second).ships);
});

test("initial fleet phasing never reports diplomatic contacts before the voyage begins", () => {
  const startMinute = 79 * 24 * 60 + 10 * 60;
  const economy = createWorldEconomy({ ports: PORTS, startMinute });
  const calls = [];
  const routes = createNpcSeaRouteSystem({
    ports: PORTS,
    startMinute,
    economy,
    onForeignPortCall: (visitingFactionId, portFactionId, minute) => {
      calls.push({ visitingFactionId, portFactionId, minute });
    }
  });

  for (let day = 20; day <= 180; day += 20) {
    updateNpcSeaRouteSystem(routes, startMinute + day * 24 * 60);
  }
  assert.ok(calls.length > 0);
  assert.ok(calls.every((call) => call.minute >= startMinute));
});

test("eastbound Malacca routes go around the Malay Peninsula through Singapore", () => {
  const economy = createWorldEconomy({ ports: PORTS, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports: PORTS, startMinute: 0, economy });
  const malacca = routes.ports.find((port) => port.city === "Malacca");
  const guangzhou = routes.ports.find((port) => port.city === "Guangzhou");
  assert.ok(malacca);
  assert.ok(guangzhou);
  assert.deepEqual(malacca.routeAnchors, ["malacca"]);

  const route = routeBetweenPorts(routes, malacca, guangzhou, "small-junk", 0);
  const sailPairs = route.segments
    .filter((segment) => segment.kind === "sail")
    .map((segment) => `${segment.from.id}->${segment.to.id}`);

  assert.ok(sailPairs.includes("malacca->singapore"), sailPairs.join(", "));
  assert.ok(sailPairs.some((pair) => pair.startsWith("singapore->")), sailPairs.join(", "));
  assert.ok(sailPairs.every((pair) => ![
    "malacca->canton",
    "malacca->manila",
    "canton->malacca",
    "manila->malacca"
  ].includes(pair)), sailPairs.join(", "));
});

test("a founded American port becomes an NPC sea-lane destination", () => {
  const economy = createWorldEconomy({ ports: PORTS, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports: PORTS, startMinute: 0, economy });
  const colony = port(99, "Port Royal", "Canada", "northern-european", 44.74, -65.52, 2400, "france");
  const added = addNpcSeaRoutePort(routes, colony);

  assert.equal(added.routeRegion, "americas");
  assert.ok(added.routeAnchors.length > 0);
  assert.throws(() => addNpcSeaRoutePort(routes, colony), /already exists/);
});

test("a developed village becomes a city in NPC sea routes", () => {
  const village = nativeVillage(port(
    99,
    "Nagasaki",
    "Japan",
    "east-asian",
    32.75,
    129.88,
    600,
    "japan"
  ));
  const economy = createWorldEconomy({ ports: PORTS, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports: PORTS, startMinute: 0, economy });
  addNpcSeaRoutePort(routes, village);
  const city = { ...village, settlementType: "city", population: 2400 };

  replaceNpcSeaRoutePort(routes, city);

  assert.equal(npcSeaRoutePortSettlementType(routes, city), "city");
  assert.equal(routes.ports.filter((port) => port.tileId === city.tileId).length, 1);
});

test("a collapsed empire loses its NPC fleet and captured port ownership", () => {
  const economy = createWorldEconomy({ ports: PORTS, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports: PORTS, startMinute: 0, economy });
  assert.ok(routes.ships.some((ship) => ship.factionId === "portugal"));
  const factionByTileId = new Map(PORTS.map((entry) => [
    entry.tileId,
    entry.tileId === 1 ? "england" : entry.factionId === "portugal" ? "neutral" : entry.factionId
  ]));
  applyNpcConquestOwnership(routes, factionByTileId, new Set(["portugal"]));
  assert.equal(routes.ports.find((entry) => entry.tileId === 1).factionId, "england");
  assert.equal(routes.ports.find((entry) => entry.tileId === 5).factionId, "neutral");
  assert.equal(routes.ships.some((ship) => ship.factionId === "portugal"), false);
});

test("NPC merchants carry finite cargo and realize profits over repeated port calls", () => {
  const economy = createWorldEconomy({ ports: PORTS, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports: PORTS, startMinute: 0, economy });

  assert.ok(routes.ships.length > 0);
  assert.ok(routes.ships.some((ship) => (
    ship.factionId === "portugal" && ship.slug === "portuguese-carrack"
  )));
  assert.ok(routes.ships.some((ship) => cargoUnits(ship) > 0));
  for (const ship of routes.ships) {
    assert.ok(ship.specie >= 0);
    assert.ok(cargoUnits(ship) <= ship.cargoCapacity);
  }

  for (let day = 1; day <= 180; day++) {
    const minute = day * 24 * 60;
    advanceWorldEconomy(economy, minute);
    updateNpcSeaRouteSystem(routes, minute);
  }

  assert.ok(routes.ships.some((ship) => ship.lifetimeProfit > 0));
  for (const ship of routes.ships) {
    assert.ok(Number.isFinite(ship.lifetimeProfit));
    assert.ok(ship.specie >= 0);
    assert.ok(cargoUnits(ship) <= ship.cargoCapacity);
  }
});

test("foreign NPC port calls report the visiting and host factions", () => {
  const economy = createWorldEconomy({ ports: PORTS, startMinute: 0 });
  const calls = [];
  const routes = createNpcSeaRouteSystem({
    ports: PORTS,
    startMinute: 0,
    economy,
    onForeignPortCall: (visitingFactionId, portFactionId, simMinute) => {
      if (visitingFactionId !== portFactionId &&
          visitingFactionId !== "neutral" && portFactionId !== "neutral" &&
          visitingFactionId !== "pirate" && portFactionId !== "pirate") {
        calls.push({ visitingFactionId, portFactionId, simMinute });
      }
    }
  });

  for (let day = 1; day <= 180; day++) updateNpcSeaRouteSystem(routes, day * 24 * 60);

  assert.ok(calls.length > 0);
  assert.ok(calls.every((call) => call.visitingFactionId !== call.portFactionId));
  assert.ok(calls.every((call) => Number.isFinite(call.simMinute)));
});

test("NPC fleets favor merchants and inexpensive role-appropriate hulls", () => {
  const economy = createWorldEconomy({ ports: PORTS, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports: PORTS, startMinute: 0, economy });
  const counts = { merchant: 0, fisherman: 0, warship: 0, pirate: 0 };
  let cheap = 0;
  let expensive = 0;
  const fishermanNetIds = new Set();

  for (const ship of routes.ships) {
    counts[ship.role] += 1;
    const stats = shipStatsForSlug(ship.slug);
    if (stats.mass <= 155) cheap += 1;
    if (stats.mass >= 260) expensive += 1;
    if (ship.role === NPC_ROLE_PIRATE) {
      assert.equal(ship.factionId, PIRATE_FACTION_ID);
      assert.ok(
        PIRATE_SHIP_SLUGS.includes(ship.slug) || JAPANESE_SHIP_SLUGS.includes(ship.slug)
      );
    } else if (ship.role === NPC_ROLE_WARSHIP) {
      assert.ok(navalWeaponForShip({ cultureType: ship.cultureType, cannons: stats.cannons }));
      assert.notEqual(ship.factionId, PIRATE_FACTION_ID);
    } else if (ship.role === NPC_ROLE_FISHERMAN) {
      assert.equal(stats.cannons <= 4, true);
      assert.notEqual(ship.factionId, PIRATE_FACTION_ID);
      fishingNetById(ship.fishingNetId);
      fishermanNetIds.add(ship.fishingNetId);
    } else {
      assert.equal(ship.role, NPC_ROLE_MERCHANT);
      assert.notEqual(ship.factionId, PIRATE_FACTION_ID);
    }
  }

  assert.ok(counts.merchant > counts.fisherman, JSON.stringify(counts));
  assert.ok(counts.merchant > counts.warship + counts.pirate, JSON.stringify(counts));
  assert.ok(counts.fisherman > 0, JSON.stringify(counts));
  assert.ok(fishermanNetIds.size >= 2, JSON.stringify([...fishermanNetIds]));
  assert.ok(counts.warship > counts.pirate, JSON.stringify(counts));
  assert.ok(counts.pirate / routes.ships.length <= 0.06, JSON.stringify(counts));
  assert.ok(cheap > expensive, JSON.stringify({ cheap, expensive }));
});

test("every NPC ship originating in a Japanese city uses the complete local roster", () => {
  const ports = [
    ...PORTS,
    port(40, "Kyoto", "Japan", "east-asian", 35.01, 135.77, 100000, "japan"),
    port(41, "Nagasaki", "Japan", "east-asian", 32.75, 129.88, 30000, "japan"),
    port(42, "Sakai", "Japan", "east-asian", 34.58, 135.47, 50000, "japan")
  ];
  const seenHulls = new Set();
  let japaneseOrigins = 0;

  for (let sample = 0; sample < 12; sample++) {
    const seedKey = `japanese-roster-${sample}`;
    const economy = createWorldEconomy({ ports, startMinute: 0, seedKey });
    const routes = createNpcSeaRouteSystem({ ports, startMinute: 0, economy, seedKey });
    for (const ship of routes.ships) {
      if (ship.plan?.origin?.factionId !== "japan") continue;
      japaneseOrigins++;
      seenHulls.add(ship.slug);
      assert.ok(
        JAPANESE_SHIP_SLUGS.includes(ship.slug),
        `${ship.profileId} ${ship.role} spawned ${ship.slug} in ${ship.plan.origin.city}`
      );
    }
  }

  assert.ok(japaneseOrigins > 0);
  assert.deepEqual([...seenHulls].sort(), [...JAPANESE_SHIP_SLUGS].sort());
});

test("a sparse dedicated whaling fleet hunts real whales without fishing nets", () => {
  const ports = [
    ...PORTS,
    port(40, "London", "England", "northern-european", 51.5, -0.1, 100000, "england"),
    port(41, "Reykjavik", "Iceland", "northern-european", 64.15, -21.94, 5000, "denmark-norway"),
    port(42, "Kyoto", "Japan", "east-asian", 35.01, 135.77, 100000, "japan"),
    port(43, "Nagasaki", "Japan", "east-asian", 32.75, 129.88, 30000, "japan"),
    ...NORTHWEST_COAST_PORTS
  ];
  const whaleMemory = createWhaleMemory();
  seedWhalePopulation(whaleMemory, whalingCandidates(), 320);
  const economy = createWorldEconomy({ ports, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports, startMinute: 0, economy, whaleMemory });
  const whalers = routes.ships.filter((ship) => ship.role === NPC_ROLE_WHALER);

  assert.equal(whalers.length, NPC_WHALER_FLEET_TARGET);
  assert.equal(whalers.filter((ship) => ship.profileId === "north-atlantic-whalers").length, 2);
  assert.equal(whalers.filter((ship) => ship.profileId === "japanese-coastal-whalers").length, 2);
  assert.equal(whalers.filter((ship) => ship.profileId === "northwest-coast-whalers").length, 1);
  assert.ok(whalers
    .filter((ship) => ship.profileId === "japanese-coastal-whalers")
    .every((ship) => ship.slug === "japanese-kuribune"));
  assert.ok(whalers
    .filter((ship) => ship.profileId === "northwest-coast-whalers")
    .every((ship) => ship.slug === "mesoamerican-dugout-canoe"));
  assert.ok(whalers.every((ship) => ship.fishingNetId === null));
  assert.ok(whalers.every((ship) => (
    ship.currentPort.isWhalingGround ||
    ship.plan.destination.isWhalingGround ||
    (ship.cargo["whale-blubber"] || 0) > 0
  )));
  assert.ok(whaleMemory.individuals.filter((whale) => whale.phase === "dead").length <= NPC_WHALER_FLEET_TARGET);
});

test("Northwest Coast fishing grounds share Yuquot's seasonal sea lane", () => {
  const ports = [...PORTS, ...NORTHWEST_COAST_PORTS];
  const fishState = createGameState({ cargoCapacity: 20 });
  const economy = createWorldEconomy({ ports, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({
    ports,
    startMinute: 0,
    economy,
    fishState,
    fishingGroundIsNavigable: ALL_TEST_FISHING_GROUNDS_NAVIGABLE
  });
  const northwestGrounds = routes.fishingGrounds.filter((ground) => (
    ground.lat >= 40 && ground.lat <= 61 &&
    ground.lon >= -150 && ground.lon <= -118
  ));
  const offshoreGround = northwestGrounds.find((ground) => ground.lon < -126.7);
  const yuquot = routes.ports.find((candidate) => candidate.city === "Yuquot Village");

  assert.ok(northwestGrounds.length > 0, "expected generated Northwest Coast fishing grounds");
  assert.ok(northwestGrounds.every((ground) => (
    ground.routeAnchors.length === 1 && ground.routeAnchors[0] === "yuquot"
  )));
  assert.ok(offshoreGround, "expected an offshore fishing ground west of Yuquot");
  assert.ok(yuquot);
  assert.doesNotThrow(() => (
    routeBetweenPorts(routes, offshoreGround, yuquot, "mesoamerican-dugout-canoe", 0)
  ));
});

test("NPC fishing grounds require and obey the world navigability resolver", () => {
  const fishState = createGameState({ cargoCapacity: 20 });
  const economy = createWorldEconomy({ ports: PORTS, startMinute: 0 });
  assert.throws(
    () => createNpcSeaRouteSystem({ ports: PORTS, startMinute: 0, economy, fishState }),
    /navigable-water resolver/i
  );

  let inspected = 0;
  const routes = createNpcSeaRouteSystem({
    ports: PORTS,
    startMinute: 0,
    economy,
    fishState,
    fishingGroundIsNavigable: (point) => {
      inspected++;
      return point.lon >= 0;
    }
  });

  assert.ok(inspected > routes.fishingGrounds.length);
  assert.ok(routes.fishingGrounds.length > 0);
  assert.ok(routes.fishingGrounds.every((ground) => ground.lon >= 0));
});

test("isolated Northwest Coast fishers stay inside the Yuquot sea-lane component", () => {
  const ports = [...PORTS, ...NORTHWEST_COAST_PORTS];
  const fishState = createGameState({ cargoCapacity: 20 });
  const economy = createWorldEconomy({ ports, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({
    ports,
    startMinute: 0,
    economy,
    fishState,
    fishingGroundIsNavigable: ALL_TEST_FISHING_GROUNDS_NAVIGABLE
  });
  const yuquot = routes.ports.find((port) => port.city === "Yuquot Village");
  assert.ok(yuquot);
  const fisherman = configureNpcRouteEncounter(routes, {
    id: "yuquot-fishing-regression",
    originPortId: yuquot.tileId,
    factionId: "neutral",
    role: NPC_ROLE_FISHERMAN,
    profileId: "mesoamerican-coast",
    mode: "regional",
    shipSlug: "mesoamerican-dugout-canoe"
  }, 0);

  assert.equal(fisherman.plan.destination.isFishingGround, true);
  assert.deepEqual(fisherman.plan.destination.routeAnchors, ["yuquot"]);
  updateNpcSeaRouteEvents(
    routes,
    Math.ceil(fisherman.plan.endMinute + 1),
    [fisherman.id]
  );
  assert.equal(fisherman.currentPort.isFishingGround, true);
  assert.ok(fisherman.plan.destination.routeAnchors.includes("yuquot"));
});

test("Pacific villages get a visible regional fishing and trading fleet", () => {
  const ports = [...PORTS, ...PACIFIC_PORTS];
  const economy = createWorldEconomy({ ports, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports, startMinute: 0, economy });
  const pacificShips = routes.ships.filter((ship) => ship.profileId === "pacific-islands");

  assert.ok(pacificShips.length > 0);
  assert.ok(pacificShips.length <= NPC_PACIFIC_FLEET_TARGET);
  assert.ok(pacificShips.length >= PACIFIC_PORTS.length);
  assert.deepEqual(
    [...new Set(pacificShips.map((ship) => ship.plan.origin.tileId))].sort((a, b) => a - b),
    PACIFIC_PORTS.map((portSpec) => portSpec.tileId).sort((a, b) => a - b)
  );
  assert.ok(pacificShips.every((ship) => ship.slug === "polynesian-voyaging-canoe"));
  assert.ok(pacificShips.every((ship) => ship.cultureType === "polynesian"));
  assert.ok(routes.ships.filter((ship) => ship.currentPort?.cityType === "polynesian").every((ship) => ship.profileId === "pacific-islands"));
  assert.ok(routes.ports.filter((port) => port.routeRegion === "polynesia").length >= PACIFIC_PORTS.length);
  assert.ok(pacificShips.some((ship) => ship.role === NPC_ROLE_FISHERMAN));
  assert.ok(pacificShips.some((ship) => ship.role === NPC_ROLE_MERCHANT));
});

test("continued voyages receive the expanded Pacific canoe fleet", () => {
  const ports = [...PORTS, ...PACIFIC_PORTS];
  const economy = createWorldEconomy({ ports, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports, startMinute: 0, economy });
  const snapshot = snapshotNpcSeaRouteSystem(routes);
  snapshot.ships = snapshot.ships.filter((ship) => (
    ship.profileId !== "pacific-islands" || Number(ship.id.split("-").at(-1)) < PACIFIC_PORTS.length
  ));

  restoreNpcSeaRouteSystem(routes, snapshot, { economy });

  const pacificShips = routes.ships.filter((ship) => ship.profileId === "pacific-islands");
  assert.equal(pacificShips.length, PACIFIC_PORTS.length * 2);
  assert.ok(pacificShips.some((ship) => ship.role === NPC_ROLE_FISHERMAN));
  assert.ok(pacificShips.some((ship) => ship.role === NPC_ROLE_MERCHANT));
});

test("regional Pacific fishers do not chase richer grounds across another sea region", () => {
  const hawaii = Object.freeze({
    ...port(24, "Hawaii Village", "Hawaii", "polynesian", 19.48, -155.92, 3500, "neutral"),
    settlementType: "village",
    manualRegion: "pacific-islands"
  });
  const ports = [...PORTS, ...PACIFIC_PORTS, hawaii, ...NORTHWEST_COAST_PORTS];
  const fishState = createGameState({ cargoCapacity: 20 });
  const economy = createWorldEconomy({ ports, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({
    ports,
    startMinute: 0,
    economy,
    fishState,
    fishingGroundIsNavigable: ALL_TEST_FISHING_GROUNDS_NAVIGABLE
  });
  const pacificFishers = routes.ships.filter((ship) => (
    ship.profileId === "pacific-islands" && ship.role === NPC_ROLE_FISHERMAN
  ));

  assert.ok(pacificFishers.length > 0);
  assert.ok(pacificFishers.every((ship) => ship.plan.destination.routeRegion === "polynesia"));

  const hawaiiPort = routes.ports.find((portSpec) => portSpec.tileId === hawaii.tileId);
  const fisherman = configureNpcRouteEncounter(routes, {
    id: "hawaii-fishing-route-regression",
    originPortId: hawaiiPort.tileId,
    factionId: "neutral",
    role: NPC_ROLE_FISHERMAN,
    profileId: "pacific-islands",
    mode: "regional",
    shipSlug: "polynesian-voyaging-canoe"
  }, 0);
  const fishingGround = fisherman.plan.destination;
  updateNpcSeaRouteEvents(
    routes,
    Math.ceil(fisherman.plan.endMinute + 1),
    [fisherman.id]
  );

  assert.equal(fisherman.currentPort.tileId, fishingGround.tileId);
  assert.equal(fisherman.plan.destination.cityType, "polynesian");
  assert.ok(fisherman.currentPort.routeAnchors.some((anchorId) => (
    fisherman.plan.destination.routeAnchors.includes(anchorId)
  )));
});

test("saved Pacific fishermen abandon obsolete routes to another sea-lane region", () => {
  const hawaii = Object.freeze({
    ...port(24, "Hawaii Village", "Hawaii", "polynesian", 19.48, -155.92, 3500, "neutral"),
    settlementType: "village",
    manualRegion: "pacific-islands"
  });
  const ports = [...PORTS, ...PACIFIC_PORTS, hawaii, ...NORTHWEST_COAST_PORTS];
  const fishState = createGameState({ cargoCapacity: 20 });
  const economy = createWorldEconomy({ ports, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({
    ports,
    startMinute: 0,
    economy,
    fishState,
    fishingGroundIsNavigable: ALL_TEST_FISHING_GROUNDS_NAVIGABLE
  });
  const snapshot = snapshotNpcSeaRouteSystem(routes);
  const saved = snapshot.ships.find((ship) => (
    ship.profileId === "pacific-islands" && ship.role === NPC_ROLE_FISHERMAN
  ));
  const hawaiiPort = routes.ports.find((portSpec) => portSpec.tileId === hawaii.tileId);
  const obsoleteGround = routes.fishingGrounds.find((ground) => (
    ground.routeAnchors.length === 1 && ground.routeAnchors[0] === "yuquot"
  ));
  assert.ok(saved);
  assert.ok(hawaiiPort);
  assert.ok(obsoleteGround);
  saved.currentPort = { ...hawaiiPort };
  saved.finalDestination = null;
  saved.plan = {
    origin: { ...hawaiiPort },
    destination: { ...obsoleteGround },
    segments: [{
      kind: "sail",
      from: { ...hawaiiPort },
      to: { ...obsoleteGround },
      startMinute: 0,
      endMinute: 60
    }],
    startMinute: 0,
    endMinute: 60
  };

  restoreNpcSeaRouteSystem(routes, snapshot, { economy, fishState });

  const restored = routes.shipById.get(saved.id);
  assert.equal(restored.currentPort.tileId, hawaii.tileId);
  assert.equal(restored.plan.destination.routeRegion, "polynesia");
  assert.ok(restored.currentPort.routeAnchors.some((anchorId) => (
    restored.plan.destination.routeAnchors.includes(anchorId)
  )));
});

test("saved Mesoamerican fishermen abandon obsolete Northwest Coast routes", () => {
  const ports = [...PORTS, ...MESOAMERICAN_PORTS, ...NORTHWEST_COAST_PORTS];
  const fishState = createGameState({ cargoCapacity: 20 });
  const economy = createWorldEconomy({ ports, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({
    ports,
    startMinute: 0,
    economy,
    fishState,
    fishingGroundIsNavigable: ALL_TEST_FISHING_GROUNDS_NAVIGABLE
  });
  const snapshot = snapshotNpcSeaRouteSystem(routes);
  const saved = snapshot.ships.find((ship) => (
    ship.profileId === "mesoamerican-coast" && ship.role === NPC_ROLE_FISHERMAN
  ));
  const cuzamil = routes.ports.find((portSpec) => portSpec.city === "Cuzamil");
  const obsoleteGround = routes.fishingGrounds.find((ground) => (
    ground.routeAnchors.length === 1 && ground.routeAnchors[0] === "yuquot"
  ));
  assert.ok(saved);
  assert.ok(cuzamil);
  assert.ok(obsoleteGround);
  saved.currentPort = { ...cuzamil };
  saved.finalDestination = null;
  saved.plan = {
    origin: { ...cuzamil },
    destination: { ...obsoleteGround },
    segments: [{
      kind: "sail",
      from: { ...cuzamil },
      to: { ...obsoleteGround },
      startMinute: 0,
      endMinute: 60
    }],
    startMinute: 0,
    endMinute: 60
  };

  restoreNpcSeaRouteSystem(routes, snapshot, { economy, fishState });

  const restored = routes.shipById.get(saved.id);
  assert.equal(restored.currentPort.tileId, cuzamil.tileId);
  assert.ok(!restored.plan.destination.routeAnchors.includes("yuquot"));
});

test("Southeast Asian traffic includes the regional Malay fleet", () => {
  const ports = [
    ...PORTS,
    port(10, "Aceh", "Indonesia", "southeast-asian", 5.55, 95.32, 35000, "neutral")
  ];
  const economy = createWorldEconomy({ ports, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports, startMinute: 0, economy });
  const regionalShips = routes.ships.filter((ship) => ship.profileId === "southeast-asia");

  assert.ok(regionalShips.length > 0);
  assert.ok(regionalShips.some((ship) => ship.slug === "kelulus"));
  assert.ok(regionalShips.some((ship) => (
    ship.slug === "penjajap" ||
    ship.slug === "lancaran" ||
    ship.slug === "royal-lancaran"
  )));
  assert.ok(regionalShips
    .filter((ship) => ["kelulus", "penjajap", "lancaran", "royal-lancaran"].includes(ship.slug))
    .every((ship) => ship.cultureType === "southeast-asian"));
  assert.ok(routes.ships
    .filter((ship) => ship.profileId === "indian-ocean")
    .every((ship) => !["kelulus", "penjajap", "lancaran", "royal-lancaran"].includes(ship.slug)));
  assert.ok(NPC_SHIP_SLUGS.includes("ocean-dhow"));
});

test("independent Mesoamerican villages get a sparse dugout-canoe fishing fleet", () => {
  const conqueredCity = port(35, "Mexico City", "Mexico", "mesoamerican", 19.43, -99.13, 70000, "spain");
  const ports = [...PORTS, ...MESOAMERICAN_PORTS, conqueredCity];
  const economy = createWorldEconomy({ ports, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports, startMinute: 0, economy });
  const nativeShips = routes.ships.filter((ship) => ship.profileId === "mesoamerican-coast");

  assert.ok(nativeShips.length > 0);
  assert.ok(nativeShips.length <= 7);
  assert.ok(nativeShips.every((ship) => ship.slug === "mesoamerican-dugout-canoe"));
  assert.ok(nativeShips.every((ship) => ship.cultureType === "mesoamerican"));
  assert.ok(nativeShips.every((ship) => ship.factionId === "neutral"));
  assert.ok(
    nativeShips.filter((ship) => ship.role === NPC_ROLE_MERCHANT).every((ship) =>
      [ship.currentPort, ship.plan.destination].every((stop) =>
        stop.isFishingGround || stop.settlementType === "village"
      )
    )
  );
  assert.ok(nativeShips.some((ship) => ship.role === NPC_ROLE_FISHERMAN));
  assert.ok(nativeShips.some((ship) => ship.role === NPC_ROLE_MERCHANT));
  assert.ok(nativeShips.every((ship) => ship.role !== NPC_ROLE_PIRATE));
});

test("NPC route snapshots restore ships, plans, and replacement queues without caches", () => {
  const economy = createWorldEconomy({ ports: PORTS, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports: PORTS, startMinute: 0, economy });
  const lost = routes.ships.find((ship) => ship.role === NPC_ROLE_MERCHANT);
  sinkNpcShip(routes, lost.id, 1000);
  routes.pirateHideoutDangerUntil.set(PORTS[0].tileId, 5555);
  const snapshot = snapshotNpcSeaRouteSystem(routes);
  assert.equal(snapshot.version, NPC_SEA_ROUTE_SNAPSHOT_VERSION);

  updateNpcSeaRouteSystem(routes, 2000);
  routes.pirateHideoutDangerUntil.clear();
  routes.routeCache.set("discard-me", []);
  restoreNpcSeaRouteSystem(routes, snapshot, { economy });

  assert.deepEqual(routes.ships, snapshot.ships);
  assert.deepEqual(routes.replacementQueue, snapshot.replacementQueue);
  assert.equal(routes.pirateHideoutDangerUntil.get(PORTS[0].tileId), 5555);
  assert.equal(routes.routeCache.size, 0);
  assert.equal(routes.shipById.size, routes.ships.length);
});

test("visual navigation cleanup tolerates a ship sunk earlier in the same frame", () => {
  const economy = createWorldEconomy({ ports: PORTS, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports: PORTS, startMinute: 0, economy });
  const lost = routes.ships.find((ship) => ship.role === NPC_ROLE_MERCHANT);
  const position = [1, 0, 0];
  const heading = [0, 1, 0];
  setNpcShipVisualNavigation(routes, lost.id, position, heading);

  sinkNpcShip(routes, lost.id, 1000);

  assert.equal(releaseNpcShipVisualNavigation(routes, lost.id, 1000, position), false);
});

test("visual navigation does not replace an NPC ship's strategic route target", () => {
  const economy = createWorldEconomy({ ports: PORTS, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports: PORTS, startMinute: 0, economy });
  const ship = routes.ships.find((candidate) => (
    candidate.plan?.segments.some((segment) => segment.kind === "sail")
  ));
  const segment = ship.plan.segments.find((candidate) => candidate.kind === "sail");
  const effectiveMinute = (segment.startMinute + segment.endMinute) / 2;
  const clockMinute = effectiveMinute - ship.clockOffsetMinutes;
  const before = npcShipSnapshots(routes, clockMinute).find((snapshot) => snapshot.id === ship.id);
  assert.ok(before);

  const visualPosition = before.routeVector.map((coordinate) => -coordinate);
  setNpcShipVisualNavigation(routes, ship.id, visualPosition, before.routeHeading);
  const after = npcShipSnapshots(routes, clockMinute).find((snapshot) => snapshot.id === ship.id);

  assert.deepEqual(after.routeVector, before.routeVector);
  assert.deepEqual(after.routeHeading, before.routeHeading);
  assert.notDeepEqual(after.routeVector, visualPosition);
});

test("version 1 NPC routes transfer retired Aztec ships to Spain", () => {
  const economy = createWorldEconomy({ ports: PORTS, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports: PORTS, startMinute: 0, economy });
  const snapshot = snapshotNpcSeaRouteSystem(routes);
  snapshot.version = 1;
  snapshot.ships[0].factionId = "aztec";

  restoreNpcSeaRouteSystem(routes, snapshot, { economy });

  assert.equal(routes.shipById.get(snapshot.ships[0].id).factionId, "spain");
});

test("NPC route snapshots preserve planless pirates hidden at a hideout", () => {
  const economy = createWorldEconomy({ ports: PORTS, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports: PORTS, startMinute: 0, economy });
  const pirate = routes.ships.find((ship) => ship.role === NPC_ROLE_PIRATE);
  const hideout = routes.pirateHideouts[0];
  assert.ok(pirate);
  assert.ok(hideout);
  pirate.currentPort = hideout;
  pirate.finalDestination = null;
  pirate.plan = null;
  pirate.hiddenAtHideout = true;
  pirate.hiddenUntilMinute = 5000;

  const snapshot = snapshotNpcSeaRouteSystem(routes);
  restoreNpcSeaRouteSystem(routes, snapshot, { economy });

  const restored = routes.shipById.get(pirate.id);
  assert.equal(restored.hiddenAtHideout, true);
  assert.equal(restored.plan, null);
  assert.equal(restored.currentPort.tileId, hideout.tileId);
  assert.deepEqual(
    npcSeaRouteEventSchedule(routes).find((event) => event.id === restored.id),
    { id: restored.id, minute: restored.hiddenUntilMinute }
  );
});

test("saved routes retain generated fishing grounds that leave the current top set", () => {
  const fishState = createGameState({ cargoCapacity: 20 });
  const economy = createWorldEconomy({ ports: PORTS, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({
    ports: PORTS,
    startMinute: 0,
    economy,
    fishState,
    fishingGroundIsNavigable: ALL_TEST_FISHING_GROUNDS_NAVIGABLE
  });
  const snapshot = snapshotNpcSeaRouteSystem(routes);
  const saved = snapshot.ships.find((ship) => ship.plan?.destination?.isFishingGround);
  assert.ok(saved, "expected a saved fisherman route to generated fishing grounds");
  const savedGround = saved.plan.destination;
  routes.fishingGrounds = routes.fishingGrounds.filter((ground) => ground.tileId !== savedGround.tileId);
  assert.equal(routes.fishingGrounds.some((ground) => ground.tileId === savedGround.tileId), false);

  restoreNpcSeaRouteSystem(routes, snapshot, { economy, fishState });

  const restoredGround = routes.fishingGrounds.find((ground) => ground.tileId === savedGround.tileId);
  const restoredShip = routes.shipById.get(saved.id);
  assert.ok(restoredGround);
  assert.equal(restoredShip.plan.destination, restoredGround);
  assert.deepEqual(restoredGround.habitat, savedGround.habitat);
});

test("saved fishing routes reject grounds that are no longer navigable", () => {
  const fishState = createGameState({ cargoCapacity: 20 });
  const economy = createWorldEconomy({ ports: PORTS, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({
    ports: PORTS,
    startMinute: 0,
    economy,
    fishState,
    fishingGroundIsNavigable: ALL_TEST_FISHING_GROUNDS_NAVIGABLE
  });
  const snapshot = snapshotNpcSeaRouteSystem(routes);
  const saved = snapshot.ships.find((ship) => ship.plan?.destination?.isFishingGround);
  assert.ok(saved, "expected a saved fisherman route to generated fishing grounds");
  const savedGroundId = saved.plan.destination.tileId;
  routes.fishingGrounds = routes.fishingGrounds.filter((ground) => ground.tileId !== savedGroundId);
  routes.fishingGroundIsNavigable = () => false;

  assert.throws(
    () => restoreNpcSeaRouteSystem(routes, snapshot, { economy, fishState }),
    /fishing ground is no longer navigable/i
  );
});

test("NPC route snapshots reject planless ships outside pirate hideouts", () => {
  const economy = createWorldEconomy({ ports: PORTS, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports: PORTS, startMinute: 0, economy });
  const snapshot = snapshotNpcSeaRouteSystem(routes);
  const ship = snapshot.ships.find((candidate) => !candidate.hiddenAtHideout);
  assert.ok(ship);
  ship.plan = null;

  assert.throws(
    () => restoreNpcSeaRouteSystem(routes, snapshot, { economy }),
    new RegExp(`Saved NPC ship has no route plan: ${ship.id}`)
  );
});

test("saved routes using removed Malacca crossings are replanned on restore", (t) => {
  const economy = createWorldEconomy({ ports: PORTS, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports: PORTS, startMinute: 0, economy });
  const snapshot = snapshotNpcSeaRouteSystem(routes);
  const saved = snapshot.ships[0];
  const malacca = routes.ports.find((port) => port.city === "Malacca");
  const guangzhou = routes.ports.find((port) => port.city === "Guangzhou");
  const malaccaNode = routes.laneNodes.get("malacca");
  const cantonNode = routes.laneNodes.get("canton");
  assert.ok(malacca);
  assert.ok(guangzhou);
  assert.ok(malaccaNode);
  assert.ok(cantonNode);
  saved.currentPort = { ...malacca, routeAnchors: ["malacca", "sunda"] };
  saved.finalDestination = null;
  saved.plan = {
    origin: malacca,
    destination: guangzhou,
    segments: [{
      kind: "sail",
      from: malaccaNode,
      to: cantonNode,
      startMinute: 0,
      endMinute: 1000
    }],
    startMinute: 0,
    endMinute: 1000
  };
  saved.visualNavigation = {
    vector: [1, 0, 0],
    heading: [0, 1, 0]
  };
  const messages = [];
  t.mock.method(console, "info", (...args) => messages.push(args));

  restoreNpcSeaRouteSystem(routes, snapshot, { economy });

  const restored = routes.shipById.get(saved.id);
  const sailPairs = restored.plan.segments
    .filter((segment) => segment.kind === "sail")
    .map((segment) => `${segment.from.id}->${segment.to.id}`);
  assert.ok(sailPairs.includes("malacca->singapore"), sailPairs.join(", "));
  assert.deepEqual(restored.currentPort.routeAnchors, ["malacca"]);
  assert.equal(restored.visualNavigation, null);
  assert.equal(messages.length, 1);
  assert.match(messages[0][0], /Replanned 1 saved NPC routes/);
});

test("NPC traders obey diplomacy and sovereign market permissions", () => {
  const economy = createWorldEconomy({ ports: PORTS, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports: PORTS, startMinute: 0, economy });

  for (let day = 0; day <= 180; day++) {
    const minute = day * 24 * 60;
    if (day > 0) {
      advanceWorldEconomy(economy, minute);
      updateNpcSeaRouteSystem(routes, minute);
    }
    for (const ship of routes.ships.filter((item) => (
      item.role === NPC_ROLE_MERCHANT || item.role === NPC_ROLE_FISHERMAN
    ))) {
      const plannedPorts = [ship.plan?.destination, ship.finalDestination].filter(Boolean);
      for (const plannedPort of plannedPorts) {
        assert.notEqual(
          diplomacyBetween(ship.factionId, plannedPort.factionId),
          DIPLOMACY_WAR,
          `${ship.id} planned a hostile call at ${plannedPort.city}`
        );
        if (plannedPort.factionId === "ming") {
          assert.ok(
            ship.factionId === "ming" || ship.factionId === "joseon",
            `${ship.id} planned unauthorized foreign trade at ${plannedPort.city}`
          );
        }
      }
    }
  }
});

test("NPC traders follow changing diplomacy when selecting later calls", () => {
  const economy = createWorldEconomy({ ports: PORTS, startMinute: 0 });
  let portugalAndSpain = "neutral";
  const relationBetween = (factionAId, factionBId) => {
    if (new Set([factionAId, factionBId]).size === 2 &&
        [factionAId, factionBId].includes("portugal") &&
        [factionAId, factionBId].includes("spain")) return portugalAndSpain;
    return diplomacyBetween(factionAId, factionBId);
  };
  const routes = createNpcSeaRouteSystem({
    ports: PORTS,
    startMinute: 0,
    economy,
    relationBetween
  });
  portugalAndSpain = DIPLOMACY_WAR;

  for (let day = 1; day <= 240; day++) {
    const minute = day * 24 * 60;
    advanceWorldEconomy(economy, minute);
    updateNpcSeaRouteSystem(routes, minute);
  }

  for (const ship of routes.ships.filter((item) => (
    (item.role === NPC_ROLE_MERCHANT || item.role === NPC_ROLE_FISHERMAN) &&
    item.factionId === "portugal"
  ))) {
    const plannedPorts = [ship.plan?.destination, ship.finalDestination].filter(Boolean);
    assert.ok(plannedPorts.every((port) => port.factionId !== "spain"), ship.id);
  }
});

test("NPC fishermen choose generated fishing grounds and deplete them offscreen", () => {
  const fishState = createGameState({ cargoCapacity: 20 });
  const economy = createWorldEconomy({ ports: PORTS, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({
    ports: PORTS,
    startMinute: 0,
    economy,
    fishState,
    fishingGroundIsNavigable: ALL_TEST_FISHING_GROUNDS_NAVIGABLE
  });

  assert.ok(routes.fishingGrounds.length > 0);
  const fisherman = routes.ships.find((ship) => (
    ship.role === NPC_ROLE_FISHERMAN &&
    ship.plan?.destination?.isFishingGround
  ));
  assert.ok(fisherman, "expected at least one fisherman bound for a generated fishing ground");
  const ground = fisherman.plan.destination;
  const stockBefore = Object.values(fishState.memory.fish.stocks)
    .find((stock) => stock.tileId === ground.habitat.tileId)?.population ?? ground.initialPopulation;
  const harvestedBefore = Object.values(fishState.memory.fish.stocks)
    .find((stock) => stock.tileId === ground.habitat.tileId)?.harvested ?? 0;

  updateNpcSeaRouteSystem(routes, Math.ceil(fisherman.plan.endMinute + 1));

  assert.equal(fisherman.currentPort.isFishingGround, true);
  assert.ok((fisherman.cargo.fish || 0) > 0);
  assert.ok((fisherman.cargo.fish || 0) <= npcFishingNetExpectedHaul(fisherman.fishingNetId));
  const stockAfter = Object.values(fishState.memory.fish.stocks)
    .find((stock) => stock.tileId === ground.habitat.tileId);
  assert.ok(stockAfter.harvested > harvestedBefore);
  assert.ok(stockAfter.population < stockAfter.capacity);
  assert.ok(Number.isFinite(stockBefore));
  assert.equal(fisherman.plan.destination.isFishingGround, undefined);
});

test("NPC fishing catches stop at the remaining hull cargo capacity", () => {
  const fishState = createGameState({ cargoCapacity: 20 });
  const economy = createWorldEconomy({ ports: PORTS, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({
    ports: PORTS,
    startMinute: 0,
    economy,
    fishState,
    fishingGroundIsNavigable: ALL_TEST_FISHING_GROUNDS_NAVIGABLE
  });
  const fisherman = routes.ships.find((ship) => (
    ship.role === NPC_ROLE_FISHERMAN &&
    ship.plan?.destination?.isFishingGround
  ));
  assert.ok(fisherman, "expected a fisherman sailing toward a fishing ground");
  fisherman.cargo = { fish: fisherman.cargoCapacity - 1 };
  fisherman.cargoCost = { fish: 0 };

  assert.equal(npcCargoAvailableQuantity(fisherman, "fish"), 1);
  updateNpcSeaRouteSystem(routes, Math.ceil(fisherman.plan.endMinute + 1));

  assert.equal(cargoUnits(fisherman), fisherman.cargoCapacity);
  assert.equal(npcCargoAvailableQuantity(fisherman, "fish"), 0);
});

test("NPC cargo storage accepts only the remaining hull capacity", () => {
  const ship = {
    id: "capacity-test",
    slug: "small-cog",
    cargoCapacity: 4,
    cargo: { fish: 3 },
    cargoCost: { fish: 30 }
  };

  const stored = storeNpcCargo(ship, "cloves", 5, 500, "capacity test");

  assert.equal(stored, 1);
  assert.deepEqual(ship.cargo, { fish: 3, cloves: 1 });
  assert.equal(ship.cargoCost.cloves, 100);
  assert.equal(cargoUnits(ship), ship.cargoCapacity);
});

test("over-capacity NPC cargo is jettisoned with a visible diagnostic", (t) => {
  const warnings = [];
  t.mock.method(console, "warn", (...args) => warnings.push(args));
  const ship = {
    id: "overflow-test",
    slug: "small-cog",
    cargoCapacity: 4,
    cargo: { fish: 3, cloves: 4 },
    cargoCost: { fish: 30, cloves: 400 }
  };

  const report = reconcileNpcCargoCapacity(ship, "test overflow");

  assert.equal(report.beforeUnits, 7);
  assert.ok(report.afterUnits <= ship.cargoCapacity);
  assert.equal(cargoUnits(ship), report.afterUnits);
  assert.equal(Object.values(report.removed).reduce((sum, quantity) => sum + quantity, 0), 3);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0][0], /cargo capacity exceeded/i);
  assert.deepEqual(warnings[0][1], report);
  for (const [goodId, quantity] of Object.entries(ship.cargo)) {
    const originalUnitCost = goodId === "fish" ? 10 : 100;
    assert.equal(ship.cargoCost[goodId], quantity * originalUnitCost);
  }
});

test("over-capacity saved NPC cargo is repaired during restore", (t) => {
  const warnings = [];
  t.mock.method(console, "warn", (...args) => warnings.push(args));
  const economy = createWorldEconomy({ ports: PORTS, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports: PORTS, startMinute: 0, economy });
  const snapshot = snapshotNpcSeaRouteSystem(routes);
  const savedShip = snapshot.ships[0];
  savedShip.cargo = { fish: savedShip.cargoCapacity + 3 };
  savedShip.cargoCost = { fish: (savedShip.cargoCapacity + 3) * 10 };

  restoreNpcSeaRouteSystem(routes, snapshot, { economy });

  const restored = routes.shipById.get(savedShip.id);
  assert.equal(cargoUnits(restored), restored.cargoCapacity);
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0][1].source, "save restore");
});

test("invalid NPC cargo still fails loudly", () => {
  const ship = {
    id: "invalid-cargo-test",
    slug: "small-cog",
    cargoCapacity: 4,
    cargo: { fish: -1 },
    cargoCost: { fish: 0 }
  };

  assert.throws(
    () => reconcileNpcCargoCapacity(ship, "test invalid cargo"),
    /invalid fish cargo/
  );
});

test("surrender transfers stores and grants protection until a safe port", () => {
  const economy = createWorldEconomy({ ports: PORTS, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports: PORTS, startMinute: 0, economy });
  const loser = routes.ships.find((ship) => ship.role === NPC_ROLE_MERCHANT && cargoUnits(ship) > 0);
  const winner = routes.ships.find((ship) => ship.id !== loser?.id && ship.role === NPC_ROLE_PIRATE);
  assert.ok(loser);
  assert.ok(winner);

  const damage = damageNpcShip(routes, loser.id, loser.maxHitPoints - 1);
  assert.equal(damage.shouldSurrender, true);
  const loot = surrenderNpcShip(routes, loser.id, winner.id);
  assert.ok(loot.specie > 0);
  assert.ok(Object.keys(loot.cargo).length > 0);
  assert.equal(loser.specie, 0);
  assert.deepEqual(loser.cargo, {});
  assert.equal(npcShipHasCombatGrace(routes, loser.id), true);

  for (let day = 1; day <= 120 && npcShipHasCombatGrace(routes, loser.id); day++) {
    updateNpcSeaRouteSystem(routes, day * 24 * 60);
  }
  assert.equal(npcShipHasCombatGrace(routes, loser.id), false);
  assert.equal(loser.hitPoints, loser.maxHitPoints);
  assert.ok(loser.currentPort.factionId === loser.factionId || loser.currentPort.factionId === "neutral");
});

test("voluntary surrender preserves an undamaged hull", () => {
  const economy = createWorldEconomy({ ports: PORTS, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports: PORTS, startMinute: 0, economy });
  const loser = routes.ships.find((ship) => ship.role === NPC_ROLE_MERCHANT && cargoUnits(ship) > 0);
  assert.ok(loser);
  const hullBefore = loser.hitPoints;

  surrenderNpcShip(routes, loser.id, null, { preserveHull: true });

  assert.equal(loser.hitPoints, hullBefore);
  assert.equal(npcShipHasCombatGrace(routes, loser.id), true);
});

test("claiming a surrendered hull removes it from traffic and queues a replacement", () => {
  const economy = createWorldEconomy({ ports: PORTS, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports: PORTS, startMinute: 0, economy });
  const loser = routes.ships.find((ship) => ship.role === NPC_ROLE_MERCHANT && cargoUnits(ship) > 0);
  assert.ok(loser);
  const replacementCount = routes.replacementQueue.length;

  surrenderNpcShip(routes, loser.id, null, { preserveHull: true });
  const captured = captureSurrenderedNpcShip(routes, loser.id, 120);

  assert.equal(captured.ship.id, loser.id);
  assert.equal(routes.shipById.has(loser.id), false);
  assert.equal(routes.ships.some((ship) => ship.id === loser.id), false);
  assert.equal(routes.replacementQueue.length, replacementCount + 1);
  assert.equal(captured.replacement.shipId, loser.id);
});

test("NPC hull damage preserves half-point arrow hits", () => {
  const economy = createWorldEconomy({ ports: PORTS, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports: PORTS, startMinute: 0, economy });
  const target = routes.ships[0];
  const before = target.hitPoints;

  const damage = damageNpcShip(routes, target.id, 0.5);

  assert.equal(damage.hitPoints, before - 0.5);
  assert.equal(target.hitPoints, before - 0.5);
});

test("NPC turtle ships can reject damage with their intrinsic armor", () => {
  const economy = createWorldEconomy({ ports: PORTS, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports: PORTS, startMinute: 0, economy });
  const turtleShip = configureNpcEncounter(routes, {
    id: "armored-turtle-test",
    factionId: "joseon",
    role: NPC_ROLE_WARSHIP,
    shipSlug: "joseon-turtle-ship",
    lat: 34,
    lon: 128,
    headingDeg: 90,
    cultureType: "east-asian",
    routeRegion: "east-asia",
    specie: 0,
    replaceOnSink: false
  }, 1000);

  const resisted = damageNpcShip(routes, turtleShip.id, 1, { armorRoll: 0.2 });
  const penetrated = damageNpcShip(routes, turtleShip.id, 1, { armorRoll: 0.8 });

  assert.equal(resisted.resisted, true);
  assert.equal(resisted.damage, 0);
  assert.equal(penetrated.resisted, false);
  assert.equal(penetrated.damage, 1);
  assert.equal(turtleShip.hitPoints, turtleShip.maxHitPoints - 1);
});

test("temporary fisherman encounters receive valid fishing equipment", () => {
  const economy = createWorldEconomy({ ports: PORTS, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports: PORTS, startMinute: 0, economy });
  const fisherman = configureNpcEncounter(routes, {
    id: "benchmark-fisherman-test",
    factionId: "ming",
    role: NPC_ROLE_FISHERMAN,
    shipSlug: "sampan",
    lat: 32,
    lon: 119,
    headingDeg: 90,
    cultureType: "east-asian",
    routeRegion: "east-asia",
    replaceOnSink: false
  }, 1000);

  assert.equal(fishingNetById(fisherman.fishingNetId).id, fisherman.fishingNetId);
});

test("sunk NPC ships are replaced after a rare shipyard delay", () => {
  const economy = createWorldEconomy({ ports: PORTS, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports: PORTS, startMinute: 0, economy });
  const originalCount = routes.ships.length;
  const lost = routes.ships.find((ship) => ship.role === NPC_ROLE_MERCHANT);
  assert.ok(lost);
  const originalRole = lost.role;
  const originalFaction = lost.factionId;

  const damage = damageNpcShip(routes, lost.id, lost.maxHitPoints);
  assert.equal(damage.sunk, true);
  assert.equal(damage.shouldSurrender, false);
  const sinking = sinkNpcShip(routes, lost.id, 1000);

  assert.equal(routes.ships.length, originalCount - 1);
  assert.equal(routes.shipById.has(lost.id), false);
  assert.equal(routes.replacementQueue.length, 1);
  assert.ok(sinking.delayDays >= 90);
  assert.ok(sinking.delayDays <= 700);

  const stepMinutes = 7 * 24 * 60;
  for (let minute = stepMinutes; minute < sinking.replacement.readyMinute; minute += stepMinutes) {
    updateNpcSeaRouteSystem(routes, minute);
  }
  updateNpcSeaRouteSystem(routes, sinking.replacement.readyMinute - 1);
  assert.equal(routes.shipById.has(lost.id), false);
  updateNpcSeaRouteSystem(routes, sinking.replacement.readyMinute);
  const replacement = routes.shipById.get(lost.id);
  assert.ok(replacement);
  assert.equal(routes.ships.length, originalCount);
  assert.equal(replacement.role, originalRole);
  assert.equal(replacement.factionId, originalFaction);
  assert.equal(replacement.hitPoints, replacement.maxHitPoints);
  assert.equal(routes.replacementQueue.length, 0);
});

test("temporary quest encounters persist in saves but never enter the replacement queue", () => {
  const economy = createWorldEconomy({ ports: PORTS, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports: PORTS, startMinute: 0, economy });
  const replacementCount = routes.replacementQueue.length;
  const encounter = configureNpcEncounter(routes, {
    id: "colony-defense:test:1",
    factionId: "neutral",
    role: NPC_ROLE_WARSHIP,
    shipSlug: "mesoamerican-dugout-canoe",
    lat: 37,
    lon: -76,
    headingDeg: 180,
    cultureType: "mesoamerican",
    routeRegion: "americas",
    specie: 0,
    replaceOnSink: false,
    encounter: { kind: "colonization-defense", forceAttack: true }
  }, 1000);

  assert.equal(encounter.specie, 0);
  const snapshot = snapshotNpcSeaRouteSystem(routes);
  assert.equal(snapshot.ships.find((ship) => ship.id === encounter.id).encounter.kind, "colonization-defense");
  const restored = createNpcSeaRouteSystem({ ports: PORTS, startMinute: 0, economy });
  restoreNpcSeaRouteSystem(restored, snapshot, { economy });
  assert.equal(restored.shipById.get(encounter.id).encounter.kind, "colonization-defense");
  assert.equal(restored.shipById.get(encounter.id).replaceOnSink, false);
  damageNpcShip(routes, encounter.id, encounter.maxHitPoints);
  const removed = sinkNpcShip(routes, encounter.id, 1001);

  assert.equal(removed.replacement, null);
  assert.equal(routes.shipById.has(encounter.id), false);
  assert.equal(routes.replacementQueue.length, replacementCount);
});

test("routed quest pirates can respawn concealed at their hideout", () => {
  const economy = createWorldEconomy({ ports: PORTS, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports: PORTS, startMinute: 0, economy });
  const encounter = configureNpcRouteEncounter(routes, {
    id: "treasure-pirate:test",
    originPortId: PORTS[0].tileId,
    factionId: PIRATE_FACTION_ID,
    role: NPC_ROLE_PIRATE,
    shipSlug: "pirate-brig",
    hiddenAtOrigin: true,
    replaceOnSink: false,
    encounter: { kind: "treasure-map-pirate", pirateId: "test" }
  }, 1000);

  assert.equal(encounter.currentPort.tileId, PORTS[0].tileId);
  assert.equal(encounter.hiddenAtHideout, true);
  assert.equal(encounter.plan, null);
  assert.ok(encounter.hiddenUntilMinute > 1000);
  assert.deepEqual(
    npcShipSnapshots(routes, 1000).find((ship) => ship.id === encounter.id),
    {
      id: encounter.id,
      hidden: true,
      role: NPC_ROLE_PIRATE,
      factionId: PIRATE_FACTION_ID
    }
  );
});

test("pirate hideouts are a deterministic invisible subset of coastal ports", () => {
  const first = createNpcSeaRouteSystem({
    ports: PORTS,
    startMinute: 0,
    economy: createWorldEconomy({ ports: PORTS, startMinute: 0 })
  });
  const second = createNpcSeaRouteSystem({
    ports: PORTS,
    startMinute: 0,
    economy: createWorldEconomy({ ports: PORTS, startMinute: 0 })
  });
  const firstIds = first.pirateHideouts.map((port) => port.tileId);

  assert.deepEqual(firstIds, second.pirateHideouts.map((port) => port.tileId));
  assert.equal(firstIds.length, 2);
  assert.ok(firstIds.every((tileId) => first.ports.some((port) => port.tileId === tileId)));
  assert.ok(first.ports.every((port) => !("pirateHideout" in port)));
  assert.ok(first.pirateHideouts.every((port) => !npcPortHasMajorProtection(port)));
});

test("pirates keep their origins and planned calls away from major ports", () => {
  const routes = createNpcSeaRouteSystem({
    ports: PORTS,
    startMinute: 0,
    economy: createWorldEconomy({ ports: PORTS, startMinute: 0 })
  });
  const pirates = routes.ships.filter((ship) => ship.role === NPC_ROLE_PIRATE);

  assert.ok(pirates.length > 0);
  for (const pirate of pirates) {
    assert.equal(npcPortHasMajorProtection(pirate.currentPort), false, pirate.id);
    assert.equal(npcPortHasMajorProtection(pirate.plan.destination), false, pirate.id);
  }
});

test("damaged pirates hide, remain concealed near threats, and reappear repaired", () => {
  const economy = createWorldEconomy({ ports: PORTS, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports: PORTS, startMinute: 0, economy });
  const pirate = routes.ships.find((ship) => ship.role === NPC_ROLE_PIRATE && !ship.hiddenAtHideout);
  assert.ok(pirate);
  damageNpcShip(routes, pirate.id, pirate.maxHitPoints);

  let minute = 0;
  for (let day = 1; day <= 720 && !pirate.hiddenAtHideout; day++) {
    minute = day * 24 * 60;
    advanceWorldEconomy(economy, minute);
    updateNpcSeaRouteSystem(routes, minute);
  }
  assert.equal(pirate.hiddenAtHideout, true);
  assert.ok(routes.pirateHideouts.some((port) => port.tileId === pirate.currentPort.tileId));
  assert.equal(npcShipSnapshots(routes, minute).find((snapshot) => snapshot.id === pirate.id)?.hidden, true);

  minute = Math.max(minute, Math.ceil(pirate.hiddenUntilMinute + 1));
  updateNpcPirateHideoutPlayerThreat(routes, {
    lat: pirate.currentPort.lat,
    lon: pirate.currentPort.lon,
    clockMinutes: minute
  });
  updateNpcSeaRouteSystem(routes, minute);
  assert.equal(pirate.hiddenAtHideout, true);

  for (let day = 1; day <= 120 && pirate.hiddenAtHideout; day++) {
    minute += 24 * 60;
    advanceWorldEconomy(economy, minute);
    updateNpcSeaRouteSystem(routes, minute);
  }
  assert.equal(pirate.hiddenAtHideout, false);
  assert.equal(pirate.hitPoints, pirate.maxHitPoints);
  const emerged = npcShipSnapshots(routes, minute).find((snapshot) => snapshot.id === pirate.id);
  assert.ok(emerged && !emerged.hidden);
});

function cargoUnits(ship) {
  return Object.entries(ship.cargo).reduce((total, [goodId, quantity]) => (
    total + tradeGoodById(goodId).unitSize * quantity
  ), 0);
}

function port(tileId, city, country, cityType, lat, lon, population, factionId) {
  return {
    tileId,
    city,
    displayCity: city,
    country,
    cityType,
    lat,
    lon,
    population,
    factionId
  };
}

function nativeVillage(value) {
  return Object.freeze({
    ...value,
    settlementType: "village",
    manualRegion: "mesoamerican-villages"
  });
}

function whalingCandidates() {
  const grounds = [
    [45.8, -8.5],
    [63, 1.5],
    [52, -25],
    [49.5, -48],
    [33.1, 135.7],
    [39, 142.5],
    [49.2, -128],
    [-38, 18],
    [-46, 70],
    [-58, -62]
  ];
  return Array.from({ length: 320 }, (_, index) => {
    const [latDeg, lonDeg] = grounds[index % grounds.length];
    const lat = (latDeg + (index % 5) * 0.01) * Math.PI / 180;
    const lon = (lonDeg + (index % 7) * 0.01) * Math.PI / 180;
    return {
      tileId: 10000 + index,
      latitudeDeg: latDeg,
      longitudeDeg: lonDeg,
      position: [Math.cos(lat) * Math.cos(lon), Math.sin(lat), -Math.cos(lat) * Math.sin(lon)]
    };
  });
}
