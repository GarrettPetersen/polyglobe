import assert from "node:assert/strict";
import test from "node:test";

import {
  createGameState,
  stealNonQuestShipPossession
} from "./gameState.js";
import { shipStatsForSlug } from "./shipStats.js";

function game() {
  const stats = shipStatsForSlug("brigantine");
  return createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });
}

test("ship theft leaves reserved quest cargo untouched", () => {
  const state = game();
  state.cargo.grain = 4;
  state.accounts.cargoCostBasis.grain = 80;
  state.cargo.wine = 2;
  state.accounts.cargoCostBasis.wine = 60;

  const stolen = stealNonQuestShipPossession(state, {
    protectedCargoQuantities: { grain: 4 },
    selectionRoll: 0
  });

  assert.deepEqual(stolen, { kind: "cargo", id: "wine", label: "Wine", quantity: 1 });
  assert.equal(state.cargo.grain, 4);
  assert.equal(state.cargo.wine, 1);
  assert.equal(state.accounts.cargoCostBasis.wine, 30);
});

test("ship theft can take ordinary equipment but not reward or capacity items", () => {
  const state = game();
  state.inventory.items = {
    "longsword": 1,
    "sturdy-barrels": 1,
    "zamzam-flask": 1
  };
  state.cargoCapacity += 3;

  const stolen = stealNonQuestShipPossession(state, { selectionRoll: 0.75 });

  assert.deepEqual(stolen, { kind: "item", id: "longsword", label: "Longsword", quantity: 1 });
  assert.equal(state.inventory.items.longsword, undefined);
  assert.equal(state.inventory.items["sturdy-barrels"], 1);
  assert.equal(state.inventory.items["zamzam-flask"], 1);
});
