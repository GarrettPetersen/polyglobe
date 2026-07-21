import assert from "node:assert/strict";
import test from "node:test";

import {
  crewScaledFailureChance,
  crewScaledSuccessChance,
  crewWorkMultiplier
} from "./crewEffectiveness.js";
import { shipMinimumCrew } from "./shipLoadouts.js";
import { shipStatsForSlug } from "./shipStats.js";

test("crew work is anchored at one hand, the standard complement, and full crew", () => {
  const stats = shipStatsForSlug("brigantine");
  const standardCrew = shipMinimumCrew(stats);

  assert.equal(crewWorkMultiplier(1, stats), 0.5);
  assert.equal(crewWorkMultiplier(standardCrew, stats), 1);
  assert.equal(crewWorkMultiplier(stats.crewCapacity, stats), 2);
});

test("crew work changes smoothly and monotonically around the standard complement", () => {
  const stats = shipStatsForSlug("ship-of-the-line");
  const standardCrew = shipMinimumCrew(stats);
  const multipliers = Array.from(
    { length: stats.crewCapacity },
    (_, index) => crewWorkMultiplier(index + 1, stats)
  );

  assert.ok(multipliers.every((value, index) => index === 0 || value >= multipliers[index - 1]));
  assert.ok(crewWorkMultiplier(standardCrew - 1, stats) < 1);
  assert.ok(crewWorkMultiplier(standardCrew + 1, stats) > 1);
});

test("a fully crewed one-person craft works at its intended normal rate", () => {
  const stats = shipStatsForSlug("dhow");
  assert.equal(stats.crewCapacity, 1);
  assert.equal(crewWorkMultiplier(1, stats), 1);
});

test("crew multipliers improve success and reduce failure without guaranteeing either", () => {
  assert.equal(crewScaledSuccessChance(0.4, 0.5), 0.2);
  assert.equal(crewScaledSuccessChance(0.4, 1), 0.4);
  assert.equal(crewScaledSuccessChance(0.4, 2), 0.8);
  assert.equal(crewScaledSuccessChance(0.8, 2), 0.98);
  assert.equal(crewScaledFailureChance(0.4, 0.5), 0.8);
  assert.equal(crewScaledFailureChance(0.4, 1), 0.4);
  assert.equal(crewScaledFailureChance(0.4, 2), 0.2);
});

test("crew work rejects malformed complements and probability scales", () => {
  const stats = shipStatsForSlug("brigantine");
  assert.throws(() => crewWorkMultiplier(1.5, stats), /active crew/);
  assert.throws(() => crewWorkMultiplier(stats.crewCapacity + 1, stats), /exceeds/);
  assert.throws(() => crewScaledSuccessChance(1.1, 1), /success chance/);
  assert.throws(() => crewScaledFailureChance(0.5, 2.1), /work multiplier/);
});
