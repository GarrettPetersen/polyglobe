import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Worker } from "node:worker_threads";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as economy from "../../src/economy.js";
import * as fleet from "../../src/npcSeaRoutes.js";
import * as land from "../../src/landTradeSystem.js";
import * as distant from "../../src/distantWorldSimulation.js";
import { parseLandRoadNetwork } from "../../src/landRoadNetwork.js";
import { loadCityCatalogFromCsv } from "../../src/cityCatalogData.js";
import { createGameState } from "../../src/gameState.js";
import { SOVEREIGN_TRADE_ACCESS_POLICIES } from "../../src/sovereignTradeAccess.js";
import { fisheryForHabitat } from "../../src/fishEcology.js";
import { FACTIONS } from "../../src/factions.js";
import { registerShipyardTradeIn } from "../../src/shipyards.js";
import { snapshotPlayerShipyards, restorePlayerShipyardSnapshot } from "../../src/playerShipyardPersistence.js";

const catalog = JSON.parse(readFileSync(new URL("../../city-visualizer/data/cities.json", import.meta.url))).cities;
// Keep the whole real catalog/road network: an old two-port fixture never
// exercised an Istanbul yard alongside an ocean fleet and inland trade.
const authored = loadCityCatalogFromCsv(readFileSync(new URL("../../../../examples/globe-demo/public/datasets/urbanization-dominance-pruned/urbanization-dominance-pruned.csv", import.meta.url), "utf8"));
const byId = new Map(authored.map(city => [city.cityId, city]));
const ports = catalog.map(city => ({ ...byId.get(city.id), ...city, cityId: city.id, displayCity: city.label }));
const roadData = JSON.parse(readFileSync(new URL("../../public/assets/data/land-roads.json", import.meta.url)));
const roads = parseLandRoadNetwork(roadData, roadData);
const source = ts.createSourceFile("main.js", readFileSync(new URL("../../src/main.js", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
const names = ["createDistantWorldApplyState", "advanceDistantWorldSimulationApply",
  "advanceCurrentDistantWorldPartSnapshot", "advanceCurrentDistantWorldPartComparison",
  "advanceDistantWorldPartRestore", "finishDistantWorldSimulationApply",
  "currentDistantWorldProtectedNpcShipIds", "finishPendingDistantWorldCommit", "snapshotVoyagePayload"];
const declarations = names.map(name => {
  const node = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name.text === name);
  assert.ok(node, `Missing production runtime function ${name}`);
  return node.getText(source);
}).join("\n");

export function createWorkerVoyage(seed = "worker-interruption") {
  const gameState = createGameState({ cargoCapacity: 200, voyageSeed: seed });
  fisheryForHabitat(gameState, { tileId: 1, kind: "lake", lat: -1, lon: 33 }, 0);
  const worldEconomy = economy.createWorldEconomy({ ports, shipyardPorts: ports.filter(p => p.services.shipyard), startMinute: 0, seedKey: seed });
  const npcSeaRoutes = fleet.createNpcSeaRouteSystem({ ports, economy: worldEconomy, startMinute: 0, seedKey: seed, fishState: gameState, whaleMemory: gameState.memory.whales, fishingGroundIsNavigable: () => true });
  const landTradeSystem = land.createLandTradeSystem({ roads, cities: ports, economy: worldEconomy, startMinute: 0, seedKey: seed });
  return { gameState, worldEconomy, npcSeaRoutes, landTradeSystem };
}

export function workerRuntime(voyage) {
  return { relations: FACTIONS.flatMap((a, index) => FACTIONS.slice(index).map(b => [distant.relationKey(a.id, b.id), "neutral"])),
    sovereignAccess: SOVEREIGN_TRADE_ACCESS_POLICIES.flatMap(({ id }) => FACTIONS.map(f => [`${id}|${f.id}`, true])),
    protectedNpcShipIds: [], foreignSettlementExpulsions: voyage.gameState.relations.foreignSettlementExpulsions,
    suzeraintyMemory: voyage.gameState.relations.diplomacy.suzerainties,
    tradeEmbargoes: voyage.gameState.relations.tradeEmbargoes, player: { lat: 0, lon: 0 } };
}

export function createWorkerDriver() {
  const worker = new Worker(new URL("./world-worker-thread.mjs", import.meta.url));
  let generation = 0;
  let requestId = 0;
  async function request(message) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => done(new Error(`Worker timed out: ${message.type}`)), 30000);
      const onError = error => done(error);
      const onMessage = result => result.type === "error" ? done(new Error(result.message)) : done(null, result);
      function done(error, result) {
        clearTimeout(timeout); worker.off("message", onMessage); worker.off("error", onError);
        if (error) reject(error); else resolve(result);
      }
      worker.once("message", onMessage); worker.once("error", onError); worker.postMessage(message);
    });
  }
  return {
    async reset(voyage, minute = 0) {
      return request({ type: "reset", generation: ++generation, schedule: {
        economyMinute: economy.nextWorldEconomyEventMinute(voyage.worldEconomy), maintenanceMinute: minute + 30,
        ships: fleet.npcSeaRouteEventSchedule(voyage.npcSeaRoutes), carts: land.landTradeEventSchedule(voyage.landTradeSystem)
      }, simulation: { maintenanceIntervalMinutes: 30, systems: distant.portableDistantWorldSystems({
        economy: voyage.worldEconomy, npcRoutes: voyage.npcSeaRoutes, landTrade: voyage.landTradeSystem, fishState: voyage.gameState
      }) } });
    },
    async advance(voyage, minute) {
      const reply = await request({ type: "advance", generation, requestId: ++requestId, clockMinute: minute, runtime: workerRuntime(voyage) });
      assert.equal(reply.generation, generation); assert.equal(reply.requestId, requestId);
      return reply.result;
    },
    close: () => worker.terminate()
  };
}

export function createApplyProbe(voyage, event, minute) {
  const context = { ...economy, ...fleet, ...land, ...distant, ...voyage,
    snapshotPlayerShipyards, weatherClockMinutes: minute, voyageStartClockMinutes: 0,
    SUBDIVISIONS: 8, PORT_CATALOG_VERSION: 8, firstDayNightNoticeState: {}, anchored: false,
    survivalDeprivationTimers: {}, demoVoyageScope: null, npcVisualShips: new Map(),
    snapshotPlayerShip: () => ({}), snapshotFirstDayNightNoticeState: () => ({}),
    measurePerformanceBenchmarkStage: (_name, run) => run(), currentDiplomacyBetween: () => "neutral",
    sovereignTradeOpenToFaction: () => true, releaseNpcVisualStatesWithoutStrategicState: () => false,
    recordNpcDiplomaticPortCall: () => {}, lifecycle: { resets: 0 },
    resetDistantWorldWorkerSchedule: () => { context.lifecycle.resets++; },
    addOptionalSaveSnapshot: (payload, _errors, key, _label, snapshot) => { payload[key] = snapshot(); }, console
  };
  return runInNewContext(`${declarations}; let distantWorldApplyState = createDistantWorldApplyState(event);
    ({ step: advanceDistantWorldSimulationApply,
       state: () => distantWorldApplyState,
       save: () => snapshotVoyagePayload({includeWorldTraffic:true}).payload,
       discarded: () => lifecycle.resets > 0 })`, { ...context, event });
}

export function snapshotWorkerVoyage(voyage) {
  return { economy: economy.snapshotWorldEconomy(voyage.worldEconomy),
    npcRoutes: fleet.snapshotNpcSeaRouteSystem(voyage.npcSeaRoutes),
    landTrade: land.snapshotLandTradeSystem(voyage.landTradeSystem) };
}
export function restoreWorkerVoyage(voyage, saved) {
  economy.restoreWorldEconomy(voyage.worldEconomy, saved.economy);
  if (saved.playerShipyards !== undefined) restorePlayerShipyardSnapshot(voyage.worldEconomy.shipyards, saved.playerShipyards, {
    seedKey: voyage.gameState.voyageSeed,
    expectedCityIds: saved.playerShipyards.yards.map(yard => yard.portId)
  });
  land.restoreLandTradeSystem(voyage.landTradeSystem, saved.landTrade);
  fleet.restoreNpcSeaRouteSystem(voyage.npcSeaRoutes, saved.npcRoutes, { economy: voyage.worldEconomy, fishState: voyage.gameState, whaleMemory: voyage.gameState.memory.whales });
}

export function assertFleetSaleIntegrity(voyage) {
  const ids = [...voyage.npcSeaRoutes.ships.map(ship => ship.id), ...voyage.npcSeaRoutes.replacementQueue.map(entry => entry.shipId)];
  assert.equal(new Set(ids).size, ids.length, "Fleet and replacements must have unique hull IDs");
  const set = new Set(ids);
  for (const sale of voyage.worldEconomy.shipyards.npcSales) {
    assert.ok(!set.has(`shipyard:${sale.id}`), `Sold hull remains in NPC sale queue: ${sale.id}`);
  }
  for (const yard of voyage.worldEconomy.shipyards.yards.values()) {
    for (const listing of [yard.listing, ...yard.usedListings].filter(Boolean)) {
      assert.ok(!set.has(`shipyard:${listing.id}:npc-sale`), `Sold hull remains listed: ${listing.id}`);
    }
  }
}

// Carry history forward instead of repeatedly restarting a young voyage.
export async function runWorkerCampaign({ months = 12, checkpoint = null, seed = "worker-campaign", onCheckpoint = () => {} } = {}) {
  if (!Number.isSafeInteger(months) || months < 1 || months > 120) throw new Error("Worker campaign months must be 1..120");
  const voyage = createWorkerVoyage(seed);
  if (checkpoint !== null && (checkpoint.version !== 1 || checkpoint.seed !== seed ||
      !Number.isSafeInteger(checkpoint.month) || checkpoint.month < 0 || !checkpoint.gameState || !checkpoint.world)) {
    throw new Error("Malformed or incompatible worker campaign checkpoint");
  }
  let month = checkpoint?.month ?? 0;
  if (checkpoint) {
    voyage.gameState = checkpoint.gameState;
    restoreWorkerVoyage(voyage, checkpoint.world);
  }
  if (!checkpoint) {
    const books = JSON.parse(readFileSync(new URL("../../src/test-fixtures/shipyards/v10.json", import.meta.url)));
    restorePlayerShipyardSnapshot(voyage.worldEconomy.shipyards, books, {
      seedKey: seed, legacyCityIdForPortReference: ({ tileId }) => {
        assert.equal(tileId, 1); return "lisbon|portugal";
      }, expectedCityIds: ["lisbon|portugal"]
    });
  }
  const driver = createWorkerDriver();
  let steps = 0;
  let captures = 0;
  try {
    await driver.reset(voyage, month * 30 * 1440);
    for (let iteration = 0; iteration < months; iteration++) {
      const minute = ++month * 30 * 1440;
      // Bound strategic catch-up to six hours, as opposed to skipping an
      // entire month past the production cart-arrival watchdog.
      for (let tick = minute - 30 * 1440 + 360; tick <= minute; tick += 360) {
        const event = await driver.advance(voyage, tick);
        const probe = createApplyProbe(voyage, event, tick);
        while (probe.state()) {
          probe.step();
          if (++steps > months * 500000) throw new Error("Worker campaign exceeded incremental commit budget");
        }
        assertFleetSaleIntegrity(voyage);
      }
      assertFleetSaleIntegrity(voyage);
      if (month % 2 === 0) {
        const prize = voyage.npcSeaRoutes.ships.find(ship => ship.role === fleet.NPC_ROLE_MERCHANT && !ship.surrendered && ship.hitPoints > 0);
        assert.ok(prize, "Campaign needs an eligible merchant prize");
        fleet.surrenderNpcShip(voyage.npcSeaRoutes, prize.id, null, { preserveHull: true });
        const captured = fleet.captureSurrenderedNpcShip(voyage.npcSeaRoutes, prize.id, minute);
        registerShipyardTradeIn(voyage.worldEconomy.shipyards, { cityId: "lisbon|portugal" }, {
          shipSlug: captured.ship.slug, seller: "campaign-captain", acquiredMinute: minute
        });
        captures++;
      }
      const world = JSON.parse(JSON.stringify(snapshotWorkerVoyage(voyage)));
      restoreWorkerVoyage(voyage, world);
      assertFleetSaleIntegrity(voyage);
      assert.deepEqual(snapshotWorkerVoyage(voyage), world, "Reload changed current worker world history");
      onCheckpoint({ version: 1, seed, month, gameState: voyage.gameState, world });
      await driver.reset(voyage, minute);
    }
    return { months, endingMonth: month, captures, incrementalSteps: steps, fleetSize: voyage.npcSeaRoutes.ships.length };
  } finally { await driver.close(); }
}
