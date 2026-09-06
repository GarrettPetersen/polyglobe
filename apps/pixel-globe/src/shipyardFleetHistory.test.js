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
