import assert from "node:assert/strict";
import test from "node:test";

import {
  acceptQuest,
  completeQuest,
  createGameState,
  deliveryOfferForCity,
  factionReputation,
  openSovereignTradeToFaction,
  questCargoSaleTheftStatus,
  recordTeaRaceCompetitorRemoved,
  recordTeaRacePlayerArrival,
  recordTeaRaceTheft,
  teaRaceOfferForCity
} from "./gameState.js";
import { MING_TRADE_POLICY_ID } from "./sovereignTradeAccess.js";
import { gameMinuteForDate } from "./rulers.js";
import { createWorldEconomy } from "./economy.js";
import {
  createPortDialogueSession,
  portDialogueView,
  selectPortDialogueOption
} from "./dialogueSystem.js";
import {
  TEA_RACE_CARGO_QUANTITY,
  TEA_RACE_FIRST_PRIZE,
  TEA_RACE_FINISHER_PRIZE,
  isTeaRaceQuest,
  teaRaceWaypointShips
} from "./teaRaceQuest.js";

const PLAYER = Object.freeze({
  id: "player:joan-alden",
  name: "Joan Alden",
  nationalityId: "england",
  homePortCityId: "london|united kingdom",
  homePortTileId: 3,
  homePortName: "London",
  homePortCountry: "United Kingdom",
  expressions: ["neutral", "happy"]
});
const GUANGZHOU = port(1, "Guangzhou", "China", "ming", 23.12, 113.25);
const FUZHOU = port(2, "Fuzhou", "China", "ming", 26.08, 119.3);
const LONDON = port(3, "London", "United Kingdom", "england", 51.51, -0.13);
const PORTS = Object.freeze([GUANGZHOU, FUZHOU, LONDON]);

test("the new-tea race opens only to lawful foreign traders during the spring crop", () => {
  const state = raceState();
  const spring = gameMinuteForDate(1522, 4, 15);
  const winter = gameMinuteForDate(1522, 12, 1);

  assert.equal(teaRaceOfferForCity(state, GUANGZHOU, PORTS, { simMinute: spring }), null);
  openSovereignTradeToFaction(state, MING_TRADE_POLICY_ID, "england");
  assert.equal(teaRaceOfferForCity(state, GUANGZHOU, PORTS, { simMinute: winter }), null);

  const offer = teaRaceOfferForCity(state, GUANGZHOU, PORTS, { simMinute: spring });
  assert.equal(offer.id, "tea-race-1522");
  assert.equal(offer.destinationName, "London");
  assert.equal(offer.teaRaceCompetitors.length, 5);
  assert.equal(new Set(offer.teaRaceCompetitors.map((entry) => entry.shipSlug)).size, 5);
});

test("the race carries entrusted tea and pays first and later finishers differently", () => {
  const firstState = raceStateWithOpenTrade();
  const spring = gameMinuteForDate(1522, 4, 15);
  const firstOffer = deliveryOfferForCity(firstState, GUANGZHOU, PORTS, { simMinute: spring });
  assert.equal(isTeaRaceQuest(firstOffer), true);
  acceptQuest(firstState, firstOffer, { simMinute: spring });
  assert.equal(firstState.cargo.tea, TEA_RACE_CARGO_QUANTITY);

  recordTeaRacePlayerArrival(firstState, firstOffer.id, {
    simMinute: spring + 100,
    rivalArrivalMinute: spring + 101,
    rivalShipId: firstOffer.teaRaceCompetitors[0].id
  });
  const firstBefore = firstState.doubloons;
  completeQuest(firstState, LONDON, { simMinute: spring + 100 });
  assert.equal(firstState.doubloons, firstBefore + TEA_RACE_FIRST_PRIZE);
  assert.equal(firstState.cargo.tea, undefined);

  const laterState = raceStateWithOpenTrade();
  const laterOffer = deliveryOfferForCity(laterState, FUZHOU, PORTS, { simMinute: spring });
  acceptQuest(laterState, laterOffer, { simMinute: spring });
  recordTeaRacePlayerArrival(laterState, laterOffer.id, {
    simMinute: spring + 102,
    rivalArrivalMinute: spring + 101,
    rivalShipId: laterOffer.teaRaceCompetitors[0].id
  });
  const laterBefore = laterState.doubloons;
  completeQuest(laterState, LONDON, { simMinute: spring + 102 });
  assert.equal(laterState.doubloons, laterBefore + TEA_RACE_FINISHER_PRIZE);
});

test("selling personal tea is allowed but entrusted tea fails that year's race", () => {
  const state = raceStateWithOpenTrade();
  const spring = gameMinuteForDate(1522, 4, 15);
  state.cargo.tea = 3;
  const offer = deliveryOfferForCity(state, GUANGZHOU, PORTS, { simMinute: spring });
  acceptQuest(state, offer, { simMinute: spring });

  assert.equal(questCargoSaleTheftStatus(state, "tea", 3), null);
  const theft = questCargoSaleTheftStatus(state, "tea", 4);
  assert.equal(theft.stolenQuantity, 1);
  const standingBefore = factionReputation(state, "ming");
  state.cargo.tea -= 4;
  recordTeaRaceTheft(state, theft, { simMinute: spring + 10 });
  assert.equal(state.memory.quests.failed[offer.id].reason, "tea-race-theft");
  assert.equal(factionReputation(state, "ming"), standingBefore - 40);
  assert.equal(teaRaceOfferForCity(state, FUZHOU, PORTS, { simMinute: spring + 20 }), null);
});

test("the market warns before an entrusted tea sale and lets the captain cancel", () => {
  const state = raceStateWithOpenTrade();
  const spring = gameMinuteForDate(1522, 4, 15);
  const offer = deliveryOfferForCity(state, GUANGZHOU, PORTS, { simMinute: spring });
  acceptQuest(state, offer, { simMinute: spring });
  const economy = createWorldEconomy({ ports: [GUANGZHOU], startMinute: spring });
  const session = createPortDialogueSession(GUANGZHOU, { initialNodeId: "market", marketMode: "sell" });
  const market = portDialogueView(session, GUANGZHOU, state, economy, [GUANGZHOU]);
  const sellAllIndex = market.options.findIndex((entry) => (
    entry.action.type === "sell-all" && entry.action.goodId === "tea"
  ));

  assert.ok(sellAllIndex >= 0);
  selectPortDialogueOption(
    session,
    GUANGZHOU,
    state,
    economy,
    [GUANGZHOU],
    sellAllIndex,
    { simMinute: spring }
  );
  const warning = portDialogueView(session, GUANGZHOU, state, economy, [GUANGZHOU]);
  assert.match(warning.text, /entrusted/i);
  assert.match(warning.text, /theft/i);
  assert.equal(warning.options[1].label, "Keep the tea sealed");

  selectPortDialogueOption(session, GUANGZHOU, state, economy, [GUANGZHOU], 1, {
    simMinute: spring
  });
  assert.equal(state.memory.quests.active.id, offer.id);
  assert.equal(state.cargo.tea, TEA_RACE_CARGO_QUANTITY);
});

test("the first-crop race can return next year but never twice in one season", () => {
  const state = raceStateWithOpenTrade();
  const firstSpring = gameMinuteForDate(1522, 4, 15);
  const nextSpring = gameMinuteForDate(1523, 4, 15);
  const offer = deliveryOfferForCity(state, GUANGZHOU, PORTS, { simMinute: firstSpring });
  acceptQuest(state, offer, { simMinute: firstSpring });
  recordTeaRacePlayerArrival(state, offer.id, {
    simMinute: firstSpring + 100,
    rivalArrivalMinute: firstSpring + 200,
    rivalShipId: offer.teaRaceCompetitors[0].id
  });
  completeQuest(state, LONDON, { simMinute: firstSpring + 100 });

  assert.equal(deliveryOfferForCity(state, FUZHOU, PORTS, {
    simMinute: firstSpring + 200,
    spawnChance: 0
  }), null);
  const next = deliveryOfferForCity(state, FUZHOU, PORTS, {
    simMinute: nextSpring,
    spawnChance: 0
  });
  assert.equal(next.id, "tea-race-1523");
});

test("tea race waypoints follow every active competitor and omit retired ships", () => {
  const state = raceStateWithOpenTrade();
  const spring = gameMinuteForDate(1522, 4, 15);
  const quest = deliveryOfferForCity(state, GUANGZHOU, PORTS, { simMinute: spring });
  acceptQuest(state, quest, { simMinute: spring });
  const active = state.memory.quests.active;

  assert.deepEqual(
    teaRaceWaypointShips(active).map((ship) => ship.id),
    active.teaRaceCompetitors.map((ship) => ship.id)
  );
  recordTeaRaceCompetitorRemoved(state, active.teaRaceCompetitors[1].id);
  assert.equal(
    teaRaceWaypointShips(active).some((ship) => ship.id === active.teaRaceCompetitors[1].id),
    false
  );
  recordTeaRacePlayerArrival(state, active.id, {
    simMinute: spring + 100,
    rivalArrivalMinute: spring + 101,
    rivalShipId: active.teaRaceCompetitors[0].id
  });
  assert.deepEqual(teaRaceWaypointShips(active), []);
});

function raceState() {
  const state = createGameState({ cargoCapacity: 40, playerCharacter: PLAYER });
  state.memory.quests.onboardingDeliveriesCompleted = 4;
  return state;
}

function raceStateWithOpenTrade() {
  const state = raceState();
  openSovereignTradeToFaction(state, MING_TRADE_POLICY_ID, "england");
  return state;
}

function port(tileId, city, country, factionId, lat, lon) {
  return Object.freeze({
    cityId: `${city.toLocaleLowerCase("en-US")}|${country.toLocaleLowerCase("en-US")}`,
    tileId,
    portId: `port-${tileId}`,
    city,
    displayCity: city,
    country,
    factionId,
    cityType: factionId === "ming" ? "east-asian" : "northern-european",
    regionKey: factionId === "ming" ? "east-asian" : "northern-european",
    population: 100000,
    character: { name: `${city} Factor`, expressions: ["neutral", "stern", "pleased"] },
    lat,
    lon
  });
}
