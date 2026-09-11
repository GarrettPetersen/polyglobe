import { pirateHavenQuestOffer, acceptPirateHavenQuest, seizePirateRevengeItem, completePirateHavenQuest, ruinPirateHaven, pirateHavenIsRuined } from "../../src/pirateHavens.js";
import { parsePortSailingDistances, portSailingDistanceKm } from "../../src/portSailingDistances.js";
import { shipyardUpgradeOffers } from "../../src/shipyardUpgrades.js";
import { PORT_CATALOG_VERSION } from "../../src/portCatalogMigration.js";
import { initialCampaignCities } from "./world-catalog.mjs";
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
import { applyPortConquestOwnership } from "../../src/portConquest.js";
import { createGameState, diplomacyBetweenForState, sovereignTradeOpenToFaction, advanceGamePolitics, migrateGameState, isWokouHuntQuest } from "../../src/gameState.js";
import { SOVEREIGN_TRADE_ACCESS_POLICIES } from "../../src/sovereignTradeAccess.js";
import { fisheryForHabitat } from "../../src/fishEcology.js";
import { FACTIONS, PIRATE_FACTION_ID, markFactionSeaCapitalsOnPorts } from "../../src/factions.js";
import { registerShipyardTradeIn, purchaseShipyardUpgrade } from "../../src/shipyards.js";
import { snapshotPlayerShipyards, restorePlayerShipyardSnapshot } from "../../src/playerShipyardPersistence.js";

const portSailingDistances = parsePortSailingDistances(JSON.parse(readFileSync(new URL("../../public/assets/data/port-sailing-distances.json", import.meta.url))));
const scenes = new Map(JSON.parse(readFileSync(new URL("../../city-visualizer/data/cities.json", import.meta.url))).cities.map(city => [city.id, city]));
const initialCatalog = initialCampaignCities();
const initialPortIds = new Set(initialCatalog.ports.map(port => port.cityId));
const roadData = JSON.parse(readFileSync(new URL("../../public/assets/data/land-roads.json", import.meta.url)));
const roads = parseLandRoadNetwork(roadData, roadData);
const source = ts.createSourceFile("main.js", readFileSync(new URL("../../src/main.js", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
const names = ["activeWokouHuntQuest", "ensureWokouHuntEncounter", "createDistantWorldApplyState", "advanceDistantWorldSimulationApply",
  "advanceCurrentDistantWorldPartSnapshot", "advanceCurrentDistantWorldPartComparison",
  "advanceDistantWorldPartRestore", "finishDistantWorldSimulationApply",
  "currentDistantWorldProtectedNpcShipIds", "finishPendingDistantWorldCommit", "snapshotVoyagePayload"];
const declarations = names.map(name => {
  const node = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name.text === name);
  assert.ok(node, `Missing production runtime function ${name}`);
  return node.getText(source);
}).join("\n");

export function createWorkerVoyage(seed = "worker-interruption", { startMinute = 0 } = {}) {
  const cities = structuredClone(initialCatalog.cities);
  const ports = cities.filter(city => initialPortIds.has(city.cityId));
  for (const port of ports) port.services = scenes.get(port.cityId).services;
  markFactionSeaCapitalsOnPorts(ports);
  const gameState = createGameState({ cargoCapacity: 200, voyageSeed: seed, startMinute });
  const initialPolitics = startMinute > 0 ? advanceGamePolitics(gameState, startMinute, { portCities: ports, cities }) : null;
  applyPortConquestOwnership(gameState.memory.conquest, cities);
  fisheryForHabitat(gameState, { tileId: 1, kind: "lake", lat: -1, lon: 33 }, startMinute);
  const worldEconomy = economy.createWorldEconomy({ ports: cities, shipyardPorts: ports.filter(p => p.services.shipyard), startMinute, seedKey: seed });
  const npcSeaRoutes = fleet.createNpcSeaRouteSystem({ portSailingDistances, ports, economy: worldEconomy, startMinute, seedKey: seed, fishState: gameState, whaleMemory: gameState.memory.whales, pirateHavenMemory: gameState.memory.pirateHavens, fishingGroundIsNavigable: () => true,
    relationBetween: (a, b) => diplomacyBetweenForState(gameState, a, b),
    sovereignTradeOpenToFaction: (id, factionId) => sovereignTradeOpenToFaction(gameState, id, factionId) });
  const landTradeSystem = land.createLandTradeSystem({ roads, cities, economy: worldEconomy, startMinute, seedKey: seed });
  return { gameState, worldEconomy, npcSeaRoutes, landTradeSystem, cities, ports, initialPolitics };
}

export function workerRuntime(voyage) {
  return { relations: FACTIONS.flatMap((a, index) => FACTIONS.slice(index).map(b => [distant.relationKey(a.id, b.id), diplomacyBetweenForState(voyage.gameState, a.id, b.id)])),
    sovereignAccess: SOVEREIGN_TRADE_ACCESS_POLICIES.flatMap(({ id }) => FACTIONS.map(f => [`${id}|${f.id}`, sovereignTradeOpenToFaction(voyage.gameState, id, f.id)])),
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
    isWokouHuntQuest, PIRATE_FACTION_ID, ensureNpcShipCaptain: () => {},
    snapshotPlayerShipyards, weatherClockMinutes: minute, voyageStartClockMinutes: 0,
    SUBDIVISIONS: 8, PORT_CATALOG_VERSION, firstDayNightNoticeState: {}, anchored: false,
    survivalDeprivationTimers: {}, demoVoyageScope: null, npcVisualShips: new Map(),
    snapshotPlayerShip: () => ({}), snapshotFirstDayNightNoticeState: () => ({}),
    measurePerformanceBenchmarkStage: (_name, run) => run(), currentDiplomacyBetween: (a, b) => diplomacyBetweenForState(voyage.gameState, a, b),
    sovereignTradeOpenToFaction: (id, factionId) => sovereignTradeOpenToFaction(voyage.gameState, id, factionId), releaseNpcVisualStatesWithoutStrategicState: () => false,
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
    shipyardSupplyShips: fleet.snapshotShipyardSupplyShips(voyage.npcSeaRoutes),
    landTrade: land.snapshotLandTradeSystem(voyage.landTradeSystem) };
}
export function restoreWorkerVoyage(voyage, saved) {
  voyage.npcSeaRoutes.pirateHavenMemory = voyage.gameState.memory.pirateHavens;
  applyPortConquestOwnership(voyage.gameState.memory.conquest, voyage.cities);
  economy.restoreWorldEconomy(voyage.worldEconomy, saved.economy);
  if (saved.playerShipyards !== undefined) restorePlayerShipyardSnapshot(voyage.worldEconomy.shipyards, saved.playerShipyards, {
    seedKey: voyage.gameState.voyageSeed,
    expectedCityIds: saved.playerShipyards.yards.map(yard => yard.portId)
  });
  land.restoreLandTradeSystem(voyage.landTradeSystem, saved.landTrade);
  fleet.restoreNpcSeaRouteSystem(voyage.npcSeaRoutes, saved.npcRoutes, { economy: voyage.worldEconomy, fishState: voyage.gameState, whaleMemory: voyage.gameState.memory.whales,
    relationBetween: (a, b) => diplomacyBetweenForState(voyage.gameState, a, b),
    sovereignTradeOpenToFaction: (id, factionId) => sovereignTradeOpenToFaction(voyage.gameState, id, factionId) });
  fleet.restoreShipyardSupplyShips(voyage.npcSeaRoutes, saved.shipyardSupplyShips);
}

export function synchronizeCampaignOwnership(voyage) {
  const memory = voyage.gameState.memory.conquest;
  applyPortConquestOwnership(memory, voyage.cities);
  fleet.applyNpcConquestOwnership(voyage.npcSeaRoutes,
    new Map(voyage.ports.map(port => [port.cityId, port.factionId])),
    new Set(memory.collapsedFactionIds), new Map(Object.entries(memory.factionSuccessors)));
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
    voyage.gameState = migrateGameState(checkpoint.gameState);
    restoreWorkerVoyage(voyage, checkpoint.world);
  }
  if (!checkpoint) {
    voyage.gameState.doubloons += 300000;
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
  let politicalEvents = 0;
  let pirateCommissions = 0;
  try {
    await driver.reset(voyage, month * 30 * 1440);
    for (let iteration = 0; iteration < months; iteration++) {
      const minute = ++month * 30 * 1440;
      // Bound strategic catch-up to six hours, as opposed to skipping an
      // entire month past the production cart-arrival watchdog.
      for (let tick = minute - 30 * 1440 + 360; tick <= minute; tick += 360) {
        const politics = advanceGamePolitics(voyage.gameState, tick, { portCities: voyage.ports, cities: voyage.cities });
        politicalEvents += politics.diplomacyEvents.length + politics.embargoEvents.length + politics.courtActions.length + politics.papalActions.length;
        if (politics.historicalTransitions.length || politics.conquistadorTransfers.length) {
          synchronizeCampaignOwnership(voyage);
          await driver.reset(voyage, tick - 360);
        }
        const event = await driver.advance(voyage, tick);
        const probe = createApplyProbe(voyage, event, tick);
        while (probe.state()) {
          probe.step();
          if (++steps > months * 500000) throw new Error("Worker campaign exceeded incremental commit budget");
        }
        assertFleetSaleIntegrity(voyage);
        for (const pirate of voyage.npcSeaRoutes.ships.filter(ship => ship.role === fleet.NPC_ROLE_PIRATE && ship.hiddenAtHideout)) {
          assert.ok(!pirateHavenIsRuined(voyage.gameState.memory.pirateHavens, pirate.currentPort.cityId, tick), `Pirate resupplied in ruined ${pirate.currentPort.cityId}`);
        }
      }
      assertFleetSaleIntegrity(voyage);
      if (month % 2 === 0) {
        const prize = voyage.npcSeaRoutes.ships.find(ship => ship.role === fleet.NPC_ROLE_MERCHANT && !ship.surrendered && ship.hitPoints > 0);
        assert.ok(prize, "Campaign needs an eligible merchant prize");
        const memory = voyage.gameState.memory.pirateHavens;
        const haven = voyage.npcSeaRoutes.pirateHideouts.find(port => !pirateHavenIsRuined(memory, port.cityId, minute));
        assert.ok(haven, "Campaign requires an operational haven");
        const commissionContext = { havens: [haven], merchants: [{ ...prize, captainName: `Captain ${prize.id}` }],
          simMinute: minute, sailingDistanceKm: (a, b) => portSailingDistanceKm(portSailingDistances, a, b) };
        const offer = pirateHavenQuestOffer(memory, haven, commissionContext);
        assert.ok(offer, "Real merchant must be reachable for revenge commission");
        acceptPirateHavenQuest(memory, offer);
        fleet.surrenderNpcShip(voyage.npcSeaRoutes, prize.id, null, { preserveHull: true });
        assert.ok(seizePirateRevengeItem(memory, prize));
        completePirateHavenQuest(voyage.gameState, haven.cityId, "revenge", minute);
        pirateCommissions++;
        if (month % 8 === 2) {
          const issuer = voyage.ports.find(port => port.cityId === "lisbon|portugal");
          acceptPirateHavenQuest(memory, pirateHavenQuestOffer(memory, issuer, commissionContext));
          ruinPirateHaven(memory, haven.cityId, minute);
          completePirateHavenQuest(voyage.gameState, issuer.cityId, "suppression", minute);
          pirateCommissions++;
        }
        const captured = fleet.captureSurrenderedNpcShip(voyage.npcSeaRoutes, prize.id, minute);
        registerShipyardTradeIn(voyage.worldEconomy.shipyards, { cityId: "lisbon|portugal" }, {
          shipSlug: captured.ship.slug, seller: "campaign-captain", acquiredMinute: minute
        });
        captures++;
      }
      for (const yard of voyage.worldEconomy.shipyards.yards.values()) {
        if (!yard.playerBacking) continue;
        for (const offer of shipyardUpgradeOffers(yard, voyage.gameState.doubloons, minute)) {
          if (!offer.disabled) purchaseShipyardUpgrade(yard, voyage.gameState, offer.id, minute);
        }
      }
      const world = JSON.parse(JSON.stringify(snapshotWorkerVoyage(voyage)));
      restoreWorkerVoyage(voyage, world);
      assertFleetSaleIntegrity(voyage);
      assert.deepEqual(snapshotWorkerVoyage(voyage), world, "Reload changed current worker world history");
      onCheckpoint({ version: 1, seed, month, gameState: voyage.gameState, world });
      await driver.reset(voyage, minute);
    }
    return { months, endingMonth: month, captures, pirateCommissions, politicalEvents, incrementalSteps: steps, fleetSize: voyage.npcSeaRoutes.ships.length };
  } finally { await driver.close(); }
}
