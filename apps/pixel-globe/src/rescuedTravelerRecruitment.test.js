import { nextCharacterHomecoming } from "./characterHomecoming.js";
import { ABOARD_ROLE_CREWMATE } from "./aboardRoster.js";
import assert from "node:assert/strict";
import test from "node:test";

import { createGameState } from "./gameState.js";
import {
  acceptRescuedTravelerQuest,
  createRescuedTravelerQuest,
  createRescuedTravelerQuestMemory,
  prepareRescuedTravelerHomecoming
} from "./rescuedTravelerQuest.js";
import { recruitRescuedTravelerAsNamedCrew } from "./rescuedTravelerRecruitment.js";
import { shipStatsForSlug } from "./shipStats.js";
import { setTestCrewCount } from "./test-fixtures/crewTestFixtures.js";

const expressions = Object.freeze([
  Object.freeze({ id: "neutral", src: "neutral.png" }),
  Object.freeze({ id: "happy", src: "happy.png" })
]);
const homePort = Object.freeze({
  tileId: 17,
  cityId: "kefe|crimea",
  city: "Kefe",
  displayCity: "Kefe",
  country: "Crimea"
});
const captain = Object.freeze({
  id: "captain",
  sourceId: "captain-portrait",
  name: "Ines Pereira",
  givenName: "Ines",
  familyName: "Pereira",
  sex: "female",
  homePortCityId: homePort.cityId,
  homePortTileId: homePort.tileId,
  homePortName: homePort.city,
  homePortCountry: homePort.country,
  expressions,
  skillIds: ["able-seaman"]
});
const captive = Object.freeze({
  id: "captive-kefe",
  homePortCityId: homePort.cityId,
  homePortName: homePort.city,
  homePortCountry: homePort.country,
  sourceId: "captive-portrait",
  name: "Brites Costa",
  givenName: "Brites",
  familyName: "Costa",
  sex: "female",
  birthDate: Object.freeze({ year: 1497, month: 4, day: 8 }),
  birthDateLabel: "8 April 1497",
  age: 24,
  nameCulture: "portuguese",
  expressions,
  skillIds: ["able-seaman"]
});

function recruitmentFixture() {
  const shipStats = shipStatsForSlug("fusta");
  const state = createGameState({
    cargoCapacity: shipStats.cargoCapacity,
    playerCharacter: captain,
    shipStats
  });
  setTestCrewCount(state, 2);
  const memory = createRescuedTravelerQuestMemory();
  const quest = createRescuedTravelerQuest(memory, {
    rescueType: "pirate-captive",
    sourceId: "pirate-ship-kefe",
    homePort,
    character: captive,
    familyMember: null,
    distanceKm: 2100,
    familySurvivedRoll: 0.8
  });
  acceptRescuedTravelerQuest(memory, quest.id);
  prepareRescuedTravelerHomecoming(memory, quest.id, null);
  return { state, memory, quest };
}

test("rescued traveler recruitment completes the quest and adds one named crewmate", () => {
  const { state, memory, quest } = recruitmentFixture();
  const result = recruitRescuedTravelerAsNamedCrew(state, memory, quest, {
    ...quest.character,
    goal: "Build a new life with this crew"
  }, { replaceGenericWhenFull: true });

  assert.equal(result.added, true);
  assert.equal(state.namedCrew.length, 1);
  assert.equal(state.ship.crew, 3);
  assert.equal(memory.active, null);
  assert.equal(memory.completedCount, 1);
});

test("rescued traveler recruitment rolls the roster back if quest completion fails", () => {
  const { state, memory, quest } = recruitmentFixture();
  memory.formerTravelers.push({ malformed: true });

  assert.throws(() => recruitRescuedTravelerAsNamedCrew(state, memory, quest, {
    ...quest.character,
    goal: "Build a new life with this crew"
  }, { replaceGenericWhenFull: true }), /Former rescued traveler requires an id/);

  assert.equal(state.namedCrew.length, 0);
  assert.equal(state.ship.crew, 2);
  assert.equal(memory.active, quest);
  assert.equal(memory.completedCount, 0);
});

test("recruitment consumes only the rescued traveler's generic homecoming", () => {
  const { state, memory, quest } = recruitmentFixture();
  state.survival.lastMinute = 100;
  recruitRescuedTravelerAsNamedCrew(state, memory, quest, quest.character);
  const context = { decisions: state.memory.decisions, cityId: homePort.cityId,
    cityName: homePort.city, currentMinute: 100, roster: { named: [{
      kind: "named", role: ABOARD_ROLE_CREWMATE, character: state.namedCrew[0]
    }] } };
  assert.equal(nextCharacterHomecoming(context), null);
  context.roster.named.push({ kind: "named", role: ABOARD_ROLE_CREWMATE,
    character: { ...state.namedCrew[0], id: "another-crewmate" } });
  assert.equal(nextCharacterHomecoming(context).character.id, "another-crewmate");
});
