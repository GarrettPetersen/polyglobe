import assert from "node:assert/strict";
import test from "node:test";

import {
  QUEST_JOURNEY_TRIGGER_DESTINATION_CLOSER,
  createDecisionBackedQuestJourneyDialogueSubject,
  markQuestJourneyDialogueSeen,
  pendingQuestJourneyDialogue
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
    originTileId: 10,
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
