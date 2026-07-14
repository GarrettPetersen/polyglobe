import { NEUTRAL_FACTION_ID, assertFactionId } from "./factions.js";
import { gameMinuteForDate } from "./rulers.js";

export const MING_FACTION_ID = "ming";
export const DEFAULT_MING_OPEN_TRADE_FACTION_IDS = Object.freeze(["joseon"]);
export const MING_TRADE_RESTRICTION_END_MINUTE = gameMinuteForDate(1567, 2, 4);
export const MING_ILLICIT_MARKET_SUCCESS_CHANCE = 0.55;
export const MING_ILLICIT_MARKET_REPUTATION_PENALTY = 8;

export function mingTradeAccess({
  portFactionId,
  traderFactionId,
  simMinute,
  openTrade = false,
  illicitAccess = false,
  disguisedEntry = false
}) {
  if (typeof portFactionId !== "string" || portFactionId.trim() === "") {
    throw new Error("Ming trade access requires a port faction");
  }
  assertFactionId(portFactionId);
  const normalizedTraderFactionId = traderFactionId || NEUTRAL_FACTION_ID;
  assertFactionId(normalizedTraderFactionId);
  if (!Number.isFinite(simMinute) || simMinute < 0) {
    throw new Error(`Invalid Ming trade access minute: ${simMinute}`);
  }
  if (typeof openTrade !== "boolean" || typeof illicitAccess !== "boolean" || typeof disguisedEntry !== "boolean") {
    throw new Error("Ming trade access flags must be boolean");
  }

  const restricted = portFactionId === MING_FACTION_ID && simMinute < MING_TRADE_RESTRICTION_END_MINUTE;
  const domesticAccess = restricted && normalizedTraderFactionId === MING_FACTION_ID;
  const lawfulExemption = restricted && (domesticAccess || openTrade);
  const illicit = restricted && !lawfulExemption && (illicitAccess || disguisedEntry);
  const allowed = !restricted || lawfulExemption || illicit;
  return Object.freeze({
    restricted,
    allowed,
    lawful: allowed && !illicit,
    illicit,
    domesticAccess,
    lawfulExemption,
    portFactionId,
    traderFactionId: normalizedTraderFactionId
  });
}

export function resolveMingIllicitMarketAttempt(roll) {
  if (!Number.isFinite(roll) || roll < 0 || roll >= 1) {
    throw new Error(`Invalid Ming illicit market roll: ${roll}`);
  }
  return roll < MING_ILLICIT_MARKET_SUCCESS_CHANCE;
}
