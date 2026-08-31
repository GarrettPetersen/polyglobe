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
  NPC_ENCOUNTER_ROUTE_POLICY_CONNECTED_PATROL,
  NPC_PORT_RESPONSE_BURNING,
  NPC_PORT_RESPONSE_LOST,
  NPC_PORT_RESPONSE_WAR_LOAN,
  NPC_PACIFIC_FLEET_TARGET,
  NPC_SEA_ROUTE_SNAPSHOT_VERSION,
  NPC_WHALER_FLEET_TARGET,
  NPC_SHIP_SLUGS,
  PIRATE_SHIP_SLUGS,
  addNpcSeaRoutePort,
  advanceNpcSeaRouteSimulationRestorePlan,
  advanceNpcSeaRouteStrategicSnapshotPlan,
  applyNpcSeaRouteSimulationSnapshot,
  applyNpcConquestOwnership,
  captureSurrenderedNpcShip,
  claimSurrenderedNpcShipLoot,
  configureNpcEncounter,
  configureNpcRouteEncounter,
  createNpcShipSnapshotCache,
  createNpcSeaRouteSimulationRestorePlan,
  createNpcSeaRouteSystem,
  createNpcSeaRouteStrategicSnapshotPlan,
  damageNpcShip,
  expandNpcCapitalNavalReserve,
  npcCargoAvailableQuantity,
  npcFleetOriginWeightsForPorts,
  npcPortHasMajorProtection,
  npcCapitalNavalReserveStatus,
  orderNpcPortResponse,
  npcSeaRoutePortSettlementType,
  reconcileNpcCargoCapacity,
  reconcileNpcRouteEncounterIdentity,
  routeBetweenPorts,
  npcSeaRouteEventSchedule,
  npcShipHasCombatGrace,
  npcShipIdsAddedSinceSimulationSnapshot,
  npcShipSnapshotForId,
  npcShipSnapshots,
  releaseNpcShipVisualNavigation,
  returnNpcWarLoanOffensiveShips,
  replaceNpcSeaRoutePort,
  restoreNpcSurrenderContinuity,
  restoreNpcSeaRouteSystem,
  setNpcShipVisualNavigation,
  sinkNpcShip,
  stageNpcRouteEncounterAtDestination,
  snapshotNpcSeaRouteSystem,
  snapshotNpcSeaRouteStrategicSystem,
  snapshotNpcSurrenderContinuity,
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
import { TEA_RACE_CARGO_QUANTITY, teaRaceCompetitorManifest } from "./teaRaceQuest.js";
import { MUGHAL_EXPANSION_WARSHIP_TARGET } from "./factionExpansion.js";

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

const DARDANELLES_PORTS = Object.freeze([
  ...PORTS,
  port(10, "Alexandria", "Egypt", "islamic-desert", 31.2, 29.92, 80000, "ottoman"),
  port(11, "Athens", "Greece", "mediterranean", 37.98, 23.73, 50000, "venice"),
  port(12, "Gelibolu", "Turkey", "islamic-desert", 40.41, 26.67, 10000, "ottoman"),
  port(13, "Feodosia", "Ukraine", "islamic-desert", 45.03, 35.38, 10000, "ottoman")
]);

const NIGER_PORTS = Object.freeze([
  ...PORTS,
  port(14, "Dienne", "Senegal", "sub-saharan", 15.03, -16.35, 16000, "songhai"),
  port(15, "Gao", "Mali", "sub-saharan", 16.27, -0.05, 70000, "songhai"),
  port(16, "Tombouctou", "Mali", "sub-saharan", 16.77, -3.01, 25000, "songhai")
]);

const PACIFIC_PORTS = Object.freeze([
  port(20, "Fiji Village", "Fiji", "polynesian", -18.14, 178.44, 3500, "neutral"),
  port(21, "Tonga Village", "Tonga", "polynesian", -21.14, -175.2, 3000, "neutral"),
  port(22, "Samoa Village", "Samoa", "polynesian", -13.83, -171.75, 3000, "neutral"),
  port(23, "Tahiti Village", "French Polynesia", "polynesian", -17.55, -149.56, 3000, "neutral")
]);

const JOSEON_PORTS = Object.freeze([
  ...PORTS,
  port(24, "Seoul", "Korea", "east-asian", 37.57, 126.98, 110000, "joseon"),
  port(25, "Busan", "Korea", "east-asian", 35.18, 129.08, 50000, "joseon"),
  port(26, "Tongyeong", "Korea", "east-asian", 34.85, 128.43, 30000, "joseon"),
  port(27, "Yeosu", "Korea", "east-asian", 34.76, 127.66, 28000, "joseon"),
  port(28, "Jeju", "Korea", "east-asian", 33.5, 126.53, 22000, "joseon"),
  port(29, "Nampo", "Korea", "east-asian", 38.74, 125.41, 25000, "joseon"),
  port(90, "Fukuoka", "Japan", "east-asian", 33.59, 130.4, 55000, "japan"),
  port(91, "Dalian", "China", "east-asian", 38.91, 121.61, 45000, "ming")
]);

const MESOAMERICAN_PORTS = Object.freeze([
  nativeVillage(port(30, "Xicalango", "Mexico", "mesoamerican", 18.65, -91.82, 2800, "neutral")),
  nativeVillage(port(31, "Chakan Putum", "Mexico", "mesoamerican", 19.35, -90.72, 2400, "neutral")),
  nativeVillage(port(32, "Cuzamil", "Mexico", "mesoamerican", 20.43, -86.92, 1800, "neutral")),
  nativeVillage(port(33, "Guanahani Village", "Bahamas", "mesoamerican", 24.06, -74.47, 1200, "neutral")),
  nativeVillage(port(34, "Coroa Vermelha Village", "Brazil", "mesoamerican", -16.33, -39.01, 1600, "neutral"))
]);

const INCA_PORTS = Object.freeze([
  ...PORTS,
  Object.freeze({
    ...port(35, "Cuzco", "Peru", "andean", -13.53, -71.97, 90000, "inca"),
    isFactionCapital: true,
    capitalOfFactionId: "inca"
  }),
  Object.freeze({
    ...port(36, "Chanchan", "Peru", "andean", -8.11, -79.07, 25000, "inca"),
    manualRegion: "inca-coast"
  })
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
  assert.ok(NPC_SHIP_SLUGS.includes("fusta"));
  assert.ok(NPC_SHIP_SLUGS.includes("galleass"));
  for (const slug of NPC_SHIP_SLUGS) shipStatsForSlug(slug);
});

test("Joseon waters field Hyeopseon alongside the heavier national warships", () => {
  const economy = createWorldEconomy({ ports: JOSEON_PORTS, startMinute: 0, seedKey: "hyeopseon" });
  const routes = createNpcSeaRouteSystem({
    ports: JOSEON_PORTS,
    startMinute: 0,
    economy,
    seedKey: "hyeopseon"
  });
  const joseonWarships = routes.ships
    .filter((ship) => (
      ship.factionId === "joseon" &&
      ship.role === NPC_ROLE_WARSHIP &&
      ship.profileId === "east-asia"
    ));
  const warshipSlugs = joseonWarships.map((ship) => ship.slug);

  assert.ok(joseonWarships.length > 0);
  assert.ok(joseonWarships.every((ship) => ship.slugs.includes("joseon-hyeopseon")));
  assert.ok(warshipSlugs.every((slug) => [
    "joseon-hyeopseon",
    "joseon-panokseon",
    "joseon-turtle-ship"
  ].includes(slug)));
});

test("nearby NPC snapshot work is sliced while priority ships refresh immediately", () => {
  const economy = createWorldEconomy({
    ports: PORTS,
    startMinute: 0,
    seedKey: "snapshot-cache"
  });
  const routes = createNpcSeaRouteSystem({
    ports: PORTS,
    startMinute: 0,
    economy,
    seedKey: "snapshot-cache"
  });
  const cache = createNpcShipSnapshotCache({ bucketCount: 64 });
  const initial = new Map(cache.refresh(routes, 30).map((entry) => [entry.id, entry]));
  const priorityShip = routes.ships.find((ship) => initial.has(ship.id));
  assert.ok(priorityShip);
  priorityShip.hitPoints -= 1;

  const refreshed = new Map(cache.refresh(
    routes,
    31,
    new Set([priorityShip.id])
  ).map((entry) => [entry.id, entry]));
  assert.equal(refreshed.get(priorityShip.id).hitPoints, priorityShip.hitPoints);
  assert.ok(
    [...initial].some(([id, snapshot]) => (
      id !== priorityShip.id && refreshed.get(id) === snapshot
    )),
    "ordinary offscreen snapshots should remain cached between their assigned slices"
  );

  const removed = routes.ships.find((ship) => ship.id !== priorityShip.id);
  routes.ships.splice(routes.ships.indexOf(removed), 1);
  routes.shipById.delete(removed.id);
  assert.equal(cache.refresh(routes, 32).some((entry) => entry.id === removed.id), false);
});

test("fleet-origin weights preserve every port while favoring active sailing origins", () => {
  const weights = npcFleetOriginWeightsForPorts(PORTS);
  assert.equal(weights.size, PORTS.length);
  assert.ok([...weights.values()].every((weight) => Number.isFinite(weight) && weight >= 1));
  assert.ok([...weights.values()].some((weight) => weight > 1));

  assert.throws(
    () => npcFleetOriginWeightsForPorts([PORTS[0], { ...PORTS[1], cityId: PORTS[0].cityId }]),
    /duplicate city/i
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

test("offscreen NPC routes settle exact and oversized catch-up windows without crashing", () => {
  const createRoutes = () => {
    const economy = createWorldEconomy({
      ports: PORTS,
      startMinute: 0,
      seedKey: "route-catch-up"
    });
    return createNpcSeaRouteSystem({
      ports: PORTS,
      startMinute: 0,
      economy,
      seedKey: "route-catch-up"
    });
  };
  const reference = createRoutes();
  const referenceShip = reference.ships.find((ship) => (
    ship.profileId === "mediterranean" &&
    ship.role === NPC_ROLE_MERCHANT &&
    !ship.encounter &&
    !ship.hiddenAtHideout
  ));
  assert.ok(referenceShip);

  let twelfthArrivalMinute = null;
  let twentiethArrivalMinute = null;
  for (let arrival = 1; arrival <= 20; arrival++) {
    const arrivalMinute = referenceShip.plan.endMinute;
    updateNpcSeaRouteEvents(reference, arrivalMinute, [referenceShip.id]);
    if (arrival === 12) twelfthArrivalMinute = arrivalMinute;
    if (arrival === 20) twentiethArrivalMinute = arrivalMinute;
  }

  const exact = createRoutes();
  const exactShip = exact.shipById.get(referenceShip.id);
  const initialPortVisits = exactShip.portVisits;
  assert.doesNotThrow(() => (
    updateNpcSeaRouteEvents(exact, twelfthArrivalMinute, [exactShip.id])
  ));
  assert.equal(exactShip.portVisits, initialPortVisits + 12);
  assert.ok(exactShip.plan.endMinute > twelfthArrivalMinute);

  const stale = createRoutes();
  const staleShip = stale.shipById.get(referenceShip.id);
  assert.doesNotThrow(() => (
    updateNpcSeaRouteEvents(stale, twentiethArrivalMinute, [staleShip.id])
  ));
  assert.equal(staleShip.portVisits, initialPortVisits + 12);
  assert.equal(staleShip.plan.startMinute, twentiethArrivalMinute);
  assert.ok(staleShip.plan.endMinute > twentiethArrivalMinute);
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

test("Mediterranean Ottoman ports use local sea-lane anchors", () => {
  const economy = createWorldEconomy({ ports: DARDANELLES_PORTS, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports: DARDANELLES_PORTS, startMinute: 0, economy });

  const routePort = (name) => routes.ports.find((port) => port.city === name);
  assert.equal(routePort("Istanbul")?.routeRegion, "europe");
  assert.deepEqual(routePort("Istanbul")?.routeAnchors, ["constantinople"]);
  assert.equal(routePort("Alexandria")?.routeRegion, "europe");
  assert.ok(routePort("Alexandria")?.routeAnchors.includes("alexandria"));
  assert.equal(routePort("Gelibolu")?.routeRegion, "europe");
  assert.deepEqual(routePort("Gelibolu")?.routeAnchors, ["dardanelles-south"]);
  assert.equal(routePort("Feodosia")?.routeRegion, "europe");
  assert.deepEqual(routePort("Feodosia")?.routeAnchors, ["black-sea"]);
});

test("NPC routes traverse the Dardanelles and Bosporus rails in both directions", () => {
  const economy = createWorldEconomy({ ports: DARDANELLES_PORTS, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports: DARDANELLES_PORTS, startMinute: 0, economy });
  const alexandria = routes.ports.find((port) => port.city === "Alexandria");
  const feodosia = routes.ports.find((port) => port.city === "Feodosia");
  assert.ok(alexandria);
  assert.ok(feodosia);

  const expectedEastbound = [
    "aegean->dardanelles-south",
    "dardanelles-south->dardanelles-north",
    "dardanelles-north->marmara-west",
    "marmara-west->marmara-center",
    "marmara-center->marmara-east",
    "marmara-east->constantinople",
    "constantinople->black-sea"
  ];
  const eastbound = routeBetweenPorts(routes, alexandria, feodosia, "small-cog", 0).segments
    .filter((segment) => segment.kind === "sail")
    .map((segment) => `${segment.from.id}->${segment.to.id}`);
  const westbound = routeBetweenPorts(routes, feodosia, alexandria, "small-cog", 0).segments
    .filter((segment) => segment.kind === "sail")
    .map((segment) => `${segment.from.id}->${segment.to.id}`);

  for (const pair of expectedEastbound) assert.ok(eastbound.includes(pair), eastbound.join(", "));
  for (const pair of expectedEastbound) {
    const [from, to] = pair.split("->");
    assert.ok(westbound.includes(`${to}->${from}`), westbound.join(", "));
  }
});

test("Niger routes stop at the furthest inhabited river anchor", () => {
  const economy = createWorldEconomy({ ports: NIGER_PORTS, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports: NIGER_PORTS, startMinute: 0, economy });
  const dienne = routes.ports.find((port) => port.city === "Dienne");
  const gao = routes.ports.find((port) => port.city === "Gao");
  const timbuktu = routes.ports.find((port) => port.city === "Tombouctou");
  const lisbon = routes.ports.find((port) => port.city === "Lisbon");
  assert.ok(dienne);
  assert.ok(gao);
  assert.ok(timbuktu);
  assert.ok(lisbon);
  assert.ok(!dienne.routeAnchors.some((anchorId) => anchorId.startsWith("niger-")));
  assert.deepEqual(gao.routeAnchors, ["niger-gao"]);
  assert.deepEqual(timbuktu.routeAnchors, ["niger-bend"]);
  assert.deepEqual(routes.baseEdges.get("niger-inner-delta"), []);
  assert.ok(!(routes.baseEdges.get("niger-bend") || []).some((edge) => (
    edge.to === "niger-inner-delta"
  )));

  const expectedDownstream = [
    "niger-gao->niger-middle",
    "niger-middle->niger-lower",
    "niger-lower->niger-delta",
    "niger-delta->niger-bight",
    "niger-bight->guinea"
  ];
  for (const origin of [timbuktu, gao]) {
    const sailPairs = routeBetweenPorts(routes, origin, lisbon, "small-cog", 0).segments
      .filter((segment) => segment.kind === "sail")
      .map((segment) => `${segment.from.id}->${segment.to.id}`);
    for (const pair of expectedDownstream) assert.ok(sailPairs.includes(pair), sailPairs.join(", "));
    assert.ok(!sailPairs.some((pair) => pair.includes("niger-inner-delta")), sailPairs.join(", "));
  }
});

test("saved Niger routes aimed beyond Timbuktu are replanned on restore", (t) => {
  const economy = createWorldEconomy({ ports: NIGER_PORTS, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports: NIGER_PORTS, startMinute: 0, economy });
  const snapshot = snapshotNpcSeaRouteSystem(routes);
  const saved = snapshot.ships[0];
  const timbuktu = routes.ports.find((port) => port.city === "Tombouctou");
  const lisbon = routes.ports.find((port) => port.city === "Lisbon");
  const upstreamTail = routes.laneNodes.get("niger-inner-delta");
  assert.ok(timbuktu);
  assert.ok(lisbon);
  assert.ok(upstreamTail);
  const obsoleteTimbuktu = { ...timbuktu, routeAnchors: ["niger-inner-delta"] };
  saved.currentPort = obsoleteTimbuktu;
  saved.finalDestination = lisbon;
  saved.plan = {
    origin: obsoleteTimbuktu,
    destination: lisbon,
    segments: [{
      kind: "sail",
      from: obsoleteTimbuktu,
      to: upstreamTail,
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
  assert.ok(sailPairs.includes("niger-bend->niger-gao"), sailPairs.join(", "));
  assert.ok(sailPairs.includes("niger-delta->niger-bight"), sailPairs.join(", "));
  assert.ok(!sailPairs.some((pair) => pair.includes("niger-inner-delta")), sailPairs.join(", "));
  assert.deepEqual(restored.currentPort.routeAnchors, ["niger-bend"]);
  assert.equal(restored.visualNavigation, null);
  assert.equal(messages.length, 1);
  assert.match(messages[0][0], /Replanned 1 saved NPC routes/);
});

test("a founded American colony joins a Spanish ocean-going circuit", () => {
  const economy = createWorldEconomy({ ports: PORTS, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports: PORTS, startMinute: 0, economy });
  const colony = {
    ...port(99, "Veracruz", "Mexico", "mesoamerican", 19.17, -96.13, 2400, "spain"),
    settlementType: "city",
    npcInterregionalTradeExcluded: true
  };
  const added = addNpcSeaRoutePort(routes, colony);
  const circuitShip = routes.ships.find((ship) => (
    ship.nationalCircuitFactionId === "spain" &&
    ship.nationalCircuitCityIds.includes(colony.cityId)
  ));

  assert.equal(added.routeRegion, "americas");
  assert.ok(added.routeAnchors.length > 0);
  assert.ok(circuitShip, "a Spanish ocean-going ship should call at the new colony");
  assert.equal(circuitShip.factionId, "spain");
  assert.equal(circuitShip.mode, "interregional");
  assert.equal(circuitShip.role, NPC_ROLE_MERCHANT);
  assert.ok(circuitShip.nationalCircuitCityIds.includes(PORTS[1].cityId), "the circuit should return to Seville");
  assert.notEqual(circuitShip.slug, "mesoamerican-dugout-canoe");
  assert.throws(() => addNpcSeaRoutePort(routes, colony), /already exists/);
});

test("national circuits cover every overseas port and survive save restore", () => {
  const spanishPorts = [
    ...PORTS,
    port(97, "Havana", "Cuba", "mediterranean", 23.11, -82.37, 18000, "spain"),
    port(98, "Veracruz", "Mexico", "mesoamerican", 19.17, -96.13, 14000, "spain"),
    port(99, "Nombre de Dios", "Panama", "mediterranean", 9.58, -79.47, 6000, "spain")
  ];
  const economy = createWorldEconomy({ ports: spanishPorts, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports: spanishPorts, startMinute: 0, economy });
  const spanishCircuitShips = routes.ships.filter((ship) => ship.nationalCircuitFactionId === "spain");
  const coveredCityIds = new Set(spanishCircuitShips.flatMap((ship) => ship.nationalCircuitCityIds));

  assert.ok(spanishCircuitShips.length > 0);
  assert.ok(spanishPorts.filter((port) => [2, 97, 98, 99].includes(port.tileId))
    .every((port) => coveredCityIds.has(port.cityId)));
  assert.ok(spanishCircuitShips.every((ship) => ship.nationalCircuitCityIds.length <= 6));

  const circuitShip = spanishCircuitShips[0];
  const visitedCircuitPorts = new Set();
  for (let leg = 0; leg < 12 && visitedCircuitPorts.size < circuitShip.nationalCircuitCityIds.length; leg++) {
    const arrivalMinute = circuitShip.plan.endMinute - circuitShip.clockOffsetMinutes;
    advanceWorldEconomy(economy, arrivalMinute);
    updateNpcSeaRouteEvents(routes, arrivalMinute, [circuitShip.id]);
    if (circuitShip.nationalCircuitCityIds.includes(circuitShip.currentPort.cityId)) {
      visitedCircuitPorts.add(circuitShip.currentPort.cityId);
    }
  }
  assert.deepEqual(
    [...visitedCircuitPorts].sort(),
    circuitShip.nationalCircuitCityIds.slice().sort()
  );

  const snapshot = snapshotNpcSeaRouteSystem(routes);
  restoreNpcSeaRouteSystem(routes, snapshot, { economy });
  const restoredCircuitShips = routes.ships.filter((ship) => ship.nationalCircuitFactionId === "spain");
  assert.deepEqual(
    restoredCircuitShips.map((ship) => [ship.id, ship.nationalCircuitId, ship.nationalCircuitCityIds]),
    spanishCircuitShips.map((ship) => [ship.id, ship.nationalCircuitId, ship.nationalCircuitCityIds])
  );

  const legacySnapshot = snapshotNpcSeaRouteSystem(routes);
  for (const ship of legacySnapshot.ships) {
    delete ship.nationalCircuitId;
    delete ship.nationalCircuitFactionId;
    delete ship.nationalCircuitCityIds;
  }
  restoreNpcSeaRouteSystem(routes, legacySnapshot, { economy });
  const migratedCoverage = new Set(routes.ships
    .filter((ship) => ship.nationalCircuitFactionId === "spain")
    .flatMap((ship) => ship.nationalCircuitCityIds));
  assert.ok(spanishPorts.filter((port) => [2, 97, 98, 99].includes(port.tileId))
    .every((port) => migratedCoverage.has(port.cityId)));
});

test("a sunk national circuit ship keeps its route reserved while a replacement is built", () => {
  const spanishPorts = [
    ...PORTS,
    port(99, "Veracruz", "Mexico", "mesoamerican", 19.17, -96.13, 14000, "spain")
  ];
  const economy = createWorldEconomy({ ports: spanishPorts, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports: spanishPorts, startMinute: 0, economy });
  const circuitShip = routes.ships.find((ship) => ship.nationalCircuitFactionId === "spain");
  assert.ok(circuitShip);
  const circuitId = circuitShip.nationalCircuitId;
  const circuitCityIds = circuitShip.nationalCircuitCityIds.slice();

  sinkNpcShip(routes, circuitShip.id, 1000);
  const replacement = routes.replacementQueue.find((entry) => entry.shipId === circuitShip.id);
  assert.ok(replacement);
  assert.equal(replacement.nationalCircuitId, circuitId);
  assert.deepEqual(replacement.nationalCircuitCityIds, circuitCityIds);

  const snapshot = snapshotNpcSeaRouteSystem(routes);
  restoreNpcSeaRouteSystem(routes, snapshot, { economy });
  assert.equal(routes.ships.some((ship) => ship.nationalCircuitId === circuitId), false);
  assert.equal(
    routes.replacementQueue.filter((entry) => entry.nationalCircuitId === circuitId).length,
    1
  );
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
  const factionByCityId = new Map(PORTS.map((entry) => [
    entry.cityId,
    entry.cityId === PORTS[0].cityId
      ? "england"
      : entry.factionId === "portugal" ? "neutral" : entry.factionId
  ]));
  applyNpcConquestOwnership(routes, factionByCityId, new Set(["portugal"]));
  assert.equal(routes.ports.find((entry) => entry.tileId === 1).factionId, "england");
  assert.equal(routes.ports.find((entry) => entry.tileId === 5).factionId, "neutral");
  assert.equal(routes.ships.some((ship) => ship.factionId === "portugal"), false);
});

test("conquest ownership ignores generated fishing grounds while requiring city ids for ports", () => {
  const fishState = createGameState({ cargoCapacity: 20 });
  const economy = createWorldEconomy({ ports: PORTS, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({
    ports: PORTS,
    startMinute: 0,
    economy,
    fishState,
    fishingGroundIsNavigable: ALL_TEST_FISHING_GROUNDS_NAVIGABLE
  });
  assert.ok(routes.ships.some((ship) => (
    ship.currentPort?.isFishingGround || ship.finalDestination?.isFishingGround ||
    ship.plan?.origin?.isFishingGround || ship.plan?.destination?.isFishingGround
  )));
  const ownership = new Map(PORTS.map((entry) => [entry.cityId, entry.factionId]));

  assert.doesNotThrow(() => applyNpcConquestOwnership(routes, ownership, new Set()));

  const ordinaryShip = routes.ships.find((ship) => typeof ship.currentPort?.cityId === "string");
  assert.ok(ordinaryShip);
  ordinaryShip.currentPort = { ...ordinaryShip.currentPort, cityId: undefined };
  assert.throws(
    () => applyNpcConquestOwnership(routes, ownership, new Set()),
    /NPC route port requires a canonical id/
  );
});

test("a succeeded empire transfers its active and replacement fleets", () => {
  const economy = createWorldEconomy({ ports: PORTS, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports: PORTS, startMinute: 0, economy });
  const activeShip = routes.ships[0];
  activeShip.factionId = "delhi";
  routes.replacementQueue.push({
    shipId: "lodi-replacement",
    factionId: "delhi",
    readyMinute: 100
  });

  applyNpcConquestOwnership(
    routes,
    new Map(PORTS.map((entry) => [entry.cityId, entry.factionId])),
    new Set(["delhi"]),
    new Map([["delhi", "mughal"]])
  );

  assert.equal(activeShip.factionId, "mughal");
  assert.equal(routes.replacementQueue.at(-1).factionId, "mughal");
});

test("Mughal succession launches a persistent regional war flotilla", () => {
  const economy = createWorldEconomy({ ports: PORTS, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({
    ports: PORTS,
    startMinute: 0,
    economy,
    relationBetween: (factionAId, factionBId) => (
      new Set([factionAId, factionBId]).has("mughal") &&
      new Set([factionAId, factionBId]).has("bengal")
        ? DIPLOMACY_WAR
        : diplomacyBetween(factionAId, factionBId)
    )
  });
  const factionByCityId = new Map(PORTS.map((entry) => [
    entry.cityId,
    entry.cityId === PORTS[4].cityId ? "mughal" : entry.cityId === PORTS[5].cityId ? "bengal" : entry.factionId
  ]));

  applyNpcConquestOwnership(
    routes,
    factionByCityId,
    new Set(["delhi"]),
    new Map([["delhi", "mughal"]])
  );

  const flotilla = routes.ships.filter((ship) => ship.id.startsWith("mughal-expansion-warship-"));
  assert.equal(flotilla.length, MUGHAL_EXPANSION_WARSHIP_TARGET);
  assert.ok(flotilla.every((ship) => ship.factionId === "mughal"));
  assert.ok(flotilla.every((ship) => ship.role === NPC_ROLE_WARSHIP));
  assert.ok(flotilla.every((ship) => ship.profileId === "indian-ocean"));
  assert.ok(flotilla.every((ship) => ship.plan?.destination?.factionId === "bengal"));

  applyNpcConquestOwnership(
    routes,
    factionByCityId,
    new Set(["delhi"]),
    new Map([["delhi", "mughal"]])
  );
  assert.equal(
    routes.ships.filter((ship) => ship.id.startsWith("mughal-expansion-warship-")).length,
    MUGHAL_EXPANSION_WARSHIP_TARGET
  );
});

test("capital naval reserves are finite and scale with the realm's current port power", () => {
  const economy = createWorldEconomy({ ports: PORTS, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports: PORTS, startMinute: 0, economy });

  const portugal = npcCapitalNavalReserveStatus(routes, "portugal");
  const ming = npcCapitalNavalReserveStatus(routes, "ming");
  const vijayanagara = npcCapitalNavalReserveStatus(routes, "vijayanagara");

  assert.equal(portugal.targetCount, 2);
  assert.equal(ming.targetCount, 3);
  assert.equal(vijayanagara.targetCount, 1);
  for (const status of [portugal, ming, vijayanagara]) {
    assert.equal(status.stockedCount, status.targetCount);
    assert.equal(status.activeCount, 0);
    assert.equal(status.vacantCount, 0);
  }
});

test("a war loan permanently raises the reserve target, buys shipyard hulls, and launches a finite squadron", () => {
  const economy = createWorldEconomy({ ports: PORTS, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports: PORTS, startMinute: 0, economy });
  const before = npcCapitalNavalReserveStatus(routes, "portugal");
  const slotIds = expandNpcCapitalNavalReserve(routes, {
    factionId: "portugal",
    slotCount: 2,
    contractId: "loan-test"
  });
  const expanded = npcCapitalNavalReserveStatus(routes, "portugal");
  assert.equal(slotIds.length, 2);
  assert.equal(expanded.targetCount, before.targetCount + 2);
  assert.equal(expanded.vacantCount, 2);

  economy.shipyards.npcSales.push(Object.freeze({
    id: "goa-war-loan-galleon:npc-sale",
    portId: PORTS[4].cityId,
    factionId: "portugal",
    shipSlug: "galleon",
    price: 60000,
    soldMinute: 100
  }));
  updateNpcSeaRouteSystem(routes, 100);
  const buying = npcCapitalNavalReserveStatus(routes, "portugal");
  assert.equal(buying.targetCount, before.targetCount + 2);
  assert.equal(buying.inTransitCount, 1);
  assert.equal(buying.vacantCount, 1);

  const first = orderNpcPortResponse(routes, {
    factionId: "portugal",
    targetCityId: routeCityId(routes, 2),
    reason: NPC_PORT_RESPONSE_WAR_LOAN,
    clockMinutes: 101,
    allowReinforcement: true
  });
  const second = orderNpcPortResponse(routes, {
    factionId: "portugal",
    targetCityId: routeCityId(routes, 2),
    reason: NPC_PORT_RESPONSE_WAR_LOAN,
    clockMinutes: 101,
    allowReinforcement: true
  });
  assert.ok(first.shipId);
  assert.ok(second.shipId);
  assert.notEqual(first.shipId, second.shipId);
  assert.equal(routes.shipById.get(first.shipId).portResponse.reason, NPC_PORT_RESPONSE_WAR_LOAN);
  assert.equal(routes.shipById.get(second.shipId).portResponse.reason, NPC_PORT_RESPONSE_WAR_LOAN);

  assert.equal(returnNpcWarLoanOffensiveShips(routes, [first.shipId, second.shipId], 200), 2);
  assert.equal(routes.shipById.get(first.shipId).portResponse.phase, "returning");
  assert.equal(routes.shipById.get(second.shipId).portResponse.phase, "returning");
  assert.equal(npcCapitalNavalReserveStatus(routes, "portugal").targetCount, before.targetCount + 2);
});

test("an inland capital mobilizes its finite naval reserve from an explicit coastal port", () => {
  const economy = createWorldEconomy({ ports: INCA_PORTS, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports: INCA_PORTS, startMinute: 0, economy });
  const inca = npcCapitalNavalReserveStatus(routes, "inca");

  assert.equal(inca.targetCount, 1);
  assert.equal(inca.stockedCount, 1);
  assert.ok(inca.slots.every((slot) => slot.originCityId === routeCityId(routes, 36)));
  assert.ok(inca.slots.every((slot) => slot.profileId === "andean-coast"));
  assert.ok(inca.slots.every((slot) => slot.shipSlug === "mesoamerican-dugout-canoe"));
});

test("a surviving realm rebases its reserve response to its navigable capital after losing its naval base", () => {
  const economy = createWorldEconomy({ ports: INCA_PORTS, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports: INCA_PORTS, startMinute: 0, economy });
  const response = orderNpcPortResponse(routes, {
    factionId: "inca",
    targetCityId: routeCityId(routes, 36),
    reason: NPC_PORT_RESPONSE_BURNING,
    clockMinutes: 0,
    threatUntilMinute: 1
  });
  assert.ok(response.shipId);

  applyNpcConquestOwnership(
    routes,
    new Map(INCA_PORTS.map((entry) => [
      entry.cityId,
      entry.cityId === routeCityId(routes, 36) ? "spain" : entry.factionId
    ])),
    new Set()
  );
  const rebased = npcCapitalNavalReserveStatus(routes, "inca");
  assert.equal(rebased.targetCount, 1);
  assert.equal(rebased.slots[0].originCityId, routeCityId(routes, 35));
  assert.equal(rebased.slots[0].profileId, "andean-coast");
  const returning = routes.shipById.get(response.shipId);
  assert.equal(returning.capitalNavalReserveSlotId, rebased.slots[0].id);
  assert.equal(returning.replaceOnSink, false);
  assert.equal(returning.portResponse.returnCityId, routeCityId(routes, 35));

  const workerSnapshot = snapshotNpcSeaRouteStrategicSystem(routes);
  applyNpcSeaRouteSimulationSnapshot(routes, workerSnapshot);
  updateNpcSeaRouteSystem(routes, 1);

  assert.equal(routes.shipById.has(response.shipId), true);
  assert.equal(routes.shipById.get(response.shipId).portResponse.phase, "returning");
  assert.equal(routes.shipById.get(response.shipId).portResponse.returnCityId, routeCityId(routes, 35));
});

test("a realm retires its reserve only after losing every navigable port", () => {
  const economy = createWorldEconomy({ ports: INCA_PORTS, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports: INCA_PORTS, startMinute: 0, economy });
  const response = orderNpcPortResponse(routes, {
    factionId: "inca",
    targetCityId: routeCityId(routes, 36),
    reason: NPC_PORT_RESPONSE_BURNING,
    clockMinutes: 0,
    threatUntilMinute: 1
  });
  assert.ok(response.shipId);

  applyNpcConquestOwnership(
    routes,
    new Map(INCA_PORTS.map((entry) => [
      entry.cityId,
      entry.factionId === "inca" ? "spain" : entry.factionId
    ])),
    new Set()
  );
  assert.equal(npcCapitalNavalReserveStatus(routes, "inca").targetCount, 0);
  const detached = routes.shipById.get(response.shipId);
  assert.equal(detached.capitalNavalReserveSlotId, null);
  assert.equal(detached.replaceOnSink, false);

  const workerSnapshot = snapshotNpcSeaRouteStrategicSystem(routes);
  applyNpcSeaRouteSimulationSnapshot(routes, workerSnapshot);
  updateNpcSeaRouteSystem(routes, 1);

  assert.equal(routes.shipById.has(response.shipId), false);
  assert.equal(routes.ships.some((ship) => ship.portResponse?.factionId === "inca"), false);
});

test("a reserve rebases to another compatible naval port after its storehouse is captured", () => {
  const porto = Object.freeze(port(
    37,
    "Porto",
    "Portugal",
    "mediterranean",
    41.16,
    -8.63,
    40000,
    "portugal"
  ));
  const ports = Object.freeze([...PORTS, porto]);
  const economy = createWorldEconomy({ ports, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports, startMinute: 0, economy });
  const before = npcCapitalNavalReserveStatus(routes, "portugal");
  assert.ok(before.slots.every((slot) => slot.originCityId === PORTS[0].cityId));

  applyNpcConquestOwnership(
    routes,
    new Map(ports.map((entry) => [
      entry.cityId,
      entry.cityId === PORTS[0].cityId ? "spain" : entry.factionId
    ])),
    new Set()
  );

  const rebased = npcCapitalNavalReserveStatus(routes, "portugal");
  assert.equal(rebased.targetCount, before.targetCount);
  assert.ok(rebased.slots.every((slot) => slot.originCityId === porto.cityId));
  assert.equal(rebased.stockedCount, 0);
  assert.equal(rebased.vacantCount, rebased.targetCount);
});

test("every initial reserve faction keeps its fleet profile at a fallback navigable capital", () => {
  const templateEconomy = createWorldEconomy({ ports: PORTS, startMinute: 0 });
  const templateRoutes = createNpcSeaRouteSystem({
    ports: PORTS,
    startMinute: 0,
    economy: templateEconomy
  });
  const factionIds = [...new Set(templateRoutes.capitalNavalReserveSlots.map((slot) => slot.factionId))];
  assert.ok(factionIds.length >= 5);

  for (const [index, factionId] of factionIds.entries()) {
    const inlandCapital = Object.freeze({
      ...INCA_PORTS.find((entry) => entry.tileId === 35),
      cityId: `${factionId}-inland-court|test`,
      tileId: 1000 + index,
      city: `${factionId} inland court`,
      displayCity: `${factionId} inland court`,
      population: 1,
      factionId,
      capitalOfFactionId: factionId
    });
    const ports = Object.freeze([...PORTS, inlandCapital]);
    const economy = createWorldEconomy({ ports, startMinute: 0 });
    const routes = createNpcSeaRouteSystem({ ports, startMinute: 0, economy });
    const slot = routes.capitalNavalReserveSlots.find((candidate) => (
      candidate.factionId === factionId
    ));
    assert.ok(slot, `${factionId} starts with a naval reserve`);
    const originalTargetCount = npcCapitalNavalReserveStatus(routes, factionId).targetCount;
    const originalProfileId = slot.profileId;
    const response = orderNpcPortResponse(routes, {
      factionId,
      targetCityId: slot.originCityId,
      reason: NPC_PORT_RESPONSE_BURNING,
      clockMinutes: 0,
      threatUntilMinute: 1
    });

    applyNpcConquestOwnership(
      routes,
      new Map(ports.map((entry) => [
        entry.cityId,
        entry.factionId === factionId && entry.cityId !== inlandCapital.cityId
          ? "neutral"
          : entry.factionId
      ])),
      new Set()
    );
    const workerSnapshot = snapshotNpcSeaRouteStrategicSystem(routes);
    applyNpcSeaRouteSimulationSnapshot(routes, workerSnapshot);
    updateNpcSeaRouteSystem(routes, 1);

    assert.equal(
      npcCapitalNavalReserveStatus(routes, factionId).targetCount,
      originalTargetCount,
      `${factionId} retains its finite reserve at a navigable capital`
    );
    const rebased = npcCapitalNavalReserveStatus(routes, factionId);
    assert.ok(rebased.slots.every((candidate) => candidate.originCityId === inlandCapital.cityId));
    assert.ok(rebased.slots.every((candidate) => candidate.profileId === originalProfileId));
    assert.equal(
      routes.shipById.has(response.shipId),
      true,
      `${factionId} sends its response ship back to the fallback capital`
    );
    assert.equal(routes.shipById.get(response.shipId).portResponse.phase, "returning");
    assert.equal(routes.shipById.get(response.shipId).portResponse.returnCityId, inlandCapital.cityId);
  }
});

test("a burning port activates one reserve sortie and the same port loss escalates that order", () => {
  const economy = createWorldEconomy({ ports: PORTS, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports: PORTS, startMinute: 0, economy });
  const before = npcCapitalNavalReserveStatus(routes, "portugal");

  const burning = orderNpcPortResponse(routes, {
    factionId: "portugal",
    targetCityId: routeCityId(routes, 5),
    reason: NPC_PORT_RESPONSE_BURNING,
    clockMinutes: 1000,
    threatUntilMinute: 4000
  });
  assert.equal(burning.outcome, "reserve-activated");
  const active = routes.shipById.get(burning.shipId);
  assert.ok(active);
  assert.equal(active.role, NPC_ROLE_WARSHIP);
  assert.equal(active.portResponse.targetCityId, PORTS[4].cityId);
  assert.equal(active.portResponse.reason, NPC_PORT_RESPONSE_BURNING);
  assert.equal(active.plan.destination.tileId, 5);
  const during = npcCapitalNavalReserveStatus(routes, "portugal");
  assert.equal(during.stockedCount, before.stockedCount - 1);
  assert.equal(during.deployedCount, 1);

  const lost = orderNpcPortResponse(routes, {
    factionId: "portugal",
    targetCityId: routeCityId(routes, 5),
    reason: NPC_PORT_RESPONSE_LOST,
    clockMinutes: 1100
  });
  assert.equal(lost.outcome, "already-responding");
  assert.equal(lost.shipId, burning.shipId);
  assert.equal(active.portResponse.reason, NPC_PORT_RESPONSE_LOST);
  assert.equal(active.portResponse.threatUntilMinute, null);
  assert.equal(npcCapitalNavalReserveStatus(routes, "portugal").activeCount, 1);
});

test("a resolved port threat sends its reserve ship home and restocks the same finite slot", () => {
  const economy = createWorldEconomy({ ports: PORTS, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports: PORTS, startMinute: 0, economy });
  const before = npcCapitalNavalReserveStatus(routes, "portugal");
  const response = orderNpcPortResponse(routes, {
    factionId: "portugal",
    targetCityId: routeCityId(routes, 1),
    reason: NPC_PORT_RESPONSE_BURNING,
    clockMinutes: 1000,
    threatUntilMinute: 1001
  });
  const ship = routes.shipById.get(response.shipId);

  updateNpcSeaRouteSystem(routes, 1001);
  assert.equal(ship.portResponse.phase, "returning");
  updateNpcSeaRouteSystem(routes, ship.plan.endMinute + 1);
  assert.ok(routes.shipById.has(ship.id));
  updateNpcSeaRouteSystem(routes, ship.plan.endMinute + 1);

  assert.equal(routes.shipById.has(ship.id), false);
  const returned = npcCapitalNavalReserveStatus(routes, "portugal");
  assert.equal(returned.stockedCount, before.stockedCount);
  assert.equal(returned.activeCount, 0);
  assert.equal(returned.vacantCount, 0);
});

test("an empty reserve slot buys a suitable hull elsewhere and sails it to the capital", () => {
  const economy = createWorldEconomy({ ports: PORTS, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports: PORTS, startMinute: 0, economy });
  const response = orderNpcPortResponse(routes, {
    factionId: "portugal",
    targetCityId: routeCityId(routes, 5),
    reason: NPC_PORT_RESPONSE_LOST,
    clockMinutes: 1000
  });
  const reserveShip = routes.shipById.get(response.shipId);
  damageNpcShip(routes, reserveShip.id, reserveShip.maxHitPoints);
  const sinking = sinkNpcShip(routes, reserveShip.id, 1001);
  assert.equal(sinking.replacement, null);
  assert.equal(npcCapitalNavalReserveStatus(routes, "portugal").vacantCount, 1);
  economy.shipyards.npcSales.push(Object.freeze({
    id: "goa-reserve-galleon:npc-sale",
    portId: PORTS[4].cityId,
    factionId: "portugal",
    shipSlug: "galleon",
    price: 60000,
    soldMinute: 1002
  }));

  updateNpcSeaRouteSystem(routes, 1002);
  const inTransit = npcCapitalNavalReserveStatus(routes, "portugal");
  assert.equal(inTransit.vacantCount, 0);
  assert.equal(inTransit.stockedCount, inTransit.targetCount - 1);
  assert.equal(inTransit.inTransitCount, 1);
  const transitSlot = inTransit.slots.find((slot) => slot.activeShipId !== null);
  const transitShip = routes.shipById.get(transitSlot.activeShipId);
  assert.equal(transitShip.currentPort.tileId, 5);
  assert.equal(transitShip.capitalNavalReserveDestinationCityId, PORTS[0].cityId);
  assert.equal(transitShip.plan.destination.tileId, 1);

  updateNpcSeaRouteSystem(routes, transitShip.plan.endMinute + 1);
  const restocked = npcCapitalNavalReserveStatus(routes, "portugal");
  assert.equal(restocked.stockedCount, restocked.targetCount);
  assert.equal(restocked.inTransitCount, 0);
  assert.equal(restocked.vacantCount, 0);
  assert.equal(routes.shipById.has(transitShip.id), false);
});

test("a realm without an existing sea reserve cannot conjure one at a fallback capital", () => {
  const cuzco = {
    ...port(82, "Cuzco", "Peru", "andean", -13.5319, -71.9675, 90000, "inca"),
    capitalOfFactionId: "inca",
    isFactionCapital: true
  };
  const ports = Object.freeze([...PORTS, Object.freeze(cuzco)]);
  const economy = createWorldEconomy({ ports, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports, startMinute: 0, economy });

  assert.equal(npcCapitalNavalReserveStatus(routes, "inca").targetCount, 0);
  assert.deepEqual(orderNpcPortResponse(routes, {
    factionId: "inca",
    targetCityId: cuzco.cityId,
    reason: NPC_PORT_RESPONSE_LOST,
    clockMinutes: 1000
  }), {
    outcome: "no-warship-available",
    factionId: "inca",
    targetCityId: cuzco.cityId,
    shipId: null
  });
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

test("Japanese NPC ships use the complete local roster without joining interregional fleets", () => {
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
      assert.equal(ship.mode, "regional", `${ship.id} joined ${ship.profileId}`);
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

test("saved Japanese coastal ships overextended toward Gibraltar return to East Asian waters", () => {
  const ports = [
    ...PORTS,
    port(40, "Kyoto", "Japan", "east-asian", 35.01, 135.77, 100000, "japan"),
    port(41, "Nagasaki", "Japan", "east-asian", 32.75, 129.88, 30000, "japan"),
    port(42, "Sakai", "Japan", "east-asian", 34.58, 135.47, 50000, "japan")
  ];
  const economy = createWorldEconomy({ ports, startMinute: 0, seedKey: "overextended-umi-bune" });
  const routes = createNpcSeaRouteSystem({
    ports,
    startMinute: 0,
    economy,
    seedKey: "overextended-umi-bune"
  });
  const snapshot = snapshotNpcSeaRouteSystem(routes);
  const saved = snapshot.ships.find((ship) => ship.slug === "japanese-kuribune");
  assert.ok(saved);
  const lisbon = routes.ports.find((entry) => entry.city === "Lisbon");
  const seville = routes.ports.find((entry) => entry.city === "Seville");
  assert.ok(lisbon && seville);
  saved.profileId = "wide-world";
  saved.mode = "interregional";
  saved.currentPort = { ...lisbon };
  saved.finalDestination = null;
  saved.plan = {
    origin: { ...lisbon },
    destination: { ...seville },
    segments: [{ kind: "sail", from: { ...lisbon }, to: { ...seville }, startMinute: 0, endMinute: 60 }],
    startMinute: 0,
    endMinute: 60
  };

  restoreNpcSeaRouteSystem(routes, snapshot, { economy, seedKey: "overextended-umi-bune" });

  const restored = routes.shipById.get(saved.id);
  assert.equal(restored.profileId, "east-asia");
  assert.equal(restored.mode, "regional");
  assert.ok(JAPANESE_SHIP_SLUGS.includes(restored.slug));
  assert.ok(restored.currentPort.lon > 120);
  assert.ok(restored.plan.destination.lon > 100);
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
    originCityId: yuquot.cityId,
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
    originCityId: hawaiiPort.cityId,
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
    port(10, "Aceh", "Indonesia", "southeast-asian", 5.55, 95.32, 35000, "neutral"),
    port(11, "Banten", "Indonesia", "southeast-asian", -6.04, 106.15, 24000, "neutral"),
    port(12, "Ternate", "Indonesia", "southeast-asian", 0.79, 127.38, 18000, "ternate")
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
  assert.ok(NPC_SHIP_SLUGS.includes("javanese-jong"));
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

test("version 2 NPC route saves gain stocked capital reserves without replacing established traffic", () => {
  const economy = createWorldEconomy({ ports: PORTS, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports: PORTS, startMinute: 0, economy });
  const snapshot = snapshotNpcSeaRouteSystem(routes);
  const establishedShipIds = snapshot.ships.map((ship) => ship.id).sort();
  snapshot.version = 2;
  delete snapshot.capitalNavalReserveSlots;
  for (const ship of snapshot.ships) {
    delete ship.capitalNavalReserveSlotId;
    delete ship.capitalNavalReserveDestinationCityId;
    delete ship.capitalNavalReserveDocked;
    delete ship.portResponse;
  }

  restoreNpcSeaRouteSystem(routes, snapshot, { economy });

  assert.deepEqual(routes.ships.map((ship) => ship.id).sort(), establishedShipIds);
  const portugal = npcCapitalNavalReserveStatus(routes, "portugal");
  assert.equal(portugal.targetCount, 2);
  assert.equal(portugal.stockedCount, portugal.targetCount);
  assert.equal(portugal.activeCount, 0);
  assert.ok(routes.ships.every((ship) => (
    ship.capitalNavalReserveSlotId === null && ship.portResponse === null
  )));
});

test("version 3 naval reserves migrate their navigation tiles to canonical origin cities", () => {
  const economy = createWorldEconomy({ ports: PORTS, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports: PORTS, startMinute: 0, economy });
  const snapshot = snapshotNpcSeaRouteSystem(routes);
  snapshot.version = 3;
  for (const slot of snapshot.capitalNavalReserveSlots) {
    slot.originPortId = routes.ports.find((port) => port.cityId === slot.originCityId).tileId;
    delete slot.originCityId;
  }

  restoreNpcSeaRouteSystem(routes, snapshot, { economy });

  const portugal = npcCapitalNavalReserveStatus(routes, "portugal");
  assert.ok(portugal.slots.every((slot) => slot.originCityId === PORTS[0].cityId));
  assert.ok(portugal.slots.every((slot) => slot.originPortId === undefined));
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

test("NPC event scheduling converts adjusted ship clocks back to the world clock", () => {
  const economy = createWorldEconomy({ ports: PORTS, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports: PORTS, startMinute: 0, economy });
  const ship = routes.ships.find((candidate) => (
    candidate.plan?.segments.some((segment) => segment.kind === "sail") &&
    !candidate.hiddenAtHideout
  ));
  assert.ok(ship);
  ship.clockOffsetMinutes = 240;

  const scheduled = npcSeaRouteEventSchedule(routes).find((event) => event.id === ship.id);
  assert.equal(scheduled.minute, Math.max(0, ship.plan.endMinute - 240));

  const visitsBefore = ship.portVisits;
  updateNpcSeaRouteEvents(routes, scheduled.minute, [ship.id]);
  assert.equal(ship.portVisits, visitsBefore + 1);
});

test("worker simulation updates distant ships while preserving visible ships", () => {
  const economy = createWorldEconomy({ ports: PORTS, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports: PORTS, startMinute: 0, economy });
  const protectedShip = routes.ships[0];
  const distantShip = routes.ships[1];
  const snapshot = snapshotNpcSeaRouteStrategicSystem(routes);
  const simulatedDistantShip = snapshot.ships.find((ship) => ship.id === distantShip.id);
  simulatedDistantShip.specie += 17;
  protectedShip.hitPoints -= 0.5;
  setNpcShipVisualNavigation(routes, protectedShip.id, [1, 0, 0], [0, 1, 0]);

  applyNpcSeaRouteSimulationSnapshot(routes, snapshot, {
    preserveShipIds: [protectedShip.id]
  });

  assert.equal(routes.shipById.get(protectedShip.id).hitPoints, protectedShip.hitPoints);
  assert.deepEqual(routes.shipById.get(protectedShip.id).visualNavigation.vector, [1, 0, 0]);
  assert.equal(routes.shipById.get(distantShip.id).specie, simulatedDistantShip.specie);
});

test("worker restore reconciles an obsolete NPC maximum hull before validation", () => {
  const economy = createWorldEconomy({ ports: PORTS, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports: PORTS, startMinute: 0, economy });
  const target = routes.ships[1];
  const snapshot = snapshotNpcSeaRouteStrategicSystem(routes);
  const simulated = snapshot.ships.find((ship) => ship.id === target.id);
  simulated.maxHitPoints = target.maxHitPoints / 2;
  assert.ok(simulated.hitPoints > simulated.maxHitPoints);

  applyNpcSeaRouteSimulationSnapshot(routes, snapshot);

  const restored = routes.shipById.get(target.id);
  assert.equal(restored.maxHitPoints, shipStatsForSlug(restored.slug).hitPoints);
  assert.equal(restored.hitPoints, restored.maxHitPoints);
});

test("strategic NPC snapshots serialize worldwide traffic in bounded batches", () => {
  const economy = createWorldEconomy({ ports: PORTS, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports: PORTS, startMinute: 0, economy });
  assert.ok(routes.ships.length > 2);
  const plan = createNpcSeaRouteStrategicSnapshotPlan(routes);

  assert.equal(advanceNpcSeaRouteStrategicSnapshotPlan(plan, { maxItems: 2 }), false);
  assert.equal(plan.snapshot.ships.length, 2);
  assert.ok(plan.snapshot.ships.every((ship) => ship.visualNavigation === null));

  let calls = 1;
  while (!advanceNpcSeaRouteStrategicSnapshotPlan(plan, { maxItems: 2 })) calls++;
  assert.ok(calls > 1);
  assert.deepEqual(plan.snapshot, snapshotNpcSeaRouteStrategicSystem(routes));
});

test("worker NPC restore stages a bounded fleet before one atomic commit", () => {
  const economy = createWorldEconomy({ ports: PORTS, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports: PORTS, startMinute: 0, economy });
  assert.ok(routes.ships.length > 2);
  const originalShips = routes.ships;
  const targetId = routes.ships[1].id;
  const snapshot = snapshotNpcSeaRouteStrategicSystem(routes);
  snapshot.ships.find((ship) => ship.id === targetId).specie += 99;
  const plan = createNpcSeaRouteSimulationRestorePlan(routes, snapshot);

  assert.equal(advanceNpcSeaRouteSimulationRestorePlan(plan, { maxItems: 1 }), false);
  assert.strictEqual(routes.ships, originalShips);
  assert.equal(plan.ships.length, 1);

  let calls = 1;
  while (!advanceNpcSeaRouteSimulationRestorePlan(plan, { maxItems: 1 })) {
    assert.strictEqual(routes.ships, originalShips);
    calls++;
  }
  assert.ok(calls > routes.ships.length);
  assert.notStrictEqual(routes.ships, originalShips);
  assert.equal(routes.shipById.get(targetId).specie, snapshot.ships.find(
    (ship) => ship.id === targetId
  ).specie);
});

test("a staged worker restore does not resurrect a reserve sortie returned between batches", () => {
  const economy = createWorldEconomy({ ports: PORTS, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports: PORTS, startMinute: 0, economy });
  const response = orderNpcPortResponse(routes, {
    factionId: "portugal",
    targetCityId: routeCityId(routes, 2),
    reason: NPC_PORT_RESPONSE_BURNING,
    clockMinutes: 100,
    threatUntilMinute: 101
  });
  const reserveShip = routes.shipById.get(response.shipId);
  const slotId = reserveShip.capitalNavalReserveSlotId;
  const snapshot = snapshotNpcSeaRouteStrategicSystem(routes);
  const plan = createNpcSeaRouteSimulationRestorePlan(routes, snapshot, {
    preserveShipIds: [reserveShip.id]
  });

  while (plan.phase !== "validate-ships") {
    assert.equal(advanceNpcSeaRouteSimulationRestorePlan(plan, { maxItems: 1 }), false);
  }
  updateNpcSeaRouteSystem(routes, 100_000);
  assert.equal(routes.shipById.has(reserveShip.id), false);
  const returnedSlot = routes.capitalNavalReserveSlots.find((slot) => slot.id === slotId);
  assert.equal(returnedSlot.activeShipId, null);
  assert.equal(returnedSlot.shipSlug, reserveShip.slug);

  while (!advanceNpcSeaRouteSimulationRestorePlan(plan, { maxItems: 1 })) {
    // The live return remains authoritative while the worker result commits in batches.
  }
  const restoredSlot = routes.capitalNavalReserveSlots.find((slot) => slot.id === slotId);
  assert.equal(routes.shipById.has(reserveShip.id), false);
  assert.equal(restoredSlot.activeShipId, null);
  assert.equal(restoredSlot.shipSlug, reserveShip.slug);
});

test("a staged worker restore keeps a reserve sortie launched between batches", () => {
  const economy = createWorldEconomy({ ports: PORTS, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports: PORTS, startMinute: 0, economy });
  const snapshot = snapshotNpcSeaRouteStrategicSystem(routes);
  const plan = createNpcSeaRouteSimulationRestorePlan(routes, snapshot);

  assert.equal(advanceNpcSeaRouteSimulationRestorePlan(plan, { maxItems: 1 }), false);
  const response = orderNpcPortResponse(routes, {
    factionId: "portugal",
    targetCityId: routeCityId(routes, 2),
    reason: NPC_PORT_RESPONSE_LOST,
    clockMinutes: 100
  });
  const reserveShip = routes.shipById.get(response.shipId);
  const slotId = reserveShip.capitalNavalReserveSlotId;
  assert.equal(
    routes.capitalNavalReserveSlots.find((slot) => slot.id === slotId).activeShipId,
    reserveShip.id
  );

  while (!advanceNpcSeaRouteSimulationRestorePlan(plan, { maxItems: 1 })) {
    // The ship and its finite reserve slot commit as one locally authoritative pair.
  }
  const restoredShip = routes.shipById.get(reserveShip.id);
  const restoredSlot = routes.capitalNavalReserveSlots.find((slot) => slot.id === slotId);
  assert.strictEqual(restoredShip, reserveShip);
  assert.equal(restoredSlot.activeShipId, reserveShip.id);
  assert.equal(restoredShip.capitalNavalReserveSlotId, restoredSlot.id);
});

test("a staged worker restore cannot revive a reserve sortie superseded between batches", () => {
  const economy = createWorldEconomy({ ports: PORTS, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports: PORTS, startMinute: 0, economy });
  const firstResponse = orderNpcPortResponse(routes, {
    factionId: "portugal",
    targetCityId: routeCityId(routes, 2),
    reason: NPC_PORT_RESPONSE_BURNING,
    clockMinutes: 100,
    threatUntilMinute: 101
  });
  const firstShip = routes.shipById.get(firstResponse.shipId);
  const slotId = firstShip.capitalNavalReserveSlotId;
  const snapshot = snapshotNpcSeaRouteStrategicSystem(routes);
  const plan = createNpcSeaRouteSimulationRestorePlan(routes, snapshot);

  while (plan.phase !== "validate-ships") {
    assert.equal(advanceNpcSeaRouteSimulationRestorePlan(plan, { maxItems: 1 }), false);
  }
  updateNpcSeaRouteSystem(routes, 100_000);
  assert.equal(routes.shipById.has(firstShip.id), false);

  const secondResponse = orderNpcPortResponse(routes, {
    factionId: "portugal",
    targetCityId: routeCityId(routes, 2),
    reason: NPC_PORT_RESPONSE_LOST,
    clockMinutes: 100_001,
    allowReinforcement: true
  });
  const secondShip = routes.shipById.get(secondResponse.shipId);
  assert.equal(secondShip.capitalNavalReserveSlotId, slotId);
  assert.notEqual(secondShip.id, firstShip.id);

  while (!advanceNpcSeaRouteSimulationRestorePlan(plan, { maxItems: 1 })) {
    // A stale worker ship cannot share the live sortie's reserve slot at commit.
  }
  const restoredSlot = routes.capitalNavalReserveSlots.find((slot) => slot.id === slotId);
  assert.equal(routes.shipById.has(firstShip.id), false);
  assert.strictEqual(routes.shipById.get(secondShip.id), secondShip);
  assert.equal(restoredSlot.activeShipId, secondShip.id);
  assert.equal(secondShip.capitalNavalReserveSlotId, restoredSlot.id);
});

test("a worker snapshot cannot retain a stale sortie beside its replacement", () => {
  const economy = createWorldEconomy({ ports: PORTS, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports: PORTS, startMinute: 0, economy });
  const firstResponse = orderNpcPortResponse(routes, {
    factionId: "portugal",
    targetCityId: routeCityId(routes, 2),
    reason: NPC_PORT_RESPONSE_BURNING,
    clockMinutes: 100,
    threatUntilMinute: 101
  });
  const firstShip = routes.shipById.get(firstResponse.shipId);
  const staleFirstShip = structuredClone(firstShip);
  const slotId = firstShip.capitalNavalReserveSlotId;

  updateNpcSeaRouteSystem(routes, 100_000);
  assert.equal(routes.shipById.has(firstShip.id), false);
  const secondResponse = orderNpcPortResponse(routes, {
    factionId: "portugal",
    targetCityId: routeCityId(routes, 2),
    reason: NPC_PORT_RESPONSE_LOST,
    clockMinutes: 100_001,
    allowReinforcement: true
  });
  const secondShip = routes.shipById.get(secondResponse.shipId);
  assert.equal(secondShip.capitalNavalReserveSlotId, slotId);

  const racedSnapshot = snapshotNpcSeaRouteStrategicSystem(routes);
  racedSnapshot.ships.push(staleFirstShip);
  applyNpcSeaRouteSimulationSnapshot(routes, racedSnapshot);

  const restoredSlot = routes.capitalNavalReserveSlots.find((slot) => slot.id === slotId);
  assert.equal(routes.shipById.has(firstShip.id), false);
  assert.equal(restoredSlot.activeShipId, secondShip.id);
  assert.equal(routes.shipById.get(secondShip.id).capitalNavalReserveSlotId, slotId);
});

test("a staged worker restore keeps an encounter created between batches", () => {
  const economy = createWorldEconomy({ ports: PORTS, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports: PORTS, startMinute: 0, economy });
  const snapshot = snapshotNpcSeaRouteStrategicSystem(routes);
  const plan = createNpcSeaRouteSimulationRestorePlan(routes, snapshot);

  assert.equal(advanceNpcSeaRouteSimulationRestorePlan(plan, { maxItems: 1 }), false);
  const encounter = configureNpcEncounter(routes, {
    id: "colony-defense:mid-restore",
    captainHomeCityId: PORTS[0].cityId,
    factionId: "neutral",
    role: NPC_ROLE_WARSHIP,
    shipSlug: "mesoamerican-dugout-canoe",
    lat: 45.5,
    lon: -73.6,
    headingDeg: 90,
    cultureType: "mesoamerican",
    routeRegion: "americas",
    specie: 0,
    replaceOnSink: false,
    encounter: { kind: "colonization-defense", forceAttack: true }
  }, 1000);

  while (!advanceNpcSeaRouteSimulationRestorePlan(plan, { maxItems: 1 })) {
    // New local entities are part of the authoritative side of the transaction.
  }
  assert.strictEqual(routes.shipById.get(encounter.id), encounter);
});

test("worker simulation cannot overwrite a scripted encounter added after its snapshot", () => {
  const economy = createWorldEconomy({ ports: PORTS, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports: PORTS, startMinute: 0, economy });
  const snapshot = snapshotNpcSeaRouteStrategicSystem(routes);
  const encounter = configureNpcEncounter(routes, {
    id: "colony-defense:late-worker-race",
    captainHomeCityId: PORTS[0].cityId,
    factionId: "neutral",
    role: NPC_ROLE_WARSHIP,
    shipSlug: "mesoamerican-dugout-canoe",
    lat: 45.5,
    lon: -73.6,
    headingDeg: 90,
    cultureType: "mesoamerican",
    routeRegion: "americas",
    specie: 0,
    replaceOnSink: false,
    encounter: { kind: "colonization-defense", forceAttack: true }
  }, 1000);
  const protectedIds = [
    routes.ships[0].id,
    ...npcShipIdsAddedSinceSimulationSnapshot(routes, snapshot)
  ];

  applyNpcSeaRouteSimulationSnapshot(routes, snapshot, { preserveShipIds: protectedIds });

  assert.strictEqual(routes.shipById.get(encounter.id), encounter);
  assert.ok(protectedIds.includes(encounter.id));
  assert.equal(new Set(protectedIds).size, protectedIds.length);
});

test("a worker snapshot cannot demobilize the reserve slot of a preserved visible sortie", () => {
  const economy = createWorldEconomy({ ports: PORTS, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports: PORTS, startMinute: 0, economy });
  const response = orderNpcPortResponse(routes, {
    factionId: "portugal",
    targetCityId: routeCityId(routes, 2),
    reason: NPC_PORT_RESPONSE_LOST,
    clockMinutes: 100
  });
  const protectedShip = routes.shipById.get(response.shipId);
  const slotId = protectedShip.capitalNavalReserveSlotId;
  const currentSlot = routes.capitalNavalReserveSlots.find((slot) => slot.id === slotId);
  assert.equal(currentSlot.activeShipId, protectedShip.id);

  const staleSnapshot = snapshotNpcSeaRouteStrategicSystem(routes);
  staleSnapshot.ships = staleSnapshot.ships.filter((ship) => ship.id !== protectedShip.id);
  const staleSlot = staleSnapshot.capitalNavalReserveSlots.find((slot) => slot.id === slotId);
  staleSlot.activeShipId = null;
  staleSlot.shipSlug = protectedShip.slug;
  staleSlot.stockedMinute = 101;

  applyNpcSeaRouteSimulationSnapshot(routes, staleSnapshot, {
    preserveShipIds: [protectedShip.id]
  });

  const restoredShip = routes.shipById.get(protectedShip.id);
  const restoredSlot = routes.capitalNavalReserveSlots.find((slot) => slot.id === slotId);
  assert.strictEqual(restoredShip, protectedShip);
  assert.equal(restoredShip.capitalNavalReserveSlotId, slotId);
  assert.equal(restoredSlot.activeShipId, protectedShip.id);
  assert.equal(restoredSlot.shipSlug, null);
});

test("a preserved reserve ship detaches when its worker snapshot removes the slot", () => {
  const economy = createWorldEconomy({ ports: PORTS, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports: PORTS, startMinute: 0, economy });
  const response = orderNpcPortResponse(routes, {
    factionId: "portugal",
    targetCityId: routeCityId(routes, 2),
    reason: NPC_PORT_RESPONSE_LOST,
    clockMinutes: 100
  });
  assert.ok(response.shipId);
  const protectedShip = routes.shipById.get(response.shipId);
  const removedSlotId = protectedShip.capitalNavalReserveSlotId;
  assert.ok(removedSlotId);
  const snapshot = snapshotNpcSeaRouteStrategicSystem(routes);
  snapshot.capitalNavalReserveSlots = snapshot.capitalNavalReserveSlots.filter(
    (slot) => slot.id !== removedSlotId
  );

  applyNpcSeaRouteSimulationSnapshot(routes, snapshot, {
    preserveShipIds: [protectedShip.id]
  });

  const restored = routes.shipById.get(protectedShip.id);
  assert.equal(restored.capitalNavalReserveSlotId, null);
  assert.equal(restored.capitalNavalReserveDestinationCityId, null);
  assert.equal(restored.capitalNavalReserveDocked, false);
  assert.equal(restored.replaceOnSink, true);
});

test("a worker snapshot demobilizes any reserve ship whose faction slot was abolished", () => {
  const economy = createWorldEconomy({ ports: PORTS, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports: PORTS, startMinute: 0, economy });
  const response = orderNpcPortResponse(routes, {
    factionId: "portugal",
    targetCityId: routeCityId(routes, 2),
    reason: NPC_PORT_RESPONSE_LOST,
    clockMinutes: 100
  });
  const reserveShip = routes.shipById.get(response.shipId);
  const removedSlotId = reserveShip.capitalNavalReserveSlotId;
  const snapshot = snapshotNpcSeaRouteStrategicSystem(routes);
  snapshot.capitalNavalReserveSlots = snapshot.capitalNavalReserveSlots.filter(
    (slot) => slot.id !== removedSlotId
  );

  applyNpcSeaRouteSimulationSnapshot(routes, snapshot);

  const restored = routes.shipById.get(reserveShip.id);
  assert.equal(restored.capitalNavalReserveSlotId, null);
  assert.equal(restored.capitalNavalReserveDestinationCityId, null);
  assert.equal(restored.capitalNavalReserveDocked, false);
  assert.equal(restored.replaceOnSink, true);
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
  pirate.clockOffsetMinutes = 120;

  const snapshot = snapshotNpcSeaRouteSystem(routes);
  restoreNpcSeaRouteSystem(routes, snapshot, { economy });

  const restored = routes.shipById.get(pirate.id);
  assert.equal(restored.hiddenAtHideout, true);
  assert.equal(restored.plan, null);
  assert.equal(restored.currentPort.tileId, hideout.tileId);
  assert.deepEqual(
    npcSeaRouteEventSchedule(routes).find((event) => event.id === restored.id),
    { id: restored.id, minute: restored.hiddenUntilMinute - restored.clockOffsetMinutes }
  );
  updateNpcSeaRouteEvents(routes, 4879, [restored.id]);
  assert.equal(restored.hiddenAtHideout, true);
  updateNpcSeaRouteEvents(routes, 4880, [restored.id]);
  assert.equal(restored.hiddenAtHideout, false);
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

test("saved routes using obsolete Istanbul anchors are replanned on restore", (t) => {
  const economy = createWorldEconomy({ ports: DARDANELLES_PORTS, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports: DARDANELLES_PORTS, startMinute: 0, economy });
  const snapshot = snapshotNpcSeaRouteSystem(routes);
  const saved = snapshot.ships[0];
  const alexandria = routes.ports.find((port) => port.city === "Alexandria");
  const istanbul = routes.ports.find((port) => port.city === "Istanbul");
  const redSeaNode = routes.laneNodes.get("red-sea");
  assert.ok(alexandria);
  assert.ok(istanbul);
  assert.ok(redSeaNode);
  saved.currentPort = alexandria;
  saved.finalDestination = null;
  saved.plan = {
    origin: alexandria,
    destination: istanbul,
    segments: [{
      kind: "sail",
      from: redSeaNode,
      to: istanbul,
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
  assert.ok(sailPairs.includes("dardanelles-south->dardanelles-north"), sailPairs.join(", "));
  assert.ok(sailPairs.includes("marmara-east->constantinople"), sailPairs.join(", "));
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

test("struck colors survive a compact save that rebuilds world traffic", () => {
  const economy = createWorldEconomy({ ports: PORTS, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports: PORTS, startMinute: 0, economy });
  const loser = routes.ships.find((ship) => ship.role === NPC_ROLE_MERCHANT && cargoUnits(ship) > 0);
  assert.ok(loser);
  surrenderNpcShip(routes, loser.id, null, { retainLoot: true });
  const continuity = snapshotNpcSurrenderContinuity(routes);
  const savedCargo = { ...loser.cargo };
  const savedSpecie = loser.specie;

  const rebuilt = createNpcSeaRouteSystem({ ports: PORTS, startMinute: 0, economy });
  const rebuiltIndex = rebuilt.ships.findIndex((ship) => ship.id === loser.id);
  assert.ok(rebuiltIndex >= 0);
  rebuilt.ships.splice(rebuiltIndex, 1);
  rebuilt.shipById.delete(loser.id);
  assert.equal(restoreNpcSurrenderContinuity(rebuilt, continuity), 1);

  const restored = rebuilt.shipById.get(loser.id);
  assert.ok(restored);
  assert.equal(npcShipHasCombatGrace(rebuilt, loser.id), true);
  assert.deepEqual(restored.cargo, savedCargo);
  assert.equal(restored.specie, savedSpecie);
});

test("legacy compact saves omit an unreconstructible surrendered ship without blocking load", () => {
  const economy = createWorldEconomy({ ports: PORTS, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports: PORTS, startMinute: 0, economy });
  const warnings = [];
  const originalWarn = console.warn;
  console.warn = (...args) => warnings.push(args.join(" "));
  try {
    const restored = restoreNpcSurrenderContinuity(routes, {
      version: 1,
      ships: [{
        id: "shipyard:legacy-missing:npc-sale",
        hitPointRatio: 0.5,
        specie: 0,
        cargo: {},
        cargoCost: {},
        seekingHideout: false
      }]
    });
    assert.equal(restored, 0);
  } finally {
    console.warn = originalWarn;
  }
  assert.match(warnings.join("\n"), /omitted legacy surrendered ship/);
});

test("a merciful surrender leaves stores aboard until the player accepts the prize", () => {
  const economy = createWorldEconomy({ ports: PORTS, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports: PORTS, startMinute: 0, economy });
  const loser = routes.ships.find((ship) => ship.role === NPC_ROLE_MERCHANT && cargoUnits(ship) > 0);
  assert.ok(loser);
  const specie = loser.specie;
  const cargo = { ...loser.cargo };

  surrenderNpcShip(routes, loser.id, null, { retainLoot: true });

  assert.equal(loser.specie, specie);
  assert.deepEqual(loser.cargo, cargo);
  assert.equal(npcShipHasCombatGrace(routes, loser.id), true);

  const claimed = claimSurrenderedNpcShipLoot(routes, loser.id);
  assert.deepEqual(claimed, { specie, cargo });
  assert.equal(loser.specie, 0);
  assert.deepEqual(loser.cargo, {});
  assert.throws(() => claimSurrenderedNpcShipLoot(routes, "missing"), /missing/i);
});

test("projectiles already in flight cannot make an NPC ship surrender twice", () => {
  const economy = createWorldEconomy({ ports: PORTS, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports: PORTS, startMinute: 0, economy });
  const loser = routes.ships.find((ship) => ship.role === NPC_ROLE_MERCHANT && cargoUnits(ship) > 0);
  assert.ok(loser);

  const firstHit = damageNpcShip(routes, loser.id, loser.maxHitPoints - 1);
  assert.equal(firstHit.shouldSurrender, true);
  surrenderNpcShip(routes, loser.id);
  const surrenderedHitPoints = loser.hitPoints;

  const lateHit = damageNpcShip(routes, loser.id, 1, { bypassArmor: true });
  assert.equal(lateHit.ignoredAfterSurrender, true);
  assert.equal(lateHit.shouldSurrender, false);
  assert.equal(lateHit.sunk, false);
  assert.equal(loser.hitPoints, surrenderedHitPoints);
  assert.throws(
    () => surrenderNpcShip(routes, loser.id),
    /already surrendered/
  );
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
    captainHomeCityId: PORTS[7].cityId,
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
    captainHomeCityId: PORTS[7].cityId,
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

test("sunk NPC ships wait for shipyard output before rejoining the fleet", () => {
  const economy = createWorldEconomy({ ports: PORTS, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports: PORTS, startMinute: 0, economy });
  const originalCount = routes.ships.length;
  routes.shipyardFleetGrowthLimit = originalCount;
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
  assert.equal(routes.shipById.has(lost.id), false);
  for (
    let minute = sinking.replacement.readyMinute + 30 * 24 * 60;
    !routes.shipById.has(lost.id) && minute <= sinking.replacement.readyMinute + 390 * 24 * 60;
    minute += 30 * 24 * 60
  ) {
    advanceWorldEconomy(economy, minute);
    updateNpcSeaRouteSystem(routes, minute);
  }
  const replacement = routes.shipById.get(lost.id);
  assert.ok(replacement);
  assert.equal(routes.ships.length, originalCount);
  assert.equal(replacement.role, originalRole);
  assert.equal(replacement.factionId, originalFaction);
  assert.equal(replacement.hitPoints, replacement.maxHitPoints);
  assert.equal(routes.replacementQueue.length, 0);
});

test("unsold shipyard hulls create capped peacetime NPC fleet growth", () => {
  const economy = createWorldEconomy({ ports: PORTS, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports: PORTS, startMinute: 0, economy });
  const originalCount = routes.ships.length;
  routes.shipyardFleetGrowthLimit = originalCount + 1;
  economy.shipyards.npcSales.length = 0;
  economy.shipyards.npcSales.push(Object.freeze({
    id: "shipyard-growth-test:npc-sale",
    portId: PORTS[0].cityId,
    factionId: PORTS[0].factionId,
    shipSlug: "caravel",
    price: 12000,
    soldMinute: 0
  }));

  updateNpcSeaRouteSystem(routes, 1);

  assert.equal(routes.ships.length, originalCount + 1);
  assert.equal(economy.shipyards.npcSales.length, 0);
  const newShip = routes.ships.find((ship) => ship.id.startsWith("shipyard:"));
  assert.equal(newShip?.slug, "caravel");
  assert.equal(newShip?.factionId, "portugal");
  updateNpcSeaRouteSystem(routes, 2);
  assert.equal(routes.ships.length, originalCount + 1);
});

test("temporary quest encounters persist in saves but never enter the replacement queue", () => {
  const economy = createWorldEconomy({ ports: PORTS, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports: PORTS, startMinute: 0, economy });
  const replacementCount = routes.replacementQueue.length;
  const encounter = configureNpcEncounter(routes, {
    id: "colony-defense:test:1",
    captainHomeCityId: PORTS[0].cityId,
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
  const savedEncounter = snapshot.ships.find((ship) => ship.id === encounter.id);
  assert.equal(savedEncounter.encounter.kind, "colonization-defense");
  assert.equal(savedEncounter.captainHomeCityId, PORTS[0].cityId);
  const restored = createNpcSeaRouteSystem({ ports: PORTS, startMinute: 0, economy });
  restoreNpcSeaRouteSystem(restored, snapshot, { economy });
  assert.equal(restored.shipById.get(encounter.id).encounter.kind, "colonization-defense");
  assert.equal(restored.shipById.get(encounter.id).captainHomeCityId, PORTS[0].cityId);
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
    originCityId: PORTS[0].cityId,
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

test("treasure pirates can patrol from an interregional-excluded Northwest Coast hideout", () => {
  const ports = [...PORTS, ...NORTHWEST_COAST_PORTS];
  const economy = createWorldEconomy({
    ports,
    startMinute: 0,
    seedKey: "ozette-treasure-patrol"
  });
  const routes = createNpcSeaRouteSystem({
    ports,
    startMinute: 0,
    economy,
    seedKey: "ozette-treasure-patrol"
  });
  const ozette = routes.ports.find((port) => port.city === "Ozette Village");
  const yuquot = routes.ports.find((port) => port.city === "Yuquot Village");
  const encounter = configureNpcRouteEncounter(routes, {
    id: "treasure-map-pirate-ozette",
    originCityId: ozette.cityId,
    factionId: PIRATE_FACTION_ID,
    role: NPC_ROLE_PIRATE,
    shipSlug: "pirate-brig",
    replaceOnSink: false,
    encounter: {
      kind: "treasure-map-pirate",
      pirateId: "ozette",
      routePolicy: NPC_ENCOUNTER_ROUTE_POLICY_CONNECTED_PATROL
    }
  }, 1000);

  assert.equal(encounter.plan.origin.tileId, ozette.tileId);
  assert.equal(encounter.plan.destination.tileId, yuquot.tileId);
});

test("routed delegation encounters depart for and wait at their specified destination", () => {
  const economy = createWorldEconomy({ ports: PORTS, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports: PORTS, startMinute: 0, economy });
  const delegation = configureNpcRouteEncounter(routes, {
    id: "delegation:test",
    originCityId: routeCityId(routes, 8),
    destinationCityId: routeCityId(routes, 9),
    departureDelayMinutes: 30,
    factionId: "ming",
    role: NPC_ROLE_WARSHIP,
    shipSlug: "small-junk",
    replaceOnSink: false,
    encounter: {
      kind: "test-delegation",
      destinationCityId: routeCityId(routes, 9),
      holdAtDestination: true
    }
  }, 1000);

  assert.equal(delegation.plan.origin.tileId, 8);
  assert.equal(delegation.plan.destination.tileId, 9);
  assert.equal(delegation.plan.startMinute, 1030);
  const arrivalMinute = delegation.plan.endMinute;
  updateNpcSeaRouteEvents(routes, arrivalMinute + 1, [delegation.id]);
  assert.equal(delegation.currentPort.tileId, 9);
  assert.equal(delegation.encounter.arrivedAtMinute, arrivalMinute);
  assert.equal(delegation.plan.segments[0].kind, "wait");
  const naturallyHeld = npcShipSnapshotForId(routes, delegation.id, arrivalMinute + 1);
  assert.equal(naturallyHeld.id, delegation.id);
  assert.equal(stageNpcRouteEncounterAtDestination(
    routes,
    delegation.id,
    arrivalMinute + 2,
    { holdProgress: 0.99 }
  ), true);
  assert.notDeepEqual(
    npcShipSnapshotForId(routes, delegation.id, arrivalMinute + 2).routeVector,
    naturallyHeld.routeVector
  );
  assert.equal(delegation.encounter.holdProgress, 0.99);
  assert.equal(stageNpcRouteEncounterAtDestination(
    routes,
    delegation.id,
    arrivalMinute + 3,
    { holdProgress: 0.99 }
  ), false);
});

test("legacy routed encounters adopt their canonical faction and vessel without losing position", () => {
  const economy = createWorldEconomy({ ports: PORTS, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports: PORTS, startMinute: 0, economy });
  const delegation = configureNpcRouteEncounter(routes, {
    id: "delegation:identity",
    originCityId: routeCityId(routes, 8),
    destinationCityId: routeCityId(routes, 9),
    factionId: "hosokawa",
    role: NPC_ROLE_MERCHANT,
    shipSlug: "japanese-kuribune",
    replaceOnSink: false,
    encounter: { kind: "test-delegation", destinationCityId: routeCityId(routes, 9) }
  }, 1000);
  const routeVector = npcShipSnapshotForId(routes, delegation.id, 1000).routeVector;

  const result = reconcileNpcRouteEncounterIdentity(routes, delegation.id, {
    factionId: "ouchi",
    role: NPC_ROLE_WARSHIP,
    shipSlug: "japanese-sekibune"
  });

  assert.deepEqual(result, {
    changed: true,
    factionChanged: true,
    roleChanged: true,
    shipChanged: true
  });
  assert.equal(delegation.factionId, "ouchi");
  assert.equal(delegation.role, NPC_ROLE_WARSHIP);
  assert.equal(delegation.slug, "japanese-sekibune");
  assert.deepEqual(npcShipSnapshotForId(routes, delegation.id, 1000).routeVector, routeVector);
});

test("routed delegations can be assembled at their hearing without waiting for the route clock", () => {
  const economy = createWorldEconomy({ ports: PORTS, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports: PORTS, startMinute: 0, economy });
  const delegation = configureNpcRouteEncounter(routes, {
    id: "delegation:staged",
    originCityId: routeCityId(routes, 8),
    destinationCityId: routeCityId(routes, 9),
    factionId: "ming",
    role: NPC_ROLE_WARSHIP,
    shipSlug: "small-junk",
    replaceOnSink: false,
    encounter: {
      kind: "test-delegation",
      destinationCityId: routeCityId(routes, 9),
      holdAtDestination: true,
      holdProgress: 0.93
    }
  }, 1000);
  const naturalArrivalMinute = delegation.plan.endMinute;

  assert.ok(naturalArrivalMinute > 1100);
  assert.equal(stageNpcRouteEncounterAtDestination(
    routes,
    delegation.id,
    1100,
    { holdProgress: 0.98 }
  ), true);
  assert.equal(delegation.currentPort.tileId, 9);
  assert.equal(delegation.encounter.arrivedAtMinute, 1100);
  assert.equal(delegation.plan.segments[0].kind, "wait");
  const held = npcShipSnapshotForId(routes, delegation.id, 1100);
  assert.equal(held.id, delegation.id);
  assert.match(held.routeKey, /^held:/);
  assert.equal(delegation.encounter.holdProgress, 0.98);
  assert.equal(stageNpcRouteEncounterAtDestination(routes, delegation.id, 1101), false);
  assert.deepEqual(npcShipSnapshotForId(routes, delegation.id, 1101).routeVector, held.routeVector);
});

test("legacy held delegations recover their visual position when restaged", () => {
  const economy = createWorldEconomy({ ports: PORTS, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports: PORTS, startMinute: 0, economy });
  const delegation = configureNpcRouteEncounter(routes, {
    id: "delegation:legacy-held",
    originCityId: routeCityId(routes, 8),
    destinationCityId: routeCityId(routes, 9),
    factionId: "ming",
    role: NPC_ROLE_WARSHIP,
    shipSlug: "small-junk",
    replaceOnSink: false,
    encounter: {
      kind: "test-delegation",
      destinationCityId: routeCityId(routes, 9),
      holdAtDestination: true,
      holdProgress: 0.93
    }
  }, 1000);
  stageNpcRouteEncounterAtDestination(routes, delegation.id, 1100);
  delegation.visualNavigation = null;
  delete delegation.encounter.holdApproachVectors;
  delete delegation.encounter.originCityId;

  assert.equal(stageNpcRouteEncounterAtDestination(
    routes,
    delegation.id,
    1101,
    { holdProgress: 0.93, originCityId: routeCityId(routes, 8) }
  ), true);
  const restored = npcShipSnapshotForId(routes, delegation.id, 1101);
  assert.equal(restored.id, delegation.id);
  assert.match(restored.routeKey, /^held:/);
  assert.equal(delegation.encounter.originCityId, routeCityId(routes, 8));
  assert.equal(delegation.encounter.holdProgress, 0.93);
});

test("the annual tea race launches five distinct wind-routed merchants for London", () => {
  const london = port(100, "London", "United Kingdom", "northern-european", 51.51, -0.13, 120000, "england");
  const ports = [...PORTS, london];
  const economy = createWorldEconomy({ ports, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports, startMinute: 0, economy });
  const manifest = teaRaceCompetitorManifest(
    "tea-race-1522",
    routeCityId(routes, 8),
    london.cityId
  );
  const racers = manifest.map((spec) => {
    const racer = configureNpcRouteEncounter(routes, {
      ...spec,
      replaceOnSink: false,
      encounter: {
        kind: "tea-race",
        questId: "tea-race-1522",
        destinationCityId: london.cityId,
        holdAtDestination: true,
        holdProgress: spec.holdProgress
      }
    }, 1000);
    assert.equal(storeNpcCargo(racer, "tea", TEA_RACE_CARGO_QUANTITY, 0, "test race"), 10);
    return racer;
  });

  assert.equal(racers.length, 5);
  assert.equal(new Set(racers.map((ship) => ship.slug)).size, 5);
  assert.ok(racers.every((ship) => ship.plan.destination.tileId === london.tileId));
  assert.ok(racers.every((ship) => ship.cargo.tea === TEA_RACE_CARGO_QUANTITY));
  assert.ok(racers.every((ship) => ship.plan.endMinute > ship.plan.startMinute));
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

function routeCityId(routes, tileId) {
  const matches = routes.ports.filter((candidate) => candidate.tileId === tileId);
  assert.equal(matches.length, 1, `test route tile ${tileId} must identify exactly one port`);
  return matches[0].cityId;
}

function port(tileId, city, country, cityType, lat, lon, population, factionId) {
  return {
    cityId: `${city.toLocaleLowerCase("en-US")}|${country.toLocaleLowerCase("en-US")}`,
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
