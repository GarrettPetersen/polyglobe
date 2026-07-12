import assert from "node:assert/strict";
import test from "node:test";

import { FRESH_WATER_GOOD_ID, createWorldEconomy } from "./economy.js";
import {
  FRESH_WATER_CAPACITY,
  autoProvisionFreshWaterAtPort,
  autoProvisionHardtackAtPort,
  buyGood,
  cargoCostBasis,
  createGameState,
  initializeShipProvisions,
  sellGood,
  survivalStatus,
  updateSurvival
} from "./gameState.js";

const LONDON = port(1, "London", "United Kingdom", "northern-european", 80000, "england");

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
