import assert from "node:assert/strict";
import test from "node:test";

import {
  CITY_DESTINATIONS,
  activeCityDestinations,
  cityDestinationById,
  validateCityDestinationIds
} from "./cityDestinations.js";
import { PORT_CITY_LOCATION } from "../src/portCityNavigation.js";

const ALL_SERVICES = Object.freeze({
  settlementStage: "city",
  shipyard: true,
  market: true,
  store: true,
  inn: true
});

test("city destinations cannot advertise service buildings absent from the scene", () => {
  const features = Object.freeze({
    settlementStage: "city",
    shipyard: false,
    market: true,
    store: false,
    inn: true
  });
  const activeIds = activeCityDestinations({
    availableDestinationIds: null,
    features,
    assaultActive: false
  }).map(({ id }) => id);

  assert.ok(!activeIds.includes(PORT_CITY_LOCATION.SHIPYARD));
  assert.ok(!activeIds.includes(PORT_CITY_LOCATION.EQUIPMENT));
  assert.ok(activeIds.includes(PORT_CITY_LOCATION.MARKET));
  assert.ok(activeIds.includes(PORT_CITY_LOCATION.INN));
  assert.ok(activeIds.includes(PORT_CITY_LOCATION.AUTHORITY));
});

test("a dockless village keeps authority actions without inventing service buildings", () => {
  const activeIds = activeCityDestinations({
    availableDestinationIds: new Set([
      PORT_CITY_LOCATION.SET_SAIL,
      PORT_CITY_LOCATION.SHIP,
      PORT_CITY_LOCATION.AUTHORITY
    ]),
    features: Object.freeze({
      settlementStage: "city",
      shipyard: false,
      market: true,
      store: false,
      inn: false
    }),
    assaultActive: false
  }).map(({ id }) => id);

  assert.deepEqual(activeIds, [
    PORT_CITY_LOCATION.SET_SAIL,
    PORT_CITY_LOCATION.AUTHORITY,
    PORT_CITY_LOCATION.SHIP
  ]);
});

test("an explicit navigation model remains constrained by rendered scene features", () => {
  const activeIds = activeCityDestinations({
    availableDestinationIds: new Set([
      PORT_CITY_LOCATION.SHIPYARD,
      PORT_CITY_LOCATION.SHIP
    ]),
    features: Object.freeze({ ...ALL_SERVICES, shipyard: false }),
    assaultActive: false
  }).map(({ id }) => id);

  assert.deepEqual(activeIds, [PORT_CITY_LOCATION.SHIP]);
});

test("assaults expose only the set-sail destination", () => {
  assert.deepEqual(activeCityDestinations({
    availableDestinationIds: new Set([PORT_CITY_LOCATION.SHIP]),
    features: ALL_SERVICES,
    assaultActive: true
  }).map(({ id }) => id), [PORT_CITY_LOCATION.SET_SAIL]);
});

test("uninhabited land exposes only the arriving ship and departure, even with explicit town actions", () => {
  const features = { ...ALL_SERVICES, settlementStage: "uninhabited" };
  for (const availableDestinationIds of [null, new Set(CITY_DESTINATIONS.map(({ id }) => id))]) {
    assert.deepEqual(activeCityDestinations({ availableDestinationIds, features, assaultActive: false })
      .map(({ id }) => id), [PORT_CITY_LOCATION.SET_SAIL, PORT_CITY_LOCATION.SHIP]);
  }
  assert.deepEqual(activeCityDestinations({
    availableDestinationIds: new Set([PORT_CITY_LOCATION.INN]), features, assaultActive: false
  }), []);
  assert.throws(() => activeCityDestinations({
    availableDestinationIds: null, features: { ...features, settlementStage: "invalid" }, assaultActive: false
  }), /settlement stage/);
});

test("the destination catalog and explicit ids fail loudly when malformed", () => {
  assert.equal(
    new Set(CITY_DESTINATIONS.map(({ id }) => id)).size,
    CITY_DESTINATIONS.length
  );
  assert.equal(cityDestinationById(PORT_CITY_LOCATION.SHIPYARD).requiredFeature, "shipyard");
  assert.throws(() => cityDestinationById("lost-building"), /Unknown city destination/);
  assert.throws(
    () => validateCityDestinationIds([PORT_CITY_LOCATION.SHIP, PORT_CITY_LOCATION.SHIP]),
    /Duplicate city destination/
  );
  assert.throws(() => validateCityDestinationIds(["lost-building"]), /Unknown city destination/);
});

test("ruined colony clues require explicit quest availability and never expose town services", () => {
  const features = { ...ALL_SERVICES, settlementStage: "ruins" };
  const availableDestinationIds = new Set(CITY_DESTINATIONS.map(({ id }) => id));
  assert.deepEqual(activeCityDestinations({ availableDestinationIds, features, assaultActive: false })
    .map(({ id }) => id), [PORT_CITY_LOCATION.COLONY_CLUE, PORT_CITY_LOCATION.SET_SAIL, PORT_CITY_LOCATION.SHIP]);
  availableDestinationIds.delete(PORT_CITY_LOCATION.COLONY_CLUE);
  assert.ok(!activeCityDestinations({ availableDestinationIds, features, assaultActive: false })
    .some(({ id }) => id === PORT_CITY_LOCATION.COLONY_CLUE));
  assert.ok(!activeCityDestinations({ availableDestinationIds: null, features, assaultActive: false })
    .some(({ id }) => id === PORT_CITY_LOCATION.COLONY_CLUE));
  assert.equal(cityDestinationById(PORT_CITY_LOCATION.COLONY_CLUE).label, "?");
});

test("village chief's hut and town port authority share the authority destination", () => {
  const authority = (primitiveSettlement) => activeCityDestinations({
    availableDestinationIds: null, assaultActive: false,
    features: { ...ALL_SERVICES, primitiveSettlement }
  }).find(({ id }) => id === PORT_CITY_LOCATION.AUTHORITY);
  assert.equal(authority(true).label, "Chief’s hut");
  assert.equal(authority(false).label, "Port authority");
  assert.deepEqual(authority(true).layers, authority(false).layers);
  assert.equal(cityDestinationById(PORT_CITY_LOCATION.AUTHORITY).label, "Port authority");
});
