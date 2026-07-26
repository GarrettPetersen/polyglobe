import assert from "node:assert/strict";
import test from "node:test";

import { createWorldDiplomacy, worldDiplomacyBetween } from "./worldDiplomacy.js";
import {
  PAPAL_ACTION_EXCOMMUNICATION,
  advancePapalPolitics,
  createPapalPolitics,
  imposePapalAction
} from "./papalPolitics.js";
import { ENGLISH_REFORMATION_MINUTE } from "./rulers.js";
import { advanceGamePolitics, createGameState } from "./gameState.js";

test("papal policy waits for its persisted long-term schedule", () => {
  const papacy = createPapalPolitics({ seedKey: "cadence" });
  const diplomacy = createWorldDiplomacy({ seedKey: "cadence" });
  const before = advancePapalPolitics(papacy, diplomacy, papacy.nextActionMinute - 1);
  assert.equal(before.actions.length, 0);
  const due = advancePapalPolitics(papacy, diplomacy, papacy.nextActionMinute);
  assert.equal(due.actions.length, 1);
  assert.ok(papacy.nextActionMinute > due.actions[0].simMinute);
});

test("an excommunication changes papal relations and records the targeted ruler", () => {
  const papacy = createPapalPolitics({ seedKey: "excommunication" });
  const diplomacy = createWorldDiplomacy({ seedKey: "excommunication" });
  const result = imposePapalAction(papacy, diplomacy, {
    kind: PAPAL_ACTION_EXCOMMUNICATION,
    targetFactionId: "england",
    simMinute: 100,
    source: "test"
  });
  assert.equal(result.action.targetFactionId, "england");
  assert.equal(papacy.excommunications.england.rulerName, "King Henry VIII");
  assert.equal(worldDiplomacyBetween(diplomacy, "papal-states", "england"), "hostile");
});

test("the 1534 settlement converts English Catholics aboard to Anglicanism once", () => {
  const player = {
    name: "Anne Wade",
    nationalityId: "england",
    religionId: "roman-catholic",
    expressions: ["neutral"]
  };
  const state = createGameState({
    cargoCapacity: 10,
    playerCharacter: player,
    voyageSeed: "english-reformation"
  });
  const result = advanceGamePolitics(state, ENGLISH_REFORMATION_MINUTE);
  assert.equal(result.englishReformation, true);
  assert.equal(state.playerCharacter.religionId, "anglican");
  const repeated = advanceGamePolitics(state, ENGLISH_REFORMATION_MINUTE + 1);
  assert.equal(repeated.englishReformation, false);
});
