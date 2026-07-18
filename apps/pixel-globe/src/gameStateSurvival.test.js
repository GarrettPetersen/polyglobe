import assert from "node:assert/strict";
import test from "node:test";

import { FORAGED_FOOD_GOOD_ID, FRESH_WATER_GOOD_ID, createWorldEconomy } from "./economy.js";
import {
  FRESH_WATER_CAPACITY,
  RAIN_WATER_COLLECTION_PER_CONSUMER_DAY,
  SURVIVAL_DEHYDRATION_INTERVAL_MINUTES,
  SURVIVAL_STARVATION_INTERVAL_MINUTES,
  autoProvisionFreshWaterAtPort,
  autoProvisionHardtackAtPort,
  applySurvivalDeprivation,
  awardPlayerShip,
  buyGood,
  cargoCostBasis,
  cargoFree,
  cargoReservationUnits,
  cargoSpaceLabel,
  cargoUsed,
  createGameState,
  foodRationsForCargoQuantity,
  initializeProvisionalShipLoadout,
  initializeShipProvisions,
  loseCrew,
  migrateGameState,
  purchasePlayerShip,
  receiveEmergencyShipAid,
  releaseCargoSpace,
  reserveCargoSpace,
  restockShipLoadoutAtPort,
  refillFreshWaterFromShore,
  rollCrewCasualtiesForDamage,
  sellGood,
  setPlayerShipStats,
  shipConsumption,
  shipEmergencyAidNeed,
  shipTravelerManifest,
  stowForagedFood,
  survivalStatus,
  updateSurvival,
  validateGameState
} from "./gameState.js";
import { crewHoldSpace, shipLoadoutPlan } from "./shipLoadouts.js";
import { shipStatsForSlug } from "./shipStats.js";

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

test("survival drains water and consumes the cheapest edible cargo first", () => {
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
  assert.equal(result.foodConsumed[0].goodId, "fish");
  assert.equal(state.cargo.fish, 11 / 12);
  assert.equal(state.cargo.grain, 2);
  assert.ok(state.survival.freshWater < FRESH_WATER_CAPACITY);
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

  assert.equal(survivalStatus(state).foodDays, 6);
  updateSurvival(state, 0, 24 * 60, { freshwater: false });

  assert.equal(survivalStatus(state).foodDays, 5);
  assert.equal(survivalStatus(state).foodRations, 10);
  assert.equal(state.cargo.hardtack, 10 / 12);
  assert.ok(Math.abs((usedBefore - cargoUsed(state)) - 2 / 12) < 1e-8);
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

test("the ship traveler manifest distinguishes passengers, envoys, and settlers", () => {
  const state = createGameState({ cargoCapacity: 100 });

  state.memory.quests.active = { kind: "passenger" };
  assert.deepEqual(shipTravelerManifest(state), [{ kind: "passenger", count: 1 }]);

  state.memory.quests.active = { kind: "friendly-envoy" };
  assert.deepEqual(shipTravelerManifest(state), [{ kind: "envoy", count: 1 }]);

  state.memory.quests.active = null;
  state.memory.colonization.stage = "outbound";
  state.memory.colonization.fetchStageIndex = 3;
  state.memory.colonization.targetTileId = 1;
  assert.deepEqual(shipTravelerManifest(state), [{ kind: "settler", count: 12 }]);
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
  state.survival.foodRationDebt = 1;

  const result = updateSurvival(state, 0, 60, { freshwater: false });

  assert.equal(result.dehydrated, true);
  assert.equal(result.starved, true);
  assert.equal(state.survival.freshWater, 0);
  assert.equal(survivalStatus(state).foodRations, 0);
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
  state.memory.quests.active = { kind: "passenger", livestockCount: 2 };
  const voyage = shipConsumption(state);

  assert.equal(voyage.passengers, 1);
  assert.equal(voyage.livestock, 2);
  assert.equal(voyage.foodConsumers, crewOnly.foodConsumers + 5);
  assert.equal(voyage.waterConsumers, crewOnly.waterConsumers + 5);
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
  assert.equal(state.ship.loadoutTargets.id, "balanced");
  assert.equal(plan.id, "balanced");
});

test("buying a ship spends specie, changes capacity, and enters the ledger", () => {
  const brigantine = shipStatsForSlug("brigantine");
  const carrack = shipStatsForSlug("carrack");
  const state = createGameState({ cargoCapacity: brigantine.cargoCapacity, shipStats: brigantine });
  initializeProvisionalShipLoadout(state, brigantine);
  state.doubloons = 60000;

  const result = purchasePlayerShip(state, LONDON, carrack, 50000, { simMinute: 240 });

  assert.equal(result.slug, "carrack");
  assert.equal(state.doubloons, 10000);
  assert.equal(state.cargoCapacity, carrack.cargoCapacity);
  assert.equal(state.accounts.ledger.at(-1).kind, "ship");
  assert.equal(state.accounts.ledger.at(-1).amount, -50000);
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
    () => purchasePlayerShip(state, LONDON, felucca, 50000, { simMinute: 240 }),
    /current hold will not fit/
  );
  assert.equal(state.doubloons, 60000);
  assert.equal(state.cargoCapacity, carrack.cargoCapacity);
  assert.equal(state.accounts.ledger.length, ledgerLength);
});

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
