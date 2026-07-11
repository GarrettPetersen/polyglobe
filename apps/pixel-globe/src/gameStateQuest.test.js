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

const LISBON = port(1, "Lisbon", "Portugal", "mediterranean", "portugal");
const PORTO = port(2, "Porto", "Portugal", "mediterranean", "portugal");
const GOA = port(3, "Goa", "India", "south-asian", "portugal");
const CADIZ = port(4, "Cadiz", "Spain", "mediterranean", "spain");
const DOVER = port(5, "Dover", "United Kingdom", "northern-european", "england");

test("delivery quests stay inside the same faction and region", () => {
  const quest = deliveryQuestForCity(LISBON, [LISBON, PORTO, GOA, CADIZ]);

  assert.equal(quest.factionId, "portugal");
  assert.equal(quest.regionKey, "mediterranean");
  assert.equal(quest.destinationTileId, PORTO.tileId);
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

function port(tileId, city, country, cityType, factionId) {
  return { tileId, city, displayCity: city, country, cityType, factionId, population: 60000, lat: 0, lon: 0 };
}
