import assert from "node:assert/strict";
import test from "node:test";

import {
  ABOARD_ROLE_CAPTAIN,
  ABOARD_ROLE_COLONIST,
  ABOARD_ROLE_COLONY_LEADER,
  ABOARD_ROLE_CREWMATE,
  ABOARD_ROLE_EMISSARY,
  ABOARD_ROLE_PASSENGER,
  aboardRoster
} from "./aboardRoster.js";

const captain = Object.freeze({ id: "captain", name: "Ana Costa" });
const passenger = Object.freeze({ id: "passenger", name: "Mateo Costa" });
const envoy = Object.freeze({ id: "envoy", name: "Mei Lin" });
const leader = Object.freeze({ id: "leader", name: "Jeanne Moreau" });

test("crew count includes the captain and every unnamed hand receives one compact entry", () => {
  const roster = aboardRoster({ captain, crewCount: 25 });
  assert.equal(roster.count, 25);
  assert.deepEqual(roster.named.map((entry) => entry.role), [ABOARD_ROLE_CAPTAIN]);
  assert.equal(roster.generic.length, 24);
  assert.ok(roster.generic.every((entry) => entry.role === ABOARD_ROLE_CREWMATE));
  assert.equal(new Set(roster.generic.map((entry) => entry.id)).size, 24);
});

test("named passengers and emissaries replace their generic manifest person", () => {
  const passengerRoster = aboardRoster({
    captain,
    crewCount: 2,
    travelerGroups: [{ kind: "passenger", count: 1 }],
    namedTravelers: [{ kind: "passenger", character: passenger }]
  });
  assert.deepEqual(
    passengerRoster.named.map((entry) => entry.role),
    [ABOARD_ROLE_CAPTAIN, ABOARD_ROLE_PASSENGER]
  );
  assert.equal(passengerRoster.generic.length, 1);

  const envoyRoster = aboardRoster({
    captain,
    crewCount: 0,
    travelerGroups: [{ kind: "envoy", count: 1 }],
    namedTravelers: [{ kind: "envoy", character: envoy }]
  });
  assert.deepEqual(
    envoyRoster.named.map((entry) => entry.role),
    [ABOARD_ROLE_CAPTAIN, ABOARD_ROLE_EMISSARY]
  );
  assert.equal(envoyRoster.count, 2);
});

test("the colony leader occupies one of the settler places aboard", () => {
  const roster = aboardRoster({
    captain,
    crewCount: 3,
    travelerGroups: [{ kind: "settler", count: 12 }],
    colonyLeader: leader
  });
  assert.equal(roster.count, 15);
  assert.equal(roster.named.at(-1).role, ABOARD_ROLE_COLONY_LEADER);
  assert.equal(roster.generic.filter((entry) => entry.role === ABOARD_ROLE_COLONIST).length, 11);
});

test("a named traveler must match somebody in the manifest", () => {
  assert.throws(() => aboardRoster({
    captain,
    crewCount: 1,
    travelerGroups: [],
    namedTravelers: [{ kind: "passenger", character: passenger }]
  }), /not present in the traveler manifest/);
});

test("ordinary missions and a rescued pirate captive can travel together", () => {
  const secondPassenger = Object.freeze({ id: "captive", name: "Brites Pereira" });
  const roster = aboardRoster({
    captain,
    crewCount: 3,
    travelerGroups: [{ kind: "passenger", count: 2 }],
    namedTravelers: [
      { kind: "passenger", character: passenger },
      { kind: "passenger", character: secondPassenger }
    ]
  });
  assert.equal(roster.named.filter((entry) => entry.role === ABOARD_ROLE_PASSENGER).length, 2);
  assert.equal(roster.count, 5);
});
