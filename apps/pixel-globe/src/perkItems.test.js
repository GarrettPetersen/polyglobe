import assert from "node:assert/strict";
import test from "node:test";

import { gameIconIds, perkItemIconId } from "./gameIcons.js";
import { createWorldEconomy } from "./economy.js";
import { PERK_ITEMS, perkItemById, perkItemOfferAtPort } from "./perkItems.js";

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
