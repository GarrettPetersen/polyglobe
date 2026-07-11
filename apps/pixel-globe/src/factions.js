export const NEUTRAL_FACTION_ID = "neutral";
export const PIRATE_FACTION_ID = "pirate";

export const DIPLOMACY_ALLY = "ally";
export const DIPLOMACY_NEUTRAL = "neutral";
export const DIPLOMACY_WAR = "war";

const DIPLOMACY_RELATIONS = new Set([
  DIPLOMACY_ALLY,
  DIPLOMACY_NEUTRAL,
  DIPLOMACY_WAR
]);

export const FACTIONS = Object.freeze([
  faction(NEUTRAL_FACTION_ID, "Neutral", "Neutral", "neutral"),
  faction(PIRATE_FACTION_ID, "Pirates", "Pirate", "special"),
  faction("england", "Kingdom of England", "English", "kingdom"),
  faction("scotland", "Kingdom of Scotland", "Scottish", "kingdom"),
  faction("france", "Kingdom of France", "French", "kingdom"),
  faction("spain", "Spanish Monarchy", "Spanish", "monarchy"),
  faction("portugal", "Kingdom of Portugal", "Portuguese", "kingdom"),
  faction("habsburg", "Habsburg Monarchy", "Habsburg", "monarchy"),
  faction("hungary", "Kingdom of Hungary", "Hungarian", "kingdom"),
  faction("ottoman", "Ottoman Empire", "Ottoman", "empire"),
  faction("venice", "Republic of Venice", "Venetian", "republic"),
  faction("genoa", "Republic of Genoa", "Genoese", "republic"),
  faction("papal-states", "Papal States", "Papal", "state"),
  faction("ming", "Ming Empire", "Ming", "empire"),
  faction("aztec", "Aztec Empire", "Aztec", "empire"),
  faction("inca", "Inca Empire", "Inca", "empire"),
  faction("safavid", "Safavid Empire", "Safavid", "empire"),
  faction("muscovy", "Grand Duchy of Muscovy", "Muscovite", "duchy"),
  faction("poland-lithuania", "Polish-Lithuanian Union", "Polish-Lithuanian", "union"),
  faction("denmark-norway", "Denmark-Norway", "Dano-Norwegian", "union"),
  faction("songhai", "Songhai Empire", "Songhai", "empire"),
  faction("morocco", "Wattasid Morocco", "Moroccan", "sultanate"),
  faction("ethiopia", "Ethiopian Empire", "Ethiopian", "empire"),
  faction("vijayanagara", "Vijayanagara Empire", "Vijayanagaran", "empire"),
  faction("gujarat", "Gujarat Sultanate", "Gujarati", "sultanate"),
  faction("bengal", "Bengal Sultanate", "Bengali", "sultanate"),
  faction("delhi", "Delhi Sultanate", "Delhi", "sultanate"),
  faction("ayutthaya", "Ayutthaya Kingdom", "Ayutthayan", "kingdom"),
  faction("japan", "Ashikaga Japan", "Japanese", "shogunate"),
  faction("joseon", "Joseon", "Joseon", "kingdom")
]);

const FACTIONS_BY_ID = new Map(FACTIONS.map((item) => [item.id, item]));

if (FACTIONS_BY_ID.size !== FACTIONS.length) {
  throw new Error("Faction registry contains duplicate ids");
}

const ALLIANCES_1522 = Object.freeze([
  ["england", "spain"],
  ["england", "habsburg"],
  ["spain", "habsburg"],
  ["france", "scotland"]
]);

const WARS_1522 = Object.freeze([
  ["england", "france"],
  ["spain", "france"],
  ["habsburg", "france"],
  ["ottoman", "habsburg"],
  ["ottoman", "hungary"],
  ["ottoman", "safavid"],
  ["ottoman", "portugal"],
  ["portugal", "ming"],
  ["portugal", "gujarat"],
  ["spain", "aztec"],
  ["muscovy", "poland-lithuania"]
]);

export const DIPLOMACY_MATRIX_1522 = buildDiplomacyMatrix();

const CITY_FACTION_OVERRIDES = uniqueMap([
  cityRule("London", "United Kingdom", "england"),
  cityRule("Edinburgh", "United Kingdom", "scotland"),
  cityRule("Avignon", "France", NEUTRAL_FACTION_ID),
  cityRule("Metz", "France", NEUTRAL_FACTION_ID),

  cityRule("Venice", "Italy", "venice"),
  cityRule("Verona", "Italy", "venice"),
  cityRule("Genova", "Italy", "genoa"),
  cityRule("Rome", "Italy", "papal-states"),
  cityRule("Bologna", "Italy", "papal-states"),
  cityRule("Milan", "Italy", "habsburg"),
  cityRule("Pavia", "Italy", "habsburg"),
  cityRule("Cremona", "Italy", "habsburg"),
  cityRule("Naples", "Italy", "spain"),
  cityRule("Capua", "Italy", "spain"),
  cityRule("Palermo", "Italy", "spain"),
  cityRule("Taranto", "Italy", "spain"),
  cityRule("Crotone", "Italy", "spain"),
  cityRule("Messina", "Italy", "spain"),
  cityRule("Olbia", "Italy", "spain"),

  cityRule("Kerkira", "Greece", "venice"),
  cityRule("Gortyn", "Greece", "venice"),
  cityRule("Knossos", "Greece", "venice"),
  cityRule("Akrotiri", "Greece", "venice"),
  cityRule("Iraklion", "Greece", "venice"),

  cityRule("Goa", "India", "portugal"),
  cityRule("Hormuz", "Iran", "portugal"),
  cityRule("Malacca", "Malaysia", "portugal"),

  cityRule("Lhasa", "China", NEUTRAL_FACTION_ID),
  cityRule("Kashi", "China", NEUTRAL_FACTION_ID),
  cityRule("Tsinkiang", "China", NEUTRAL_FACTION_ID),
  cityRule("Turpan", "China", NEUTRAL_FACTION_ID),

  cityRule("Mexico City", "Mexico", "aztec"),
  cityRule("Texcoco", "Mexico", "aztec"),
  cityRule("Tenayuca", "Mexico", "aztec"),
  cityRule("Cholula", "Mexico", "aztec"),

  cityRule("Baghdad", "Iraq", "safavid"),

  cityRule("Sarai", "Russian Federation", NEUTRAL_FACTION_ID),
  cityRule("Astrakhan", "Russian Federation", NEUTRAL_FACTION_ID),
  cityRule("Kazan", "Russian Federation", NEUTRAL_FACTION_ID),
  cityRule("Feodosia", "Russian Federation", "ottoman"),
  cityRule("Sudak", "Russian Federation", "ottoman"),

  cityRule("Visby", "Sweden", "denmark-norway"),

  ...cityRulesForCountry("India", [
    "Vijayanagar", "Manyakheta", "Thanjavur", "Badami", "Chittoor", "Kanchipuram",
    "Kolar", "Madurai", "Halebidu", "Rajahmundry"
  ], "vijayanagara"),
  ...cityRulesForCountry("India", [
    "Ahmedabad", "Cambay", "Patan", "Somnath", "Dholavira"
  ], "gujarat"),
  ...cityRulesForCountry("India", [
    "Gauda", "Patna", "Pandua", "Kamarupa", "Kamtapur", "Nadiya", "Tamralipti"
  ], "bengal"),
  ...cityRulesForCountry("India", [
    "Delhi", "Kanauji", "Jaunpur", "Lahore", "Multan"
  ], "delhi"),
  cityRule("Lahore", "Pakistan", "delhi"),
  cityRule("Multan", "Pakistan", "delhi"),

  cityRule("Ayutthaya", "Thailand", "ayutthaya"),
  cityRule("Sukhothai", "Thailand", "ayutthaya")
], "city faction overrides");

const COUNTRY_FACTIONS = uniqueMap([
  ["France", "france"],
  ["Spain", "spain"],
  ["Portugal", "portugal"],
  ["Austria", "habsburg"],
  ["Belgium", "habsburg"],
  ["Germany", "habsburg"],
  ["Netherlands", "habsburg"],
  ["Hungary", "hungary"],
  ["Turkey", "ottoman"],
  ["Egypt", "ottoman"],
  ["Greece", "ottoman"],
  ["Bulgaria", "ottoman"],
  ["Serbia", "ottoman"],
  ["Albania", "ottoman"],
  ["Lebanon", "ottoman"],
  ["Syrian Arab Republic", "ottoman"],
  ["Cyprus", "venice"],
  ["China", "ming"],
  ["Peru", "inca"],
  ["Iran", "safavid"],
  ["Russian Federation", "muscovy"],
  ["Poland", "poland-lithuania"],
  ["Lithuania", "poland-lithuania"],
  ["Denmark", "denmark-norway"],
  ["Norway", "denmark-norway"],
  ["Mali", "songhai"],
  ["Morocco", "morocco"],
  ["Ethiopia", "ethiopia"],
  ["Japan", "japan"],
  ["Republic of Korea", "joseon"],
  ["Dem. People's Republic of Korea", "joseon"],
  ["Cuba", "spain"],
  ["Dominican Republic", "spain"],
  ["Panama", "spain"],
  ["Puerto Rico", "spain"]
], "country faction assignments");

validateCityFactionRules();

export function factionById(factionId) {
  const faction = FACTIONS_BY_ID.get(factionId);
  if (!faction) throw new Error(`Unknown faction: ${factionId}`);
  return faction;
}

export function assertFactionId(factionId) {
  factionById(factionId);
  return factionId;
}

export function diplomacyBetween(factionAId, factionBId) {
  assertFactionId(factionAId);
  assertFactionId(factionBId);
  const relation = DIPLOMACY_MATRIX_1522[factionAId]?.[factionBId];
  if (!DIPLOMACY_RELATIONS.has(relation)) {
    throw new Error(`Missing 1522 diplomacy relation: ${factionAId} / ${factionBId}`);
  }
  return relation;
}

export function factionIdForCity1522(city) {
  if (!city || typeof city !== "object") throw new Error("City faction assignment requires a city");
  if (!nonEmptyString(city.city) || !nonEmptyString(city.country)) {
    throw new Error("City faction assignment requires city and country names");
  }
  const override = CITY_FACTION_OVERRIDES.get(cityKey(city.city, city.country));
  if (override) return override;
  return COUNTRY_FACTIONS.get(city.country.trim()) || NEUTRAL_FACTION_ID;
}

function faction(id, name, adjective, kind) {
  return Object.freeze({ id, name, adjective, kind });
}

function buildDiplomacyMatrix() {
  const matrix = Object.fromEntries(FACTIONS.map((factionA) => [
    factionA.id,
    Object.fromEntries(FACTIONS.map((factionB) => [
      factionB.id,
      factionA.id === factionB.id ? DIPLOMACY_ALLY : DIPLOMACY_NEUTRAL
    ]))
  ]));

  for (const faction of FACTIONS) {
    if (faction.id !== PIRATE_FACTION_ID) {
      setSymmetricRelation(matrix, PIRATE_FACTION_ID, faction.id, DIPLOMACY_WAR);
    }
  }
  for (const [factionAId, factionBId] of ALLIANCES_1522) {
    setSymmetricRelation(matrix, factionAId, factionBId, DIPLOMACY_ALLY);
  }
  for (const [factionAId, factionBId] of WARS_1522) {
    setSymmetricRelation(matrix, factionAId, factionBId, DIPLOMACY_WAR);
  }

  return Object.freeze(Object.fromEntries(
    Object.entries(matrix).map(([factionId, row]) => [factionId, Object.freeze(row)])
  ));
}

function setSymmetricRelation(matrix, factionAId, factionBId, relation) {
  assertKnownFactionForBuild(factionAId);
  assertKnownFactionForBuild(factionBId);
  if (!DIPLOMACY_RELATIONS.has(relation)) throw new Error(`Invalid diplomacy relation: ${relation}`);
  matrix[factionAId][factionBId] = relation;
  matrix[factionBId][factionAId] = relation;
}

function assertKnownFactionForBuild(factionId) {
  if (!FACTIONS_BY_ID.has(factionId)) throw new Error(`Diplomacy data references unknown faction: ${factionId}`);
}

function cityRule(city, country, factionId) {
  return [cityKey(city, country), factionId];
}

function cityRulesForCountry(country, cities, factionId) {
  return cities.map((city) => cityRule(city, country, factionId));
}

function cityKey(city, country) {
  return `${city.trim().toLowerCase()}|${country.trim().toLowerCase()}`;
}

function uniqueMap(entries, label) {
  const map = new Map(entries);
  if (map.size !== entries.length) throw new Error(`${label} contain duplicate keys`);
  return map;
}

function validateCityFactionRules() {
  for (const factionId of CITY_FACTION_OVERRIDES.values()) assertFactionId(factionId);
  for (const factionId of COUNTRY_FACTIONS.values()) assertFactionId(factionId);
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}
