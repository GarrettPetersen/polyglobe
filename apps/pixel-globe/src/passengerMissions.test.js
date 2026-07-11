import assert from "node:assert/strict";
import test from "node:test";

import {
  acceptQuest,
  completeQuest,
  createGameState,
  ledgerEntries
} from "./gameState.js";
import {
  markPassengerOfferSeen,
  passengerOfferForCity,
  pendingPassengerOfferForCity
} from "./passengerMissions.js";

const PLAYER = {
  name: "Joan Alden",
  nationalityId: "england",
  expressions: ["neutral", "happy"]
};

const LISBON = port(1, "Lisbon", "Portugal", "mediterranean", "portugal", 38.72, -9.14);
const PORTO = port(2, "Porto", "Portugal", "mediterranean", "portugal", 41.15, -8.61);
const GOA = port(3, "Goa", "India", "south-asian", "portugal", 15.5, 73.83);
const NAGASAKI = port(4, "Nagasaki", "Japan", "east-asian", "ming", 32.75, 129.88);

test("passenger missions spawn as persistent distant-port offers", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  const offer = passengerOfferForCity(state, LISBON, [LISBON, PORTO, GOA], {
    spawnChance: 1,
    simMinute: 0,
    destinationTileId: GOA.tileId,
    scenarioId: "shipwrecked-sailor",
    createCharacter: () => ({ name: "Mateo Costa" })
  });

  assert.equal(offer.kind, "passenger");
  assert.equal(offer.originName, "Lisbon");
  assert.equal(offer.destinationName, "Goa");
  assert.ok(offer.distanceKm >= 1800);
  assert.match(offer.dialogue.offer, /ship broke up/i);
  assert.equal(pendingPassengerOfferForCity(state, LISBON), offer);

  markPassengerOfferSeen(state, offer);
  assert.equal(passengerOfferForCity(state, LISBON, [LISBON, PORTO, GOA], {
    spawnChance: 1,
    simMinute: 0
  }), offer);
  assert.equal(offer.seen, true);
});

test("accepting and completing passenger passage pays fare and clears pending offer", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  const offer = passengerOfferForCity(state, LISBON, [LISBON, GOA, NAGASAKI], {
    spawnChance: 1,
    simMinute: 0,
    destinationTileId: NAGASAKI.tileId,
    createCharacter: () => ({ name: "Hana Sato" })
  });
  const before = state.doubloons;

  acceptQuest(state, offer);
  assert.equal(pendingPassengerOfferForCity(state, LISBON), null);
  const completed = completeQuest(state, NAGASAKI, { simMinute: 240 });

  assert.equal(completed.id, offer.id);
  assert.equal(state.doubloons, before + offer.reward);
  assert.equal(state.memory.quests.active, null);
  assert.equal(ledgerEntries(state).at(-1).description, "Passenger fare");
});

function port(tileId, city, country, cityType, factionId, lat, lon) {
  return { tileId, city, displayCity: city, country, cityType, factionId, population: 60000, lat, lon };
}
