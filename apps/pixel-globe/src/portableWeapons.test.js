import assert from "node:assert/strict";
import test from "node:test";
import {
  COMPOSITE_BOWS_ITEM_ID,
  CROSSBOWS_ITEM_ID,
  ENGLISH_LONGBOWS_ITEM_ID,
  INCENDIARY_ARROWS_ITEM_ID,
  MARINERS_BOWS_ITEM_ID,
  MATCHLOCK_ARQUEBUSES_ITEM_ID,
  SWIVEL_GUN_ITEM_ID,
  WHEELLOCK_PISTOLS_ITEM_ID,
  YUMI_ITEM_ID,
  activePortableWeaponAssignments,
  npcPortableWeaponItemIds,
  ownedPortableWeaponItemIds,
  portableWeaponItemById,
  regionalStarterPortableWeaponItemIds
} from "./portableWeapons.js";
import { effectiveCrewHitChance } from "./combatWounds.js";
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
  assert.equal(incendiary.hullDamage, 0.5);
  assert.equal(incendiary.incendiary, true);
  assert.ok(incendiary.rangeScale < plain.rangeScale);
  assert.ok(incendiary.reloadSeconds > plain.reloadSeconds);
});

test("modifier-only equipment survives inventory selection and converts owned bows", () => {
  const ownedItemIds = ownedPortableWeaponItemIds({
    [ENGLISH_LONGBOWS_ITEM_ID]: 1,
    [INCENDIARY_ARROWS_ITEM_ID]: 1,
    "sturdy-barrels": 1
  });
  assert.deepEqual(ownedItemIds, [ENGLISH_LONGBOWS_ITEM_ID, INCENDIARY_ARROWS_ITEM_ID]);
  const assignment = activePortableWeaponAssignments({
    ownedItemIds,
    activeCrew: 10,
    shipStats: STATS,
    installedCannons: 0,
    targetDistancePx: 20,
    baseRangePx: 74
  })[0];
  assert.equal(assignment.weapon.incendiary, true);
  assert.equal(assignment.weapon.hullDamage, 0.5);
});

test("crew staffing reserves sailors and gunners before assigning small arms", () => {
  const assignments = activePortableWeaponAssignments({
    ownedItemIds: [SWIVEL_GUN_ITEM_ID, MATCHLOCK_ARQUEBUSES_ITEM_ID, CROSSBOWS_ITEM_ID],
    activeCrew: 8,
    shipStats: STATS,
    installedCannons: 6,
    targetDistancePx: 20,
    baseRangePx: 74,
    targetCrewProtection: 60
  });
  assert.equal(assignments[0].weapon.itemId, SWIVEL_GUN_ITEM_ID);
  assert.equal(assignments[0].operators, 1);
  assert.ok(assignments.reduce((sum, entry) => sum + entry.operators, 0) < 8);
});

test("one small-arms purchase equips every free crew member while a swivel remains singular", () => {
  const assignments = activePortableWeaponAssignments({
    ownedItemIds: [SWIVEL_GUN_ITEM_ID, MATCHLOCK_ARQUEBUSES_ITEM_ID],
    activeCrew: 20,
    shipStats: STATS,
    installedCannons: 0,
    targetDistancePx: 20,
    baseRangePx: 74,
    targetCrewProtection: 60
  });
  assert.equal(assignments[0].weapon.itemId, SWIVEL_GUN_ITEM_ID);
  assert.equal(assignments[0].operators, 1);
  assert.equal(assignments[1].weapon.itemId, MATCHLOCK_ARQUEBUSES_ITEM_ID);
  assert.ok(assignments[1].operators > 5);
  assert.equal(assignments.length, 2);
});

test("arquebuses outperform crossbows when scarce crew choose small arms", () => {
  const crossbow = portableWeaponItemById(CROSSBOWS_ITEM_ID).weapon;
  const arquebus = portableWeaponItemById(MATCHLOCK_ARQUEBUSES_ITEM_ID).weapon;
  const expectedCrewDamagePerSecond = (weapon) => (
    weapon.crewDamage * weapon.crewHitChance / weapon.reloadSeconds
  );
  assert.ok(
    expectedCrewDamagePerSecond(arquebus) > expectedCrewDamagePerSecond(crossbow) * 1.15
  );

  const assignments = activePortableWeaponAssignments({
    ownedItemIds: [CROSSBOWS_ITEM_ID, MATCHLOCK_ARQUEBUSES_ITEM_ID],
    activeCrew: 8,
    shipStats: STATS,
    installedCannons: 0,
    targetDistancePx: 20,
    baseRangePx: 74
  });
  assert.equal(assignments[0].weapon.itemId, MATCHLOCK_ARQUEBUSES_ITEM_ID);
});

test("crews prefer penetration against protected targets and pistols on an exposed deck", () => {
  const assignmentsFor = (targetCrewProtection) => activePortableWeaponAssignments({
    ownedItemIds: [MATCHLOCK_ARQUEBUSES_ITEM_ID, WHEELLOCK_PISTOLS_ITEM_ID],
    activeCrew: 8,
    shipStats: STATS,
    installedCannons: 0,
    targetDistancePx: 20,
    baseRangePx: 74,
    targetCrewProtection
  });

  assert.equal(assignmentsFor(0)[0].weapon.itemId, WHEELLOCK_PISTOLS_ITEM_ID);
  assert.equal(assignmentsFor(60)[0].weapon.itemId, MATCHLOCK_ARQUEBUSES_ITEM_ID);
});

test("small arms follow a coherent range, damage, and protection curve", () => {
  const weapons = new Map([
    MARINERS_BOWS_ITEM_ID,
    ENGLISH_LONGBOWS_ITEM_ID,
    COMPOSITE_BOWS_ITEM_ID,
    YUMI_ITEM_ID,
    CROSSBOWS_ITEM_ID,
    MATCHLOCK_ARQUEBUSES_ITEM_ID,
    WHEELLOCK_PISTOLS_ITEM_ID,
    SWIVEL_GUN_ITEM_ID
  ].map((itemId) => [itemId, portableWeaponItemById(itemId).weapon]));
  const crewDps = (itemId, protection = 0) => {
    const weapon = weapons.get(itemId);
    return weapon.crewDamage * effectiveCrewHitChance(
      weapon.crewHitChance,
      protection,
      weapon.crewProtectionPenetration
    ) / weapon.reloadSeconds;
  };

  assert.ok(crewDps(CROSSBOWS_ITEM_ID) > crewDps(MARINERS_BOWS_ITEM_ID));
  assert.ok(crewDps(MATCHLOCK_ARQUEBUSES_ITEM_ID) > Math.max(
    crewDps(ENGLISH_LONGBOWS_ITEM_ID),
    crewDps(COMPOSITE_BOWS_ITEM_ID),
    crewDps(YUMI_ITEM_ID),
    crewDps(CROSSBOWS_ITEM_ID)
  ));
  assert.ok(crewDps(WHEELLOCK_PISTOLS_ITEM_ID) > crewDps(MATCHLOCK_ARQUEBUSES_ITEM_ID));
  assert.ok(crewDps(SWIVEL_GUN_ITEM_ID) > crewDps(WHEELLOCK_PISTOLS_ITEM_ID));
  assert.ok(crewDps(CROSSBOWS_ITEM_ID, 60) > crewDps(MARINERS_BOWS_ITEM_ID, 60));
  assert.ok(crewDps(MATCHLOCK_ARQUEBUSES_ITEM_ID, 60) > crewDps(CROSSBOWS_ITEM_ID, 60));

  const arquebus = weapons.get(MATCHLOCK_ARQUEBUSES_ITEM_ID);
  assert.ok(
    weapons.get(ENGLISH_LONGBOWS_ITEM_ID).rangeScale > arquebus.rangeScale &&
    arquebus.rangeScale > weapons.get(WHEELLOCK_PISTOLS_ITEM_ID).rangeScale
  );
});

test("NPC military loadouts are deterministic and can layer firearms over bows", () => {
  const input = {
    factionId: "portugal", cityType: "mediterranean", shipSlug: "carrack",
    role: "warship", cannons: 26, identityKey: "warship-17"
  };
  assert.deepEqual(npcPortableWeaponItemIds(input), npcPortableWeaponItemIds(input));
  assert.ok(npcPortableWeaponItemIds(input).some((id) => portableWeaponItemById(id).weapon?.crewDamage > 0));
});
