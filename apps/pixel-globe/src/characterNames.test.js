import assert from "node:assert/strict";
import test from "node:test";

import {
  assignRegionalCharacterName,
  characterGenderForSource,
  nameCultureForSubject
} from "./characterNames.js";

test("regional character names are deterministic and respect family-first cultures", () => {
  const city = { city: "Nanjing", country: "China", cityType: "east-asian" };
  const args = {
    identityKey: "Nanjing|China|12",
    city,
    sourceId: "knight-portrait",
    sourceLabel: "Knight Portrait"
  };
  const first = assignRegionalCharacterName({ ...args, usedNames: new Set() });
  const second = assignRegionalCharacterName({ ...args, usedNames: new Set() });

  assert.deepEqual(first, second);
  assert.equal(first.nameCulture, "chinese");
  assert.equal(first.gender, "male");
  assert.equal(first.name, `${first.familyName} ${first.givenName}`);
});

test("portrait source labels select the matching given-name pool", () => {
  assert.equal(characterGenderForSource("women-pirates-portrait-4", "Women Pirates Portrait 4"), "female");
  assert.equal(characterGenderForSource("viking-portrait-male-4", "Viking Portrait Male 4"), "male");

  const character = assignRegionalCharacterName({
    identityKey: "captain|ship-4",
    ship: { currentPort: { city: "Lisbon", country: "Portugal", cityType: "mediterranean" } },
    sourceId: "women-pirates-portrait-4",
    sourceLabel: "Women Pirates Portrait 4",
    usedNames: new Set()
  });
  assert.equal(character.gender, "female");
  assert.equal(character.nameCulture, "portuguese");
});

test("a shared name registry prevents duplicate people", () => {
  const usedNames = new Set();
  const args = {
    identityKey: "same-key",
    city: { city: "London", country: "United Kingdom", factionId: "england" },
    sourceId: "blacksmith-portrait",
    sourceLabel: "Blacksmith Portrait",
    usedNames
  };
  const first = assignRegionalCharacterName(args);
  const second = assignRegionalCharacterName(args);
  assert.notEqual(first.name, second.name);
  assert.equal(usedNames.size, 2);
});

test("England and Scotland use distinct naming cultures", () => {
  assert.equal(nameCultureForSubject({ city: "London", country: "United Kingdom", factionId: "england" }), "english");
  assert.equal(nameCultureForSubject({ city: "Edinburgh", country: "United Kingdom", factionId: "scotland" }), "scottish");
});
