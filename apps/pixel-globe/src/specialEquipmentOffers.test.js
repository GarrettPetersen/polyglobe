import assert from "node:assert/strict";
import test from "node:test";

import { createWorldEconomy } from "./economy.js";
import {
  completeSpecialEquipmentOfferPurchase,
  createSpecialEquipmentOfferMemory,
  openSpecialEquipmentOffer,
  specialEquipmentOfferEntry,
  validateSpecialEquipmentOfferMemory
} from "./specialEquipmentOffers.js";

const CITY = Object.freeze({
  tileId: 17,
  city: "Porto Novo",
  country: "Portugal",
  cityType: "mediterranean",
  factionId: "portugal",
  population: 70000
});

test("a declined special item stays at its port and prompts reconsideration", () => {
  const economy = createWorldEconomy({ ports: [CITY], startMinute: 0 });
  const memory = createSpecialEquipmentOfferMemory();
  const first = openSpecialEquipmentOffer(memory, economy, CITY);
  const second = openSpecialEquipmentOffer(memory, economy, CITY);

  assert.equal(first.item.id, "bronze-fish-hooks");
  assert.equal(first.reconsidered, false);
  assert.equal(second.item.id, first.item.id);
  assert.equal(second.reconsidered, true);
  assert.equal(specialEquipmentOfferEntry(memory, CITY).timesOffered, 2);
});

test("a purchased special item cannot be offered or completed twice", () => {
  const economy = createWorldEconomy({ ports: [CITY], startMinute: 0 });
  const memory = createSpecialEquipmentOfferMemory();
  const offer = openSpecialEquipmentOffer(memory, economy, CITY);

  assert.equal(completeSpecialEquipmentOfferPurchase(memory, CITY, offer.item.id).id, offer.item.id);
  assert.equal(openSpecialEquipmentOffer(memory, economy, CITY), null);
  assert.throws(
    () => completeSpecialEquipmentOfferPurchase(memory, CITY, offer.item.id),
    /No active special equipment offer/
  );
  assert.equal(validateSpecialEquipmentOfferMemory(memory), memory);
});
