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
  shipyard: true,
  market: true,
  store: true,
  inn: true
});

test("city destinations cannot advertise service buildings absent from the scene", () => {
  const features = Object.freeze({
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
