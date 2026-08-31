import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { generatePassengerCharacter } from "./characterPortraits.js";
import { acceptQuest, createGameState, portEntryStatus } from "./gameState.js";
import {
  PASSENGER_ROLL_PERIOD_MINUTES,
  declinePassengerOffer,
  passengerOfferForCity,
  passengerRoleLabel,
  pendingPassengerOffersForCity,
  septemberTestamentOfferForCity
} from "./passengerMissions.js";
import {
  RELIGIOUS_MISSION_CATALOG,
  captainCanParticipateInReligiousMission,
  religiousPassengerDistanceIsAllowed,
  religiousMissionIconId,
  religiousMissionIsCatholicContraband,
  religiousMissionParticipation,
  religiousMissionTitle
} from "./religiousMissions.js";
import {
  parsePortSailingDistances,
  portSailingDistanceKm
} from "./portSailingDistances.js";

const CHARACTER_MANIFEST = JSON.parse(readFileSync(
  new URL("../public/assets/characters/generated/character-portraits.json", import.meta.url),
  "utf8"
));
const PORT_SAILING_DISTANCES = parsePortSailingDistances(JSON.parse(readFileSync(
  new URL("../public/assets/data/port-sailing-distances.json", import.meta.url),
  "utf8"
)));

test("religious mission catalog broadly covers religious traditions", () => {
  assert.equal(RELIGIOUS_MISSION_CATALOG.length, 23);
  assert.equal(new Set(RELIGIOUS_MISSION_CATALOG.map(({ id }) => id)).size, 23);
  const represented = new Set(RELIGIOUS_MISSION_CATALOG.flatMap((mission) => (
    mission.participantReligionIds
  )));
  for (const religionId of [
    "roman-catholic",
    "lutheran",
    "eastern-orthodox",
    "ethiopian-orthodox",
    "sunni-islam",
    "judaism",
    "hinduism",
    "jainism",
    "sikhism",
    "zoroastrianism",
    "theravada-buddhism",
    "mahayana-buddhism",
    "daoism",
    "chinese-traditional",
    "kami-buddhist",
    "andean-traditional",
    "mesoamerican-traditional",
    "african-traditional",
    "polynesian-traditional",
    "austronesian-traditional"
  ]) {
    assert.ok(represented.has(religionId), religionId);
  }
});

test("Reformation book missions are Catholic contraband", () => {
  for (const missionId of ["reformation-printing", "september-testament"]) {
    assert.equal(religiousMissionIsCatholicContraband({
      kind: "passenger",
      religiousMissionId: missionId
    }), true);
  }
});

test("Catholic ports enforce the Edict against forbidden Testaments", () => {
  const state = createGameState({
    cargoCapacity: 20,
    playerCharacter: {
      ...playerHome(port(2, "Vienna", "Austria", "habsburg", "northern-european")),
      name: "Test Bookseller",
      nationalityId: "denmark-norway",
      religionId: "lutheran",
      expressions: ["neutral", "happy"]
    }
  });
  state.memory.quests.passengerActive = {
    id: "passenger-forbidden-testaments",
    kind: "passenger",
    originTileId: 1,
    destinationTileId: 2,
    destinationName: "Vienna",
    religiousMissionId: "september-testament",
    catholicContraband: true
  };
  const vienna = port(2, "Vienna", "Austria", "habsburg", "northern-european");
  const status = portEntryStatus(state, vienna, 0);

  assert.equal(status.catholicContraband, true);
  assert.equal(status.allowed, false);
  assert.equal(status.canAttemptDisguise, true);
  assert.equal(status.canPurchaseSafePassage, false);
});

test("the September Testament visits three Catholic factors before completion", () => {
  const origin = port(21, "Hamburg", "Germany", "denmark-norway", "northern-european");
  const destinations = [
    port(22, "Bremen", "Germany", "denmark-norway", "northern-european"),
    port(23, "Amsterdam", "Netherlands", "habsburg", "northern-european"),
    port(24, "London", "United Kingdom", "england", "northern-european"),
    port(25, "Rouen", "France", "france", "northern-european")
  ];
  const excludedLutheranFactor = port(
    26,
    "Lubeck",
    "Germany",
    "denmark-norway",
    "northern-european"
  );
  const state = createGameState({
    cargoCapacity: 20,
    playerCharacter: {
      ...playerHome(origin),
      name: "Captain Test",
      nationalityId: "denmark-norway",
      religionId: "roman-catholic",
      expressions: ["neutral", "happy"]
    }
  });
  const quest = passengerOfferForCity(
    state,
    origin,
    [origin, ...destinations, excludedLutheranFactor],
    {
      spawnChance: 1,
      religiousMissionId: "september-testament",
      simMinute: 0,
      sailingDistanceKm: (left, right) => 450 + Math.abs(left.tileId - right.tileId) * 90,
      portFactorReligionId: (candidate) => (
        candidate.tileId === excludedLutheranFactor.tileId ? "lutheran" : "roman-catholic"
      )
    }
  );

  assert.equal(quest.itinerary.stops.length, 3);
  assert.equal(new Set(quest.itinerary.stops.map(({ tileId }) => tileId)).size, 3);
  assert.ok(quest.itinerary.stops.every(({ tileId }) => tileId !== excludedLutheranFactor.tileId));
  assert.equal(quest.destinationTileId, quest.itinerary.stops[0].tileId);
  assert.deepEqual(quest.itinerary.completedCityIds, []);
  assert.match(quest.dialogue.offer, /three hidden ports/);
});

test("the September Testament offer does not consume an ordinary passenger offer", () => {
  const origin = port(31, "Hamburg", "Germany", "denmark-norway", "northern-european");
  const destinations = [
    port(32, "Amsterdam", "Netherlands", "habsburg", "northern-european"),
    port(33, "London", "United Kingdom", "england", "northern-european"),
    port(34, "Rouen", "France", "france", "northern-european")
  ];
  destinations[0].lat = origin.lat;
  destinations[0].lon = origin.lon + 12;
  const state = createGameState({
    cargoCapacity: 20,
    playerCharacter: {
      ...playerHome(origin),
      name: "Captain Test",
      nationalityId: "denmark-norway",
      religionId: "roman-catholic",
      expressions: ["neutral", "happy"]
    }
  });
  const context = {
    spawnChance: 1,
    scenarioId: "patron-papers",
    destinationCityId: destinations[0].cityId,
    simMinute: 0,
    sailingDistanceKm: () => 700,
    portFactorReligionId: () => "roman-catholic",
    createCharacter: ({ scenario }) => ({
      id: `passenger:${scenario.id}`,
      name: scenario.id === "patron-papers" ? "Ordinary Passenger" : "Lutheran Bookseller"
    })
  };

  const ordinary = passengerOfferForCity(state, origin, [origin, ...destinations], context);
  const testament = septemberTestamentOfferForCity(
    state,
    origin,
    [origin, ...destinations],
    context
  );
  const offers = pendingPassengerOffersForCity(state, origin);

  assert.equal(ordinary.passengerName, "Ordinary Passenger");
  assert.equal(testament.religiousMissionId, "september-testament");
  assert.deepEqual(new Set(offers.map(({ id }) => id)), new Set([ordinary.id, testament.id]));

  declinePassengerOffer(state, testament, { simMinute: 0 });
  assert.deepEqual(pendingPassengerOffersForCity(state, origin).map(({ id }) => id), [ordinary.id]);
  assert.equal(septemberTestamentOfferForCity(
    state,
    origin,
    [origin, ...destinations],
    context
  ), null);

  const laterTestament = septemberTestamentOfferForCity(
    state,
    origin,
    [origin, ...destinations],
    { ...context, simMinute: PASSENGER_ROLL_PERIOD_MINUTES }
  );
  acceptQuest(state, laterTestament, { simMinute: PASSENGER_ROLL_PERIOD_MINUTES });
  assert.equal(state.memory.quests.passengerActive.id, laterTestament.id);
  assert.ok(Object.values(state.memory.quests.passengerOffers).some(({ id }) => id === ordinary.id));
});

test("Christian missionary voyages use their documented 1522 routes", () => {
  const cases = [
    {
      missionId: "franciscan-bound-west",
      origin: port(301, "Gent", "Belgium", "burgundian-netherlands", "northern-european"),
      destination: port(302, "Veracruz", "Mexico", "spain"),
      title: "The Friar Bound West",
      role: "Franciscan friar",
      copy: /learn the local tongue/
    },
    {
      missionId: "dominican-testimony-hispaniola",
      origin: port(303, "Seville", "Spain", "spain", "mediterranean"),
      destination: port(304, "Santo Domingo", "Dominican Republic", "spain"),
      title: "A Dominican's Testimony",
      role: "Dominican friar",
      copy: /cross cannot excuse a chain/
    },
    {
      missionId: "franciscan-house-goa",
      origin: port(305, "Lisbon", "Portugal", "portugal", "mediterranean"),
      destination: port(306, "Goa", "India", "portugal"),
      title: "A Friar for Goa",
      role: "Franciscan friar",
      copy: /learn Konkani/
    },
    {
      missionId: "ethiopian-embassy-cleric",
      origin: port(307, "Lisbon", "Portugal", "portugal", "mediterranean"),
      destination: port(308, "Massawa", "Ethiopia", "ethiopia"),
      title: "Letters Between Two Churches",
      role: "embassy cleric",
      copy: /church is ancient/,
      playerReligionId: "roman-catholic"
    },
    {
      missionId: "ethiopian-embassy-cleric",
      origin: port(309, "Massawa", "Ethiopia", "ethiopia", "sub-saharan"),
      destination: port(310, "Lisbon", "Portugal", "portugal", "mediterranean"),
      title: "Letters Between Two Churches",
      role: "embassy cleric",
      copy: /church is ancient/,
      playerReligionId: "ethiopian-orthodox"
    }
  ];

  for (const entry of cases) {
    const state = createGameState({
      cargoCapacity: 20,
      playerCharacter: {
        ...playerHome(entry.origin),
        name: "Captain Test",
        nationalityId: entry.origin.factionId,
        religionId: entry.playerReligionId || "roman-catholic",
        expressions: ["neutral", "happy"]
      }
    });
    const distractor = {
      ...entry.destination,
      cityId: `not-${entry.destination.cityId}`,
      tileId: entry.destination.tileId + 100,
      city: `Not ${entry.destination.city}`,
      displayCity: `Not ${entry.destination.city}`
    };
    const quest = passengerOfferForCity(
      state,
      entry.origin,
      [entry.origin, distractor, entry.destination],
      {
        spawnChance: 1,
        religiousMissionId: entry.missionId,
        simMinute: 0,
        sailingDistanceKm: () => 5000
      }
    );

    assert.equal(quest.destinationName, entry.destination.city, entry.missionId);
    assert.equal(quest.religiousMissionId, entry.missionId);
    assert.equal(quest.passengerReligionId, entry.playerReligionId || "roman-catholic");
    assert.equal(religiousMissionTitle(quest), entry.title);
    assert.equal(passengerRoleLabel(quest), entry.role);
    assert.equal(captainCanParticipateInReligiousMission(state, quest), true);
    assert.match(quest.dialogue.underway + quest.dialogue.offer, entry.copy);
  }
});

test("missionary voyages do not introduce the later Jesuit missions", () => {
  const prose = RELIGIOUS_MISSION_CATALOG.flatMap((mission) => [
    mission.title,
    mission.roleLabel,
    mission.offer({ destinationName: "Port", reward: 100 }),
    mission.underway({ destinationName: "Port", reward: 100 }),
    mission.arrival({ destinationName: "Port", reward: 100 }),
    mission.participation
  ]).join(" ");
  assert.doesNotMatch(prose, /Jesuit|Xavier/i);
});

test("missionary routes exist in the sailing graph and fit their distance limits", () => {
  for (const [missionId, originName, destinationName] of [
    ["franciscan-bound-west", "Gent", "Veracruz"],
    ["dominican-testimony-hispaniola", "Seville", "Santo Domingo"],
    ["franciscan-house-goa", "Lisbon", "Goa"],
    ["ethiopian-embassy-cleric", "Lisbon", "Massawa"]
  ]) {
    const origin = requiredSailingEndpoint(originName);
    const destination = requiredSailingEndpoint(destinationName);
    const distanceKm = portSailingDistanceKm(PORT_SAILING_DISTANCES, origin, destination);
    assert.equal(
      religiousPassengerDistanceIsAllowed(distanceKm, missionId),
      true,
      `${missionId} route is ${distanceKm} km`
    );
  }
});

test("a Daoist captain receives the Buddhist-Daoist harbor mediation", () => {
  const beijing = port(101, "Beijing", "China", "ming");
  const nanjing = port(102, "Nanjing", "China", "ming");
  const state = createGameState({
    cargoCapacity: 20,
    playerCharacter: {
      ...playerHome(beijing),
      name: "Lin Mei",
      nationalityId: "ming",
      religionId: "daoism",
      expressions: ["neutral", "happy"]
    }
  });
  let characterRequest = null;
  const quest = passengerOfferForCity(state, beijing, [beijing, nanjing], {
    spawnChance: 1,
    religiousMissionId: "ming-three-teachings-mediation",
    destinationCityId: nanjing.cityId,
    simMinute: 0,
    sailingDistanceKm: () => 850,
    createCharacter: (request) => {
      characterRequest = request;
      return generatePassengerCharacter({
        identityKey: request.quest.id,
        originPort: request.origin,
        destinationPort: request.destination,
        scenarioId: request.scenario.id,
        namePortPreference: request.scenario.namePort,
        religionId: request.quest.passengerReligionId,
        preferClergy: request.scenario.preferClergy,
        manifest: CHARACTER_MANIFEST,
        usedNames: new Set()
      });
    }
  });

  assert.equal(quest.religiousMissionId, "ming-three-teachings-mediation");
  assert.equal(quest.passengerReligionId, "mahayana-buddhism");
  assert.equal(quest.destinationName, "Nanjing");
  assert.equal(religiousMissionTitle(quest), "Two Temples, One Harbor");
  assert.equal(passengerRoleLabel(quest), "Buddhist monk");
  assert.equal(religiousMissionIconId(quest), "religion:buddhist");
  assert.equal(captainCanParticipateInReligiousMission(state, quest), true);
  assert.equal(religiousMissionParticipation(quest).bonusDoubloons, 120);
  assert.equal(characterRequest.scenario.preferClergy, true);
  assert.ok(quest.passenger.sourceRoles.includes("clergy"));
  assert.equal(quest.passenger.sourceLabel, "Bald Monk");
  assert.match(quest.dialogue.offer, /Daoist abbey/);
  assert.match(quest.dialogue.arrival, /Buddhist, Daoist/);
});

test("mission generation prefers work in the captain's own tradition", () => {
  const origin = port(201, "Lahore", "Pakistan", "delhi");
  const destination = port(202, "Multan", "Pakistan", "delhi");
  const state = createGameState({
    cargoCapacity: 20,
    playerCharacter: {
      ...playerHome(origin),
      name: "Bhai Amar",
      nationalityId: "delhi",
      religionId: "sikhism",
      expressions: ["neutral", "happy"]
    }
  });
  const quest = passengerOfferForCity(state, origin, [origin, destination], {
    spawnChance: 1,
    religiousScenarioChance: 1,
    hajjScenarioChance: 0,
    destinationCityId: destination.cityId,
    simMinute: 0,
    sailingDistanceKm: () => 500
  });

  assert.equal(quest.religiousMissionId, "sikh-sangat-hymns");
  assert.equal(quest.passengerReligionId, "sikhism");
  assert.match(quest.dialogue.offer, /Guru Nanak/);
  assert.equal(captainCanParticipateInReligiousMission(state, quest), true);
});

function port(tileId, city, country, factionId, cityType = null) {
  return {
    cityId: `${city.toLocaleLowerCase("en-US")}|${country.toLocaleLowerCase("en-US")}`,
    tileId,
    city,
    displayCity: city,
    country,
    factionId,
    cityType: cityType || (country === "China" ? "east-asian" : "south-asian"),
    lat: tileId,
    lon: tileId
  };
}

function playerHome(city) {
  return {
    id: `player:test:${city.cityId}`,
    homePortCityId: city.cityId,
    homePortTileId: city.tileId,
    homePortName: city.displayCity || city.city,
    homePortCountry: city.country
  };
}

function requiredSailingEndpoint(name) {
  const matches = PORT_SAILING_DISTANCES.endpoints.filter((endpoint) => endpoint.name === name);
  assert.equal(matches.length, 1, `${name} must be a unique port in the sailing bake`);
  return matches[0];
}
