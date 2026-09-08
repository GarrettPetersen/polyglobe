import { readFileSync } from "node:fs";
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
  const routes = createNpcSeaRouteSystem({ portSailingDistances: voyage.npcSeaRoutes.portSailingDistances, ports: voyage.npcSeaRoutes.ports, economy: voyage.worldEconomy,
    startMinute: 0, seedKey: "worker-interruption" });
  const saved = JSON.parse(JSON.stringify(snapshotNpcSeaRouteSystem(routes)));
  restoreNpcSeaRouteSystem(routes, saved, { economy: voyage.worldEconomy });
  assert.deepEqual(snapshotNpcSeaRouteSystem(routes), saved);
});

test("released mixed-generation Istanbul books cannot resell an existing fleet hull", { timeout: 120000 }, async () => {
  const { updateNpcSeaRouteEvents, restoreNpcSeaRouteSystem, snapshotNpcSeaRouteSystem } = await import("./npcSeaRoutes.js");
  const { snapshotWorldEconomy, restoreWorldEconomy } = await import("./economy.js");
  const voyage = createWorkerVoyage("istanbul-mixed-save");
  const yard = voyage.worldEconomy.shipyards.yards.get("istanbul|turkey");
  const fixture = JSON.parse(readFileSync(new URL("./test-fixtures/shipyards/v6-mixed-istanbul-fleet.json", import.meta.url), "utf8"));
  const listing = fixture.listing;
  const sale = { id: `${listing.id}:npc-sale`, portId: yard.portId, factionId: "ottoman",
    shipSlug: listing.shipSlug, price: listing.price, soldMinute: 0 };
  yard.listing = null;
  voyage.worldEconomy.shipyards.npcSales.push(sale);
  voyage.npcSeaRoutes.shipyardFleetGrowthLimit = voyage.npcSeaRoutes.ships.length + 20;
  updateNpcSeaRouteEvents(voyage.npcSeaRoutes, 1, [], { maintenance: true });
  const shipId = `shipyard:${sale.id}`;
  assert.ok(voyage.npcSeaRoutes.shipById.has(shipId), "Production purchase must create the Istanbul hull");
  const fleet = snapshotNpcSeaRouteSystem(voyage.npcSeaRoutes);
  const economy = snapshotWorldEconomy(voyage.worldEconomy);
  // A released save can already contain this disagreement. Fixing future
  // transaction boundaries cannot remove the stale stock from that save.
  economy.shipyards.yards.find(entry => entry.portId === yard.portId).listing = listing;
  economy.shipyards.npcSales.push(sale);
  restoreWorldEconomy(voyage.worldEconomy, structuredClone(economy));
  assert.throws(() => restoreNpcSeaRouteSystem(voyage.npcSeaRoutes, fleet, { economy: voyage.worldEconomy }), /already belongs to fleet/);
  fleet.version = fixture.npcSnapshotVersion;
  fleet.ships = fleet.ships.map(ship => ship.id === shipId ? structuredClone(fixture.ship) : ship);
  restoreNpcSeaRouteSystem(voyage.npcSeaRoutes, fleet, { economy: voyage.worldEconomy });
  assertFleetSaleIntegrity(voyage);
  assert.equal(yard.listing, null);
  assert.ok(voyage.npcSeaRoutes.shipById.has(shipId));
  const migrated = snapshotWorkerVoyage(voyage);
  restoreWorkerVoyage(voyage, JSON.parse(JSON.stringify(migrated)));
  assert.deepEqual(snapshotWorkerVoyage(voyage), migrated, "Migration must be idempotent");
  const worker = createWorkerDriver();
  try {
    await worker.reset(voyage, 1);
    const event = await worker.advance(voyage, 360);
    const apply = createApplyProbe(voyage, event, 360);
    while (apply.state()) apply.step();
    assertFleetSaleIntegrity(voyage);
  } finally { await worker.close(); }
});
