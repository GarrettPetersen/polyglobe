import assert from "node:assert/strict";
import test from "node:test";

import { FORAGED_FOOD_GOOD_ID, FRESH_WATER_GOOD_ID, createWorldEconomy } from "./economy.js";
import {
  FRESH_WATER_CAPACITY,
  RAIN_WATER_COLLECTION_PER_DAY,
  SURVIVAL_DEHYDRATION_INTERVAL_MINUTES,
  SURVIVAL_STARVATION_INTERVAL_MINUTES,
  autoProvisionFreshWaterAtPort,
  autoProvisionHardtackAtPort,
  applySurvivalDeprivation,
  awardPlayerShip,
  buyGood,
  cargoCostBasis,
  cargoUsed,
  createGameState,
  initializeProvisionalShipLoadout,
  initializeShipProvisions,
  loseCrew,
  migrateGameState,
  purchasePlayerShip,
  receiveEmergencyShipAid,
  restockShipLoadoutAtPort,
  refillFreshWaterFromShore,
  rollCrewCasualtiesForDamage,
  sellGood,
  setPlayerShipStats,
  shipConsumption,
  shipEmergencyAidNeed,
  stowForagedFood,
  survivalStatus,
  updateSurvival,
  validateGameState
} from "./gameState.js";
import { crewHoldSpace, shipLoadoutPlan } from "./shipLoadouts.js";
import { shipStatsForSlug } from "./shipStats.js";

const LONDON = port(1, "London", "United Kingdom", "northern-european", 80000, "england");

test("saved game state rejects unsupported schema versions", () => {
  const state = createGameState({ cargoCapacity: 10 });
  assert.equal(validateGameState(state), state);
  state.version += 1;
  assert.throws(() => validateGameState(state), /Unsupported game state version/);
  assert.throws(() => migrateGameState({ version: 7 }), /Unsupported game state version/);
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
  assert.equal(state.cargo.fish, undefined);
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
  assert.equal(state.cargo.grain, 1);
  assert.equal(cargoCostBasis(state, "grain").total, 8);
});

test("rainwater silently offsets a tiny share of water consumption", () => {
  const dry = createGameState({ cargoCapacity: 10 });
  const rainy = createGameState({ cargoCapacity: 10 });
  dry.survival.freshWater = 20;
  rainy.survival.freshWater = 20;

  const dryResult = updateSurvival(dry, 0, 24 * 60, { rainfall: 0 });
  const rainyResult = updateSurvival(rainy, 0, 24 * 60, { rainfall: 1 });

  assert.equal(rainyResult.freshWaterRefilled, false);
  assert.equal(rainyResult.rainWaterCollected, RAIN_WATER_COLLECTION_PER_DAY);
  assert.equal(dryResult.rainWaterCollected, 0);
  assert.ok(rainy.survival.freshWater > dry.survival.freshWater);
  assert.ok(rainyResult.waterConsumed < dryResult.waterConsumed);
  assert.throws(
    () => updateSurvival(rainy, 24 * 60, 25 * 60, { rainfall: 1.01 }),
    /Invalid rainfall strength/
  );
});

test("waiting safely in port advances time without consuming provisions", () => {
  const state = createGameState({ cargoCapacity: 10 });
  state.survival.freshWater = 12;
  state.survival.foodDebt = 0.5;
  state.cargo.grain = 2;
  state.accounts.cargoCostBasis.grain = 16;

  const result = updateSurvival(state, 0, 30 * 24 * 60, { safePort: true });

  assert.equal(result.changed, false);
  assert.equal(result.dehydrated, false);
  assert.equal(result.starved, false);
  assert.equal(state.survival.freshWater, 12);
  assert.equal(state.survival.foodDebt, 0.5);
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
  state.survival.foodDebt = 1;

  const result = updateSurvival(state, 0, 60, { freshwater: false });

  assert.equal(result.dehydrated, true);
  assert.equal(result.starved, true);
  assert.equal(state.survival.freshWater, 0);
  assert.equal(survivalStatus(state).foodUnits, 0);
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
  assert.equal(state.cargo.hardtack, 3);
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
  assert.equal(granted.food + granted.water, 2);
  assert.ok(granted.food > 0);
  assert.ok(granted.water > 0);
  assert.equal(cargoUsed(state), state.cargoCapacity);
});

test("starting provisions and port auto-provisioning use hardtack cargo", () => {
  const economy = createWorldEconomy({ ports: [LONDON], startMinute: 0 });
  const state = createGameState({ cargoCapacity: 30 });
  const starter = initializeShipProvisions(state, 4);

  assert.equal(starter.good.id, "hardtack");
  assert.equal(state.cargo.hardtack, 4);

  const bought = autoProvisionHardtackAtPort(state, economy, LONDON, { simMinute: 120 });

  assert.ok(bought.quantity > 0);
  assert.equal(state.cargo.hardtack, 4 + bought.quantity);
  assert.ok(survivalStatus(state).foodDays >= 21);
  assert.ok(state.accounts.ledger.some((entry) => entry.description.startsWith("Buy Hardtack")));
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
  assert.equal(state.cargo[FORAGED_FOOD_GOOD_ID], 2);
  assert.equal(state.accounts.cargoCostBasis[FORAGED_FOOD_GOOD_ID], 0);
  assert.ok(survivalStatus(state).foodUnits >= 2);
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
