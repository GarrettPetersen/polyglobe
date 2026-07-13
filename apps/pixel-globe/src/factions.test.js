import test from "node:test";
import assert from "node:assert/strict";

import {
  DIPLOMACY_ALLY,
  DIPLOMACY_MATRIX_1522,
  DIPLOMACY_NEUTRAL,
  DIPLOMACY_WAR,
  FACTIONS,
  FACTION_CAPITALS_1522,
  NEUTRAL_FACTION_ID,
  PIRATE_FACTION_ID,
  diplomacyBetween,
  factionCapitalCityRecords1522,
  factionCapitalForCity,
  factionCapitalForId,
  factionIdForCity1522,
  markFactionCapitalsOnPorts
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
    ["Cairo", "Egypt", "ottoman"],
    ["Hafnarfjordur", "Iceland", "denmark-norway"]
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

test("every sovereign faction has one declared water-accessible capital", () => {
  const sovereignFactionIds = FACTIONS
    .filter((faction) => ![NEUTRAL_FACTION_ID, PIRATE_FACTION_ID].includes(faction.id))
    .map((faction) => faction.id)
    .sort();

  assert.deepEqual(
    FACTION_CAPITALS_1522.map((capital) => capital.factionId).sort(),
    sovereignFactionIds
  );

  for (const capital of FACTION_CAPITALS_1522) {
    assert.equal(factionCapitalForId(capital.factionId), capital);
    assert.equal(factionCapitalForCity(capital), capital);
    assert.equal(factionIdForCity1522(capital), capital.factionId, `${capital.city}, ${capital.country}`);
  }
  assert.equal(factionCapitalForId("ming").city, "Beijing");
});

test("required capital port records cover factions missing a suitable catalog city", () => {
  assert.deepEqual(
    factionCapitalCityRecords1522().map((capital) => `${capital.factionId}:${capital.city}`).sort(),
    ["ethiopia:Massawa", "muscovy:Kholmogory"]
  );
});

test("capital resolver annotates only water-accessible ports and fails loudly otherwise", () => {
  const ports = FACTION_CAPITALS_1522.map((capital, index) => ({
    ...capital,
    tileId: index + 1,
    displayCity: capital.city,
    factionId: capital.factionId
  }));
  const capitalPorts = markFactionCapitalsOnPorts(ports);

  assert.equal(capitalPorts.size, FACTION_CAPITALS_1522.length);
  for (const capital of FACTION_CAPITALS_1522) {
    const port = capitalPorts.get(capital.factionId);
    assert.equal(port.city, capital.city);
    assert.equal(port.isFactionCapital, true);
    assert.equal(port.capitalOfFactionId, capital.factionId);
  }

  assert.throws(
    () => markFactionCapitalsOnPorts(ports.filter((port) => port.factionId !== "aztec")),
    /aztec capital Zempoala, Mexico is not water accessible/
  );

  assert.throws(
    () => markFactionCapitalsOnPorts(ports.map((port) => (
      port.factionId === "aztec" ? { ...port, factionId: "neutral" } : port
    ))),
    /Zempoala, Mexico belongs to neutral, not aztec/
  );
});
