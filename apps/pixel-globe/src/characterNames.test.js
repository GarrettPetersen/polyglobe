import assert from "node:assert/strict";
import test from "node:test";

import {
  assignRegionalCharacterIdentity,
  assignRegionalCharacterName,
  nameCultureCandidatesForSubject,
  nameCultureForSubject
} from "./characterNames.js";

test("regional character names are deterministic and respect family-first cultures", () => {
  const city = { city: "Nanjing", country: "China", cityType: "east-asian" };
  const args = {
    identityKey: "Nanjing|China|12",
    city,
    sex: "male"
  };
  const first = assignRegionalCharacterName({ ...args, usedNames: new Set() });
  const second = assignRegionalCharacterName({ ...args, usedNames: new Set() });

  assert.deepEqual(first, second);
  assert.equal(first.nameCulture, "chinese");
  assert.equal(first.gender, "male");
  assert.equal(first.name, `${first.familyName} ${first.givenName}`);
});

test("explicit portrait sex selects the matching given-name pool", () => {
  const character = assignRegionalCharacterName({
    identityKey: "captain|ship-4",
    ship: { currentPort: { city: "Lisbon", country: "Portugal", cityType: "mediterranean" } },
    sex: "female",
    usedNames: new Set()
  });
  assert.equal(character.gender, "female");
  assert.equal(character.nameCulture, "portuguese");
});

test("character names reject missing portrait sex", () => {
  assert.throws(() => assignRegionalCharacterName({
    identityKey: "captain|ship-5",
    ship: { currentPort: { city: "Lisbon", country: "Portugal", cityType: "mediterranean" } },
    usedNames: new Set()
  }), /requires an explicit sex/);
});

test("a shared name registry prevents duplicate people", () => {
  const usedNames = new Set();
  const args = {
    identityKey: "same-key",
    city: { city: "London", country: "United Kingdom", factionId: "england" },
    sex: "male",
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

test("Icelandic characters use the Nordic name pool", () => {
  assert.equal(nameCultureForSubject({
    city: "Hafnarfjordur",
    country: "Iceland",
    factionId: "denmark-norway"
  }), "nordic");
});

test("Pacific island villages use the Polynesian naming culture", () => {
  const village = { city: "Fiji Village", country: "Fiji", cityType: "polynesian", factionId: "neutral" };
  assert.equal(nameCultureForSubject(village), "polynesian");
  const character = assignRegionalCharacterName({
    identityKey: "fiji-village-factor",
    city: village,
    sex: "male",
    usedNames: new Set()
  });
  assert.equal(character.nameCulture, "polynesian");
  assert.ok(character.name.includes(" "));
});

test("border and colonial cities mix local and ruling name cultures", () => {
  const sudak = {
    city: "Sudak",
    country: "Russian Federation",
    cityType: "mediterranean",
    factionId: "ottoman"
  };
  assert.equal(nameCultureForSubject(sudak), "russian");
  assert.deepEqual(nameCultureCandidatesForSubject(sudak), ["russian", "ottoman"]);

  const seen = new Set();
  for (let i = 0; i < 48; i++) {
    seen.add(assignRegionalCharacterName({
      identityKey: `sudak-captain-${i}`,
      city: sudak,
      sex: "male",
      usedNames: new Set()
    }).nameCulture);
  }
  assert.ok(seen.has("russian"));
  assert.ok(seen.has("ottoman"));
});

test("eastern European home countries use precise local naming pools", () => {
  const cases = [
    ["Warsaw", "Poland", "polish"],
    ["Vilnius", "Lithuania", "lithuanian"],
    ["Moscow", "Russian Federation", "russian"],
    ["Kyiv", "Ukraine", "ruthenian"],
    ["Buda", "Hungary", "hungarian"],
    ["Durres", "Albania", "albanian"],
    ["Sofia", "Bulgaria", "bulgarian"],
    ["Bucharest", "Romania", "romanian"],
    ["Belgrade", "Serbia", "serbian"]
  ];
  for (const [city, country, expected] of cases) {
    assert.equal(nameCultureForSubject({ city, country, factionId: "neutral" }), expected);
  }
});

test("Belgrade identities couple religion, local culture, and portrait attire", () => {
  const belgrade = {
    city: "Belgrade",
    country: "Serbia",
    cityType: "mediterranean",
    factionId: "ottoman"
  };
  const culturesByReligion = new Map();
  let orthodoxCount = 0;
  let sunniCount = 0;
  let mehmedCount = 0;
  for (let index = 0; index < 256; index++) {
    const identity = assignRegionalCharacterIdentity({
      identityKey: `belgrade-captain-${index}`,
      city: belgrade,
      character: { id: `portrait-${index}`, sex: "male" },
      usedNames: new Set()
    });
    culturesByReligion.set(identity.religionId, identity.nameCulture);
    if (identity.religionId === "eastern-orthodox") orthodoxCount += 1;
    if (identity.religionId === "sunni-islam") {
      sunniCount += 1;
      if (identity.givenName === "Mehmed") mehmedCount += 1;
    }
    assert.notEqual(identity.familyName, "Kowalski");
  }
  assert.equal(culturesByReligion.get("eastern-orthodox"), "serbian");
  assert.equal(culturesByReligion.get("sunni-islam"), "ottoman");
  assert.ok(orthodoxCount > sunniCount * 2);
  assert.ok(sunniCount > 0);
  assert.ok(mehmedCount >= Math.floor(sunniCount / 8));

  const priest = assignRegionalCharacterIdentity({
    identityKey: "belgrade-priest",
    city: belgrade,
    character: {
      id: "belgrade-priest-portrait",
      sex: "male",
      requiredReligionFamily: "christian"
    },
    usedNames: new Set()
  });
  assert.equal(priest.religionId, "eastern-orthodox");
  assert.equal(priest.nameCulture, "serbian");
});
