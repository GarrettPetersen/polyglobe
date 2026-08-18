import assert from "node:assert/strict";
import test from "node:test";

import {
  acceptQuest,
  activeFactionSafePassageIds,
  completeQuest,
  createGameState,
  deliveryOfferForCity,
  factionReputation,
  grantEnvoySafePassage,
  ledgerEntries,
  migrateGameState,
  openSovereignTradeToFaction,
  recordAttackAgainstFaction,
  sovereignTradeOpenToFaction,
  negotiateEnvoyQuest
} from "./gameState.js";
import { diplomacyBetween } from "./factions.js";
import {
  HAJJ_PASSENGER_MAX_DISTANCE_KM,
  HAJJ_PASSENGER_SCENARIO_ID,
  HAJJ_RETURN_PASSENGER_SCENARIO_ID,
  PASSENGER_MAX_DISTANCE_KM,
  PASSENGER_MIN_DISTANCE_KM,
  PASSENGER_ROLL_PERIOD_MINUTES,
  activeNamedTravelMission,
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
import {
  createBirthdayMemory,
  observeAboardBirthdays,
  pendingBirthdayDialogueLine
} from "./birthdayEvents.js";
import { characterWithBiography } from "./characterBiography.js";
import { gameStatePerkTotals } from "./playerPerks.js";

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
const ACEH = port(13, "Aceh", "Indonesia", "southeast-asian", "neutral", 5.55, 95.32);
const JEDDAH = port(14, "Jeddah", "Saudi Arabia", "islamic-desert", "ottoman", 21.54, 39.17);
const BAGHDAD = port(15, "Baghdad", "Iraq", "islamic-desert", "safavid", 33.34, 44.4);

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

test("Baghdad participates in ordinary city work", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  const offer = passengerOfferForCity(state, BAGHDAD, [BAGHDAD, ISTANBUL], {
    spawnChance: 1,
    simMinute: 0,
    destinationTileId: ISTANBUL.tileId,
    scenarioId: "patron-papers"
  });

  assert.ok(offer);
  assert.equal(offer.originName, "Baghdad");
  assert.equal(offer.destinationName, "Istanbul");
});

test("Muslim ports can offer long-distance Hajj passage to Jeddah", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  let characterRequest = null;
  const offer = passengerOfferForCity(state, ACEH, [ACEH, JEDDAH], {
    spawnChance: 1,
    hajjScenarioChance: 1,
    simMinute: 0,
    sailingDistanceKm: () => 8600,
    createCharacter: (request) => {
      characterRequest = request;
      return { name: "Nur Aisyah", religionId: request.quest.passengerReligionId };
    }
  });

  assert.equal(offer.scenarioId, HAJJ_PASSENGER_SCENARIO_ID);
  assert.equal(offer.destinationName, "Jeddah");
  assert.equal(offer.distanceKm, 8600);
  assert.ok(offer.distanceKm > PASSENGER_MAX_DISTANCE_KM);
  assert.ok(offer.distanceKm < HAJJ_PASSENGER_MAX_DISTANCE_KM);
  assert.equal(offer.passengerReligionId, "sunni-islam");
  assert.equal(offer.passenger.religionId, "sunni-islam");
  assert.equal(characterRequest.scenario.namePort, "origin");
  assert.match(offer.dialogue.offer, /Hajj to Mecca/i);
  assert.match(offer.dialogue.offer, /Jeddah is its sea gate/i);
  assert.equal(pendingPassengerOfferForCity(state, ACEH), offer);
});

test("Hajj passage requires both a Muslim origin community and accessible Jeddah", () => {
  const nonMuslimOrigin = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  assert.equal(passengerOfferForCity(nonMuslimOrigin, LISBON, [LISBON, JEDDAH], {
    spawnChance: 1,
    scenarioId: HAJJ_PASSENGER_SCENARIO_ID,
    simMinute: 0,
    sailingDistanceKm: () => 9000
  }), null);

  const noJeddah = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  assert.equal(passengerOfferForCity(noJeddah, ACEH, [ACEH, GOA], {
    spawnChance: 1,
    scenarioId: HAJJ_PASSENGER_SCENARIO_ID,
    simMinute: 0,
    sailingDistanceKm: () => 5000
  }), null);
});

test("Jeddah commonly offers repeatable passages home to returning Hajj pilgrims", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  let characterRequest = null;
  const first = passengerOfferForCity(state, JEDDAH, [JEDDAH, ACEH, LISBON], {
    spawnChance: 1,
    hajjReturnScenarioChance: 1,
    simMinute: 0,
    destinationTileId: ACEH.tileId,
    sailingDistanceKm: () => 8600,
    createCharacter: (request) => {
      characterRequest = request;
      return { name: "Nur Aisyah", religionId: request.quest.passengerReligionId };
    }
  });

  assert.equal(first.scenarioId, HAJJ_RETURN_PASSENGER_SCENARIO_ID);
  assert.equal(first.originName, "Jeddah");
  assert.equal(first.destinationName, "Aceh");
  assert.equal(first.passengerReligionId, "sunni-islam");
  assert.equal(first.passenger.religionId, "sunni-islam");
  assert.equal(characterRequest.scenario.namePort, "destination");
  assert.match(first.dialogue.offer, /Hajj is complete/i);
  assert.match(first.dialogue.offer, /passage home to Aceh/i);
  assert.match(first.dialogue.arrival, /return from the Hajj/i);

  acceptQuest(state, first);
  completeQuest(state, ACEH, { simMinute: 240 });
  const second = passengerOfferForCity(state, JEDDAH, [JEDDAH, ACEH, LISBON], {
    spawnChance: 1,
    hajjReturnScenarioChance: 1,
    simMinute: PASSENGER_ROLL_PERIOD_MINUTES,
    destinationTileId: ACEH.tileId,
    sailingDistanceKm: () => 8600
  });

  assert.ok(second);
  assert.equal(second.scenarioId, HAJJ_RETURN_PASSENGER_SCENARIO_ID);
  assert.notEqual(second.id, first.id);
});

test("Hajj return passengers can only name Muslim communities as home", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  assert.equal(passengerOfferForCity(state, JEDDAH, [JEDDAH, LISBON], {
    spawnChance: 1,
    scenarioId: HAJJ_RETURN_PASSENGER_SCENARIO_ID,
    simMinute: 0,
    destinationTileId: LISBON.tileId,
    sailingDistanceKm: () => 5000
  }), null);
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
  assert.equal(state.memory.quests.passengerActive, null);
  assert.equal(ledgerEntries(state).at(-1).description, "Passenger fare");
});

test("one passenger and one package delivery can travel aboard together", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  const passengerCharacter = characterWithBiography({
    id: "passenger-hana-sato",
    name: "Hana Sato",
    givenName: "Hana",
    sex: "female",
    age: 28,
    nameCulture: "japanese",
    religionId: "kami-buddhist",
    birthDate: { year: 1494, month: 2, day: 2 },
    portraitId: "east-asian-woman-black-hair",
    portraitSrc: "portraits/east-asian-woman-black-hair.png",
    expressions: [{ id: "neutral" }, { id: "happy" }],
    skillIds: ["master-chef"]
  });
  const passenger = passengerOfferForCity(state, LISBON, [LISBON, LONDON, GOA], {
    spawnChance: 1,
    simMinute: 0,
    destinationTileId: LONDON.tileId,
    createCharacter: () => passengerCharacter
  });
  acceptQuest(state, passenger);

  const delivery = deliveryOfferForCity(state, LISBON, [LISBON, PORTO], {
    simMinute: 0,
    spawnChance: 1
  });
  assert.ok(delivery);
  acceptQuest(state, delivery);
  assert.equal(state.memory.quests.passengerActive.id, passenger.id);
  assert.equal(state.memory.quests.active.id, delivery.id);
  assert.deepEqual(activeNamedTravelMission(state), {
    quest: state.memory.quests.passengerActive,
    kind: "passenger",
    character: state.memory.quests.passengerActive.passenger
  });
  assert.equal(activeNamedTravelMission(state).character.name, "Hana Sato");
  assert.equal(
    activeNamedTravelMission(state).character.portraitId,
    "east-asian-woman-black-hair"
  );
  assert.deepEqual(activeNamedTravelMission(state).character.skillIds, ["master-chef"]);
  assert.equal(gameStatePerkTotals(state).foodDurationMultiplier, 1.6);

  const captain = characterWithBiography({
    id: "captain-joan-alden",
    name: "Joan Alden",
    givenName: "Joan",
    sex: "female",
    age: 29,
    nameCulture: "english",
    religionId: "roman-catholic",
    birthDate: { year: 1492, month: 7, day: 10 }
  });
  const birthdays = createBirthdayMemory();
  observeAboardBirthdays(
    birthdays,
    [captain, activeNamedTravelMission(state).character],
    { year: 1522, month: 7, day: 10 }
  );
  assert.equal(pendingBirthdayDialogueLine(
    birthdays,
    [captain, activeNamedTravelMission(state).character]
  ).character.id, passengerCharacter.id);

  completeQuest(state, LONDON, { simMinute: 240, questId: passenger.id });
  assert.equal(state.memory.quests.passengerActive, null);
  assert.equal(state.memory.quests.active.id, delivery.id);

  completeQuest(state, PORTO, { simMinute: 480 });
  assert.equal(state.memory.quests.active, null);
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
  state.memory.quests.passengerActive = {
    id: "passenger-already-aboard",
    kind: "passenger",
    originKey: "elsewhere",
    distanceKm: 9000
  };

  assert.equal(pendingPassengerOfferForCity(state, LISBON), null);
  assert.equal(state.memory.quests.passengerOffers[originKey], undefined);
  assert.equal(state.memory.quests.passengerActive.id, "passenger-already-aboard");
});

test("version 51 saves move an active passenger into the concurrent mission slot", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  state.version = 51;
  delete state.memory.quests.passengerActive;
  state.memory.quests.active = {
    id: "passenger-legacy-active",
    kind: "passenger",
    originTileId: LISBON.tileId,
    destinationTileId: LONDON.tileId,
    passenger: { id: "legacy-passenger", name: "Hana Sato" }
  };

  const restored = migrateGameState(state, null);
  assert.equal(restored.memory.quests.active, null);
  assert.equal(restored.memory.quests.passengerActive.id, "passenger-legacy-active");
  assert.deepEqual(restored.memory.quests.passengerActive.passenger.skillIds.length > 0, true);
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
  assert.equal(joseonOffer.dialogue.journeyEvents[0].trigger, "destination-closer");
  assert.match(joseonOffer.dialogue.journeyEvents[0].text, /in plain words/i);
  assert.doesNotMatch(joseonOffer.dialogue.underway, /wording has taken months/i);

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
