import assert from "node:assert/strict";
import test from "node:test";

import { cargoUsed, createGameState, receiveSurrenderedLoot } from "./gameState.js";

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
