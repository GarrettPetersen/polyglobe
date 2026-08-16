import { CANONICAL_PORTS, requireCanonicalPort } from "./canonicalPorts.js";
import { effectivePortFactionId, replaceFactionAtControlledCities } from "./portConquest.js";
import { gameMinuteForDate } from "./rulers.js";
import { adjustSovereignAuthority } from "./sovereignAuthority.js";
import { succeedDiplomaticFaction } from "./worldDiplomacy.js";

export const FIRST_BATTLE_OF_PANIPAT_MINUTE = gameMinuteForDate(1526, 4, 21);
export const MUGHAL_SUCCESSION_FLAG = "historicalSovereignty:first-battle-of-panipat";

const DELHI_FACTION_ID = "delhi";
const MUGHAL_FACTION_ID = "mughal";
const PANIPAT_SOURCE = "first-battle-of-panipat";

export function nextHistoricalSovereigntyMinute(state) {
  assertStateMemory(state);
  return state.memory.flags[MUGHAL_SUCCESSION_FLAG] === undefined
    ? FIRST_BATTLE_OF_PANIPAT_MINUTE
    : Infinity;
}

export function advanceHistoricalSovereignty(state, currentMinute, { portCities }) {
  assertStateMemory(state);
  if (!Number.isFinite(currentMinute) || currentMinute < 0) {
    throw new Error(`Invalid historical sovereignty minute: ${currentMinute}`);
  }
  if (!Array.isArray(portCities)) {
    throw new Error("Historical sovereignty requires the port catalog");
  }
  if (state.memory.flags[MUGHAL_SUCCESSION_FLAG] !== undefined ||
      currentMinute < FIRST_BATTLE_OF_PANIPAT_MINUTE) {
    return Object.freeze([]);
  }

  const agra = requireCanonicalPort(
    portCities,
    CANONICAL_PORTS.AGRA,
    "First Battle of Panipat"
  );
  const conquest = state.memory.conquest;
  const delhiStillRules = !conquest.collapsedFactionIds.includes(DELHI_FACTION_ID) &&
    effectivePortFactionId(conquest, agra) === DELHI_FACTION_ID;
  if (!delhiStillRules) {
    state.memory.flags[MUGHAL_SUCCESSION_FLAG] = "averted";
    return Object.freeze([]);
  }

  const conquestEvent = replaceFactionAtControlledCities(conquest, portCities, {
    predecessorFactionId: DELHI_FACTION_ID,
    successorFactionId: MUGHAL_FACTION_ID,
    capitalCity: agra,
    simMinute: FIRST_BATTLE_OF_PANIPAT_MINUTE,
    source: PANIPAT_SOURCE
  });
  const diplomacyEvent = succeedDiplomaticFaction(state.relations.diplomacy, {
    predecessorFactionId: DELHI_FACTION_ID,
    successorFactionId: MUGHAL_FACTION_ID,
    simMinute: FIRST_BATTLE_OF_PANIPAT_MINUTE,
    source: PANIPAT_SOURCE,
    headline: "Babur defeats Ibrahim Lodi at Panipat and founds the Mughal Empire at Agra."
  });
  const authorityEvent = adjustSovereignAuthority(state.relations.authority, MUGHAL_FACTION_ID, 8, {
    simMinute: FIRST_BATTLE_OF_PANIPAT_MINUTE,
    source: PANIPAT_SOURCE,
    detail: "Babur's victory at Panipat establishes Mughal rule from Agra."
  });
  inheritPlayerRelations(state.relations, DELHI_FACTION_ID, MUGHAL_FACTION_ID);
  const playerFactionChanged = state.playerCharacter?.nationalityId === DELHI_FACTION_ID;
  if (playerFactionChanged) {
    state.playerCharacter = Object.freeze({
      ...state.playerCharacter,
      nationalityId: MUGHAL_FACTION_ID
    });
  }
  state.memory.flags[MUGHAL_SUCCESSION_FLAG] = "completed";
  return Object.freeze([Object.freeze({
    id: PANIPAT_SOURCE,
    predecessorFactionId: DELHI_FACTION_ID,
    successorFactionId: MUGHAL_FACTION_ID,
    simMinute: FIRST_BATTLE_OF_PANIPAT_MINUTE,
    playerFactionChanged,
    conquestEvent,
    diplomacyEvent,
    authorityEvent
  })]);
}

function inheritPlayerRelations(relations, predecessorFactionId, successorFactionId) {
  if (!relations?.factionReputation || !relations.lettersOfMarque ||
      !relations.safePassageUntilMinute || !relations.safePassageRefusalUntilMinute) {
    throw new Error("Historical sovereignty requires player relation ledgers");
  }
  relations.factionReputation[successorFactionId] = relations.factionReputation[predecessorFactionId];
  if (relations.lettersOfMarque[predecessorFactionId]) {
    relations.lettersOfMarque[successorFactionId] = {
      ...relations.lettersOfMarque[predecessorFactionId],
      factionId: successorFactionId
    };
    delete relations.lettersOfMarque[predecessorFactionId];
  }
  inheritTimedRelation(relations.safePassageUntilMinute, predecessorFactionId, successorFactionId);
  inheritTimedRelation(relations.safePassageRefusalUntilMinute, predecessorFactionId, successorFactionId);
}

function inheritTimedRelation(table, predecessorFactionId, successorFactionId) {
  if (Number.isFinite(table[predecessorFactionId])) {
    table[successorFactionId] = Math.max(
      table[successorFactionId] || 0,
      table[predecessorFactionId]
    );
    delete table[predecessorFactionId];
  }
}

function assertStateMemory(state) {
  if (!state?.memory?.flags || !state.memory.conquest || !state.relations) {
    throw new Error("Historical sovereignty requires game state memory and relations");
  }
}
