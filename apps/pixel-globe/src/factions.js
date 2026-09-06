import { cityTerritoryId, requireCityId } from "./entityIds.js";

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
export const RETIRED_FACTION_SUCCESSORS_1522 = Object.freeze({ aztec: "spain", kazan: NEUTRAL_FACTION_ID });

if (FACTIONS_BY_ID.size !== FACTIONS.length) {
  throw new Error("Faction registry contains duplicate ids");
}

export const FACTION_SEA_CAPITALS_1522 = Object.freeze([
  capital("england", "london|united kingdom", "London", "United Kingdom"),
  capital("scotland", "edinburgh|united kingdom", "Edinburgh", "United Kingdom"),
  capital("france", "paris|france", "Paris", "France"),
  capital("spain", "seville|spain", "Seville", "Spain", {
    trueCapital: Object.freeze({kind: "itinerant-court"})
  }),
  capital("portugal", "lisbon|portugal", "Lisbon", "Portugal"),
  capital("hormuz", "hormuz|iran", "Hormuz", "Iran"),
  capital("burgundian-netherlands", "gent|belgium", "Gent", "Belgium"),
  capital("habsburg", "vienna|austria", "Vienna", "Austria"),
  capital("hungary", "budapest|hungary", "Budapest", "Hungary"),
  capital("bohemia", "prague|austria", "Prague", "Austria"),
  capital("mainz", "mainz|germany", "Mainz", "Germany"),
  capital("cologne-electorate", "bonn|germany", "Bonn", "Germany", {
    lat: 50.7374, lon: 7.0982, population: 8000
  }),
  capital("trier", "trier|germany", "Trier", "Germany"),
  capital("palatinate", "heidelberg|germany", "Heidelberg", "Germany", {
    lat: 49.3988, lon: 8.6724, population: 12000
  }),
  capital("electoral-saxony", "wittenberg|germany", "Wittenberg", "Germany", {
    lat: 51.866, lon: 12.645, population: 7000
  }),
  capital("brandenburg", "berlin|germany", "Berlin", "Germany", {
    lat: 52.52, lon: 13.405, population: 12000
  }),
  capital("ducal-saxony", "dresden|germany", "Dresden", "Germany", {
    lat: 51.05, lon: 13.74, population: 6000
  }),
  capital("liege", "liege|belgium", "Liege", "Belgium"),
  capital("magdeburg", "magdeburg|germany", "Magdeburg", "Germany"),
  capital("utrecht", "utrecht|netherlands", "Utrecht", "Netherlands"),
  capital("cleves-mark", "wesel|germany", "Wesel", "Germany", {
    lat: 51.657, lon: 6.617, population: 6000,
    trueCapital: capitalReference("cleves|germany", "Cleves", "Germany")
  }),
  capital("calenberg", "hannover|germany", "Hannover", "Germany"),
  capital("augsburg", "augsberg|germany", "Augsberg", "Germany"),
  capital("cologne", "cologne|germany", "Cologne", "Germany"),
  capital("nuremberg", "nurnberg|germany", "Nurnberg", "Germany"),
  capital("lubeck", "lubeck|germany", "Lubeck", "Germany"),
  capital("hamburg", "hamburg|germany", "Hamburg", "Germany"),
  capital("bremen", "bremen|germany", "Bremen", "Germany"),
  capital("speyer", "speyer|germany", "Speyer", "Germany"),
  capital("regensburg", "regensburg|germany", "Regensburg", "Germany"),
  capital("worms", "worms|germany", "Worms", "Germany"),
  capital("metz", "metz|france", "Metz", "France"),
  capital("ottoman", "istanbul|turkey", "Istanbul", "Turkey"),
  capital("venice", "venice|italy", "Venice", "Italy"),
  capital("genoa", "genova|italy", "Genova", "Italy"),
  capital("florence", "florence|italy", "Florence", "Italy"),
  capital("papal-states", "rome|italy", "Rome", "Italy"),
  capital("hospitallers", "rhodes|greece", "Rhodes", "Greece"),
  capital("ming", "beijing|china", "Beijing", "China"),
  capital("inca", "cuzco|peru", "Cuzco", "Peru"),
  capital("safavid", "siraf|iran", "Siraf", "Iran", { trueCapital: capitalReference("tabriz|iran", "Tabriz", "Iran") }),
  capital("muscovy", "kholmogory|russian federation", "Kholmogory", "Russian Federation", {
    trueCapital: capitalReference("moscow|russian federation", "Moscow", "Russian Federation"),
    lat: 64.225,
    lon: 41.65,
    population: 7000
  }),
  // Kezlev passed from Ottoman administration to the khanate in 1485.
  // The inland court remained at Salachik, beside later Bakhchiserai.
  capital("crimea", "kezlev|ukraine", "Kezlev", "Ukraine", {
    lat: 45.198, lon: 33.37, population: 6000,
    trueCapital: capitalReference("bakhchiserai|ukraine", "Salachik", "Ukraine")
  }),
  capital("wallachia", "braila|romania", "Braila", "Romania", { trueCapital: capitalReference("targoviste|romania", "Targoviste", "Romania") }),
  capital("moldavia", "galati|romania", "Galati", "Romania", { trueCapital: capitalReference("suceava|romania", "Suceava", "Romania") }),
  capital("ragusa", "ragusa|croatia", "Ragusa", "Croatia"),
  capital("hejaz", "jeddah|saudi arabia", "Jeddah", "Saudi Arabia", { trueCapital: capitalReference("mecca|saudi arabia", "Mecca", "Saudi Arabia") }),
  capital("poland-lithuania", "krakow|poland", "Krakow", "Poland"),
  capital("sweden", "soderkoping|sweden", "Soderkoping", "Sweden", { trueCapital: capitalReference("stockholm|sweden", "Stockholm", "Sweden") }),
  capital("denmark-norway", "roskilde|denmark", "Roskilde", "Denmark", { trueCapital: capitalReference("copenhagen|denmark", "Copenhagen", "Denmark") }),
  capital("songhai", "gao|mali", "Gao", "Mali"),
  capital("morocco", "azemmour|morocco", "Azemmour", "Morocco", { trueCapital: capitalReference("fez|morocco", "Fez", "Morocco") }),
  capital("ethiopia", "massawa|ethiopia", "Massawa", "Ethiopia", {
    trueCapital: Object.freeze({kind: "itinerant-court"}),
    lat: 15.6097,
    lon: 39.45,
    population: 8000
  }),
  capital("vijayanagara", "rajahmundry|india", "Rajahmundry", "India", { trueCapital: capitalReference("vijayanagar|india", "Vijayanagar", "India") }),
  capital("gujarat", "cambay|india", "Cambay", "India", { trueCapital: capitalReference("ahmedabad|india", "Ahmedabad", "India") }),
  capital("bengal", "gauda|india", "Gauda", "India"),
  capital("delhi", "agra|india", "Agra", "India"),
  capital("ayutthaya", "ayutthaya|thailand", "Ayutthaya", "Thailand"),
  capital("ternate", "ternate|indonesia", "Ternate", "Indonesia"),
  capital("tidore", "tidore|indonesia", "Tidore", "Indonesia"),
  capital("japan", "kyoto|japan", "Kyoto", "Japan"),
  capital("hosokawa", "sakai|japan", "Sakai", "Japan"),
  capital("ouchi", "yamaguchi|japan", "Yamaguchi", "Japan"),
  capital("shimazu", "kagoshima|japan", "Kagoshima", "Japan"),
  capital("so", "tsushima fuchu|japan", "Tsushima Fuchu", "Japan"),
  capital("shoni", "nagasaki|japan", "Nagasaki", "Japan"),
  capital("nagao", "naoetsu|japan", "Naoetsu", "Japan", { trueCapital: capitalReference("kasugayama|japan", "Kasugayama", "Japan") }),
  capital("ando", "tsuchizaki minato|japan", "Tsuchizaki Minato", "Japan", { trueCapital: capitalReference("hiyama|japan", "Hiyama", "Japan") }),
  capital("kakizaki", "kaminokuni|japan", "Kaminokuni", "Japan"),
  capital("ryukyu", "naha|japan", "Naha", "Japan", { trueCapital: capitalReference("shuri|japan", "Shuri", "Japan") }),
  capital("ainu", "akkeshi kotan|japan", "Akkeshi Kotan", "Japan", {
    trueCapital: Object.freeze({kind: "local-councils"})
  }),
  capital("joseon", "seoul|republic of korea", "Seoul", "Republic of Korea")
]);

const FACTION_SEA_CAPITALS_BY_ID = new Map(FACTION_SEA_CAPITALS_1522.map((item) => [item.factionId, item]));
const FACTION_SEA_CAPITALS_BY_CITY_ID = new Map(FACTION_SEA_CAPITALS_1522.map((item) => [item.cityId, item]));

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
  ["sweden", "denmark-norway"]
]);

export const DIPLOMACY_MATRIX_1522 = buildDiplomacyMatrix();

const CITY_FACTION_OVERRIDES = uniqueMap([
  ...cityRules([
    "london|united kingdom", "norwich|united kingdom", "exeter|united kingdom", "topsham|united kingdom", "bristol|united kingdom",
    "southampton|united kingdom", "york|united kingdom", "hull|united kingdom", "newcastle upon tyne|united kingdom"
  ], "england"),
  cityRule("dublin|ireland", "england"),
  cityRule("edinburgh|united kingdom", "scotland"),
  cityRule("glasgow|united kingdom", "scotland"),
  cityRule("avignon|france", "papal-states"),
  cityRule("metz|france", "metz"),

  // The Empire is constitutional membership, not Habsburg sovereignty. These
  // rules use source-catalog identities; display aliases such as Augsburg and
  // Breslau never participate in ownership lookup.
  cityRule("brugge|belgium", "burgundian-netherlands"),
  cityRule("gent|belgium", "burgundian-netherlands"),
  cityRule("vienna|austria", "habsburg"),
  cityRule("prague|austria", "bohemia"),
  cityRule("wroclaw|germany", "bohemia"),
  cityRule("mainz|germany", "mainz"),
  cityRule("erfurt|germany", "mainz"),
  cityRule("bonn|germany", "cologne-electorate"),
  cityRule("trier|germany", "trier"),
  cityRule("heidelberg|germany", "palatinate"),
  cityRule("wittenberg|germany", "electoral-saxony"),
  cityRule("berlin|germany", "brandenburg"),
  cityRule("leipzig|germany", "ducal-saxony"),
  cityRule("dresden|germany", "ducal-saxony"),
  cityRule("liege|belgium", "liege"),
  cityRule("magdeburg|germany", "magdeburg"),
  cityRule("utrecht|netherlands", "utrecht"),
  cityRule("soest|germany", "cleves-mark"),
  cityRule("wesel|germany", "cleves-mark"),
  cityRule("hannover|germany", "calenberg"),
  cityRule("augsberg|germany", "augsburg"),
  cityRule("cologne|germany", "cologne"),
  cityRule("nurnberg|germany", "nuremberg"),
  cityRule("lubeck|germany", "lubeck"),
  cityRule("hamburg|germany", "hamburg"),
  cityRule("bremen|germany", "bremen"),
  cityRule("speyer|germany", "speyer"),
  cityRule("regensburg|germany", "regensburg"),
  cityRule("worms|germany", "worms"),

  cityRule("venice|italy", "venice"),
  cityRule("verona|italy", "venice"),
  cityRule("genova|italy", "genoa"),
  cityRule("florence|italy", "florence"),
  cityRule("pisa|italy", "florence"),
  cityRule("rome|italy", "papal-states"),
  cityRule("bologna|italy", "papal-states"),
  cityRule("milan|italy", "habsburg"),
  cityRule("pavia|italy", "habsburg"),
  cityRule("cremona|italy", "habsburg"),
  cityRule("naples|italy", "spain"),
  cityRule("capua|italy", "spain"),
  cityRule("palermo|italy", "spain"),
  cityRule("taranto|italy", "spain"),
  cityRule("crotone|italy", "spain"),
  cityRule("messina|italy", "spain"),
  cityRule("olbia|italy", "spain"),
  cityRule("cagliari|italy", "spain"),
  cityRule("syracuse|italy", "spain"),
  cityRule("salerno|italy", "spain"),
  cityRule("bastia|italy", "genoa"),

  cityRule("ceuta|morocco", "portugal"),
  cityRule("algiers|algeria", "ottoman"),
  cityRule("tripoli|libya", "spain"),
  // Charles V did not grant Malta to the displaced Hospitallers until 1530.
  // In 1522 Birgu remains Spanish while the order still rules Rhodes.
  cityRule("birgu|malta", "spain"),
  cityRule("ragusa|croatia", "ragusa"),

  cityRule("kerkira|greece", "venice"),
  cityRule("gortyn|greece", "venice"),
  cityRule("knossos|greece", "venice"),
  cityRule("akrotiri|greece", "venice"),
  cityRule("iraklion|greece", "venice"),
  cityRule("rhodes|greece", "hospitallers"),

  cityRule("goa|india", "portugal"),
  cityRule("hormuz|iran", "hormuz"),
  cityRule("malacca|malaysia", "portugal"),
  cityRule("muscat|oman", "hormuz"),
  cityRule("sofala|mozambique", "portugal"),
  cityRule("mozambique|mozambique", "portugal"),

  cityRule("lhasa|china", NEUTRAL_FACTION_ID),
  cityRule("kashi|china", NEUTRAL_FACTION_ID),
  cityRule("turpan|china", NEUTRAL_FACTION_ID),

  cityRule("mexico city|mexico", "spain"),
  cityRule("texcoco|mexico", "spain"),
  cityRule("tenayuca|mexico", "spain"),
  cityRule("cholula|mexico", "spain"),
  cityRule("zempoala|mexico", "spain"),
  cityRule("veracruz|mexico", "spain"),

  cityRule("baghdad|iraq", "safavid"),
  cityRule("jeddah|saudi arabia", "hejaz"),
  cityRule("mecca|saudi arabia", "hejaz"),
  cityRule("braila|romania", "wallachia"),
  cityRule("galati|romania", "moldavia"),
  cityRule("targoviste|romania", "wallachia"),
  cityRule("suceava|romania", "moldavia"),
  cityRule("kiev|ukraine", "poland-lithuania"),

  cityRule("naha|japan", "ryukyu"),
  cityRule("akkeshi kotan|japan", "ainu"),
  cityRule("sakai|japan", "hosokawa"),
  cityRule("yamaguchi|japan", "ouchi"),
  cityRule("fukuoka|japan", "ouchi"),
  cityRule("tomogaura|japan", "ouchi"),
  cityRule("kagoshima|japan", "shimazu"),
  cityRule("tsushima fuchu|japan", "so"),
  cityRule("nagasaki|japan", "shoni"),
  cityRule("naoetsu|japan", "nagao"),
  cityRule("tsuchizaki minato|japan", "ando"),
  cityRule("kaminokuni|japan", "kakizaki"),

  cityRule("sarai|russian federation", NEUTRAL_FACTION_ID),
  cityRule("astrakhan|russian federation", NEUTRAL_FACTION_ID),
  cityRule("kazan|russian federation", NEUTRAL_FACTION_ID),
  cityRule("feodosia|russian federation", "ottoman"),
  cityRule("sudak|russian federation", "ottoman"),
  cityRule("bakhchiserai|ukraine", "crimea"),
  cityRule("kezlev|ukraine", "crimea"),

  cityRule("stockholm|sweden", "denmark-norway"),
  cityRule("kalmar|sweden", "denmark-norway"),
  cityRule("visby|sweden", "denmark-norway"),
  cityRule("turku|finland", "denmark-norway"),

  ...cityRules([
    "vijayanagar|india", "manyakheta|india", "thanjavur|india", "badami|india",
    "chittoor|india", "kanchipuram|india", "kolar|india", "madurai|india",
    "halebidu|india", "rajahmundry|india"
  ], "vijayanagara"),
  ...cityRules([
    "ahmedabad|india", "cambay|india", "diu|india", "patan|india",
    "somnath|india", "dholavira|india", "surat|india"
  ], "gujarat"),
  ...cityRules([
    "gauda|india", "patna|india", "pandua|india", "kamarupa|india",
    "kamtapur|india", "nadiya|india", "tamralipti|india"
  ], "bengal"),
  ...cityRules([
    "agra|india", "delhi|india", "kanauji|india", "jaunpur|india",
    "lahore|india", "multan|india"
  ], "delhi"),
  cityRule("lahore|pakistan", "delhi"),
  cityRule("multan|pakistan", "delhi"),

  cityRule("ayutthaya|thailand", "ayutthaya"),
  cityRule("sukhothai|thailand", "ayutthaya"),

  cityRule("ternate|indonesia", "ternate"),
  cityRule("hitu village|indonesia", "ternate"),
  cityRule("buru village|indonesia", "ternate"),
  cityRule("tidore|indonesia", "tidore"),
  cityRule("makian village|indonesia", "tidore"),
  cityRule("gane village|indonesia", "tidore")
], "city faction overrides");

const TERRITORY_FACTIONS = uniqueMap([
  ["france", "france"],
  ["spain", "spain"],
  ["portugal", "portugal"],
  ["austria", "habsburg"],
  ["belgium", "burgundian-netherlands"],
  ["germany", NEUTRAL_FACTION_ID],
  ["netherlands", "burgundian-netherlands"],
  ["hungary", "hungary"],
  ["turkey", "ottoman"],
  ["egypt", "ottoman"],
  ["greece", "ottoman"],
  ["bulgaria", "ottoman"],
  ["serbia", "ottoman"],
  ["albania", "ottoman"],
  ["israel", "ottoman"],
  ["lebanon", "ottoman"],
  ["syria", "ottoman"],
  ["syria/turkey", "ottoman"],
  ["syrian arab republic", "ottoman"],
  ["cyprus", "venice"],
  ["china", "ming"],
  ["peru", "inca"],
  ["iran", "safavid"],
  ["russian federation", "muscovy"],
  ["poland", "poland-lithuania"],
  ["lithuania", "poland-lithuania"],
  ["sweden", "sweden"],
  ["denmark", "denmark-norway"],
  ["norway", "denmark-norway"],
  ["iceland", "denmark-norway"],
  ["mali", "songhai"],
  ["morocco", "morocco"],
  ["ethiopia", "ethiopia"],
  ["japan", "japan"],
  ["republic of korea", "joseon"],
  ["dem. people's republic of korea", "joseon"],
  ["cuba", "spain"],
  ["dominican republic", "spain"],
  ["panama", "spain"],
  ["puerto rico", "spain"],
  ["malta", "spain"],
  ["cape verde", "portugal"],
  ["sao tome and principe", "portugal"]
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

export function factionSeaCapitalForId(factionId) {
  assertFactionId(factionId);
  const capitalSpec = FACTION_SEA_CAPITALS_BY_ID.get(factionId);
  if (!capitalSpec) throw new Error(`Faction has no 1522 water-accessible capital: ${factionId}`);
  return capitalSpec;
}

export function factionSeaCapitalForCity(city) {
  if (!city || typeof city !== "object") throw new Error("Capital lookup requires a city");
  return FACTION_SEA_CAPITALS_BY_CITY_ID.get(requireCityId(city)) || null;
}

export function factionSeaCapitalCityRecords1522() {
  return FACTION_SEA_CAPITALS_1522.filter((capitalSpec) => (
    Number.isFinite(capitalSpec.lat) &&
    Number.isFinite(capitalSpec.lon) &&
    Number.isInteger(capitalSpec.population)
  ));
}

export function markFactionSeaCapitalsOnPorts(ports) {
  if (!Array.isArray(ports)) throw new Error("Faction capitals require a list of water-accessible ports");
  const portsByCityId = new Map(ports.map((port) => [requireCityId(port), port]));
  const capitalPorts = new Map();

  for (const capitalSpec of FACTION_SEA_CAPITALS_1522) {
    const port = portsByCityId.get(capitalSpec.cityId);
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
  const override = CITY_FACTION_OVERRIDES.get(requireCityId(city));
  if (override) return override;
  return TERRITORY_FACTIONS.get(cityTerritoryId(city)) || NEUTRAL_FACTION_ID;
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

function capitalReference(cityId, city, country) {
  requireCityId({ cityId }, "True capital");
  return Object.freeze({ kind: "city", cityId, city, country });
}

export function factionTrueCapitalForId(factionId) {
  return factionSeaCapitalForId(factionId).trueCapital;
}

function capital(factionId, cityId, city, country, details = {}) {
  return Object.freeze({
    factionId,
    cityId,
    city,
    country,
    lat: details.lat,
    lon: details.lon,
    population: details.population,
    trueCapital: details.trueCapital || capitalReference(cityId, city, country)
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

function cityRule(cityId, factionId) {
  return [cityId, factionId];
}

function cityRules(cityIds, factionId) {
  return cityIds.map((cityId) => cityRule(cityId, factionId));
}

function uniqueMap(entries, label) {
  const map = new Map(entries);
  if (map.size !== entries.length) throw new Error(`${label} contain duplicate keys`);
  return map;
}

function validateCityFactionRules() {
  for (const factionId of CITY_FACTION_OVERRIDES.values()) assertFactionId(factionId);
  for (const factionId of TERRITORY_FACTIONS.values()) assertFactionId(factionId);
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
  const capitalFactionIds = FACTION_SEA_CAPITALS_1522.map((capitalSpec) => capitalSpec.factionId).sort();
  if (JSON.stringify(capitalFactionIds) !== JSON.stringify(expectedFactionIds)) {
    throw new Error("Faction capital registry must cover every non-special faction exactly once");
  }
  if (FACTION_SEA_CAPITALS_BY_ID.size !== FACTION_SEA_CAPITALS_1522.length) {
    throw new Error("Faction capital registry contains duplicate faction ids");
  }
  if (FACTION_SEA_CAPITALS_BY_CITY_ID.size !== FACTION_SEA_CAPITALS_1522.length) {
    throw new Error("Faction capital registry contains duplicate city keys");
  }
  for (const capitalSpec of FACTION_SEA_CAPITALS_1522) {
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
