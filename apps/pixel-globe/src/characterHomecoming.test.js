import assert from "node:assert/strict";
import test from "node:test";
import { aboardRoster } from "./aboardRoster.js";
import {
  CHARACTER_HOMECOMING_COOLDOWN_MINUTES,
  characterHomecomingDialogue,
  nextCharacterHomecoming,
  recordCharacterHomecoming
} from "./characterHomecoming.js";

const CAPTAIN = Object.freeze({ id: "captain", name: "Captain", skillIds: ["navigator"] });
const CHEF = Object.freeze({
  id: "chef",
  name: "Lucia Costa",
  homePortCityId: "cadiz|spain",
  homePortTileId: 11,
  role: "chef",
  skillIds: ["master-chef"]
});
const NAVIGATOR = Object.freeze({
  id: "navigator",
  name: "Brites Pereira",
  homePortCityId: "lisbon|portugal",
  homePortTileId: 12,
  role: "crewmate",
  skillIds: ["navigator"]
});

function roster({ namedCrew = [CHEF], namedTravelers = [] } = {}) {
  return aboardRoster({
    captain: CAPTAIN,
    crewCount: 1 + namedCrew.length,
    namedCrew,
    travelerGroups: namedTravelers.map(({ kind }) => ({ kind, count: 1 })),
    namedTravelers
  });
}

test("a permanent crewmate comments on arriving at their home port", () => {
  const result = nextCharacterHomecoming({
    decisions: {},
    roster: roster(),
    cityId: "cadiz|spain",
    cityName: "Cadiz",
    currentMinute: 100,
    variantSeed: 0
  });

  assert.equal(result.character.id, CHEF.id);
  assert.match(result.message, /Cadiz/);
  assert.equal(result.expressionId, "happy");
});

test("captains and temporary travelers do not use permanent crew homecoming dialogue", () => {
  const traveler = {
    id: "passenger",
    name: "Joao Reis",
    homePortCityId: "cadiz|spain",
    homePortTileId: 11,
    skillIds: ["skilled-negotiator"]
  };
  assert.equal(nextCharacterHomecoming({
    decisions: {},
    roster: roster({ namedCrew: [], namedTravelers: [{ kind: "passenger", character: traveler }] }),
    cityId: "cadiz|spain",
    cityName: "Cadiz",
    currentMinute: 100
  }), null);
});

test("a homecoming has a thirty-day per-character cooldown", () => {
  const decisions = {};
  recordCharacterHomecoming(decisions, CHEF.id, 100);
  assert.equal(nextCharacterHomecoming({
    decisions,
    roster: roster(),
    cityId: "cadiz|spain",
    cityName: "Cadiz",
    currentMinute: 100 + CHARACTER_HOMECOMING_COOLDOWN_MINUTES - 1
  }), null);
  assert.equal(nextCharacterHomecoming({
    decisions,
    roster: roster(),
    cityId: "cadiz|spain",
    cityName: "Cadiz",
    currentMinute: 100 + CHARACTER_HOMECOMING_COOLDOWN_MINUTES
  }).character.id, CHEF.id);
});

test("homecoming dialogue reflects a crewmate's work aboard", () => {
  assert.match(
    characterHomecomingDialogue(NAVIGATOR, "Lisbon", 1).message,
    /find this harbor/
  );
  assert.match(
    characterHomecomingDialogue(CHEF, "Cadiz", 1).message,
    /spices/
  );
});

test("malformed persisted homecoming memory fails loudly", () => {
  assert.throws(() => nextCharacterHomecoming({
    decisions: { [`crew.homecoming.${CHEF.id}`]: "yesterday" },
    roster: roster(),
    cityId: "cadiz|spain",
    cityName: "Cadiz",
    currentMinute: 100
  }), /Invalid character homecoming memory/);
});
