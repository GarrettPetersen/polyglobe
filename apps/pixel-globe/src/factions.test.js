import test from "node:test";
import assert from "node:assert/strict";

import {
  DIPLOMACY_ALLY,
  DIPLOMACY_MATRIX_1522,
  DIPLOMACY_NEUTRAL,
  DIPLOMACY_WAR,
  FACTIONS,
  NEUTRAL_FACTION_ID,
  PIRATE_FACTION_ID,
  diplomacyBetween,
  factionIdForCity1522
} from "./factions.js";

test("1522 diplomacy matrix is complete and symmetric", () => {
  const validRelations = new Set([DIPLOMACY_ALLY, DIPLOMACY_NEUTRAL, DIPLOMACY_WAR]);
  for (const factionA of FACTIONS) {
    assert.deepEqual(Object.keys(DIPLOMACY_MATRIX_1522[factionA.id]).sort(), FACTIONS.map((item) => item.id).sort());
    for (const factionB of FACTIONS) {
      const relation = diplomacyBetween(factionA.id, factionB.id);
      assert.ok(validRelations.has(relation));
      assert.equal(relation, diplomacyBetween(factionB.id, factionA.id));
      if (factionA.id === factionB.id) assert.equal(relation, DIPLOMACY_ALLY);
    }
  }
});

test("matrix captures clear 1522 alliances, wars, and neutral relationships", () => {
  assert.equal(diplomacyBetween("england", "spain"), DIPLOMACY_ALLY);
  assert.equal(diplomacyBetween("france", "scotland"), DIPLOMACY_ALLY);
  assert.equal(diplomacyBetween("england", "france"), DIPLOMACY_WAR);
  assert.equal(diplomacyBetween("portugal", "ming"), DIPLOMACY_WAR);
  assert.equal(diplomacyBetween("venice", "genoa"), DIPLOMACY_NEUTRAL);
  for (const faction of FACTIONS) {
    if (faction.id !== PIRATE_FACTION_ID) {
      assert.equal(diplomacyBetween(PIRATE_FACTION_ID, faction.id), DIPLOMACY_WAR);
    }
  }
});

test("representative 1522 cities receive their governing faction", () => {
  const cases = [
    ["London", "United Kingdom", "england"],
    ["Edinburgh", "United Kingdom", "scotland"],
    ["Paris", "France", "france"],
    ["Istanbul", "Turkey", "ottoman"],
    ["Venice", "Italy", "venice"],
    ["Genova", "Italy", "genoa"],
    ["Lisbon", "Portugal", "portugal"],
    ["Beijing", "China", "ming"],
    ["Mexico City", "Mexico", "aztec"],
    ["Cuzco", "Peru", "inca"],
    ["Cairo", "Egypt", "ottoman"]
  ];
  for (const [city, country, factionId] of cases) {
    assert.equal(factionIdForCity1522({ city, country }), factionId, `${city}, ${country}`);
  }
});

test("overseas possessions and uncertain small powers are handled explicitly", () => {
  assert.equal(factionIdForCity1522({ city: "Goa", country: "India" }), "portugal");
  assert.equal(factionIdForCity1522({ city: "Hormuz", country: "Iran" }), "portugal");
  assert.equal(factionIdForCity1522({ city: "Avignon", country: "France" }), NEUTRAL_FACTION_ID);
  assert.equal(factionIdForCity1522({ city: "Chiang Mai", country: "Thailand" }), NEUTRAL_FACTION_ID);
  assert.equal(factionIdForCity1522({ city: "Unknown", country: "Unknown" }), NEUTRAL_FACTION_ID);
});
