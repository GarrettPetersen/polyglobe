import assert from "node:assert/strict";
import test from "node:test";

import {
  GAME_STATE_VERSION,
  acknowledgePlayerPortCustomsNotice,
  adjustFactionReputation,
  buyGood,
  createGameState,
  migrateGameState,
  payPortugueseCartazFine,
  playerPortCustomsNotice,
  portugueseCartazInspectionStatus,
  portugueseCartazStatus,
  purchasePortugueseCartaz,
  surrenderPortugueseControlledCargo,
  validateGameState
} from "./gameState.js";
import { createWorldEconomy } from "./economy.js";
import { foreignSettlementById } from "./foreignSettlements.js";

const PLAYER = Object.freeze({
  id: "cartaz-test-captain",
  name: "Joan Alden",
  nationalityId: "england",
  homePortCityId: "london|united kingdom",
  homePortTileId: 1,
  homePortName: "London",
  expressions: ["neutral", "happy"]
});
const GOA = Object.freeze({
  tileId: 12,
  portId: "city-12",
  cityId: "goa|india",
  city: "Goa",
  displayCity: "Goa",
  country: "India",
  factionId: "portugal"
});
const COLOMBO = Object.freeze({
  tileId: 155810,
  portId: "city-155810",
  cityId: "colombo|sri lanka",
  city: "Colombo",
  displayCity: "Colombo",
  country: "Sri Lanka",
  cityType: "south-asian",
  population: 12000,
  factionId: "neutral",
  foreignSettlements: [foreignSettlementById("portuguese-colombo")]
});

test("a Portuguese cartaz is purchased once and remains valid for ninety days", () => {
  const state = createGameState({ cargoCapacity: 30, playerCharacter: PLAYER });
  const status = portugueseCartazStatus(state, GOA, 100);
  assert.equal(status.valid, false);
  assert.equal(status.canPurchase, true);
  const before = state.doubloons;
  const purchased = purchasePortugueseCartaz(state, GOA, 100);
  assert.equal(state.doubloons, before - status.fee);
  assert.equal(purchased.untilMinute, 100 + 90 * 1440);
  assert.equal(portugueseCartazStatus(state, GOA, 101).valid, true);
  validateGameState(state);
});

test("Colombo cannot sell Crown cinnamon through the official market without a cartaz", () => {
  const state = createGameState({ cargoCapacity: 30, playerCharacter: PLAYER });
  const economy = createWorldEconomy({ ports: [COLOMBO], startMinute: 0 });
  assert.throws(
    () => buyGood(state, economy, COLOMBO, "cinnamon", 1, { simMinute: 100 }),
    /requires a valid Portuguese cartaz/
  );
  purchasePortugueseCartaz(state, COLOMBO, 100);
  assert.equal(
    buyGood(state, economy, COLOMBO, "cinnamon", 1, { simMinute: 101 }).quantity,
    1
  );
});

test("factors remember a customs notice until its displayed rate changes", () => {
  const state = createGameState({ cargoCapacity: 30, playerCharacter: PLAYER });
  const initial = playerPortCustomsNotice(state, GOA);
  assert.equal(initial.acknowledged, false);
  assert.equal(
    acknowledgePlayerPortCustomsNotice(state, GOA, initial.key).acknowledged,
    true
  );
  adjustFactionReputation(state, "portugal", 100);
  const improved = playerPortCustomsNotice(state, GOA);
  assert.notEqual(improved.key, initial.key);
  assert.equal(improved.acknowledged, false);
});

test("an unlicensed ship in Estado waters can settle or surrender an inspection", () => {
  const state = createGameState({ cargoCapacity: 30, playerCharacter: PLAYER });
  state.cargo.pepper = 2;
  state.accounts.cargoCostBasis.pepper = 100;
  const inspection = portugueseCartazInspectionStatus(state, {
    npcShipId: "portuguese-patrol-1",
    simMinute: 100,
    latitudeDeg: 15,
    longitudeDeg: 74
  });
  assert.equal(inspection.required, true);
  assert.equal(inspection.valid, false);
  assert.equal(inspection.controlledCargoQuantity, 2);

  const removed = surrenderPortugueseControlledCargo(
    state,
    "portuguese-patrol-1",
    100
  );
  assert.deepEqual(removed, [{ goodId: "pepper", quantity: 2 }]);
  assert.equal(state.cargo.pepper, undefined);
  assert.equal(state.accounts.cargoCostBasis.pepper, undefined);
  assert.equal(portugueseCartazInspectionStatus(state, {
    npcShipId: "portuguese-patrol-2",
    simMinute: 101,
    latitudeDeg: 15,
    longitudeDeg: 74
  }).valid, true);
});

test("Portuguese captains remain exempt when a patrol checks Cartaz status", () => {
  const state = createGameState({
    cargoCapacity: 30,
    playerCharacter: { ...PLAYER, nationalityId: "portugal" }
  });
  const inspection = portugueseCartazInspectionStatus(state, {
    npcShipId: "portuguese-patrol-1",
    simMinute: 100,
    latitudeDeg: 15,
    longitudeDeg: 74
  });

  assert.equal(inspection.required, false);
  assert.equal(inspection.valid, true);
  assert.ok(inspection.fine > 0);
});

test("inspection fines are punitive and provide grace without issuing a cartaz", () => {
  const fineState = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  const inspection = portugueseCartazInspectionStatus(fineState, {
    npcShipId: "portuguese-patrol-1",
    simMinute: 200,
    latitudeDeg: 15,
    longitudeDeg: 74
  });
  const lawfulFee = portugueseCartazStatus(fineState, GOA, 200).fee;
  assert.ok(inspection.fine > lawfulFee);
  assert.equal(Object.hasOwn(inspection, "permitFee"), false);
  assert.equal(Object.hasOwn(inspection, "canAffordPermit"), false);
  const before = fineState.doubloons;
  const settled = payPortugueseCartazFine(fineState, "portuguese-patrol-1", 200);
  assert.equal(fineState.doubloons, before - inspection.fine);
  assert.equal(settled.fine, inspection.fine);
  assert.equal(settled.graceUntilMinute, 200 + 7 * 1440);
  assert.equal(fineState.relations.portugueseCartaz.untilMinute, 0);
  assert.equal(fineState.relations.portugueseCartaz.issuedAtCityId, null);
});

test("version 38 voyages gain empty cartaz memory without losing their voyage", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  const legacy = structuredClone(state);
  legacy.version = 38;
  delete legacy.relations.portugueseCartaz;
  const migrated = migrateGameState(legacy);
  assert.equal(migrated.version, GAME_STATE_VERSION);
  assert.deepEqual(migrated.relations.portugueseCartaz, {
    issuedMinute: null,
    untilMinute: 0,
    issuedAtCityId: null,
    graceUntilMinute: 0,
    inspectedShipUntilMinute: {}
  });
});
