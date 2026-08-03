export const PLAYER_SHIP_COMBAT_COLOR = "#f9c22b";
export const FRIENDLY_SHIP_COMBAT_COLOR = "#8fd3ff";
export const ENEMY_SHIP_COMBAT_COLOR = "#e83b3b";
export const NEUTRAL_SHIP_COMBAT_COLOR = "#9babb2";

export function shipCombatAllegianceColor(combatAllegiance) {
  if (combatAllegiance === "enemy") return ENEMY_SHIP_COMBAT_COLOR;
  if (combatAllegiance === "friendly" || combatAllegiance === "ally") {
    return FRIENDLY_SHIP_COMBAT_COLOR;
  }
  if (combatAllegiance === null || combatAllegiance === undefined) {
    return NEUTRAL_SHIP_COMBAT_COLOR;
  }
  throw new Error(`Unknown ship combat allegiance: ${combatAllegiance}`);
}
