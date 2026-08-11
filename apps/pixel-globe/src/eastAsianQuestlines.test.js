import assert from "node:assert/strict";
import test from "node:test";

import {
  acceptQuest,
  completeQuest,
  createGameState,
  diplomacyBetweenForState,
  factionReputation,
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

const PLAYER = Object.freeze({
  name: "Joan Alden",
  nationalityId: "england",
  religionId: "roman-catholic",
  expressions: ["neutral", "happy"]
});

const SAKAI = capital(1, "Sakai", "hosokawa", 34.58, 135.47);
const YAMAGUCHI = capital(2, "Yamaguchi", "ouchi", 34.18, 131.47);
const NINGBO = port(3, "Ningbo", "ming", 29.87, 121.55);
const TSUSHIMA = capital(4, "Tsushima Fuchū", "so", 34.20, 129.29);
const HANSEONG = capital(5, "Hanseong", "joseon", 37.57, 126.98);
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

  selectEastAsianMissionOutcome(state, hosokawa.id, "mediate");
  const completed = completeQuest(state, NINGBO, { simMinute: 60 });
  assert.equal(completed.eastAsianResolution.outcomeId, "mediate");
  assert.equal(diplomacyBetweenForState(state, "hosokawa", "ouchi"), "neutral");
  assert.equal(sovereignTradeOpenToFaction(state, MING_TRADE_POLICY_ID, "hosokawa"), true);
  assert.equal(sovereignTradeOpenToFaction(state, MING_TRADE_POLICY_ID, "ouchi"), true);
  assert.ok(factionReputation(state, "ming") > 0);
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
  const session = createPassengerDialogueSession(NINGBO, active);

  const choice = passengerDialogueView(session, NINGBO, active, state);
  assert.match(choice.text, /both Japanese delegations/i);
  assert.deepEqual(choice.options.slice(0, 3).map((option) => option.label), [
    "Press the Hosokawa tally",
    "Seek a joint hearing",
    "Back the Ouchi delegation"
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

test("captured Portuguese guns permanently reinforce three Chinese batteries", () => {
  const state = gameState();
  const quest = offer(state, GUANGZHOU);
  assert.equal(quest.eastAsianMissionId, EAST_ASIAN_MISSION_PORTUGUESE_GUNS);
  assert.equal(shoreBatteryGunCount(GUANGZHOU, state.memory.flags), 2);

  acceptQuest(state, quest, { simMinute: 0 });
  const completed = completeQuest(state, NANJING, { simMinute: 180, portCities: PORTS });

  assert.deepEqual(
    completed.eastAsianResolution.batteryUpgrades.map((upgrade) => upgrade.cityName),
    ["Guangzhou", "Ningbo", "Fuzhou"]
  );
  for (const city of [GUANGZHOU, NINGBO, FUZHOU]) {
    assert.equal(shoreBatteryLevel(city, state.memory.flags), 3);
    assert.equal(shoreBatteryGunCount(city, state.memory.flags), 4);
  }
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
