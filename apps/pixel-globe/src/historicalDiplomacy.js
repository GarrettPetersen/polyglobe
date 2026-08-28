import {
  DIPLOMACY_HOSTILE,
  DIPLOMACY_NEUTRAL
} from "./factions.js";
import { gameMinuteForDate } from "./rulers.js";
import {
  declareDiplomaticWar,
  diplomacyPairKey,
  rawWorldDiplomacyBetween
} from "./worldDiplomacy.js";

export const ENGLISH_DECLARATION_OF_WAR_MINUTE = gameMinuteForDate(1522, 5, 29);
export const RHODES_WAR_WARNING_MINUTE = gameMinuteForDate(1522, 6, 1);
export const LUBECK_DANISH_WAR_MINUTE = gameMinuteForDate(1522, 6, 1);

const TRANSITIONS = Object.freeze([
  transition(
    "historicalDiplomacy:english-declaration-1522",
    ENGLISH_DECLARATION_OF_WAR_MINUTE,
    "england",
    "france",
    DIPLOMACY_HOSTILE,
    "Henry VIII's declaration of 29 May 1522"
  ),
  transition(
    "historicalDiplomacy:rhodes-campaign-1522",
    RHODES_WAR_WARNING_MINUTE,
    "ottoman",
    "hospitallers",
    DIPLOMACY_HOSTILE,
    "Suleiman's warning of the Rhodes expedition"
  ),
  transition(
    "historicalDiplomacy:lubeck-danish-war-1522",
    LUBECK_DANISH_WAR_MINUTE,
    "lubeck",
    "denmark-norway",
    DIPLOMACY_NEUTRAL,
    "Lubeck's 1522 war against Christian II"
  )
]);

export function nextHistoricalDiplomacyMinute(state) {
  assertState(state);
  return TRANSITIONS
    .filter(({ flag }) => state.memory.flags[flag] === undefined)
    .reduce((minimum, entry) => Math.min(minimum, entry.minute), Infinity);
}

export function advanceHistoricalDiplomacy(state, currentMinute, influence = {}) {
  assertState(state);
  if (!Number.isFinite(currentMinute) || currentMinute < 0) {
    throw new Error(`Invalid historical diplomacy minute: ${currentMinute}`);
  }
  const transitions = [];
  for (const entry of TRANSITIONS) {
    if (state.memory.flags[entry.flag] !== undefined || currentMinute < entry.minute) continue;
    const diplomacy = state.relations.diplomacy;
    const pairKey = diplomacyPairKey(entry.attackerFactionId, entry.defenderFactionId);
    const relation = rawWorldDiplomacyBetween(
      diplomacy,
      entry.attackerFactionId,
      entry.defenderFactionId
    );
    const inactiveFactionIds = state.memory.conquest?.collapsedFactionIds || [];
    if (!Array.isArray(inactiveFactionIds)) {
      throw new Error("Historical diplomacy requires a valid conquest ledger");
    }
    const historyDiverged = inactiveFactionIds.includes(entry.attackerFactionId) ||
      inactiveFactionIds.includes(entry.defenderFactionId) ||
      (influence.lockedPairKeys || []).includes(pairKey) ||
      diplomacy.pairLastChangedMinute[pairKey] !== undefined ||
      relation !== entry.expectedRelation;
    if (historyDiverged) {
      state.memory.flags[entry.flag] = "averted";
      continue;
    }
    const diplomacyEvents = declareDiplomaticWar(
      diplomacy,
      entry.attackerFactionId,
      entry.defenderFactionId,
      entry.minute,
      { ...influence, source: entry.source }
    );
    if (!diplomacyEvents.some((event) => event.kind === "war" &&
        [event.factionAId, event.factionBId].includes(entry.attackerFactionId) &&
        [event.factionAId, event.factionBId].includes(entry.defenderFactionId))) {
      throw new Error(`Historical declaration produced no war: ${entry.flag}`);
    }
    state.memory.flags[entry.flag] = "completed";
    transitions.push(Object.freeze({
      id: entry.flag,
      simMinute: entry.minute,
      attackerFactionId: entry.attackerFactionId,
      defenderFactionId: entry.defenderFactionId,
      source: entry.source,
      diplomacyEvents: Object.freeze(diplomacyEvents)
    }));
  }
  return Object.freeze(transitions);
}

function transition(flag, minute, attackerFactionId, defenderFactionId, expectedRelation, source) {
  return Object.freeze({
    flag,
    minute,
    attackerFactionId,
    defenderFactionId,
    expectedRelation,
    source
  });
}

function assertState(state) {
  if (!state?.memory?.flags || !state?.relations?.diplomacy) {
    throw new Error("Historical diplomacy requires game state flags and world diplomacy");
  }
}
