import assert from "node:assert/strict";
import test from "node:test";

import {
  DELIVERY_REPUTATION_GAIN,
  acceptQuest,
  completeQuest,
  createGameState,
  deliveryQuestForCity,
  factionReputation,
  questStateForCity
} from "./gameState.js";

const PLAYER = {
  name: "Joan Alden",
  nationalityId: "england",
  expressions: ["neutral", "happy"]
};

const LISBON = port(1, "Lisbon", "Portugal", "mediterranean", "portugal", 38.72, -9.14);
const PORTO = port(2, "Porto", "Portugal", "mediterranean", "portugal", 41.15, -8.61);
const GOA = port(3, "Goa", "India", "south-asian", "portugal", 15.5, 73.83);
const CADIZ = port(4, "Cadiz", "Spain", "mediterranean", "spain", 36.53, -6.29);
const DOVER = port(5, "Dover", "United Kingdom", "northern-european", "england", 51.13, 1.31);

test("delivery quests stay inside the same faction and region", () => {
  const quest = deliveryQuestForCity(LISBON, [LISBON, PORTO, GOA, CADIZ]);

  assert.equal(quest.factionId, "portugal");
  assert.equal(quest.regionKey, "mediterranean");
  assert.equal(quest.destinationTileId, PORTO.tileId);
  assert.ok(quest.distanceKm >= 270 && quest.distanceKm <= 280);
});

test("ports without an intra-faction regional destination offer no delivery quest", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });

  assert.equal(deliveryQuestForCity(DOVER, [DOVER, LISBON, PORTO]), null);
  assert.deepEqual(questStateForCity(state, DOVER, [DOVER, LISBON, PORTO]), {
    kind: "unavailable",
    quest: null
  });
});

test("completed package deliveries increase faction standing", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  const quest = deliveryQuestForCity(LISBON, [LISBON, PORTO, GOA, CADIZ]);
  const before = factionReputation(state, "portugal");

  acceptQuest(state, quest);
  completeQuest(state, PORTO, { simMinute: 100 });

  assert.equal(factionReputation(state, "portugal"), before + DELIVERY_REPUTATION_GAIN);
});

function port(tileId, city, country, cityType, factionId, lat, lon) {
  return { tileId, city, displayCity: city, country, cityType, factionId, population: 60000, lat, lon };
}
