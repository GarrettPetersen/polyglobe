import assert from "node:assert/strict";
import test from "node:test";

import { createWorldEconomy } from "./economy.js";
import {
  cargoUsed,
  createGameState,
  ledgerEntries,
  playerWhaleHarpoon,
  purchaseWhaleHarpoon,
  receiveWhaleBlubber,
  shipItemRows
} from "./gameState.js";
import { WHALE_HARPOONS } from "./whaleHarpoons.js";
import {
  EQUIPMENT_STOCK_WHALE_HARPOON,
  equipmentStockAtPort
} from "./portEquipment.js";

const PORTS = Object.freeze(Array.from({ length: 40 }, (_, index) => ({
  tileId: 900 + index,
  city: `Whaling Port ${index}`,
  displayCity: `Whaling Port ${index}`,
  country: "Test Coast",
  cityType: "northern-european",
  population: 18000 + index * 6000
})));

test("new captains need to find a port that stocks whale harpoons", () => {
  const state = createGameState({ cargoCapacity: 20 });
  const economy = createWorldEconomy({ ports: PORTS, startMinute: 0 });
  const stockedPorts = PORTS.filter((port) => equipmentStockAtPort(
    economy,
    port,
    EQUIPMENT_STOCK_WHALE_HARPOON,
    WHALE_HARPOONS
  ).length > 0);

  assert.equal(playerWhaleHarpoon(state), null);
  assert.equal(shipItemRows(state).some((row) => row.id === "whale-harpoon"), false);
  assert.ok(stockedPorts.length > 0);
  assert.ok(stockedPorts.length < PORTS.length);

  const port = stockedPorts.find((candidate) => equipmentStockAtPort(
    economy,
    candidate,
    EQUIPMENT_STOCK_WHALE_HARPOON,
    WHALE_HARPOONS
  ).some((harpoon) => harpoon.id === "ash-shaft-harpoon"));
  assert.ok(port);
  state.doubloons = 1000;
  const purchase = purchaseWhaleHarpoon(state, economy, port, "ash-shaft-harpoon", { simMinute: 60 });

  assert.equal(purchase.previous, null);
  assert.equal(playerWhaleHarpoon(state).id, "ash-shaft-harpoon");
  assert.equal(state.doubloons, 550);
  assert.match(ledgerEntries(state).at(-1).description, /Ash-shaft harpoon/);
});

test("a whale carcass fills only the free hold with valuable zero-basis blubber", () => {
  const state = createGameState({ cargoCapacity: 7, startMinute: 100 });
  state.cargo.fish = 2;
  state.accounts.cargoCostBasis.fish = 0;

  const result = receiveWhaleBlubber(state, 28, {
    simMinute: 120,
    speciesLabel: "North Atlantic right whale"
  });

  assert.equal(result.good.id, "whale-blubber");
  assert.equal(result.good.basePrice, 240);
  assert.equal(result.quantity, 5);
  assert.equal(state.cargo["whale-blubber"], 5);
  assert.equal(state.accounts.cargoCostBasis["whale-blubber"], 0);
  assert.equal(cargoUsed(state), 7);
  assert.equal(
    ledgerEntries(state).at(-1).description,
    "Process North Atlantic right whale blubber x5"
  );
});
