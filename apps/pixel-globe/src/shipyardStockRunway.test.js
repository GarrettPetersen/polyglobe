import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createWorldShipyards, fundPlayerShipyard, advanceWorldShipyards,
  shipyardCurrentBuild, shipyardMaterialStockTargets, shipyardMaterialStatus,
  generateShipyardListing, snapshotWorldShipyards, restoreWorldShipyards,
  replaceWorldShipyardPort, shipyardHasAdvancedFacilities } from "./shipyards.js";

const DAY = 1440;
const PORTS = [
  { cityId: "padang|indonesia", tileId: 1, city: "Padang", cityType: "southeast-asian", population: 10000, lat: -0.95, lon: 100.35, factionId: "neutral" },
  { cityId: "lisbon|portugal", tileId: 2, city: "Lisbon", cityType: "mediterranean", population: 100000, lat: 38.72, lon: -9.14, factionId: "portugal" },
  { cityId: "nagasaki|japan", tileId: 3, city: "Nagasaki", cityType: "east-asian", population: 120000, lat: 32.75, lon: 129.88, factionId: "japan" }
];
function funded(port, seedKey) {
  const system = createWorldShipyards({ ports: [port], startMinute: 0, seedKey });
  fundPlayerShipyard(system, port, { investedMinute: 0, seedCapital: 100000,
    materialContributions: { timber: 20, iron: 12, "naval-stores": 10 } });
  return system;
}
function fillStores(yard) {
  yard.materialInventory = { ...shipyardMaterialStockTargets(yard) };
  // This fixture replaces all on-hand cargo with ordinary yard purchases.
  yard.prepaidMaterialInventory = Object.fromEntries(Object.keys(yard.materialInventory).map(id => [id, 0]));
  assert.ok(shipyardMaterialStatus(yard).every(material => material.ratio === 1));
}

test("warehouse capacities stay fixed through construction, expert hiring, and restore", () => {
  const base = { timber: 10, iron: 6, "naval-stores": 5, "linen-cloth": 4 };
  for (const port of PORTS) {
    const system = funded(port, "fixed-storage");
    const yard = system.yards.get(port.cityId);
    for (const day of [0, 30, 90, 180, 365, 730]) {
      advanceWorldShipyards(system, day * DAY, { available: () => 100000, consume() {} });
      assert.deepEqual(shipyardMaterialStockTargets(yard), base);
    }
    yard.upgrades.expertFromBuildNumber = yard.buildNumber + 1;
    assert.deepEqual(shipyardMaterialStockTargets(yard), base);
    restoreWorldShipyards(system, snapshotWorldShipyards(system));
    assert.deepEqual(shipyardMaterialStockTargets(system.yards.get(port.cityId)), base);
  }
});

test("baseline stores cover roughly three months and expansions extend the runway", () => {
  const runways = [[], []];
  for (let seed = 0; seed < 12; seed++) for (const level of [0, 1]) {
    const system = funded(PORTS[1], `storage-balance-${seed}`);
    const yard = system.yards.get(PORTS[1].cityId);
    // Finish the accelerated founding hull before measuring ordinary production.
    advanceWorldShipyards(system, yard.nextBuildMinute, { available: () => 100000, consume() {} });
    const startMinute = system.lastMinute;
    yard.upgrades.storageLevel = level;
    fillStores(yard);
    let stoppedDay = null;
    for (let day = 1; day <= 730; day++) {
      advanceWorldShipyards(system, startMinute + day * DAY);
      if (shipyardCurrentBuild(yard, system.lastMinute).stoppedMaterialIds.length) {
        stoppedDay = day;
        break;
      }
    }
    assert.notEqual(stoppedDay, null);
    runways[level].push(stoppedDay);
  }
  const mean = runways[0].reduce((sum, day) => sum + day, 0) / runways[0].length;
  assert.ok(mean >= 60 && mean <= 120, `Baseline mean runway: ${mean} days`);
  for (let seed = 0; seed < 12; seed++) assert.ok(runways[1][seed] > runways[0][seed]);
});

test("funded non-famous yards retain hull forecasts and production facilities across restore and city replacement", () => {
  const port = PORTS[0];
  const original = funded(port, "runway-1");
  const yard = original.yards.get(port.cityId);
  assert.equal(yard.famous, false, "historical fame is not overwritten by investment");
  assert.equal(shipyardHasAdvancedFacilities(yard), true);
  const targets = shipyardMaterialStockTargets(yard);
  const nextHull = generateShipyardListing(yard, yard.buildNumber + 1, yard.nextBuildMinute);
  const restored = createWorldShipyards({ ports: [port], startMinute: 0, seedKey: "runway-1" });
  restoreWorldShipyards(restored, snapshotWorldShipyards(original));
  replaceWorldShipyardPort(restored, { ...port, city: "Renamed Padang" });
  const replaced = restored.yards.get(port.cityId);
  assert.equal(shipyardHasAdvancedFacilities(replaced), true);
  assert.deepEqual(shipyardMaterialStockTargets(replaced), targets);
  assert.deepEqual(generateShipyardListing(replaced, replaced.buildNumber + 1, replaced.nextBuildMinute),
    { ...nextHull, portName: "Renamed Padang" });
});

test("a frozen released save retains its funded hull and all physical supplies", () => {
  const fixture = JSON.parse(readFileSync(new URL("./test-fixtures/shipyards/v13-funded-padang.json", import.meta.url), "utf8"));
  const system = createWorldShipyards({ ports: [fixture.port], startMinute: fixture.snapshot.lastMinute, seedKey: fixture.seedKey });
  restoreWorldShipyards(system, fixture.snapshot);
  const yard = system.yards.get(fixture.port.cityId);
  assert.equal(shipyardCurrentBuild(yard, system.lastMinute).shipSlug, fixture.expectedShipSlug);
  assert.deepEqual(yard.materialInventory, fixture.snapshot.yards[0].materialInventory);
  assert.equal(shipyardHasAdvancedFacilities(yard), true);
  const stockTargets = shipyardMaterialStockTargets(yard);
  const second = createWorldShipyards({ ports: [fixture.port], startMinute: system.lastMinute, seedKey: fixture.seedKey });
  restoreWorldShipyards(second, snapshotWorldShipyards(system));
  assert.deepEqual(shipyardMaterialStockTargets(second.yards.get(fixture.port.cityId)), stockTargets);
});
