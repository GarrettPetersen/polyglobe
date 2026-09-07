import assert from "node:assert/strict";
import test from "node:test";
import { createWorldShipyards, generateShipyardListing, reconcileRebuiltShipyardFleetHistory,
  snapshotWorldShipyards, registerShipyardTradeIn } from "./shipyards.js";
const port = { cityId: "lisbon|portugal", tileId: 1, city: "Lisbon", country: "Portugal",
  cityType: "mediterranean", factionId: "portugal", lat: 38.72, lon: -9.14, population: 70000 };

test("rebuilt yards advance both serials from durable fleet history without reselling retained hulls", () => {
  const system = createWorldShipyards({ ports: [port], startMinute: 0 });
  const yard = system.yards.get(port.cityId);
  yard.listing = generateShipyardListing(yard, 0, 0);
  const used = registerShipyardTradeIn(system, port, { shipSlug: "caravel", seller: "npc:retained", acquiredMinute: 0 });
  const ids = [`shipyard:shipyard-${port.cityId}-7:npc-sale`, `shipyard:${used.id}:npc-sale`];
  reconcileRebuiltShipyardFleetHistory(system, ids);
  assert.equal(yard.buildNumber, 7);
  assert.equal(yard.listing, null);
  assert.equal(yard.usedListings.length, 0);
  assert.equal(yard.nextTradeInNumber, 2);
  const saved = snapshotWorldShipyards(system);
  reconcileRebuiltShipyardFleetHistory(system, ids);
  assert.deepEqual(snapshotWorldShipyards(system), saved);
  assert.notEqual(generateShipyardListing(yard, yard.buildNumber + 1, 100).id, `shipyard-${port.cityId}-7`);
});
test("reconstructed stock unrelated to retained fleet history remains available", () => {
  const system = createWorldShipyards({ ports: [port], startMinute: 0 });
  const yard = system.yards.get(port.cityId);
  yard.buildNumber = 8;
  yard.listing = generateShipyardListing(yard, 8, 0);
  const before = snapshotWorldShipyards(system);
  reconcileRebuiltShipyardFleetHistory(system, [`shipyard:shipyard-${port.cityId}-7:npc-sale`, "ordinary-ship"]);
  assert.deepEqual(snapshotWorldShipyards(system), before);
  assert.throws(() => reconcileRebuiltShipyardFleetHistory(system, [null]), /retained ship IDs/);
  assert.throws(() => reconcileRebuiltShipyardFleetHistory(system, [`shipyard:shipyard-${port.cityId}-bad:npc-sale`]), /provenance/);
});

test("released used-listing counter damage repairs from retained fleet IDs without erasing history", async () => {
  const { advanceShipyardTradeInSerialsPastFleet, registerShipyardTradeIn, snapshotWorldShipyards } = await import("./shipyards.js");
  const system = createWorldShipyards({ ports: [port], startMinute: 0 });
  const before = snapshotWorldShipyards(system);
  const retained = [`shipyard:shipyard-${port.cityId}-used-8:npc-sale`];
  advanceShipyardTradeInSerialsPastFleet(system, retained);
  assert.equal(system.yards.get(port.cityId).nextTradeInNumber, 9);
  assert.deepEqual(snapshotWorldShipyards(system).yards[0].listing, before.yards[0].listing);
  advanceShipyardTradeInSerialsPastFleet(system, retained);
  const listing = registerShipyardTradeIn(system, port, { shipSlug: "caravel", seller: "player", acquiredMinute: 0 });
  assert.equal(listing.id, `shipyard-${port.cityId}-used-9`);
});

test("frozen released used-listing save preserves IDs and repairs the allocator idempotently", async () => {
  const { readFileSync } = await import("node:fs");
  const { restoreWorldShipyards } = await import("./shipyards.js");
  const saved = JSON.parse(readFileSync(new URL("./test-fixtures/shipyards/v11-renumbered-used.json", import.meta.url)));
  const system = createWorldShipyards({ ports: [port], startMinute: 0 });
  restoreWorldShipyards(system, saved);
  const repaired = snapshotWorldShipyards(system);
  assert.equal(repaired.yards[0].usedListings[0].id, saved.yards[0].usedListings[0].id);
  assert.equal(repaired.yards[0].nextTradeInNumber, 3);
  assert.deepEqual(repaired.yards[0].usedListings, saved.yards[0].usedListings);
  restoreWorldShipyards(system, repaired);
  assert.deepEqual(snapshotWorldShipyards(system), repaired);
  const duplicate = structuredClone(saved);
  duplicate.yards[0].usedListings.push(duplicate.yards[0].usedListings[0]);
  assert.throws(() => restoreWorldShipyards(system, duplicate), /Duplicate saved used/);
});
