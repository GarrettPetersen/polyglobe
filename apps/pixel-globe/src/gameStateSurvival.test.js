import assert from "node:assert/strict";
import test from "node:test";

import { FORAGED_FOOD_GOOD_ID, FRESH_WATER_GOOD_ID, createWorldEconomy } from "./economy.js";
import {
  FRESH_WATER_CAPACITY,
  autoProvisionFreshWaterAtPort,
  autoProvisionHardtackAtPort,
  applySurvivalDeprivation,
  buyGood,
  cargoCostBasis,
  cargoUsed,
  createGameState,
  initializeProvisionalShipLoadout,
  initializeShipProvisions,
  loseCrew,
  purchasePlayerShip,
  restockShipLoadoutAtPort,
  refillFreshWaterFromShore,
  rollCrewCasualtiesForDamage,
  sellGood,
  setPlayerShipStats,
  shipConsumption,
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

test("dehydration kills crew without contributing hull damage", () => {
  const stats = shipStatsForSlug("brigantine");
  const state = createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });
  initializeProvisionalShipLoadout(state, stats);
  const startingCrew = state.ship.crew;

  const thirst = applySurvivalDeprivation(state, { dehydration: 1, starvation: 0 });
  assert.deepEqual(thirst, { crewLost: 1, crewDepleted: startingCrew === 1, hullDamage: 0 });
  assert.equal(state.ship.crew, startingCrew - 1);

  const combined = applySurvivalDeprivation(state, { dehydration: 1, starvation: 1 });
  assert.equal(combined.crewLost, Math.min(1, startingCrew - 1));
  assert.equal(combined.hullDamage, 1);
  assert.throws(
    () => applySurvivalDeprivation(state, { dehydration: 0.5, starvation: 0 }),
    /Invalid dehydration severity/
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
