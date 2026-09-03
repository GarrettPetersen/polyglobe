import assert from "node:assert/strict";
import test from "node:test";

import {
  acceptQuest,
  advanceGamePolitics,
  adjustFactionReputation,
  completeQuest,
  createGameState,
  diplomacyBetweenForState,
  factionReputation,
  negotiateEnvoyQuest,
  recordTributeTheft,
  recordWokouHuntVictory,
  tributeSaleTheftStatus,
  wokouHuntMissionOfferForCity
} from "./gameState.js";
import {
  createPortDialogueSession,
  portDialogueView,
  selectPortDialogueOption
} from "./dialogueSystem.js";
import { createWorldEconomy } from "./economy.js";
import {
  COURT_ENVOY_QUEST_KIND,
  STATUS_ENVOY_QUEST_KIND,
  TRIBUTE_ENVOY_QUEST_KIND,
  tributeMissionPlan,
  isWokouHuntQuest
} from "./diplomaticMissions.js";
import { envoyOfferForCapital } from "./passengerMissions.js";
import {
  SUZERAINTY_KIND_TRIBUTARY,
  establishSuzerainty,
  suzeraintyForVassal
} from "./suzerainty.js";

const BEIJING = capital(1, "Beijing", "China", "ming", 39.9, 116.4);
const NINGBO = port(2, "Ningbo", "China", "ming", 29.87, 121.55);
const NANJING = port(3, "Nanjing", "China", "ming", 32.06, 118.8);
const SEOUL = capital(4, "Seoul", "Republic of Korea", "joseon", 37.57, 126.98);
const NAHA = capital(5, "Naha", "Japan", "ryukyu", 26.21, 127.68);
const AYUTTHAYA = Object.freeze({
  ...capital(6, "Ayutthaya", "Thailand", "ayutthaya", 14.36, 100.57),
  cityType: "southeast-asian"
});

test("a trusted subject can carry sealed tribute without consuming it", () => {
  const state = stateFor("joseon", 40);
  adjustFactionReputation(state, "joseon", 40 - factionReputation(state, "joseon"));
  const offer = envoyOfferForCapital(state, SEOUL, [SEOUL, BEIJING], {
    envoySpawnChance: 1,
    envoyKind: TRIBUTE_ENVOY_QUEST_KIND,
    relationBetween: (a, b) => diplomacyBetweenForState(state, a, b),
    simMinute: 0
  });

  assert.equal(offer.kind, TRIBUTE_ENVOY_QUEST_KIND);
  assert.deepEqual(offer.tributeCargoRequirements, [
    { goodId: "ginseng", quantity: 4, label: "sealed chests of ginseng" }
  ]);
  acceptQuest(state, offer);
  assert.equal(state.cargo.ginseng, 4);

  const negotiation = negotiateEnvoyQuest(state, BEIJING, {
    simMinute: 400,
    portCities: [SEOUL, BEIJING]
  });
  assert.equal(state.cargo.ginseng, undefined);
  assert.equal(negotiation.tributeCargo[0].quantity, 4);
  assert.equal(state.memory.quests.active.stage, "return");
  completeQuest(state, SEOUL, { simMinute: 800 });
  assert.equal(state.memory.quests.completed[offer.id], true);
});

test("Asian tributaries without a distinctive court cargo carry rice", () => {
  const state = stateFor("ayutthaya", 40);
  establishSuzerainty(state.relations.diplomacy.suzerainties, {
    vassalFactionId: "ayutthaya",
    suzerainFactionId: "ming",
    kind: SUZERAINTY_KIND_TRIBUTARY,
    simMinute: 0,
    source: "test"
  });

  const plan = tributeMissionPlan(state, AYUTTHAYA, [AYUTTHAYA, BEIJING]);

  assert.deepEqual(plan.requirements, [
    { goodId: "rice", quantity: 6, label: "sealed rice tribute" }
  ]);
});

test("selling personal stock is allowed but selling sealed tribute fails the mission", () => {
  const state = stateFor("joseon", 40);
  adjustFactionReputation(state, "joseon", 40 - factionReputation(state, "joseon"));
  const offer = envoyOfferForCapital(state, SEOUL, [SEOUL, BEIJING], {
    envoySpawnChance: 1,
    envoyKind: TRIBUTE_ENVOY_QUEST_KIND,
    relationBetween: (a, b) => diplomacyBetweenForState(state, a, b),
    simMinute: 0
  });
  state.cargo.ginseng = 2;
  acceptQuest(state, offer);

  assert.equal(tributeSaleTheftStatus(state, "ginseng", 2), null);
  const theft = tributeSaleTheftStatus(state, "ginseng", 3);
  assert.equal(theft.stolenQuantity, 1);
  state.cargo.ginseng -= 3;
  const result = recordTributeTheft(state, theft, { simMinute: 90 });

  assert.equal(state.memory.quests.active, null);
  assert.equal(state.memory.quests.failed[offer.id].reason, "tribute-theft");
  assert.equal(result.originPenalty, -45);
  assert.equal(result.suzerainPenalty, -25);
});

test("the market warns before selling sealed tribute and cancellation leaves it intact", () => {
  const state = stateFor("joseon", 40);
  adjustFactionReputation(state, "joseon", 40 - factionReputation(state, "joseon"));
  const offer = envoyOfferForCapital(state, SEOUL, [SEOUL, BEIJING], {
    envoySpawnChance: 1,
    envoyKind: TRIBUTE_ENVOY_QUEST_KIND,
    relationBetween: (a, b) => diplomacyBetweenForState(state, a, b),
    simMinute: 0
  });
  acceptQuest(state, offer);
  const economy = createWorldEconomy({ ports: [SEOUL], startMinute: 0 });
  const session = createPortDialogueSession(SEOUL, { initialNodeId: "market", marketMode: "sell" });
  const market = portDialogueView(session, SEOUL, state, economy, [SEOUL]);
  const sellAllIndex = market.options.findIndex((entry) => (
    entry.action.type === "sell-all" && entry.action.goodId === "ginseng"
  ));

  assert.ok(sellAllIndex >= 0);
  selectPortDialogueOption(session, SEOUL, state, economy, [SEOUL], sellAllIndex, { simMinute: 10 });
  const warning = portDialogueView(session, SEOUL, state, economy, [SEOUL]);
  assert.match(warning.text, /sealed tribute/i);
  assert.match(warning.text, /theft/i);
  assert.equal(warning.options[1].label, "Keep the tribute aboard");

  selectPortDialogueOption(session, SEOUL, state, economy, [SEOUL], 1, { simMinute: 10 });
  assert.equal(state.memory.quests.active.id, offer.id);
  assert.equal(state.cargo.ginseng, 4);

  const secondMarket = portDialogueView(session, SEOUL, state, economy, [SEOUL]);
  const secondSellAllIndex = secondMarket.options.findIndex((entry) => (
    entry.action.type === "sell-all" && entry.action.goodId === "ginseng"
  ));
  selectPortDialogueOption(session, SEOUL, state, economy, [SEOUL], secondSellAllIndex, { simMinute: 11 });
  const theft = selectPortDialogueOption(session, SEOUL, state, economy, [SEOUL], 0, { simMinute: 11 });
  assert.equal(theft.tributeTheft.quest.id, offer.id);
  assert.equal(state.memory.quests.active, null);
  assert.equal(state.memory.quests.failed[offer.id].reason, "tribute-theft");
});

test("status embassies let rulers decide whether constitutional ties change", () => {
  const state = stateFor("ming", 40);
  const ports = [BEIJING, NINGBO, NANJING, SEOUL, NAHA];
  const offer = envoyOfferForCapital(state, BEIJING, ports, {
    envoySpawnChance: 1,
    envoyKind: STATUS_ENVOY_QUEST_KIND,
    relationBetween: (a, b) => diplomacyBetweenForState(state, a, b),
    simMinute: 0
  });
  assert.equal(offer.kind, STATUS_ENVOY_QUEST_KIND);
  assert.match(offer.dialogue.offer, /tribute and allegiance/i);
  acceptQuest(state, offer);

  const before = suzeraintyForVassal(
    state.relations.diplomacy.suzerainties,
    offer.statusProposal.vassalFactionId
  );
  const negotiation = negotiateEnvoyQuest(state, offer.statusProposal.vassalFactionId === "joseon" ? SEOUL : NAHA, {
    simMinute: 500,
    portCities: ports
  });
  assert.equal(typeof negotiation.statusResolution.accepted, "boolean");
  const after = suzeraintyForVassal(
    state.relations.diplomacy.suzerainties,
    offer.statusProposal.vassalFactionId
  );
  if (negotiation.statusResolution.accepted) {
    assert.equal(after.kind, offer.statusProposal.desiredKind);
  } else {
    assert.equal(after.kind, before.kind);
  }
});

test("Ming court commissions carry the pending imperial policy and suspend its autonomous resolution", () => {
  const state = stateFor("ming", 30);
  const ports = [BEIJING, SEOUL];
  state.relations.courts.nextActionMinute = 0;
  const opened = advanceGamePolitics(state, 0, { portCities: ports });
  assert.equal(opened.courtMattersOpened.length, 1);
  const offer = envoyOfferForCapital(state, BEIJING, ports, {
    envoySpawnChance: 1,
    envoyKind: COURT_ENVOY_QUEST_KIND,
    relationBetween: (a, b) => diplomacyBetweenForState(state, a, b),
    simMinute: 0
  });
  assert.equal(offer.kind, COURT_ENVOY_QUEST_KIND);
  assert.equal(offer.courtCommissionKind, "ming-investiture");
  acceptQuest(state, offer, { simMinute: 0 });
  assert.equal(state.relations.courts.pendingMatter.status, "commissioned");
  const negotiation = negotiateEnvoyQuest(state, SEOUL, {
    simMinute: 200,
    portCities: ports
  });
  assert.deepEqual(negotiation.events, []);
  assert.equal(negotiation.quest.destinationTileId, BEIJING.tileId);
  completeQuest(state, BEIJING, { simMinute: 400, portCities: ports });
  assert.equal(state.relations.courts.pendingMatter, null);
  assert.equal(state.relations.courts.history[0].source, "player-court-commission");
});

test("Ming and Japanese capitals can commission a persistent wokou hunt", () => {
  const state = stateFor("ming", 30);
  adjustFactionReputation(state, "ming", 20 - factionReputation(state, "ming"));
  const offer = wokouHuntMissionOfferForCity(state, BEIJING, [BEIJING, NINGBO], {
    simMinute: 0,
    spawnChance: 1
  });
  assert.equal(isWokouHuntQuest(offer), true);
  assert.match(offer.offerText, /Pirates require no marque/i);
  acceptQuest(state, offer);
  assert.equal(recordWokouHuntVictory(state, "some-other-ship"), null);
  assert.equal(recordWokouHuntVictory(state, offer.targetShipId, { simMinute: 600 }).stage, "return");
  completeQuest(state, BEIJING, { simMinute: 800 });
  assert.equal(state.memory.quests.completed[offer.id], true);
});

function stateFor(nationalityId, cargoCapacity) {
  return createGameState({
    cargoCapacity,
    playerCharacter: {
      id: "player:test-captain",
      name: "Test Captain",
      nationalityId,
      homePortCityId: BEIJING.cityId,
      homePortTileId: BEIJING.tileId,
      homePortName: BEIJING.city,
      homePortCountry: BEIJING.country,
      expressions: ["neutral"]
    }
  });
}

function capital(tileId, city, country, factionId, lat, lon) {
  return {
    ...port(tileId, city, country, factionId, lat, lon),
    isFactionCapital: true,
    capitalOfFactionId: factionId
  };
}

function port(tileId, city, country, factionId, lat, lon) {
  return {
    cityId: `${city.toLocaleLowerCase("en-US")}|${country.toLocaleLowerCase("en-US")}`,
    tileId,
    city,
    displayCity: city,
    country,
    cityType: "east-asian",
    factionId,
    character: {
      name: `${city} Merchant`,
      role: "merchant",
      expressions: ["neutral", "stern", "pleased"]
    },
    population: 60000,
    lat,
    lon
  };
}
