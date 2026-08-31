import assert from "node:assert/strict";
import test from "node:test";

import { createWorldEconomy } from "./economy.js";
import {
  completeSpecialEquipmentOfferPurchase,
  createSpecialEquipmentOfferMemory,
  ensureSpecialEquipmentOffer,
  openSpecialEquipmentOffer,
  specialEquipmentOfferEntry,
  validateSpecialEquipmentOfferMemory
} from "./specialEquipmentOffers.js";
import { CROSSBOWS_ITEM_ID, MARINERS_BOWS_ITEM_ID } from "./portableWeapons.js";

const CITY = Object.freeze({
  tileId: 17,
  cityId: "porto novo|portugal",
  city: "Porto Novo",
  country: "Portugal",
  cityType: "mediterranean",
  factionId: "portugal",
  population: 70000
});
const OFFER_SEED = "dialogue-test-15";

test("a declined special item stays at its port and prompts reconsideration", () => {
  const economy = createWorldEconomy({ ports: [CITY], startMinute: 0, seedKey: OFFER_SEED });
  const memory = createSpecialEquipmentOfferMemory();
  const first = openSpecialEquipmentOffer(memory, economy, CITY, { seedKey: OFFER_SEED });
  const second = openSpecialEquipmentOffer(memory, economy, CITY, { seedKey: OFFER_SEED });

  assert.ok(first.item.id);
  assert.equal(first.reconsidered, false);
  assert.equal(second.item.id, first.item.id);
  assert.equal(second.reconsidered, true);
  assert.equal(specialEquipmentOfferEntry(memory, CITY).timesOffered, 2);
});

test("checking special stock does not count as presenting it to the player", () => {
  const economy = createWorldEconomy({ ports: [CITY], startMinute: 0, seedKey: OFFER_SEED });
  const memory = createSpecialEquipmentOfferMemory();
  const item = ensureSpecialEquipmentOffer(memory, economy, CITY, { seedKey: OFFER_SEED });

  assert.ok(item.id);
  assert.equal(specialEquipmentOfferEntry(memory, CITY).timesOffered, 0);
  assert.equal(openSpecialEquipmentOffer(memory, economy, CITY, { seedKey: OFFER_SEED }).reconsidered, false);
});

test("a purchased special item cannot be offered or completed twice", () => {
  const economy = createWorldEconomy({ ports: [CITY], startMinute: 0, seedKey: OFFER_SEED });
  const memory = createSpecialEquipmentOfferMemory();
  const offer = openSpecialEquipmentOffer(memory, economy, CITY, { seedKey: OFFER_SEED });

  assert.equal(completeSpecialEquipmentOfferPurchase(memory, CITY, offer.item.id).id, offer.item.id);
  assert.equal(openSpecialEquipmentOffer(memory, economy, CITY, { seedKey: OFFER_SEED }), null);
  assert.throws(
    () => completeSpecialEquipmentOfferPurchase(memory, CITY, offer.item.id),
    /No active special equipment offer/
  );
  assert.equal(validateSpecialEquipmentOfferMemory(memory), memory);
});

test("an obsolete small-arms offer is retired after the player acquires better arms", () => {
  const economy = createWorldEconomy({ ports: [CITY], startMinute: 0 });
  const memory = createSpecialEquipmentOfferMemory();
  memory.byPort[CITY.cityId] = {
    itemId: MARINERS_BOWS_ITEM_ID,
    timesOffered: 1,
    purchased: false
  };

  const replacement = ensureSpecialEquipmentOffer(memory, economy, CITY, {
    ownedItemIds: [CROSSBOWS_ITEM_ID]
  });

  assert.notEqual(replacement?.id, MARINERS_BOWS_ITEM_ID);
  assert.notEqual(specialEquipmentOfferEntry(memory, CITY)?.itemId, MARINERS_BOWS_ITEM_ID);
});
