import assert from "node:assert/strict";
import test from "node:test";

import {
  CASTAWAY_FIRST_RESCUE_DENOMINATOR,
  CASTAWAY_STAGE_ABOARD,
  acceptCastawayQuest,
  castawayDialogueView,
  castawayRescueAppears,
  completeCastawayQuest,
  createCastawayDialogueSession,
  createCastawayQuest,
  createCastawayQuestMemory,
  markCastawayEmergencyAidReceived,
  migrateCastawayQuestMemory,
  prepareCastawayHomecoming,
  validateCastawayQuestMemory
} from "./castawayQuest.js";
import {
  formerRescuedTravelerCharactersAtPort,
  nextRescuedTravelerPortReunion,
  recordRescuedTravelerPortReunion,
  selectRescuedTravelerDialogueOption
} from "./rescuedTravelerQuest.js";

const homePort = Object.freeze({
  tileId: 72,
  cityId: "porto|portugal",
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

test("castaway rescue odds return to their baseline after every completed rescue", () => {
  assert.equal(castawayRescueAppears(0), true);
  assert.equal(castawayRescueAppears(1 / CASTAWAY_FIRST_RESCUE_DENOMINATOR - Number.EPSILON), true);
  assert.equal(castawayRescueAppears(1 / CASTAWAY_FIRST_RESCUE_DENOMINATOR), false);
});

test("rescued castaways remember their captain on later visits home", () => {
  const memory = createCastawayQuestMemory();
  const quest = createCastawayQuest(memory, {
    shoreId: "shore-reunion",
    homePort,
    character: castaway,
    familyMember,
    distanceKm: 1800,
    familySurvivedRoll: 0.2
  });
  acceptCastawayQuest(memory, quest.id);
  prepareCastawayHomecoming(memory, quest.id, null);
  completeCastawayQuest(memory, quest.id, { settledAtHomeMinute: 100 });
  assert.deepEqual(
    formerRescuedTravelerCharactersAtPort([memory], homePort.cityId).map((entry) => entry.id),
    [castaway.id]
  );

  const captain = {
    ...quest.character,
    id: "captain",
    name: "Rui Costa",
    givenName: "Rui",
    familyName: "Costa",
    sex: "male"
  };
  const firstEligibleMinute = 100 + 30 * 24 * 60;
  assert.equal(nextRescuedTravelerPortReunion([memory], {
    cityId: homePort.cityId,
    currentMinute: firstEligibleMinute - 1,
    roll: 0,
    captain,
    variantSeed: 0
  }), null);
  const reunion = nextRescuedTravelerPortReunion([memory], {
    cityId: homePort.cityId,
    currentMinute: firstEligibleMinute,
    roll: 0.99,
    captain,
    variantSeed: 4
  });
  assert.equal(reunion.character.id, castaway.id);
  assert.match(reunion.message, /supper was not my only reason/i);
  recordRescuedTravelerPortReunion(memory, reunion.entryId, firstEligibleMinute);
  assert.equal(nextRescuedTravelerPortReunion([memory], {
    cityId: homePort.cityId,
    currentMinute: firstEligibleMinute + 60 * 24 * 60 - 1,
    roll: 0,
    captain,
    variantSeed: 0
  }), null);
  assert.equal(nextRescuedTravelerPortReunion([memory], {
    cityId: homePort.cityId,
    currentMinute: firstEligibleMinute + 60 * 24 * 60,
    roll: 0.35,
    captain,
    variantSeed: 0
  }), null);
});

test("older rescue memories migrate without inventing former travelers", () => {
  const migrated = migrateCastawayQuestMemory({
    version: 1,
    active: null,
    completedCount: 3,
    declinedCount: 1
  });
  assert.equal(migrated.version, 2);
  assert.deepEqual(migrated.formerTravelers, []);
  assert.equal(castawayRescueAppears(0), true);
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
  assert.match(offer.text, /storm threw me overboard/i);
  assert.match(offer.text, /woke among wreckage on this beach/i);

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
