import assert from "node:assert/strict";
import test from "node:test";
import { islandRetentionReason, MAX_NEARBY_LANDMASS_DISTANCE_KM, MIN_SUBSTANTIAL_ISLAND_AREA_KM2 } from "./coastalIslandPolicy.js";

test("island retention follows significance and isolation rather than an island-name whitelist", () => {
  for (const areaKm2 of [1, 10, 100, 1000]) {
    for (const distanceToLargerLandmassKm of [0, 10, 75, 76, null]) {
      const island = { areaKm2, distanceToLargerLandmassKm, gameplaySiteIds: [] };
      assert.equal(islandRetentionReason(island), distanceToLargerLandmassKm === null || distanceToLargerLandmassKm > 75
        ? "isolated-landfall" : null);
      for (const site of ["city:test-port", "village:test-resupply", "quest:test-landfall", "politics:test-island"]) {
        assert.equal(islandRetentionReason({ ...island, gameplaySiteIds: [site] }), "gameplay-site");
      }
    }
  }
  for (const areaKm2 of [MIN_SUBSTANTIAL_ISLAND_AREA_KM2, 10_000, 32_000]) {
    assert.equal(islandRetentionReason({areaKm2, distanceToLargerLandmassKm: 0, gameplaySiteIds: []}), "substantial-landmass");
  }
  assert.equal(MAX_NEARBY_LANDMASS_DISTANCE_KM, 75);
  assert.throws(() => islandRetentionReason({areaKm2: -1, distanceToLargerLandmassKm: null, gameplaySiteIds: []}), /Island retention/);
});
