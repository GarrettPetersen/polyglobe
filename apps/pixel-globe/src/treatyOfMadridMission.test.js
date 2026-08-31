import assert from "node:assert/strict";
import test from "node:test";

import {
  acceptQuest,
  completeQuest,
  createGameState,
  negotiateEnvoyQuest,
  shipTravelerManifest
} from "./gameState.js";
import {
  createPassengerDialogueSession,
  passengerDialogueView
} from "./dialogueSystem.js";
import { passengerOfferForCity } from "./passengerMissions.js";
import { gameMinuteForDate } from "./rulers.js";
import {
  TREATY_OF_MADRID_FRENCH_SIDE,
  TREATY_OF_MADRID_IMPERIAL_SIDE,
  TREATY_OF_MADRID_MISSION_ID,
  isTreatyOfMadridQuest
} from "./treatyOfMadridMission.js";
import { worldDiplomacyBetween } from "./worldDiplomacy.js";

const PLAYER = Object.freeze({
  id: "player:joan-alden",
  name: "Joan Alden",
  nationalityId: "england",
  homePortCityId: "paris|france",
  homePortTileId: 161197,
  homePortName: "Paris",
  homePortCountry: "France",
  expressions: ["neutral", "happy"]
});
const PARIS = port(161197, "Paris", "France", "france", 48.86, 2.35);
const BORDEAUX = port(162042, "Bordeaux", "France", "france", 44.84, -0.58);
const MARSEILLE = port(162253, "Marseille", "France", "france", 43.3, 5.37);
const BARCELONA = port(162341, "Barcelona", "Spain", "spain", 41.39, 2.17);
const VALENCIA = port(162340, "Valencia", "Spain", "spain", 39.47, -0.38);
const SEVILLE = port(161342, "Seville", "Spain", "spain", 37.39, -5.99);
const GENT = port(161189, "Gent", "Belgium", "burgundian-netherlands", 51.05, 3.72);
const MILAN = Object.freeze({
  tileId: 99,
  cityId: "milan|italy",
  city: "Milan",
  displayCity: "Milan",
  country: "Italy",
  factionId: "habsburg"
});
const PORTS = Object.freeze([
  PARIS,
  BORDEAUX,
  MARSEILLE,
  BARCELONA,
  VALENCIA,
  SEVILLE,
  GENT
]);
const AFTER_PAVIA = gameMinuteForDate(1525, 3, 1);

test("Treaty of Madrid offers appear on both sides after the historical Pavia outcome", () => {
  const state = gameState();
  const context = missionContext(state);
  const french = passengerOfferForCity(state, BORDEAUX, PORTS, context);
  const imperial = passengerOfferForCity(state, SEVILLE, PORTS, context);

  assert.equal(isTreatyOfMadridQuest(french), true);
  assert.equal(isTreatyOfMadridQuest(imperial), true);
  assert.equal(french.id, TREATY_OF_MADRID_MISSION_ID);
  assert.equal(imperial.id, TREATY_OF_MADRID_MISSION_ID);
  assert.equal(french.treatyOfMadridSide, TREATY_OF_MADRID_FRENCH_SIDE);
  assert.equal(imperial.treatyOfMadridSide, TREATY_OF_MADRID_IMPERIAL_SIDE);
  assert.equal(french.targetTileId, BARCELONA.tileId);
  assert.equal(imperial.targetTileId, BORDEAUX.tileId);
  assert.equal(french.envoyCount, 2);
  assert.match(french.dialogue.offer, /Francis I is a prisoner in Madrid/);
  assert.match(imperial.dialogue.offer, /Charles V sends his release articles/);
  assert.equal(french.dialogue.journeyEvents.length, 1);
});

test("accepting one Treaty of Madrid side withdraws every competing offer", () => {
  const state = gameState();
  const context = missionContext(state);
  const french = passengerOfferForCity(state, BORDEAUX, PORTS, context);
  passengerOfferForCity(state, SEVILLE, PORTS, context);
  passengerOfferForCity(state, GENT, PORTS, context);

  acceptQuest(state, french, { simMinute: AFTER_PAVIA });

  assert.equal(state.memory.quests.active.id, TREATY_OF_MADRID_MISSION_ID);
  assert.equal(
    Object.values(state.memory.quests.passengerOffers).some(isTreatyOfMadridQuest),
    false
  );
  assert.deepEqual(shipTravelerManifest(state), [{ kind: "envoy", count: 2 }]);
  assert.equal(passengerOfferForCity(state, SEVILLE, PORTS, context), null);
});

test("Treaty dialogue asks the captain to carry the delegation, not dictate terms", () => {
  const state = gameState();
  const french = passengerOfferForCity(state, BORDEAUX, PORTS, missionContext(state));
  const offerSession = createPassengerDialogueSession(BORDEAUX, french);
  const offer = passengerDialogueView(offerSession, BORDEAUX, french, state);
  assert.match(offer.options[0].label, /^Carry delegation to Barcelona/);
  assert.deepEqual(offer.options.map((entry) => entry.action.type), [
    "accept-passenger",
    "decline-passenger"
  ]);

  acceptQuest(state, french, { simMinute: AFTER_PAVIA });
  const negotiationSession = createPassengerDialogueSession(BARCELONA, state.memory.quests.active);
  const negotiation = passengerDialogueView(
    negotiationSession,
    BARCELONA,
    state.memory.quests.active,
    state
  );
  assert.deepEqual(
    negotiation.options.map((entry) => entry.action.type),
    ["negotiate-envoy", "close"]
  );
  assert.match(negotiation.text, /go overland to Madrid/);
});

test("the Treaty delegation negotiates, returns, frees Francis, and ends both wars", () => {
  const state = gameState();
  const french = passengerOfferForCity(state, BORDEAUX, PORTS, missionContext(state));
  acceptQuest(state, french, { simMinute: AFTER_PAVIA });

  const negotiation = negotiateEnvoyQuest(state, BARCELONA, {
    simMinute: AFTER_PAVIA + 100,
    portCities: PORTS
  });
  assert.equal(negotiation.quest.stage, "return");
  assert.equal(negotiation.events.length, 0);
  assert.equal(negotiation.quest.destinationTileId, BORDEAUX.tileId);

  const completed = completeQuest(state, BORDEAUX, {
    simMinute: AFTER_PAVIA + 200,
    portCities: PORTS
  });
  assert.equal(completed.treatyOfMadridResolution.francisReleased, true);
  assert.equal(state.memory.quests.completed[TREATY_OF_MADRID_MISSION_ID], true);
  assert.equal(
    worldDiplomacyBetween(state.relations.diplomacy, "france", "burgundian-netherlands"),
    "hostile"
  );
  assert.equal(worldDiplomacyBetween(state.relations.diplomacy, "france", "spain"), "hostile");
  assert.equal(worldDiplomacyBetween(state.relations.diplomacy, "france", "habsburg"), "war");
  assert.equal(completed.treatyOfMadridResolution.diplomacyEvents.length >= 1, true);
});

test("the Imperial delegation can complete the same treaty from the opposite side", () => {
  const state = gameState();
  const imperial = passengerOfferForCity(state, SEVILLE, PORTS, missionContext(state));
  acceptQuest(state, imperial, { simMinute: AFTER_PAVIA });

  const negotiation = negotiateEnvoyQuest(state, BORDEAUX, {
    simMinute: AFTER_PAVIA + 100,
    portCities: PORTS
  });
  assert.equal(negotiation.quest.stage, "return");
  assert.equal(negotiation.quest.destinationTileId, SEVILLE.tileId);

  const completed = completeQuest(state, SEVILLE, {
    simMinute: AFTER_PAVIA + 200,
    portCities: PORTS
  });
  assert.equal(completed.treatyOfMadridResolution.francisReleased, true);
  assert.equal(state.memory.quests.completed[TREATY_OF_MADRID_MISSION_ID], true);
  assert.equal(
    worldDiplomacyBetween(state.relations.diplomacy, "france", "burgundian-netherlands"),
    "hostile"
  );
});

test("Treaty offers do not appear before Pavia or when Milan is not Imperial", () => {
  const before = gameState();
  assert.equal(passengerOfferForCity(before, BORDEAUX, PORTS, {
    ...missionContext(before),
    simMinute: gameMinuteForDate(1525, 2, 23)
  }), null);

  const alternate = gameState();
  const worldState = historicalWorldState(alternate, { ...MILAN, factionId: "france" });
  assert.equal(passengerOfferForCity(alternate, BORDEAUX, PORTS, {
    ...missionContext(alternate),
    historicalWorldState: worldState
  }), null);
});

function gameState() {
  return createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
}

function missionContext(state) {
  return {
    simMinute: AFTER_PAVIA,
    historicalWorldState: historicalWorldState(state, MILAN)
  };
}

function historicalWorldState(state, milan) {
  return {
    worldCities: [...PORTS, milan],
    collapsedFactionIds: state.memory.conquest.collapsedFactionIds,
    diplomacy: state.relations.diplomacy,
    papacy: state.relations.papacy,
    tradeAccessGrants: state.relations.tradeAccessGrants,
    foreignSettlementExpulsions: state.relations.foreignSettlementExpulsions
  };
}

function port(tileId, city, country, factionId, lat, lon) {
  return Object.freeze({
    cityId: `${city.toLocaleLowerCase("en-US")}|${country.toLocaleLowerCase("en-US")}`,
    tileId,
    city,
    displayCity: city,
    country,
    cityType: "mediterranean",
    factionId,
    population: 60000,
    lat,
    lon
  });
}
