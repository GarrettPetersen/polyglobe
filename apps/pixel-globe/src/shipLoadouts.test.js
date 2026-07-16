import assert from "node:assert/strict";
import test from "node:test";

import {
  SHIP_LOADOUT_PRESETS,
  balancedProvisionTargets,
  crewHoldSpace,
  shipLoadoutPlan
} from "./shipLoadouts.js";
import { shipStatsForSlug } from "./shipStats.js";

test("every loadout fits small and large ship holds", () => {
  for (const slug of ["fishing-lugger", "brigantine", "ship-of-the-line"]) {
    const stats = shipStatsForSlug(slug);
    for (const preset of SHIP_LOADOUT_PRESETS) {
      const plan = shipLoadoutPlan(stats, preset.id);
      assert.ok(plan.totalSpace <= stats.cargoCapacity, `${slug} ${preset.id}`);
      assert.ok(plan.crew >= 1 && plan.crew <= plan.crewCapacity);
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

test("constrained provisions split evenly with the odd slot reserved for water", () => {
  assert.deepEqual(balancedProvisionTargets(8, 8, 7), { foodUnits: 3, waterUnits: 4 });
  assert.deepEqual(balancedProvisionTargets(3, 8, 8), { foodUnits: 3, waterUnits: 5 });
  assert.deepEqual(balancedProvisionTargets(8, 3, 8), { foodUnits: 5, waterUnits: 3 });
  assert.deepEqual(balancedProvisionTargets(8, 8, 0), { foodUnits: 0, waterUnits: 0 });
  assert.throws(() => balancedProvisionTargets(8, 8, 1.5), /Invalid balanced provision/);
});
