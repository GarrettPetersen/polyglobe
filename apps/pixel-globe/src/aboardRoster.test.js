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

test("every crewmate receives a distinct compact roster entry", () => {
  const roster = aboardRoster({ captain, crewCount: 25 });
  assert.equal(roster.count, 26);
  assert.deepEqual(roster.named.map((entry) => entry.role), [ABOARD_ROLE_CAPTAIN]);
  assert.equal(roster.generic.length, 25);
  assert.ok(roster.generic.every((entry) => entry.role === ABOARD_ROLE_CREWMATE));
  assert.equal(new Set(roster.generic.map((entry) => entry.id)).size, 25);
});

test("named passengers and emissaries replace their generic manifest person", () => {
  const passengerRoster = aboardRoster({
    captain,
    crewCount: 2,
    travelerGroups: [{ kind: "passenger", count: 1 }],
    namedTraveler: { kind: "passenger", character: passenger }
  });
  assert.deepEqual(
    passengerRoster.named.map((entry) => entry.role),
    [ABOARD_ROLE_CAPTAIN, ABOARD_ROLE_PASSENGER]
  );
  assert.equal(passengerRoster.generic.length, 2);

  const envoyRoster = aboardRoster({
    captain,
    crewCount: 0,
    travelerGroups: [{ kind: "envoy", count: 1 }],
    namedTraveler: { kind: "envoy", character: envoy }
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
  assert.equal(roster.count, 16);
  assert.equal(roster.named.at(-1).role, ABOARD_ROLE_COLONY_LEADER);
  assert.equal(roster.generic.filter((entry) => entry.role === ABOARD_ROLE_COLONIST).length, 11);
});

test("a named traveler must match somebody in the manifest", () => {
  assert.throws(() => aboardRoster({
    captain,
    crewCount: 1,
    travelerGroups: [],
    namedTraveler: { kind: "passenger", character: passenger }
  }), /not present in the traveler manifest/);
});
