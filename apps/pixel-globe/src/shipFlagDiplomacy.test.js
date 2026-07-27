import assert from "node:assert/strict";
import test from "node:test";

import {
  DIPLOMACY_ALLY,
  DIPLOMACY_FRIENDLY,
  DIPLOMACY_HOSTILE,
  DIPLOMACY_NEUTRAL,
  DIPLOMACY_WAR
} from "./factions.js";
import {
  SHIP_FLAG_ALLY_OUTLINE_COLOR,
  SHIP_FLAG_ENEMY_OUTLINE_COLOR,
  shipFlagDiplomacyOutlineColor
} from "./shipFlagDiplomacy.js";

test("ship flags only outline formal enemies and allies", () => {
  assert.equal(shipFlagDiplomacyOutlineColor(DIPLOMACY_WAR), SHIP_FLAG_ENEMY_OUTLINE_COLOR);
  assert.equal(shipFlagDiplomacyOutlineColor(DIPLOMACY_ALLY), SHIP_FLAG_ALLY_OUTLINE_COLOR);
  assert.equal(shipFlagDiplomacyOutlineColor(DIPLOMACY_HOSTILE), null);
  assert.equal(shipFlagDiplomacyOutlineColor(DIPLOMACY_NEUTRAL), null);
  assert.equal(shipFlagDiplomacyOutlineColor(DIPLOMACY_FRIENDLY), null);
  assert.throws(() => shipFlagDiplomacyOutlineColor("unknown"), /Invalid ship flag/);
});

test("personal outlaw status and active combat override national friendship", () => {
  assert.equal(
    shipFlagDiplomacyOutlineColor(DIPLOMACY_ALLY, { hostileToPlayer: true }),
    SHIP_FLAG_ENEMY_OUTLINE_COLOR
  );
  assert.equal(
    shipFlagDiplomacyOutlineColor(DIPLOMACY_FRIENDLY, { inCombatWithPlayer: true }),
    SHIP_FLAG_ENEMY_OUTLINE_COLOR
  );
  assert.throws(
    () => shipFlagDiplomacyOutlineColor(DIPLOMACY_ALLY, { hostileToPlayer: "yes" }),
    /must be boolean/
  );
});
