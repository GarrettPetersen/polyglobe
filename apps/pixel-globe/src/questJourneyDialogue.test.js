import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  QUEST_JOURNEY_SPEAKER_NINGBO_RIVAL_CAPTAIN,
  QUEST_JOURNEY_SPEAKER_PASSENGER,
  QUEST_JOURNEY_SPEAKER_KINDS,
  QUEST_JOURNEY_TRIGGER_DESTINATION_CLOSER,
  createDecisionBackedQuestJourneyDialogueSubject,
  markQuestJourneyDialogueSeen,
  pendingQuestJourneyDialogue,
  questJourneyDialogueCharacter,
  questJourneyDialoguePresentation
} from "./questJourneyDialogue.js";

test("decision-backed journey dialogue fires en route and persists without a quest schema change", () => {
  const decisions = {};
  const event = Object.freeze({
    id: "sealed-briefing",
    trigger: QUEST_JOURNEY_TRIGGER_DESTINATION_CLOSER,
    expressionId: "attentive",
    text: "There is more in these papers than the harbor heard."
  });
  const createSubject = () => createDecisionBackedQuestJourneyDialogueSubject({
    id: "commission-1",
    originCityId: "rome|italy",
    originTileId: 10,
    destinationCityId: "paris|france",
    destinationTileId: 20,
    character: { id: "envoy-1", name: "The Envoy" },
    journeyEvents: [event],
    decisions,
    decisionKeyPrefix: "quest-journey.test"
  });

  let subject = createSubject();
  assert.equal(pendingQuestJourneyDialogue(subject, {
    originDistance: 0.49,
    destinationDistance: 0.51,
    directDistance: 1
  }), null);
  assert.equal(pendingQuestJourneyDialogue(subject, {
    originDistance: 0.51,
    destinationDistance: 0.49,
    directDistance: 1
  }), event);

  markQuestJourneyDialogueSeen(subject, event.id);
  assert.equal(decisions["quest-journey.test.sealed-briefing"], true);
  subject = createSubject();
  assert.equal(pendingQuestJourneyDialogue(subject, { arrived: true }), null);
});

test("journey dialogue localizes authored prose and choice labels through one presentation boundary", () => {
  const event = Object.freeze({
    id: "imperial-memorial",
    expressionId: "thoughtful",
    text: "The memorial disputes the title owed to the emperor's dead father.",
    choices: Object.freeze([
      Object.freeze({ id: "read", label: "Read it aloud" }),
      Object.freeze({ id: "seal", label: "Keep it sealed" })
    ])
  });
  const localizedSources = [];
  const presentation = questJourneyDialoguePresentation(event, (source) => {
    localizedSources.push(source);
    return `localized:${source}`;
  });

  assert.deepEqual(localizedSources, [event.text, "Read it aloud", "Keep it sealed"]);
  assert.equal(presentation.text, `localized:${event.text}`);
  assert.deepEqual(presentation.choices.map((choice) => choice.label), [
    "localized:Read it aloud",
    "localized:Keep it sealed"
  ]);
  assert.equal(Object.isFrozen(presentation), true);
  assert.equal(Object.isFrozen(presentation.choices), true);
});

test("every supported journey speaker resolves before an at-sea event can open", () => {
  const passenger = { id: "envoy-1", name: "The Envoy" };
  const quest = { id: "treaty", passenger };
  const passengerEvent = {
    id: "terms",
    speakerKind: QUEST_JOURNEY_SPEAKER_PASSENGER,
    expressionId: "concerned",
    text: "The articles are under seal."
  };
  assert.strictEqual(questJourneyDialogueCharacter(quest, passengerEvent), passenger);
  assert.strictEqual(
    questJourneyDialogueCharacter(quest, { ...passengerEvent, speakerKind: undefined }),
    passenger
  );

  const rival = { id: "rival-captain", name: "The Rival Captain" };
  const rivalEvent = {
    ...passengerEvent,
    speakerKind: QUEST_JOURNEY_SPEAKER_NINGBO_RIVAL_CAPTAIN
  };
  const expectedByKind = new Map([
    [QUEST_JOURNEY_SPEAKER_PASSENGER, passenger],
    [QUEST_JOURNEY_SPEAKER_NINGBO_RIVAL_CAPTAIN, rival]
  ]);
  assert.equal(expectedByKind.size, QUEST_JOURNEY_SPEAKER_KINDS.length);
  for (const speakerKind of QUEST_JOURNEY_SPEAKER_KINDS) {
    assert.strictEqual(questJourneyDialogueCharacter(quest, {
      ...rivalEvent,
      speakerKind
    }, {
      resolveNingboRivalCaptain: () => rival
    }), expectedByKind.get(speakerKind));
  }
  assert.throws(
    () => questJourneyDialogueCharacter(quest, rivalEvent),
    /requires a Ningbo rival captain resolver/
  );
});

test("unknown journey speaker kinds fail during event validation", () => {
  const quest = {
    id: "invalid-speaker",
    passenger: { id: "envoy-1" },
    dialogue: {
      journeyEvents: [{
        id: "bad-speaker",
        speakerKind: "unimplemented-speaker",
        expressionId: "concerned",
        text: "This must never reach production."
      }]
    },
    journeyDialogueSeenIds: []
  };
  assert.throws(
    () => pendingQuestJourneyDialogue(quest, { arrived: true }),
    /Invalid quest journey dialogue speaker/
  );
});

test("the sailing journey-dialogue opener cannot send authored prose to key localization", () => {
  const mainSource = fs.readFileSync(
    fileURLToPath(new URL("./main.js", import.meta.url)),
    "utf8"
  );
  const opener = mainSource.match(
    /function openQuestJourneyDialogueAtSea\([\s\S]*?\n}\n\nfunction resolveQuestJourneyDialogueChoice/
  )?.[0];
  assert.ok(opener, "Could not inspect the sailing journey-dialogue opener");
  assert.match(opener, /questJourneyDialoguePresentation\(event, renderedUiText\)/);
  assert.doesNotMatch(opener, /\buiText\s*\(/);
});
