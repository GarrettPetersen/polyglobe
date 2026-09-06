import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import test from "node:test";
import { createWorldShipyards, fundPlayerShipyard, snapshotWorldShipyards, shipyardAtPort,
  advanceWorldShipyards, claimShipyardListing } from "./shipyards.js";
import { playerShipyardSnapshot, restorePlayerShipyardSnapshot } from "./playerShipyardPersistence.js";
import { restoreOrRecreateDerivedSaveState } from "./derivedSaveRecovery.js";

const port = { cityId: "lisbon|portugal", tileId: 1, city: "Lisbon", cityType: "mediterranean",
  population: 100000, lat: 38.72, lon: -9.14, factionId: "portugal" };
const seedKey = "durable-shipyard-books";
function business() {
  const system = createWorldShipyards({ ports: [port], startMinute: 0, seedKey });
  fundPlayerShipyard(system, port, { investedMinute: 123, seedCapital: 100000,
    materialContributions: { timber: 20, iron: 12, "naval-stores": 10 } });
  const yard = shipyardAtPort(system, port);
  if (yard.listing) claimShipyardListing(system, port, yard.listing.id, 124);
  advanceWorldShipyards(system, 150000);
  return system;
}

test("economy recreation and repeated reloads preserve complete player shipyard books", () => {
  const original = business();
  const saved = playerShipyardSnapshot(snapshotWorldShipyards(original));
  const result = restoreOrRecreateDerivedSaveState({ label: "world economy", current: original,
    recreate: () => createWorldShipyards({ ports: [{ ...port, tileId: 900 }], startMinute: 500000, seedKey }),
    restore() { throw new Error("Market catalog changed"); }
  });
  assert.equal(result.recovered, true);
  for (let attempt = 0; attempt < 3; attempt++) {
    restorePlayerShipyardSnapshot(result.value, JSON.parse(JSON.stringify(saved)), {
      seedKey, expectedCityIds: [port.cityId]
    });
    assert.deepEqual(playerShipyardSnapshot(snapshotWorldShipyards(result.value)), saved);
  }
});

test("legacy tile-based books migrate through the saved catalog mapping", () => {
  const saved = JSON.parse(readFileSync(new URL("./test-fixtures/shipyards/v10.json", import.meta.url), "utf8"));
  const originalBooks = structuredClone(saved.yards[0].playerAccounts);
  const system = createWorldShipyards({ ports: [{ ...port, tileId: 900 }], startMinute: 500000, seedKey });
  restorePlayerShipyardSnapshot(system, saved, { seedKey, expectedCityIds: [port.cityId],
    legacyCityIdForPortReference: ({ tileId }) => {
      assert.equal(tileId, 1);
      return port.cityId;
    }
  });
  assert.deepEqual(shipyardAtPort(system, port).playerAccounts, originalBooks);
  assert.equal(snapshotWorldShipyards(system).yards[0].portId, port.cityId);
});

test("missing, duplicate and corrupt durable books cannot become a newly founded business", () => {
  const saved = playerShipyardSnapshot(snapshotWorldShipyards(business()));
  const restore = (snapshot) => restorePlayerShipyardSnapshot(
    createWorldShipyards({ ports: [port], startMinute: 500000, seedKey }), snapshot,
    { seedKey, expectedCityIds: [port.cityId] });
  assert.throws(() => restore(null), /snapshot/);
  assert.throws(() => restore({ ...saved, yards: [] }), /portfolio/);
  assert.throws(() => restore({ ...saved, yards: [saved.yards[0], saved.yards[0]] }), /duplicate/);
  const corrupt = structuredClone(saved);
  corrupt.yards[0].playerAccounts = null;
  assert.throws(() => restore(corrupt), /accounts/);
});
