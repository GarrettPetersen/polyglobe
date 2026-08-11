import assert from "node:assert/strict";
import test from "node:test";

import {
  acceptQuest,
  completeQuest,
  createGameState,
  diplomacyBetweenForState,
  factionReputation,
  recordNingboMissionArrival,
  recordNingboMissionShipDefeated,
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
  eastAsianMissionOutcomeOptions
} from "./eastAsianQuestlines.js";
import { passengerOfferForCity, pendingPassengerOfferForCity } from "./passengerMissions.js";
import {
  createPassengerDialogueSession,
  passengerDialogueView,
  selectPassengerDialogueOption
} from "./dialogueSystem.js";
import { shoreBatteryGunCount, shoreBatteryLevel } from "./shoreBatteries.js";
import { JOSEON_TRADE_POLICY_ID, MING_TRADE_POLICY_ID } from "./sovereignTradeAccess.js";
import { questDestinationStops } from "./questItinerary.js";

const PLAYER = Object.freeze({
  name: "Joan Alden",
  nationalityId: "england",
  religionId: "roman-catholic",
  expressions: ["neutral", "happy"]
});

const SAKAI = capital(1, "Sakai", "hosokawa", 34.58, 135.47);
const YAMAGUCHI = capital(2, "Yamaguchi", "ouchi", 34.18, 131.47);
const NINGBO = port(3, "Ningbo", "ming", 29.87, 121.55);
const TSUSHIMA = {
  ...capital(4, "Tsushima Fuchu", "so", 34.20, 129.29),
  displayCity: "Tsushima Fuchū"
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

test("Ningbo's three outcomes are presented and resolved through normal passenger dialogue", () => {
  const state = gameState();
  const quest = offer(state, SAKAI);
  acceptQuest(state, quest, { simMinute: 0 });
  const active = state.memory.quests.passengerActive;
  recordNingboMissionArrival(state, active.id, { simMinute: 60, rivalArrivalMinute: 90 });
  const session = createPassengerDialogueSession(NINGBO, active);

  const choice = passengerDialogueView(session, NINGBO, active, state);
  assert.match(choice.text, /reached Ningbo before the rival courier/i);
  assert.deepEqual(choice.options.slice(0, 3).map((option) => option.label), [
    "Stand by the Hosokawa delegation",
    "Seek a joint hearing",
    "Take the Ouchi purse  450 db"
  ]);
  selectPassengerDialogueOption(session, NINGBO, active, state, 1, { simMinute: 60 });

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
  return {
    tileId,
    portId: `port-${tileId}`,
    city,
    displayCity: city,
    country: factionId === "joseon" ? "Republic of Korea" : factionId === "ming" ? "China" : "Japan",
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
