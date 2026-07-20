import assert from "node:assert/strict";
import test from "node:test";

import {
  SHORE_SCAVENGE_ANTARCTIC,
  SHORE_SCAVENGE_ARCTIC,
  SHORE_SCAVENGE_CASUALTY,
  SHORE_SCAVENGE_CASUALTY_CHANCE,
  SHORE_SCAVENGE_DESERT,
  SHORE_SCAVENGE_FOOD,
  SHORE_SCAVENGE_NOTHING,
  SHORE_SCAVENGE_SEABIRD,
  SHORE_SCAVENGE_TEMPERATE,
  SHORE_SCAVENGE_WATER,
  caughtSeabird,
  foragedFoodQuantity,
  replaceFailedScavengeWithSeabird,
  rollShoreScavenge,
  shoreScavengeContextForTerrain,
  shoreScavengeNoticeLabel,
  shoreScavengeNarrative
} from "./shoreScavenge.js";

test("shore scavenging can find supplies, nothing, or a rare casualty", () => {
  const balanced = { water: 0.5, food: 0.5 };
  assert.equal(rollShoreScavenge(SHORE_SCAVENGE_TEMPERATE, balanced, () => 0), SHORE_SCAVENGE_WATER);
  assert.equal(rollShoreScavenge(SHORE_SCAVENGE_TEMPERATE, balanced, () => 0.2799), SHORE_SCAVENGE_WATER);
  assert.equal(rollShoreScavenge(SHORE_SCAVENGE_TEMPERATE, balanced, () => 0.28), SHORE_SCAVENGE_FOOD);
  assert.equal(rollShoreScavenge(SHORE_SCAVENGE_TEMPERATE, balanced, () => 0.6799), SHORE_SCAVENGE_FOOD);
  assert.equal(rollShoreScavenge(SHORE_SCAVENGE_TEMPERATE, balanced, () => 0.68), SHORE_SCAVENGE_NOTHING);
  assert.equal(rollShoreScavenge(SHORE_SCAVENGE_TEMPERATE, balanced, () => 0.9899), SHORE_SCAVENGE_NOTHING);
  assert.equal(rollShoreScavenge(SHORE_SCAVENGE_TEMPERATE, balanced, () => 0.99), SHORE_SCAVENGE_CASUALTY);
  assert.equal(rollShoreScavenge(SHORE_SCAVENGE_TEMPERATE, balanced, () => 0.9999), SHORE_SCAVENGE_CASUALTY);
  assert.equal(SHORE_SCAVENGE_CASUALTY_CHANCE, 0.01);
});

test("desert scavenging rarely finds water and usually finds nothing", () => {
  const balanced = { water: 0.5, food: 0.5 };
  assert.equal(rollShoreScavenge(SHORE_SCAVENGE_DESERT, balanced, () => 0.0399), SHORE_SCAVENGE_WATER);
  assert.equal(rollShoreScavenge(SHORE_SCAVENGE_DESERT, balanced, () => 0.04), SHORE_SCAVENGE_FOOD);
  assert.equal(rollShoreScavenge(SHORE_SCAVENGE_DESERT, balanced, () => 0.1799), SHORE_SCAVENGE_FOOD);
  assert.equal(rollShoreScavenge(SHORE_SCAVENGE_DESERT, balanced, () => 0.18), SHORE_SCAVENGE_NOTHING);
  assert.equal(rollShoreScavenge(SHORE_SCAVENGE_DESERT, balanced, () => 0.9899), SHORE_SCAVENGE_NOTHING);
  assert.equal(rollShoreScavenge(SHORE_SCAVENGE_DESERT, balanced, () => 0.99), SHORE_SCAVENGE_CASUALTY);
});

test("ordinary shores favor whichever provision is needed most", () => {
  const waterDesperate = { water: 1, food: 0 };
  const foodDesperate = { water: 0, food: 1 };
  assert.equal(rollShoreScavenge(SHORE_SCAVENGE_TEMPERATE, waterDesperate, () => 0.5), SHORE_SCAVENGE_WATER);
  assert.equal(rollShoreScavenge(SHORE_SCAVENGE_TEMPERATE, waterDesperate, () => 0.6), SHORE_SCAVENGE_FOOD);
  assert.equal(rollShoreScavenge(SHORE_SCAVENGE_TEMPERATE, foodDesperate, () => 0.1), SHORE_SCAVENGE_FOOD);
  assert.equal(rollShoreScavenge(SHORE_SCAVENGE_ARCTIC, waterDesperate, () => 0.5), SHORE_SCAVENGE_WATER);
});

test("need cannot make desert water common or alter the overall success rate", () => {
  const waterDesperate = { water: 1, food: 0 };
  assert.equal(rollShoreScavenge(SHORE_SCAVENGE_DESERT, waterDesperate, () => 0.06), SHORE_SCAVENGE_WATER);
  assert.equal(rollShoreScavenge(SHORE_SCAVENGE_DESERT, waterDesperate, () => 0.07), SHORE_SCAVENGE_FOOD);
  assert.equal(rollShoreScavenge(SHORE_SCAVENGE_DESERT, waterDesperate, () => 0.18), SHORE_SCAVENGE_NOTHING);
  assert.equal(rollShoreScavenge(SHORE_SCAVENGE_DESERT, waterDesperate, () => 0.99), SHORE_SCAVENGE_CASUALTY);
});

test("shore scavenging rejects malformed provision needs", () => {
  assert.throws(
    () => rollShoreScavenge(SHORE_SCAVENGE_TEMPERATE, { water: -0.1, food: 0.5 }),
    /invalid shore scavenge water need/i
  );
  assert.throws(
    () => rollShoreScavenge(SHORE_SCAVENGE_TEMPERATE, { water: 0.5, food: NaN }),
    /invalid shore scavenge food need/i
  );
});

test("found food is a small one-to-three unit haul", () => {
  assert.equal(foragedFoodQuantity(() => 0), 1);
  assert.equal(foragedFoodQuantity(() => 0.5), 2);
  assert.equal(foragedFoodQuantity(() => 0.9999), 3);
});

test("a nearby landed seabird replaces only failed or fatal scavenging", () => {
  assert.equal(replaceFailedScavengeWithSeabird(SHORE_SCAVENGE_NOTHING, true), SHORE_SCAVENGE_SEABIRD);
  assert.equal(replaceFailedScavengeWithSeabird(SHORE_SCAVENGE_CASUALTY, true), SHORE_SCAVENGE_SEABIRD);
  assert.equal(replaceFailedScavengeWithSeabird(SHORE_SCAVENGE_WATER, true), SHORE_SCAVENGE_WATER);
  assert.equal(replaceFailedScavengeWithSeabird(SHORE_SCAVENGE_FOOD, true), SHORE_SCAVENGE_FOOD);
  assert.equal(replaceFailedScavengeWithSeabird(SHORE_SCAVENGE_NOTHING, false), SHORE_SCAVENGE_NOTHING);
});

test("scavenged seabirds vary by climate and provide whole food rations", () => {
  assert.deepEqual(caughtSeabird(SHORE_SCAVENGE_TEMPERATE, () => 0), { name: "gull", foodRations: 2 });
  assert.deepEqual(caughtSeabird(SHORE_SCAVENGE_ARCTIC, () => 0), { name: "kittiwake", foodRations: 2 });
  assert.deepEqual(caughtSeabird(SHORE_SCAVENGE_ANTARCTIC, () => 0.9999), { name: "albatross", foodRations: 5 });
});

test("every shore and outcome has varied descriptive text", () => {
  for (const context of [
    SHORE_SCAVENGE_TEMPERATE,
    SHORE_SCAVENGE_DESERT,
    SHORE_SCAVENGE_ARCTIC,
    SHORE_SCAVENGE_ANTARCTIC
  ]) {
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
  assert.equal(shoreScavengeContextForTerrain({ t: "hot_desert" }, 25, false), SHORE_SCAVENGE_DESERT);
  assert.equal(shoreScavengeContextForTerrain({ t: "cold_desert" }, 45, false), SHORE_SCAVENGE_DESERT);
  assert.equal(shoreScavengeContextForTerrain({ t: "cold_desert" }, 65, true), SHORE_SCAVENGE_ARCTIC);
});

test("desert supplies use scarce arid-shore language", () => {
  assert.equal(shoreScavengeNoticeLabel(SHORE_SCAVENGE_WATER, SHORE_SCAVENGE_DESERT), "FOUND A SEEP");
  assert.equal(shoreScavengeNoticeLabel(SHORE_SCAVENGE_FOOD, SHORE_SCAVENGE_DESERT), "FOUND COASTAL FOOD");
  for (const outcome of [SHORE_SCAVENGE_WATER, SHORE_SCAVENGE_FOOD, SHORE_SCAVENGE_NOTHING]) {
    for (const roll of [0, 0.5, 0.9999]) {
      const narrative = shoreScavengeNarrative(outcome, SHORE_SCAVENGE_DESERT, () => roll).toLowerCase();
      assert.doesNotMatch(narrative, /clear spring|stand of trees/);
    }
  }
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
