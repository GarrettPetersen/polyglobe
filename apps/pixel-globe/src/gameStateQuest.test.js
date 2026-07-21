import assert from "node:assert/strict";
import test from "node:test";

import {
  DELIVERY_ROLL_PERIOD_MINUTES,
  DELIVERY_REPUTATION_GAIN,
  ONBOARDING_DELIVERY_COUNT,
  ONBOARDING_DELIVERY_SCENARIOS,
  acceptQuest,
  completeQuest,
  createGameState,
  deliveryOfferForCity,
  deliveryQuestForCity,
  factionReputation,
  questStateForCity,
  reconcileQuestPortTiles
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

test("new captains receive four guaranteed nearby courier jobs with varied purposes", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  const faro = port(6, "Faro", "Portugal", "mediterranean", "portugal", 37.02, -7.93);
  const ports = [LISBON, PORTO, faro, GOA, CADIZ];
  const scenarioIds = [];
  let origin = LISBON;

  for (let index = 0; index < ONBOARDING_DELIVERY_COUNT; index++) {
    const offer = deliveryOfferForCity(state, origin, ports, {
      simMinute: index * DELIVERY_ROLL_PERIOD_MINUTES
    });
    assert.ok(offer, `onboarding offer ${index + 1}`);
    assert.equal(offer.onboarding, true);
    assert.equal(offer.onboardingIndex, index);
    assert.match(offer.offerText, /chart will mark the way/i);
    scenarioIds.push(offer.scenarioId);

    const expectedNearest = origin.tileId === LISBON.tileId ? faro : LISBON;
    assert.equal(offer.destinationTileId, expectedNearest.tileId);
    acceptQuest(state, offer);
    completeQuest(state, expectedNearest, { simMinute: (index + 1) * 100 });
    origin = expectedNearest;
  }

  assert.deepEqual(scenarioIds, ONBOARDING_DELIVERY_SCENARIOS.map((scenario) => scenario.id));
  assert.equal(state.memory.quests.onboardingDeliveriesCompleted, ONBOARDING_DELIVERY_COUNT);
  assert.equal(deliveryOfferForCity(state, origin, ports, {
    simMinute: ONBOARDING_DELIVERY_COUNT * DELIVERY_ROLL_PERIOD_MINUTES,
    spawnChance: 0
  }), null);
});

test("established saves do not restart the new-captain courier sequence", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  delete state.memory.quests.onboardingDeliveriesCompleted;
  state.activePlaySeconds = 30 * 60;

  assert.equal(deliveryOfferForCity(state, LISBON, [LISBON, PORTO], {
    simMinute: 0,
    spawnChance: 0
  }), null);
  assert.equal(state.memory.quests.onboardingDeliveriesCompleted, ONBOARDING_DELIVERY_COUNT);
});

test("ports without an intra-faction regional destination offer no delivery quest", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });

  assert.equal(deliveryQuestForCity(DOVER, [DOVER, LISBON, PORTO]), null);
  assert.deepEqual(questStateForCity(state, DOVER, [DOVER, LISBON, PORTO]), {
    kind: "unavailable",
    quest: null
  });
});

test("delivery work must spawn before the factor can offer it", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  const ports = [LISBON, PORTO, GOA, CADIZ];

  assert.deepEqual(questStateForCity(state, LISBON, ports), { kind: "unavailable", quest: null });
  assert.equal(deliveryOfferForCity(state, LISBON, ports, { simMinute: 0, spawnChance: 0 }), null);
  assert.equal(deliveryOfferForCity(state, LISBON, ports, { simMinute: 1, spawnChance: 1 }), null);

  const offer = deliveryOfferForCity(state, LISBON, ports, {
    simMinute: DELIVERY_ROLL_PERIOD_MINUTES,
    spawnChance: 1
  });
  assert.equal(offer.kind, "delivery");
  assert.equal(questStateForCity(state, LISBON, ports).quest, offer);
  assert.equal(deliveryOfferForCity(state, LISBON, ports, {
    simMinute: DELIVERY_ROLL_PERIOD_MINUTES,
    spawnChance: 0
  }), offer);
});

test("completed package deliveries increase faction standing", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  const quest = deliveryQuestForCity(LISBON, [LISBON, PORTO, GOA, CADIZ]);
  const before = factionReputation(state, "portugal");

  acceptQuest(state, quest);
  completeQuest(state, PORTO, { simMinute: 100 });

  assert.equal(factionReputation(state, "portugal"), before + DELIVERY_REPUTATION_GAIN);
});

test("saved jobs rebind to corrected coastal port tiles", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  const oldLisbon = { ...LISBON, tileId: 101 };
  const oldPorto = { ...PORTO, tileId: 202 };
  const quest = deliveryQuestForCity(oldLisbon, [oldLisbon, oldPorto]);
  acceptQuest(state, quest);

  assert.equal(reconcileQuestPortTiles(state, [LISBON, PORTO]), 2);
  assert.equal(state.memory.quests.active.originTileId, LISBON.tileId);
  assert.equal(state.memory.quests.active.destinationTileId, PORTO.tileId);
  assert.equal(state.memory.quests.active.originKey, `Lisbon|Portugal|${LISBON.tileId}`);
  assert.equal(state.memory.quests.active.destinationKey, `Porto|Portugal|${PORTO.tileId}`);

  completeQuest(state, PORTO, { simMinute: 100 });
  assert.equal(state.memory.quests.active, null);
});

function port(tileId, city, country, cityType, factionId, lat, lon) {
  return { tileId, city, displayCity: city, country, cityType, factionId, population: 60000, lat, lon };
}
