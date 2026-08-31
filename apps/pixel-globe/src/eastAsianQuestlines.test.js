import assert from "node:assert/strict";
import test from "node:test";

import {
  acceptQuest,
  answerNingboMissionBribe,
  completeQuest,
  createGameState,
  diplomacyBetweenForState,
  factionReputation,
  recordNingboMissionArrival,
  recordNingboMissionShipDefeated,
  refuseNingboMissionBribe,
  selectEastAsianMissionOutcome,
  sovereignTradeOpenToFaction
} from "./gameState.js";
import {
  EAST_ASIAN_MISSION_GREAT_RITES,
  EAST_ASIAN_MISSION_NINGBO,
  EAST_ASIAN_MISSION_PORTUGUESE_GUNS,
  EAST_ASIAN_MISSION_RYUKYU,
  EAST_ASIAN_MISSION_TSUSHIMA,
  EAST_ASIAN_MISSION_YOSHIHARU,
  GREAT_RITES_JOURNEY_EVENT_ID,
  NINGBO_BRIBE_JOURNEY_EVENT_ID,
  PORTUGUESE_GUNS_JOURNEY_EVENT_ID,
  TSUSHIMA_EVIDENCE_BRIEFING_TEXT,
  YOSHIHARU_JOURNEY_EVENT_ID,
  eastAsianMissionDialogue,
  eastAsianMissionPlanForCity,
  eastAsianMissionOutcomeOptions,
  reconcileNingboMissionDelegationManifest,
  ningboMissionJournalPresentation,
  ningboMissionWaypointShips
} from "./eastAsianQuestlines.js";
import {
  markQuestJourneyDialogueSeen,
  pendingQuestJourneyDialogue
} from "./questJourneyDialogue.js";
import { passengerOfferForCity, pendingPassengerOfferForCity } from "./passengerMissions.js";
import {
  createPassengerDialogueSession,
  passengerDialogueView,
  preparePassengerDialogueArrival,
  selectPassengerDialogueOption
} from "./dialogueSystem.js";
import { shoreBatteryGunCount, shoreBatteryLevel } from "./shoreBatteries.js";
import { JOSEON_TRADE_POLICY_ID, MING_TRADE_POLICY_ID } from "./sovereignTradeAccess.js";
import { questDestinationStops } from "./questItinerary.js";

const PLAYER = Object.freeze({
  id: "player:joan-alden",
  name: "Joan Alden",
  nationalityId: "england",
  religionId: "roman-catholic",
  homePortCityId: "sakai|japan",
  homePortTileId: 1,
  homePortName: "Sakai",
  homePortCountry: "Japan",
  expressions: ["neutral", "happy"]
});

const RIVAL_CAPTAIN = Object.freeze({
  id: "rival-captain",
  name: "Ouchi Muneyoshi",
  expressions: ["neutral", "attentive"]
});

const SAKAI = capital(1, "Sakai", "hosokawa", 34.58, 135.47);
const YAMAGUCHI = capital(2, "Yamaguchi", "ouchi", 34.18, 131.47);
const NINGBO = port(3, "Ningbo", "ming", 29.87, 121.55);
const TSUSHIMA = {
  ...capital(4, "Tsushima Fuchu", "so", 34.20, 129.29),
  displayCity: "Tsushima Fuchu"
};
const HANSEONG = {
  ...capital(5, "Seoul", "joseon", 37.57, 126.98),
  displayCity: "Hanseong"
};
const GUANGZHOU = port(6, "Guangzhou", "ming", 23.13, 113.26);
const NANJING = port(7, "Nanjing", "ming", 32.06, 118.80);
const FUZHOU = port(8, "Fuzhou", "ming", 26.07, 119.30);
const NAHA = capital(9, "Naha", "ryukyu", 26.21, 127.68);
const BEIJING = capital(10, "Beijing", "ming", 39.90, 116.40);
const KYOTO = capital(11, "Kyoto", "japan", 35.01, 135.77);
const PORTS = Object.freeze([
  SAKAI,
  YAMAGUCHI,
  NINGBO,
  TSUSHIMA,
  HANSEONG,
  GUANGZHOU,
  NANJING,
  FUZHOU,
  NAHA,
  BEIJING,
  KYOTO
]);

test("Ningbo is offered by both rival houses until one side is accepted", () => {
  const state = gameState();
  const hosokawa = offer(state, SAKAI);
  const ouchi = offer(state, YAMAGUCHI);

  assert.equal(hosokawa.eastAsianMissionId, EAST_ASIAN_MISSION_NINGBO);
  assert.equal(hosokawa.eastAsianStartingFactionId, "hosokawa");
  assert.equal(ouchi.eastAsianStartingFactionId, "ouchi");
  assert.deepEqual(
    eastAsianMissionOutcomeOptions(hosokawa).map((option) => option.id),
    ["support-origin", "mediate", "support-rival"]
  );

  acceptQuest(state, hosokawa, { simMinute: 0 });
  assert.equal(pendingPassengerOfferForCity(state, SAKAI), null);
  assert.equal(pendingPassengerOfferForCity(state, YAMAGUCHI), null);

  recordNingboMissionArrival(state, hosokawa.id, { simMinute: 50, rivalArrivalMinute: 80 });
  refuseNingboMissionBribe(state, hosokawa.id);
  selectEastAsianMissionOutcome(state, hosokawa.id, "mediate");
  const completed = completeQuest(state, NINGBO, { simMinute: 60 });
  assert.equal(completed.eastAsianResolution.outcomeId, "mediate");
  assert.equal(diplomacyBetweenForState(state, "hosokawa", "ouchi"), "neutral");
  assert.equal(sovereignTradeOpenToFaction(state, MING_TRADE_POLICY_ID, "hosokawa"), true);
  assert.equal(sovereignTradeOpenToFaction(state, MING_TRADE_POLICY_ID, "ouchi"), true);
  assert.ok(factionReputation(state, "ming") > 0);
  assert.equal(completed.eastAsianWonRace, true);
  assert.equal(completed.eastAsianRaceBonus, 250);
  assert.equal(offer(state, SAKAI), null);
  assert.equal(offer(state, YAMAGUCHI), null);
});

test("the Ningbo race is not offered after either delegation loses its capital", () => {
  const state = gameState();
  const capturedYamaguchi = {
    ...YAMAGUCHI,
    factionId: "hosokawa",
    isFactionCapital: false,
    capitalOfFactionId: null
  };

  assert.equal(
    eastAsianMissionPlanForCity(state, SAKAI, PORTS.map((city) => (
      city.tileId === YAMAGUCHI.tileId ? capturedYamaguchi : city
    ))),
    null
  );
});

test("Tsushima's treaty mission can preserve Sō access to Joseon", () => {
  const state = gameState();
  const quest = offer(state, TSUSHIMA);
  assert.equal(quest.eastAsianMissionId, EAST_ASIAN_MISSION_TSUSHIMA);
  assert.equal(quest.destinationName, "Hanseong");

  acceptQuest(state, quest, { simMinute: 0 });
  selectEastAsianMissionOutcome(state, quest.id, "reform-register");
  completeQuest(state, HANSEONG, { simMinute: 120 });

  assert.equal(sovereignTradeOpenToFaction(state, JOSEON_TRADE_POLICY_ID, "so"), true);
  assert.ok(factionReputation(state, "so") > 0);
  assert.ok(factionReputation(state, "joseon") > 0);
});

test("Tsushima briefs the captain on the forged credentials before presenting actionable choices", () => {
  const state = gameState();
  const offered = offer(state, TSUSHIMA);
  const quest = acceptQuest(state, offered, { simMinute: 0 });

  assert.equal(pendingQuestJourneyDialogue(quest, {
    originDistance: 0.2,
    destinationDistance: 0.8,
    directDistance: 1
  }), null);
  const briefing = pendingQuestJourneyDialogue(quest, {
    originDistance: 0.45,
    destinationDistance: 0.55,
    directDistance: 1
  });
  assert.equal(briefing.text, TSUSHIMA_EVIDENCE_BRIEFING_TEXT);
  markQuestJourneyDialogueSeen(quest, briefing.id);
  assert.equal(pendingQuestJourneyDialogue(quest, {
    originDistance: 0.5,
    destinationDistance: 0.5,
    directDistance: 1
  }), null);

  const session = createPassengerDialogueSession(HANSEONG, quest);
  const hearing = passengerDialogueView(session, HANSEONG, quest, state);
  assert.match(hearing.text, /councillors will believe the person who carried these papers/);
  assert.deepEqual(
    hearing.options.map(({ label, detail }) => [label, detail]),
    [
      ["Vouch for the Sō envoy", "Hide the forgeries; favor Tsushima"],
      ["Refuse to vouch", "Then decide what evidence to give Joseon"]
    ]
  );
  selectPassengerDialogueOption(session, HANSEONG, quest, state, 1);
  const evidence = passengerDialogueView(session, HANSEONG, quest, state);
  assert.match(evidence.text, /speak as witness/i);
  assert.deepEqual(
    evidence.options.map(({ label, detail }) => [label, detail]),
    [
      ["Submit the forged papers", "Expose the envoy; favor Joseon"],
      ["Recommend a stricter register", "Avoid an accusation; favor both sides"]
    ]
  );
});

test("Tsushima's hidden forgeries are impossible to miss before the Hanseong hearing", () => {
  const state = gameState();
  const quest = acceptQuest(state, offer(state, TSUSHIMA), { simMinute: 0 });
  const journeyEvent = pendingQuestJourneyDialogue(quest, { arrived: true });
  const session = createPassengerDialogueSession(HANSEONG, quest, { journeyEvent });

  const confession = passengerDialogueView(session, HANSEONG, quest, state);
  assert.equal(confession.text, TSUSHIMA_EVIDENCE_BRIEFING_TEXT);
  assert.deepEqual(confession.options.map(({ label }) => label), ["Continue"]);

  selectPassengerDialogueOption(session, HANSEONG, quest, state, 0);
  assert.deepEqual(quest.journeyDialogueSeenIds, [journeyEvent.id]);
  const hearing = passengerDialogueView(session, HANSEONG, quest, state);
  assert.match(hearing.text, /councillors will believe the person who carried these papers/);
  assert.equal(hearing.options.length, 2);
  assert.equal(hearing.options[0].label, "Vouch for the Sō envoy");
});

test("Ningbo's rival bribe appears on the first frame closer to Ningbo than Japan", () => {
  const state = gameState();
  const quest = acceptQuest(state, offer(state, SAKAI), { simMinute: 0 });

  assert.equal(pendingQuestJourneyDialogue(quest, {
    originDistance: 0.49,
    destinationDistance: 0.51,
    directDistance: 1
  }), null);
  const bribe = pendingQuestJourneyDialogue(quest, {
    originDistance: 0.51,
    destinationDistance: 0.49,
    directDistance: 1
  });
  assert.equal(bribe.id, NINGBO_BRIBE_JOURNEY_EVENT_ID);
  assert.deepEqual(bribe.choices.map(({ id }) => id), [
    "accept-ningbo-bribe",
    "refuse-ningbo-bribe"
  ]);
});

test("an automatically opened Ningbo dialogue records arrival before its choices are selected", () => {
  const state = gameState();
  const quest = offer(state, SAKAI);
  acceptQuest(state, quest, { simMinute: 0 });
  const active = state.memory.quests.passengerActive;
  assert.equal(active.eastAsianPlayerArrivalMinute, undefined);
  preparePassengerDialogueArrival(state, NINGBO, active, {
    simMinute: 60,
    rivalArrivalMinute: 90
  });
  const session = createPassengerDialogueSession(NINGBO, active, {
    ningboRivalCharacter: RIVAL_CAPTAIN
  });

  const bribe = passengerDialogueView(session, NINGBO, active, state);
  assert.equal(active.eastAsianPlayerArrivalMinute, 60);
  assert.deepEqual(bribe.options.map((option) => [option.label, option.detail]), [
    ["Promise to defect for 450 db", "Promise to fight Hosokawa for Ouchi"],
    ["Refuse and remain loyal", "Then choose mediation or battle"]
  ]);
  selectPassengerDialogueOption(session, NINGBO, active, state, 1, { simMinute: 60 });

  const hearing = passengerDialogueView(session, NINGBO, active, state);
  assert.match(hearing.text, /courier reached my office first/i);
  assert.match(hearing.text, /escorts are waiting outside the harbor/i);
  assert.deepEqual(hearing.options.map((option) => [option.label, option.detail]), [
    ["Mediate a joint tally", "Avoid battle; favor Ming"],
    ["Fight for Hosokawa", "Attack Ouchi"]
  ]);
  selectPassengerDialogueOption(session, NINGBO, active, state, 0, { simMinute: 60 });

  const result = passengerDialogueView(session, NINGBO, active, state);
  assert.match(result.text, /single supervised register/i);
  assert.match(result.options[0].label, /Conclude the mission/);
  selectPassengerDialogueOption(session, NINGBO, active, state, 0, {
    simMinute: 60,
    portCities: PORTS
  });
  assert.equal(state.memory.quests.passengerActive, null);
});

test("Ningbo loyalty and defection require a two-ship battle with a loss condition", () => {
  const loyalState = gameState();
  const loyalQuest = offer(loyalState, SAKAI);
  assert.equal(loyalQuest.eastAsianDelegationShips.length, 4);
  acceptQuest(loyalState, loyalQuest, { simMinute: 0 });
  const loyalActive = loyalState.memory.quests.passengerActive;
  recordNingboMissionArrival(loyalState, loyalActive.id, { simMinute: 60, rivalArrivalMinute: 90 });
  refuseNingboMissionBribe(loyalState, loyalActive.id);
  selectEastAsianMissionOutcome(loyalState, loyalActive.id, "support-origin");
  assert.equal(loyalActive.eastAsianStage, "battle");
  assert.deepEqual(
    loyalActive.eastAsianBattleShipIds,
    loyalActive.eastAsianDelegationShips.filter((ship) => ship.factionId === "ouchi").map((ship) => ship.id)
  );
  assert.throws(
    () => completeQuest(loyalState, NINGBO, { simMinute: 70 }),
    /battle is unresolved/i
  );
  assert.equal(recordNingboMissionShipDefeated(loyalState, loyalActive.eastAsianBattleShipIds[0]).status, "progress");
  assert.equal(recordNingboMissionShipDefeated(loyalState, loyalActive.eastAsianBattleShipIds[1]).status, "victory");
  completeQuest(loyalState, NINGBO, { simMinute: 80 });
  assert.ok(factionReputation(loyalState, "hosokawa") > 0);
  assert.ok(factionReputation(loyalState, "ouchi") < 0);
  assert.ok(factionReputation(loyalState, "ming") < 0);

  const defectState = gameState();
  const defectQuest = offer(defectState, SAKAI);
  acceptQuest(defectState, defectQuest, { simMinute: 0 });
  const defectActive = defectState.memory.quests.passengerActive;
  recordNingboMissionArrival(defectState, defectActive.id, { simMinute: 100, rivalArrivalMinute: 80 });
  answerNingboMissionBribe(defectState, defectActive.id, true);
  const startingMoney = defectState.doubloons;
  selectEastAsianMissionOutcome(defectState, defectActive.id, "support-rival", {
    city: NINGBO,
    simMinute: 100
  });
  assert.equal(defectState.doubloons, startingMoney + 450);
  assert.equal(defectActive.eastAsianBattleFactionId, "hosokawa");
  const alliedIds = [...defectActive.eastAsianAlliedShipIds];
  assert.equal(recordNingboMissionShipDefeated(defectState, alliedIds[0]).status, "progress");
  assert.equal(recordNingboMissionShipDefeated(defectState, alliedIds[1]).status, "defeat");
  assert.equal(defectState.memory.quests.passengerActive, null);
  assert.equal(defectState.memory.quests.failed[defectActive.id].reason, "ningbo-delegation-defeated");
});

test("legacy Ningbo fleets reconcile faction identity, battle rosters, and warship types", () => {
  const state = gameState();
  const quest = acceptQuest(state, offer(state, SAKAI), { simMinute: 0 });
  recordNingboMissionArrival(state, quest.id, { simMinute: 60, rivalArrivalMinute: 90 });
  refuseNingboMissionBribe(state, quest.id);
  selectEastAsianMissionOutcome(state, quest.id, "support-origin");
  quest.eastAsianDelegationShips = quest.eastAsianDelegationShips.map((ship) => ({
    ...ship,
    factionId: ship.id.includes("-ouchi-") ? "hosokawa" : ship.factionId,
    shipSlug: ship.delegationRole === "courier" ? "japanese-kuribune" : ship.shipSlug
  }));
  quest.eastAsianBattleShipIds = [quest.eastAsianDelegationShips[0].id];

  const manifest = reconcileNingboMissionDelegationManifest(
    quest,
    { hosokawa: SAKAI.cityId, ouchi: YAMAGUCHI.cityId },
    NINGBO.cityId
  );

  assert.equal(manifest.length, 4);
  assert.ok(manifest.every((ship) => ship.role === "warship"));
  assert.ok(manifest.filter((ship) => ship.delegationRole === "courier")
    .every((ship) => ship.shipSlug === "japanese-sekibune"));
  assert.deepEqual(
    quest.eastAsianBattleShipIds,
    manifest.filter((ship) => ship.factionId === "ouchi").map((ship) => ship.id)
  );
});

test("Ningbo journal copy and ship waypoints follow the race and battle stages", () => {
  const state = gameState();
  const quest = acceptQuest(state, offer(state, SAKAI), { simMinute: 0 });
  const rivalIds = quest.eastAsianDelegationShips
    .filter((ship) => ship.factionId === "ouchi")
    .map((ship) => ship.id);

  assert.deepEqual(
    ningboMissionWaypointShips(quest).map((ship) => ship.id),
    rivalIds
  );
  assert.deepEqual(ningboMissionJournalPresentation(quest), {
    title: "RACE TO NINGBO",
    summary: "BEAT THE OUCHI DELEGATION TO NINGBO"
  });

  recordNingboMissionArrival(state, quest.id, { simMinute: 60, rivalArrivalMinute: 90 });
  refuseNingboMissionBribe(state, quest.id);
  selectEastAsianMissionOutcome(state, quest.id, "support-origin");
  assert.deepEqual(
    ningboMissionWaypointShips(quest).map((ship) => ship.id),
    quest.eastAsianBattleShipIds
  );
  assert.deepEqual(ningboMissionJournalPresentation(quest), {
    title: "BATTLE OFF NINGBO",
    summary: "DEFEAT 2 OUCHI SHIPS OFF NINGBO"
  });

  recordNingboMissionShipDefeated(state, quest.eastAsianBattleShipIds[0]);
  assert.equal(ningboMissionJournalPresentation(quest).summary, "DEFEAT 1 OUCHI SHIP OFF NINGBO");
  recordNingboMissionShipDefeated(state, quest.eastAsianBattleShipIds[1]);
  assert.deepEqual(ningboMissionWaypointShips(quest), []);
  assert.equal(
    ningboMissionJournalPresentation(quest).summary,
    "RETURN TO THE SHIPPING OFFICE AT NINGBO"
  );
});

test("captured Portuguese guns reinforce each Chinese battery only after visiting it", () => {
  const state = gameState();
  const quest = offer(state, GUANGZHOU);
  assert.equal(quest.eastAsianMissionId, EAST_ASIAN_MISSION_PORTUGUESE_GUNS);
  assert.equal(shoreBatteryGunCount(GUANGZHOU, state.memory.flags), 2);

  acceptQuest(state, quest, { simMinute: 0 });
  const activeQuest = state.memory.quests.passengerActive;
  const stops = [NANJING, FUZHOU, GUANGZHOU, NINGBO];
  for (let index = 0; index < stops.length; index += 1) {
    const city = stops[index];
    const active = state.memory.quests.passengerActive;
    assert.equal(questDestinationStops(active).some((stop) => stop.tileId === city.tileId), true);
    if (index === 1) {
      assert.deepEqual(
        questDestinationStops(active).map((stop) => stop.name),
        ["Ningbo", "Fuzhou", "Guangzhou"]
      );
    }
    const session = createPassengerDialogueSession(city, active);
    const view = passengerDialogueView(session, city, active, state);
    assert.match(view.options[0].label, new RegExp(`${index + 1}/${stops.length}$`));
    const result = selectPassengerDialogueOption(session, city, active, state, 0, {
      simMinute: 180 + index * 60,
      portCities: PORTS
    });
    assert.equal(result.eastAsianLegDelivery.legNumber, index + 1);
    if (index === 0) {
      assert.equal(shoreBatteryGunCount(NINGBO, state.memory.flags), 2);
    } else {
      assert.equal(shoreBatteryGunCount(city, state.memory.flags), 4);
    }
  }

  const completed = activeQuest;
  assert.equal(state.memory.quests.passengerActive, null);

  assert.deepEqual(
    completed.eastAsianResolution.batteryUpgrades.map((upgrade) => upgrade.cityName),
    ["Fuzhou", "Guangzhou", "Ningbo"]
  );
  for (const city of [GUANGZHOU, NINGBO, FUZHOU]) {
    assert.equal(shoreBatteryLevel(city, state.memory.flags), 3);
    assert.equal(shoreBatteryGunCount(city, state.memory.flags), 4);
  }
});

test("an active Portuguese guns quest from an older save gains the new itinerary", () => {
  const state = gameState();
  const quest = offer(state, GUANGZHOU);
  acceptQuest(state, quest, { simMinute: 0 });
  const active = state.memory.quests.passengerActive;
  delete active.eastAsianBatteryUpgrades;
  delete active.itinerary;

  const session = createPassengerDialogueSession(NANJING, active);
  const result = selectPassengerDialogueOption(session, NANJING, active, state, 0, {
    simMinute: 180,
    portCities: PORTS
  });

  assert.deepEqual(result.eastAsianLegDelivery.remainingDestinationNames, [
    "Ningbo",
    "Fuzhou",
    "Guangzhou"
  ]);
  assert.deepEqual(active.itinerary.stops.map((stop) => stop.name), [
    "Nanjing",
    "Ningbo",
    "Fuzhou",
    "Guangzhou"
  ]);
});

test("the remaining commissions appear at their historical courts", () => {
  const cases = [
    [FUZHOU, EAST_ASIAN_MISSION_RYUKYU, "Naha"],
    [NANJING, EAST_ASIAN_MISSION_GREAT_RITES, "Beijing"],
    [KYOTO, EAST_ASIAN_MISSION_YOSHIHARU, "Yamaguchi"]
  ];
  for (const [origin, missionId, destinationName] of cases) {
    const quest = offer(gameState(), origin);
    assert.equal(quest.eastAsianMissionId, missionId);
    assert.equal(quest.destinationName, destinationName);
    assert.match(quest.dialogue.offer, /carry/i);
  }
});

test("the strongest East Asian commissions move their political context into the voyage", () => {
  const cases = [
    [EAST_ASIAN_MISSION_PORTUGUESE_GUNS, PORTUGUESE_GUNS_JOURNEY_EVENT_ID, /copy the pattern.*battery crews/i],
    [EAST_ASIAN_MISSION_GREAT_RITES, GREAT_RITES_JOURNEY_EVENT_ID, /dead father/i],
    [EAST_ASIAN_MISSION_YOSHIHARU, YOSHIHARU_JOURNEY_EVENT_ID, /authority remains/i]
  ];
  for (const [id, eventId, expectedText] of cases) {
    const dialogue = eastAsianMissionDialogue({ id });
    assert.equal(dialogue.journeyEvents.length, 1);
    assert.equal(dialogue.journeyEvents[0].id, eventId);
    assert.equal(dialogue.journeyEvents[0].trigger, "destination-closer");
    assert.match(dialogue.journeyEvents[0].text, expectedText);
    assert.ok(dialogue.underway.length < dialogue.journeyEvents[0].text.length);
  }
});

function offer(state, city) {
  return passengerOfferForCity(state, city, PORTS, {
    simMinute: 0,
    createCharacter: ({ scenario }) => ({
      id: `passenger-${city.tileId}`,
      name: `Envoy ${city.tileId}`,
      expressions: ["neutral", "attentive"],
      scenarioId: scenario.id
    })
  });
}

function gameState() {
  return createGameState({ cargoCapacity: 30, playerCharacter: PLAYER });
}

function port(tileId, city, factionId, lat, lon, population = 80000) {
  const country = factionId === "joseon"
    ? "Republic of Korea"
    : factionId === "ming" ? "China" : "Japan";
  return {
    cityId: `${city.toLocaleLowerCase("en-US")}|${country.toLocaleLowerCase("en-US")}`,
    tileId,
    portId: `port-${tileId}`,
    city,
    displayCity: city,
    country,
    cityType: "east-asian",
    factionId,
    population,
    lat,
    lon,
    character: { name: `${city} Official` }
  };
}

function capital(tileId, city, factionId, lat, lon) {
  return {
    ...port(tileId, city, factionId, lat, lon),
    isFactionCapital: true,
    capitalOfFactionId: factionId
  };
}
