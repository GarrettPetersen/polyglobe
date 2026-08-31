import { cityTerritoryId, requireCityId } from "./entityIds.js";

export const RELIGION_CATALOG = Object.freeze([
  religion("roman-catholic", "Roman Catholic", "religion:christian"),
  religion("eastern-orthodox", "Eastern Orthodox", "religion:orthodox"),
  religion("ethiopian-orthodox", "Ethiopian Orthodox", "religion:orthodox"),
  religion("lutheran", "Lutheran", "religion:christian"),
  religion("reformed-protestant", "Reformed Protestant", "religion:christian"),
  religion("anglican", "Anglican", "religion:christian"),
  religion("quaker", "Quaker", "religion:christian"),
  religion("sunni-islam", "Sunni Muslim", "religion:islam"),
  religion("shia-islam", "Twelver Shia", "religion:islam"),
  religion("ibadi-islam", "Ibadi Muslim", "religion:islam"),
  religion("judaism", "Jewish", "religion:judaism"),
  religion("hinduism", "Hindu", "religion:hindu"),
  religion("jainism", "Jain", "religion:jain"),
  religion("sikhism", "Sikh", "religion:sikh"),
  religion("zoroastrianism", "Zoroastrian", "religion:zoroastrian"),
  religion("theravada-buddhism", "Theravada Buddhist", "religion:buddhist"),
  religion("mahayana-buddhism", "Mahayana Buddhist", "religion:buddhist"),
  religion("tibetan-buddhism", "Tibetan Buddhist", "religion:buddhist"),
  religion("daoism", "Daoist", "religion:daoist"),
  religion("chinese-traditional", "Confucian tradition", "religion:confucian"),
  religion("korean-traditional", "Confucian tradition", "religion:confucian"),
  religion("kami-buddhist", "Shinto-Buddhist", "religion:shinto"),
  religion("andean-traditional", "Andean traditional", "religion:andean-traditional"),
  religion("mesoamerican-traditional", "Mesoamerican traditional", "religion:mesoamerican-traditional"),
  religion("north-american-traditional", "North American traditional", "religion:north-american-traditional"),
  religion("american-traditional", "Local American traditional", "religion:north-american-traditional"),
  religion("african-traditional", "African traditional", "religion:african-traditional"),
  religion("polynesian-traditional", "Polynesian traditional", "religion:polynesian-traditional"),
  religion("austronesian-traditional", "Austronesian traditional", "religion:austronesian-traditional"),
  religion("ainu-traditional", "Ainu traditional", "religion:ainu-traditional")
]);

const RELIGIONS_BY_ID = new Map(RELIGION_CATALOG.map((entry) => [entry.id, entry]));
if (RELIGIONS_BY_ID.size !== RELIGION_CATALOG.length) {
  throw new Error("Character religion catalog contains duplicate ids");
}
const EQUAL_WEIGHT_RELIGIONS = Object.freeze(
  RELIGION_CATALOG.map(({ id }) => Object.freeze({ id, weight: 1 }))
);
const PORTRAIT_RELIGION_FAMILIES = Object.freeze({
  christian: new Set([
    "roman-catholic",
    "eastern-orthodox",
    "ethiopian-orthodox",
    "lutheran",
    "reformed-protestant",
    "anglican",
    "quaker"
  ]),
  buddhist: new Set([
    "theravada-buddhism",
    "mahayana-buddhism",
    "tibetan-buddhism",
    "kami-buddhist"
  ])
});
const PORTRAIT_RELIGION_DEFAULTS = Object.freeze({
  christian: "roman-catholic",
  buddhist: "mahayana-buddhism"
});

const CATHOLIC_FACTIONS = new Set([
  "england",
  "scotland",
  "france",
  "spain",
  "portugal",
  "burgundian-netherlands",
  "habsburg",
  "hungary",
  "bohemia",
  "mainz",
  "cologne-electorate",
  "trier",
  "palatinate",
  "electoral-saxony",
  "brandenburg",
  "ducal-saxony",
  "liege",
  "magdeburg",
  "utrecht",
  "cleves-mark",
  "calenberg",
  "augsburg",
  "cologne",
  "nuremberg",
  "lubeck",
  "hamburg",
  "bremen",
  "speyer",
  "regensburg",
  "worms",
  "metz",
  "venice",
  "genoa",
  "florence",
  "papal-states",
  "hospitallers",
  "poland-lithuania",
  "sweden",
  "denmark-norway"
]);
const ORTHODOX_COUNTRIES = new Set([
  "bulgaria",
  "georgia",
  "greece",
  "romania",
  "russian federation",
  "serbia",
  "ukraine"
]);
const POLYNESIAN_COUNTRIES = new Set([
  "aotearoa",
  "cook islands",
  "fiji",
  "french polynesia",
  "hawaii",
  "kiribati",
  "niue",
  "rapa nui",
  "samoa",
  "tonga"
]);
const MESOAMERICAN_COUNTRIES = new Set(["guatemala", "mexico"]);
const ANDEAN_COUNTRIES = new Set(["bolivia", "columbia", "ecuador", "peru"]);
const NORTH_AMERICAN_COUNTRIES = new Set([
  "makah",
  "nuu-chah-nulth",
  "united states of america"
]);
const SWAHILI_COAST_CITIES = new Set([
  "kilwa|tanzania",
  "mombasa|kenya",
  "mogadishu|somalia",
  "mozambique|mozambique",
  "sofala|mozambique"
]);
const EARLY_REFORMATION_CITIES = new Set([
  "bremen|germany",
  "erfurt|germany",
  "hamburg|germany",
  "leipzig|germany",
  "lubeck|germany",
  "magdeburg|germany",
  "nurnberg|germany",
  "wroclaw|poland",
  "worms|germany"
]);
const SOUTH_ASIAN_PORT_CITIES = new Set([
  "calicut|india",
  "cochin|india",
  "colombo|sri lanka",
  "quilon|india"
]);
const SOUTHEAST_ASIAN_MUSLIM_PORTS = new Set([
  "aceh|indonesia",
  "bandar seri begawan|brunei",
  "gresik|indonesia",
  "hitu village|indonesia",
  "makian village|indonesia",
  "malacca|malaysia",
  "patani|thailand",
  "ternate|indonesia",
  "tidore|indonesia",
  "gane village|indonesia"
]);
const SOUTHEAST_ASIAN_BUDDHIST_CITIES = new Set([
  "ayutthaya|thailand",
  "chiang mai|thailand",
  "luang prabang|lao people's democratic republic",
  "pegu|myanmar",
  "sukhothai|thailand"
]);

export function characterReligionProfile(character) {
  if (!character || typeof character !== "object") {
    throw new Error("Character religion requires a character");
  }
  return religionById(character.religionId);
}

export function religionById(religionId) {
  const profile = RELIGIONS_BY_ID.get(religionId);
  if (!profile) throw new Error(`Unknown character religion: ${religionId}`);
  return profile;
}

export function isIslamicReligion(religionId) {
  return religionById(religionId).iconId === "religion:islam";
}

export function isChristianReligion(religionId) {
  const iconId = religionById(religionId).iconId;
  return iconId === "religion:christian" || iconId === "religion:orthodox";
}

export function islamicReligionForHome(homePort, identityKey) {
  if (typeof identityKey !== "string" || identityKey.trim() === "") {
    throw new Error("Islamic religion selection requires an identity key");
  }
  const candidates = religionCandidatesForHome(homePort).filter(({ id }) => (
    isIslamicReligion(id)
  ));
  if (candidates.length === 0) return null;
  return weightedChoice(candidates, `${identityKey}|islamic-religion`);
}

export function inferCharacterReligion({
  identityKey,
  homePort,
  character = {}
}) {
  if (character.religionId != null) {
    if (!portraitAllowsReligion(character.requiredReligionFamily, character.religionId)) {
      throw new Error(
        `Portrait religion ${character.religionId} violates its ${character.requiredReligionFamily} attire`
      );
    }
    return religionById(character.religionId);
  }
  if (typeof identityKey !== "string" || identityKey.trim() === "") {
    throw new Error("Character religion requires an identity key");
  }
  const candidates = religionCandidatesForCharacter(character, homePort);
  return religionById(weightedChoice(candidates, `${identityKey}|religion`));
}

export function religionCandidatesForCharacter(character, homePort = null) {
  if (!character || typeof character !== "object") {
    throw new Error("Character religion candidates require a character");
  }
  if (character.role === "ship-animal-companion") return EQUAL_WEIGHT_RELIGIONS;
  const candidates = religionCandidatesForHome(religionContext(homePort, character));
  if (character.requiredReligionFamily == null) return candidates;
  assertPortraitReligionFamily(character.requiredReligionFamily);
  const constrained = candidates.filter(({ id }) => (
    portraitAllowsReligion(character.requiredReligionFamily, id)
  ));
  if (constrained.length > 0) return Object.freeze(constrained);
  return choices([PORTRAIT_RELIGION_DEFAULTS[character.requiredReligionFamily], 1]);
}

export function portraitAllowsReligion(requiredReligionFamily, religionId) {
  religionById(religionId);
  if (requiredReligionFamily == null) return true;
  assertPortraitReligionFamily(requiredReligionFamily);
  return PORTRAIT_RELIGION_FAMILIES[requiredReligionFamily].has(religionId);
}

export function defaultReligionForPortraitFamily(requiredReligionFamily) {
  assertPortraitReligionFamily(requiredReligionFamily);
  return PORTRAIT_RELIGION_DEFAULTS[requiredReligionFamily];
}

export function religionCandidatesForHome(homePort) {
  if (!homePort || typeof homePort !== "object") {
    throw new Error("Character religion requires a home city");
  }
  const cityId = homePort.cityId === undefined || homePort.cityId === null
    ? ""
    : requireCityId(homePort, "Character religion home city");
  const country = cityId === "" ? "" : cityTerritoryId(homePort, "Character religion home city");
  const factionId = String(homePort.factionId || homePort.nationalityId || "");
  const cityType = String(homePort.cityType || "");
  const nameCulture = String(homePort.nameCulture || "");
  const colonialFoundingType = homePort.colonialFounding?.type || homePort.colonialFoundingType || null;

  if (colonialFoundingType === "settler-colony" && CATHOLIC_FACTIONS.has(factionId)) {
    return choices(["roman-catholic", 1]);
  }

  if (nameCulture === "tatar") return choices(["sunni-islam", 1]);
  if (factionId === "ainu" || nameCulture === "ainu") return choices(["ainu-traditional", 1]);
  if (country === "japan" || factionId === "japan" || factionId === "ryukyu") {
    return choices(["kami-buddhist", 1]);
  }
  if (country === "republic of korea" || country === "dem. people's republic of korea" || factionId === "joseon") {
    return choices(["korean-traditional", 3], ["mahayana-buddhism", 2]);
  }
  if (country === "china" || factionId === "ming") {
    if (cityId === "lhasa|china") return choices(["tibetan-buddhism", 1]);
    if (["kashi|china", "tsinkiang|china", "turpan|china"].includes(cityId)) {
      return choices(["sunni-islam", 4], ["chinese-traditional", 1]);
    }
    return choices(["chinese-traditional", 2], ["daoism", 1], ["mahayana-buddhism", 1]);
  }

  if (POLYNESIAN_COUNTRIES.has(country)) return choices(["polynesian-traditional", 1]);
  if (["guam", "philippines"].includes(country)) return choices(["austronesian-traditional", 1]);
  if (ANDEAN_COUNTRIES.has(country) || factionId === "inca" || cityType === "andean") {
    return choices(["andean-traditional", 1]);
  }
  if (NORTH_AMERICAN_COUNTRIES.has(country)) return choices(["north-american-traditional", 1]);
  if (["bahamas", "brazil"].includes(country)) return choices(["american-traditional", 1]);
  if (MESOAMERICAN_COUNTRIES.has(country) || cityType === "mesoamerican" || cityType === "meso-american") {
    if (factionId === "spain") {
      return choices(["mesoamerican-traditional", 3], ["roman-catholic", 2]);
    }
    return choices(["mesoamerican-traditional", 1]);
  }

  if (country === "sri lanka") {
    return choices(["theravada-buddhism", 4], ["hinduism", 1]);
  }
  if (country === "maldives") return choices(["sunni-islam", 1]);
  if (country === "india" || country === "pakistan" || cityType === "south-asian") {
    return southAsianReligionCandidates({ cityId, factionId });
  }

  if (country === "thailand" || country === "myanmar" || country === "lao people's democratic republic") {
    if (SOUTHEAST_ASIAN_MUSLIM_PORTS.has(cityId)) return choices(["sunni-islam", 1]);
    return choices(["theravada-buddhism", 1]);
  }
  if (cityType === "southeast-asian") {
    if (SOUTHEAST_ASIAN_MUSLIM_PORTS.has(cityId)) return choices(["sunni-islam", 1]);
    if (SOUTHEAST_ASIAN_BUDDHIST_CITIES.has(cityId)) return choices(["theravada-buddhism", 1]);
    if (cityId === "binh dinh|vietnam") return choices(["hinduism", 3], ["sunni-islam", 1]);
    return choices(["austronesian-traditional", 2], ["sunni-islam", 1], ["hinduism", 1]);
  }

  if (country === "ethiopia" || factionId === "ethiopia") {
    if (cityId === "massawa|ethiopia") return choices(["ethiopian-orthodox", 3], ["sunni-islam", 2]);
    return choices(["ethiopian-orthodox", 1]);
  }
  if (SWAHILI_COAST_CITIES.has(cityId) || ["kenya", "somalia", "tanzania"].includes(country)) {
    return choices(["sunni-islam", 1]);
  }
  if (cityId === "m'banza-congo|angola") {
    return choices(["roman-catholic", 3], ["african-traditional", 2]);
  }
  if (cityType === "sub-saharan") {
    if (factionId === "songhai" || ["gao|mali", "kano|nigeria", "mali|mali", "tombouctou|mali"].includes(cityId)) {
      return choices(["sunni-islam", 4], ["african-traditional", 1]);
    }
    return choices(["african-traditional", 1]);
  }

  if (cityId === "baghdad|iraq") {
    return choices(["sunni-islam", 5], ["shia-islam", 3], ["judaism", 1]);
  }
  if (factionId === "safavid") {
    if (["kerman|iran", "yazd|iran"].includes(cityId)) {
      return choices(["shia-islam", 5], ["sunni-islam", 1], ["zoroastrianism", 2]);
    }
    return choices(["shia-islam", 6], ["sunni-islam", 2], ["zoroastrianism", 1]);
  }
  if (cityId === "jerusalem|israel") {
    return choices(
      ["sunni-islam", 5],
      ["judaism", 2],
      ["eastern-orthodox", 2],
      ["roman-catholic", 1]
    );
  }
  if (country === "oman" || cityId === "muscat|oman") {
    return choices(["ibadi-islam", 4], ["sunni-islam", 1]);
  }
  if (country === "iran") {
    if (cityId === "hormuz|iran") {
      return choices(["sunni-islam", 6], ["shia-islam", 3], ["zoroastrianism", 1]);
    }
    if (["kerman|iran", "yazd|iran"].includes(cityId)) {
      return choices(["shia-islam", 5], ["sunni-islam", 1], ["zoroastrianism", 2]);
    }
    return choices(["shia-islam", 6], ["sunni-islam", 2], ["zoroastrianism", 1]);
  }
  if (factionId === "crimea" || factionId === "kazan") {
    return choices(["sunni-islam", 4], ["eastern-orthodox", 1]);
  }
  if (cityType === "islamic-desert") {
    return choices(["sunni-islam", 1]);
  }

  if (country === "albania") {
    return choices(["sunni-islam", 2], ["eastern-orthodox", 2], ["roman-catholic", 1]);
  }
  if (factionId === "hospitallers") {
    return choices(["roman-catholic", 3], ["eastern-orthodox", 2]);
  }
  if (country === "cyprus") {
    return choices(["eastern-orthodox", 3], ["roman-catholic", 1]);
  }
  if (ORTHODOX_COUNTRIES.has(country) || factionId === "muscovy") {
    if (factionId === "ottoman") return choices(["eastern-orthodox", 3], ["sunni-islam", 1]);
    return choices(["eastern-orthodox", 1]);
  }
  if (factionId === "poland-lithuania") {
    return choices(["roman-catholic", 3], ["eastern-orthodox", 1], ["judaism", 1]);
  }
  if (country === "germany" && EARLY_REFORMATION_CITIES.has(cityId)) {
    return choices(["roman-catholic", 4], ["lutheran", 1]);
  }
  if (CATHOLIC_FACTIONS.has(factionId) || cityType === "northern-european" || cityType === "mediterranean") {
    return choices(["roman-catholic", 1]);
  }

  if (cityType === "polynesian") return choices(["polynesian-traditional", 1]);
  if (nameCulture === "chinese") {
    return choices(["chinese-traditional", 2], ["daoism", 1], ["mahayana-buddhism", 1]);
  }
  if (nameCulture === "japanese") return choices(["kami-buddhist", 1]);
  if (nameCulture === "ryukyuan") return choices(["kami-buddhist", 1]);
  if (nameCulture === "ainu") return choices(["ainu-traditional", 1]);
  if (nameCulture === "korean") return choices(["korean-traditional", 3], ["mahayana-buddhism", 2]);
  if (["bengali", "gujarati", "malayali", "northIndian", "southAsian", "southIndian"].includes(nameCulture)) {
    return choices(["hinduism", 4], ["sunni-islam", 1], ["jainism", 1]);
  }
  if (nameCulture === "sinhalese") return choices(["theravada-buddhism", 4], ["hinduism", 1]);
  if (nameCulture === "indoMuslim") return choices(["sunni-islam", 1]);
  if (nameCulture === "jewish") return choices(["judaism", 1]);
  if (nameCulture === "sikh") return choices(["sikhism", 1]);
  if (["southeastAsian", "javanese", "malukan"].includes(nameCulture)) {
    return choices(["theravada-buddhism", 2], ["sunni-islam", 1], ["austronesian-traditional", 1]);
  }
  if (nameCulture === "cham") return choices(["hinduism", 3], ["sunni-islam", 1]);
  if (nameCulture === "malay") return choices(["sunni-islam", 1]);
  if (nameCulture === "cebuano") return choices(["austronesian-traditional", 1]);
  if (["thai", "monBurmese", "lao"].includes(nameCulture)) return choices(["theravada-buddhism", 1]);
  if (nameCulture === "vietnamese") {
    return choices(["chinese-traditional", 2], ["mahayana-buddhism", 1]);
  }
  if (nameCulture === "polynesian") return choices(["polynesian-traditional", 1]);
  if (["maya", "nahua", "purepecha"].includes(nameCulture)) {
    return choices(["mesoamerican-traditional", 1]);
  }
  if (["northwestCoast", "shawnee", "wendat"].includes(nameCulture)) {
    return choices(["north-american-traditional", 1]);
  }
  if (["taino", "tupi"].includes(nameCulture)) return choices(["american-traditional", 1]);
  if (nameCulture === "andean") return choices(["andean-traditional", 1]);
  if ([
    "eastAfrican",
    "khoikhoi",
    "kongo",
    "shona",
    "westAfrican",
    "yoruba"
  ].includes(nameCulture)) {
    return choices(["african-traditional", 1]);
  }
  if (["hausa", "kanuri", "mande", "somali", "swahili"].includes(nameCulture)) {
    return choices(["sunni-islam", 4], ["african-traditional", 1]);
  }
  if (nameCulture === "ethiopian") return choices(["ethiopian-orthodox", 1]);
  if ([
    "slavic",
    "russian",
    "ruthenian",
    "bulgarian",
    "romanian",
    "serbian",
    "greek"
  ].includes(nameCulture)) {
    return choices(["eastern-orthodox", 1]);
  }
  if (["polish", "lithuanian", "hungarian"].includes(nameCulture)) {
    return choices(["roman-catholic", 1]);
  }
  if (nameCulture === "albanian") {
    return choices(["eastern-orthodox", 2], ["roman-catholic", 1]);
  }
  if (["arabic", "centralAsian", "crimeanTatar", "ottoman", "tatar"].includes(nameCulture)) {
    return choices(["sunni-islam", 1]);
  }
  if (nameCulture === "persian") return choices(["shia-islam", 3], ["sunni-islam", 1]);
  if ([
    "english",
    "irish",
    "scottish",
    "french",
    "spanish",
    "portuguese",
    "italian",
    "germanic",
    "czech",
    "nordic",
    "finnish",
    "maritime"
  ].includes(nameCulture)) {
    return choices(["roman-catholic", 1]);
  }
  throw new Error(
    `No religion profile for ${homePort.displayCity || homePort.city || "unknown city"}, ` +
    `${country || "unknown country"} (${factionId || "no faction"}, ${cityType || "no city type"})`
  );
}

function southAsianReligionCandidates({ cityId, factionId }) {
  if (["lahore|pakistan", "multan|pakistan"].includes(cityId)) {
    return choices(["hinduism", 4], ["sunni-islam", 4], ["sikhism", 1]);
  }
  if (cityId === "goa|india") {
    return choices(["hinduism", 5], ["sunni-islam", 2], ["roman-catholic", 2], ["jainism", 1]);
  }
  if (SOUTH_ASIAN_PORT_CITIES.has(cityId)) {
    return choices(["hinduism", 6], ["sunni-islam", 2], ["judaism", 1], ["roman-catholic", 1]);
  }
  if (factionId === "vijayanagara") return choices(["hinduism", 9], ["jainism", 1]);
  if (factionId === "gujarat") {
    return choices(
      ["hinduism", 5],
      ["sunni-islam", 4],
      ["jainism", 1],
      ["zoroastrianism", 1]
    );
  }
  if (factionId === "bengal") return choices(["hinduism", 3], ["sunni-islam", 2]);
  if (["delhi", "mughal"].includes(factionId)) return choices(["hinduism", 3], ["sunni-islam", 2]);
  if (["amber|india", "jodhpur|india", "ujjain|india"].includes(cityId)) {
    return choices(["hinduism", 4], ["jainism", 1]);
  }
  if (cityId === "srinagar|india") return choices(["sunni-islam", 3], ["hinduism", 1]);
  return choices(["hinduism", 4], ["sunni-islam", 1], ["jainism", 1]);
}

function religionContext(homePort, character) {
  if (homePort && typeof homePort === "object") {
    requireCityId(homePort, "Character religion home city");
  } else if ((character.homePortTileId !== undefined || character.homePortName !== undefined) &&
      (character.homePortCityId === undefined || character.homePortCityId === null)) {
    throw new Error("Placed character religion requires a canonical home-city id");
  }
  const characterContext = {
    cityId: character.homePortCityId,
    displayCity: character.homePortName,
    country: character.homePortCountry,
    factionId: character.nationalityId,
    cityType: character.cityType,
    nameCulture: character.nameCulture
  };
  const context = homePort && typeof homePort === "object"
    ? {
        ...characterContext,
        ...homePort,
        factionId: homePort.factionId || characterContext.factionId,
        cityType: homePort.cityType || characterContext.cityType,
        nameCulture: homePort.nameCulture || characterContext.nameCulture
      }
    : characterContext;
  if (
    !context.displayCity &&
    !context.country &&
    !context.factionId &&
    !context.cityType &&
    !context.nameCulture
  ) {
    throw new Error(`Character religion has no home-city context: ${character.id || character.name || "unknown"}`);
  }
  return context;
}

function weightedChoice(candidates, key) {
  const total = candidates.reduce((sum, candidate) => sum + candidate.weight, 0);
  if (!Number.isInteger(total) || total <= 0) throw new Error("Religion candidates have no weight");
  let target = hashString32(key) % total;
  for (const candidate of candidates) {
    if (target < candidate.weight) return candidate.id;
    target -= candidate.weight;
  }
  throw new Error("Religion choice exceeded its candidate weights");
}

function choices(...entries) {
  return Object.freeze(entries.map(([id, weight]) => {
    religionById(id);
    if (!Number.isInteger(weight) || weight <= 0) {
      throw new Error(`Invalid religion candidate weight for ${id}: ${weight}`);
    }
    return Object.freeze({ id, weight });
  }));
}

function assertPortraitReligionFamily(requiredReligionFamily) {
  if (!Object.hasOwn(PORTRAIT_RELIGION_FAMILIES, requiredReligionFamily)) {
    throw new Error(`Unknown portrait religion family: ${requiredReligionFamily}`);
  }
}

function religion(id, label, iconId) {
  return Object.freeze({ id, label, iconId });
}

function hashString32(value) {
  let hash = 0x811c9dc5;
  for (const character of String(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}
