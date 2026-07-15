import assert from "node:assert/strict";
import test from "node:test";

import {
  SHORE_SCAVENGE_ANTARCTIC,
  SHORE_SCAVENGE_ARCTIC,
  SHORE_SCAVENGE_CASUALTY,
  SHORE_SCAVENGE_CASUALTY_CHANCE,
  SHORE_SCAVENGE_FOOD,
  SHORE_SCAVENGE_NOTHING,
  SHORE_SCAVENGE_TEMPERATE,
  SHORE_SCAVENGE_WATER,
  foragedFoodQuantity,
  rollShoreScavenge,
  shoreScavengeContextForTerrain,
  shoreScavengeNoticeLabel,
  shoreScavengeNarrative
} from "./shoreScavenge.js";

test("shore scavenging can find supplies, nothing, or a rare casualty", () => {
  assert.equal(rollShoreScavenge(() => 0), SHORE_SCAVENGE_WATER);
  assert.equal(rollShoreScavenge(() => 0.2799), SHORE_SCAVENGE_WATER);
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

test("every shore and outcome has varied descriptive text", () => {
  for (const context of [SHORE_SCAVENGE_TEMPERATE, SHORE_SCAVENGE_ARCTIC, SHORE_SCAVENGE_ANTARCTIC]) {
    for (const outcome of [
      SHORE_SCAVENGE_WATER,
      SHORE_SCAVENGE_FOOD,
      SHORE_SCAVENGE_NOTHING,
      SHORE_SCAVENGE_CASUALTY
    ]) {
      const first = shoreScavengeNarrative(outcome, context, () => 0);
      const last = shoreScavengeNarrative(outcome, context, () => 0.9999);
      assert.ok(first.length >= 40);
      assert.ok(last.length >= 40);
      assert.notEqual(first, last);
    }
  }
});

test("frozen terrain selects the correct polar scavenging context", () => {
  assert.equal(shoreScavengeContextForTerrain({ t: "ice" }, 78, false), SHORE_SCAVENGE_ARCTIC);
  assert.equal(shoreScavengeContextForTerrain({ t: "ice_cap" }, -74, false), SHORE_SCAVENGE_ANTARCTIC);
  assert.equal(shoreScavengeContextForTerrain({ t: "grass" }, 64, true), SHORE_SCAVENGE_ARCTIC);
  assert.equal(shoreScavengeContextForTerrain({ t: "grass" }, 45, true), SHORE_SCAVENGE_TEMPERATE);
  assert.equal(shoreScavengeContextForTerrain({ t: "grass" }, 50, false), SHORE_SCAVENGE_TEMPERATE);
});

test("polar supply notices and narratives never claim to find woodland springs", () => {
  assert.equal(shoreScavengeNoticeLabel(SHORE_SCAVENGE_WATER, SHORE_SCAVENGE_ARCTIC), "MELTED SNOW");
  assert.equal(shoreScavengeNoticeLabel(SHORE_SCAVENGE_FOOD, SHORE_SCAVENGE_ARCTIC), "FOUND POLAR GAME");
  for (const context of [SHORE_SCAVENGE_ARCTIC, SHORE_SCAVENGE_ANTARCTIC]) {
    for (const outcome of [SHORE_SCAVENGE_WATER, SHORE_SCAVENGE_FOOD]) {
      for (const roll of [0, 0.5, 0.9999]) {
        const narrative = shoreScavengeNarrative(outcome, context, () => roll).toLowerCase();
        assert.doesNotMatch(narrative, /spring|tree/);
      }
    }
  }
});
