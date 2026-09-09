import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { createWorldMutationBoundary, dispatchActionEffects } from "./runtimeTransitions.js";

const source = ts.createSourceFile("main.js", readFileSync(new URL("./main.js", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
const declaration = name => source.statements.find(node => ts.isFunctionDeclaration(node) && node.name.text === name);
function runtimeFunctions(names, context) {
  vm.createContext(context);
  vm.runInContext(names.map(name => declaration(name).getText(source)).join("\n"), context);
  return context;
}

test("player mutation drains the worker before resolving objects, and nests only once", () => {
  let yard = { captain: null }, drains = 0;
  const oldYard = yard;
  const mutate = createWorldMutationBoundary(() => { drains++; yard = { captain: null }; });
  mutate(() => mutate(() => { yard.captain = "captain-1"; }));
  assert.equal(drains, 1);
  assert.equal(oldYard.captain, null);
  assert.equal(yard.captain, "captain-1");
  assert.throws(() => mutate(() => { throw new Error("failed transaction"); }), /failed transaction/);
  mutate(() => {});
  assert.equal(drains, 3, "a failed transaction must release the nesting guard");
  assert.throws(() => mutate(async () => assert.fail("async mutation started")), /synchronous/);
});

test("supply captain survives a pending worker commit replacing the yard", () => {
  let yard = { upgrades: { supplyCaptainIdentity: null } };
  const old = yard;
  const context = runtimeFunctions(["retainSupplyCaptainIdentity"], {
    npcSeaRoutes: { economy: { shipyards: {} } }, reservedSupplyShipyard: () => yard,
    runPlayerWorldMutation: createWorldMutationBoundary(() => { yard = { upgrades: { supplyCaptainIdentity: null } }; })
  });
  context.retainSupplyCaptainIdentity("merchant-1", { id: "captain-1", name: "Captain" });
  assert.equal(old.upgrades.supplyCaptainIdentity, null);
  assert.equal(yard.upgrades.supplyCaptainIdentity.id, "captain-1");
});

test("effect batches reject unknown effects before any side effects or saving", () => {
  const calls = [];
  assert.throws(() => dispatchActionEffects([{ type: "cargo" }, { type: "typo" }], { cargo: () => calls.push("cargo") }), /Unhandled action effect: typo/);
  assert.deepEqual(calls, []);
  dispatchActionEffects([{ type: "cargo" }, { type: "save" }], { cargo: () => calls.push("cargo"), save: () => calls.push("save") });
  assert.deepEqual(calls, ["cargo", "save"]);
});

test("shared completion establishes quest fleets and synchronizes cargo before saving", () => {
  const calls = [];
  const context = runtimeFunctions(["completeDialogueActionEffects"], {
    dispatchActionEffects, gameState: { doubloons: 10 }, EAST_ASIAN_MISSION_NINGBO: "ningbo",
    isWokouHuntQuest: () => false, isTeaRaceQuest: () => true,
    reconcileForeignSettlementPolitics: () => calls.push("politics"), syncShipCargoFromGameState: () => calls.push("cargo"),
    playCoinClinkSound: () => calls.push("coins"), ensureTeaRaceEncounters: () => calls.push("fleet"),
    saveVoyageNow: () => calls.push("save")
  });
  context.completeDialogueActionEffects({ acceptedQuest: {} }, { doubloonsBefore: 0, purchaseIconOrigin: null, saveReason: "quest" });
  assert.deepEqual(calls, ["politics", "cargo", "coins", "fleet", "save"]);
  calls.length = 0;
  context.completeDialogueActionEffects({}, { doubloonsBefore: 10, purchaseIconOrigin: null, saveReason: null });
  assert.ok(!calls.includes("save"), "open transaction ledgers defer persistence");
});

for (const destination of ["sailing", "port-wait", "handoff"]) {
  test(`dialogue exit to ${destination} clears cached UI and preserves the right motion state`, () => {
    const calls = [];
    const context = runtimeFunctions(["releaseDialogueSession"], {
      dialogueState: {}, dialogueViewCache: {}, dialogueShipMotionPause: { speed: 1 },
      clearPausedView: () => calls.push("cache"), createDialogueLayoutState: () => ({ scrollOffset: 0 }),
      deactivatePortCityView: () => calls.push("scene"), stopShipForDialogue: () => calls.push("stop")
    });
    context.releaseDialogueSession({ destination });
    assert.equal(context.dialogueState, null);
    assert.equal(context.dialogueLayout.scrollOffset, 0);
    assert.equal(calls.includes("scene"), destination !== "handoff");
    assert.equal(calls.includes("stop"), destination === "port-wait");
    assert.equal(context.dialogueShipMotionPause === null, destination === "port-wait");
    assert.throws(() => context.releaseDialogueSession({ destination: "unknown" }), /Unknown dialogue exit/);
  });
}

test("settlement opening, repeated synchronization and closing keep access indexes consistent", () => {
  const city = { cityId: "exeter", tileId: 2, settlementType: "city" };
  const calls = [];
  let market = true, yard = false, npc = false;
  const context = runtimeFunctions(["updateSettlementMaritimeAccess"], {
    BUILD_EDITION_ID: "full", portCities: [], portCitiesByTileId: new Map(), worldEconomy: {}, npcSeaRoutes: {},
    runPlayerWorldMutation: createWorldMutationBoundary(() => calls.push("drain")),
    ensurePortCityStaffRoster() {}, worldEconomyHasPort: () => market,
    worldEconomyHasShipyardPort: () => yard, worldEconomyPortSettlementType: () => "city",
    addWorldEconomyPort: () => { market = true; calls.push("new-market"); },
    addWorldEconomyShipyardPort: () => { yard = true; }, replaceWorldEconomyPort() {},
    connectNearbyPortMarkets: () => calls.push("connect"), sailingDistanceBetweenPorts() {},
    npcSeaRouteHasPort: () => npc, addNpcSeaRoutePort: () => { npc = true; },
    npcSeaRoutePortSettlementType: () => "city", replaceNpcSeaRoutePort() {},
    portArrivalApproachKind() {}, buildPortArrivalNavigation: ({ ports }) => new Map(ports.map(port => [port.cityId, {}]))
  });
  for (let i = 0; i < 2; i++) context.updateSettlementMaritimeAccess(city, { accessible: true, startMinute: 1 });
  assert.equal(context.portCities.length, 1);
  assert.equal(context.portCitiesByTileId.get(2), city);
  assert.ok(context.portArrivalNavigationByCityId.has("exeter"));
  assert.equal(calls.filter(c => c === "connect").length, 1);
  assert.ok(!calls.includes("new-market"), "preserve the inland market and its stock");
  context.updateSettlementMaritimeAccess({ ...city, colonyAbandoned: true }, { accessible: false, startMinute: 2 });
  assert.equal(context.portCities.length, 0);
  assert.equal(context.portCitiesByTileId.size, 0);
  assert.equal(context.portArrivalNavigationByCityId.size, 0);
  assert.equal(market, true, "closing access preserves economic history");
});

test("restore preparation failures leave the active domain state and clock untouched", async () => {
  const statements = declaration("restoreSavedVoyage").body.statements;
  const first = statements.findIndex(n => n.getText(source).startsWith("const candidateCatalog"));
  const publish = statements.findIndex(n => n.getText(source) === "clearPoliticalNotices();");
  assert.ok(first >= 0 && publish > first);
  const code = statements.slice(first, publish).map(n => n.getText(source)).join("\n");
  for (const phase of ["catalog", "assets", "portrait", "superseded", "world", "surrender", "hull", "crew", "validation"]) {
    const failAt = name => { if (phase === name) throw new Error(name); };
    const active = { voyage: "old" };
    const context = {
      isCurrent: () => phase !== "superseded", gameState: active, weatherClockMinutes: 10, restoredGameState: { voyage: "candidate" },
      restoredWorldClock: { currentMinute: 100 }, savedShip: { typeSlug: "galleon" }, stats: {}, payload: {},
      savedWorldTopology: {}, legacyCityIdForPortReference() {},
      prepareSavedVoyageCityCatalog: () => { failAt("catalog"); return {}; },
      loadShipAssetSet: async () => { failAt("assets"); return {}; }, characterExpression() {},
      ensureCharacterPortraitLoaded: async () => failAt("portrait"),
      prepareSavedVoyageWorld: () => { failAt("world"); return { worldEconomy: { shipyards: {} }, npcSeaRoutes: { ships: [], replacementQueue: [] } }; },
      restoreNpcSurrenderContinuity: () => failAt("surrender"), advanceShipyardTradeInSerialsPastFleet() {},
      reconcileShipHullForCurrentStats: () => failAt("hull"), restoreOverboardCrew: () => failAt("crew"),
      validateGameState: () => failAt("validation")
    };
    await assert.rejects(vm.runInNewContext(`(async () => { ${code} })()`, context), new RegExp(phase));
    assert.equal(context.gameState, active);
    assert.equal(context.weatherClockMinutes, 10);
  }
});

test("restoring fleets does not charge their provisional constructor cargo to saved markets", () => {
  const oldEconomy = { stock: 999 };
  const state = { voyageSeed: "restore-test", memory: { shipyardInvestment: { backedPortCityIds: [] }, whales: {} },
    relations: { diplomacy: { suzerainties: {} }, foreignSettlementExpulsions: {}, tradeEmbargoes: {} } };
  const context = runtimeFunctions(["prepareSavedVoyageWorld"], {
    worldEconomy: oldEconomy, structuredClone, landRoadNetwork: {}, portSailingDistances: {},
    portSailingDistanceKm: () => 1, diplomacyBetweenForState: () => 0,
    createWorldEconomy: () => ({ stock: 100, shipyards: {} }), connectNearbyPortMarkets() {},
    restoreWorldEconomy: (economy, snapshot) => { economy.stock = snapshot.stock; },
    snapshotWorldEconomy: economy => ({ stock: economy.stock }),
    restoreOrRecreateDerivedSaveState: ({ current, restore }) => { restore(current); return { value: current, error: null }; },
    recordDerivedSaveRecovery: (_recovered, _label, error) => { if (error) throw error; },
    reconcilePlayerShipyardInvestmentWorld: () => [], assertPlayerShipyardInvestmentWorldConsistency() {},
    syncJapaneseMatchlockIndustry() {}, syncCaribbeanGingerIndustry() {},
    createLandTradeSystem: ({ economy }) => { economy.stock -= 7; return { economy, carts: [] }; },
    restoreLandTradeSystem() {},
    createNpcSeaRouteSystem: ({ economy }) => { economy.stock -= 11; return { economy, ships: [], replacementQueue: [] }; },
    restoreNpcSeaRouteSystem() {}, restoreShipyardSupplyShips() {}, npcFishingGroundIsNavigable() {}
  });
  const payload = { economy: { stock: 50, lastMinute: 10 }, worldClock: { currentMinute: 10 }, landTrade: {}, npcRoutes: {} };
  const result = context.prepareSavedVoyageWorld(payload, state, { changed: false }, () => {}, { cities: new Map(), ports: [] });
  assert.equal(result.worldEconomy.stock, 50, "restored fleets already own their cargo");
  assert.equal(result.landTradeSystem.economy, result.worldEconomy);
  assert.equal(result.npcSeaRoutes.economy, result.worldEconomy);
  assert.equal(context.worldEconomy, oldEconomy);
  assert.equal(oldEconomy.stock, 999);
  const seeded = context.prepareSavedVoyageWorld({ worldClock: { currentMinute: 10 } }, state,
    { changed: false }, () => {}, { cities: new Map(), ports: [] });
  assert.equal(seeded.worldEconomy.stock, 82, "new derived fleets buy initial cargo exactly once");
});

test("restored city catalogs rebuild sea capitals before applying saved conquest history", () => {
  const city = { cityId: "london", tileId: 1, factionId: "england" };
  const state = { memory: { quests: { exeterCanal: {}, conquistador: {} }, conquest: {}, colonization: {} } };
  const calls = [];
  const context = runtimeFunctions(["prepareCityPortCatalog", "prepareSavedVoyageCityCatalog"], {
    exeterCanalStage: () => 0, exeterCanalNavigation: () => ({ riverMasks: [], reachableNavigationMask: [] }),
    exeterCanalBaseNavigation: {}, graph: {}, earthById: [], worldPortPlacementOptions: () => ({}), cityCatalog: [],
    placeCityCatalogOnWorld: () => new Map([[1, { ...city }]]),
    portCitiesOnWorld: cities => [...cities.values()], validateCityPortAccessCatalog() {},
    validateCanonicalPortCatalog() {}, validateHistoricalGossipCityCatalog() {},
    markFactionSeaCapitalsOnPorts: ports => {
      calls.push("capitals"); ports[0].capitalOfFactionId = "england";
      return new Map([["england", ports[0]]]);
    }, colonizationSettlementMemories: () => [], colonizationWorldRecord: () => null,
    applyPortConquestOwnership: (_memory, cities) => {
      assert.equal(cities[0].capitalOfFactionId, "england"); calls.push("conquest");
    }, reconcileConquistadorSovereignty() {}, reconcileColonizationQuestOriginAfterConquest() {}, reconcileQuestWorldAssumptions() {}
  });
  const candidate = context.prepareSavedVoyageCityCatalog(state, 10);
  assert.equal(candidate.ports[0].capitalOfFactionId, "england");
  assert.equal(candidate.capitals.get("england"), candidate.cities.get(1));
  assert.equal(city.capitalOfFactionId, undefined, "preparation must not alter the original city");
  assert.equal(calls[0], "capitals");
});
