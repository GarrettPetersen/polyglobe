import assert from "node:assert/strict";
import test from "node:test";

import {
  SHORE_SCAVENGE_CASUALTY,
  SHORE_SCAVENGE_CASUALTY_CHANCE,
  SHORE_SCAVENGE_FOOD,
  SHORE_SCAVENGE_NOTHING,
  SHORE_SCAVENGE_SPRING,
  foragedFoodQuantity,
  rollShoreScavenge,
  shoreScavengeNarrative
} from "./shoreScavenge.js";

test("shore scavenging can find supplies, nothing, or a rare casualty", () => {
  assert.equal(rollShoreScavenge(() => 0), SHORE_SCAVENGE_SPRING);
  assert.equal(rollShoreScavenge(() => 0.2799), SHORE_SCAVENGE_SPRING);
  assert.equal(rollShoreScavenge(() => 0.28), SHORE_SCAVENGE_FOOD);
  assert.equal(rollShoreScavenge(() => 0.6799), SHORE_SCAVENGE_FOOD);
  assert.equal(rollShoreScavenge(() => 0.68), SHORE_SCAVENGE_NOTHING);
  assert.equal(rollShoreScavenge(() => 0.9899), SHORE_SCAVENGE_NOTHING);
  assert.equal(rollShoreScavenge(() => 0.99), SHORE_SCAVENGE_CASUALTY);
  assert.equal(rollShoreScavenge(() => 0.9999), SHORE_SCAVENGE_CASUALTY);
  assert.equal(SHORE_SCAVENGE_CASUALTY_CHANCE, 0.01);
});

test("found food is a small one-to-three unit haul", () => {
  assert.equal(foragedFoodQuantity(() => 0), 1);
  assert.equal(foragedFoodQuantity(() => 0.5), 2);
  assert.equal(foragedFoodQuantity(() => 0.9999), 3);
});

test("every shore scavenging outcome has varied descriptive text", () => {
  for (const outcome of [
    SHORE_SCAVENGE_SPRING,
    SHORE_SCAVENGE_FOOD,
    SHORE_SCAVENGE_NOTHING,
    SHORE_SCAVENGE_CASUALTY
  ]) {
    const first = shoreScavengeNarrative(outcome, () => 0);
    const last = shoreScavengeNarrative(outcome, () => 0.9999);
    assert.ok(first.length >= 40);
    assert.ok(last.length >= 40);
    assert.notEqual(first, last);
  }
});
