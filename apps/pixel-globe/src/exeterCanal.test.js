import { arrivalOfferEligible, recordArrivalOffer } from "./arrivalOfferCadence.js";
import { riverPortApproachReachable } from "./riverPortApproach.js";
import { createWorldMutationBoundary } from "./runtimeTransitions.js";
import { CITY_DATA_YEAR, loadCityCatalogFromCsv } from "./cityCatalogData.js";
import { createDirectionIndex } from "./geodesic.js";
import { placeCityCatalogOnWorld, portCitiesOnWorld, validateCityPortAccessCatalog } from "./worldPortPlacement.js";
import { portCityStaffRoleForDialogueSession } from "./portCityStaff.js";
import { dialogueOptionIconId } from "./gameIcons.js";
import { portCityLocationForRootAction } from "./portCityNavigation.js";
import { cityMustRemainInland } from "./cityPortAccessPolicy.js";
import { cityHasPortAccess } from "./cityPortAccess.js";
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { createPlayerTestGameState } from "./test-fixtures/createTestGameState.js";
import { migrateGameState } from "./gameState.js";
import { createPortDialogueSession, portDialogueView, selectPortDialogueAction } from "./dialogueSystem.js";
import { createWorldEconomy, worldEconomyHasShipyardPort, addWorldEconomyShipyardPort, worldEconomyHasPort, worldEconomyPortSettlementType, portMarket } from "./economy.js";
import { createExeterCanalMemory, exeterCanalStage, exeterCanalQuestView, EXETER_CANAL_STAGE_MINUTES, EXETER_CITY_ID, TOPSHAM_CITY_ID } from "./exeterCanal.js";
import { exeterCanalNavigation, exeterCanalPort, EXETER_CANAL_TILE_CHAIN } from "./exeterCanalNavigation.js";
import { decodeGeodesicGraphBake } from "./geodesicBake.js";
import { applyManualTerrainOverrides } from "./manualTerrainOverrides.js";
import { buildWorldNavigationTopology, canTraverseWorldNavigationEdge } from "./worldNavigationTopology.js";
import { activeQuestCargoRequirements } from "./activeQuestCargo.js";
import { fetchQuestRequirements, readyFetchQuestDestinations } from "./fetchQuestObjectives.js";
import { tradeGoodById } from "./economy.js";

const topsham = { cityId: TOPSHAM_CITY_ID, portId: TOPSHAM_CITY_ID, tileId: 644451, city: "Topsham", country: "United Kingdom", cityType: "northern-european", factionId: "england", settlementType: "town", population: 1500 };
const exeter = { ...topsham, cityId: EXETER_CITY_ID, portId: EXETER_CITY_ID, tileId: 161147, city: "Exeter", settlementType: "city", population: 6000 };

function commission() {
  const state = createPlayerTestGameState({ cargoCapacity: 100 });
  const session = createPortDialogueSession(topsham, { initialNodeId: "exeter-canal" });
  const view = () => {
    const result = portDialogueView(session, topsham, state, null, [topsham], { simMinute: 0 });
    assert.ok(portCityStaffRoleForDialogueSession(session));
    for (const option of result.options) assert.ok(dialogueOptionIconId(option));
    return result;
  };
  const choose = (type) => {
    const option = view().options.find((entry) => entry.action.type === type);
    assert.ok(option && !option.disabled, `Expected enabled ${type}`);
    return selectPortDialogueAction(session, topsham, state, null, [topsham], option, { simMinute: 0 });
  };
  return { state, session, view, choose };
}

test("Topsham's commissioner approaches on arrival and resumes the interrupted greeting", () => {
  const { state, session, view, choose } = commission();
  session.nodeId = "greeting";
  const source = readFileSync(new URL("./main.js", import.meta.url), "utf8");
  const start = source.indexOf("function maybeOpenExeterCanalArrivalDialogue(");
  const end = source.indexOf("function maybeOpenCrewRecruitmentArrival(", start);
  const context = vm.createContext({
    arrivalOfferEligible, recordArrivalOffer,
    dialogueState: session, gameState: state, weatherClockMinutes: 0,
    exeterCanalQuestView, invalidateDialogueOptionGeometry() {},
    ensureDialoguePortraitLoaded() {}, dirty: false
  });
  vm.runInContext(source.slice(start, end), context);
  assert.match(source.slice(source.indexOf("function continuePortArrivalDialogues("), start),
    /\(\) => maybeOpenExeterCanalArrivalDialogue\(cityCall\)/);
  assert.equal(context.maybeOpenExeterCanalArrivalDialogue(exeter), false);
  session.disguisedEntry = true;
  assert.equal(context.maybeOpenExeterCanalArrivalDialogue(topsham), false);
  session.disguisedEntry = false;
  assert.equal(context.maybeOpenExeterCanalArrivalDialogue(topsham), true);
  assert.equal(session.nodeId, "exeter-canal");
  assert.equal(view().options.at(-1).action.nodeId, "greeting");
  choose("accept-exeter-canal");
  choose("node");
  assert.equal(session.nodeId, "greeting");
  assert.equal(session.exeterCanalReturnNodeId, null);
  assert.equal(context.maybeOpenExeterCanalArrivalDialogue(topsham), false);
  session.nodeId = "exeter-canal";
  assert.equal(view().options.at(-1).action.nodeId, "inn-drink");
  session.nodeId = "root";
  session.exeterCanalArrivalPresented = false;
  assert.equal(context.maybeOpenExeterCanalArrivalDialogue(topsham), false,
    "an accepted commission with no materials does not interrupt every visit");
  state.cargo.timber = 10;
  assert.equal(context.maybeOpenExeterCanalArrivalDialogue(topsham), true,
    "returning with requested materials surfaces the delivery");
  assert.equal(view().options.at(-1).action.nodeId, "root");
  choose("node");
  assert.equal(session.nodeId, "root");
});

test("ordinary Topsham greetings surface mixed partial canal loads, including restored voyages", () => {
  const source = readFileSync(new URL("./main.js", import.meta.url), "utf8");
  const start = source.indexOf("function maybeOpenExeterCanalArrivalDialogue(");
  const end = source.indexOf("function maybeOpenCrewRecruitmentArrival(", start);
  for (const restored of [false, true]) {
    const original = commission();
    original.choose("accept-exeter-canal");
    Object.assign(original.state.cargo, { timber: 3, iron: 2, grain: 4 });
    const state = restored ? migrateGameState(JSON.parse(JSON.stringify(original.state))) : original.state;
    const session = createPortDialogueSession(topsham, { initialNodeId: "greeting", admittedToPort: true });
    const context = vm.createContext({
      arrivalOfferEligible, recordArrivalOffer,
      dialogueState: session, gameState: state, weatherClockMinutes: 1440,
      exeterCanalQuestView, invalidateDialogueOptionGeometry() {},
      ensureDialoguePortraitLoaded() {}, dirty: false
    });
    vm.runInContext(source.slice(start, end), context);
    assert.equal(context.maybeOpenExeterCanalArrivalDialogue(topsham), true);
    const view = () => portDialogueView(session, topsham, state, null, [topsham], { simMinute: 1440 });
    const delivery = view().options.find(entry => entry.action.type === "deliver-exeter-canal");
    assert.equal(delivery.disabled, false);
    selectPortDialogueAction(session, topsham, state, null, [topsham], delivery, { simMinute: 1440 });
    assert.deepEqual(state.memory.quests.cargoDeliveries, {
      "exeter-canal.timber": 3, "exeter-canal.iron": 2, "exeter-canal.grain": 4
    });
    const next = view().options.at(-1);
    assert.equal(next.action.nodeId, "greeting");
    selectPortDialogueAction(session, topsham, state, null, [topsham], next, { simMinute: 1440 });
    assert.equal(session.nodeId, "greeting");
    assert.equal(context.maybeOpenExeterCanalArrivalDialogue(topsham), false);
  }
});

test("partial canal deliveries interrupt other landing offers and preserve their continuation", () => {
  const source = readFileSync(new URL("./main.js", import.meta.url), "utf8");
  const start = source.indexOf("function maybeOpenExeterCanalArrivalDialogue(");
  const end = source.indexOf("function maybeOpenCrewRecruitmentArrival(", start);
  for (const nodeId of ["quest", "loadout", "marque-factor-offer", "drunk-captain"]) {
    for (const goodId of ["timber", "iron", "grain"]) {
      const { state, session, view, choose } = commission();
      choose("accept-exeter-canal");
      state.cargo[goodId] = 1;
      session.nodeId = nodeId;
      session.nextPortNodeId = "greeting";
      const context = vm.createContext({
        arrivalOfferEligible, recordArrivalOffer,
        dialogueState: session, gameState: state, weatherClockMinutes: 0,
        exeterCanalQuestView, invalidateDialogueOptionGeometry() {},
        ensureDialoguePortraitLoaded() {}, dirty: false
      });
      vm.runInContext(source.slice(start, end), context);
      assert.equal(context.maybeOpenExeterCanalArrivalDialogue(topsham), false,
        "ordinary submenu navigation must not interrupt the player");
      assert.equal(context.maybeOpenExeterCanalArrivalDialogue(topsham, { arriving: true }), true,
        `${goodId} delivery must surface before ${nodeId}`);
      assert.equal(view().options.at(-1).action.nodeId, nodeId);
      choose("deliver-exeter-canal");
      assert.equal(state.memory.quests.cargoDeliveries[`exeter-canal.${goodId}`], 1);
      choose("node");
      assert.equal(session.nodeId, nodeId);
      assert.equal(session.nextPortNodeId, "greeting");
      assert.equal(context.maybeOpenExeterCanalArrivalDialogue(topsham, { arriving: true }), false);
    }
  }
  assert.match(source, /maybeOpenExeterCanalArrivalDialogue\(cityCall, \{ arriving: true \}\)/);
});

test("the canal commission permits partial deliveries and never offers an executable empty delivery", () => {
  const { state, view, choose } = commission();
  choose("accept-exeter-canal");
  assert.equal(view().options.find((entry) => entry.action.type === "deliver-exeter-canal").disabled, true);
  state.cargo.timber = 10;
  choose("deliver-exeter-canal");
  assert.equal(state.memory.quests.exeterCanal.startedMinute, null);
  assert.equal(state.cargo.timber, undefined);
  assert.equal(exeterCanalQuestView(state, topsham, 0).materials[0].remainingQuantity, 20);
  Object.assign(state.cargo, { timber: 22, iron: 12, grain: 20 });
  choose("deliver-exeter-canal");
  assert.equal(state.cargo.timber, 2);
  assert.equal(state.memory.quests.exeterCanal.startedMinute, 0);
  assert.equal(view().options.some((entry) => entry.action.type === "deliver-exeter-canal"), false);
  for (const stage of [0, 1, 2, 3]) {
    const minute = stage * EXETER_CANAL_STAGE_MINUTES;
    const restored = JSON.parse(JSON.stringify(state));
    assert.equal(exeterCanalStage(restored.memory.quests.exeterCanal, minute), stage);
    assert.equal(exeterCanalQuestView(restored, topsham, minute).complete, stage === 3);
    if (stage > 0) assert.equal(exeterCanalStage(restored.memory.quests.exeterCanal, minute - 1), stage - 1);
  }
});

test("canal actions reject stale delivery, wrong ports and disguised entry", () => {
  const { state, session, choose } = commission();
  choose("accept-exeter-canal");
  const delivery = { action: { type: "deliver-exeter-canal" } };
  assert.throws(() => selectPortDialogueAction(session, topsham, state, null, [topsham], delivery), /No commissioned/);
  assert.equal(exeterCanalQuestView(state, exeter, 0), null);
  session.disguisedEntry = true;
  state.cargo.timber = 10;
  assert.throws(() => selectPortDialogueAction(session, topsham, state, null, [topsham], delivery), /No commissioned|disguis/i);
  assert.equal(state.cargo.timber, 10);
  assert.throws(() => exeterCanalStage({ ...createExeterCanalMemory(), accepted: true, startedMinute: 10 }, 9), /clock/);
});

test("canal cargo warnings and delivery navigation track only outstanding commissioned materials", () => {
  const { state, choose } = commission();
  const cargo = () => activeQuestCargoRequirements(state).filter(({ id }) => id.startsWith("exeter-canal."));
  const fetch = () => {
    const quest = exeterCanalQuestView(state, topsham, 0);
    return fetchQuestRequirements({ exeterCanal: { ...quest,
      materials: quest.materials.map((material) => ({ ...material, goodLabel: tradeGoodById(material.goodId).label }))
    }, exeterCanalPort: topsham });
  };
  assert.deepEqual(cargo(), []);
  assert.deepEqual(fetch(), []);
  choose("accept-exeter-canal");
  state.cargo.timber = 10;
  choose("deliver-exeter-canal");
  assert.equal(cargo().find(({ goodId }) => goodId === "timber").remainingQuantity, 20);
  assert.deepEqual(readyFetchQuestDestinations(fetch()), []);
  Object.assign(state.cargo, { timber: 20, iron: 12, grain: 20 });
  const destinations = readyFetchQuestDestinations(fetch());
  assert.equal(destinations.length, 1);
  assert.equal(destinations[0].destination.cityId, TOPSHAM_CITY_ID);
  assert.equal(destinations[0].requirementIds.length, 3);
  choose("deliver-exeter-canal");
  assert.deepEqual(cargo(), []);
  assert.deepEqual(fetch(), []);
});

test("v104 voyages acquire an unbuilt canal while current saves preserve construction", () => {
  const state = createPlayerTestGameState({ cargoCapacity: 100 });
  state.version = 104;
  delete state.memory.quests.exeterCanal;
  const restored = migrateGameState(state);
  assert.deepEqual(restored.memory.quests.exeterCanal, createExeterCanalMemory());
});

test("real-map canal stages add connected cuts and restore the original map without mutation", () => {
  const bytes = readFileSync(new URL("../../../examples/globe-demo/public/geodesic-graph-8.bin", import.meta.url));
  const graph = decodeGeodesicGraphBake(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), 8);
  const earth = JSON.parse(readFileSync(new URL("../../../examples/globe-demo/public/earth-globe-cache-8.json", import.meta.url)));
  const earthRows = applyManualTerrainOverrides(earth.tiles, 8);
  const base = buildWorldNavigationTopology({ graph, earthRows, earthCache: earth, subdivisions: 8 });
  const original = base.riverMasks.slice();
  const placement = { graph, earthRows, ...base, directionIndex: createDirectionIndex(graph) };
  const csv = readFileSync(new URL("../../../examples/globe-demo/public/datasets/urbanization-dominance-pruned/urbanization-dominance-pruned.csv", import.meta.url), "utf8");
  const placed = placeCityCatalogOnWorld({ ...placement, cities: loadCityCatalogFromCsv(csv, CITY_DATA_YEAR) });

  const inlandCity = [...placed.values()].find(({ cityId }) => cityId === EXETER_CITY_ID);
  assert.equal(inlandCity.tileId, exeter.tileId);
  assert.equal(cityHasPortAccess({ ...placement, tileId: inlandCity.tileId }), false,
    "Exeter must be beyond ordinary docking reach without relying on its quest exclusion");
  assert.equal(cityHasPortAccess({ ...placement, tileId: topsham.tileId }), true);
  assert.equal(exeterCanalPort(placed.values()).cityId, EXETER_CITY_ID);

  assert.equal(exeterCanalPort([topsham, exeter]).cityId, EXETER_CITY_ID);
  for (const stage of [0, 1, 2, 3]) {
    const navigation = exeterCanalNavigation(base, graph, earthRows, stage);
    const options = { ...placement, ...navigation, exeterCanalOpen: stage === 3 };
    if (stage === 3) {
      assert.equal(riverPortApproachReachable({ graph, earthRows, ...navigation,
        shipTileId: topsham.tileId, portTileId: exeter.tileId }), true);
      for (const neighbor of graph.neighbors[exeter.tileId]) {
        if (EXETER_CANAL_TILE_CHAIN.includes(neighbor)) continue;
        assert.equal(riverPortApproachReachable({ graph, earthRows, ...navigation,
          shipTileId: neighbor, portTileId: exeter.tileId }), false, `cannot dock across land from ${neighbor}`);
      }
    }

    const ports = portCitiesOnWorld(placed, options);
    assert.equal(ports.some((city) => city.cityId === EXETER_CITY_ID), stage === 3);
    assert.equal(validateCityPortAccessCatalog(placed, ports, options), true);

    for (let index = 0; index < 2; index++) {
      assert.equal(canTraverseWorldNavigationEdge({ graph, earthRows, ...navigation,
        fromTileId: EXETER_CANAL_TILE_CHAIN[index], toTileId: EXETER_CANAL_TILE_CHAIN[index + 1] }), stage > index);
    }
  }
  assert.deepEqual(base.riverMasks, original);
  assert.equal(exeterCanalNavigation(base, graph, earthRows, 0), base);
  assert.throws(() => exeterCanalNavigation(base, graph, earthRows, 4), /stage/);
  assert.throws(() => exeterCanalPort([topsham, { ...exeter, tileId: 0 }]), /canonical/);
});

test("live canal activation gates every port index, preserves the inland market, and is idempotent", () => {
  const source = readFileSync(new URL("./main.js", import.meta.url), "utf8");
  const start = source.indexOf("function updateSettlementMaritimeAccess(");
  const end = source.indexOf("function syncColonizationWorldState(", start);
  const state = createPlayerTestGameState({ cargoCapacity: 100 });
  state.memory.quests.exeterCanal = { version: 1, accepted: true, startedMinute: 0 };
  const economy = createWorldEconomy({ ports: [topsham, exeter], shipyardPorts: [topsham], startMinute: 0 });
  const before = portMarket(economy, exeter);
  const npcPorts = new Set([TOPSHAM_CITY_ID]);
  let invalidations = 0;
  const context = vm.createContext({
    BUILD_EDITION_ID: "full", EXETER_CITY_ID, exeterCanalStage, exeterCanalPort,
    exeterCanalNavigation: (base, graph, rows, stage) => ({ riverMasks: [stage], reachableNavigationMask: [stage] }),
    appliedExeterCanalStage: 0, exeterCanalBaseNavigation: {}, graph: {}, earthById: [],
    riverMasks: [], oceanReachableNavigationMask: [],
    cityById: new Map([[EXETER_CITY_ID, exeter], [TOPSHAM_CITY_ID, topsham]]),
    portCities: [topsham], portCitiesByTileId: new Map([[topsham.tileId, topsham]]),
    distantWorldWorkerClient: {}, invalidateDistantWorldWorkerState: () => invalidations++,
    worldEconomy: economy, worldEconomyPortSettlementType, worldEconomyHasPort, worldEconomyHasShipyardPort, addWorldEconomyShipyardPort,
    connectNearbyPortMarkets: () => {}, sailingDistanceBetweenPorts: () => 1,
    npcSeaRoutes: {}, npcSeaRouteHasPort: (_, city) => npcPorts.has(city.cityId),
    addNpcSeaRoutePort: (_, city) => npcPorts.add(city.cityId), ensurePortCityStaffRoster: () => {},
    buildPortArrivalNavigation: ({ ports }) => new Map(ports.map((port) => [port.cityId, {}])),
    portArrivalApproachKind: () => "river", portArrivalNavigationByCityId: new Map(), chart: {}, dirty: false
  });
  context.runPlayerWorldMutation = createWorldMutationBoundary(context.invalidateDistantWorldWorkerState);
  vm.runInContext(source.slice(start, end), context);
  for (const stage of [1, 2]) {
    context.syncExeterCanalWorldState(state, stage * EXETER_CANAL_STAGE_MINUTES);
    assert.equal(context.portCities.some((city) => city.cityId === EXETER_CITY_ID), false);
    assert.equal(context.portCitiesByTileId.has(exeter.tileId), false);
    assert.equal(npcPorts.has(EXETER_CITY_ID), false);
    assert.equal(worldEconomyHasShipyardPort(economy, exeter), false);
  }
  context.syncExeterCanalWorldState(state, 3 * EXETER_CANAL_STAGE_MINUTES);
  assert.equal(context.portCitiesByTileId.get(exeter.tileId), exeter);
  assert.equal(context.portArrivalNavigationByCityId.has(EXETER_CITY_ID), true);
  assert.equal(npcPorts.has(EXETER_CITY_ID), true);
  assert.equal(worldEconomyHasShipyardPort(economy, exeter), true);
  assert.equal(portMarket(economy, exeter).specie, before.specie);
  assert.equal(context.syncExeterCanalWorldState(state, 4 * EXETER_CANAL_STAGE_MINUTES), false);
  assert.equal(context.portCities.filter((city) => city.cityId === EXETER_CITY_ID).length, 1);
  assert.equal(invalidations, 3);
  state.memory.quests.exeterCanal = createExeterCanalMemory();
  context.syncExeterCanalWorldState(state, 0, { restoring: true });
  assert.equal(context.portCitiesByTileId.has(exeter.tileId), false);
});


test("the canal commissioner is an inn action and only completed infrastructure overrides inland policy", () => {
  assert.equal(portCityLocationForRootAction({ type: "node", nodeId: "exeter-canal" }), "inn");
  assert.ok(dialogueOptionIconId({ action: { type: "node", nodeId: "exeter-canal" } }));
  assert.equal(cityMustRemainInland(exeter), true);
  assert.equal(cityMustRemainInland(exeter, { exeterCanalOpen: true }), false);
  assert.equal(cityMustRemainInland({ cityId: "kazan|russian federation" }, { exeterCanalOpen: true }), true);
});

test("the commissioner leaves the inn after the canal is completed", () => {
  const { state, choose } = commission();
  choose("accept-exeter-canal");
  state.cargo = { timber: 30, iron: 12, grain: 20 };
  choose("deliver-exeter-canal");
  const session = createPortDialogueSession(topsham, { initialNodeId: "inn-drink", admittedToPort: true });
  for (const stage of [0, 2, 3]) {
    const view = portDialogueView(session, topsham, state, null, [topsham], { simMinute: stage * EXETER_CANAL_STAGE_MINUTES, innDialogue: { speaker: "Innkeeper", text: "Welcome", expressionId: "neutral" } });
    assert.equal(view.options.some(option => option.action.nodeId === "exeter-canal"), stage < 3);
  }
});
