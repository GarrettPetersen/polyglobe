import assert from "node:assert/strict";
import test from "node:test";
import {
  CROSSBOWS_ITEM_ID,
  ENGLISH_LONGBOWS_ITEM_ID,
  INCENDIARY_ARROWS_ITEM_ID,
  MARINERS_BOWS_ITEM_ID,
  MATCHLOCK_ARQUEBUSES_ITEM_ID,
  SWIVEL_GUN_ITEM_ID,
  YUMI_ITEM_ID,
  activePortableWeaponAssignments,
  npcPortableWeaponItemIds,
  portableWeaponItemById,
  regionalStarterPortableWeaponItemIds
} from "./portableWeapons.js";
import { GRAMMATICAL_NUMBER_PLURAL } from "./grammaticalNumber.js";
import { shipStatsForSlug } from "./shipStats.js";

const STATS = shipStatsForSlug("brigantine");

test("regional starter arms are portable rather than hull properties", () => {
  assert.deepEqual(regionalStarterPortableWeaponItemIds({ factionId: "england" }), [ENGLISH_LONGBOWS_ITEM_ID]);
  assert.deepEqual(regionalStarterPortableWeaponItemIds({ factionId: "japan" }), [YUMI_ITEM_ID]);
  assert.deepEqual(regionalStarterPortableWeaponItemIds({ factionId: "ming" }), [CROSSBOWS_ITEM_ID]);
  assert.deepEqual(regionalStarterPortableWeaponItemIds({ factionId: "neutral" }), [MARINERS_BOWS_ITEM_ID]);
  assert.equal(
    portableWeaponItemById(MARINERS_BOWS_ITEM_ID).grammaticalNumber,
    GRAMMATICAL_NUMBER_PLURAL
  );
});

test("incendiary arrows trade bow range and reload speed for hull damage", () => {
  const plain = activePortableWeaponAssignments({
    ownedItemIds: [ENGLISH_LONGBOWS_ITEM_ID], activeCrew: 10, shipStats: STATS,
    installedCannons: 0, targetDistancePx: 20, baseRangePx: 74
  })[0].weapon;
  const incendiary = activePortableWeaponAssignments({
    ownedItemIds: [ENGLISH_LONGBOWS_ITEM_ID, INCENDIARY_ARROWS_ITEM_ID], activeCrew: 10,
    shipStats: STATS, installedCannons: 0, targetDistancePx: 20, baseRangePx: 74
  })[0].weapon;
  assert.equal(plain.hullDamage, 0);
  assert.ok(incendiary.hullDamage > 0);
  assert.ok(incendiary.rangeScale < plain.rangeScale);
  assert.ok(incendiary.reloadSeconds > plain.reloadSeconds);
});

test("crew staffing reserves sailors and gunners before assigning small arms", () => {
  const assignments = activePortableWeaponAssignments({
    ownedItemIds: [SWIVEL_GUN_ITEM_ID, MATCHLOCK_ARQUEBUSES_ITEM_ID, CROSSBOWS_ITEM_ID],
    activeCrew: 8,
    shipStats: STATS,
    installedCannons: 6,
    targetDistancePx: 20,
    baseRangePx: 74
  });
  assert.equal(assignments[0].weapon.itemId, SWIVEL_GUN_ITEM_ID);
  assert.equal(assignments[0].operators, 1);
  assert.ok(assignments.reduce((sum, entry) => sum + entry.operators, 0) < 8);
});

test("NPC military loadouts are deterministic and can layer firearms over bows", () => {
  const input = {
    factionId: "portugal", cityType: "mediterranean", shipSlug: "carrack",
    role: "warship", cannons: 26, identityKey: "warship-17"
  };
  assert.deepEqual(npcPortableWeaponItemIds(input), npcPortableWeaponItemIds(input));
  assert.ok(npcPortableWeaponItemIds(input).some((id) => portableWeaponItemById(id).weapon?.crewDamage > 0));
});
