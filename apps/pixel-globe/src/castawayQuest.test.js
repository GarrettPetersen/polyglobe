import assert from "node:assert/strict";
import test from "node:test";

import {
  CASTAWAY_FIRST_RESCUE_DENOMINATOR,
  CASTAWAY_STAGE_ABOARD,
  acceptCastawayQuest,
  castawayDialogueView,
  castawayRescueAppears,
  createCastawayDialogueSession,
  createCastawayQuest,
  createCastawayQuestMemory,
  markCastawayEmergencyAidReceived,
  validateCastawayQuestMemory
} from "./castawayQuest.js";
import { selectRescuedTravelerDialogueOption } from "./rescuedTravelerQuest.js";

const homePort = Object.freeze({
  tileId: 72,
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
    birthDate: Object.freeze({ year: 1495, month: 8, day: 12 }),
    birthDateLabel: "12 August 1495",
    age: 26,
    nameCulture: "portuguese",
    skillIds: Object.freeze(["able-seaman"]),
    expressions: Object.freeze([
      Object.freeze({ id: "sad", src: "assets/characters/sad.png", width: 64, height: 64 }),
      Object.freeze({ id: "happy", src: "assets/characters/happy.png", width: 64, height: 64 })
    ])
  });
}

const castaway = character("castaway", "Brites", "Pereira");
const familyMember = character("castaway-family", "Joana", "Pereira");

test("castaway rescues begin very rare and become rarer after each completion", () => {
  assert.equal(castawayRescueAppears(0, 0), true);
  assert.equal(castawayRescueAppears(1 / CASTAWAY_FIRST_RESCUE_DENOMINATOR, 0), false);
  assert.equal(castawayRescueAppears(1 / 3000 - Number.EPSILON, 1), true);
  assert.equal(castawayRescueAppears(1 / 3000, 1), false);
  assert.equal(castawayRescueAppears(1 / 6750, 2), false);
});

test("a castaway recounts the storm and offers emergency shore supplies", () => {
  const memory = createCastawayQuestMemory();
  const quest = createCastawayQuest(memory, {
    shoreId: "shore-91",
    homePort,
    character: castaway,
    familyMember,
    distanceKm: 1800,
    familySurvivedRoll: 0.2,
    emergencyAid: { water: true, food: true }
  });
  const session = createCastawayDialogueSession(quest, { phase: "offer" });
  const offer = castawayDialogueView(session, quest);
  assert.equal(offer.expressionId, "crying");
  assert.match(offer.text, /ship was caught in a storm/i);
  assert.match(offer.text, /thrown overboard/i);
  assert.match(offer.text, /woke on this beach/i);

  selectRescuedTravelerDialogueOption(session, quest, memory, 0);
  assert.equal(quest.stage, CASTAWAY_STAGE_ABOARD);
  assert.match(castawayDialogueView(session, quest).text, /freshwater spring/i);
  assert.match(castawayDialogueView(session, quest).text, /edible roots and shellfish/i);
  markCastawayEmergencyAidReceived(memory, quest.id);
  assert.equal(quest.emergencyAidReceived, true);
  validateCastawayQuestMemory(memory);
});

test("a well-provisioned ship receives no invented castaway supplies", () => {
  const memory = createCastawayQuestMemory();
  const quest = createCastawayQuest(memory, {
    shoreId: "shore-92",
    homePort,
    character: castaway,
    familyMember: null,
    distanceKm: 900,
    familySurvivedRoll: 0.8,
    emergencyAid: null
  });
  acceptCastawayQuest(memory, quest.id);
  assert.equal(quest.emergencyAid, null);
  assert.throws(
    () => markCastawayEmergencyAidReceived(memory, quest.id),
    /no shore aid/
  );
});
