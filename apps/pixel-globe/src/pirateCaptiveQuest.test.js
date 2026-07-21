import assert from "node:assert/strict";
import test from "node:test";

import {
  PIRATE_CAPTIVE_STAGE_ABOARD,
  PIRATE_CAPTIVE_STAGE_HOMECOMING,
  acceptPirateCaptiveQuest,
  completePirateCaptiveQuest,
  createPirateCaptiveDialogueSession,
  createPirateCaptiveQuest,
  createPirateCaptiveQuestMemory,
  migratePirateCaptiveQuestMemory,
  pirateCaptiveDialogueView,
  pirateCaptiveRescueAppears,
  preparePirateCaptiveHomecoming,
  selectPirateCaptiveDialogueOption,
  validatePirateCaptiveQuestMemory
} from "./pirateCaptiveQuest.js";

const homePort = Object.freeze({
  tileId: 41,
  city: "Porto",
  displayCity: "Porto",
  country: "Portugal"
});

function character(id, givenName, familyName) {
  return Object.freeze({
    id,
    name: `${givenName} ${familyName}`,
    givenName,
    familyName,
    sex: "female",
    birthDate: Object.freeze({ year: 1497, month: 4, day: 8 }),
    birthDateLabel: "8 April 1497",
    age: 24,
    nameCulture: "portuguese",
    skillIds: Object.freeze(["able-seaman"]),
    expressions: Object.freeze([
      Object.freeze({ id: "sad", src: "assets/characters/sad.png", width: 64, height: 64 }),
      Object.freeze({ id: "happy", src: "assets/characters/happy.png", width: 64, height: 64 })
    ])
  });
}

const captive = character("captive", "Brites", "Pereira");
const familyMember = character("family", "Joana", "Pereira");

test("pirate victories use a one-in-three first rescue and one-in-fifty thereafter", () => {
  assert.equal(pirateCaptiveRescueAppears(0), true);
  assert.equal(pirateCaptiveRescueAppears(1 / 3 - Number.EPSILON), true);
  assert.equal(pirateCaptiveRescueAppears(1 / 3), false);
  assert.equal(pirateCaptiveRescueAppears(0.99), false);
  assert.equal(pirateCaptiveRescueAppears(1 / 50 - Number.EPSILON, 1), true);
  assert.equal(pirateCaptiveRescueAppears(1 / 50, 1), false);
});

function createQuest(memory, familySurvivedRoll) {
  return createPirateCaptiveQuest(memory, {
    pirateShipId: "pirate-17",
    homePort,
    character: captive,
    familyMember: familySurvivedRoll < 0.5 ? familyMember : null,
    distanceKm: 2300,
    familySurvivedRoll
  });
}

test("a rescued pirate captive fixes the family outcome and transitions aboard", () => {
  const memory = createPirateCaptiveQuestMemory();
  const quest = createQuest(memory, 0.49);
  assert.equal(quest.familySurvived, true);
  assert.equal(quest.familyMember.familyName, quest.character.familyName);
  assert.equal(quest.rewardDoubloons % 50, 0);

  const session = createPirateCaptiveDialogueSession(quest, { phase: "offer" });
  const offer = pirateCaptiveDialogueView(session, quest);
  assert.equal(offer.expressionId, "crying");
  assert.match(offer.text, /pirates kept me locked below/i);

  selectPirateCaptiveDialogueOption(session, quest, memory, 0);
  assert.equal(quest.stage, PIRATE_CAPTIVE_STAGE_ABOARD);
  const accepted = pirateCaptiveDialogueView(session, quest);
  assert.equal(accepted.expressionId, "overjoyed");
  assert.match(accepted.text, /set a course for Porto/i);
});

test("a surviving family shares a surname and gives money plus a high-value item", () => {
  const memory = createPirateCaptiveQuestMemory();
  const quest = createQuest(memory, 0.1);
  acceptPirateCaptiveQuest(memory, quest.id);
  preparePirateCaptiveHomecoming(memory, quest.id, {
    id: "lead-sheathing",
    label: "Lead Hull Sheathing"
  });
  assert.equal(quest.stage, PIRATE_CAPTIVE_STAGE_HOMECOMING);

  const session = createPirateCaptiveDialogueSession(quest, {
    phase: "homecoming",
    cityTileId: homePort.tileId,
    admittedToPort: true
  });
  assert.equal(pirateCaptiveDialogueView(session, quest).speaker, familyMember.name);
  assert.match(pirateCaptiveDialogueView(session, quest).text, /Brites, we thought we'd never see you again!/);
  selectPirateCaptiveDialogueOption(session, quest, memory, 0);
  selectPirateCaptiveDialogueOption(session, quest, memory, 0);
  const reward = pirateCaptiveDialogueView(session, quest);
  assert.match(reward.text, /Lead Hull Sheathing/);
  assert.match(reward.text, new RegExp(String(quest.rewardDoubloons)));
  selectPirateCaptiveDialogueOption(session, quest, memory, 0);
  const farewell = pirateCaptiveDialogueView(session, quest);
  assert.equal(farewell.expressionId, "overjoyed");
  assert.equal(farewell.options[0].action.type, "complete-rescued-traveler-reunion");
  completePirateCaptiveQuest(memory, quest.id);
  assert.equal(memory.active, null);
  assert.equal(memory.completedCount, 1);
});

test("a captive whose family was lost asks to remain as permanent crew", () => {
  const memory = createPirateCaptiveQuestMemory();
  const quest = createQuest(memory, 0.5);
  assert.equal(quest.familySurvived, false);
  acceptPirateCaptiveQuest(memory, quest.id);
  preparePirateCaptiveHomecoming(memory, quest.id, null);
  const session = createPirateCaptiveDialogueSession(quest, {
    phase: "homecoming",
    cityTileId: homePort.tileId,
    admittedToPort: true
  });
  assert.equal(pirateCaptiveDialogueView(session, quest).expressionId, "crying");
  selectPirateCaptiveDialogueOption(session, quest, memory, 0);
  const request = pirateCaptiveDialogueView(session, quest);
  assert.match(request.text, /may I stay aboard/i);
  assert.equal(request.options[0].action.type, "recruit-rescued-traveler");
});

test("a later rare pirate captive quest can begin after one is completed", () => {
  const memory = createPirateCaptiveQuestMemory();
  const quest = createQuest(memory, 0.1);
  acceptPirateCaptiveQuest(memory, quest.id);
  preparePirateCaptiveHomecoming(memory, quest.id, {
    id: "lead-sheathing",
    label: "Lead Hull Sheathing"
  });
  completePirateCaptiveQuest(memory, quest.id);
  const second = createPirateCaptiveQuest(memory, {
    pirateShipId: "pirate-18",
    homePort,
    character: captive,
    familyMember,
    distanceKm: 1800,
    familySurvivedRoll: 0.1
  });
  assert.equal(second.id, "pirate-captive:pirate-18:1");
  validatePirateCaptiveQuestMemory(memory);
});

test("legacy pirate captive saves migrate into the shared rescue schema", () => {
  const memory = createPirateCaptiveQuestMemory();
  const quest = createQuest(memory, 0.75);
  const {
    rescueType: _rescueType,
    sourceId,
    emergencyAid: _emergencyAid,
    emergencyAidReceived: _emergencyAidReceived,
    ...legacyQuest
  } = quest;
  memory.active = { ...legacyQuest, pirateShipId: sourceId };

  const migrated = migratePirateCaptiveQuestMemory(memory);
  assert.equal(migrated.active.rescueType, "pirate-captive");
  assert.equal(migrated.active.sourceId, "pirate-17");
  assert.equal(migrated.active.emergencyAid, null);
  assert.equal(migrated.active.emergencyAidReceived, false);
});
