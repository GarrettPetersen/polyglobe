import assert from "node:assert/strict";
import test from "node:test";

import { createGameState } from "./gameState.js";
import {
  FISH_MIN_CATCHABLE_POPULATION,
  fisheryForHabitat,
  harvestFishery,
  visibleFishCountForDensity
} from "./fishEcology.js";
import { RIVER_BASIN_ID } from "./riverBasins.js";

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
  assertNoSpecies(
    state,
    "river",
    48,
    20,
    280 * MINUTE,
    "salmon",
    { riverBasinId: RIVER_BASIN_ID.DANUBE_BLACK_SEA_NETWORK }
  );
});

test("northern pike do not leak into Pacific coastal watersheds", () => {
  const state = createGameState({ cargoCapacity: 20 });

  assertNoSpecies(state, "river", 48, -123, 140 * MINUTE, "northern-pike");
});

test("salmon runs remain available in native named watersheds", () => {
  const state = createGameState({ cargoCapacity: 20 });
  const fishery = findFishery(
    state,
    "river",
    50,
    130,
    280 * MINUTE,
    "salmon",
    { riverBasinId: RIVER_BASIN_ID.AMUR }
  );

  assert.equal(fishery.speciesId, "salmon");
});

test("resident freshwater fish give rivers distinct regional fisheries", () => {
  const minute = 140 * MINUTE;
  const regions = [
    ["northern-pike", 50, -95],
    ["wels-catfish", 48, 20, RIVER_BASIN_ID.DANUBE_BLACK_SEA_NETWORK],
    ["channel-catfish", 36, -90],
    ["african-catfish", 8, 30],
    ["tigerfish", -12, 25],
    ["mahseer", 25, 82, RIVER_BASIN_ID.GANGES_BRAHMAPUTRA],
    ["mekong-giant-catfish", 16, 103, RIVER_BASIN_ID.MEKONG],
    ["grass-carp", 30, 115, RIVER_BASIN_ID.EAST_CHINA_NETWORK],
    ["arapaima", -4, -62, RIVER_BASIN_ID.AMAZON],
    ["piranha", -8, -58, RIVER_BASIN_ID.AMAZON],
    ["murray-cod", -34, 145, RIVER_BASIN_ID.MURRAY_DARLING]
  ];

  for (const [speciesId, lat, lon, riverBasinId] of regions) {
    const state = createGameState({ cargoCapacity: 20 });
    const fishery = findFishery(state, "river", lat, lon, minute, speciesId, { riverBasinId });
    assert.equal(fishery.speciesId, speciesId);
    assert.equal(fishery.habitatKind, "river");
  }
});

test("narrow resident freshwater fish require their native watershed", () => {
  const minute = 140 * MINUTE;
  const cases = [
    ["wels-catfish", 48, 20],
    ["mahseer", 25, 82],
    ["mekong-giant-catfish", 16, 103],
    ["grass-carp", 30, 115],
    ["arapaima", -4, -62],
    ["piranha", -8, -58],
    ["murray-cod", -34, 145]
  ];

  for (const [speciesId, lat, lon] of cases) {
    const state = createGameState({ cargoCapacity: 20 });
    assertNoSpecies(
      state,
      "river",
      lat,
      lon,
      minute,
      speciesId,
      { riverBasinId: RIVER_BASIN_ID.NONE }
    );
  }
});

test("piranhas occupy represented native basins beyond the Amazon", () => {
  const minute = 140 * MINUTE;
  const basins = [
    [8, -63, RIVER_BASIN_ID.ORINOCO],
    [-28, -58, RIVER_BASIN_ID.PARANA]
  ];

  for (const [lat, lon, riverBasinId] of basins) {
    const state = createGameState({ cargoCapacity: 20 });
    const fishery = findFishery(
      state,
      "river",
      lat,
      lon,
      minute,
      "piranha",
      { riverBasinId }
    );
    assert.equal(fishery.speciesId, "piranha");
  }
});

test("mahseer occupy represented South and Southeast Asian watersheds", () => {
  const minute = 140 * MINUTE;
  const basins = [
    [25, 72, RIVER_BASIN_ID.INDUS],
    [25, 82, RIVER_BASIN_ID.GANGES_BRAHMAPUTRA],
    [17, 96, RIVER_BASIN_ID.IRRAWADDY],
    [18, 99, RIVER_BASIN_ID.MEKONG]
  ];

  for (const [lat, lon, riverBasinId] of basins) {
    const state = createGameState({ cargoCapacity: 20 });
    const fishery = findFishery(
      state,
      "river",
      lat,
      lon,
      minute,
      "mahseer",
      { riverBasinId }
    );
    assert.equal(fishery.speciesId, "mahseer");
  }
});

test("Mekong giant catfish cannot leak into nearby Yangtze river tiles", () => {
  const minute = 140 * MINUTE;
  const mekongState = createGameState({ cargoCapacity: 20 });
  const yangtzeState = createGameState({ cargoCapacity: 20 });

  const fishery = findFishery(
    mekongState,
    "river",
    25,
    100,
    minute,
    "mekong-giant-catfish",
    { riverBasinId: RIVER_BASIN_ID.MEKONG }
  );
  assert.equal(fishery.speciesId, "mekong-giant-catfish");
  assertNoSpecies(
    yangtzeState,
    "river",
    25,
    102,
    minute,
    "mekong-giant-catfish",
    { riverBasinId: RIVER_BASIN_ID.EAST_CHINA_NETWORK }
  );
});

test("resident river fish remain available outside a seasonal run", () => {
  const state = createGameState({ cargoCapacity: 20 });
  const springMinute = 80 * MINUTE;
  const habitat = findHabitatWithFishery(
    state,
    "river",
    -4,
    -62,
    springMinute,
    "arapaima",
    { riverBasinId: RIVER_BASIN_ID.AMAZON }
  );
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
  assert.equal(visibleFishCountForDensity(0.12), 1);
  assert.equal(visibleFishCountForDensity(0.5), 3);
  assert.equal(visibleFishCountForDensity(1), 5);
  assert.equal(visibleFishCountForDensity(1, 1.65), 8);
  assert.equal(visibleFishCountForDensity(4, 1.65), 8);
});

test("Newfoundland fisheries dwarf ordinary Old World coastal stocks", () => {
  const minute = 140 * MINUTE;
  const grandBanks = surveyMarineFisheries("open-ocean", 46.5, -49.5, minute);
  const mediterranean = surveyMarineFisheries("coastal", 38, 15, minute);

  assert.ok(grandBanks.visibleRate > mediterranean.visibleRate * 6);
  assert.ok(grandBanks.meanCapacity > mediterranean.meanCapacity * 3.5);
  assert.ok(grandBanks.meanVisibleFish > mediterranean.meanVisibleFish * 2);
});

test("ordinary Asian fisheries retain regional pressure without a blanket European penalty", () => {
  const minute = 140 * MINUTE;
  const mediterranean = surveyMarineFisheries("coastal", 38, 15, minute);
  const eastChina = surveyMarineFisheries("coastal", 25, 115, minute);
  const indianOcean = surveyMarineFisheries("coastal", 15, 75, minute);
  const maritimeSoutheastAsia = surveyMarineFisheries("coastal", 10, 105, minute);
  const remotePacific = surveyMarineFisheries("coastal", 20, 175, minute);

  for (const asianFishery of [eastChina, indianOcean, maritimeSoutheastAsia]) {
    assert.ok(mediterranean.visibleRate < asianFishery.visibleRate);
    assert.ok(asianFishery.visibleRate < remotePacific.visibleRate);
  }
  assert.ok(eastChina.meanVisibleFish < indianOcean.meanVisibleFish);
  assert.ok(indianOcean.meanVisibleFish < maritimeSoutheastAsia.meanVisibleFish);
  assert.ok(maritimeSoutheastAsia.meanVisibleFish < remotePacific.meanVisibleFish);
});

test("historically prominent 1522 fishing grounds retain regional abundance", () => {
  const minute = 140 * MINUTE;
  const grounds = [
    ["grand-banks", "cod", "open-ocean", 46.5, -49.5],
    ["newfoundland-labrador", "cod", "open-ocean", 55, -56],
    ["iceland-faroes", "cod", "open-ocean", 63.5, -15],
    ["lofoten", "cod", "open-ocean", 68, 14],
    ["north-sea", "herring", "open-ocean", 56, 3],
    ["irish-celtic-seas", "herring", "open-ocean", 53, -10],
    ["galician-sardine-grounds", "sardine", "coastal", 42, -9],
    ["scania-baltic", "herring", "open-ocean", 56, 14],
    ["maldives-tuna-grounds", "tuna", "open-ocean", 3.5, 73.2],
    ["seto-inland-sea", "sardine", "coastal", 34.4, 133.3],
    ["tsushima-korea-seas", "herring", "coastal", 34.5, 129.2],
    ["yellow-sea", "herring", "coastal", 36, 124],
    ["coral-triangle", "reef", "coastal", 1, 125]
  ];

  for (const [groundId, speciesId, kind, lat, lon] of grounds) {
    const state = createGameState({ cargoCapacity: 20 });
    const fishery = findFishery(state, kind, lat, lon, minute, speciesId);
    assert.equal(fishery.historicGroundId, groundId);
  }
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

function findFishery(state, kind, lat, lon, simMinute, speciesId = null, habitatOptions = {}) {
  const habitat = findHabitatWithFishery(state, kind, lat, lon, simMinute, speciesId, habitatOptions);
  return fisheryForHabitat(state, habitat, simMinute);
}

function findHabitatWithFishery(state, kind, lat, lon, simMinute, speciesId = null, habitatOptions = {}) {
  for (let tileId = 1; tileId < 8000; tileId++) {
    const habitat = { tileId, kind, lat, lon, ...habitatOptions };
    const fishery = fisheryForHabitat(state, habitat, simMinute);
    if (fishery && (!speciesId || fishery.speciesId === speciesId)) return habitat;
  }
  throw new Error(`Could not find ${speciesId || "any"} ${kind} fishery for test`);
}

function assertNoSpecies(state, kind, lat, lon, simMinute, speciesId, habitatOptions = {}) {
  for (let tileId = 1; tileId < 8000; tileId++) {
    const fishery = fisheryForHabitat(state, { tileId, kind, lat, lon, ...habitatOptions }, simMinute);
    assert.notEqual(fishery?.speciesId, speciesId);
  }
}

function surveyMarineFisheries(kind, lat, lon, simMinute, sampleCount = 2000) {
  const state = createGameState({ cargoCapacity: 20 });
  let visible = 0;
  let totalCapacity = 0;
  let totalVisibleFish = 0;
  for (let tileId = 1; tileId <= sampleCount; tileId++) {
    const fishery = fisheryForHabitat(state, { tileId, kind, lat, lon }, simMinute);
    if (!fishery) continue;
    visible += 1;
    totalCapacity += fishery.capacity;
    totalVisibleFish += fishery.visibleIndividualCount;
  }
  if (visible === 0) throw new Error(`Marine fishery survey found no stocks at ${lat},${lon}`);
  return {
    visibleRate: visible / sampleCount,
    meanCapacity: totalCapacity / visible,
    meanVisibleFish: totalVisibleFish / visible
  };
}
