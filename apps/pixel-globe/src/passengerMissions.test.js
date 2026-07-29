import assert from "node:assert/strict";
import test from "node:test";

import {
  acceptQuest,
  activeFactionSafePassageIds,
  completeQuest,
  createGameState,
  factionReputation,
  grantEnvoySafePassage,
  ledgerEntries,
  openSovereignTradeToFaction,
  recordAttackAgainstFaction,
  sovereignTradeOpenToFaction,
  negotiateEnvoyQuest
} from "./gameState.js";
import { diplomacyBetween } from "./factions.js";
import {
  PASSENGER_MAX_DISTANCE_KM,
  PASSENGER_MIN_DISTANCE_KM,
  envoyOfferForCapital,
  markPassengerOfferSeen,
  passengerOfferForCity,
  pendingPassengerOfferForCity
} from "./passengerMissions.js";
import {
  JOSEON_TRADE_POLICY_ID,
  MING_TRADE_POLICY_ID,
  SPANISH_INDIES_TRADE_POLICY_ID
} from "./sovereignTradeAccess.js";
import {
  activeForeignSettlements,
  withForeignSettlements1522
} from "./foreignSettlements.js";

const PLAYER = {
  name: "Joan Alden",
  nationalityId: "england",
  expressions: ["neutral", "happy"]
};

const LISBON = port(1, "Lisbon", "Portugal", "mediterranean", "portugal", 38.72, -9.14);
const PORTO = port(2, "Porto", "Portugal", "mediterranean", "portugal", 41.15, -8.61);
const GOA = port(3, "Goa", "India", "south-asian", "portugal", 15.5, 73.83);
const NAGASAKI = port(4, "Nagasaki", "Japan", "east-asian", "ming", 32.75, 129.88);
const LONDON = port(5, "London", "United Kingdom", "northern-european", "england", 51.51, -0.13);
const ISTANBUL = port(6, "Istanbul", "Turkey", "islamic-desert", "ottoman", 41.01, 28.98);
const BEIJING = port(7, "Beijing", "China", "east-asian", "ming", 39.9, 116.4);
const HAVANA = port(8, "Havana", "Cuba", "mediterranean", "spain", 23.11, -82.37);
const SEOUL = port(9, "Seoul", "South Korea", "east-asian", "joseon", 37.57, 126.98);
const SEVILLE = port(10, "Seville", "Spain", "mediterranean", "spain", 37.39, -5.99);
const VENICE = port(11, "Venice", "Italy", "mediterranean", "venice", 45.44, 12.32);
const VENETIAN_ISTANBUL = withForeignSettlements1522(
  port(12, "Istanbul", "Turkey", "islamic-desert", "ottoman", 41.01, 28.98)
);

for (const capital of [
  LISBON,
  LONDON,
  ISTANBUL,
  BEIJING,
  SEOUL,
  SEVILLE,
  VENICE,
  VENETIAN_ISTANBUL
]) {
  capital.isFactionCapital = true;
  capital.capitalOfFactionId = capital.factionId;
}

test("passenger missions spawn as persistent medium-distance offers", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  const offer = passengerOfferForCity(state, LISBON, [LISBON, PORTO, ISTANBUL], {
    spawnChance: 1,
    simMinute: 0,
    destinationTileId: ISTANBUL.tileId,
    scenarioId: "shipwrecked-sailor",
    createCharacter: () => ({ name: "Mateo Costa" })
  });

  assert.equal(offer.kind, "passenger");
  assert.equal(offer.originName, "Lisbon");
  assert.equal(offer.destinationName, "Istanbul");
  assert.ok(offer.distanceKm >= PASSENGER_MIN_DISTANCE_KM);
  assert.ok(offer.distanceKm <= PASSENGER_MAX_DISTANCE_KM);
  assert.match(offer.dialogue.offer, /ship broke up/i);
  assert.equal(pendingPassengerOfferForCity(state, LISBON), offer);

  markPassengerOfferSeen(state, offer);
  assert.equal(passengerOfferForCity(state, LISBON, [LISBON, PORTO, ISTANBUL], {
    spawnChance: 1,
    simMinute: 0
  }), offer);
  assert.equal(offer.seen, true);
});

test("accepting and completing passenger passage pays fare and clears pending offer", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  const offer = passengerOfferForCity(state, LISBON, [LISBON, LONDON, GOA], {
    spawnChance: 1,
    simMinute: 0,
    destinationTileId: LONDON.tileId,
    createCharacter: () => ({ name: "Hana Sato" })
  });
  const before = state.doubloons;

  acceptQuest(state, offer);
  assert.equal(pendingPassengerOfferForCity(state, LISBON), null);
  const completed = completeQuest(state, LONDON, { simMinute: 240 });

  assert.equal(completed.id, offer.id);
  assert.equal(state.doubloons, before + offer.reward);
  assert.equal(state.memory.quests.active, null);
  assert.equal(ledgerEntries(state).at(-1).description, "Passenger fare");
});

test("passenger destinations reject local hops and intercontinental extremes", () => {
  const shortState = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  const longState = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });

  assert.equal(passengerOfferForCity(shortState, LISBON, [LISBON, PORTO], {
    spawnChance: 1,
    simMinute: 0,
    destinationTileId: PORTO.tileId
  }), null);
  assert.equal(passengerOfferForCity(longState, BEIJING, [BEIJING, HAVANA, NAGASAKI], {
    spawnChance: 1,
    simMinute: 0,
    destinationTileId: HAVANA.tileId
  }), null);
});

test("old unaccepted long-distance offers expire but active passengers remain untouched", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  const originKey = `${LISBON.city}|${LISBON.country}|${LISBON.tileId}`;
  state.memory.quests.passengerOffers[originKey] = {
    id: "passenger-old-world-spanning",
    kind: "passenger",
    originKey,
    distanceKm: 9000
  };
  state.memory.quests.active = {
    id: "passenger-already-aboard",
    kind: "passenger",
    originKey: "elsewhere",
    distanceKm: 9000
  };

  assert.equal(pendingPassengerOfferForCity(state, LISBON), null);
  assert.equal(state.memory.quests.passengerOffers[originKey], undefined);
  assert.equal(state.memory.quests.active.id, "passenger-already-aboard");
});

test("a friendly envoy negotiates abroad and is paid only after returning home", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  const originStanding = factionReputation(state, "portugal");
  const targetStanding = factionReputation(state, "england");
  const startingDoubloons = state.doubloons;
  const offer = envoyOfferForCapital(state, LISBON, [LISBON, LONDON, ISTANBUL], {
    envoySpawnChance: 1,
    envoyKind: "friendly-envoy",
    destinationTileId: LONDON.tileId,
    relationBetween: diplomacyBetween,
    simMinute: 0,
    createCharacter: () => ({ name: "Duarte de Meneses" })
  });

  assert.equal(offer.kind, "friendly-envoy");
  assert.equal(offer.stage, "outbound");
  assert.equal(offer.originRulerName, "King John III");
  assert.equal(offer.targetRulerName, "King Henry VIII");
  assert.match(offer.dialogue.offer, /King John III/);
  assert.match(offer.dialogue.negotiation, /King Henry VIII/);
  assert.match(offer.dialogue.offer, /there and back|home again|return me/i);
  acceptQuest(state, offer);
  const negotiation = negotiateEnvoyQuest(state, LONDON, {
    simMinute: 240,
    portCities: [LISBON, LONDON, ISTANBUL]
  });

  assert.equal(negotiation.quest.stage, "return");
  assert.equal(negotiation.quest.destinationTileId, LISBON.tileId);
  assert.equal(state.doubloons, startingDoubloons);
  assert.equal(factionReputation(state, "england"), targetStanding + 5);
  assert.equal(negotiation.events[0].relation, "ally");

  const completed = completeQuest(state, LISBON, { simMinute: 480 });
  assert.equal(completed.id, offer.id);
  assert.equal(state.doubloons, startingDoubloons + offer.reward);
  assert.equal(factionReputation(state, "portugal"), originStanding + 8);
  assert.equal(ledgerEntries(state).at(-1).description, "Diplomatic mission");
});

test("a special envoy from the player capital opens a sovereign market during negotiations", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  const startingDoubloons = state.doubloons;
  const offer = envoyOfferForCapital(state, LONDON, [LONDON, BEIJING], {
    envoySpawnChance: 1,
    relationBetween: diplomacyBetween,
    simMinute: 0,
    createCharacter: () => ({ name: "Thomas Moreton" })
  });

  assert.equal(offer.kind, "friendly-envoy");
  assert.equal(offer.tradeAccessPolicyId, MING_TRADE_POLICY_ID);
  assert.equal(offer.tradeAccessOpeningFactionId, "england");
  assert.equal(offer.targetFactionId, "ming");
  assert.ok(offer.distanceKm > PASSENGER_MAX_DISTANCE_KM);
  assert.match(offer.dialogue.offer, /lawful trade with the Ming Empire/);
  assert.equal(pendingPassengerOfferForCity(state, LONDON), offer);
  assert.equal(sovereignTradeOpenToFaction(state, MING_TRADE_POLICY_ID, "england"), false);

  acceptQuest(state, offer);
  const negotiation = negotiateEnvoyQuest(state, BEIJING, {
    simMinute: 1000,
    portCities: [LONDON, BEIJING]
  });

  assert.equal(negotiation.tradeAccessOpened, true);
  assert.equal(negotiation.tradeAccessPolicyId, MING_TRADE_POLICY_ID);
  assert.equal(negotiation.tradeAccessOpenedFactionId, "england");
  assert.equal(sovereignTradeOpenToFaction(state, MING_TRADE_POLICY_ID, "england"), true);
  assert.equal(state.doubloons, startingDoubloons);

  completeQuest(state, LONDON, { simMinute: 2000 });
  assert.equal(state.doubloons, startingDoubloons + offer.reward);
  assert.equal(sovereignTradeOpenToFaction(state, MING_TRADE_POLICY_ID, "england"), true);
});

test("the Ming trade-opening embassy cannot bypass the envoy spawn roll", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  const context = {
    envoySpawnChance: 0,
    relationBetween: diplomacyBetween,
    simMinute: 0,
    createCharacter: () => ({ name: "Thomas Moreton" })
  };

  assert.equal(envoyOfferForCapital(state, LONDON, [LONDON, BEIJING], context), null);
  assert.equal(envoyOfferForCapital(state, LONDON, [LONDON, BEIJING], {
    ...context,
    envoySpawnChance: 1
  }), null);
});

test("trade-opening envoys cover Joseon licenses and the Spanish Indies monopoly", () => {
  const englishState = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  const joseonOffer = envoyOfferForCapital(englishState, LONDON, [LONDON, SEOUL], {
    envoySpawnChance: 1,
    relationBetween: diplomacyBetween,
    simMinute: 0
  });
  assert.equal(joseonOffer.tradeAccessPolicyId, JOSEON_TRADE_POLICY_ID);
  assert.match(joseonOffer.dialogue.offer, /licensed trade with Joseon/);

  const portugueseState = createGameState({
    cargoCapacity: 20,
    playerCharacter: { ...PLAYER, nationalityId: "portugal" }
  });
  openSovereignTradeToFaction(
    portugueseState,
    JOSEON_TRADE_POLICY_ID,
    "portugal"
  );
  openSovereignTradeToFaction(
    portugueseState,
    MING_TRADE_POLICY_ID,
    "portugal"
  );
  const indiesOffer = envoyOfferForCapital(portugueseState, LISBON, [LISBON, SEVILLE], {
    envoySpawnChance: 1,
    relationBetween: diplomacyBetween,
    simMinute: 0
  });
  assert.equal(indiesOffer.tradeAccessPolicyId, SPANISH_INDIES_TRADE_POLICY_ID);
  assert.match(indiesOffer.dialogue.offer, /license to trade in the Spanish Indies/);
});

test("a hostile envoy worsens relations and the player's standing with the foreign court", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  const targetStanding = factionReputation(state, "england");
  const offer = envoyOfferForCapital(state, LISBON, [LISBON, LONDON], {
    envoySpawnChance: 1,
    envoyKind: "hostile-envoy",
    destinationTileId: LONDON.tileId,
    relationBetween: diplomacyBetween,
    simMinute: 0,
    createCharacter: () => ({ name: "Rui de Sousa" })
  });

  acceptQuest(state, offer);
  const negotiation = negotiateEnvoyQuest(state, LONDON, {
    simMinute: 360,
    portCities: [LISBON, LONDON]
  });

  assert.equal(negotiation.events[0].relation, "neutral");
  assert.equal(factionReputation(state, "england"), targetStanding - 8);
  assert.equal(factionReputation(state, "portugal"), 0);
});

test("a hostile envoy expels a resident settlement when its host turns hostile", () => {
  const state = createGameState({
    cargoCapacity: 20,
    playerCharacter: { ...PLAYER, nationalityId: "venice" }
  });
  const offer = envoyOfferForCapital(state, VENICE, [VENICE, VENETIAN_ISTANBUL], {
    envoySpawnChance: 1,
    envoyKind: "hostile-envoy",
    destinationTileId: VENETIAN_ISTANBUL.tileId,
    relationBetween: diplomacyBetween,
    simMinute: 0,
    createCharacter: () => ({ name: "Rui de Sousa" })
  });

  acceptQuest(state, offer);
  const negotiation = negotiateEnvoyQuest(state, VENETIAN_ISTANBUL, {
    simMinute: 360,
    portCities: [VENICE, VENETIAN_ISTANBUL]
  });

  assert.equal(negotiation.events[0].relation, "hostile");
  assert.deepEqual(
    negotiation.foreignSettlementExpulsions.map((entry) => entry.settlementId),
    ["venetian-constantinople"]
  );
  assert.deepEqual(
    activeForeignSettlements(
      VENETIAN_ISTANBUL,
      state.relations.foreignSettlementExpulsions
    ),
    []
  );
});

test("an envoy can claim seven days of passage from either participating nation", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  const offer = envoyOfferForCapital(state, LISBON, [LISBON, LONDON], {
    envoySpawnChance: 1,
    envoyKind: "hostile-envoy",
    destinationTileId: LONDON.tileId,
    relationBetween: diplomacyBetween,
    simMinute: 0,
    createCharacter: () => ({ name: "Rui de Sousa" })
  });
  acceptQuest(state, offer);

  const homePassage = grantEnvoySafePassage(state, "portugal", 100);
  const foreignPassage = grantEnvoySafePassage(state, "england", 200);

  assert.equal(homePassage.days, 7);
  assert.equal(foreignPassage.days, 7);
  assert.match(foreignPassage.message, /diplomatic|envoy|official/i);
  assert.match(foreignPassage.warning, /do not attack English ships or ports/i);
  assert.match(foreignPassage.warning, /safe passage would be forfeit/i);
  assert.deepEqual(activeFactionSafePassageIds(state, 201).sort(), ["england", "portugal"]);
  assert.equal(grantEnvoySafePassage(state, "france", 201), null);
  recordAttackAgainstFaction(state, "england");
  assert.deepEqual(activeFactionSafePassageIds(state, 202), ["portugal"]);
  assert.equal(state.memory.decisions["safe-passage.revoked.attack.england"], 1);
  assert.deepEqual(activeFactionSafePassageIds(state, 200 + 7 * 24 * 60), []);
});

function port(tileId, city, country, cityType, factionId, lat, lon) {
  return { tileId, city, displayCity: city, country, cityType, factionId, population: 60000, lat, lon };
}
