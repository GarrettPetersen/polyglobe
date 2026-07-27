export const NEUTRAL_FACTION_ID = "neutral";
export const PIRATE_FACTION_ID = "pirate";

export const DIPLOMACY_ALLY = "ally";
export const DIPLOMACY_FRIENDLY = "friendly";
export const DIPLOMACY_NEUTRAL = "neutral";
export const DIPLOMACY_HOSTILE = "hostile";
export const DIPLOMACY_WAR = "war";

const DIPLOMACY_RELATIONS = new Set([
  DIPLOMACY_ALLY,
  DIPLOMACY_FRIENDLY,
  DIPLOMACY_NEUTRAL,
  DIPLOMACY_HOSTILE,
  DIPLOMACY_WAR
]);

export const FACTIONS = Object.freeze([
  faction(NEUTRAL_FACTION_ID, "Neutral", "Neutral", "Neutral", "neutral"),
  faction(PIRATE_FACTION_ID, "Pirates", "Pirates", "Pirate", "special"),
  faction("england", "Kingdom of England", "England", "English", "kingdom"),
  faction("scotland", "Kingdom of Scotland", "Scotland", "Scottish", "kingdom"),
  faction("france", "Kingdom of France", "France", "French", "kingdom"),
  faction("spain", "Spanish Monarchy", "Spain", "Spanish", "monarchy"),
  faction("portugal", "Kingdom of Portugal", "Portugal", "Portuguese", "kingdom"),
  faction("hormuz", "Kingdom of Hormuz", "Hormuz", "Hormuzi", "kingdom"),
  faction("habsburg", "Habsburg Monarchy", "Habsburg Monarchy", "Habsburg", "monarchy", "the"),
  faction("hungary", "Kingdom of Hungary", "Hungary", "Hungarian", "kingdom"),
  faction("ottoman", "Ottoman Empire", "Ottoman Empire", "Ottoman", "empire", "the"),
  faction("venice", "Republic of Venice", "Venice", "Venetian", "republic"),
  faction("genoa", "Republic of Genoa", "Genoa", "Genoese", "republic"),
  faction("papal-states", "Papal States", "Papal States", "Papal", "state", "the"),
  faction("hospitallers", "Knights Hospitaller", "Knights Hospitaller", "Hospitaller", "order", "the"),
  faction("ming", "Ming Empire", "Ming China", "Ming", "empire"),
  faction("inca", "Inca Empire", "Tawantinsuyu", "Inca", "empire"),
  faction("safavid", "Safavid Empire", "Safavid Persia", "Safavid", "empire"),
  faction("muscovy", "Grand Duchy of Muscovy", "Muscovy", "Muscovite", "duchy"),
  faction("crimea", "Crimean Khanate", "Crimea", "Crimean", "khanate"),
  faction("poland-lithuania", "Polish-Lithuanian Union", "Poland-Lithuania", "Polish-Lithuanian", "union"),
  faction("sweden", "Kingdom of Sweden", "Sweden", "Swedish", "kingdom"),
  faction("denmark-norway", "Denmark-Norway", "Denmark-Norway", "Dano-Norwegian", "union"),
  faction("songhai", "Songhai Empire", "Songhai", "Songhai", "empire"),
  faction("morocco", "Wattasid Morocco", "Morocco", "Moroccan", "sultanate"),
  faction("ethiopia", "Ethiopian Empire", "Ethiopia", "Ethiopian", "empire"),
  faction("vijayanagara", "Vijayanagara Empire", "Vijayanagara", "Vijayanagaran", "empire"),
  faction("gujarat", "Gujarat Sultanate", "Gujarat", "Gujarati", "sultanate"),
  faction("bengal", "Bengal Sultanate", "Bengal", "Bengali", "sultanate"),
  faction("delhi", "Delhi Sultanate", "Delhi", "Delhi", "sultanate"),
  faction("ayutthaya", "Ayutthaya Kingdom", "Ayutthaya", "Ayutthayan", "kingdom"),
  faction("ternate", "Sultanate of Ternate", "Ternate", "Ternatan", "sultanate"),
  faction("tidore", "Sultanate of Tidore", "Tidore", "Tidorese", "sultanate"),
  faction("japan", "Ashikaga Japan", "Japan", "Japanese", "shogunate"),
  faction("joseon", "Joseon", "Joseon", "Joseon", "kingdom")
]);

const FACTIONS_BY_ID = new Map(FACTIONS.map((item) => [item.id, item]));
const RETIRED_FACTION_SUCCESSORS_1522 = Object.freeze({ aztec: "spain" });

if (FACTIONS_BY_ID.size !== FACTIONS.length) {
  throw new Error("Faction registry contains duplicate ids");
}

export const FACTION_CAPITALS_1522 = Object.freeze([
  capital("england", "London", "United Kingdom"),
  capital("scotland", "Edinburgh", "United Kingdom"),
  capital("france", "Paris", "France"),
  capital("spain", "Seville", "Spain"),
  capital("portugal", "Lisbon", "Portugal"),
  capital("hormuz", "Hormuz", "Iran"),
  capital("habsburg", "Gent", "Belgium"),
  capital("hungary", "Budapest", "Hungary"),
  capital("ottoman", "Istanbul", "Turkey"),
  capital("venice", "Venice", "Italy"),
  capital("genoa", "Genova", "Italy"),
  capital("papal-states", "Rome", "Italy"),
  capital("hospitallers", "Rhodes", "Greece"),
  capital("ming", "Beijing", "China"),
  capital("inca", "Cuzco", "Peru"),
  capital("safavid", "Siraf", "Iran"),
  capital("muscovy", "Kholmogory", "Russian Federation", {
    lat: 64.225,
    lon: 41.65,
    population: 7000
  }),
  capital("crimea", "Bakhchiserai", "Ukraine"),
  capital("poland-lithuania", "Krakow", "Poland"),
  capital("sweden", "Soderkoping", "Sweden"),
  capital("denmark-norway", "Roskilde", "Denmark"),
  capital("songhai", "Gao", "Mali"),
  capital("morocco", "Azemmour", "Morocco"),
  capital("ethiopia", "Massawa", "Ethiopia", {
    lat: 15.6097,
    lon: 39.45,
    population: 8000
  }),
  capital("vijayanagara", "Rajahmundry", "India"),
  capital("gujarat", "Cambay", "India"),
  capital("bengal", "Gauda", "India"),
  capital("delhi", "Delhi", "India"),
  capital("ayutthaya", "Ayutthaya", "Thailand"),
  capital("ternate", "Ternate", "Indonesia"),
  capital("tidore", "Tidore", "Indonesia"),
  capital("japan", "Kyoto", "Japan"),
  capital("joseon", "Seoul", "Republic of Korea")
]);

const FACTION_CAPITALS_BY_ID = new Map(FACTION_CAPITALS_1522.map((item) => [item.factionId, item]));
const FACTION_CAPITALS_BY_CITY_KEY = new Map(FACTION_CAPITALS_1522.map((item) => [
  cityKey(item.city, item.country),
  item
]));

const ALLIANCES_1522 = Object.freeze([
  ["england", "spain"],
  ["england", "habsburg"],
  ["spain", "habsburg"],
  ["france", "scotland"],
  ["france", "venice"],
  ["habsburg", "hungary"],
  ["spain", "hungary"],
  ["habsburg", "papal-states"],
  ["spain", "papal-states"],
  ["ming", "joseon"]
]);

const FRIENDSHIPS_1522 = Object.freeze([
  ["england", "portugal"],
  ["spain", "portugal"],
  ["habsburg", "portugal"],
  ["portugal", "hormuz"],
  ["france", "genoa"],
  ["habsburg", "denmark-norway"],
  ["spain", "denmark-norway"],
  ["habsburg", "poland-lithuania"],
  ["spain", "poland-lithuania"],
  ["hungary", "poland-lithuania"],
  ["hungary", "papal-states"],
  ["hospitallers", "papal-states"],
  ["hospitallers", "spain"],
  ["hospitallers", "habsburg"],
  ["venice", "safavid"],
  ["papal-states", "portugal"],
  ["papal-states", "safavid"],
  ["portugal", "safavid"],
  ["portugal", "ethiopia"],
  ["portugal", "vijayanagara"],
  ["portugal", "ayutthaya"],
  ["ottoman", "gujarat"],
  ["ottoman", "crimea"],
  ["ming", "ayutthaya"],
  ["spain", "tidore"],
  ["habsburg", "tidore"],
  ["japan", "joseon"],
  ["bengal", "ayutthaya"]
]);

const HOSTILITIES_1522 = Object.freeze([
  ["ottoman", "habsburg"],
  ["ottoman", "spain"],
  ["ottoman", "papal-states"],
  ["venice", "genoa"],
  ["spain", "morocco"],
  ["habsburg", "morocco"],
  ["sweden", "habsburg"],
  ["ming", "japan"],
  ["bengal", "delhi"],
  ["ternate", "spain"],
  ["ternate", "habsburg"],
  ["ternate", "tidore"],
  ["portugal", "tidore"]
]);

const WARS_1522 = Object.freeze([
  ["england", "france"],
  ["spain", "france"],
  ["habsburg", "france"],
  ["papal-states", "france"],
  ["habsburg", "venice"],
  ["spain", "venice"],
  ["papal-states", "venice"],
  ["ottoman", "hungary"],
  ["ottoman", "safavid"],
  ["ottoman", "portugal"],
  ["ottoman", "hospitallers"],
  ["portugal", "ming"],
  ["portugal", "gujarat"],
  ["portugal", "morocco"],
  ["muscovy", "poland-lithuania"],
  ["sweden", "denmark-norway"]
]);

export const DIPLOMACY_MATRIX_1522 = buildDiplomacyMatrix();

const CITY_FACTION_OVERRIDES = uniqueMap([
  cityRule("London", "United Kingdom", "england"),
  cityRule("Edinburgh", "United Kingdom", "scotland"),
  cityRule("Glasgow", "United Kingdom", "scotland"),
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
  cityRule("Rhodes", "Greece", "hospitallers"),

  cityRule("Goa", "India", "portugal"),
  cityRule("Hormuz", "Iran", "hormuz"),
  cityRule("Malacca", "Malaysia", "portugal"),
  cityRule("Muscat", "Oman", "hormuz"),
  cityRule("Sofala", "Mozambique", "portugal"),
  cityRule("Mozambique Island", "Mozambique", "portugal"),

  cityRule("Lhasa", "China", NEUTRAL_FACTION_ID),
  cityRule("Kashi", "China", NEUTRAL_FACTION_ID),
  cityRule("Tsinkiang", "China", NEUTRAL_FACTION_ID),
  cityRule("Turpan", "China", NEUTRAL_FACTION_ID),

  cityRule("Mexico City", "Mexico", "spain"),
  cityRule("Texcoco", "Mexico", "spain"),
  cityRule("Tenayuca", "Mexico", "spain"),
  cityRule("Cholula", "Mexico", "spain"),
  cityRule("Zempoala", "Mexico", "spain"),
  cityRule("Veracruz", "Mexico", "spain"),

  cityRule("Baghdad", "Iraq", "safavid"),
  cityRule("Jeddah", "Saudi Arabia", "ottoman"),

  cityRule("Sarai", "Russian Federation", NEUTRAL_FACTION_ID),
  cityRule("Astrakhan", "Russian Federation", NEUTRAL_FACTION_ID),
  cityRule("Kazan", "Russian Federation", NEUTRAL_FACTION_ID),
  cityRule("Feodosia", "Russian Federation", "ottoman"),
  cityRule("Sudak", "Russian Federation", "ottoman"),
  cityRule("Bakhchiserai", "Ukraine", "crimea"),

  cityRule("Stockholm", "Sweden", "denmark-norway"),
  cityRule("Kalmar", "Sweden", "denmark-norway"),
  cityRule("Visby", "Sweden", "denmark-norway"),
  cityRule("Turku", "Finland", "denmark-norway"),

  ...cityRulesForCountry("India", [
    "Vijayanagar", "Manyakheta", "Thanjavur", "Badami", "Chittoor", "Kanchipuram",
    "Kolar", "Madurai", "Halebidu", "Rajahmundry"
  ], "vijayanagara"),
  ...cityRulesForCountry("India", [
    "Ahmedabad", "Cambay", "Diu", "Patan", "Somnath", "Dholavira", "Surat"
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
  cityRule("Sukhothai", "Thailand", "ayutthaya"),

  cityRule("Ternate", "Indonesia", "ternate"),
  cityRule("Hitu Village", "Indonesia", "ternate"),
  cityRule("Buru Village", "Indonesia", "ternate"),
  cityRule("Tidore", "Indonesia", "tidore"),
  cityRule("Makian Village", "Indonesia", "tidore"),
  cityRule("Gane Village", "Indonesia", "tidore")
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
  ["Sweden", "sweden"],
  ["Denmark", "denmark-norway"],
  ["Norway", "denmark-norway"],
  ["Iceland", "denmark-norway"],
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
validateFactionCapitalRules();

export function factionById(factionId) {
  const faction = FACTIONS_BY_ID.get(factionId);
  if (!faction) throw new Error(`Unknown faction: ${factionId}`);
  return faction;
}

export function factionNounPhrase(factionId, { sentenceStart = false } = {}) {
  const faction = factionById(factionId);
  const phrase = faction.article ? `${faction.article} ${faction.shortName}` : faction.shortName;
  return sentenceStart ? phrase.charAt(0).toUpperCase() + phrase.slice(1) : phrase;
}

export function migrateFactionIdTo1522(factionId) {
  const successorId = RETIRED_FACTION_SUCCESSORS_1522[factionId];
  return successorId || assertFactionId(factionId);
}

export function factionHasFlag(factionId) {
  factionById(factionId);
  return factionId !== NEUTRAL_FACTION_ID;
}

export function factionCapitalForId(factionId) {
  assertFactionId(factionId);
  const capitalSpec = FACTION_CAPITALS_BY_ID.get(factionId);
  if (!capitalSpec) throw new Error(`Faction has no 1522 water-accessible capital: ${factionId}`);
  return capitalSpec;
}

export function factionCapitalForCity(city) {
  if (!city || typeof city !== "object") throw new Error("Capital lookup requires a city");
  return FACTION_CAPITALS_BY_CITY_KEY.get(cityKey(city.city, city.country)) || null;
}

export function factionCapitalCityRecords1522() {
  return FACTION_CAPITALS_1522.filter((capitalSpec) => (
    Number.isFinite(capitalSpec.lat) &&
    Number.isFinite(capitalSpec.lon) &&
    Number.isInteger(capitalSpec.population)
  ));
}

export function markFactionCapitalsOnPorts(ports) {
  if (!Array.isArray(ports)) throw new Error("Faction capitals require a list of water-accessible ports");
  const portsByCapitalKey = new Map(ports.map((port) => [cityKey(port.city, port.country), port]));
  const capitalPorts = new Map();

  for (const capitalSpec of FACTION_CAPITALS_1522) {
    const port = portsByCapitalKey.get(cityKey(capitalSpec.city, capitalSpec.country));
    if (!port) {
      throw new Error(
        `${capitalSpec.factionId} capital ${capitalSpec.city}, ${capitalSpec.country} is not water accessible`
      );
    }
    if (port.factionId !== capitalSpec.factionId) {
      throw new Error(
        `${capitalSpec.city}, ${capitalSpec.country} belongs to ${port.factionId}, not ${capitalSpec.factionId}`
      );
    }
    port.isFactionCapital = true;
    port.capitalOfFactionId = capitalSpec.factionId;
    capitalPorts.set(capitalSpec.factionId, port);
  }

  return capitalPorts;
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

function faction(id, name, shortName, adjective, kind, article = null) {
  for (const [label, value] of Object.entries({ id, name, shortName, adjective, kind })) {
    if (!nonEmptyString(value)) throw new Error(`Faction has no ${label}: ${id || "missing"}`);
  }
  if (article !== null && article !== "the") throw new Error(`Invalid faction article: ${id}=${article}`);
  return Object.freeze({ id, name, shortName, adjective, kind, article });
}

function capital(factionId, city, country, details = {}) {
  return Object.freeze({
    factionId,
    city,
    country,
    lat: details.lat,
    lon: details.lon,
    population: details.population
  });
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
  for (const [factionAId, factionBId] of FRIENDSHIPS_1522) {
    setSymmetricRelation(matrix, factionAId, factionBId, DIPLOMACY_FRIENDLY);
  }
  for (const [factionAId, factionBId] of HOSTILITIES_1522) {
    setSymmetricRelation(matrix, factionAId, factionBId, DIPLOMACY_HOSTILE);
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

function validateFactionCapitalRules() {
  const expectedFactionIds = FACTIONS
    .filter((faction) => faction.id !== NEUTRAL_FACTION_ID && faction.id !== PIRATE_FACTION_ID)
    .map((faction) => faction.id)
    .sort();
  const capitalFactionIds = FACTION_CAPITALS_1522.map((capitalSpec) => capitalSpec.factionId).sort();
  if (JSON.stringify(capitalFactionIds) !== JSON.stringify(expectedFactionIds)) {
    throw new Error("Faction capital registry must cover every non-special faction exactly once");
  }
  if (FACTION_CAPITALS_BY_ID.size !== FACTION_CAPITALS_1522.length) {
    throw new Error("Faction capital registry contains duplicate faction ids");
  }
  if (FACTION_CAPITALS_BY_CITY_KEY.size !== FACTION_CAPITALS_1522.length) {
    throw new Error("Faction capital registry contains duplicate city keys");
  }
  for (const capitalSpec of FACTION_CAPITALS_1522) {
    assertFactionId(capitalSpec.factionId);
    if (!nonEmptyString(capitalSpec.city) || !nonEmptyString(capitalSpec.country)) {
      throw new Error(`Invalid faction capital city for ${capitalSpec.factionId}`);
    }
    if (
      capitalSpec.lat !== undefined &&
      (!Number.isFinite(capitalSpec.lat) || !Number.isFinite(capitalSpec.lon) ||
        !Number.isInteger(capitalSpec.population) || capitalSpec.population <= 0)
    ) {
      throw new Error(`Invalid required capital city record for ${capitalSpec.factionId}`);
    }
  }
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}
