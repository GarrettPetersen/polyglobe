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
  faction("burgundian-netherlands", "Burgundian Netherlands", "Burgundian Netherlands", "Netherlandish", "composite-monarchy", "the"),
  faction("habsburg", "Austrian Habsburg Lands", "Austrian Lands", "Austrian", "composite-monarchy", "the"),
  faction("hungary", "Kingdom of Hungary", "Hungary", "Hungarian", "kingdom"),
  faction("bohemia", "Kingdom of Bohemia", "Bohemia", "Bohemian", "kingdom"),
  faction("mainz", "Electorate of Mainz", "Mainz", "Mainz", "ecclesiastical-electorate"),
  faction("cologne-electorate", "Electorate of Cologne", "Cologne Electorate", "Electoral Cologne", "ecclesiastical-electorate", "the"),
  faction("trier", "Electorate of Trier", "Trier", "Trier", "ecclesiastical-electorate"),
  faction("palatinate", "Electoral Palatinate", "Palatinate", "Palatine", "electorate", "the"),
  faction("electoral-saxony", "Electorate of Saxony", "Electoral Saxony", "Electoral Saxon", "electorate"),
  faction("brandenburg", "Margraviate of Brandenburg", "Brandenburg", "Brandenburg", "electorate"),
  faction("ducal-saxony", "Albertine Duchy of Saxony", "Ducal Saxony", "Ducal Saxon", "duchy"),
  faction("liege", "Prince-Bishopric of Liege", "Liege", "Liege", "prince-bishopric"),
  faction("magdeburg", "Prince-Archbishopric of Magdeburg", "Magdeburg", "Magdeburg", "prince-archbishopric"),
  faction("utrecht", "Prince-Bishopric of Utrecht", "Utrecht", "Utrecht", "prince-bishopric"),
  faction("cleves-mark", "United Duchies of Julich-Cleves-Berg", "Cleves-Mark", "Cleves-Mark", "duchy"),
  faction("calenberg", "Principality of Calenberg", "Calenberg", "Calenberg", "principality"),
  faction("augsburg", "Free Imperial City of Augsburg", "Augsburg", "Augsburg", "free-imperial-city"),
  faction("cologne", "Free Imperial City of Cologne", "Cologne", "Cologne", "free-imperial-city"),
  faction("nuremberg", "Free Imperial City of Nuremberg", "Nuremberg", "Nuremberg", "free-imperial-city"),
  faction("lubeck", "Free Imperial City of Lubeck", "Lubeck", "Lubeck", "free-imperial-city"),
  faction("hamburg", "Free Imperial City of Hamburg", "Hamburg", "Hamburg", "free-imperial-city"),
  faction("bremen", "Free Imperial City of Bremen", "Bremen", "Bremen", "free-imperial-city"),
  faction("speyer", "Free Imperial City of Speyer", "Speyer", "Speyer", "free-imperial-city"),
  faction("regensburg", "Free Imperial City of Regensburg", "Regensburg", "Regensburg", "free-imperial-city"),
  faction("worms", "Free Imperial City of Worms", "Worms", "Worms", "free-imperial-city"),
  faction("metz", "Free Imperial City of Metz", "Metz", "Metz", "free-imperial-city"),
  faction("ottoman", "Ottoman Empire", "Ottoman Empire", "Ottoman", "empire", "the"),
  faction("venice", "Republic of Venice", "Venice", "Venetian", "republic"),
  faction("genoa", "Republic of Genoa", "Genoa", "Genoese", "republic"),
  faction("florence", "Republic of Florence", "Florence", "Florentine", "republic"),
  faction("papal-states", "Papal States", "Papal States", "Papal", "state", "the"),
  faction("hospitallers", "Knights Hospitaller", "Knights Hospitaller", "Hospitaller", "order", "the"),
  faction("ming", "Ming Empire", "Ming China", "Ming", "empire"),
  faction("inca", "Inca Empire", "Tawantinsuyu", "Inca", "empire"),
  faction("safavid", "Safavid Empire", "Safavid Persia", "Safavid", "empire"),
  faction("muscovy", "Grand Duchy of Muscovy", "Muscovy", "Muscovite", "duchy"),
  faction("kazan", "Kazan Khanate", "Kazan", "Kazan Tatar", "khanate", "the"),
  faction("crimea", "Crimean Khanate", "Crimea", "Crimean", "khanate"),
  faction("wallachia", "Principality of Wallachia", "Wallachia", "Wallachian", "principality"),
  faction("moldavia", "Principality of Moldavia", "Moldavia", "Moldavian", "principality"),
  faction("ragusa", "Republic of Ragusa", "Ragusa", "Ragusan", "republic"),
  faction("hejaz", "Sharifate of Mecca", "Hejaz", "Hejaz", "sharifate", "the"),
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
  faction("mughal", "Mughal Empire", "Mughal Empire", "Mughal", "empire", "the", {
    emergent: true
  }),
  faction("ayutthaya", "Ayutthaya Kingdom", "Ayutthaya", "Ayutthayan", "kingdom"),
  faction("ternate", "Sultanate of Ternate", "Ternate", "Ternatan", "sultanate"),
  faction("tidore", "Sultanate of Tidore", "Tidore", "Tidorese", "sultanate"),
  faction("japan", "Ashikaga Shogunate", "Japan", "Japanese", "shogunate"),
  faction("hosokawa", "Hosokawa House", "Hosokawa", "Hosokawa", "daimyo"),
  faction("ouchi", "Ouchi House", "Ouchi", "Ouchi", "daimyo"),
  faction("shimazu", "Shimazu House", "Shimazu", "Shimazu", "daimyo"),
  faction("so", "So House", "So", "So", "daimyo"),
  faction("shoni", "Shoni House", "Shoni", "Shoni", "daimyo"),
  faction("nagao", "Echigo Nagao House", "Nagao", "Nagao", "daimyo"),
  faction("ando", "Ando House", "Ando", "Ando", "daimyo"),
  faction("kakizaki", "Kakizaki House", "Kakizaki", "Kakizaki", "daimyo"),
  faction("ryukyu", "Kingdom of Ryukyu", "Ryukyu", "Ryukyuan", "kingdom"),
  faction("ainu", "Ainu Communities", "Ainu Mosir", "Ainu", "communities"),
  faction("joseon", "Joseon", "Joseon", "Joseon", "kingdom")
]);

export const JAPANESE_POLITY_FACTION_IDS = Object.freeze([
  "japan", "hosokawa", "ouchi", "shimazu", "so", "shoni", "nagao", "ando", "kakizaki"
]);

const JAPANESE_POLITY_FACTION_ID_SET = new Set(JAPANESE_POLITY_FACTION_IDS);

export function isJapanesePolityFaction(factionId) {
  return JAPANESE_POLITY_FACTION_ID_SET.has(factionId);
}

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
  capital("burgundian-netherlands", "Gent", "Belgium"),
  capital("habsburg", "Vienna", "Austria"),
  capital("hungary", "Budapest", "Hungary"),
  capital("bohemia", "Prague", "Austria"),
  capital("mainz", "Mainz", "Germany"),
  capital("cologne-electorate", "Bonn", "Germany", {
    lat: 50.7374, lon: 7.0982, population: 8000
  }),
  capital("trier", "Trier", "Germany"),
  capital("palatinate", "Heidelberg", "Germany", {
    lat: 49.3988, lon: 8.6724, population: 12000
  }),
  capital("electoral-saxony", "Wittenberg", "Germany", {
    lat: 51.866, lon: 12.645, population: 7000
  }),
  capital("brandenburg", "Berlin", "Germany", {
    lat: 52.52, lon: 13.405, population: 12000
  }),
  capital("ducal-saxony", "Leipzig", "Germany"),
  capital("liege", "Liege", "Belgium"),
  capital("magdeburg", "Magdeburg", "Germany"),
  capital("utrecht", "Utrecht", "Netherlands"),
  capital("cleves-mark", "Soest", "Germany", { seatCity: "Cleves" }),
  capital("calenberg", "Hannover", "Germany"),
  capital("augsburg", "Augsberg", "Germany"),
  capital("cologne", "Cologne", "Germany"),
  capital("nuremberg", "Nurnberg", "Germany"),
  capital("lubeck", "Lubeck", "Germany"),
  capital("hamburg", "Hamburg", "Germany"),
  capital("bremen", "Bremen", "Germany"),
  capital("speyer", "Speyer", "Germany"),
  capital("regensburg", "Regensburg", "Germany"),
  capital("worms", "Worms", "Germany"),
  capital("metz", "Metz", "France"),
  capital("ottoman", "Istanbul", "Turkey"),
  capital("venice", "Venice", "Italy"),
  capital("genoa", "Genova", "Italy"),
  capital("florence", "Florence", "Italy"),
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
  capital("kazan", "Kazan", "Russian Federation"),
  capital("crimea", "Bakhchiserai", "Ukraine"),
  capital("wallachia", "Braila", "Romania", { seatCity: "Targoviste" }),
  capital("moldavia", "Galati", "Romania", { seatCity: "Suceava" }),
  capital("ragusa", "Ragusa", "Croatia"),
  capital("hejaz", "Jeddah", "Saudi Arabia", { seatCity: "Mecca" }),
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
  capital("delhi", "Agra", "India"),
  capital("ayutthaya", "Ayutthaya", "Thailand"),
  capital("ternate", "Ternate", "Indonesia"),
  capital("tidore", "Tidore", "Indonesia"),
  capital("japan", "Kyoto", "Japan"),
  capital("hosokawa", "Sakai", "Japan"),
  capital("ouchi", "Yamaguchi", "Japan"),
  capital("shimazu", "Kagoshima", "Japan"),
  capital("so", "Tsushima Fuchu", "Japan"),
  capital("shoni", "Nagasaki", "Japan"),
  capital("nagao", "Naoetsu", "Japan", { seatCity: "Kasugayama" }),
  capital("ando", "Tsuchizaki Minato", "Japan", { seatCity: "Hiyama" }),
  capital("kakizaki", "Kaminokuni", "Japan"),
  capital("ryukyu", "Naha", "Japan", { seatCity: "Shuri" }),
  capital("ainu", "Akkeshi Kotan", "Japan"),
  capital("joseon", "Seoul", "Republic of Korea")
]);

const FACTION_CAPITALS_BY_ID = new Map(FACTION_CAPITALS_1522.map((item) => [item.factionId, item]));
const FACTION_CAPITALS_BY_CITY_KEY = new Map(FACTION_CAPITALS_1522.map((item) => [
  cityKey(item.city, item.country),
  item
]));

const ALLIANCES_1522 = Object.freeze([
  ["england", "spain"],
  ["england", "burgundian-netherlands"],
  ["england", "habsburg"],
  ["spain", "burgundian-netherlands"],
  ["spain", "habsburg"],
  ["burgundian-netherlands", "habsburg"],
  ["france", "scotland"],
  ["france", "venice"],
  ["habsburg", "hungary"],
  ["burgundian-netherlands", "hungary"],
  ["spain", "hungary"],
  ["habsburg", "papal-states"],
  ["burgundian-netherlands", "papal-states"],
  ["spain", "papal-states"],
  ["kazan", "crimea"],
  ["ming", "joseon"]
]);

const FRIENDSHIPS_1522 = Object.freeze([
  ["england", "portugal"],
  ["spain", "portugal"],
  ["burgundian-netherlands", "portugal"],
  ["habsburg", "portugal"],
  ["portugal", "hormuz"],
  ["france", "genoa"],
  ["florence", "papal-states"],
  ["florence", "spain"],
  ["burgundian-netherlands", "denmark-norway"],
  ["habsburg", "denmark-norway"],
  ["spain", "denmark-norway"],
  ["habsburg", "poland-lithuania"],
  ["burgundian-netherlands", "poland-lithuania"],
  ["spain", "poland-lithuania"],
  ["hungary", "poland-lithuania"],
  ["hungary", "papal-states"],
  ["hospitallers", "papal-states"],
  ["hospitallers", "spain"],
  ["hospitallers", "burgundian-netherlands"],
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
  ["ottoman", "hejaz"],
  ["ottoman", "ragusa"],
  ["ming", "ayutthaya"],
  ["ming", "ryukyu"],
  ["spain", "tidore"],
  ["burgundian-netherlands", "tidore"],
  ["habsburg", "tidore"],
  ["japan", "joseon"],
  ["japan", "ryukyu"],
  ["japan", "hosokawa"],
  ["japan", "ouchi"],
  ["japan", "shimazu"],
  ["japan", "so"],
  ["japan", "shoni"],
  ["japan", "nagao"],
  ["japan", "ando"],
  ["japan", "kakizaki"],
  ["so", "joseon"],
  ["ando", "kakizaki"],
  ["bengal", "ayutthaya"]
]);

const HOSTILITIES_1522 = Object.freeze([
  ["england", "france"],
  ["ottoman", "habsburg"],
  ["ottoman", "burgundian-netherlands"],
  ["ottoman", "spain"],
  ["ottoman", "papal-states"],
  ["ottoman", "hospitallers"],
  ["ottoman", "wallachia"],
  ["venice", "genoa"],
  ["spain", "morocco"],
  ["burgundian-netherlands", "morocco"],
  ["habsburg", "morocco"],
  ["sweden", "burgundian-netherlands"],
  ["sweden", "habsburg"],
  ["ming", "japan"],
  ["japan", "ainu"],
  ["ouchi", "hosokawa"],
  ["ouchi", "shoni"],
  ["kakizaki", "ainu"],
  ["bengal", "delhi"],
  ["ternate", "spain"],
  ["ternate", "burgundian-netherlands"],
  ["ternate", "habsburg"],
  ["ternate", "tidore"],
  ["portugal", "tidore"]
]);

const WARS_1522 = Object.freeze([
  ["spain", "france"],
  ["burgundian-netherlands", "france"],
  ["habsburg", "france"],
  ["papal-states", "france"],
  ["habsburg", "venice"],
  ["burgundian-netherlands", "venice"],
  ["spain", "venice"],
  ["papal-states", "venice"],
  ["ottoman", "hungary"],
  ["ottoman", "safavid"],
  ["ottoman", "portugal"],
  ["portugal", "ming"],
  ["portugal", "gujarat"],
  ["portugal", "morocco"],
  ["muscovy", "poland-lithuania"],
  ["muscovy", "kazan"],
  ["sweden", "denmark-norway"]
]);

export const DIPLOMACY_MATRIX_1522 = buildDiplomacyMatrix();

const CITY_FACTION_OVERRIDES = uniqueMap([
  ...cityRulesForCountry("United Kingdom", [
    "London", "Norwich", "Exeter", "Bristol", "Southampton", "York", "Hull",
    "Newcastle upon Tyne"
  ], "england"),
  cityRule("Dublin", "Ireland", "england"),
  cityRule("Edinburgh", "United Kingdom", "scotland"),
  cityRule("Glasgow", "United Kingdom", "scotland"),
  cityRule("Avignon", "France", "papal-states"),
  cityRule("Metz", "France", "metz"),

  // The Empire is constitutional membership, not Habsburg sovereignty. These
  // rules use source-catalog identities; display aliases such as Augsburg and
  // Breslau never participate in ownership lookup.
  cityRule("Brugge", "Belgium", "burgundian-netherlands"),
  cityRule("Gent", "Belgium", "burgundian-netherlands"),
  cityRule("Vienna", "Austria", "habsburg"),
  cityRule("Prague", "Austria", "bohemia"),
  cityRule("Wroclaw", "Germany", "bohemia"),
  cityRule("Mainz", "Germany", "mainz"),
  cityRule("Erfurt", "Germany", "mainz"),
  cityRule("Bonn", "Germany", "cologne-electorate"),
  cityRule("Trier", "Germany", "trier"),
  cityRule("Heidelberg", "Germany", "palatinate"),
  cityRule("Wittenberg", "Germany", "electoral-saxony"),
  cityRule("Berlin", "Germany", "brandenburg"),
  cityRule("Leipzig", "Germany", "ducal-saxony"),
  cityRule("Liege", "Belgium", "liege"),
  cityRule("Magdeburg", "Germany", "magdeburg"),
  cityRule("Utrecht", "Netherlands", "utrecht"),
  cityRule("Soest", "Germany", "cleves-mark"),
  cityRule("Hannover", "Germany", "calenberg"),
  cityRule("Augsberg", "Germany", "augsburg"),
  cityRule("Cologne", "Germany", "cologne"),
  cityRule("Nurnberg", "Germany", "nuremberg"),
  cityRule("Lubeck", "Germany", "lubeck"),
  cityRule("Hamburg", "Germany", "hamburg"),
  cityRule("Bremen", "Germany", "bremen"),
  cityRule("Speyer", "Germany", "speyer"),
  cityRule("Regensburg", "Germany", "regensburg"),
  cityRule("Worms", "Germany", "worms"),

  cityRule("Venice", "Italy", "venice"),
  cityRule("Verona", "Italy", "venice"),
  cityRule("Genova", "Italy", "genoa"),
  cityRule("Florence", "Italy", "florence"),
  cityRule("Pisa", "Italy", "florence"),
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
  cityRule("Cagliari", "Italy", "spain"),
  cityRule("Syracuse", "Italy", "spain"),
  cityRule("Salerno", "Italy", "spain"),
  cityRule("Bastia", "Italy", "genoa"),

  cityRule("Ceuta", "Morocco", "portugal"),
  cityRule("Algiers", "Algeria", "ottoman"),
  cityRule("Tripoli", "Libya", "spain"),
  // Charles V did not grant Malta to the displaced Hospitallers until 1530.
  // In 1522 Birgu remains Spanish while the order still rules Rhodes.
  cityRule("Birgu", "Malta", "spain"),
  cityRule("Ragusa", "Croatia", "ragusa"),

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
  cityRule("Mozambique", "Mozambique", "portugal"),

  cityRule("Lhasa", "China", NEUTRAL_FACTION_ID),
  cityRule("Kashi", "China", NEUTRAL_FACTION_ID),
  cityRule("Turpan", "China", NEUTRAL_FACTION_ID),

  cityRule("Mexico City", "Mexico", "spain"),
  cityRule("Texcoco", "Mexico", "spain"),
  cityRule("Tenayuca", "Mexico", "spain"),
  cityRule("Cholula", "Mexico", "spain"),
  cityRule("Zempoala", "Mexico", "spain"),
  cityRule("Veracruz", "Mexico", "spain"),

  cityRule("Baghdad", "Iraq", "safavid"),
  cityRule("Jeddah", "Saudi Arabia", "hejaz"),
  cityRule("Mecca", "Saudi Arabia", "hejaz"),
  cityRule("Braila", "Romania", "wallachia"),
  cityRule("Galati", "Romania", "moldavia"),
  cityRule("Targoviste", "Romania", "wallachia"),
  cityRule("Suceava", "Romania", "moldavia"),
  cityRule("Kiev", "Ukraine", "poland-lithuania"),

  cityRule("Naha", "Japan", "ryukyu"),
  cityRule("Akkeshi Kotan", "Japan", "ainu"),
  cityRule("Sakai", "Japan", "hosokawa"),
  cityRule("Yamaguchi", "Japan", "ouchi"),
  cityRule("Fukuoka", "Japan", "ouchi"),
  cityRule("Kagoshima", "Japan", "shimazu"),
  cityRule("Tsushima Fuchu", "Japan", "so"),
  cityRule("Nagasaki", "Japan", "shoni"),
  cityRule("Naoetsu", "Japan", "nagao"),
  cityRule("Tsuchizaki Minato", "Japan", "ando"),
  cityRule("Kaminokuni", "Japan", "kakizaki"),

  cityRule("Sarai", "Russian Federation", NEUTRAL_FACTION_ID),
  cityRule("Astrakhan", "Russian Federation", NEUTRAL_FACTION_ID),
  cityRule("Kazan", "Russian Federation", "kazan"),
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
    "Agra", "Delhi", "Kanauji", "Jaunpur", "Lahore", "Multan"
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
  ["Belgium", "burgundian-netherlands"],
  ["Germany", NEUTRAL_FACTION_ID],
  ["Netherlands", "burgundian-netherlands"],
  ["Hungary", "hungary"],
  ["Turkey", "ottoman"],
  ["Egypt", "ottoman"],
  ["Greece", "ottoman"],
  ["Bulgaria", "ottoman"],
  ["Serbia", "ottoman"],
  ["Albania", "ottoman"],
  ["Israel", "ottoman"],
  ["Lebanon", "ottoman"],
  ["Syria", "ottoman"],
  ["Syria/Turkey", "ottoman"],
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
  ["Puerto Rico", "spain"],
  ["Malta", "spain"],
  ["Cape Verde", "portugal"],
  ["Sao Tome and Principe", "portugal"]
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

export function factionExistsIn1522(factionId) {
  return factionById(factionId).emergent !== true;
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

function faction(id, name, shortName, adjective, kind, article = null, details = {}) {
  for (const [label, value] of Object.entries({ id, name, shortName, adjective, kind })) {
    if (!nonEmptyString(value)) throw new Error(`Faction has no ${label}: ${id || "missing"}`);
  }
  if (article !== null && article !== "the") throw new Error(`Invalid faction article: ${id}=${article}`);
  if (details.emergent !== undefined && typeof details.emergent !== "boolean") {
    throw new Error(`Invalid emergent faction marker: ${id}`);
  }
  return Object.freeze({ id, name, shortName, adjective, kind, article, emergent: details.emergent === true });
}

function capital(factionId, city, country, details = {}) {
  return Object.freeze({
    factionId,
    city,
    country,
    lat: details.lat,
    lon: details.lon,
    population: details.population,
    seatCity: details.seatCity || city
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
    .filter((faction) => (
      faction.id !== NEUTRAL_FACTION_ID &&
      faction.id !== PIRATE_FACTION_ID &&
      faction.emergent !== true
    ))
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
