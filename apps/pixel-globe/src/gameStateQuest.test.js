import assert from "node:assert/strict";
import test from "node:test";

import {
  CAPTURE_CAPITAL_MISSION_REPUTATION_GAIN,
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
  grantGuaranteedMissionPerkItem,
  isCaptureCapitalQuest,
  prepareHighValueMissionPerkItem,
  questStateForCity,
  receiveRescuedTravelerReunionReward,
  refreshPlayerPerkCargoCapacity,
  reconcileQuestPortTiles,
  reconcileQuestWorldAssumptions
} from "./gameState.js";
import { PERK_ITEMS } from "./perkItems.js";
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
  assert.equal(state.memory.decisions["reputation.mission.portugal"], 1);
});

test("rescued traveler reunions remain cash-payable after every perk item is owned", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  for (const item of PERK_ITEMS) state.inventory.items[item.id] = 1;
  refreshPlayerPerkCargoCapacity(state);

  const missionId = "pirate-captive:test:complete-catalog";
  assert.equal(prepareHighValueMissionPerkItem(state, LONDON, missionId), null);
  assert.equal(prepareHighValueMissionPerkItem(state, LONDON, missionId), null);
  assert.equal(state.memory.missionItemGifts[missionId], null);

  const before = state.doubloons;
  const reward = receiveRescuedTravelerReunionReward(state, LONDON, {
    missionId,
    rewardDoubloons: 1200,
    itemId: null,
    context: { simMinute: 100 }
  });
  assert.deepEqual(reward, { rewardDoubloons: 1200, item: null, itemAlreadyOwned: false });
  assert.equal(state.doubloons, before + 1200);
  assert.equal(
    state.accounts.ledger.some((entry) => entry.description.startsWith("Family gift:")),
    false
  );
});

test("an interrupted reunion does not promise a unique item acquired in the meantime", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  const missionId = "pirate-captive:test:reserved-item-collision";
  const reserved = prepareHighValueMissionPerkItem(state, LONDON, missionId);
  assert.ok(reserved);

  state.inventory.items[reserved.id] = 1;
  refreshPlayerPerkCargoCapacity(state);

  assert.equal(prepareHighValueMissionPerkItem(state, LONDON, missionId), null);
  assert.equal(state.memory.missionItemGifts[missionId], null);
});

test("guaranteed quest rewards remain idempotent when the player already owns the item", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  const item = PERK_ITEMS[0];
  state.inventory.items[item.id] = 1;
  refreshPlayerPerkCargoCapacity(state);

  const reward = grantGuaranteedMissionPerkItem(state, LONDON, {
    missionId: "quest-reward-already-owned",
    itemId: item.id,
    context: { simMinute: 100 }
  });

  assert.equal(reward.item.id, item.id);
  assert.equal(reward.alreadyResolved, true);
  assert.equal(state.inventory.items[item.id], 1);
});

test("an old guaranteed reward keeps its reserved item when the quest definition changes", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  const missionId = "quest-reward-definition-change";
  const previousItem = PERK_ITEMS[1];
  state.memory.missionItemGifts[missionId] = previousItem.id;

  const reward = grantGuaranteedMissionPerkItem(state, LONDON, {
    missionId,
    itemId: PERK_ITEMS[0].id,
    context: { simMinute: 100 }
  });

  assert.equal(reward.item.id, previousItem.id);
  assert.equal(state.inventory.items[previousItem.id], 1);
  assert.equal(state.inventory.items[PERK_ITEMS[0].id] || 0, 0);
});

test("an interrupted reunion still pays cash when its promised item is now owned", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  const missionId = "pirate-captive:test:stale-promised-item";
  const promised = prepareHighValueMissionPerkItem(state, LONDON, missionId);
  state.inventory.items[promised.id] = 1;
  refreshPlayerPerkCargoCapacity(state);

  const before = state.doubloons;
  const reward = receiveRescuedTravelerReunionReward(state, LONDON, {
    missionId,
    rewardDoubloons: 1200,
    itemId: promised.id,
    context: { simMinute: 100 }
  });

  assert.equal(reward.item, null);
  assert.equal(reward.itemAlreadyOwned, true);
  assert.equal(state.doubloons, before + 1200);
  assert.equal(state.inventory.items[promised.id], 1);
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

test("stable destination tiles absorb city renames without stranding active work", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  const quest = deliveryQuestForCity(LISBON, [LISBON, PORTO]);
  acceptQuest(state, quest);
  const renamedPorto = { ...PORTO, displayCity: "Portus Cale", factionId: "spain" };

  assert.equal(reconcileQuestPortTiles(state, [LISBON, renamedPorto]), 1);
  assert.equal(state.memory.quests.active.destinationName, "Portus Cale");
  assert.equal(state.memory.quests.active.destinationTileId, PORTO.tileId);
  completeQuest(state, renamedPorto, { simMinute: 100 });
  assert.equal(state.memory.quests.active, null);
});

test("an allied capture recalls an active commission instead of leaving an impossible target", () => {
  const stats = shipStatsForSlug("large-junk");
  const state = createGameState({
    cargoCapacity: stats.cargoCapacity,
    playerCharacter: PLAYER,
    shipStats: stats
  });
  state.ship.crew = 36;
  state.ship.cannons = 8;
  state.relations.lettersOfMarque.england = { factionId: "england", simMinute: 0 };
  const offer = capturePortMissionOfferForCity(state, LONDON, [LONDON, CALAIS, PARIS], {
    simMinute: 0,
    spawnChance: 1,
    sailingDistanceKm: (origin, destination) => destination.tileId === CALAIS.tileId ? 180 : 500
  });
  acceptQuest(state, offer);
  const capturedCalais = { ...CALAIS, factionId: "england", foundingFactionId: "france" };
  const beforeReputation = factionReputation(state, "england");

  const result = reconcileQuestWorldAssumptions(state, [LONDON, capturedCalais, PARIS]);
  const active = state.memory.quests.active;
  assert.equal(active.stage, "return");
  assert.equal(active.captureCommissionResolution, "secured-by-allies");
  assert.equal(active.destinationTileId, LONDON.tileId);
  assert.ok(active.reward < active.originalReward);
  assert.equal(result.events.some((event) => event.type === "capture-commission-recalled"), true);

  completeQuest(state, LONDON, { simMinute: 100 });
  assert.equal(factionReputation(state, "england"), beforeReputation);
});

test("a fallen issuing court recalls its capture order through the original office", () => {
  const stats = shipStatsForSlug("large-junk");
  const state = createGameState({
    cargoCapacity: stats.cargoCapacity,
    playerCharacter: PLAYER,
    shipStats: stats
  });
  state.ship.crew = 36;
  state.ship.cannons = 8;
  state.relations.lettersOfMarque.england = { factionId: "england", simMinute: 0 };
  const offer = capturePortMissionOfferForCity(state, LONDON, [LONDON, CALAIS, PARIS], {
    simMinute: 0,
    spawnChance: 1,
    sailingDistanceKm: () => 180
  });
  acceptQuest(state, offer);
  const capturedLondon = { ...LONDON, factionId: "france", foundingFactionId: "england" };

  reconcileQuestWorldAssumptions(state, [capturedLondon, CALAIS, PARIS]);

  assert.equal(state.memory.quests.active.stage, "return");
  assert.equal(state.memory.quests.active.captureCommissionResolution, "issuer-fallen");
  assert.equal(state.memory.quests.active.destinationTileId, LONDON.tileId);
  completeQuest(state, capturedLondon, { simMinute: 100 });
  assert.equal(state.memory.quests.active, null);
});

test("pending political offers disappear when conquest invalidates their premise", () => {
  const stats = shipStatsForSlug("large-junk");
  const state = createGameState({
    cargoCapacity: stats.cargoCapacity,
    playerCharacter: PLAYER,
    shipStats: stats
  });
  state.ship.crew = 36;
  state.ship.cannons = 8;
  state.relations.lettersOfMarque.england = { factionId: "england", simMinute: 0 };
  const offer = capturePortMissionOfferForCity(state, LONDON, [LONDON, CALAIS, PARIS], {
    simMinute: 0,
    spawnChance: 1,
    sailingDistanceKm: () => 180
  });
  assert.ok(offer);

  const capturedTarget = { ...CALAIS, factionId: "england", foundingFactionId: "france" };
  const result = reconcileQuestWorldAssumptions(state, [LONDON, capturedTarget, PARIS]);

  assert.deepEqual(state.memory.quests.capturePortOffers, {});
  assert.equal(result.events.some((event) => event.type === "capture-offer-invalidated"), true);
});

test("an embassy follows a displaced court and returns safely if that court has no port", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  state.memory.quests.active = {
    id: "friendly-envoy-displaced-court",
    kind: "friendly-envoy",
    stage: "outbound",
    originKey: `London|United Kingdom|${LONDON.tileId}`,
    originTileId: LONDON.tileId,
    originName: LONDON.city,
    originCountry: LONDON.country,
    originFactionId: "england",
    targetKey: `Calais|France|${CALAIS.tileId}`,
    targetTileId: CALAIS.tileId,
    targetName: CALAIS.city,
    targetCountry: CALAIS.country,
    targetFactionId: "france",
    destinationKey: `Calais|France|${CALAIS.tileId}`,
    destinationTileId: CALAIS.tileId,
    destinationName: CALAIS.city,
    destinationCountry: CALAIS.country,
    reward: 600,
    dialogue: {}
  };
  const capturedCalais = { ...CALAIS, factionId: "england", foundingFactionId: "france" };

  reconcileQuestWorldAssumptions(state, [LONDON, capturedCalais, PARIS]);
  assert.equal(state.memory.quests.active.targetTileId, PARIS.tileId);
  assert.equal(state.memory.quests.active.stage, "outbound");

  reconcileQuestWorldAssumptions(state, [LONDON, capturedCalais]);
  assert.equal(state.memory.quests.active.stage, "return");
  assert.equal(state.memory.quests.active.destinationTileId, LONDON.tileId);
  assert.equal(state.memory.quests.active.envoyWorldResolution, "target-court-fallen");
  assert.equal(state.memory.quests.active.reward, 300);
  completeQuest(state, LONDON, { simMinute: 100 });
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

test("a mostly defeated enemy can trigger a distinct war-ending capital commission", () => {
  const stats = shipStatsForSlug("large-junk");
  const state = createGameState({
    cargoCapacity: stats.cargoCapacity,
    playerCharacter: PLAYER,
    shipStats: stats
  });
  state.ship.crew = 36;
  state.ship.cannons = 8;
  state.relations.lettersOfMarque.england = { factionId: "england", simMinute: 0 };
  const rouen = {
    ...port(13, "Rouen", "France", "northern-european", "england", 49.44, 1.1),
    foundingFactionId: "france"
  };
  const bordeaux = {
    ...port(14, "Bordeaux", "France", "northern-european", "england", 44.84, -0.58),
    foundingFactionId: "france"
  };
  const marseille = {
    ...port(15, "Marseille", "France", "mediterranean", "england", 43.3, 5.37),
    foundingFactionId: "france"
  };
  const capturedCalais = {
    ...CALAIS,
    factionId: "england",
    foundingFactionId: "france"
  };
  const ports = [LONDON, PARIS, capturedCalais, rouen, bordeaux, marseille];
  const offer = capturePortMissionOfferForCity(state, LONDON, ports, {
    simMinute: 0,
    spawnChance: 1,
    sailingDistanceKm: (origin, destination) => {
      assert.equal(origin.tileId, LONDON.tileId);
      assert.equal(destination.tileId, PARIS.tileId);
      return 520;
    }
  });

  assert.equal(isCaptureCapitalQuest(offer), true);
  assert.equal(offer.targetTileId, PARIS.tileId);
  assert.equal(offer.originalEnemyPortCount, 5);
  assert.equal(offer.remainingEnemyPortCount, 1);
  assert.equal(offer.enemyPortsLost, 4);
  assert.ok(offer.reward >= 12000);

  acceptQuest(state, offer);
  const event = {
    portId: "paris",
    cityTileId: PARIS.tileId,
    newFactionId: "england",
    source: "player"
  };
  advanceCapturePortMissionAfterConquest(state, PARIS, event, 600);
  const reputationBefore = factionReputation(state, "england");
  completeQuest(state, LONDON, { simMinute: 800 });

  assert.equal(
    factionReputation(state, "england"),
    reputationBefore + CAPTURE_CAPITAL_MISSION_REPUTATION_GAIN
  );
});

test("losing one port makes a two-port power eligible for a final capital commission", () => {
  const stats = shipStatsForSlug("large-junk");
  const state = createGameState({
    cargoCapacity: stats.cargoCapacity,
    playerCharacter: PLAYER,
    shipStats: stats
  });
  state.ship.crew = 36;
  state.ship.cannons = 8;
  state.relations.lettersOfMarque.england = { factionId: "england", simMinute: 0 };
  const capturedCalais = {
    ...CALAIS,
    factionId: "england",
    foundingFactionId: "france"
  };
  const offer = capturePortMissionOfferForCity(state, LONDON, [LONDON, PARIS, capturedCalais], {
    simMinute: 0,
    spawnChance: 1,
    sailingDistanceKm: () => 520
  });

  assert.equal(offer.kind, "capture-capital");
  assert.equal(offer.originalEnemyPortCount, 2);
  assert.equal(offer.remainingEnemyPortCount, 1);
  assert.equal(offer.enemyPortsLost, 1);
});

test("a capital-only power can receive the only possible capture commission", () => {
  const stats = shipStatsForSlug("large-junk");
  const state = createGameState({
    cargoCapacity: stats.cargoCapacity,
    playerCharacter: PLAYER,
    shipStats: stats
  });
  state.ship.crew = 36;
  state.ship.cannons = 8;
  state.relations.lettersOfMarque.england = { factionId: "england", simMinute: 0 };
  const offer = capturePortMissionOfferForCity(state, LONDON, [LONDON, PARIS], {
    simMinute: 0,
    spawnChance: 1,
    sailingDistanceKm: () => 520
  });

  assert.equal(offer.kind, "capture-capital");
  assert.equal(offer.originalEnemyPortCount, 1);
  assert.equal(offer.remainingEnemyPortCount, 1);
  assert.equal(offer.enemyPortsLost, 0);
});

test("an active colonization expedition does not suppress a capital capture commission", () => {
  const stats = shipStatsForSlug("large-junk");
  const state = createGameState({
    cargoCapacity: stats.cargoCapacity,
    playerCharacter: PLAYER,
    shipStats: stats
  });
  state.ship.crew = 36;
  state.ship.cannons = 8;
  state.relations.lettersOfMarque.england = { factionId: "england", simMinute: 0 };
  state.memory.colonization.stage = "fetch";
  state.memory.colonization.targetTileId = 99;
  state.memory.colonization.targetCity = "Jamestown";
  state.memory.colonization.targetCountry = "United States of America";
  state.memory.colonization.originTileId = LONDON.tileId;
  state.memory.colonization.originCity = LONDON.city;
  state.memory.colonization.originCountry = LONDON.country;
  state.memory.colonization.distanceKm = 5900;
  state.memory.colonization.offerSeen = true;

  const offer = capturePortMissionOfferForCity(state, LONDON, [LONDON, PARIS], {
    simMinute: 0,
    spawnChance: 1,
    sailingDistanceKm: () => 520
  });

  assert.equal(offer.kind, "capture-capital");
  assert.equal(offer.targetTileId, PARIS.tileId);
  assert.equal(state.memory.colonization.stage, "fetch");
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
