import { FIRST_BATTLE_OF_PANIPAT_MINUTE } from "../../src/historicalSovereignty.js";
import { recordPortCapture } from "../../src/portConquest.js";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";
import { createWorkerVoyage, createWorkerDriver, synchronizeCampaignOwnership } from "./world-worker.mjs";
import * as fleet from "../../src/npcSeaRoutes.js";

// Materialize the political/worker boundary that ordinary merchant journeys
// never reached. Continue past demobilization rather than checking just the
// snapshot's shape. Repeat with both worker-owned and visible preserved ships.
export async function exerciseReserveDemobilization() {
  let scenarios = 0;
  for (const factionId of ["inca", "portugal", "ottoman", "ming"]) {
    for (const preserveVisible of [false, true]) {
      const voyage = createWorkerVoyage(`reserve-${factionId}-${preserveVisible}`);
      const routes = voyage.npcSeaRoutes;
      const slot = routes.capitalNavalReserveSlots.find(slot => slot.factionId === factionId && slot.shipSlug);
      assert.ok(slot, `No stocked ${factionId} reserve scenario`);
      const response = fleet.orderNpcPortResponse(routes, { factionId,
        targetCityId: slot.originCityId, reason: fleet.NPC_PORT_RESPONSE_BURNING,
        clockMinutes: 0, threatUntilMinute: 1 });
      assert.equal(response.outcome, "reserve-activated");
      const ship = routes.shipById.get(response.shipId);
      const oldArrival = ship.plan.endMinute;
      const snapshot = fleet.snapshotNpcSeaRouteStrategicSystem(routes);
      snapshot.capitalNavalReserveSlots = snapshot.capitalNavalReserveSlots.filter(entry => entry.id !== ship.capitalNavalReserveSlotId);
      fleet.applyNpcSeaRouteSimulationSnapshot(routes, snapshot, {
        preserveShipIds: preserveVisible ? [ship.id] : []
      });
      assert.equal(routes.shipById.has(ship.id), false, "Abolished reserve became an autonomous patrol");
      fleet.updateNpcSeaRouteEvents(routes, oldArrival + 1, [ship.id]);
      assert.equal(routes.replacementQueue.some(entry => entry.shipId === ship.id), false);
      const saved = JSON.parse(JSON.stringify(fleet.snapshotNpcSeaRouteSystem(routes)));
      fleet.restoreNpcSeaRouteSystem(routes, saved, { economy: voyage.worldEconomy });
      assert.equal(routes.shipById.has(ship.id), false);
      const driver = createWorkerDriver();
      try {
        await driver.reset(voyage);
        await driver.advance(voyage, 360);
      } finally { await driver.close(); }
      scenarios++;
    }
  }
  let capitalLosses = 0;
  for (const factionId of ["inca", "portugal", "ottoman", "ming"]) {
    const voyage = createWorkerVoyage(`capital-loss-${factionId}`);
    const routes = voyage.npcSeaRoutes;
    const slot = routes.capitalNavalReserveSlots.find(slot => slot.factionId === factionId && slot.shipSlug);
    assert.ok(slot);
    const home = voyage.ports.find(port => port.cityId === slot.originCityId);
    const response = fleet.orderNpcPortResponse(routes, { factionId, targetCityId: home.cityId,
      reason: fleet.NPC_PORT_RESPONSE_BURNING, clockMinutes: 0, threatUntilMinute: 1000 });
    assert.equal(response.outcome, "reserve-activated");
    recordPortCapture(voyage.gameState.memory.conquest, home, "spain", 10);
    synchronizeCampaignOwnership(voyage);
    for (const reserve of routes.capitalNavalReserveSlots.filter(slot => slot.factionId === factionId)) {
      assert.equal(routes.ports.find(port => port.cityId === reserve.originCityId).factionId, factionId,
        "Reserve kept a captured naval base");
    }
    recordPortCapture(voyage.gameState.memory.conquest, home, factionId, 20);
    synchronizeCampaignOwnership(voyage);
    for (let arrival = 0; arrival < 4; arrival++) {
      const ship = routes.shipById.get(response.shipId);
      if (!ship) break;
      fleet.updateNpcSeaRouteEvents(routes, ship.plan.endMinute + 1, [ship.id], { maintenance: true });
    }
    assert.equal(routes.shipById.has(response.shipId), false, "Recalled reserve did not demobilize after its home was recaptured");
    capitalLosses++;
  }
  let matureWorlds = 0;
  for (const startMinute of [FIRST_BATTLE_OF_PANIPAT_MINUTE + 1, 12 * 365 * 1440]) {
    const voyage = createWorkerVoyage(`mature-${startMinute}`, { startMinute });
    assert.ok(voyage.initialPolitics.historicalTransitions.length > 0, "Mature scenario did not exercise historical sovereignty");
    const driver = createWorkerDriver();
    try {
      await driver.reset(voyage, startMinute);
      await driver.advance(voyage, startMinute + 360);
    } finally { await driver.close(); }
    matureWorlds++;
  }
  return { scenarios, capitalLosses, matureWorlds, activities: ["reserve mobilisation", "reserve abolition", "visible ship preservation", "arrival after abolition", "save/load", "production worker advance", "capital capture", "naval rebasing", "recapture and recall", "mature historical world"] };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(JSON.stringify(await exerciseReserveDemobilization()));
}
