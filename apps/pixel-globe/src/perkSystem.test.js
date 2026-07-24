import assert from "node:assert/strict";
import test from "node:test";

import {
  MAX_DAMAGE_RESISTANCE_CHANCE,
  MAX_HULL_REPAIR_FRACTION_PER_DAY,
  aggregatePerkSources,
  combinedDamageResistanceChance,
  damageResistanceRollSucceeds,
  effectiveShipStats
} from "./perkSystem.js";

test("perk sources stack additive and multiplicative effects", () => {
  const totals = aggregatePerkSources([
    {
      id: "captain",
      perks: {
        cargoCapacityFlat: 4,
        topSpeedMultiplier: 1.05,
        tradePurchaseMultiplier: 0.97,
        tradeSaleMultiplier: 1.03
      }
    },
    {
      id: "passenger",
      perks: {
        topSpeedMultiplier: 1.03,
        fishingChanceMultiplier: 1.2,
        tradePurchaseMultiplier: 0.985,
        tradeSaleMultiplier: 1.015
      }
    },
    { id: "barrels", perks: { cargoCapacityFlat: 3 } }
  ]);
  assert.equal(totals.cargoCapacityFlat, 7);
  assert.equal(totals.topSpeedMultiplier, 1.05 * 1.03);
  assert.equal(totals.fishingChanceMultiplier, 1.2);
  assert.equal(totals.tradePurchaseMultiplier, 0.97 * 0.985);
  assert.equal(totals.tradeSaleMultiplier, 1.03 * 1.015);
});

test("passive hull repair stacks additively under a conservative cap", () => {
  const totals = aggregatePerkSources(Array.from({ length: 4 }, (_, index) => ({
    id: `shipwright-${index}`,
    perks: { hullRepairFractionPerDay: 0.0075 }
  })));

  assert.equal(totals.hullRepairFractionPerDay, MAX_HULL_REPAIR_FRACTION_PER_DAY);
});

test("stacking chance and bargain perks respects their balance caps", () => {
  const totals = aggregatePerkSources(Array.from({ length: 10 }, (_, index) => ({
    id: `specialist-${index}`,
    perks: {
      disguiseChanceBonus: 0.15,
      tradePurchaseMultiplier: 0.97,
      tradeSaleMultiplier: 1.03,
      animalEncounterChanceMultiplier: 1.5,
      cannonSpreadMultiplier: 0.8
    }
  })));
  assert.equal(totals.disguiseChanceBonus, 0.3);
  assert.equal(totals.tradePurchaseMultiplier, 0.9);
  assert.equal(totals.tradeSaleMultiplier, 1.1);
  assert.equal(totals.animalEncounterChanceMultiplier, 3);
  assert.equal(totals.cannonSpreadMultiplier, 0.55);
});

test("all hull resistance sources use one additive capped roll", () => {
  assert.equal(combinedDamageResistanceChance([0.4, 0.14, 0.06]), 0.6);
  assert.equal(combinedDamageResistanceChance([0.75, 0.14]), MAX_DAMAGE_RESISTANCE_CHANCE);
  assert.equal(damageResistanceRollSucceeds([0.4, 0.14, 0.06], 0.599), true);
  assert.equal(damageResistanceRollSucceeds([0.4, 0.14, 0.06], 0.6), false);
});

test("effective ship stats apply movement, capacity, and windward perks", () => {
  const perks = aggregatePerkSources([{
    id: "rig",
    perks: {
      cargoCapacityFlat: 3,
      topSpeedMultiplier: 1.1,
      accelerationMultiplier: 1.2,
      windwardAngleReductionDeg: 4
    }
  }]);
  const stats = effectiveShipStats({
    cargoCapacity: 20,
    topSpeedRad: 2,
    accelerationRad: 3,
    turnRateRad: 4,
    hitPoints: 10,
    seaworthiness: 5,
    upwindStallAngleDeg: 45
  }, perks);
  assert.equal(stats.cargoCapacity, 23);
  assert.equal(stats.topSpeedRad, 2.2);
  assert.ok(Math.abs(stats.accelerationRad - 3.6) < 1e-12);
  assert.equal(stats.upwindStallAngleDeg, 41);
});
