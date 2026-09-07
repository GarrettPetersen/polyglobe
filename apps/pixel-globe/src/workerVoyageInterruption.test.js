import assert from "node:assert/strict";
import test from "node:test";
import { createWorkerVoyage, createWorkerDriver, createApplyProbe, snapshotWorkerVoyage,
  restoreWorkerVoyage, assertFleetSaleIntegrity } from "../tools/playtest/world-worker.mjs";

test("real worker sales survive save/reload at every incremental main-thread apply boundary", { timeout: 120000 }, async () => {
  const voyage = createWorkerVoyage();
  for (const [cityId, factionId] of [["lisbon|portugal", "portugal"], ["istanbul|turkey", "ottoman"]]) {
    const yard = voyage.worldEconomy.shipyards.yards.get(cityId);
    voyage.worldEconomy.shipyards.npcSales.push({ id: `${yard.listing.id}:npc-sale`, portId: cityId,
      factionId, shipSlug: yard.listing.shipSlug, price: yard.listing.price, soldMinute: 0 });
    yard.listing = null;
  }
  voyage.npcSeaRoutes.shipyardFleetGrowthLimit = voyage.npcSeaRoutes.ships.length + 20;
  const { fundWorldEconomyShipyard } = await import("./economy.js");
  fundWorldEconomyShipyard(voyage.worldEconomy, { cityId: "istanbul|turkey" }, {
    investedMinute: 0, seedCapital: 100000, materialContributions: { timber: 20, iron: 12, "naval-stores": 10 }
  });
  const baseline = snapshotWorkerVoyage(voyage);
  const worker = createWorkerDriver();
  try {
    await worker.reset(voyage);
    const event = await worker.advance(voyage, 360);
    assert.ok(event.simulation.changedParts.includes("economy"));
    assert.ok(event.simulation.changedParts.includes("npcRoutes"));
    const probe = createApplyProbe(voyage, event, 360);
    const boundaries = [];
    while (probe.state()) {
      const state = probe.state();
      boundaries.push(`${state.phase}:${state.partIndex}:${state.partRestorePlan?.phase || "start"}`);
      probe.step();
      assert.ok(boundaries.length < 2000, "Worker apply must finish within its work budget");
    }
    const expected = snapshotWorkerVoyage(voyage);
    assertFleetSaleIntegrity(voyage);
    for (let boundary = 0; boundary < boundaries.length; boundary++) {
      restoreWorkerVoyage(voyage, structuredClone(baseline));
      const interrupted = createApplyProbe(voyage, event, 360);
      for (let step = 0; step < boundary; step++) interrupted.step();
      const committing = interrupted.state().phase === "restore";
      const saved = JSON.parse(JSON.stringify(interrupted.save()));
      // Compare *all* economy/fleet/land records, not only the collision ID.
      const expectedWorld = committing ? expected : baseline;
      assert.deepEqual(saved.playerShipyards.yards, expectedWorld.economy.shipyards.yards.filter(yard => yard.playerBacking), boundaries[boundary]);
      assert.deepEqual(saved.economy, { ...expectedWorld.economy, shipyards: { ...expectedWorld.economy.shipyards,
        yards: expectedWorld.economy.shipyards.yards.filter(yard => !yard.playerBacking) } }, boundaries[boundary]);
      assert.deepEqual(saved.npcRoutes, committing ? expected.npcRoutes : baseline.npcRoutes, boundaries[boundary]);
      assert.deepEqual(saved.landTrade, committing ? expected.landTrade : baseline.landTrade, boundaries[boundary]);
      restoreWorkerVoyage(voyage, saved);
      assertFleetSaleIntegrity(voyage);
    }
    console.log(`Verified ${boundaries.length} production worker apply/save boundaries`);
    await worker.reset(voyage, 360);
    const next = await worker.advance(voyage, 720);
    const resumed = createApplyProbe(voyage, next, 720);
    while (resumed.state()) resumed.step();
    assertFleetSaleIntegrity(voyage);
  } finally { await worker.close(); }
});

test("current regional fishing voyages survive reload without being relocated", async () => {
  const { createNpcSeaRouteSystem, snapshotNpcSeaRouteSystem, restoreNpcSeaRouteSystem } = await import("./npcSeaRoutes.js");
  const voyage = createWorkerVoyage();
  const routes = createNpcSeaRouteSystem({ ports: voyage.npcSeaRoutes.ports, economy: voyage.worldEconomy,
    startMinute: 0, seedKey: "worker-interruption" });
  const saved = JSON.parse(JSON.stringify(snapshotNpcSeaRouteSystem(routes)));
  restoreNpcSeaRouteSystem(routes, saved, { economy: voyage.worldEconomy });
  assert.deepEqual(snapshotNpcSeaRouteSystem(routes), saved);
});
