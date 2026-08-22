import test from "node:test";
import assert from "node:assert/strict";

import {
  DIPLOMACY_ALLY,
  DIPLOMACY_FRIENDLY,
  DIPLOMACY_HOSTILE,
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
  factionExistsIn1522,
  factionHasFlag,
  factionIdForCity1522,
  factionNounPhrase,
  migrateFactionIdTo1522,
  markFactionCapitalsOnPorts
} from "./factions.js";

test("neutral allegiance has no flag while real factions do", () => {
  assert.equal(factionHasFlag(NEUTRAL_FACTION_ID), false);
  assert.equal(factionHasFlag(PIRATE_FACTION_ID), true);
  assert.equal(factionHasFlag("england"), true);
  assert.throws(() => factionHasFlag("missing-faction"), /Unknown faction/);
});

test("every faction separates its noun and adjective forms", () => {
  for (const faction of FACTIONS) {
    assert.ok(faction.name.length > 0, faction.id);
    assert.ok(faction.shortName.length > 0, faction.id);
    assert.ok(faction.adjective.length > 0, faction.id);
  }
  const portugal = FACTIONS.find((faction) => faction.id === "portugal");
  const morocco = FACTIONS.find((faction) => faction.id === "morocco");
  const ternate = FACTIONS.find((faction) => faction.id === "ternate");
  const tidore = FACTIONS.find((faction) => faction.id === "tidore");
  const hospitallers = FACTIONS.find((faction) => faction.id === "hospitallers");
  const japan = FACTIONS.find((faction) => faction.id === "japan");
  assert.equal(portugal.shortName, "Portugal");
  assert.equal(portugal.adjective, "Portuguese");
  assert.equal(morocco.shortName, "Morocco");
  assert.equal(morocco.adjective, "Moroccan");
  assert.equal(ternate.shortName, "Ternate");
  assert.equal(ternate.adjective, "Ternatan");
  assert.equal(tidore.shortName, "Tidore");
  assert.equal(tidore.adjective, "Tidorese");
  assert.equal(hospitallers.shortName, "Knights Hospitaller");
  assert.equal(hospitallers.adjective, "Hospitaller");
  assert.equal(japan.name, "Ashikaga Shogunate");
  assert.equal(japan.shortName, "Japan");
  assert.equal(japan.adjective, "Japanese");
  assert.equal(factionNounPhrase("portugal"), "Portugal");
  assert.equal(factionNounPhrase("morocco"), "Morocco");
  assert.equal(factionNounPhrase("ottoman"), "the Ottoman Empire");
  assert.equal(factionNounPhrase("ottoman", { sentenceStart: true }), "The Ottoman Empire");
  assert.equal(factionNounPhrase("hospitallers"), "the Knights Hospitaller");
});

test("1522 diplomacy matrix is complete and symmetric", () => {
  const validRelations = new Set([
    DIPLOMACY_ALLY,
    DIPLOMACY_FRIENDLY,
    DIPLOMACY_NEUTRAL,
    DIPLOMACY_HOSTILE,
    DIPLOMACY_WAR
  ]);
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
  assert.equal(diplomacyBetween("ottoman", "habsburg"), DIPLOMACY_HOSTILE);
  assert.equal(diplomacyBetween("england", "portugal"), DIPLOMACY_FRIENDLY);
  assert.equal(diplomacyBetween("portugal", "vijayanagara"), DIPLOMACY_FRIENDLY);
  assert.equal(diplomacyBetween("ming", "joseon"), DIPLOMACY_ALLY);
  assert.equal(diplomacyBetween("venice", "habsburg"), DIPLOMACY_WAR);
  assert.equal(diplomacyBetween("portugal", "morocco"), DIPLOMACY_WAR);
  assert.equal(diplomacyBetween("ming", "japan"), DIPLOMACY_HOSTILE);
  assert.equal(diplomacyBetween("portugal", "ming"), DIPLOMACY_WAR);
  assert.equal(diplomacyBetween("ottoman", "hospitallers"), DIPLOMACY_WAR);
  assert.equal(diplomacyBetween("sweden", "denmark-norway"), DIPLOMACY_WAR);
  assert.equal(diplomacyBetween("sweden", "habsburg"), DIPLOMACY_HOSTILE);
  assert.equal(diplomacyBetween("papal-states", "hospitallers"), DIPLOMACY_FRIENDLY);
  assert.equal(diplomacyBetween("venice", "genoa"), DIPLOMACY_HOSTILE);
  assert.equal(diplomacyBetween("ternate", "spain"), DIPLOMACY_HOSTILE);
  assert.equal(diplomacyBetween("ternate", "portugal"), DIPLOMACY_NEUTRAL);
  assert.equal(diplomacyBetween("ternate", "tidore"), DIPLOMACY_HOSTILE);
  assert.equal(diplomacyBetween("tidore", "spain"), DIPLOMACY_FRIENDLY);
  assert.equal(diplomacyBetween("tidore", "portugal"), DIPLOMACY_HOSTILE);
  assert.equal(diplomacyBetween("ternate", "ayutthaya"), DIPLOMACY_NEUTRAL);
  assert.equal(diplomacyBetween("ottoman", "wallachia"), DIPLOMACY_HOSTILE);
  assert.equal(diplomacyBetween("ottoman", "moldavia"), DIPLOMACY_NEUTRAL);
  assert.equal(diplomacyBetween("ottoman", "hejaz"), DIPLOMACY_FRIENDLY);
  assert.equal(diplomacyBetween("ottoman", "ragusa"), DIPLOMACY_FRIENDLY);
  assert.equal(diplomacyBetween("ming", "ryukyu"), DIPLOMACY_FRIENDLY);
  assert.equal(diplomacyBetween("japan", "ainu"), DIPLOMACY_HOSTILE);
  assert.equal(diplomacyBetween("inca", "muscovy"), DIPLOMACY_NEUTRAL);
  for (const faction of FACTIONS) {
    if (faction.id !== PIRATE_FACTION_ID) {
      assert.equal(diplomacyBetween(PIRATE_FACTION_ID, faction.id), DIPLOMACY_WAR);
    }
  }
});

test("representative 1522 cities receive their governing faction", () => {
  const cases = [
    ["London", "United Kingdom", "england"],
    ["Norwich", "United Kingdom", "england"],
    ["Exeter", "United Kingdom", "england"],
    ["Bristol", "United Kingdom", "england"],
    ["Southampton", "United Kingdom", "england"],
    ["York", "United Kingdom", "england"],
    ["Hull", "United Kingdom", "england"],
    ["Newcastle upon Tyne", "United Kingdom", "england"],
    ["Dublin", "Ireland", "england"],
    ["Edinburgh", "United Kingdom", "scotland"],
    ["Paris", "France", "france"],
    ["Istanbul", "Turkey", "ottoman"],
    ["Venice", "Italy", "venice"],
    ["Genova", "Italy", "genoa"],
    ["Lisbon", "Portugal", "portugal"],
    ["Beijing", "China", "ming"],
    ["Tsinkiang", "China", "ming"],
    ["Mexico City", "Mexico", "spain"],
    ["Cuzco", "Peru", "inca"],
    ["Cairo", "Egypt", "ottoman"],
    ["Hafnarfjordur", "Iceland", "denmark-norway"],
    ["Gavle", "Sweden", "sweden"],
    ["Nykoping", "Sweden", "sweden"],
    ["Soderkoping", "Sweden", "sweden"],
    ["Stockholm", "Sweden", "denmark-norway"],
    ["Kalmar", "Sweden", "denmark-norway"],
    ["Visby", "Sweden", "denmark-norway"],
    ["Turku", "Finland", "denmark-norway"],
    ["Ternate", "Indonesia", "ternate"],
    ["Hitu Village", "Indonesia", "ternate"],
    ["Buru Village", "Indonesia", "ternate"],
    ["Tidore", "Indonesia", "tidore"],
    ["Makian Village", "Indonesia", "tidore"],
    ["Gane Village", "Indonesia", "tidore"],
    ["Rhodes", "Greece", "hospitallers"],
    ["Braila", "Romania", "wallachia"],
    ["Galati", "Romania", "moldavia"],
    ["Ragusa", "Croatia", "ragusa"],
    ["Jeddah", "Saudi Arabia", "hejaz"],
    ["Jerusalem", "Israel", "ottoman"],
    ["Aleppo", "Syria", "ottoman"],
    ["Antioch", "Syria/Turkey", "ottoman"],
    ["Naha", "Japan", "ryukyu"],
    ["Akkeshi Kotan", "Japan", "ainu"]
  ];
  for (const [city, country, factionId] of cases) {
    assert.equal(factionIdForCity1522({ city, country }), factionId, `${city}, ${country}`);
  }
});

test("represented Imperial cities retain their researched 1522 sovereigns", () => {
  const assignments = [
    ["Brugge", "Belgium", "burgundian-netherlands"],
    ["Gent", "Belgium", "burgundian-netherlands"],
    ["Vienna", "Austria", "habsburg"], ["Prague", "Austria", "bohemia"],
    ["Wroclaw", "Germany", "bohemia"], ["Cologne", "Germany", "cologne"],
    ["Augsberg", "Germany", "augsburg"], ["Nurnberg", "Germany", "nuremberg"],
    ["Lubeck", "Germany", "lubeck"], ["Liege", "Belgium", "liege"],
    ["Mainz", "Germany", "mainz"], ["Hamburg", "Germany", "hamburg"],
    ["Magdeburg", "Germany", "magdeburg"], ["Erfurt", "Germany", "mainz"],
    ["Bremen", "Germany", "bremen"], ["Soest", "Germany", "cleves-mark"],
    ["Hannover", "Germany", "calenberg"], ["Speyer", "Germany", "speyer"],
    ["Utrecht", "Netherlands", "utrecht"], ["Regensburg", "Germany", "regensburg"],
    ["Trier", "Germany", "trier"], ["Leipzig", "Germany", "ducal-saxony"],
    ["Worms", "Germany", "worms"]
  ];
  for (const [city, country, factionId] of assignments) {
    assert.equal(factionIdForCity1522({ city, country }), factionId, `${city}, ${country}`);
  }
});

test("overseas possessions and uncertain small powers are handled explicitly", () => {
  assert.equal(factionIdForCity1522({ city: "Goa", country: "India" }), "portugal");
  assert.equal(factionIdForCity1522({ city: "Hormuz", country: "Iran" }), "hormuz");
  assert.equal(factionIdForCity1522({ city: "Muscat", country: "Oman" }), "hormuz");
  assert.equal(factionIdForCity1522({ city: "Bakhchiserai", country: "Ukraine" }), "crimea");
  assert.equal(factionIdForCity1522({ city: "Avignon", country: "France" }), NEUTRAL_FACTION_ID);
  assert.equal(factionIdForCity1522({ city: "Chiang Mai", country: "Thailand" }), NEUTRAL_FACTION_ID);
  assert.equal(factionIdForCity1522({ city: "Banda Village", country: "Indonesia" }), NEUTRAL_FACTION_ID);
  assert.equal(factionIdForCity1522({ city: "Unknown", country: "Unknown" }), NEUTRAL_FACTION_ID);
});

test("the defeated Aztec Empire is not a sovereign power in 1522", () => {
  assert.equal(FACTIONS.some((faction) => faction.id === "aztec"), false);
  assert.equal(migrateFactionIdTo1522("aztec"), "spain");
  assert.equal(migrateFactionIdTo1522("inca"), "inca");
  for (const city of ["Mexico City", "Texcoco", "Tenayuca", "Cholula", "Zempoala"]) {
    assert.equal(factionIdForCity1522({ city, country: "Mexico" }), "spain", city);
  }
  assert.equal(factionIdForCity1522({ city: "Tzintzuntzan", country: "Mexico" }), NEUTRAL_FACTION_ID);
});

test("every sovereign faction has one declared water-accessible capital", () => {
  const sovereignFactionIds = FACTIONS
    .filter((faction) => (
      ![NEUTRAL_FACTION_ID, PIRATE_FACTION_ID].includes(faction.id) &&
      factionExistsIn1522(faction.id)
    ))
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
  assert.equal(factionCapitalForId("scotland").city, "Edinburgh");
  assert.equal(factionCapitalForId("sweden").city, "Soderkoping");
  assert.equal(factionCapitalForId("ternate").city, "Ternate");
  assert.equal(factionCapitalForId("tidore").city, "Tidore");
  assert.equal(factionCapitalForId("hospitallers").city, "Rhodes");
});

test("required capital port records cover factions missing a suitable catalog city", () => {
  assert.deepEqual(
    factionCapitalCityRecords1522().map((capital) => `${capital.factionId}:${capital.city}`).sort(),
    [
      "brandenburg:Berlin",
      "cologne-electorate:Bonn",
      "electoral-saxony:Wittenberg",
      "ethiopia:Massawa",
      "muscovy:Kholmogory",
      "palatinate:Heidelberg"
    ]
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
    () => markFactionCapitalsOnPorts(ports.filter((port) => port.factionId !== "england")),
    /england capital London, United Kingdom is not water accessible/
  );

  assert.throws(
    () => markFactionCapitalsOnPorts(ports.map((port) => (
      port.factionId === "england" ? { ...port, factionId: "neutral" } : port
    ))),
    /London, United Kingdom belongs to neutral, not england/
  );
});
