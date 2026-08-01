import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { generatePassengerCharacter } from "./characterPortraits.js";
import { createGameState } from "./gameState.js";
import {
  passengerOfferForCity,
  passengerRoleLabel
} from "./passengerMissions.js";
import {
  RELIGIOUS_MISSION_CATALOG,
  captainCanParticipateInReligiousMission,
  religiousMissionIconId,
  religiousMissionParticipation,
  religiousMissionTitle
} from "./religiousMissions.js";

const CHARACTER_MANIFEST = JSON.parse(readFileSync(
  new URL("../public/assets/characters/generated/character-portraits.json", import.meta.url),
  "utf8"
));

test("religious mission catalog broadly covers non-Catholic traditions", () => {
  assert.equal(RELIGIOUS_MISSION_CATALOG.length, 18);
  assert.equal(new Set(RELIGIOUS_MISSION_CATALOG.map(({ id }) => id)).size, 18);
  const represented = new Set(RELIGIOUS_MISSION_CATALOG.flatMap((mission) => (
    mission.participantReligionIds
  )));
  for (const religionId of [
    "lutheran",
    "eastern-orthodox",
    "ethiopian-orthodox",
    "sunni-islam",
    "judaism",
    "hinduism",
    "jainism",
    "sikhism",
    "zoroastrianism",
    "theravada-buddhism",
    "mahayana-buddhism",
    "daoism",
    "chinese-traditional",
    "kami-buddhist",
    "andean-traditional",
    "mesoamerican-traditional",
    "african-traditional",
    "polynesian-traditional",
    "austronesian-traditional"
  ]) {
    assert.ok(represented.has(religionId), religionId);
  }
});

test("a Daoist captain receives the Buddhist-Daoist harbor mediation", () => {
  const beijing = port(101, "Beijing", "China", "ming");
  const nanjing = port(102, "Nanjing", "China", "ming");
  const state = createGameState({
    cargoCapacity: 20,
    playerCharacter: {
      name: "Lin Mei",
      nationalityId: "ming",
      religionId: "daoism",
      expressions: ["neutral", "happy"]
    }
  });
  let characterRequest = null;
  const quest = passengerOfferForCity(state, beijing, [beijing, nanjing], {
    spawnChance: 1,
    religiousMissionId: "ming-three-teachings-mediation",
    destinationTileId: nanjing.tileId,
    simMinute: 0,
    sailingDistanceKm: () => 850,
    createCharacter: (request) => {
      characterRequest = request;
      return generatePassengerCharacter({
        identityKey: request.quest.id,
        originPort: request.origin,
        destinationPort: request.destination,
        scenarioId: request.scenario.id,
        namePortPreference: request.scenario.namePort,
        religionId: request.quest.passengerReligionId,
        preferClergy: request.scenario.preferClergy,
        manifest: CHARACTER_MANIFEST,
        usedNames: new Set()
      });
    }
  });

  assert.equal(quest.religiousMissionId, "ming-three-teachings-mediation");
  assert.equal(quest.passengerReligionId, "mahayana-buddhism");
  assert.equal(quest.destinationName, "Nanjing");
  assert.equal(religiousMissionTitle(quest), "Two Temples, One Harbor");
  assert.equal(passengerRoleLabel(quest), "Buddhist monk");
  assert.equal(religiousMissionIconId(quest), "religion:buddhist");
  assert.equal(captainCanParticipateInReligiousMission(state, quest), true);
  assert.equal(religiousMissionParticipation(quest).bonusDoubloons, 120);
  assert.equal(characterRequest.scenario.preferClergy, true);
  assert.ok(quest.passenger.sourceRoles.includes("clergy"));
  assert.equal(quest.passenger.sourceLabel, "Bald Monk");
  assert.match(quest.dialogue.offer, /Daoist abbey/);
  assert.match(quest.dialogue.arrival, /Buddhist, Daoist/);
});

test("mission generation prefers work in the captain's own tradition", () => {
  const origin = port(201, "Lahore", "Pakistan", "delhi");
  const destination = port(202, "Multan", "Pakistan", "delhi");
  const state = createGameState({
    cargoCapacity: 20,
    playerCharacter: {
      name: "Bhai Amar",
      nationalityId: "delhi",
      religionId: "sikhism",
      expressions: ["neutral", "happy"]
    }
  });
  const quest = passengerOfferForCity(state, origin, [origin, destination], {
    spawnChance: 1,
    religiousScenarioChance: 1,
    hajjScenarioChance: 0,
    destinationTileId: destination.tileId,
    simMinute: 0,
    sailingDistanceKm: () => 500
  });

  assert.equal(quest.religiousMissionId, "sikh-sangat-hymns");
  assert.equal(quest.passengerReligionId, "sikhism");
  assert.match(quest.dialogue.offer, /Guru Nanak/);
  assert.equal(captainCanParticipateInReligiousMission(state, quest), true);
});

function port(tileId, city, country, factionId) {
  return {
    tileId,
    city,
    displayCity: city,
    country,
    factionId,
    cityType: country === "China" ? "east-asian" : "south-asian",
    lat: tileId,
    lon: tileId
  };
}
