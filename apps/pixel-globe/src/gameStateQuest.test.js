import assert from "node:assert/strict";
import test from "node:test";

import {
  CAPTURE_CAPITAL_MISSION_REPUTATION_GAIN,
  CAPTURE_COMMISSION_INDEPENDENT_PETITION_ID,
  DELIVERY_ROLL_PERIOD_MINUTES,
  DELIVERY_REPUTATION_GAIN,
  CAPTURE_PORT_MISSION_REPUTATION_GAIN,
  ONBOARDING_DELIVERY_COUNT,
  ONBOARDING_DELIVERY_SCENARIOS,
  PORT_NAVIGATION_REASON_SHIPYARD_SUPPLY,
  acceptQuest,
  addPortNavigationWaypoint,
  advanceCapturePortMissionAfterConquest,
  capturePortMissionMatchesConquest,
  captureCommissionAutomaticOfferChance,
  captureCommissionPetitionOptionsForCity,
  capturePortMissionEligibility,
  capturePortMissionLoadoutRecommendation,
  capturePortMissionOfferForCity,
  commissionedPortCaptureFactionId,
  completeQuest,
  createGameState,
  deliveryOfferForCity,
  deliveryQuestForCity,
  factionReputation,
  grantGuaranteedMissionPerkItem,
  isCaptureCapitalQuest,
  petitionCaptureCommission,
  playerPortAttackStatus,
  prepareHighValueMissionPerkItem,
  questStateForCity,
  receiveRescuedTravelerReunionReward,
  refreshPlayerPerkCargoCapacity,
  reconcileQuestPortTiles,
  reconcileQuestWorldAssumptions
} from "./gameState.js";
import { INLAND_CITY_SAILING_GATEWAYS_1522 } from "./cityPortAccessPolicy.js";
import {
  CAPTURE_COMMISSION_PRIORITY_HISTORICAL_ATTEMPT,
  CAPTURE_COMMISSION_PRIORITY_HISTORICAL_CONQUEST,
  CAPTURE_COMMISSION_PRIORITY_RETAKE,
  CAPTURE_COMMISSION_PRIORITY_STRATEGIC
} from "./captureCommissionPriorities.js";
import { PERK_ITEMS } from "./perkItems.js";
import { shipStatsForSlug } from "./shipStats.js";
import { shipLoadoutPlan } from "./shipLoadouts.js";
import { gameMinuteForDate } from "./rulers.js";
import { NEUTRAL_FACTION_ID } from "./factions.js";
import { PRE_NORTH_MALUKU_PORT_TILE_IDS } from "./portCatalogMigration.js";

const PLAYER = {
  id: "player:joan-alden",
  name: "Joan Alden",
  nationalityId: "england",
  homePortCityId: "lisbon|portugal",
  homePortTileId: 1,
  homePortName: "Lisbon",
  homePortCountry: "Portugal",
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

function putEnglandAtWarWithFrance(state) {
  state.relations.diplomacy.overrides["england|france"] = "war";
  state.relations.diplomacy.pairLastChangedMinute["england|france"] = 0;
}

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

test("saved jobs rebind through an explicit coastal-port migration", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  const oldLisbon = { ...LISBON, tileId: 101 };
  const oldPorto = { ...PORTO, tileId: 202 };
  const quest = deliveryQuestForCity(oldLisbon, [oldLisbon, oldPorto]);
  acceptQuest(state, quest);

  assert.equal(reconcileQuestPortTiles(state, [LISBON, PORTO], {
    legacyPortTileIds: new Map([
      [oldLisbon.tileId, LISBON.tileId],
      [oldPorto.tileId, PORTO.tileId]
    ])
  }), 2);
  assert.equal(state.memory.quests.active.originTileId, LISBON.tileId);
  assert.equal(state.memory.quests.active.destinationTileId, PORTO.tileId);
  assert.equal(state.memory.quests.active.originKey, LISBON.cityId);
  assert.equal(state.memory.quests.active.destinationKey, PORTO.cityId);

  completeQuest(state, PORTO, { simMinute: 100 });
  assert.equal(state.memory.quests.active, null);
});

test("every saved inland sailing reference moves to its canonical maritime gateway", () => {
  INLAND_CITY_SAILING_GATEWAYS_1522.forEach(({ inlandCityId, gatewayCityId }, index) => {
    const inland = canonicalTestCity(inlandCityId, 1000 + index);
    const gateway = canonicalTestCity(gatewayCityId, 2000 + index);
    const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
    const quest = deliveryQuestForCity(LISBON, [LISBON, PORTO]);
    acceptQuest(state, quest);
    Object.assign(state.memory.quests.active, {
      destinationCityId: inland.cityId,
      destinationTileId: inland.tileId,
      destinationName: inland.city,
      destinationCountry: inland.country,
      destinationKey: inland.cityId
    });
    addPortNavigationWaypoint(state, {
      destinationCityId: inland.cityId,
      destinationTileId: inland.tileId,
      destinationName: inland.city,
      reason: PORT_NAVIGATION_REASON_SHIPYARD_SUPPLY,
      shipyardMaterialGoodId: "timber"
    });
    Object.assign(state.playerCharacter, {
      homePortCityId: inland.cityId,
      homePortTileId: inland.tileId,
      homePortName: inland.city,
      homePortCountry: inland.country
    });
    Object.assign(state.memory.campaignGoal, {
      homePortCityId: inland.cityId,
      homePortTileId: inland.tileId
    });

    const result = reconcileQuestWorldAssumptions(state, [LISBON, gateway], {
      identityCities: [LISBON, inland, gateway]
    });

    assert.ok(result.endpointUpdates >= 3, inland.cityId);
    assert.equal(state.memory.quests.active.destinationCityId, gateway.cityId);
    assert.equal(state.memory.quests.active.destinationTileId, gateway.tileId);
    assert.equal(state.playerCharacter.homePortCityId, gateway.cityId);
    assert.equal(state.playerCharacter.homePortTileId, gateway.tileId);
    assert.deepEqual(state.memory.navigation.optionalWaypoints, [{
      id: `port:${gateway.cityId}:shipyard-supply:timber`,
      destinationCityId: gateway.cityId,
      destinationTileId: gateway.tileId,
      destinationName: gateway.city,
      reason: PORT_NAVIGATION_REASON_SHIPYARD_SUPPLY,
      shipyardMaterialGoodId: "timber"
    }]);
  });
});

test("a legacy port mapping wins when its old tile is now another canonical port", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  const oldMakian = port(
    366350, "Makian Village", "Indonesia", "southeast-asian", "portugal", 0.32, 127.37
  );
  const oldTernate = port(
    23005, "Ternate", "Indonesia", "southeast-asian", "portugal", 0.79, 127.38
  );
  const currentTidore = port(
    366350, "Tidore", "Indonesia", "southeast-asian", "portugal", 0.67, 127.45
  );
  const currentMakian = { ...oldMakian, tileId: 366359 };
  const currentTernate = { ...oldTernate, tileId: 366292 };
  acceptQuest(state, deliveryQuestForCity(oldTernate, [oldTernate, oldMakian]));

  assert.equal(reconcileQuestPortTiles(state, [currentTernate, currentTidore, currentMakian], {
    legacyPortTileIds: PRE_NORTH_MALUKU_PORT_TILE_IDS
  }), 2);
  assert.equal(state.memory.quests.active.originTileId, currentTernate.tileId);
  assert.equal(state.memory.quests.active.destinationTileId, currentMakian.tileId);
  assert.notEqual(state.memory.quests.active.destinationTileId, currentTidore.tileId);
});

test("port reconciliation repairs a nested crewmate home left behind by an earlier upgrade", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  state.namedCrew.push({
    id: "utrecht-crewmate",
    name: "Anna van Utrecht",
    expressions: ["neutral"],
    skillIds: ["able-seaman"],
    role: "crewmate",
    joinedCrew: true,
    homePortTileId: 160888,
    homePortName: "Utrecht",
    homePortCountry: "Netherlands"
  });
  const currentUtrecht = port(
    643413,
    "Utrecht",
    "Netherlands",
    "northern-european",
    "utrecht",
    52.09,
    5.12
  );

  assert.equal(reconcileQuestPortTiles(state, [currentUtrecht], {
    legacyPortTileIds: new Map([[160888, currentUtrecht.tileId]])
  }), 1);
  assert.equal(state.namedCrew[0].homePortTileId, currentUtrecht.tileId);
  assert.equal(state.namedCrew[0].homePortName, "Utrecht");
});

test("saved port references follow canonical identities without guessing from display names", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  const oldLisbon = { ...LISBON, tileId: 101 };
  const oldPorto = { ...PORTO, tileId: 202 };
  acceptQuest(state, deliveryQuestForCity(oldLisbon, [oldLisbon, oldPorto]));

  assert.equal(reconcileQuestPortTiles(state, [LISBON, PORTO]), 2);
  assert.equal(state.memory.quests.active.originTileId, LISBON.tileId);
  assert.equal(state.memory.quests.active.destinationTileId, PORTO.tileId);
});

test("save reconciliation collapses dual-written port aliases without discarding later history", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  const legacyLisbonTileId = 101;
  const legacyId = `city-${legacyLisbonTileId}`;
  state.memory.flags[`shoreBatteryDisabledUntil:${legacyId}`] = 900;
  state.memory.flags[`shoreBatteryDisabledByShip:${legacyId}`] = "the Pelican";
  state.memory.flags[`shoreBatteryUpgradeLevel:${legacyId}`] = 2;
  state.memory.flags[`shoreBatteryDisabledUntil:${LISBON.cityId}`] = 700;
  state.memory.flags[`shoreBatteryDisabledByShip:${LISBON.cityId}`] = "the Golden Hind";
  state.memory.flags[`shoreBatteryUpgradeLevel:${LISBON.cityId}`] = 1;

  assert.ok(reconcileQuestPortTiles(state, [LISBON, PORTO], {
    legacyPortTileIds: new Map([[legacyLisbonTileId, LISBON.tileId]])
  }) > 0);
  assert.equal(state.memory.flags[`shoreBatteryDisabledUntil:${LISBON.cityId}`], 900);
  assert.equal(state.memory.flags[`shoreBatteryDisabledByShip:${LISBON.cityId}`], "the Pelican");
  assert.equal(state.memory.flags[`shoreBatteryUpgradeLevel:${LISBON.cityId}`], 2);
  assert.equal(state.memory.flags[`shoreBatteryDisabledUntil:${legacyId}`], undefined);
  assert.equal(state.memory.flags[`shoreBatteryDisabledByShip:${legacyId}`], undefined);
  assert.equal(state.memory.flags[`shoreBatteryUpgradeLevel:${legacyId}`], undefined);
  assert.equal(reconcileQuestPortTiles(state, [LISBON, PORTO], {
    legacyPortTileIds: new Map([[legacyLisbonTileId, LISBON.tileId]])
  }), 0);
});

test("constitutional conquest history is reconciled by its event kind rather than as a port capture", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  state.memory.conquest.events.push(
    {
      id: "succession-test-portugal-spain",
      kind: "faction-succession",
      predecessorFactionId: "portugal",
      successorFactionId: "spain",
      capitalPortId: LISBON.cityId,
      cityPortIds: [LISBON.cityId, PORTO.cityId],
      simMinute: 100,
      source: "test"
    },
    {
      id: "collapse-test-portugal",
      kind: "faction-collapse",
      factionId: "portugal",
      successorFactionId: "spain",
      simMinute: 101,
      source: "test"
    }
  );

  assert.doesNotThrow(() => reconcileQuestPortTiles(state, [LISBON, PORTO]));
  assert.equal(state.memory.conquest.events[0].capitalPortId, LISBON.cityId);
  assert.deepEqual(state.memory.conquest.events[0].cityPortIds, [
    LISBON.cityId,
    PORTO.cityId
  ]);
});

test("stable city identities absorb city renames without stranding active work", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  const quest = deliveryQuestForCity(LISBON, [LISBON, PORTO]);
  acceptQuest(state, quest);
  const renamedPorto = { ...PORTO, displayCity: "Portus Cale", factionId: "spain" };

  assert.ok(reconcileQuestPortTiles(state, [LISBON, renamedPorto]) >= 1);
  assert.equal(state.memory.quests.active.destinationName, "Portus Cale");
  assert.equal(state.memory.quests.active.destinationTileId, PORTO.tileId);
  completeQuest(state, renamedPorto, { simMinute: 100 });
  assert.equal(state.memory.quests.active, null);
});

test("court history resolves a dynamic colony port alias to its canonical city id", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  const manila = {
    ...port(13, "Manila", "Philippines", "southeast-asian", "spain", 14.58, 121),
    playerDevelopedPort: true
  };
  state.relations.courts.history.push({
    id: "court-action-14-court-13-royal-dispatch-22761",
    simMinute: 22761,
    source: "autonomous-court",
    authorityFactionId: "spain",
    kind: "royal-dispatch",
    targetFactionId: "spain",
    secondaryFactionId: null,
    destinationCityId: "colony-manila-philippines",
    destinationName: "Manila",
    headline: "Spanish authority renewed at Manila",
    detail: "The court receives its officers' return."
  });
  state.relations.courts.portServiceMinutes["colony-manila-philippines"] = 22761;

  assert.equal(reconcileQuestPortTiles(state, [LISBON, manila]), 2);
  assert.equal(state.relations.courts.history[0].destinationCityId, manila.cityId);
  assert.deepEqual(state.relations.courts.portServiceMinutes, {
    [manila.cityId]: 22761
  });
  assert.equal(reconcileQuestPortTiles(state, [LISBON, manila]), 0);
});

test("conquistador inland transfers use the city catalog without entering port routing", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  const panama = port(137225, "Panama City", "Panama", "latin-american", "spain", 8.98, -79.52);
  const chanChan = port(134664, "Chanchan", "Peru", "andean", "spain", -8.11, -79.07);
  const cuzco = port(134123, "Cuzco", "Peru", "andean", "inca", -13.53, -71.97);
  Object.assign(state.memory.quests.conquistador, {
    stage: "campaign",
    offerSeen: true,
    originCityId: panama.cityId,
    originTileId: panama.tileId,
    targetCityId: chanChan.cityId,
    targetTileId: chanChan.tileId,
    companyStrength: 0,
    companyNeedsReplenishment: false,
    capturedAtMinute: 100,
    rewardReadyMinute: 1000,
    transferSchedule: [{ cityId: cuzco.cityId, tileId: cuzco.tileId, simMinute: 900 }],
    transferredCityIds: []
  });

  const result = reconcileQuestWorldAssumptions(state, [panama, chanChan], {
    identityCities: [panama, chanChan, cuzco]
  });

  assert.equal(result.endpointUpdates, 0);
  assert.equal(state.memory.quests.conquistador.transferSchedule[0].cityId, cuzco.cityId);
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
  putEnglandAtWarWithFrance(state);
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
  putEnglandAtWarWithFrance(state);
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
  putEnglandAtWarWithFrance(state);
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
  putEnglandAtWarWithFrance(state);
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
    cityId: CALAIS.cityId,
    cityTileId: CALAIS.tileId,
    newFactionId: "england",
    source: "player"
  };
  const unrelatedConquest = {
    portId: "paris",
    cityId: PARIS.cityId,
    cityTileId: PARIS.tileId,
    newFactionId: "england",
    source: "player"
  };
  assert.equal(capturePortMissionMatchesConquest(state, PARIS, unrelatedConquest), false);
  assert.equal(state.memory.quests.active.stage, "capture");
  assert.equal(capturePortMissionMatchesConquest(state, CALAIS, event), true);
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

test("Mughal conquest commissions prefer historical expansion fronts over the nearest war", () => {
  const stats = shipStatsForSlug("large-junk");
  const state = createGameState({
    cargoCapacity: stats.cargoCapacity,
    playerCharacter: PLAYER,
    shipStats: stats
  });
  state.ship.crew = 36;
  state.ship.cannons = 8;
  state.relations.lettersOfMarque.mughal = { factionId: "mughal", simMinute: 0 };
  state.relations.diplomacy.overrides["bengal|mughal"] = "war";
  state.relations.diplomacy.overrides["gujarat|mughal"] = "war";
  const agra = {
    ...port(30, "Agra", "India", "south-asian", "mughal", 27.18, 78.02),
    isFactionCapital: true,
    capitalOfFactionId: "mughal"
  };
  const patna = port(31, "Patna", "India", "south-asian", "bengal", 25.61, 85.14);
  const surat = port(32, "Surat", "India", "south-asian", "gujarat", 21.17, 72.83);

  const offer = capturePortMissionOfferForCity(state, agra, [agra, patna, surat], {
    simMinute: gameMinuteForDate(1535, 1, 1),
    spawnChance: 1,
    sailingDistanceKm: (_origin, destination) => destination.tileId === patna.tileId ? 900 : 200
  });

  assert.equal(offer.kind, "capture-port");
  assert.equal(offer.originFactionId, "mughal");
  assert.equal(offer.targetFactionId, "bengal");
  assert.equal(offer.targetTileId, patna.tileId);
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
  putEnglandAtWarWithFrance(state);
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
    cityId: PARIS.cityId,
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
  putEnglandAtWarWithFrance(state);
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
  putEnglandAtWarWithFrance(state);
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
  putEnglandAtWarWithFrance(state);
  state.memory.colonization.stage = "fetch";
  state.memory.colonization.targetTileId = 99;
  state.memory.colonization.targetCityId = "jamestown|united states of america";
  state.memory.colonization.targetCity = "Jamestown";
  state.memory.colonization.targetCountry = "United States of America";
  state.memory.colonization.originCityId = LONDON.cityId;
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

test("capture missions recommend a preset only when the selected loadout is the blocker", () => {
  const stats = shipStatsForSlug("galleon");
  const state = createGameState({
    cargoCapacity: stats.cargoCapacity,
    playerCharacter: PLAYER,
    shipStats: stats
  });
  const shortHaul = shipLoadoutPlan(stats, "short-haul");
  state.ship.loadoutId = shortHaul.id;
  state.ship.loadoutTargets = shortHaul;
  state.ship.crew = shortHaul.crew;
  state.ship.cannons = shortHaul.cannons;

  const recommendation = capturePortMissionLoadoutRecommendation(state, stats);
  const eligibility = capturePortMissionEligibility(state);
  assert.equal(recommendation.loadoutId, "combat");
  assert.ok(recommendation.plan.crew >= eligibility.minimumCrew);
  assert.ok(recommendation.plan.cannons >= eligibility.minimumCannons);

  const combat = shipLoadoutPlan(stats, "combat");
  state.ship.loadoutId = combat.id;
  state.ship.loadoutTargets = combat;
  assert.equal(capturePortMissionLoadoutRecommendation(state, stats), null);
});

test("capture warrants require a letter of marque but may be issued before the ship is prepared", () => {
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
  putEnglandAtWarWithFrance(state);
  state.ship.cannons = 7;
  assert.equal(capturePortMissionEligibility(state).eligible, false);
  const offer = capturePortMissionOfferForCity(state, LONDON, [LONDON, CALAIS], context);
  assert.equal(offer.targetTileId, CALAIS.tileId);

  state.ship.cannons = 8;
  state.ship.crew = 35;
  assert.equal(capturePortMissionEligibility(state).eligible, false);
  assert.equal(capturePortMissionOfferForCity(state, LONDON, [LONDON, CALAIS], context), offer);
});

test("unsolicited capture warrants are much more likely when a home port must be retaken", () => {
  const strategicChance = captureCommissionAutomaticOfferChance(
    "england",
    CAPTURE_COMMISSION_PRIORITY_STRATEGIC,
    "capture-port"
  );
  const retakeChance = captureCommissionAutomaticOfferChance(
    "england",
    CAPTURE_COMMISSION_PRIORITY_RETAKE,
    "capture-port"
  );

  assert.equal(strategicChance, 0.35);
  assert.equal(retakeChance, 0.8);
});

test("capture commissions retake lost home ports before choosing new conquests", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  state.relations.lettersOfMarque.england = { factionId: "england", simMinute: 0 };
  putEnglandAtWarWithFrance(state);
  const lostDover = {
    ...DOVER,
    factionId: "france",
    foundingFactionId: "england"
  };
  const offer = capturePortMissionOfferForCity(state, LONDON, [LONDON, CALAIS, lostDover], {
    simMinute: 0,
    spawnChance: 1,
    sailingDistanceKm: (_origin, destination) => destination.tileId === lostDover.tileId ? 1200 : 100
  });

  assert.equal(offer.targetTileId, lostDover.tileId);
  assert.equal(offer.priorityKind, CAPTURE_COMMISSION_PRIORITY_RETAKE);
});

test("historical conquests outrank attempted conquests and ordinary enemy ports", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  state.relations.lettersOfMarque.ottoman = { factionId: "ottoman", simMinute: 0 };
  state.relations.diplomacy.overrides["hospitallers|ottoman"] = "war";
  state.relations.diplomacy.overrides["ottoman|venice"] = "war";
  const istanbul = {
    ...port(40, "Istanbul", "Turkey", "islamic-desert", "ottoman", 41.01, 28.97),
    isFactionCapital: true,
    capitalOfFactionId: "ottoman"
  };
  const rhodes = {
    ...port(41, "Rhodes", "Greece", "mediterranean", "hospitallers", 36.43, 28.22),
    isFactionCapital: true,
    capitalOfFactionId: "hospitallers"
  };
  const kerkira = port(42, "Kerkira", "Greece", "mediterranean", "venice", 39.62, 19.92);
  const offer = capturePortMissionOfferForCity(state, istanbul, [istanbul, rhodes, kerkira], {
    simMinute: 0,
    spawnChance: 1,
    sailingDistanceKm: (_origin, destination) => destination.tileId === rhodes.tileId ? 900 : 300
  });

  assert.equal(offer.targetTileId, rhodes.tileId);
  assert.equal(offer.priorityKind, CAPTURE_COMMISSION_PRIORITY_HISTORICAL_CONQUEST);
});

test("a historical independent port commission creates no fictional neutral war", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  state.relations.lettersOfMarque.ottoman = { factionId: "ottoman", simMinute: 0 };
  const istanbul = {
    ...port(140, "Istanbul", "Turkey", "islamic-desert", "ottoman", 41.01, 28.97),
    isFactionCapital: true,
    capitalOfFactionId: "ottoman"
  };
  const aden = port(141, "Aden", "Yemen", "islamic-desert", NEUTRAL_FACTION_ID, 12.8, 45.03);
  const suq = port(142, "Suq", "Yemen", "islamic-desert", NEUTRAL_FACTION_ID, 12.5, 53.9);
  const ports = [istanbul, aden, suq];
  const offer = capturePortMissionOfferForCity(state, istanbul, ports, {
    simMinute: 12,
    spawnChance: 1,
    sailingDistanceKm: (_origin, destination) => destination.tileId === aden.tileId ? 2500 : 800
  });

  assert.equal(offer.targetTileId, aden.tileId);
  assert.equal(offer.priorityKind, CAPTURE_COMMISSION_PRIORITY_HISTORICAL_CONQUEST);
  assert.equal(offer.independentTarget, true);
  assert.equal(offer.targetFactionId, NEUTRAL_FACTION_ID);
  assert.equal(offer.targetSovereignFactionId, null);
  assert.equal(offer.targetFactionNoun, null);

  reconcileQuestWorldAssumptions(state, ports);
  assert.equal(questStateForCity(state, istanbul, ports).quest.id, offer.id);
  const diplomacyBefore = structuredClone(state.relations.diplomacy);

  acceptQuest(state, offer, { simMinute: 15 });
  assert.deepEqual(state.relations.diplomacy, diplomacyBefore);
  assert.equal(commissionedPortCaptureFactionId(state, aden), "ottoman");
  assert.deepEqual(
    {
      commissioned: playerPortAttackStatus(state, aden).commissioned,
      piracy: playerPortAttackStatus(state, aden).piracy,
      captureFactionId: playerPortAttackStatus(state, aden).captureFactionId,
      independentTarget: playerPortAttackStatus(state, aden).independentTarget
    },
    {
      commissioned: true,
      piracy: false,
      captureFactionId: "ottoman",
      independentTarget: true
    }
  );
});

test("a captain may ask about independent harbors while the court chooses the port", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  state.relations.lettersOfMarque.ottoman = { factionId: "ottoman", simMinute: 0 };
  state.relations.factionReputation.ottoman = 80;
  const istanbul = {
    ...port(143, "Istanbul", "Turkey", "islamic-desert", "ottoman", 41.01, 28.97),
    isFactionCapital: true,
    capitalOfFactionId: "ottoman"
  };
  const aden = port(144, "Aden", "Yemen", "islamic-desert", NEUTRAL_FACTION_ID, 12.8, 45.03);
  const suq = port(145, "Suq", "Yemen", "islamic-desert", NEUTRAL_FACTION_ID, 12.5, 53.9);
  const ports = [istanbul, aden, suq];
  const context = {
    simMinute: 12,
    random: () => 0,
    sailingDistanceKm: (_origin, destination) => destination.tileId === aden.tileId ? 2500 : 800
  };
  const petitions = captureCommissionPetitionOptionsForCity(
    state,
    istanbul,
    ports,
    context
  );
  assert.equal(petitions.length, 1);
  assert.equal(petitions[0].petitionTargetId, CAPTURE_COMMISSION_INDEPENDENT_PETITION_ID);
  assert.equal(petitions[0].targetFactionId, null);
  assert.equal(petitions[0].targetName, "Aden");

  const result = petitionCaptureCommission(
    state,
    istanbul,
    ports,
    CAPTURE_COMMISSION_INDEPENDENT_PETITION_ID,
    context
  );
  assert.equal(result.granted, true);
  assert.equal(result.independentTarget, true);
  assert.equal(result.targetFactionId, null);
  assert.equal(result.offer.targetTileId, aden.tileId);
  assert.equal(result.offer.petitioned, true);
});

test("Metz is petitioned against as a sovereign Imperial city, never an independent harbor", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  state.relations.lettersOfMarque.france = { factionId: "france", simMinute: 0 };
  const metz = port(
    146,
    "Metz",
    "France",
    "northern-european",
    "metz",
    49.12,
    6.18
  );

  assert.deepEqual(captureCommissionPetitionOptionsForCity(
    state,
    PARIS,
    [PARIS, metz],
    { simMinute: 12 }
  ), []);
  assert.equal(capturePortMissionOfferForCity(state, PARIS, [PARIS, metz], {
    simMinute: 12,
    spawnChance: 1,
    sailingDistanceKm: () => 330
  }), null);

  state.relations.diplomacy.overrides["france|metz"] = "war";
  const petitions = captureCommissionPetitionOptionsForCity(
    state,
    PARIS,
    [PARIS, metz],
    { simMinute: 13, sailingDistanceKm: () => 330 }
  );
  assert.equal(petitions.length, 1);
  assert.equal(petitions[0].petitionTargetId, "metz");
  assert.equal(petitions[0].targetFactionId, "metz");
  assert.equal(petitions[0].independentTarget, false);
});

test("a failed historical objective outranks an otherwise sensible enemy harbor", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  state.relations.lettersOfMarque.spain = { factionId: "spain", simMinute: 0 };
  state.relations.diplomacy.overrides["ottoman|spain"] = "war";
  state.relations.diplomacy.overrides["france|spain"] = "war";
  const madrid = {
    ...port(43, "Madrid", "Spain", "mediterranean", "spain", 40.42, -3.7),
    isFactionCapital: true,
    capitalOfFactionId: "spain"
  };
  const algiers = port(44, "Algiers", "Algeria", "islamic-desert", "ottoman", 36.75, 3.06);
  const offer = capturePortMissionOfferForCity(state, madrid, [madrid, algiers, CALAIS], {
    simMinute: 0,
    spawnChance: 1,
    sailingDistanceKm: (_origin, destination) => destination.tileId === algiers.tileId ? 900 : 200
  });

  assert.equal(offer.targetTileId, algiers.tileId);
  assert.equal(offer.priorityKind, CAPTURE_COMMISSION_PRIORITY_HISTORICAL_ATTEMPT);
});

test("a rich distant colony can outweigh a poor nearby target within one priority tier", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  state.relations.lettersOfMarque.england = { factionId: "england", simMinute: 0 };
  putEnglandAtWarWithFrance(state);
  const brest = {
    ...port(45, "Brest", "France", "northern-european", "france", 48.39, -4.49),
    population: 1000
  };
  const richColony = {
    ...port(46, "Cayenne", "French Guiana", "caribbean", "france", 4.92, -52.31),
    population: 2_000_000,
    foundingFactionId: "france",
    colonialFoundingType: "chartered",
    colonizationQuestSite: true,
    colonizationQuestStage: "established",
    playerFoundedColony: true
  };
  const offer = capturePortMissionOfferForCity(state, LONDON, [LONDON, brest, richColony], {
    simMinute: 0,
    spawnChance: 1,
    sailingDistanceKm: (_origin, destination) => destination.tileId === richColony.tileId ? 6500 : 200
  });

  assert.equal(offer.targetTileId, richColony.tileId);
  assert.equal(offer.priorityKind, CAPTURE_COMMISSION_PRIORITY_STRATEGIC);
});

test("France may commission the capture of an established player-founded English colony", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  state.relations.lettersOfMarque.france = { factionId: "france", simMinute: 0 };
  putEnglandAtWarWithFrance(state);
  const jamestown = {
    ...port(47, "Jamestown", "United States of America", "caribbean", "england", 37.21, -76.78),
    population: 2400,
    foundingFactionId: "england",
    colonialFoundingType: "chartered",
    colonizationQuestSite: true,
    colonizationQuestStage: "established",
    playerFoundedColony: true
  };
  const offer = capturePortMissionOfferForCity(state, PARIS, [PARIS, jamestown], {
    simMinute: 0,
    spawnChance: 1,
    sailingDistanceKm: () => 6100
  });

  assert.equal(offer.targetTileId, jamestown.tileId);
});

test("a captain petitions against a power while the court chooses the target", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  state.relations.lettersOfMarque.england = { factionId: "england", simMinute: 0 };
  putEnglandAtWarWithFrance(state);
  state.relations.factionReputation.england = 70;
  const lostDover = {
    ...DOVER,
    factionId: "france",
    foundingFactionId: "england"
  };
  const context = {
    simMinute: 0,
    random: () => 0,
    sailingDistanceKm: (_origin, destination) => destination.tileId === lostDover.tileId ? 900 : 100
  };
  const options = captureCommissionPetitionOptionsForCity(
    state,
    LONDON,
    [LONDON, CALAIS, lostDover],
    context
  );
  assert.equal(options.length, 1);
  assert.equal(options[0].targetFactionId, "france");

  const result = petitionCaptureCommission(
    state,
    LONDON,
    [LONDON, CALAIS, lostDover],
    "france",
    context
  );
  assert.equal(result.granted, true);
  assert.equal(result.offer.petitioned, true);
  assert.equal(result.offer.targetTileId, lostDover.tileId);
  assert.equal(result.offer.priorityKind, CAPTURE_COMMISSION_PRIORITY_RETAKE);
});

test("capture-petition odds rise with court standing and the urgency of a lost home port", () => {
  const lowStanding = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  const highStanding = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  for (const state of [lowStanding, highStanding]) {
    state.relations.lettersOfMarque.england = { factionId: "england", simMinute: 0 };
    putEnglandAtWarWithFrance(state);
  }
  lowStanding.relations.factionReputation.england = 15;
  highStanding.relations.factionReputation.england = 80;
  const strategicContext = { simMinute: 0, sailingDistanceKm: () => 180 };
  const lowChance = captureCommissionPetitionOptionsForCity(
    lowStanding,
    LONDON,
    [LONDON, CALAIS],
    strategicContext
  )[0].chance;
  const highChance = captureCommissionPetitionOptionsForCity(
    highStanding,
    LONDON,
    [LONDON, CALAIS],
    strategicContext
  )[0].chance;
  const lostDover = { ...DOVER, factionId: "france", foundingFactionId: "england" };
  const urgentChance = captureCommissionPetitionOptionsForCity(
    lowStanding,
    LONDON,
    [LONDON, CALAIS, lostDover],
    strategicContext
  )[0].chance;

  assert.ok(highChance > lowChance);
  assert.ok(urgentChance > lowChance);
});

test("a refused capture petition remains closed until the political answer cools", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  state.relations.lettersOfMarque.england = { factionId: "england", simMinute: 0 };
  putEnglandAtWarWithFrance(state);
  const ports = [LONDON, CALAIS];
  const context = {
    simMinute: 0,
    random: () => 0.999,
    sailingDistanceKm: () => 180
  };
  const result = petitionCaptureCommission(state, LONDON, ports, "france", context);
  assert.equal(result.granted, false);
  assert.equal(state.memory.quests.capturePortOffers[`${LONDON.city}|${LONDON.country}|${LONDON.tileId}`], undefined);

  const options = captureCommissionPetitionOptionsForCity(state, LONDON, ports, {
    ...context,
    simMinute: 1
  });
  assert.equal(options[0].available, false);
  assert.ok(options[0].cooldownRemainingMinutes > 0);
});

test("ordinary passenger work improves standing with the commissioning port", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  const quest = {
    id: "passenger-standing-test",
    kind: "passenger",
    originKey: `London|United Kingdom|${LONDON.tileId}`,
    originCityId: LONDON.cityId,
    originTileId: LONDON.tileId,
    originName: "London",
    originCountry: "United Kingdom",
    originFactionId: "england",
    destinationKey: `Dover|United Kingdom|${DOVER.tileId}`,
    destinationCityId: DOVER.cityId,
    destinationTileId: DOVER.tileId,
    destinationName: "Dover",
    destinationCountry: "United Kingdom",
    distanceKm: 120,
    reward: 100,
    passenger: { id: "passenger:thomas-hale", name: "Thomas Hale" }
  };
  const before = factionReputation(state, "england");

  acceptQuest(state, quest);
  completeQuest(state, DOVER, { simMinute: 100 });

  assert.equal(factionReputation(state, "england"), before + DELIVERY_REPUTATION_GAIN);
});

function port(tileId, city, country, cityType, factionId, lat, lon) {
  return {
    cityId: `${city.toLowerCase()}|${country.toLowerCase()}`,
    tileId,
    city,
    displayCity: city,
    country,
    cityType,
    factionId,
    population: 60000,
    lat,
    lon
  };
}

function canonicalTestCity(cityId, tileId) {
  const [city, country] = cityId.split("|");
  return {
    ...port(tileId, city, country, "mediterranean", "england", 0, 0),
    cityId
  };
}
