import assert from "node:assert/strict";
import test from "node:test";

import {
  DELIVERY_ROLL_PERIOD_MINUTES,
  DELIVERY_REPUTATION_GAIN,
  CAPTURE_PORT_MISSION_REPUTATION_GAIN,
  ONBOARDING_DELIVERY_COUNT,
  ONBOARDING_DELIVERY_SCENARIOS,
  acceptQuest,
  advanceCapturePortMissionAfterConquest,
  capturePortMissionEligibility,
  capturePortMissionOfferForCity,
  commissionedPortCaptureFactionId,
  completeQuest,
  createGameState,
  deliveryOfferForCity,
  deliveryQuestForCity,
  factionReputation,
  questStateForCity,
  reconcileQuestPortTiles
} from "./gameState.js";
import { shipStatsForSlug } from "./shipStats.js";

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
const LONDON = {
  ...port(10, "London", "United Kingdom", "northern-european", "england", 51.51, -0.13),
  isFactionCapital: true,
  capitalOfFactionId: "england"
};
const CALAIS = port(11, "Calais", "France", "northern-european", "france", 50.95, 1.85);
const PARIS = {
  ...port(12, "Paris", "France", "northern-european", "france", 48.86, 2.35),
  isFactionCapital: true,
  capitalOfFactionId: "france"
};

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

test("a capable letter-of-marque captain can receive and complete a nearby capture commission", () => {
  const stats = shipStatsForSlug("large-junk");
  const state = createGameState({
    cargoCapacity: stats.cargoCapacity,
    playerCharacter: PLAYER,
    shipStats: stats
  });
  state.ship.crew = 36;
  state.ship.cannons = 8;
  state.relations.lettersOfMarque.england = { factionId: "england", simMinute: 0 };
  const ports = [LONDON, CALAIS, PARIS];
  const sailingDistanceKm = (origin, destination) => {
    if (origin.tileId === LONDON.tileId && destination.tileId === CALAIS.tileId) return 180;
    if (origin.tileId === LONDON.tileId && destination.tileId === PARIS.tileId) return 400;
    throw new Error(`Unexpected sailing-distance pair: ${origin.tileId}/${destination.tileId}`);
  };

  assert.equal(capturePortMissionEligibility(state).eligible, true);
  const offer = capturePortMissionOfferForCity(state, LONDON, ports, {
    simMinute: 0,
    spawnChance: 1,
    sailingDistanceKm
  });

  assert.equal(offer.kind, "capture-port");
  assert.equal(offer.targetTileId, CALAIS.tileId);
  assert.equal(offer.originFactionId, "england");
  assert.equal(offer.reward % 250, 0);
  assert.equal(questStateForCity(state, LONDON, ports).quest, offer);

  acceptQuest(state, offer);
  assert.equal(commissionedPortCaptureFactionId(state, CALAIS), "england");
  assert.equal(questStateForCity(state, CALAIS, ports).kind, "in-progress-here");

  const event = {
    portId: "calais",
    cityTileId: CALAIS.tileId,
    newFactionId: "england",
    source: "player"
  };
  advanceCapturePortMissionAfterConquest(state, CALAIS, event, 600);
  assert.equal(state.memory.quests.active.stage, "return");
  assert.equal(state.memory.quests.active.destinationTileId, LONDON.tileId);
  assert.equal(questStateForCity(state, LONDON, ports).kind, "ready-to-complete");

  const doubloonsBefore = state.doubloons;
  const reputationBefore = factionReputation(state, "england");
  completeQuest(state, LONDON, { simMinute: 800 });
  assert.equal(state.doubloons, doubloonsBefore + offer.reward);
  assert.equal(
    factionReputation(state, "england"),
    reputationBefore + CAPTURE_PORT_MISSION_REPUTATION_GAIN
  );
  assert.equal(state.memory.quests.active, null);
});

test("capture commissions require guns, a full landing company, and a letter of marque", () => {
  const stats = shipStatsForSlug("large-junk");
  const state = createGameState({
    cargoCapacity: stats.cargoCapacity,
    playerCharacter: PLAYER,
    shipStats: stats
  });
  const context = {
    simMinute: 0,
    spawnChance: 1,
    sailingDistanceKm: () => 180
  };

  state.ship.crew = 36;
  state.ship.cannons = 8;
  assert.equal(capturePortMissionOfferForCity(state, LONDON, [LONDON, CALAIS], context), null);

  state.relations.lettersOfMarque.england = { factionId: "england", simMinute: 0 };
  state.ship.cannons = 7;
  assert.equal(capturePortMissionEligibility(state).eligible, false);
  assert.equal(capturePortMissionOfferForCity(state, LONDON, [LONDON, CALAIS], context), null);

  state.ship.cannons = 8;
  state.ship.crew = 35;
  assert.equal(capturePortMissionEligibility(state).eligible, false);
  assert.equal(capturePortMissionOfferForCity(state, LONDON, [LONDON, CALAIS], context), null);
});

test("ordinary passenger work improves standing with the commissioning port", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  const quest = {
    id: "passenger-standing-test",
    kind: "passenger",
    originKey: `London|United Kingdom|${LONDON.tileId}`,
    originTileId: LONDON.tileId,
    originName: "London",
    originCountry: "United Kingdom",
    originFactionId: "england",
    destinationKey: `Dover|United Kingdom|${DOVER.tileId}`,
    destinationTileId: DOVER.tileId,
    destinationName: "Dover",
    destinationCountry: "United Kingdom",
    distanceKm: 120,
    reward: 100,
    passenger: { name: "Thomas Hale" }
  };
  const before = factionReputation(state, "england");

  acceptQuest(state, quest);
  completeQuest(state, DOVER, { simMinute: 100 });

  assert.equal(factionReputation(state, "england"), before + DELIVERY_REPUTATION_GAIN);
});

function port(tileId, city, country, cityType, factionId, lat, lon) {
  return { tileId, city, displayCity: city, country, cityType, factionId, population: 60000, lat, lon };
}
