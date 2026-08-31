import assert from "node:assert/strict";
import test from "node:test";

import { gameIconIds, perkItemIconId } from "./gameIcons.js";
import { createWorldEconomy } from "./economy.js";
import {
  HAJJ_PILGRIMAGE_PERK_ITEM_ID,
  PERK_ITEMS,
  missionGiftItem,
  perkItemById,
  perkItemOfferAtPort
} from "./perkItems.js";
import {
  MATCHLOCK_ARQUEBUSES_ITEM_ID,
  WHEELLOCK_PISTOLS_ITEM_ID
} from "./portableWeapons.js";

test("every perk item has a registered native game icon", () => {
  const icons = new Set(gameIconIds());
  for (const item of PERK_ITEMS) assert.ok(icons.has(perkItemIconId(item.id)), item.id);
});

test("weapons and rigging retain their regional identities", () => {
  assert.deepEqual(perkItemById("katana").regions, ["japan"]);
  assert.deepEqual(perkItemById("tulwar").regions, ["south-asia"]);
  assert.deepEqual(perkItemById("flemish-sailcloth").regions, ["europe"]);
  assert.deepEqual(perkItemById("coir-cordage").regions, ["indian-ocean"]);
});

test("the Hajj reward is a pilgrimage-exclusive water-saving item", () => {
  const item = perkItemById(HAJJ_PILGRIMAGE_PERK_ITEM_ID);
  assert.equal(item.rewardOnly, true);
  assert.equal(item.perks.waterDurationMultiplier, 1.1);
  const city = {
    tileId: 14,
    portId: "jeddah",
    city: "Jeddah",
    factionId: "ottoman",
    cityType: "desert"
  };
  assert.notEqual(
    missionGiftItem({ city, identityKey: "ordinary-mission", ownedItemIds: [] })?.id,
    HAJJ_PILGRIMAGE_PERK_ITEM_ID
  );
});

test("the suite covers storage, navigation, combat, fishing, and scavenging", () => {
  const keys = new Set(PERK_ITEMS.flatMap((item) => Object.keys(item.perks)));
  for (const key of [
    "cargoCapacityFlat",
    "topSpeedMultiplier",
    "windwardAngleReductionDeg",
    "assaultChanceBonus",
    "fishingChanceMultiplier",
    "scavengingChanceMultiplier",
    "damageResistanceChance"
  ]) assert.ok(keys.has(key), key);
});

test("special equipment is an uncommon single-item port lottery", () => {
  const ports = Array.from({ length: 240 }, (_, index) => ({
    cityId: `lottery-port-${index}|portugal`,
    tileId: 9000 + index,
    city: `Lottery Port ${index}`,
    country: "Portugal",
    cityType: "mediterranean",
    factionId: "portugal",
    population: 70000
  }));
  const economy = createWorldEconomy({ ports, startMinute: 0 });
  const offers = ports.map((city) => perkItemOfferAtPort(economy, city));
  const stockedCount = offers.filter(Boolean).length;

  assert.ok(stockedCount >= 10, `only ${stockedCount} ports stocked an item`);
  assert.ok(stockedCount <= 50, `${stockedCount} ports stocked an item`);
  assert.deepEqual(offers, ports.map((city) => perkItemOfferAtPort(economy, city)));
});

test("a port selling matchlocks also offers arquebuses as equipment", () => {
  const lisbon = {
    tileId: 1,
    portId: "lisbon",
    cityId: "lisbon|portugal",
    city: "Lisbon",
    country: "Portugal",
    cityType: "mediterranean",
    factionId: "portugal",
    population: 100000
  };
  const economy = createWorldEconomy({ ports: [lisbon], startMinute: 0 });
  assert.equal(perkItemOfferAtPort(economy, lisbon).id, MATCHLOCK_ARQUEBUSES_ITEM_ID);
  assert.notEqual(
    perkItemOfferAtPort(economy, lisbon, { ownedItemIds: [MATCHLOCK_ARQUEBUSES_ITEM_ID] })?.id,
    MATCHLOCK_ARQUEBUSES_ITEM_ID
  );
  assert.notEqual(
    perkItemOfferAtPort(economy, lisbon, { ownedItemIds: [WHEELLOCK_PISTOLS_ITEM_ID] })?.id,
    MATCHLOCK_ARQUEBUSES_ITEM_ID
  );
});
