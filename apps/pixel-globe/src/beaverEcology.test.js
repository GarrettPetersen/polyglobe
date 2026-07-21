import assert from "node:assert/strict";
import test from "node:test";

import {
  BEAVER_RANGE_NORTH_AMERICA,
  BEAVER_RANGE_SIBERIA,
  beaverCatchNarrative,
  beaverCatchYield,
  beaverRangeForCoordinates,
  beaverRiverHabitat,
  beaverSettlementProductionRate,
  rollBeaverCatch
} from "./beaverEcology.js";

test("beaver ranges cover temperate North America and Siberia without inventing southern populations", () => {
  assert.equal(beaverRangeForCoordinates(46, -73), BEAVER_RANGE_NORTH_AMERICA);
  assert.equal(beaverRangeForCoordinates(49, -126), BEAVER_RANGE_NORTH_AMERICA);
  assert.equal(beaverRangeForCoordinates(56, 82), BEAVER_RANGE_SIBERIA);
  assert.equal(beaverRangeForCoordinates(25, -90), null);
  assert.equal(beaverRangeForCoordinates(-40, -70), null);
  assert.equal(beaverRangeForCoordinates(50, 10), null);
});

test("only suitable rivers inside a historical range can produce a beaver catch", () => {
  const base = { isRiver: true, latitudeDeg: 46, longitudeDeg: -73 };
  assert.equal(beaverRiverHabitat({ ...base, terrain: "humid_continental" }), BEAVER_RANGE_NORTH_AMERICA);
  assert.equal(beaverRiverHabitat({ ...base, terrain: "hot_desert" }), null);
  assert.equal(beaverRiverHabitat({ ...base, terrain: "tundra" }), null);
  assert.equal(beaverRiverHabitat({ ...base, isRiver: false, terrain: "humid_continental" }), null);
});

test("larger trapping parties improve the chance of catching a beaver", () => {
  assert.equal(rollBeaverCatch(BEAVER_RANGE_NORTH_AMERICA, () => 0.2, 0.5), false);
  assert.equal(rollBeaverCatch(BEAVER_RANGE_NORTH_AMERICA, () => 0.2, 1), true);
  assert.equal(rollBeaverCatch(BEAVER_RANGE_NORTH_AMERICA, () => 0.7, 2), true);
});

test("North American catches are common while Siberian catches are somewhat rarer", () => {
  assert.equal(rollBeaverCatch(BEAVER_RANGE_NORTH_AMERICA, () => 0.3799), true);
  assert.equal(rollBeaverCatch(BEAVER_RANGE_NORTH_AMERICA, () => 0.38), false);
  assert.equal(rollBeaverCatch(BEAVER_RANGE_SIBERIA, () => 0.2799), true);
  assert.equal(rollBeaverCatch(BEAVER_RANGE_SIBERIA, () => 0.28), false);
});

test("one beaver yields one pelt and several whole food rations", () => {
  assert.deepEqual(beaverCatchYield(() => 0), { pelts: 1, foodRations: 4 });
  assert.deepEqual(beaverCatchYield(() => 0.9999), { pelts: 1, foodRations: 7 });
  assert.notEqual(beaverCatchNarrative(() => 0), beaverCatchNarrative(() => 0.9999));
});

test("regional villages and player-founded colonies supply pelts", () => {
  assert.equal(beaverSettlementProductionRate({
    lat: 49.59,
    lon: -126.62,
    settlementType: "village"
  }), 1.05);
  assert.equal(beaverSettlementProductionRate({
    lat: 44.74,
    lon: -65.52,
    settlementType: "city",
    playerFoundedColony: true
  }), 1.05);
  assert.equal(beaverSettlementProductionRate({
    lat: 44.74,
    lon: -65.52,
    settlementType: "city"
  }), 0);
});
