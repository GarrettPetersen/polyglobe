import assert from "node:assert/strict";
import test from "node:test";

import {
  DIPLOMACY_HOSTILE,
  DIPLOMACY_NEUTRAL,
  DIPLOMACY_WAR
} from "./factions.js";
import {
  ENGLISH_DECLARATION_OF_WAR_MINUTE,
  LUBECK_DANISH_WAR_MINUTE,
  RHODES_WAR_WARNING_MINUTE,
  advanceHistoricalDiplomacy,
  nextHistoricalDiplomacyMinute
} from "./historicalDiplomacy.js";
import {
  activeGameTradeEmbargoes,
  advanceGamePolitics,
  createGameState
} from "./gameState.js";
import { gameMinuteForDate } from "./rulers.js";
import {
  adjustDiplomaticStance,
  createWorldDiplomacy,
  rawWorldDiplomacyBetween
} from "./worldDiplomacy.js";

test("England declares war on France on 29 May rather than at the March opening", () => {
  const state = historicalState();
  assert.equal(rawWorldDiplomacyBetween(state.relations.diplomacy, "england", "france"),
    DIPLOMACY_HOSTILE);
  assert.equal(nextHistoricalDiplomacyMinute(state), ENGLISH_DECLARATION_OF_WAR_MINUTE);
  assert.deepEqual(advanceHistoricalDiplomacy(state, ENGLISH_DECLARATION_OF_WAR_MINUTE - 1), []);

  const [transition] = advanceHistoricalDiplomacy(state, ENGLISH_DECLARATION_OF_WAR_MINUTE);
  assert.equal(transition.attackerFactionId, "england");
  assert.equal(transition.defenderFactionId, "france");
  assert.equal(rawWorldDiplomacyBetween(state.relations.diplomacy, "england", "france"),
    DIPLOMACY_WAR);
});

test("the Rhodes campaign and Lubeck's Danish war begin in June", () => {
  const state = historicalState();
  state.memory.flags["historicalDiplomacy:english-declaration-1522"] = "completed";
  assert.equal(rawWorldDiplomacyBetween(state.relations.diplomacy, "ottoman", "hospitallers"),
    DIPLOMACY_HOSTILE);
  assert.equal(rawWorldDiplomacyBetween(state.relations.diplomacy, "lubeck", "denmark-norway"),
    DIPLOMACY_NEUTRAL);

  const transitions = advanceHistoricalDiplomacy(state, RHODES_WAR_WARNING_MINUTE);
  assert.equal(transitions.length, 2);
  assert.equal(RHODES_WAR_WARNING_MINUTE, LUBECK_DANISH_WAR_MINUTE);
  assert.equal(rawWorldDiplomacyBetween(state.relations.diplomacy, "ottoman", "hospitallers"),
    DIPLOMACY_WAR);
  assert.equal(rawWorldDiplomacyBetween(state.relations.diplomacy, "lubeck", "denmark-norway"),
    DIPLOMACY_WAR);
});

test("a player-created rapprochement averts the scripted English declaration", () => {
  const state = historicalState();
  adjustDiplomaticStance(
    state.relations.diplomacy,
    "england",
    "france",
    "improve",
    ENGLISH_DECLARATION_OF_WAR_MINUTE - 1
  );
  assert.deepEqual(advanceHistoricalDiplomacy(state, ENGLISH_DECLARATION_OF_WAR_MINUTE), []);
  assert.equal(state.memory.flags["historicalDiplomacy:english-declaration-1522"], "averted");
  assert.equal(rawWorldDiplomacyBetween(state.relations.diplomacy, "england", "france"),
    DIPLOMACY_NEUTRAL);
});

test("the dated declaration and its trade ban advance together in game politics", () => {
  const state = createGameState({
    cargoCapacity: 20,
    startMinute: gameMinuteForDate(1522, 3, 21)
  });
  const result = advanceGamePolitics(state, ENGLISH_DECLARATION_OF_WAR_MINUTE);
  assert.equal(result.historicalDiplomaticTransitions.length, 1);
  assert.equal(rawWorldDiplomacyBetween(state.relations.diplomacy, "england", "france"),
    DIPLOMACY_WAR);
  assert.ok(activeGameTradeEmbargoes(state).some((order) => (
    order.issuerFactionId === "england" && order.targetFactionId === "france" &&
    order.imposedMinute === ENGLISH_DECLARATION_OF_WAR_MINUTE
  )));
});

function historicalState() {
  return {
    memory: { flags: {} },
    relations: { diplomacy: createWorldDiplomacy({ seedKey: "historical-1522" }) }
  };
}
