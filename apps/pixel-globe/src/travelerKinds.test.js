import assert from "node:assert/strict";
import test from "node:test";

import {
  NAMED_TRAVELER_KINDS,
  TRAVELER_KINDS,
  completeTravelerKindRecord,
  createTravelerGroup
} from "./travelerKinds.js";

test("traveler kinds have one canonical roster", () => {
  assert.deepEqual(TRAVELER_KINDS, ["passenger", "envoy", "settler", "soldier", "captive"]);
  assert.deepEqual(NAMED_TRAVELER_KINDS, ["passenger", "envoy", "captive"]);
});

test("traveler groups reject unknown discriminants at their source", () => {
  assert.deepEqual(createTravelerGroup("captive", 1), { kind: "captive", count: 1 });
  assert.throws(
    () => createTravelerGroup("stowaway", 1),
    /Traveler has invalid kind: stowaway/
  );
});

test("traveler behavior records must handle every kind and no unknown kinds", () => {
  assert.deepEqual(completeTravelerKindRecord({
    passenger: "blue",
    envoy: "gold",
    settler: "green",
    soldier: "orange",
    captive: "red"
  }, "Test colors"), {
    passenger: "blue",
    envoy: "gold",
    settler: "green",
    soldier: "orange",
    captive: "red"
  });
  assert.throws(
    () => completeTravelerKindRecord({ passenger: 1, envoy: 1, settler: 1, soldier: 1 }, "Test roles"),
    /missing captive/
  );
  assert.throws(
    () => completeTravelerKindRecord({
      passenger: 1,
      envoy: 1,
      settler: 1,
      soldier: 1,
      captive: 1,
      stowaway: 1
    }, "Test roles"),
    /unknown stowaway/
  );
});
