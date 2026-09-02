import assert from "node:assert/strict";
import test from "node:test";

import {
  MAXIMUM_EFFECTIVE_CREW_WORK_COUNT,
  MAXIMUM_CREW_WORK_COUNT,
  STANDARD_CREW_WORK_COUNT,
  crewScaledFailureChance,
  crewScaledSuccessChance,
  crewWorkMultiplier
} from "./crewEffectiveness.js";
import { shipStatsForSlug } from "./shipStats.js";

test("crew work is anchored at one hand, the typical complement, and the largest complement", () => {
  assert.equal(crewWorkMultiplier(1), 0.5);
  assert.equal(crewWorkMultiplier(STANDARD_CREW_WORK_COUNT), 1);
  assert.equal(crewWorkMultiplier(MAXIMUM_EFFECTIVE_CREW_WORK_COUNT), 2);
});

test("crew work changes smoothly and monotonically around the typical complement", () => {
  const multipliers = Array.from(
    { length: MAXIMUM_CREW_WORK_COUNT },
    (_, index) => crewWorkMultiplier(index + 1)
  );

  assert.ok(multipliers.every((value, index) => index === 0 || value >= multipliers[index - 1]));
  assert.ok(crewWorkMultiplier(STANDARD_CREW_WORK_COUNT - 1) < 1);
  assert.ok(crewWorkMultiplier(STANDARD_CREW_WORK_COUNT + 1) > 1);
});

test("the same headcount has exactly the same multiplier aboard every ship", () => {
  const smallShip = shipStatsForSlug("caravel");
  const largeShip = shipStatsForSlug("ship-of-the-line");
  const activeCrew = 12;
  const assignments = [smallShip, largeShip].map((stats) => {
    assert.ok(activeCrew <= stats.crewCapacity);
    return crewWorkMultiplier(activeCrew);
  });
  assert.equal(crewWorkMultiplier.length, 1);
  assert.deepEqual(assignments, [assignments[0], assignments[0]]);
  assert.ok(crewWorkMultiplier(smallShip.crewCapacity) < crewWorkMultiplier(largeShip.crewCapacity));
});

test("crew multipliers improve success and reduce failure without guaranteeing either", () => {
  assert.equal(crewScaledSuccessChance(0.4, 0.5), 0.2);
  assert.equal(crewScaledSuccessChance(0.4, 1), 0.4);
  assert.equal(crewScaledSuccessChance(0.4, 2), 0.8);
  assert.equal(crewScaledSuccessChance(0.8, 2), 0.98);
  assert.ok(
    Math.abs(crewScaledSuccessChance(0.4, 2.2993611111111107) - 0.9197444444444444) < 1e-12
  );
  assert.equal(crewScaledFailureChance(0.4, 0.5), 0.8);
  assert.equal(crewScaledFailureChance(0.4, 1), 0.4);
  assert.equal(crewScaledFailureChance(0.4, 2), 0.2);
  assert.ok(Math.abs(crewScaledFailureChance(0.4, 2.4) - 1 / 6) < 1e-12);
});

test("crew work rejects malformed complements and probability scales", () => {
  assert.ok(crewWorkMultiplier(1.5) > crewWorkMultiplier(1));
  assert.ok(crewWorkMultiplier(1.5) < crewWorkMultiplier(2));
  assert.throws(() => crewWorkMultiplier(MAXIMUM_EFFECTIVE_CREW_WORK_COUNT + 0.1), /exceeds/);
  assert.throws(() => crewScaledSuccessChance(1.1, 1), /success chance/);
  assert.throws(() => crewScaledFailureChance(0.5, Infinity), /activity multiplier/);
});
