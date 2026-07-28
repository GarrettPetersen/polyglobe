import assert from "node:assert/strict";
import test from "node:test";

import {
  createGameState,
  deliverQuestCargoRequirement,
  migrateGameState,
  validateGameState
} from "./gameState.js";
import {
  questCargoDeliverableQuantity,
  questCargoDeliveryProgress
} from "./questCargoDeliveries.js";

const CITY = Object.freeze({ tileId: 10, city: "Porto", country: "Portugal" });

test("quest cargo can be delivered in any number of installments", () => {
  const state = createGameState({ cargoCapacity: 20 });
  state.cargo.timber = 6;
  state.accounts.cargoCostBasis.timber = 60;

  const first = deliverQuestCargoRequirement(
    state,
    CITY,
    "timber",
    10,
    "test.timber"
  );
  assert.equal(first.quantity, 6);
  assert.equal(first.deliveredQuantity, 6);
  assert.equal(first.remainingQuantity, 4);
  assert.equal(first.complete, false);
  assert.equal(state.cargo.timber, undefined);

  state.cargo.timber = 4;
  state.accounts.cargoCostBasis.timber = 40;
  const second = deliverQuestCargoRequirement(
    state,
    CITY,
    "timber",
    10,
    "test.timber"
  );
  assert.equal(second.quantity, 4);
  assert.equal(second.deliveredQuantity, 10);
  assert.equal(second.remainingQuantity, 0);
  assert.equal(second.complete, true);
  assert.doesNotThrow(() => validateGameState(state));
});

test("quest delivery only transfers whole goods and never exceeds the remainder", () => {
  const state = createGameState({ cargoCapacity: 20 });
  state.cargo.fish = 0.5;
  assert.equal(questCargoDeliverableQuantity(state, "test.fish", 1, 0.5), 0);

  state.cargo.timber = 12;
  const delivery = deliverQuestCargoRequirement(
    state,
    CITY,
    "timber",
    10,
    "test.capped-timber"
  );
  assert.equal(delivery.quantity, 10);
  assert.equal(state.cargo.timber, 2);
  assert.deepEqual(questCargoDeliveryProgress(state, "test.capped-timber", 10), {
    requirementId: "test.capped-timber",
    requiredQuantity: 10,
    deliveredQuantity: 10,
    remainingQuantity: 0,
    complete: true
  });
});

test("partial quest deliveries survive a save and restore", () => {
  const state = createGameState({ cargoCapacity: 20 });
  state.cargo.timber = 1;
  deliverQuestCargoRequirement(state, CITY, "timber", 10, "test.saved-timber");

  const restored = migrateGameState(JSON.parse(JSON.stringify(state)));
  assert.deepEqual(questCargoDeliveryProgress(restored, "test.saved-timber", 10), {
    requirementId: "test.saved-timber",
    requiredQuantity: 10,
    deliveredQuantity: 1,
    remainingQuantity: 9,
    complete: false
  });
});
