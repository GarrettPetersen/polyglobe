import { PORT_CITY_LOCATION } from "./portCityNavigation.js";
import { dayNightPaletteVariant } from "./dayNightPalette.js";

export const LAKE_BATTLE_PORT_ASSAULT_CITY_DESTINATION_IDS = Object.freeze([
  PORT_CITY_LOCATION.SHIP,
  PORT_CITY_LOCATION.SET_SAIL
]);

export function lakeBattlePortAssaultPaletteVariant() {
  return dayNightPaletteVariant({ sunset: 0, night: 0 });
}

export function lakeBattleOffersPortAssault(battle) {
  if (!battle || typeof battle !== "object") {
    throw new Error("Lake battle port assault availability requires a battle");
  }
  if (!battle.enemy || !["ship", "city"].includes(battle.enemy.kind)) {
    throw new Error("Lake battle port assault availability requires an enemy combatant");
  }
  if (![null, "victory", "defeat", "draw"].includes(battle.outcome)) {
    throw new Error(`Unknown lake battle outcome: ${battle.outcome}`);
  }
  return battle.outcome === "victory" && battle.enemy.kind === "city";
}
