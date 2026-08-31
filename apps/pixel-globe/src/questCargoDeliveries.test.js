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
  questCargoDeliveryProgress,
  questCargoTransfer,
  questCargoTransferFromDelivery,
  questCargoTransfersFromDeliveries
} from "./questCargoDeliveries.js";

const CITY = Object.freeze({ cityId: "porto|portugal", tileId: 10, city: "Porto", country: "Portugal" });

test("quest cargo deliveries expose one strict presentation contract", () => {
  assert.deepEqual(questCargoTransfer("timber", 6), { goodId: "timber", quantity: 6 });
  assert.deepEqual(
    questCargoTransferFromDelivery({ good: { id: "iron" }, quantity: 2 }),
    { goodId: "iron", quantity: 2 }
  );
  assert.deepEqual(
    questCargoTransfersFromDeliveries([
      { good: { id: "grain" }, quantity: 3 },
      { good: { id: "wine" }, quantity: 1 }
    ]),
    [
      { goodId: "grain", quantity: 3 },
      { goodId: "wine", quantity: 1 }
    ]
  );
  assert.throws(() => questCargoTransfer("", 1), /good id/);
  assert.throws(() => questCargoTransfer("timber", 0), /positive integer quantity/);
});

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

test("partly eaten quest food remains aboard and does not consume delivery progress", () => {
  const state = createGameState({ cargoCapacity: 20 });
  state.cargo.grain = 11.75;
  state.accounts.cargoCostBasis.grain = 117.5;

  const first = deliverQuestCargoRequirement(
    state,
    CITY,
    "grain",
    12,
    "test.colony-grain"
  );
  assert.equal(first.quantity, 11);
  assert.equal(first.remainingQuantity, 1);
  assert.equal(state.cargo.grain, 0.75);
  assert.equal(questCargoDeliverableQuantity(state, "test.colony-grain", 12, 0.75), 0);
  assert.deepEqual(questCargoDeliveryProgress(state, "test.colony-grain", 12), {
    requirementId: "test.colony-grain",
    requiredQuantity: 12,
    deliveredQuantity: 11,
    remainingQuantity: 1,
    complete: false
  });

  state.cargo.grain += 1;
  const second = deliverQuestCargoRequirement(
    state,
    CITY,
    "grain",
    12,
    "test.colony-grain"
  );
  assert.equal(second.quantity, 1);
  assert.equal(second.complete, true);
  assert.equal(state.cargo.grain, 0.75);
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
