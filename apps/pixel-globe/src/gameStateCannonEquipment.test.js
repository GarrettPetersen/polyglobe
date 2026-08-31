import assert from "node:assert/strict";
import test from "node:test";

import { createWorldEconomy } from "./economy.js";
import {
  createGameState,
  ledgerEntries,
  playerCannonEquipment,
  purchaseCannonEquipment,
  shipItemRows
} from "./gameState.js";
import { shipStatsForSlug } from "./shipStats.js";

const LISBON = Object.freeze({
  tileId: 10,
  cityId: "lisbon|portugal",
  city: "Lisbon",
  displayCity: "Lisbon",
  country: "Portugal",
  cityType: "mediterranean",
  population: 70000
});

const FUNCHAL = Object.freeze({
  tileId: 11,
  cityId: "funchal|portugal",
  city: "Funchal",
  displayCity: "Funchal",
  country: "Portugal",
  cityType: "mediterranean",
  population: 8000
});

test("players begin with standard ordnance recorded in ship equipment", () => {
  const stats = shipStatsForSlug("brigantine");
  const state = createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });

  assert.equal(playerCannonEquipment(state).id, "standard-ordnance");
  const row = shipItemRows(state).find((item) => item.id === "cannon-equipment");
  assert.equal(row.label, "Standard ordnance");
  assert.match(row.detail, /Reload 10\.00s, damage x1\.00, range x1\.00/);
});

test("cannon upgrades spend doubloons and enter the ledger", () => {
  const stats = shipStatsForSlug("brigantine");
  const state = createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });
  const economy = createWorldEconomy({ ports: [LISBON], startMinute: 0 });
  state.doubloons = 10000;

  const purchase = purchaseCannonEquipment(
    state,
    economy,
    LISBON,
    "bronze-culverins",
    { simMinute: 120 }
  );

  assert.equal(purchase.previous.id, "standard-ordnance");
  assert.equal(purchase.equipment.id, "bronze-culverins");
  assert.equal(state.doubloons, 7600);
  assert.equal(playerCannonEquipment(state).reloadSeconds, 8.5);
  assert.equal(ledgerEntries(state).at(-1).description, "Buy Bronze culverins");
  assert.equal(ledgerEntries(state).at(-1).amount, -2400);
});

test("ports enforce cannon stock and unarmed ships cannot buy cannon equipment", () => {
  const armed = shipStatsForSlug("brigantine");
  const armedState = createGameState({ cargoCapacity: armed.cargoCapacity, shipStats: armed });
  const economy = createWorldEconomy({ ports: [FUNCHAL], startMinute: 0 });
  armedState.doubloons = 50000;
  assert.throws(
    () => purchaseCannonEquipment(armedState, economy, FUNCHAL, "royal-foundry-battery"),
    /not stocked/
  );

  const unarmed = shipStatsForSlug("viking-longship");
  const unarmedState = createGameState({ cargoCapacity: unarmed.cargoCapacity, shipStats: unarmed });
  unarmedState.doubloons = 50000;
  assert.throws(
    () => purchaseCannonEquipment(unarmedState, economy, LISBON, "bronze-culverins"),
    /cannon-armed ship/
  );
});
