import assert from "node:assert/strict";
import test from "node:test";

import {
  SHIP_LOADOUT_PRESETS,
  balancedProvisionTargets,
  crewHoldSpace,
  fitShipCustomLoadoutPlan,
  setShipCustomLoadoutValue,
  shipCustomLoadoutBounds,
  shipCustomLoadoutDraft,
  shipCustomLoadoutPlan,
  shipLoadoutPlan,
  shipMinimumCrew
} from "./shipLoadouts.js";
import { shipStatsForSlug } from "./shipStats.js";

test("every loadout fits small and large ship holds", () => {
  for (const slug of ["fishing-lugger", "brigantine", "ship-of-the-line"]) {
    const stats = shipStatsForSlug(slug);
    for (const preset of SHIP_LOADOUT_PRESETS) {
      const plan = shipLoadoutPlan(stats, preset.id);
      assert.ok(plan.totalSpace <= stats.cargoCapacity, `${slug} ${preset.id}`);
      assert.ok(plan.crew >= shipMinimumCrew(stats) && plan.crew <= plan.crewCapacity);
      assert.ok(plan.cannons >= 0 && plan.cannons <= stats.cannons);
    }
  }
});

test("preset priorities produce distinct useful ship plans", () => {
  const stats = shipStatsForSlug("brigantine");
  const longHaul = shipLoadoutPlan(stats, "long-haul");
  const shortHaul = shipLoadoutPlan(stats, "short-haul");
  const combat = shipLoadoutPlan(stats, "combat");
  const balanced = shipLoadoutPlan(stats, "balanced");

  assert.ok(longHaul.foodDays > shortHaul.foodDays);
  assert.ok(longHaul.waterDays > shortHaul.waterDays);
  assert.equal(combat.cannons, stats.cannons);
  assert.equal(combat.crew, combat.crewCapacity);
  assert.ok(shortHaul.reserveSpace > balanced.reserveSpace);
  assert.ok(balanced.cannons > longHaul.cannons);
});

test("four crew share one unit of berth and equipment space", () => {
  assert.equal(crewHoldSpace(0), 0);
  assert.equal(crewHoldSpace(1), 1);
  assert.equal(crewHoldSpace(4), 1);
  assert.equal(crewHoldSpace(5), 2);
});

test("the standard short-haul complement is each hull's minimum selectable crew", () => {
  for (const slug of ["fishing-lugger", "brigantine", "ship-of-the-line"]) {
    const stats = shipStatsForSlug(slug);
    assert.equal(shipMinimumCrew(stats), shipLoadoutPlan(stats, "short-haul").crew);
  }
});

test("constrained provisions split evenly with the odd slot reserved for water", () => {
  assert.deepEqual(balancedProvisionTargets(8, 8, 7), { foodUnits: 3, waterUnits: 4 });
  assert.deepEqual(balancedProvisionTargets(3, 8, 8), { foodUnits: 3, waterUnits: 5 });
  assert.deepEqual(balancedProvisionTargets(8, 3, 8), { foodUnits: 5, waterUnits: 3 });
  assert.deepEqual(balancedProvisionTargets(8, 8, 0), { foodUnits: 0, waterUnits: 0 });
  assert.throws(() => balancedProvisionTargets(8, 8, 1.5), /Invalid balanced provision/);
});

test("custom loadouts preserve exact integer targets and expose remaining trade space", () => {
  const stats = shipStatsForSlug("brigantine");
  const crew = shipMinimumCrew(stats);
  let draft = shipCustomLoadoutDraft(stats);
  draft = setShipCustomLoadoutValue(stats, draft, "crew", crew);
  draft = setShipCustomLoadoutValue(stats, draft, "cannons", 3);
  draft = setShipCustomLoadoutValue(stats, draft, "foodUnits", 4);
  draft = setShipCustomLoadoutValue(stats, draft, "waterUnits", 5);
  const plan = shipCustomLoadoutPlan(stats, draft);

  assert.equal(plan.id, "custom");
  assert.equal(plan.crew, crew);
  assert.equal(plan.cannons, 3);
  assert.equal(plan.foodUnits, 4);
  assert.equal(plan.waterUnits, 5);
  assert.equal(plan.reserveSpace, stats.cargoCapacity - plan.totalSpace);
  assert.equal(plan.foodDays, 4 * 12 / (crew + 1));
  assert.equal(plan.waterDays, 5 * 8 / (crew + 1));
});

test("custom slider bounds prevent any field from overflowing the hold", () => {
  const stats = shipStatsForSlug("brigantine");
  const draft = shipCustomLoadoutDraft(stats);
  assert.equal(shipCustomLoadoutBounds(stats, draft, "crew").min, shipMinimumCrew(stats));
  for (const key of ["crew", "cannons", "foodUnits", "waterUnits"]) {
    const bounds = shipCustomLoadoutBounds(stats, draft, key);
    const adjusted = setShipCustomLoadoutValue(stats, draft, key, bounds.max + 100);
    assert.equal(adjusted[key], bounds.max);
    assert.ok(shipCustomLoadoutPlan(stats, adjusted).totalSpace <= stats.cargoCapacity);
  }
  assert.throws(
    () => shipCustomLoadoutPlan(stats, {
      crew: shipMinimumCrew(stats),
      cannons: 0,
      foodUnits: stats.cargoCapacity,
      waterUnits: 1
    }),
    /Custom loadout uses/
  );
  assert.throws(
    () => shipCustomLoadoutPlan(stats, { crew: 1, cannons: 0, foodUnits: 0, waterUnits: 0 }),
    /crew must be/
  );
});

test("custom loadouts fit smaller replacement hulls while preserving water on tied stores", () => {
  const stats = { cargoCapacity: 4, cannons: 0, mass: 12, crewCapacity: 2 };
  const plan = fitShipCustomLoadoutPlan(stats, { crew: 2, cannons: 0, foodUnits: 2, waterUnits: 2 });

  assert.deepEqual(
    { crew: plan.crew, foodUnits: plan.foodUnits, waterUnits: plan.waterUnits },
    { crew: 2, foodUnits: 1, waterUnits: 2 }
  );
  assert.equal(plan.totalSpace, 4);
});
