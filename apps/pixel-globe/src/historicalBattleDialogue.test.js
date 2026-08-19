import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  HISTORICAL_BATTLE_DIALOGUE_CLOSING,
  HISTORICAL_BATTLE_DIALOGUE_OPENING,
  createHistoricalBattleDialogueSession,
  historicalBattleDialogueLocalizationKeys,
  historicalBattleDialogueParticipants,
  historicalBattleDialogueView,
  selectHistoricalBattleDialogueOption
} from "./historicalBattleDialogue.js";
import { HISTORICAL_BATTLE_SCENARIOS } from "./historicalBattleScenarios.js";
import {
  LANGUAGE_ENGLISH,
  SUPPORTED_LANGUAGES,
  translate
} from "./localization.js";

const SCENARIO = HISTORICAL_BATTLE_SCENARIOS[0];

test("every Lepanto commander has a staged opening and all outcome closings", () => {
  for (const commander of SCENARIO.selection.commanders) {
    const opening = createHistoricalBattleDialogueSession({
      scenario: SCENARIO,
      commanderId: commander.id,
      phase: HISTORICAL_BATTLE_DIALOGUE_OPENING
    });
    assert.ok(opening.steps.length >= 2, `${commander.id} opening is too short`);
    assert.equal(opening.steps.some((entry) => entry.speakerId === commander.id), true);
    assertDialogueStaysWithinSide(opening, commander.sideId);

    for (const outcome of ["victory", "defeat", "draw"]) {
      const closing = createHistoricalBattleDialogueSession({
        scenario: SCENARIO,
        commanderId: commander.id,
        phase: HISTORICAL_BATTLE_DIALOGUE_CLOSING,
        outcome
      });
      assert.equal(closing.steps.length, 2);
      assert.equal(closing.steps[0].speakerId, commander.id);
      assertDialogueStaysWithinSide(closing, commander.sideId);
    }
  }
});

test("historical dialogue uses the selected commander as a stable portrait participant", () => {
  const commander = SCENARIO.selection.commanders[4];
  const session = createHistoricalBattleDialogueSession({
    scenario: SCENARIO,
    commanderId: commander.id,
    phase: HISTORICAL_BATTLE_DIALOGUE_OPENING
  });
  const participants = historicalBattleDialogueParticipants(
    session,
    SCENARIO,
    (key) => translate(LANGUAGE_ENGLISH, key)
  );
  assert.equal(participants.leftCharacter.historicalPortraitId, commander.id);
  assert.ok(participants.rightCharacter);
  assert.notEqual(participants.leftCharacter.id, participants.rightCharacter.id);
  assert.ok([
    participants.leftCharacter.id,
    participants.rightCharacter.id
  ].includes(participants.speakerCharacter.id));
  assert.equal(participants.leftCharacter.historicalPortraitFacing, "right");
});

test("attested addresses use their documented audience without inventing a reply", () => {
  const translateEnglish = (key) => translate(LANGUAGE_ENGLISH, key);
  const barbarigo = createHistoricalBattleDialogueSession({
    scenario: SCENARIO,
    commanderId: "agostino-barbarigo",
    phase: HISTORICAL_BATTLE_DIALOGUE_OPENING
  });
  const barbarigoParticipants = historicalBattleDialogueParticipants(
    barbarigo,
    SCENARIO,
    translateEnglish
  );
  assert.equal(barbarigoParticipants.rightCharacter, null);

  const ali = createHistoricalBattleDialogueSession({
    scenario: SCENARIO,
    commanderId: "ali-pasha",
    phase: HISTORICAL_BATTLE_DIALOGUE_OPENING
  });
  const rowerParticipants = historicalBattleDialogueParticipants(ali, SCENARIO, translateEnglish);
  assert.equal(rowerParticipants.leftCharacter.historicalPortraitId, "ali-pasha");
  assert.equal(rowerParticipants.rightCharacter.historicalPortraitId, "christian-oarsman");
  assert.equal(rowerParticipants.speakerCharacter.historicalPortraitId, "christian-oarsman");
  assert.equal(rowerParticipants.speakerCharacter.historicalRole, "GALLEY SLAVE");
});

test("historical dialogue advances to battle and result actions", () => {
  const commander = SCENARIO.selection.commanders[0];
  const translateEnglish = (key) => translate(LANGUAGE_ENGLISH, key);
  for (const [phase, outcome, actionType] of [
    [HISTORICAL_BATTLE_DIALOGUE_OPENING, null, "begin-historical-battle"],
    [HISTORICAL_BATTLE_DIALOGUE_CLOSING, "victory", "show-historical-battle-result"]
  ]) {
    const session = createHistoricalBattleDialogueSession({
      scenario: SCENARIO,
      commanderId: commander.id,
      phase,
      outcome
    });
    while (session.stepIndex < session.steps.length - 1) {
      const view = historicalBattleDialogueView(session, SCENARIO, translateEnglish);
      assert.equal(view.options.length, 1);
      assert.deepEqual(selectHistoricalBattleDialogueOption(session), {
        closed: false,
        action: null
      });
    }
    const result = selectHistoricalBattleDialogueOption(session);
    assert.equal(result.closed, true);
    assert.equal(result.action.type, actionType);
  }
});

test("closing historical dialogue replaces stale battle UI with a fresh result screen", async () => {
  const mainSource = await readFile(new URL("./main.js", import.meta.url), "utf8");
  const closeSource = mainSource.match(
    /function closeHistoricalBattleDialogue[\s\S]*?\n}\n\nfunction stepHistoricalBattleScenario/
  )?.[0];
  assert.ok(closeSource, "historical dialogue closing transition must remain discoverable");
  assert.match(closeSource, /clearPausedView\(dialogueViewCache\)/);
  assert.match(closeSource, /lakeBattleMode\.screen = LAKE_BATTLE_SCREEN_RESULT/);
  assert.match(closeSource, /lakeBattleMode\.resultReadyAtMs = null/);
  assert.match(closeSource, /lakeBattleMode\.actionRects = \[\]/);
  assert.match(closeSource, /clearHistoricalBattlePendingActions\(\)/);
});

test("all historical dialogue is translated in every supported language", () => {
  for (const key of historicalBattleDialogueLocalizationKeys()) {
    const english = translate(LANGUAGE_ENGLISH, key);
    assert.ok(english.length > 0, `English ${key} is empty`);
    for (const { id } of SUPPORTED_LANGUAGES) {
      const localized = translate(id, key);
      assert.ok(localized.length > 0, `${id} ${key} is empty`);
      if (id !== LANGUAGE_ENGLISH) {
        assert.notEqual(localized, english, `${id} retained English for ${key}`);
      }
    }
  }
});

function assertDialogueStaysWithinSide(session, sideId) {
  const participants = [
    ...SCENARIO.selection.commanders,
    ...SCENARIO.selection.supportingCharacters
  ];
  for (const entry of session.steps) {
    const speaker = participants.find(({ id }) => id === entry.speakerId);
    assert.equal(speaker?.sideId, sideId, `${entry.textKey} speaker crossed sides`);
    if (entry.listenerId) {
      const listener = participants.find(({ id }) => id === entry.listenerId);
      assert.equal(listener?.sideId, sideId, `${entry.textKey} listener crossed sides`);
    }
  }
}
