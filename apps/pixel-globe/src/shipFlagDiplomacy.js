import {
  DIPLOMACY_ALLY,
  DIPLOMACY_FRIENDLY,
  DIPLOMACY_HOSTILE,
  DIPLOMACY_NEUTRAL,
  DIPLOMACY_WAR
} from "./factions.js";

export const SHIP_FLAG_ENEMY_OUTLINE_COLOR = "#e83b3b";
export const SHIP_FLAG_ALLY_OUTLINE_COLOR = "#38b764";

export function shipFlagDiplomacyOutlineColor(
  relation,
  { hostileToPlayer = false, inCombatWithPlayer = false } = {}
) {
  if (typeof hostileToPlayer !== "boolean" || typeof inCombatWithPlayer !== "boolean") {
    throw new Error("Ship flag player hostility state must be boolean");
  }
  if (hostileToPlayer || inCombatWithPlayer) return SHIP_FLAG_ENEMY_OUTLINE_COLOR;
  if (relation === DIPLOMACY_WAR) return SHIP_FLAG_ENEMY_OUTLINE_COLOR;
  if (relation === DIPLOMACY_ALLY) return SHIP_FLAG_ALLY_OUTLINE_COLOR;
  if ([DIPLOMACY_HOSTILE, DIPLOMACY_NEUTRAL, DIPLOMACY_FRIENDLY].includes(relation)) {
    return null;
  }
  throw new Error(`Invalid ship flag diplomatic relation: ${relation}`);
}
