import assert from "node:assert/strict";
import test from "node:test";

import { cargoUsed, createGameState, receiveFishCatch, receiveSurrenderedLoot } from "./gameState.js";

test("surrendered loot credits money and accepts only cargo that fits", () => {
  const state = createGameState({ cargoCapacity: 3, startMinute: 100 });
  const received = receiveSurrenderedLoot(state, {
    specie: 75,
    cargo: { grain: 5, wine: 2 }
  }, { simMinute: 140 });

  assert.equal(state.doubloons, 435);
  assert.ok(cargoUsed(state) <= state.cargoCapacity);
  assert.equal(received.specie, 75);
  assert.ok(Object.values(received.cargo).reduce((sum, quantity) => sum + quantity, 0) > 0);
  assert.ok(state.accounts.ledger.some((entry) => entry.description === "Surrendered prize money"));
});

test("fish catches enter cargo and the ledger with no cost basis", () => {
  const state = createGameState({ cargoCapacity: 4, startMinute: 100 });
  const received = receiveFishCatch(state, {
    stockKey: "10:salmon",
    speciesLabel: "Salmon",
    quantity: 3
  }, { simMinute: 120, location: "Near river mouth" });

  assert.equal(received.good.id, "fish");
  assert.equal(received.quantity, 3);
  assert.equal(state.cargo.fish, 3);
  assert.equal(state.accounts.cargoCostBasis.fish, 0);
  assert.ok(state.accounts.ledger.some((entry) => (
    entry.kind === "catch" &&
    entry.description === "Catch Salmon x3" &&
    entry.amount === 0
  )));
});
