import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { FACTIONS } from "./factions.js";
import { conquestStrategicWeight, CONQUEST_STRATEGIC_INTERESTS } from "./conquestStrategies.js";

const port = { cityId: "generic-port", population: 60000 };
const distances = { frontierDistanceKm: 1000, capitalDistanceKm: 1000 };
test("every country retains positive priorities for remote world-conquest targets", () => {
  for (const faction of FACTIONS) {
    const far = conquestStrategicWeight(faction.id, port, { frontierDistanceKm: 50000, capitalDistanceKm: 50000 });
    assert.ok(Number.isFinite(far) && far > 0, faction.id);
    assert.ok(conquestStrategicWeight(faction.id, port, distances) > far, faction.id);
  }
});
test("Portugal values Malacca's sea-route position above a nearby Moroccan port", () => {
  const malacca = conquestStrategicWeight("portugal", { ...port, cityId: "malacca|malaysia" }, {
    frontierDistanceKm: 15000, capitalDistanceKm: 20000
  });
  const morocco = conquestStrategicWeight("portugal", { ...port, cityId: "morocco-port" }, {
    frontierDistanceKm: 100, capitalDistanceKm: 100
  });
  assert.ok(malacca > morocco);
});
test("frontier footholds matter independently of the capital and issuer", () => {
  const remote = { frontierDistanceKm: 18000, capitalDistanceKm: 18000 };
  for (const id of ["tidore", "portugal", "mughal", "england"]) {
    assert.ok(conquestStrategicWeight(id, port, { ...remote, frontierDistanceKm: 100 }) >
      conquestStrategicWeight(id, port, remote));
    assert.ok(conquestStrategicWeight(id, port, { ...remote, capitalDistanceKm: 100 }) >
      conquestStrategicWeight(id, port, remote));
  }
});
test("territorial consolidation is more sensitive to distance than Portugal's maritime strategy", () => {
  const far = { frontierDistanceKm: 15000, capitalDistanceKm: 15000 };
  const relativeDistancePenalty = id => conquestStrategicWeight(id, port, far) /
    conquestStrategicWeight(id, port, distances);
  assert.ok(relativeDistancePenalty("mughal") < relativeDistancePenalty("portugal"));
});
test("strategic sites resolve by canonical ID even after a rename and conquest", () => {
  const catalog = JSON.parse(readFileSync(new URL("../city-visualizer/data/cities.json", import.meta.url))).cities;
  const ids = new Set(catalog.map(city => city.cityId));
  for (const interests of Object.values(CONQUEST_STRATEGIC_INTERESTS)) {
    for (const id of Object.keys(interests)) assert.ok(ids.has(id), id);
  }
  const malacca = { ...port, cityId: "malacca|malaysia", factionId: "portugal", city: "Malacca" };
  assert.equal(conquestStrategicWeight("portugal", malacca, distances),
    conquestStrategicWeight("portugal", { ...malacca, factionId: "tidore", city: "Renamed" }, distances));
});
test("invalid inputs fail loudly; a country without a reachable capital still has priorities", () => {
  assert.ok(conquestStrategicWeight("england", port, { ...distances, capitalDistanceKm: null }) > 0);
  assert.throws(() => conquestStrategicWeight("missing", port, distances));
  assert.throws(() => conquestStrategicWeight("england", { population: 1 }, distances));
  for (const bad of [-1, Infinity, NaN, undefined]) {
    assert.throws(() => conquestStrategicWeight("england", port, { ...distances, frontierDistanceKm: bad }));
  }
});
