import assert from "node:assert/strict";
import test from "node:test";

import {
  BEAVER_PELTS_GOOD_ID,
  FORAGED_FOOD_GOOD_ID,
  FRESH_WATER_GOOD_ID,
  WINE_GOOD_ID,
  createWorldEconomy
} from "./economy.js";
import {
  FRESH_WATER_CAPACITY,
  RAIN_WATER_COLLECTION_PER_CONSUMER_DAY,
  SURVIVAL_DEHYDRATION_INTERVAL_MINUTES,
  SURVIVAL_STARVATION_INTERVAL_MINUTES,
  autoProvisionFreshWaterAtPort,
  autoProvisionHardtackAtPort,
  acceptQuest,
  applySurvivalDeprivation,
  awardPlayerShip,
  buyGood,
  cargoCostBasis,
  cargoFree,
  cargoHoldStatus,
  cargoReservationUnits,
  cargoSpaceLabel,
  cargoUsed,
  castawayEmergencyAidNeed,
  createGameState,
  foodRationsForCargoQuantity,
  initializeProvisionalShipLoadout,
  initializeShipProvisions,
  loseCrew,
  migrateGameState,
  playerVesselLossOutcome,
  purchasePlayerShip,
  receiveEmergencyShipAid,
  receiveCastawayShoreAid,
  receiveFishCatch,
  receiveScavengedTradeGood,
  releaseCargoSpace,
  reserveCargoSpace,
  restockCustomShipLoadoutAtPort,
  restockSelectedShipLoadoutAtPort,
  restockShipLoadoutAtPort,
  refillFreshWaterFromShore,
  rollCrewCasualtiesForDamage,
  sellGood,
  setPlayerShipStats,
  shipConsumption,
  shipEmergencyAidNeed,
  shipPeopleAboard,
  shipTravelerManifest,
  stowForagedFood,
  survivalStatus,
  updateSurvival,
  validateGameState
} from "./gameState.js";
import { crewHoldSpace, shipLoadoutPlan } from "./shipLoadouts.js";
import { effectivePlayerShipStats } from "./playerPerks.js";
import { shipStatsForSlug } from "./shipStats.js";
import { colonizationTargetForCity } from "./colonialCities.js";
import {
  COLONIZATION_FETCH_STAGES,
  assignColonizationQuest,
  beginColonizationExpedition,
  completeColonizationFetchStage
} from "./colonizationQuest.js";
import {
  acceptPirateCaptiveQuest,
  createPirateCaptiveQuest
} from "./pirateCaptiveQuest.js";
import {
  acceptCastawayQuest,
  createCastawayQuest,
  markCastawayEmergencyAidReceived
} from "./castawayQuest.js";
import {
  acceptAnimalCompanion,
  beginAnimalCompanionRecruitment
} from "./animalCompanions.js";
import {
  NAMED_CREW_ROLE_HISTORIAN,
  addNamedCrewMember,
  namedCrewMembers
} from "./namedCrew.js";

const LONDON = port(1, "London", "United Kingdom", "northern-european", 80000, "england");

test("cargo space labels always round to whole hold units", () => {
  assert.equal(cargoSpaceLabel(12), "12");
  assert.equal(cargoSpaceLabel(12.333333333333334), "12");
  assert.equal(cargoSpaceLabel(12.666666666666666), "13");
});

test("food cargo quantities present as whole rations", () => {
  assert.equal(foodRationsForCargoQuantity(1 / 12), 1);
  assert.equal(foodRationsForCargoQuantity(5 / 12), 5);
  assert.throws(() => foodRationsForCargoQuantity(0.1), /not ration-aligned/);
});

test("saved game state rejects unsupported schema versions", () => {
  const state = createGameState({ cargoCapacity: 10 });
  assert.equal(validateGameState(state), state);
  state.version += 1;
  assert.throws(() => validateGameState(state), /Unsupported game state version/);
  assert.throws(() => migrateGameState({ version: 7 }), /Unsupported game state version/);
});

test("version 27 saves gain persistent birthday event memory", () => {
  const state = createGameState({ cargoCapacity: 10 });
  state.version = 27;
  delete state.memory.birthdays;

  const migrated = migrateGameState(state);

  assert.equal(migrated.memory.birthdays.version, 1);
  assert.equal(migrated.memory.birthdays.lastObservedDateKey, null);
  assert.deepEqual(migrated.memory.birthdays.pendingEvents, []);
  assert.deepEqual(migrated.memory.birthdays.celebratedEventIds, []);
  assert.equal(validateGameState(migrated), migrated);
});

test("version 28 saves gain persistent special equipment offers", () => {
  const state = createGameState({ cargoCapacity: 10 });
  state.version = 28;
  delete state.memory.specialEquipmentOffers;

  const migrated = migrateGameState(state);

  assert.equal(migrated.memory.specialEquipmentOffers.version, 1);
  assert.deepEqual(migrated.memory.specialEquipmentOffers.byPort, {});
  assert.equal(validateGameState(migrated), migrated);
});

test("version 30 saves gain persistent castaway rescue memory", () => {
  const state = createGameState({ cargoCapacity: 10 });
  state.version = 30;
  delete state.memory.quests.castaway;
  const migrated = migrateGameState(state);

  assert.deepEqual(migrated.memory.quests.castaway, {
    version: 1,
    active: null,
    completedCount: 0,
    declinedCount: 0
  });
  assert.equal(validateGameState(migrated), migrated);
});

test("version 32 port visits gain explicit drunken-arrival memory", () => {
  const state = createGameState({ cargoCapacity: 10 });
  state.version = 32;
  state.memory.visitedPorts.Porto = { visits: 3 };

  const migrated = migrateGameState(state);

  assert.deepEqual(migrated.memory.visitedPorts.Porto, {
    visits: 3,
    drunkArrivals: 0,
    lastDrunkVisit: null,
    lastDrunkArrivalMinute: null
  });
  assert.equal(validateGameState(migrated), migrated);
});

test("version 35 saves gain persistent panda companion memory", () => {
  const state = createGameState({ cargoCapacity: 10 });
  state.version = 35;
  delete state.memory.animalCompanions;

  const migrated = migrateGameState(state);

  assert.equal(migrated.memory.animalCompanions.byId.panda.status, "unmet");
  assert.equal(migrated.memory.animalCompanions.byId.penguin.status, "unmet");
  assert.equal(migrated.memory.animalCompanions.byId.raccoon.status, "unmet");
  assert.equal(validateGameState(migrated), migrated);
});

test("version 36 saves preserve an aboard panda and gain the naturalist offer", () => {
  const state = createGameState({ cargoCapacity: 10 });
  state.version = 36;
  delete state.memory.animalCompanions;
  state.memory.panda = {
    version: 1,
    status: "aboard",
    joinedMinute: 123,
    npcReactionKeys: []
  };

  const migrated = migrateGameState(state);

  assert.deepEqual(migrated.memory.animalCompanions.byId.panda, {
    status: "aboard",
    joinedMinute: 123,
    naturalistOffer: "unresolved",
    npcReactionKeys: [],
    restrictedFoodRationDebt: 0
  });
  assert.equal(migrated.memory.panda, undefined);
  assert.equal(migrated.memory.animalCompanions.byId.penguin.status, "unmet");
  assert.equal(migrated.memory.animalCompanions.byId.raccoon.status, "unmet");
  assert.equal(validateGameState(migrated), migrated);
});

test("version 49 saves gain an unmet raccoon without changing existing companions", () => {
  const state = createGameState({ cargoCapacity: 10 });
  state.version = 49;
  state.memory.animalCompanions.byId.panda.status = "declined";
  delete state.memory.animalCompanions.byId.raccoon;

  const migrated = migrateGameState(state);

  assert.equal(migrated.memory.animalCompanions.byId.panda.status, "declined");
  assert.equal(migrated.memory.animalCompanions.byId.penguin.status, "unmet");
  assert.equal(migrated.memory.animalCompanions.byId.raccoon.status, "unmet");
  assert.equal(validateGameState(migrated), migrated);
});

test("a saved Xebec repairs a stale Lateen Barque crew target", () => {
  const lateenBarque = shipStatsForSlug("ketch");
  const xebec = shipStatsForSlug("xebec");
  const legacy = createGameState({ cargoCapacity: xebec.cargoCapacity, shipStats: xebec });
  initializeProvisionalShipLoadout(legacy, xebec);
  restockShipLoadoutAtPort(legacy, LONDON, xebec, "short-haul", { simMinute: 120 });
  legacy.version = 33;
  delete legacy.ship.slug;
  legacy.ship.loadoutTargets = shipLoadoutPlan(lateenBarque, "short-haul");
  legacy.ship.crew = 4;
  legacy.doubloons = 56000;

  const restored = migrateGameState(legacy, xebec);
  assert.equal(restored.ship.slug, "xebec");
  assert.equal(restored.ship.loadoutTargets.crew, 12);

  const result = restockSelectedShipLoadoutAtPort(restored, LONDON, { simMinute: 240 });
  assert.equal(result.additions.crew, 8);
  assert.equal(restored.ship.crew, 12);
  assert.equal(restored.doubloons, 55984);
});

test("current saves shed guns removed by a historical ship refit", () => {
  const royalLancaran = shipStatsForSlug("royal-lancaran");
  const saved = createGameState({
    cargoCapacity: royalLancaran.cargoCapacity,
    shipStats: royalLancaran
  });
  initializeProvisionalShipLoadout(saved, royalLancaran);
  saved.ship.cannonCapacity = 24;
  saved.ship.cannons = 24;

  const restored = migrateGameState(saved, royalLancaran);

  assert.equal(restored.ship.cannonCapacity, 10);
  assert.equal(restored.ship.cannons, 10);
  assert.equal(restored.ship.crewCapacity, 43);
  assert.equal(restored.ship.loadoutTargets.cannons <= 10, true);
  assert.equal(validateGameState(restored), restored);
});

test("version 27 ship saves migrate before named crew memory exists", () => {
  const stats = shipStatsForSlug("brigantine");
  const state = createGameState({
    cargoCapacity: stats.cargoCapacity,
    shipStats: stats,
    playerCharacter: {
      id: "migration-captain",
      name: "Migration Captain",
      nationalityId: "england",
      expressions: [{ id: "neutral" }],
      skillIds: ["organized"]
    }
  });
  state.version = 27;
  delete state.namedCrew;

  const migrated = migrateGameState(state, stats);

  assert.deepEqual(migrated.namedCrew, []);
  assert.equal(validateGameState(migrated), migrated);
});

test("version 17 food debt migrates from cargo lots to person-day rations", () => {
  const state = createGameState({ cargoCapacity: 10 });
  state.version = 17;
  state.survival.foodDebt = 0.5;
  delete state.survival.foodRationDebt;

  const migrated = migrateGameState(state);

  assert.equal(migrated.survival.foodRationDebt, 6);
  assert.equal(Object.prototype.hasOwnProperty.call(migrated.survival, "foodDebt"), false);
});

test("passengers reserve hold space across every cargo and ship-capacity check", () => {
  const stats = shipStatsForSlug("brigantine");
  const state = createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });
  initializeProvisionalShipLoadout(state, stats);
  const before = cargoFree(state);

  reserveCargoSpace(state, "test-passengers", 12);
  assert.equal(cargoReservationUnits(state, "test-passengers"), 12);
  assert.equal(cargoFree(state), before - 12);
  assert.throws(() => reserveCargoSpace(state, "test-passengers", 1), /already exists/);

  assert.equal(releaseCargoSpace(state, "test-passengers"), 12);
  assert.equal(cargoFree(state), before);
  assert.throws(() => releaseCargoSpace(state, "test-passengers"), /does not exist/);
});

test("survival consumes edible cargo by base replacement value", () => {
  const state = createGameState({ cargoCapacity: 10 });
  state.cargo.fish = 1;
  state.cargo.grain = 2;
  state.cargo.wine = 1;
  state.accounts.cargoCostBasis.fish = 0;
  state.accounts.cargoCostBasis.grain = 16;
  state.accounts.cargoCostBasis.wine = 30;

  const result = updateSurvival(state, 0, 24 * 60, { freshwater: false });

  assert.equal(result.dehydrated, false);
  assert.equal(result.starved, false);
  assert.equal(result.foodConsumed[0].goodId, "grain");
  assert.equal(state.cargo.fish, 1);
  assert.equal(state.cargo.grain, 23 / 12);
  assert.equal(state.cargo.wine, 1);
  assert.ok(state.survival.freshWater < FRESH_WATER_CAPACITY);
});

test("the crew eats low-base-price hardtack before zero-cost caught fish", () => {
  const state = createGameState({ cargoCapacity: 10 });
  state.cargo.hardtack = 1;
  state.cargo.fish = 1;
  state.accounts.cargoCostBasis.hardtack = 2;
  state.accounts.cargoCostBasis.fish = 0;

  const result = updateSurvival(state, 0, 24 * 60, { freshwater: false });

  assert.equal(result.foodConsumed[0].goodId, "hardtack");
  assert.equal(state.cargo.hardtack, 11 / 12);
  assert.equal(state.cargo.fish, 1);
});

test("active rowing modestly increases food consumption", () => {
  const stats = shipStatsForSlug("mesoamerican-dugout-canoe");
  const baseline = createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });
  const rowing = createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });
  for (const state of [baseline, rowing]) {
    initializeProvisionalShipLoadout(state, stats);
    state.ship.crew = 1;
    state.cargo = { hardtack: 5 };
    state.accounts.cargoCostBasis = { hardtack: 10 };
  }

  updateSurvival(baseline, 0, 4 * 24 * 60, {
    freshwater: true,
    foodActivityMultiplier: 1
  });
  updateSurvival(rowing, 0, 4 * 24 * 60, {
    freshwater: true,
    foodActivityMultiplier: 1.15
  });

  assert.equal(baseline.cargo.hardtack, 5 - 4 / 12);
  assert.equal(rowing.cargo.hardtack, 5 - 4 / 12);
  assert.equal(baseline.survival.foodRationDebt, 0);
  assert.ok(Math.abs(rowing.survival.foodRationDebt - 0.6) < 1e-9);
  assert.throws(
    () => updateSurvival(rowing, 4 * 24 * 60, 4 * 24 * 60 + 1, {
      foodActivityMultiplier: 0.9
    }),
    /Invalid food activity multiplier/
  );
});

test("the crew finishes an opened fish stack before eating unopened provisions", () => {
  const state = createGameState({ cargoCapacity: 10 });
  state.cargo.hardtack = 1;
  state.cargo.fish = 5 / 12;
  state.accounts.cargoCostBasis.hardtack = 2;
  state.accounts.cargoCostBasis.fish = 0;

  const result = updateSurvival(state, 0, 24 * 60, { freshwater: false });

  assert.equal(result.foodConsumed[0].goodId, "fish");
  assert.equal(state.cargo.fish, 4 / 12);
  assert.equal(state.cargo.hardtack, 1);
});

test("a ship drinks wine only after water runs out and tracks full wine-only days", () => {
  const stats = shipStatsForSlug("mesoamerican-dugout-canoe");
  const state = createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });
  initializeProvisionalShipLoadout(state, stats);
  state.ship.crew = 1;
  state.survival.freshWater = 0;
  state.cargo = { hardtack: 1, [WINE_GOOD_ID]: 1 };
  state.accounts.cargoCostBasis = { hardtack: 2, [WINE_GOOD_ID]: 18 };

  const initial = survivalStatus(state);
  assert.equal(initial.freshWaterDays, 0);
  assert.equal(initial.wineDays, 8);
  assert.equal(initial.drinkDays, 8);

  const firstHalfDay = updateSurvival(state, 0, 12 * 60, { freshwater: false });
  assert.equal(firstHalfDay.dehydrated, false);
  assert.equal(firstHalfDay.wineDrinkingStarted, true);
  assert.equal(firstHalfDay.wineOnlyDaysElapsed, 0);
  assert.equal(firstHalfDay.wineConsumed, 0.0625);
  assert.equal(state.survival.wineOnlyMinutes, 12 * 60);
  assert.equal(state.survival.wineEmergencyActive, true);
  assert.equal(state.cargo[WINE_GOOD_ID], 0.9375);

  const secondHalfDay = updateSurvival(state, 12 * 60, 24 * 60, { freshwater: false });
  assert.equal(secondHalfDay.wineDrinkingStarted, false);
  assert.equal(secondHalfDay.wineOnlyDaysElapsed, 1);
  assert.equal(state.survival.wineOnlyMinutes, 24 * 60);
  assert.equal(cargoCostBasis(state, WINE_GOOD_ID).total, 15.75);

  state.survival.freshWater = 1;
  updateSurvival(state, 24 * 60, 25 * 60, { freshwater: false });
  assert.equal(state.survival.wineOnlyMinutes, 0);
  assert.equal(state.survival.wineEmergencyActive, false);
});

test("brief rain does not repeat the dry-casks emergency", () => {
  const stats = shipStatsForSlug("mesoamerican-dugout-canoe");
  const state = createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });
  initializeProvisionalShipLoadout(state, stats);
  state.ship.crew = 1;
  state.survival.freshWater = 0;
  state.cargo = { hardtack: 1, [WINE_GOOD_ID]: 1 };
  state.accounts.cargoCostBasis = { hardtack: 2, [WINE_GOOD_ID]: 18 };

  const first = updateSurvival(state, 0, 60, { freshwater: false, rainfall: 0 });
  const rainy = updateSurvival(state, 60, 120, { freshwater: false, rainfall: 1 });
  const afterRain = updateSurvival(state, 120, 180, { freshwater: false, rainfall: 0 });

  assert.equal(first.wineDrinkingStarted, true);
  assert.equal(rainy.wineDrinkingStarted, false);
  assert.equal(afterRain.wineDrinkingStarted, false);
  assert.equal(state.survival.wineEmergencyActive, true);
});

test("old dry-cask saves resume inside their existing wine emergency", () => {
  const stats = shipStatsForSlug("mesoamerican-dugout-canoe");
  const state = createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });
  initializeProvisionalShipLoadout(state, stats);
  state.ship.crew = 1;
  state.survival.freshWater = 0;
  state.survival.wineOnlyMinutes = 0;
  state.cargo = { hardtack: 1, [WINE_GOOD_ID]: 1 };
  state.accounts.cargoCostBasis = { hardtack: 2, [WINE_GOOD_ID]: 18 };
  delete state.survival.wineEmergencyActive;

  validateGameState(state);
  const resumed = updateSurvival(state, 0, 60, { freshwater: false, rainfall: 0 });

  assert.equal(state.survival.wineEmergencyActive, true);
  assert.equal(resumed.wineDrinkingStarted, false);
});

test("freshwater refills casks while food still ticks down", () => {
  const state = createGameState({ cargoCapacity: 10 });
  state.survival.freshWater = 12;
  state.cargo.grain = 2;
  state.accounts.cargoCostBasis.grain = 16;

  const result = updateSurvival(state, 0, 24 * 60, { freshwater: true });

  assert.equal(result.freshWaterRefilled, true);
  assert.equal(state.survival.freshWater, FRESH_WATER_CAPACITY);
  assert.equal(state.cargo.grain, 23 / 12);
  assert.equal(cargoCostBasis(state, "grain").total, 15.3333);
});

test("small-boat food falls one day at a time and frees ration-sized hold space", () => {
  const stats = shipStatsForSlug("mesoamerican-dugout-canoe");
  const state = createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });
  initializeProvisionalShipLoadout(state, stats);
  state.cargo = { hardtack: 1 };
  state.accounts.cargoCostBasis = { hardtack: 2 };
  state.ship.crew = 1;
  const usedBefore = cargoUsed(state);

  assert.equal(survivalStatus(state).foodDays, 12);
  updateSurvival(state, 0, 24 * 60, { freshwater: false });

  assert.equal(survivalStatus(state).foodDays, 11);
  assert.equal(survivalStatus(state).foodRations, 11);
  assert.equal(state.cargo.hardtack, 11 / 12);
  assert.ok(Math.abs((usedBefore - cargoUsed(state)) - 1 / 12) < 1e-8);
});

test("rainwater silently offsets water consumption", () => {
  const dry = createGameState({ cargoCapacity: 10 });
  const rainy = createGameState({ cargoCapacity: 10 });
  dry.survival.freshWater = 20;
  rainy.survival.freshWater = 20;

  const dryResult = updateSurvival(dry, 0, 24 * 60, { rainfall: 0 });
  const rainyResult = updateSurvival(rainy, 0, 24 * 60, { rainfall: 1 });

  assert.equal(rainyResult.freshWaterRefilled, false);
  assert.equal(rainyResult.rainWaterCollected, RAIN_WATER_COLLECTION_PER_CONSUMER_DAY);
  assert.equal(dryResult.rainWaterCollected, 0);
  assert.ok(rainy.survival.freshWater > dry.survival.freshWater);
  assert.ok(rainyResult.waterConsumed < dryResult.waterConsumed);
  assert.throws(
    () => updateSurvival(rainy, 24 * 60, 25 * 60, { rainfall: 1.01 }),
    /Invalid rainfall strength/
  );
});

test("heavy rain can raise a minimally crewed boat's water supply", () => {
  const stats = shipStatsForSlug("mesoamerican-dugout-canoe");
  const state = createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });
  initializeProvisionalShipLoadout(state, stats);
  state.ship.crew = 1;
  state.survival.freshWater -= 1;
  const waterBefore = state.survival.freshWater;

  const result = updateSurvival(state, 0, 24 * 60, { rainfall: 1 });

  assert.ok(state.survival.freshWater > waterBefore);
  assert.equal(
    result.rainWaterCollected,
    RAIN_WATER_COLLECTION_PER_CONSUMER_DAY * shipConsumption(state).waterConsumers
  );
  assert.equal(result.changed, true);
});

test("rain cannot refill casks through cargo caught in their former hold space", () => {
  const stats = shipStatsForSlug("brigantine");
  const state = createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });
  initializeProvisionalShipLoadout(state, stats);
  state.cargo.gold = state.cargoCapacity - cargoUsed(state) - 1;
  state.accounts.cargoCostBasis.gold = 0;
  state.survival.freshWater -= 1;
  receiveFishCatch(state, {
    stockKey: "10:cod",
    speciesLabel: "Cod",
    quantity: 2
  });
  const waterBefore = state.survival.freshWater;

  assert.equal(cargoUsed(state), state.cargoCapacity);
  const result = updateSurvival(state, 0, 2 * 60, { rainfall: 1 });

  assert.equal(state.survival.freshWater, waterBefore);
  assert.equal(result.rainWaterCollected, 0.125);
  assert.ok(cargoUsed(state) < state.cargoCapacity);
  assert.doesNotThrow(() => validateGameState(state));
});

test("the ship traveler manifest distinguishes passengers, envoys, and settlers", () => {
  const stats = shipStatsForSlug("fishing-lugger");
  const state = createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });
  initializeProvisionalShipLoadout(state, stats);
  const crewAndCaptain = state.ship.crew;

  state.memory.quests.passengerActive = { kind: "passenger" };
  assert.deepEqual(shipTravelerManifest(state), [{ kind: "passenger", count: 1 }]);
  assert.equal(shipPeopleAboard(state), crewAndCaptain + 1);

  state.memory.quests.passengerActive = null;
  state.memory.quests.active = { kind: "friendly-envoy" };
  assert.deepEqual(shipTravelerManifest(state), [{ kind: "envoy", count: 1 }]);

  state.memory.quests.active = null;
  assignColonizationQuest(state.memory.colonization, {
    target: {
      ...colonizationTargetForCity({ city: "Port Royal", country: "Canada" }),
      tileId: 1
    },
    origin: {
      tileId: 2,
      city: "Bordeaux",
      country: "France",
      factionId: "france",
      lat: 44.84,
      lon: -0.58
    }
  });
  for (const stage of COLONIZATION_FETCH_STAGES) {
    completeColonizationFetchStage(state.memory.colonization, stage.id);
  }
  beginColonizationExpedition(state.memory.colonization);
  assert.deepEqual(shipTravelerManifest(state), [{ kind: "settler", count: 12 }]);
  assert.equal(shipPeopleAboard(state), crewAndCaptain + 12);
  assert.equal(shipConsumption(state).passengers, 12);
});

test("an accepted pirate captive is an additional named passenger and provision consumer", () => {
  const stats = shipStatsForSlug("fishing-lugger");
  const state = createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });
  initializeProvisionalShipLoadout(state, stats);
  const crewAndCaptain = state.ship.crew;
  const quest = createPirateCaptiveQuest(state.memory.quests.pirateCaptive, {
    pirateShipId: "pirate-23",
    homePort: LONDON,
    character: pirateCaptiveTestCharacter(),
    familyMember: null,
    distanceKm: 1200,
    familySurvivedRoll: 0.75
  });
  acceptPirateCaptiveQuest(state.memory.quests.pirateCaptive, quest.id);

  assert.deepEqual(shipTravelerManifest(state), [{ kind: "passenger", count: 1 }]);
  assert.equal(shipPeopleAboard(state), crewAndCaptain + 1);
  assert.equal(shipConsumption(state).passengers, 1);
  validateGameState(state);
});

test("an accepted castaway consumes provisions and can reveal emergency shore supplies", () => {
  const stats = shipStatsForSlug("fishing-lugger");
  const state = createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });
  initializeProvisionalShipLoadout(state, stats);
  state.survival.freshWater = 0;
  for (const goodId of Object.keys(state.cargo)) delete state.cargo[goodId];
  const aid = castawayEmergencyAidNeed(state);
  assert.deepEqual(aid, { water: true, food: true });

  const quest = createCastawayQuest(state.memory.quests.castaway, {
    shoreId: "shore-91",
    homePort: LONDON,
    character: pirateCaptiveTestCharacter(),
    familyMember: null,
    distanceKm: 1500,
    familySurvivedRoll: 0.75,
    emergencyAid: aid
  });
  acceptCastawayQuest(state.memory.quests.castaway, quest.id);
  const received = receiveCastawayShoreAid(state, quest.emergencyAid);
  markCastawayEmergencyAidReceived(state.memory.quests.castaway, quest.id);

  assert.ok(received.water > 0);
  assert.ok(received.food > 0);
  assert.deepEqual(shipTravelerManifest(state), [{ kind: "passenger", count: 1 }]);
  assert.ok(survivalStatus(state).freshWaterDays > 0);
  assert.ok(survivalStatus(state).foodDays >= 3);
  validateGameState(state);
});

test("waiting safely in port advances time without consuming provisions", () => {
  const state = createGameState({ cargoCapacity: 10 });
  state.survival.freshWater = 12;
  state.survival.foodRationDebt = 0.5;
  state.cargo.grain = 2;
  state.accounts.cargoCostBasis.grain = 16;

  const result = updateSurvival(state, 0, 30 * 24 * 60, { safePort: true });

  assert.equal(result.changed, false);
  assert.equal(result.dehydrated, false);
  assert.equal(result.starved, false);
  assert.equal(state.survival.freshWater, 12);
  assert.equal(state.survival.foodRationDebt, 0.5);
  assert.equal(state.cargo.grain, 2);
  assert.equal(state.survival.lastMinute, 30 * 24 * 60);
});

test("reserve water cargo extends a voyage after casks run dry", () => {
  const state = createGameState({ cargoCapacity: 10 });
  state.survival.freshWater = 1;
  state.cargo[FRESH_WATER_GOOD_ID] = 2;
  state.accounts.cargoCostBasis[FRESH_WATER_GOOD_ID] = 2;

  const result = updateSurvival(state, 0, 2 * 24 * 60, { freshwater: false });

  assert.equal(result.dehydrated, false);
  assert.equal(result.waterCargoConsumed, 2);
  assert.equal(state.cargo[FRESH_WATER_GOOD_ID], undefined);
  assert.ok(state.survival.freshWater > 0);
  assert.equal(survivalStatus(state).freshWaterReserveUnits, 0);
});

test("exhausted food and water report deprivation instead of ending immediately", () => {
  const state = createGameState({ cargoCapacity: 10 });
  state.survival.freshWater = 0;

  const result = updateSurvival(state, 0, 24 * 60, { freshwater: false });

  assert.equal(result.dehydrated, true);
  assert.equal(result.starved, true);
  assert.equal(state.survival.freshWater, 0);
  assert.equal(survivalStatus(state).foodRations, 0);
  assert.equal(state.survival.foodRationDebt, 0);
});

test("missed meals never consume scavenged food or fish acquired after starvation", () => {
  const state = createGameState({ cargoCapacity: 10 });
  state.survival.foodRationDebt = 24.5;

  assert.equal(stowForagedFood(state, 2), 2);
  const rescued = survivalStatus(state);
  assert.equal(rescued.storedFoodRations, 2);
  assert.equal(rescued.foodRationDebt, 0.5);
  assert.equal(rescued.foodRations, 1.5);

  const result = updateSurvival(state, 0, 0, { freshwater: false });
  assert.equal(result.starved, false);
  assert.equal(result.changed, true);
  assert.equal(state.survival.foodRationDebt, 0.5);
  assert.equal(state.cargo[FORAGED_FOOD_GOOD_ID], 2 / 12);

  const fishingState = createGameState({ cargoCapacity: 10 });
  fishingState.survival.foodRationDebt = 24.5;
  receiveFishCatch(fishingState, {
    quantity: 1,
    speciesLabel: "Cod",
    stockKey: "test-cod"
  });
  assert.equal(survivalStatus(fishingState).foodRations, 11.5);
  updateSurvival(fishingState, 0, 0, { freshwater: false });
  assert.equal(fishingState.cargo.fish, 1);
});

test("a friendly ship can give one emergency ration of food and water", () => {
  const stats = shipStatsForSlug("brigantine");
  const state = createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });
  initializeProvisionalShipLoadout(state, stats);
  state.survival.freshWater = 0;
  delete state.cargo.hardtack;
  delete state.accounts.cargoCostBasis.hardtack;

  assert.equal(shipEmergencyAidNeed(state, "friendly-ship").available, true);
  assert.deepEqual(receiveEmergencyShipAid(state, "friendly-ship"), { food: 3, water: 3 });
  assert.equal(state.cargo.hardtack, 3 / 12);
  assert.equal(state.survival.freshWater, 3);
  assert.equal(state.accounts.cargoCostBasis.hardtack, 0);
  assert.equal(shipEmergencyAidNeed(state, "friendly-ship").alreadyReceived, true);
  assert.throws(() => receiveEmergencyShipAid(state, "friendly-ship"), /already received/);
  assert.ok(cargoUsed(state) <= state.cargoCapacity);
});

test("an allied ship offers targeted aid before provisions are completely depleted", () => {
  const stats = shipStatsForSlug("brigantine");
  const state = createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });
  initializeProvisionalShipLoadout(state, stats);
  state.survival.freshWater = 1;
  state.cargo.hardtack = 12 / 12;

  assert.equal(shipEmergencyAidNeed(state, "neutral-ship").available, false);
  const alliedNeed = shipEmergencyAidNeed(state, "allied-ship", { allied: true });
  assert.equal(alliedNeed.needsFood, true);
  assert.equal(alliedNeed.needsWater, true);
  assert.equal(alliedNeed.available, true);
  assert.deepEqual(
    receiveEmergencyShipAid(state, "allied-ship", { allied: true }),
    { food: 3, water: 3 }
  );
});

test("allied emergency aid only transfers the provision that is critically low", () => {
  const stats = shipStatsForSlug("brigantine");
  const state = createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });
  initializeProvisionalShipLoadout(state, stats);
  state.survival.freshWater = 1;

  const need = shipEmergencyAidNeed(state, "water-relief", { allied: true });
  assert.equal(need.needsFood, false);
  assert.equal(need.needsWater, true);
  assert.deepEqual(
    receiveEmergencyShipAid(state, "water-relief", { allied: true }),
    { food: 0, water: 3 }
  );
});

test("emergency ship aid respects the remaining hold capacity", () => {
  const stats = shipStatsForSlug("brigantine");
  const state = createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });
  initializeProvisionalShipLoadout(state, stats);
  state.survival.freshWater = 0;
  delete state.cargo.hardtack;
  delete state.accounts.cargoCostBasis.hardtack;
  state.cargo.gold = state.cargoCapacity - crewHoldSpace(state.ship.crew) - state.ship.cannons - 2;
  state.accounts.cargoCostBasis.gold = 0;

  const granted = receiveEmergencyShipAid(state, "crowded-relief-ship");
  assert.deepEqual(granted, { food: 3, water: 1 });
  assert.ok(granted.food > 0);
  assert.ok(granted.water > 0);
  assert.ok(Math.abs(cargoUsed(state) - (state.cargoCapacity - 0.75)) < 1e-8);
});

test("starting provisions and port auto-provisioning use hardtack cargo", () => {
  const economy = createWorldEconomy({ ports: [LONDON], startMinute: 0 });
  const state = createGameState({ cargoCapacity: 30 });
  const starter = initializeShipProvisions(state, 4);

  assert.equal(starter.good.id, "hardtack");
  assert.equal(starter.rations, 4);
  assert.equal(state.cargo.hardtack, 4 / 12);

  const bought = autoProvisionHardtackAtPort(state, economy, LONDON, { simMinute: 120 });

  assert.ok(bought.rations > 0);
  assert.equal(state.cargo.hardtack, (4 + bought.rations) / 12);
  assert.ok(survivalStatus(state).foodDays >= 21);
  assert.ok(state.accounts.ledger.some((entry) => entry.description.startsWith("Take on Hardtack")));
});

test("ports automatically fill water casks without using cargo space", () => {
  const state = createGameState({ cargoCapacity: 10 });
  state.survival.freshWater = 0;
  const result = autoProvisionFreshWaterAtPort(state, LONDON, { simMinute: 120 });

  assert.equal(result.good.id, FRESH_WATER_GOOD_ID);
  assert.equal(state.survival.freshWater, FRESH_WATER_CAPACITY);
  assert.equal(state.cargo[FRESH_WATER_GOOD_ID], undefined);
  assert.equal(result.price, result.quantity);
  assert.ok(result.quantity > 0);
  assert.ok(state.accounts.ledger.some((entry) => entry.description.startsWith("Take on Fresh Water")));
});

test("hardtack and extra water can be bought but not sold back", () => {
  const economy = createWorldEconomy({ ports: [LONDON], startMinute: 0 });
  const state = createGameState({ cargoCapacity: 10 });

  buyGood(state, economy, LONDON, "hardtack", 1);
  buyGood(state, economy, LONDON, FRESH_WATER_GOOD_ID, 1);

  assert.equal(state.cargo.hardtack, 1);
  assert.equal(state.cargo[FRESH_WATER_GOOD_ID], 1);
  assert.throws(() => sellGood(state, economy, LONDON, "hardtack", 1), /cannot be sold/);
  assert.throws(() => sellGood(state, economy, LONDON, FRESH_WATER_GOOD_ID, 1), /cannot be sold/);
});

test("loadouts put crew, guns, food, and water into the hold", () => {
  const stats = shipStatsForSlug("brigantine");
  const state = createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });
  initializeProvisionalShipLoadout(state, stats);
  const result = restockShipLoadoutAtPort(state, LONDON, stats, "combat", { simMinute: 120 });
  const plan = shipLoadoutPlan(stats, "combat");

  assert.equal(state.ship.loadoutId, "combat");
  assert.equal(state.ship.crew, plan.crew);
  assert.equal(state.ship.cannons, plan.cannons);
  assert.equal(cargoUsed(state),
    crewHoldSpace(state.ship.crew) + state.ship.cannons +
    Math.ceil(state.survival.freshWater) + (state.cargo.hardtack || 0));
  assert.ok(cargoUsed(state) <= state.cargoCapacity);
  assert.ok(result.spent > 0);
  assert.ok(state.accounts.ledger.some((entry) => entry.description === "Combat focused loadout restock"));
});

test("organized captains can apply preset and custom loadouts using effective ship stats", () => {
  const stats = shipStatsForSlug("brigantine");
  const state = createGameState({
    cargoCapacity: stats.cargoCapacity,
    shipStats: stats,
    playerCharacter: {
      id: "organized-loadout-captain",
      name: "Organized Captain",
      nationalityId: "england",
      expressions: [{ id: "neutral" }],
      skillIds: ["organized"]
    }
  });
  const effectiveStats = effectivePlayerShipStats(state, stats);

  assert.equal(effectiveStats.cargoCapacity, stats.cargoCapacity + 4);
  assert.doesNotThrow(() => initializeProvisionalShipLoadout(state, effectiveStats));
  const preset = restockShipLoadoutAtPort(
    state,
    LONDON,
    effectiveStats,
    "balanced",
    { simMinute: 120 }
  );
  assert.equal(preset.plan.totalSpace + preset.plan.reserveSpace, state.cargoCapacity);

  const custom = restockCustomShipLoadoutAtPort(
    state,
    LONDON,
    effectiveStats,
    {
      crew: preset.plan.crew,
      cannons: preset.plan.cannons,
      foodUnits: preset.plan.foodUnits,
      waterUnits: preset.plan.waterUnits
    },
    { simMinute: 240 }
  );
  assert.equal(custom.plan.id, "custom");
  assert.equal(custom.plan.totalSpace + custom.plan.reserveSpace, state.cargoCapacity);
});

test("consumed loadout provisions remain reserved against ordinary trade cargo", () => {
  const stats = shipStatsForSlug("fishing-lugger");
  const state = createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });
  const economy = createWorldEconomy({ ports: [LONDON], startMinute: 0 });
  initializeProvisionalShipLoadout(state, stats);
  restockShipLoadoutAtPort(state, LONDON, stats, "balanced", { simMinute: 120 });
  const freeTradeSpace = cargoFree(state);
  const stockedCargo = cargoUsed(state);

  delete state.cargo.hardtack;
  delete state.accounts.cargoCostBasis.hardtack;
  state.survival.freshWater = 0;

  assert.ok(cargoUsed(state) < stockedCargo);
  assert.equal(cargoFree(state), freeTradeSpace);
  state.cargo.cloves = freeTradeSpace;
  state.accounts.cargoCostBasis.cloves = 0;
  assert.equal(cargoFree(state), 0);
  assert.throws(() => buyGood(state, economy, LONDON, "timber", 1), /Not enough cargo space/);
  assert.equal(buyGood(state, economy, LONDON, "hardtack", 1).quantity, 1);
  assert.equal(cargoFree(state), 0);
});

test("passenger provisions report the same trade capacity that the market enforces", () => {
  const stats = shipStatsForSlug("mediterranean-galley");
  const state = createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });
  initializeProvisionalShipLoadout(state, stats);
  restockCustomShipLoadoutAtPort(state, LONDON, stats, {
    crew: 14,
    cannons: 0,
    foodUnits: 24,
    waterUnits: 35
  }, { simMinute: 120 });
  acceptQuest(state, {
    id: "passenger-cargo-report",
    kind: "passenger",
    originTileId: 1,
    originName: "London",
    destinationTileId: 2,
    destinationName: "Porto",
    passenger: { name: "Municipal Orrery" },
    passengerName: "Municipal Orrery",
    reward: 100
  });
  state.cargo.hardtack = 235 / 12;
  state.accounts.cargoCostBasis.hardtack = 235;
  state.cargo.fish = 29;
  state.accounts.cargoCostBasis.fish = 0;
  state.cargo.wine = 7 / 8;
  state.accounts.cargoCostBasis.wine = 0;
  state.survival.freshWater = 30.5;

  const before = cargoHoldStatus(state);
  assert.equal(before.physicalUsed, 1014 / 12);
  assert.equal(before.physicalWholeUnits, 85);
  assert.equal(before.reservedForLoadout, 4);
  assert.equal(before.freeForTrade, 1.5);
  assert.equal(before.freeWholeUnits, 1);
  assert.equal(before.committedWholeUnits, 89);

  const result = restockCustomShipLoadoutAtPort(state, LONDON, stats, state.ship.loadoutTargets, {
    simMinute: 240
  });
  const after = cargoHoldStatus(state);
  assert.equal(result.additions.water, 4.5);
  assert.equal(state.survival.freshWater, 35);
  assert.equal(after.reservedForLoadout, 0);
  assert.equal(after.freeForTrade, before.freeForTrade);
  assert.equal(after.committedWholeUnits, before.committedWholeUnits);
  assert.ok(survivalStatus(state).drinkDays > 19);
});

test("port restocking dumps excess water and fills constrained stores evenly", () => {
  const stats = shipStatsForSlug("fishing-lugger");
  const state = createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });
  initializeProvisionalShipLoadout(state, stats);
  restockShipLoadoutAtPort(state, LONDON, stats, "balanced", { simMinute: 120 });
  const plan = shipLoadoutPlan(stats, "balanced");

  state.cargo = { gold: 10 };
  state.accounts.cargoCostBasis = { gold: 0 };
  state.survival.freshWater = 7;
  const result = restockShipLoadoutAtPort(state, LONDON, stats, "balanced", { simMinute: 240 });

  assert.ok(plan.foodUnits > 3);
  assert.ok(plan.waterUnits > 4);
  assert.equal(state.cargo.hardtack, 3);
  assert.equal(state.survival.freshWater, 4);
  assert.equal(result.additions.food, 3);
  assert.equal(result.additions.water, 0);
  assert.equal(result.removed.water, 3);
  assert.equal(cargoUsed(state), state.cargoCapacity);
  assert.equal(cargoFree(state), 0);
});

test("edible trade cargo does not suppress automatic water refills", () => {
  const stats = shipStatsForSlug("ketch");
  const state = createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });
  initializeProvisionalShipLoadout(state, stats);
  restockShipLoadoutAtPort(state, LONDON, stats, "balanced", { simMinute: 120 });

  state.cargo = { fish: 40 };
  state.accounts.cargoCostBasis = { fish: 0 };
  state.survival.freshWater = 0;

  assert.equal(cargoUsed(state), 44);
  const result = restockShipLoadoutAtPort(state, LONDON, stats, "balanced", { simMinute: 240 });

  assert.equal(result.additions.food, 0);
  assert.equal(result.additions.water, 16);
  assert.equal(state.survival.freshWater, 16);
  assert.equal(cargoUsed(state), 60);
});

test("a smaller custom loadout dumps excess hardtack and water without refunding it", () => {
  const stats = shipStatsForSlug("brigantine");
  const state = createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });
  initializeProvisionalShipLoadout(state, stats);
  state.cargo.hardtack = 10;
  state.accounts.cargoCostBasis.hardtack = 100;
  state.survival.freshWaterCapacity = 10;
  state.survival.freshWater = 10;
  const doubloonsBefore = state.doubloons;
  const result = restockCustomShipLoadoutAtPort(state, LONDON, stats, {
    crew: state.ship.crew,
    cannons: state.ship.cannons,
    foodUnits: 2,
    waterUnits: 3
  }, { simMinute: 240 });

  assert.equal(state.ship.loadoutId, "custom");
  assert.equal(state.cargo.hardtack, 2);
  assert.equal(state.survival.freshWaterCapacity, 3);
  assert.equal(state.survival.freshWater, 3);
  assert.deepEqual(result.removed, { crew: 0, cannons: 0, food: 8, water: 7 });
  assert.equal(state.doubloons, doubloonsBefore);
});

test("loadout restocking does not report floating-point ration residue as dumped cargo", () => {
  const stats = shipStatsForSlug("brigantine");
  const state = createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });
  initializeProvisionalShipLoadout(state, stats);
  state.cargo.hardtack = 5 / 12;
  state.accounts.cargoCostBasis.hardtack = 5;
  state.survival.freshWaterCapacity = 3;
  state.survival.freshWater = 3;

  const result = restockCustomShipLoadoutAtPort(state, LONDON, stats, {
    crew: state.ship.crew,
    cannons: state.ship.cannons,
    foodUnits: 1,
    waterUnits: 3
  }, { simMinute: 240 });

  assert.equal(state.cargo.hardtack, 1);
  assert.equal(result.additions.food, 7 / 12);
  assert.equal(result.removed.food, 0);
  assert.equal(result.removed.water, 0);
});

test("port restocking never dumps water that the player cannot replace with food", () => {
  const stats = shipStatsForSlug("fishing-lugger");
  const state = createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });
  initializeProvisionalShipLoadout(state, stats);
  restockShipLoadoutAtPort(state, LONDON, stats, "balanced", { simMinute: 120 });
  state.cargo = { gold: 10 };
  state.accounts.cargoCostBasis = { gold: 0 };
  state.survival.freshWater = 7;
  state.doubloons = 0;

  const result = restockShipLoadoutAtPort(state, LONDON, stats, "balanced", { simMinute: 240 });

  assert.equal(state.cargo.hardtack, undefined);
  assert.equal(state.survival.freshWater, 7);
  assert.equal(result.removed.water, 0);
  assert.ok(result.shortfalls.food > 0);
});

test("one constrained emergency provision slot goes to water", () => {
  const stats = shipStatsForSlug("fishing-lugger");
  const state = createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });
  initializeProvisionalShipLoadout(state, stats);
  delete state.cargo.hardtack;
  delete state.accounts.cargoCostBasis.hardtack;
  state.survival.freshWater = 0;
  state.cargo.gold = state.cargoCapacity - crewHoldSpace(state.ship.crew) - state.ship.cannons - 1;
  state.accounts.cargoCostBasis.gold = 0;

  assert.deepEqual(receiveEmergencyShipAid(state, "one-slot-relief"), { food: 0, water: 1 });
  assert.equal(cargoUsed(state), state.cargoCapacity);
});

test("crew, passengers, and livestock all increase food and water burn", () => {
  const stats = shipStatsForSlug("fishing-lugger");
  const state = createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });
  initializeProvisionalShipLoadout(state, stats);
  const crewOnly = shipConsumption(state);
  state.memory.quests.passengerActive = { kind: "passenger", livestockCount: 2 };
  const voyage = shipConsumption(state);

  assert.equal(voyage.passengers, 1);
  assert.equal(voyage.livestock, 2);
  assert.equal(voyage.foodConsumers, crewOnly.foodConsumers + 5);
  assert.equal(voyage.waterConsumers, crewOnly.waterConsumers + 5);
});

test("an aboard panda eats for three but drinks for one without joining the crew", () => {
  const stats = shipStatsForSlug("fishing-lugger");
  const state = createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });
  initializeProvisionalShipLoadout(state, stats);
  const before = shipConsumption(state);
  beginAnimalCompanionRecruitment(state.memory.animalCompanions, "panda");
  acceptAnimalCompanion(state.memory.animalCompanions, "panda", 20);
  const after = shipConsumption(state);

  assert.equal(after.crew, before.crew);
  assert.deepEqual(after.animalCompanionIds, ["panda"]);
  assert.equal(after.foodConsumers, before.foodConsumers + 3);
  assert.equal(after.waterConsumers, before.waterConsumers + 1);
  validateGameState(state);
});

test("an aboard raccoon eats and drinks like one passenger without helping the crew", () => {
  const stats = shipStatsForSlug("fishing-lugger");
  const state = createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });
  initializeProvisionalShipLoadout(state, stats);
  const before = shipConsumption(state);
  beginAnimalCompanionRecruitment(state.memory.animalCompanions, "raccoon");
  acceptAnimalCompanion(state.memory.animalCompanions, "raccoon", 20);
  const after = shipConsumption(state);

  assert.equal(after.crew, before.crew);
  assert.deepEqual(after.animalCompanionIds, ["raccoon"]);
  assert.equal(after.foodConsumers, before.foodConsumers + 1);
  assert.equal(after.waterConsumers, before.waterConsumers + 1);
  assert.deepEqual(after.restrictedAnimalFood, []);
  validateGameState(state);
});

test("an aboard penguin eats two fish rations per day before ordinary provisions", () => {
  const stats = shipStatsForSlug("fishing-lugger");
  const state = createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });
  initializeProvisionalShipLoadout(state, stats);
  state.cargo.fish = 2 / 12;
  state.accounts.cargoCostBasis.fish = 10;
  beginAnimalCompanionRecruitment(state.memory.animalCompanions, "penguin");
  acceptAnimalCompanion(state.memory.animalCompanions, "penguin", 20);

  const beforeHardtack = state.cargo.hardtack;
  const result = updateSurvival(state, 0, 24 * 60, { safePort: false });

  assert.equal(state.cargo.fish, undefined);
  assert.equal(
    result.foodConsumed.filter((entry) => entry.goodId === "fish").length,
    2
  );
  assert.ok(state.cargo.hardtack < beforeHardtack);
  assert.equal(result.starved, false);
  validateGameState(state);
});

test("a penguin without stored fish catches its own and never harms the crew", () => {
  const stats = shipStatsForSlug("fishing-lugger");
  const baseline = createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });
  const withPenguin = createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });
  initializeProvisionalShipLoadout(baseline, stats);
  initializeProvisionalShipLoadout(withPenguin, stats);
  beginAnimalCompanionRecruitment(withPenguin.memory.animalCompanions, "penguin");
  acceptAnimalCompanion(withPenguin.memory.animalCompanions, "penguin", 20);

  const baselineResult = updateSurvival(baseline, 0, 24 * 60, { safePort: false });
  const penguinResult = updateSurvival(withPenguin, 0, 24 * 60, { safePort: false });

  assert.equal(withPenguin.cargo.hardtack, baseline.cargo.hardtack);
  assert.equal(penguinResult.foodConsumed.length, baselineResult.foodConsumed.length);
  assert.equal(penguinResult.starved, false);
  assert.equal(withPenguin.ship.crew, baseline.ship.crew);
  validateGameState(withPenguin);
});

test("shore scavenging fills available cask space and stows edible food", () => {
  const stats = shipStatsForSlug("brigantine");
  const state = createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });
  initializeProvisionalShipLoadout(state, stats);
  state.survival.freshWater -= 4;
  delete state.cargo.hardtack;
  delete state.accounts.cargoCostBasis.hardtack;

  assert.equal(refillFreshWaterFromShore(state), 4);
  assert.equal(state.survival.freshWater, state.survival.freshWaterCapacity);
  assert.equal(stowForagedFood(state, 2), 2);
  assert.equal(state.cargo[FORAGED_FOOD_GOOD_ID], 2 / 12);
  assert.equal(state.accounts.cargoCostBasis[FORAGED_FOOD_GOOD_ID], 0);
  assert.ok(survivalStatus(state).foodRations >= 2);
  assert.ok(cargoUsed(state) <= state.cargoCapacity);
});

test("scavenged food uses physically empty hold space reserved for depleted water", () => {
  const stats = shipStatsForSlug("xebec");
  const state = createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });
  initializeProvisionalShipLoadout(state, stats);
  state.cargo.gold = 46;
  state.accounts.cargoCostBasis.gold = 0;
  state.survival.freshWater -= 9;

  assert.equal(cargoUsed(state), 76);
  assert.equal(cargoFree(state), 0);
  assert.equal(stowForagedFood(state, 3), 3);
  assert.equal(state.cargo[FORAGED_FOOD_GOOD_ID], 3 / 12);
  assert.equal(cargoUsed(state), 76.25);
  assert.equal(validateGameState(state), state);
});

test("a scavenged beaver pelt enters cargo at zero cost without exceeding the hold", () => {
  const stats = shipStatsForSlug("brigantine");
  const state = createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });
  initializeProvisionalShipLoadout(state, stats);
  const before = cargoUsed(state);

  const result = receiveScavengedTradeGood(state, BEAVER_PELTS_GOOD_ID, 1, "river beaver", { simMinute: 100 });

  assert.equal(result.quantity, 1);
  assert.equal(state.cargo[BEAVER_PELTS_GOOD_ID], 1);
  assert.equal(state.accounts.cargoCostBasis[BEAVER_PELTS_GOOD_ID], 0);
  assert.equal(cargoUsed(state), before + 1);
  assert.ok(cargoUsed(state) <= state.cargoCapacity);
});

test("crew die from thirst and sometimes from hull damage", () => {
  const stats = shipStatsForSlug("brigantine");
  const state = createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });
  initializeProvisionalShipLoadout(state, stats);
  const startingCrew = state.ship.crew;

  assert.equal(loseCrew(state, 1), 1);
  assert.equal(state.ship.crew, startingCrew - 1);
  const rolls = [0, 0.99];
  assert.equal(rollCrewCasualtiesForDamage(state, 4, () => rolls.shift()), 2);
  assert.equal(rollCrewCasualtiesForDamage(state, 1, () => 0.99), 0);

  const remainingCrew = state.ship.crew;
  assert.equal(loseCrew(state, remainingCrew + 10), remainingCrew);
  assert.equal(state.ship.crew, 0);
});

test("dehydration and starvation kill crew without damaging the hull", () => {
  const stats = shipStatsForSlug("brigantine");
  const state = createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });
  initializeProvisionalShipLoadout(state, stats);
  const startingCrew = state.ship.crew;

  const thirst = applySurvivalDeprivation(state, { dehydration: 1, starvation: 0 });
  assert.deepEqual(thirst, {
    crewLost: 1,
    dehydrationCrewLost: 1,
    starvationCrewLost: 0,
    crewDepleted: startingCrew === 1
  });
  assert.equal(state.ship.crew, startingCrew - 1);

  const combined = applySurvivalDeprivation(state, { dehydration: 1, starvation: 1 });
  assert.equal(combined.crewLost, Math.min(2, startingCrew - 1));
  assert.equal(combined.dehydrationCrewLost, Math.min(1, combined.crewLost));
  assert.equal(combined.starvationCrewLost, Math.max(0, combined.crewLost - 1));
  assert.throws(
    () => applySurvivalDeprivation(state, { dehydration: 0.5, starvation: 0 }),
    /Invalid dehydration severity/
  );
});

test("player vessel loss distinguishes an intact unmanned ship from a sinking hull", () => {
  assert.equal(playerVesselLossOutcome({ crew: 0, hitPoints: 3 }), "crew-depleted");
  assert.equal(playerVesselLossOutcome({ crew: 4, hitPoints: 0 }), "sunk");
  assert.equal(playerVesselLossOutcome({ crew: 0, hitPoints: 0 }), "sunk");
  assert.equal(playerVesselLossOutcome({ crew: 1, hitPoints: 1 }), null);
  assert.throws(
    () => playerVesselLossOutcome({ crew: -1, hitPoints: 1 }),
    /Invalid player crew/
  );
  assert.throws(
    () => playerVesselLossOutcome({ crew: 1, hitPoints: Number.NaN }),
    /Invalid player hull points/
  );
});

test("starvation casualties occur ten times slower than dehydration casualties", () => {
  assert.equal(
    SURVIVAL_STARVATION_INTERVAL_MINUTES,
    SURVIVAL_DEHYDRATION_INTERVAL_MINUTES * 10
  );
});

test("changing hulls updates crew, gun, and loadout capacities together", () => {
  const brigantine = shipStatsForSlug("brigantine");
  const carrack = shipStatsForSlug("carrack");
  const state = createGameState({ cargoCapacity: brigantine.cargoCapacity, shipStats: brigantine });
  initializeProvisionalShipLoadout(state, brigantine);
  restockShipLoadoutAtPort(state, LONDON, brigantine, "balanced", { simMinute: 120 });

  const plan = setPlayerShipStats(state, carrack);

  assert.equal(state.cargoCapacity, carrack.cargoCapacity);
  assert.equal(state.ship.crewCapacity, carrack.crewCapacity);
  assert.equal(state.ship.cannonCapacity, carrack.cannons);
  assert.equal(state.ship.slug, "carrack");
  assert.equal(state.ship.loadoutTargets.id, "balanced");
  assert.equal(state.ship.loadoutTargets.crew, shipLoadoutPlan(carrack, "balanced").crew);
  assert.equal(plan.id, "balanced");
});

test("buying a ship spends specie, changes capacity, and enters the ledger", () => {
  const brigantine = shipStatsForSlug("brigantine");
  const carrack = shipStatsForSlug("carrack");
  const state = createGameState({ cargoCapacity: brigantine.cargoCapacity, shipStats: brigantine });
  initializeProvisionalShipLoadout(state, brigantine);
  state.doubloons = 60000;

  const result = purchasePlayerShip(state, LONDON, carrack, {
    listingPrice: 50000,
    tradeInValue: 0
  }, { simMinute: 240 });

  assert.equal(result.slug, "carrack");
  assert.equal(state.doubloons, 10000);
  assert.equal(state.cargoCapacity, carrack.cargoCapacity);
  assert.equal(state.accounts.ledger.at(-1).kind, "ship");
  assert.equal(state.accounts.ledger.at(-1).amount, -50000);
});

test("trading in a ship charges only the net price", () => {
  const brigantine = shipStatsForSlug("brigantine");
  const carrack = shipStatsForSlug("carrack");
  const state = createGameState({ cargoCapacity: brigantine.cargoCapacity, shipStats: brigantine });
  initializeProvisionalShipLoadout(state, brigantine);
  state.doubloons = 50000;

  const result = purchasePlayerShip(state, LONDON, carrack, {
    listingPrice: 50000,
    tradeInValue: 10000
  }, { simMinute: 240 });

  assert.equal(result.listingPrice, 50000);
  assert.equal(result.tradeInValue, 10000);
  assert.equal(result.netPrice, 40000);
  assert.equal(state.doubloons, 10000);
  assert.equal(state.accounts.ledger.at(-1).amount, -40000);
  assert.match(state.accounts.ledger.at(-1).description, /10000 doubloon vessel trade-in/);
});

test("a ship trade-in can disembark a named crewmate before fitting the replacement", () => {
  const longship = shipStatsForSlug("viking-longship");
  const dhow = shipStatsForSlug("dhow");
  const state = createGameState({ cargoCapacity: longship.cargoCapacity, shipStats: longship });
  initializeProvisionalShipLoadout(state, longship);
  state.doubloons = 5000;
  const historian = addNamedCrewMember(state, {
    id: "icelandic-historian",
    name: "Leif Eriksen",
    expressions: [{ id: "neutral", src: "test.png", width: 64, height: 64 }],
    skillIds: ["able-seaman"]
  }, NAMED_CREW_ROLE_HISTORIAN);

  const result = purchasePlayerShip(state, LONDON, dhow, {
    listingPrice: 1000,
    tradeInValue: 0
  }, {
    simMinute: 240,
    departingNamedCrewIds: [historian.id]
  });

  assert.deepEqual(result.departedNamedCrew, [historian]);
  assert.deepEqual(namedCrewMembers(state), []);
  assert.equal(state.ship.crew, 1);
  assert.equal(state.ship.slug, "dhow");
});

test("a surrendered ship award can disembark a named crewmate with the replaced vessel", () => {
  const longship = shipStatsForSlug("viking-longship");
  const dhow = shipStatsForSlug("dhow");
  const state = createGameState({ cargoCapacity: longship.cargoCapacity, shipStats: longship });
  initializeProvisionalShipLoadout(state, longship);
  const historian = addNamedCrewMember(state, {
    id: "prize-historian",
    name: "Leif Eriksen",
    expressions: [{ id: "neutral", src: "test.png", width: 64, height: 64 }],
    skillIds: ["able-seaman"]
  }, NAMED_CREW_ROLE_HISTORIAN);

  const result = awardPlayerShip(
    state,
    null,
    dhow,
    "Captured Dhow as a surrendered prize",
    {
      simMinute: 240,
      departingNamedCrewIds: [historian.id]
    }
  );

  assert.deepEqual(result.departedNamedCrew, [historian]);
  assert.deepEqual(namedCrewMembers(state), []);
  assert.equal(state.ship.crew, 1);
  assert.equal(state.ship.slug, "dhow");
});

test("a more valuable trade-in pays the difference without hiding the credit", () => {
  const carrack = shipStatsForSlug("carrack");
  const felucca = shipStatsForSlug("felucca");
  const state = createGameState({ cargoCapacity: carrack.cargoCapacity, shipStats: carrack });
  initializeProvisionalShipLoadout(state, carrack);
  state.doubloons = 100;

  const result = purchasePlayerShip(state, LONDON, felucca, {
    listingPrice: 5000,
    tradeInValue: 7000
  }, { simMinute: 240 });

  assert.equal(result.netPrice, -2000);
  assert.equal(state.doubloons, 2100);
  assert.equal(state.accounts.ledger.at(-1).amount, 2000);
});

test("a smaller ship accepts cargo after reducing the old ship's loadout", () => {
  const galleon = shipStatsForSlug("galleon");
  const felucca = shipStatsForSlug("felucca");
  const state = createGameState({ cargoCapacity: galleon.cargoCapacity, shipStats: galleon });
  initializeProvisionalShipLoadout(state, galleon);
  state.ship.loadoutId = "short-haul";
  state.ship.crew = 20;
  state.ship.cannons = 9;
  state.survival.freshWaterCapacity = 20;
  state.survival.freshWater = 20;
  state.cargo.hardtack = 10;
  state.doubloons = 100;

  assert.ok(cargoUsed(state) > felucca.cargoCapacity);
  const result = purchasePlayerShip(state, LONDON, felucca, {
    listingPrice: 5000,
    tradeInValue: 7000
  }, { simMinute: 240 });

  assert.equal(result.netPrice, -2000);
  assert.equal(state.doubloons, 2100);
  assert.equal(state.cargoCapacity, felucca.cargoCapacity);
  assert.ok(cargoUsed(state) <= felucca.cargoCapacity);
});

test("awarding a ship replaces the hull without charging the player", () => {
  const brigantine = shipStatsForSlug("brigantine");
  const longship = shipStatsForSlug("viking-longship");
  const state = createGameState({ cargoCapacity: brigantine.cargoCapacity, shipStats: brigantine });
  initializeProvisionalShipLoadout(state, brigantine);
  const startingDoubloons = state.doubloons;

  const result = awardPlayerShip(
    state,
    LONDON,
    longship,
    "Longship awarded for completing a reconstruction",
    { simMinute: 240 }
  );

  assert.equal(result.slug, "viking-longship");
  assert.equal(result.price, 0);
  assert.equal(state.doubloons, startingDoubloons);
  assert.equal(state.cargoCapacity, longship.cargoCapacity);
  assert.equal(state.accounts.ledger.at(-1).kind, "ship");
  assert.equal(state.accounts.ledger.at(-1).amount, 0);
  assert.match(state.accounts.ledger.at(-1).description, /awarded for completing/i);
});

test("demo game-state rules reject every replacement ship mutation", () => {
  const brigantine = shipStatsForSlug("brigantine");
  const carrack = shipStatsForSlug("carrack");
  const state = createGameState({ cargoCapacity: brigantine.cargoCapacity, shipStats: brigantine });
  initializeProvisionalShipLoadout(state, brigantine);
  state.doubloons = 60000;
  const ledgerLength = state.accounts.ledger.length;

  assert.throws(
    () => purchasePlayerShip(state, LONDON, carrack, {
      listingPrice: 50000,
      tradeInValue: 0
    }, {
      buildEditionId: "demo",
      simMinute: 240
    }),
    /not available in demo/i
  );
  assert.throws(
    () => awardPlayerShip(
      state,
      LONDON,
      carrack,
      "Captured Carrack as a surrendered prize",
      { buildEditionId: "demo", simMinute: 240 }
    ),
    /not available in demo/i
  );
  assert.equal(state.ship.slug, "brigantine");
  assert.equal(state.doubloons, 60000);
  assert.equal(state.accounts.ledger.length, ledgerLength);
});

test("a rejected ship replacement changes neither money nor the ledger", () => {
  const carrack = shipStatsForSlug("carrack");
  const felucca = shipStatsForSlug("felucca");
  const state = createGameState({ cargoCapacity: carrack.cargoCapacity, shipStats: carrack });
  initializeProvisionalShipLoadout(state, carrack);
  state.doubloons = 60000;
  state.cargo.timber = felucca.cargoCapacity + 1;
  state.accounts.cargoCostBasis.timber = 100;
  const ledgerLength = state.accounts.ledger.length;

  assert.throws(
    () => purchasePlayerShip(state, LONDON, felucca, {
      listingPrice: 50000,
      tradeInValue: 0
    }, { simMinute: 240 }),
    /current hold will not fit/
  );
  assert.equal(state.doubloons, 60000);
  assert.equal(state.cargoCapacity, carrack.cargoCapacity);
  assert.equal(state.accounts.ledger.length, ledgerLength);
});

function pirateCaptiveTestCharacter() {
  return {
    id: "pirate-captive-test",
    name: "Alice Hawkins",
    givenName: "Alice",
    familyName: "Hawkins",
    sex: "female",
    age: 25,
    birthDate: { year: 1496, month: 5, day: 9 },
    birthDateLabel: "9 May 1496",
    nameCulture: "english",
    skillIds: ["able-seaman"],
    expressions: [
      { id: "sad", src: "assets/characters/sad.png", width: 64, height: 64 },
      { id: "happy", src: "assets/characters/happy.png", width: 64, height: 64 }
    ]
  };
}

function port(tileId, city, country, cityType, population, factionId = null) {
  return {
    tileId,
    city,
    displayCity: city,
    country,
    cityType,
    population,
    factionId
  };
}
