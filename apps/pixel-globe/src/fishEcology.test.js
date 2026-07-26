import assert from "node:assert/strict";
import test from "node:test";

import { createGameState } from "./gameState.js";
import {
  FISH_MIN_CATCHABLE_POPULATION,
  fisheryForHabitat,
  harvestFishery,
  visibleFishCountForDensity
} from "./fishEcology.js";

const MINUTE = 1440;

test("temperate rivers can produce seasonal salmon runs", () => {
  const state = createGameState({ cargoCapacity: 20 });
  const fishery = findFishery(state, "river", 48, -123, 280 * MINUTE, "salmon");

  assert.equal(fishery.kind, "fishery");
  assert.equal(fishery.speciesId, "salmon");
  assert.equal(fishery.habitatKind, "river");
  assert.ok(fishery.population > 0);
  assert.ok(fishery.capacity >= fishery.population);
  assert.ok(fishery.visibleIndividualCount > 0);
  assert.ok(fishery.areaRadiusPx > 0);
});

test("salmon feed at sea outside the spawning run instead of lingering in rivers", () => {
  const state = createGameState({ cargoCapacity: 20 });
  const feedingMinute = 140 * MINUTE;
  const coastalFishery = findFishery(state, "coastal", 48, -123, feedingMinute, "salmon");

  assert.equal(coastalFishery.speciesId, "salmon");
  assert.equal(coastalFishery.habitatKind, "coastal");
  assertNoSpecies(state, "river", 48, -123, feedingMinute, "salmon");
});

test("salmon gather at river mouths before moving upriver", () => {
  const state = createGameState({ cargoCapacity: 20 });
  const approachMinute = 230 * MINUTE;
  const mouthFishery = findFishery(state, "river-mouth", 48, -123, approachMinute, "salmon");

  assert.equal(mouthFishery.speciesId, "salmon");
  assertNoSpecies(state, "river", 48, -123, approachMinute, "salmon");
});

test("salmon remain in their native Northern Hemisphere range in 1522", () => {
  const state = createGameState({ cargoCapacity: 20 });

  assertNoSpecies(state, "river", -48, -73, 280 * MINUTE, "salmon");
  assertNoSpecies(state, "coastal", -48, -73, 140 * MINUTE, "salmon");
});

test("resident freshwater fish give rivers distinct regional fisheries", () => {
  const minute = 140 * MINUTE;
  const regions = [
    ["northern-pike", 50, -95],
    ["wels-catfish", 48, 20],
    ["channel-catfish", 36, -90],
    ["african-catfish", 8, 30],
    ["tigerfish", -12, 25],
    ["mahseer", 25, 82],
    ["mekong-giant-catfish", 16, 103],
    ["grass-carp", 30, 115],
    ["arapaima", -4, -62],
    ["piranha", -8, -58],
    ["murray-cod", -34, 145]
  ];

  for (const [speciesId, lat, lon] of regions) {
    const state = createGameState({ cargoCapacity: 20 });
    const fishery = findFishery(state, "river", lat, lon, minute, speciesId);
    assert.equal(fishery.speciesId, speciesId);
    assert.equal(fishery.habitatKind, "river");
  }
});

test("resident river fish remain available outside a seasonal run", () => {
  const state = createGameState({ cargoCapacity: 20 });
  const springMinute = 80 * MINUTE;
  const habitat = findHabitatWithFishery(state, "river", -4, -62, springMinute, "arapaima");
  const springFishery = fisheryForHabitat(state, habitat, springMinute);
  const winterFishery = fisheryForHabitat(state, habitat, 320 * MINUTE);

  assert.equal(springFishery.speciesId, "arapaima");
  assert.equal(winterFishery.speciesId, "arapaima");
});

test("resident freshwater fish stay inside their regional river ranges", () => {
  const state = createGameState({ cargoCapacity: 20 });
  const minute = 140 * MINUTE;

  assertNoSpecies(state, "river", 30, 115, minute, "arapaima");
  assertNoSpecies(state, "river", -8, -58, minute, "grass-carp");
  assertNoSpecies(state, "river", 50, 20, minute, "murray-cod");
});

test("river mouths can support resident fish without putting them in the open ocean", () => {
  const state = createGameState({ cargoCapacity: 20 });
  const minute = 140 * MINUTE;
  const mouthFishery = findFishery(state, "river-mouth", 36, -90, minute, "channel-catfish");

  assert.equal(mouthFishery.speciesId, "channel-catfish");
  assertNoSpecies(state, "open-ocean", 36, -90, minute, "channel-catfish");
});

test("Lake Victoria has only native 1522 freshwater fisheries", () => {
  const state = createGameState({ cargoCapacity: 20 });
  const minute = 140 * MINUTE;
  const victoriaCichlid = findFishery(state, "lake", -1, 33, minute, "victoria-cichlid");
  const nativeTilapia = findFishery(state, "lake", -1, 33, minute, "native-tilapia");

  assert.equal(victoriaCichlid.speciesLabel, "Victoria cichlid");
  assert.equal(nativeTilapia.speciesLabel, "Native tilapia");
  assert.equal(victoriaCichlid.habitatKind, "lake");
  assert.equal(nativeTilapia.habitatKind, "lake");
});

test("the Great Lakes support their native freshwater fish roster", () => {
  const state = createGameState({ cargoCapacity: 20 });
  const minute = 140 * MINUTE;
  const speciesIds = ["lake-trout", "lake-whitefish", "walleye", "yellow-perch", "lake-sturgeon"];

  for (const speciesId of speciesIds) {
    const fishery = findFishery(state, "lake", 45, -84, minute, speciesId);
    assert.equal(fishery.speciesId, speciesId);
    assert.equal(fishery.habitatKind, "lake");
  }
});

test("marine fish do not populate freshwater lakes", () => {
  const state = createGameState({ cargoCapacity: 20 });
  const minute = 140 * MINUTE;
  const allowed = new Set(["victoria-cichlid", "native-tilapia"]);

  for (let tileId = 1; tileId <= 200; tileId++) {
    const fishery = fisheryForHabitat(state, { tileId, kind: "lake", lat: -1, lon: 33 }, minute);
    if (fishery) assert.equal(allowed.has(fishery.speciesId), true);
  }
});

test("larger fishery populations draw visibly larger schools", () => {
  assert.equal(visibleFishCountForDensity(0.12), 2);
  assert.equal(visibleFishCountForDensity(0.5), 5);
  assert.equal(visibleFishCountForDensity(1), 8);
  assert.equal(visibleFishCountForDensity(4), 8);
});

test("repeated fish catches continue reducing persistent local stock", () => {
  const state = createGameState({ cargoCapacity: 20 });
  const minute = 140 * MINUTE;
  const fishery = findFishery(state, "coastal", 42, -9, minute);
  const before = state.memory.fish.fisheries[fishery.stockKey].population;

  const caught = harvestFishery(state, fishery, 4, minute);
  const after = state.memory.fish.fisheries[fishery.stockKey].population;
  const secondCatch = harvestFishery(state, fishery, 4, minute + 1);

  assert.ok(caught.quantity > 0);
  assert.ok(caught.quantity <= 4);
  assert.equal(caught.reason, "caught");
  assert.equal(caught.fisheryId, fishery.id);
  assert.ok(after < before);
  assert.ok(secondCatch.quantity > 0);
  assert.equal(secondCatch.reason, "caught");
  assert.ok(state.memory.fish.fisheries[fishery.stockKey].population < after);
});

test("overfished stocks disappear from the visible fishery layer", () => {
  const state = createGameState({ cargoCapacity: 20 });
  const minute = 180 * MINUTE;
  const habitat = findHabitatWithFishery(state, "coastal", 38, 12, minute);
  const fishery = fisheryForHabitat(state, habitat, minute);
  const stock = state.memory.fish.fisheries[fishery.stockKey];
  const catchablePopulation = Math.ceil(stock.capacity * 0.3);
  stock.population = catchablePopulation;

  const caught = harvestFishery(
    state,
    fishery,
    catchablePopulation,
    minute + 1
  );
  const visible = fisheryForHabitat(
    state,
    habitat,
    minute + 2
  );

  assert.equal(caught.quantity, catchablePopulation);
  assert.equal(caught.overfished, true);
  assert.equal(caught.depleted, true);
  assert.equal(visible, null);
});

test("fractional depleted stocks cannot draw or produce phantom catches", () => {
  const state = createGameState({ cargoCapacity: 20 });
  const minute = 180 * MINUTE;
  const habitat = findHabitatWithFishery(state, "coastal", 38, 12, minute);
  const fishery = fisheryForHabitat(state, habitat, minute);
  const stock = state.memory.fish.fisheries[fishery.stockKey];
  stock.population = FISH_MIN_CATCHABLE_POPULATION - 0.01;

  const caught = harvestFishery(state, fishery, 1, minute);

  assert.equal(caught.quantity, 0);
  assert.equal(caught.reason, "depleted");
  assert.equal(caught.depleted, true);
  assert.equal(fisheryForHabitat(state, habitat, minute), null);
});

test("stale fishery references cannot harvest stocks below the visible threshold", () => {
  const state = createGameState({ cargoCapacity: 20 });
  const minute = 180 * MINUTE;
  const habitat = findHabitatWithFishery(state, "coastal", 38, 12, minute);
  const fishery = fisheryForHabitat(state, habitat, minute);
  const stock = state.memory.fish.fisheries[fishery.stockKey];
  stock.population = Math.max(1, Math.floor(stock.capacity * 0.05));

  assert.equal(fisheryForHabitat(state, habitat, minute), null);

  const caught = harvestFishery(state, fishery, 1, minute);
  assert.equal(caught.quantity, 0);
  assert.equal(caught.reason, "depleted");
});

test("visible schools never depict more whole fish than remain", () => {
  const state = createGameState({ cargoCapacity: 20 });
  const minute = 180 * MINUTE;
  const habitat = findHabitatWithFishery(state, "coastal", 38, 12, minute);
  const fishery = fisheryForHabitat(state, habitat, minute);
  const stock = state.memory.fish.fisheries[fishery.stockKey];
  stock.capacity = 4;
  stock.population = 1.5;

  const sparseFishery = fisheryForHabitat(state, habitat, minute);

  assert.equal(sparseFishery.population, 1);
  assert.equal(sparseFishery.visibleIndividualCount, 1);
});

function findFishery(state, kind, lat, lon, simMinute, speciesId = null) {
  const habitat = findHabitatWithFishery(state, kind, lat, lon, simMinute, speciesId);
  return fisheryForHabitat(state, habitat, simMinute);
}

function findHabitatWithFishery(state, kind, lat, lon, simMinute, speciesId = null) {
  for (let tileId = 1; tileId < 8000; tileId++) {
    const habitat = { tileId, kind, lat, lon };
    const fishery = fisheryForHabitat(state, habitat, simMinute);
    if (fishery && (!speciesId || fishery.speciesId === speciesId)) return habitat;
  }
  throw new Error(`Could not find ${speciesId || "any"} ${kind} fishery for test`);
}

function assertNoSpecies(state, kind, lat, lon, simMinute, speciesId) {
  for (let tileId = 1; tileId < 8000; tileId++) {
    const fishery = fisheryForHabitat(state, { tileId, kind, lat, lon }, simMinute);
    assert.notEqual(fishery?.speciesId, speciesId);
  }
}
