import { assertFactionId } from "./factions.js";

export const IMPERIAL_ESTATE_TYPE_PRINCE = "prince";
export const IMPERIAL_ESTATE_TYPE_ECCLESIASTICAL = "ecclesiastical-prince";
export const IMPERIAL_ESTATE_TYPE_FREE_CITY = "free-imperial-city";
export const IMPERIAL_ESTATE_TYPE_HEREDITARY_LANDS = "hereditary-lands";

export const IMPERIAL_CIRCLES_1512 = Object.freeze([
  circle("austrian", "Austrian Circle"),
  circle("bavarian", "Bavarian Circle"),
  circle("burgundian", "Burgundian Circle"),
  circle("electoral-rhenish", "Electoral Rhenish Circle"),
  circle("franconian", "Franconian Circle"),
  circle("lower-rhenish-westphalian", "Lower Rhenish-Westphalian Circle"),
  circle("lower-saxon", "Lower Saxon Circle"),
  circle("upper-rhenish", "Upper Rhenish Circle"),
  circle("upper-saxon", "Upper Saxon Circle"),
  circle("swabian", "Swabian Circle")
]);

export const IMPERIAL_CITY_REFERENCES = Object.freeze({
  AUGSBURG: city("augsberg|germany", "Augsberg", "Germany", "Augsburg"),
  BERLIN: city("berlin|germany", "Berlin", "Germany"),
  BONN: city("bonn|germany", "Bonn", "Germany"),
  BREMEN: city("bremen|germany", "Bremen", "Germany"),
  BRESLAU: city("wroclaw|germany", "Wroclaw", "Germany", "Breslau"),
  BRUGGE: city("brugge|belgium", "Brugge", "Belgium"),
  COLOGNE: city("cologne|germany", "Cologne", "Germany"),
  ERFURT: city("erfurt|germany", "Erfurt", "Germany"),
  GENT: city("gent|belgium", "Gent", "Belgium"),
  HAMBURG: city("hamburg|germany", "Hamburg", "Germany"),
  HANNOVER: city("hannover|germany", "Hannover", "Germany"),
  HEIDELBERG: city("heidelberg|germany", "Heidelberg", "Germany"),
  LEIPZIG: city("leipzig|germany", "Leipzig", "Germany"),
  LIEGE: city("liege|belgium", "Liege", "Belgium"),
  LUBECK: city("lubeck|germany", "Lubeck", "Germany"),
  MAGDEBURG: city("magdeburg|germany", "Magdeburg", "Germany"),
  MAINZ: city("mainz|germany", "Mainz", "Germany"),
  METZ: city("metz|france", "Metz", "France"),
  NUREMBERG: city("nurnberg|germany", "Nurnberg", "Germany", "Nuremberg"),
  PRAGUE: city("prague|austria", "Prague", "Austria"),
  REGENSBURG: city("regensburg|germany", "Regensburg", "Germany"),
  SOEST: city("soest|germany", "Soest", "Germany"),
  SPEYER: city("speyer|germany", "Speyer", "Germany"),
  TRIER: city("trier|germany", "Trier", "Germany"),
  UTRECHT: city("utrecht|netherlands", "Utrecht", "Netherlands"),
  VIENNA: city("vienna|austria", "Vienna", "Austria"),
  WITTENBERG: city("wittenberg|germany", "Wittenberg", "Germany"),
  WORMS: city("worms|germany", "Worms", "Germany")
});

const C = IMPERIAL_CITY_REFERENCES;

export const IMPERIAL_ESTATES_1522 = Object.freeze([
  estate("burgundian-netherlands", "Burgundian Netherlands", IMPERIAL_ESTATE_TYPE_HEREDITARY_LANDS,
    ["burgundian"], [C.BRUGGE, C.GENT]),
  estate("habsburg", "Austrian hereditary lands", IMPERIAL_ESTATE_TYPE_HEREDITARY_LANDS,
    ["austrian"], [C.VIENNA]),
  estate("bohemia", "Crown of Bohemia", IMPERIAL_ESTATE_TYPE_PRINCE, [], [C.PRAGUE, C.BRESLAU], { electorId: "bohemia" }),
  estate("mainz", "Electorate of Mainz", IMPERIAL_ESTATE_TYPE_ECCLESIASTICAL,
    ["electoral-rhenish"], [C.MAINZ, C.ERFURT], { electorId: "mainz", autonomousCityIds: [C.ERFURT.id] }),
  estate("cologne-electorate", "Electorate of Cologne", IMPERIAL_ESTATE_TYPE_ECCLESIASTICAL,
    ["electoral-rhenish"], [C.BONN], { electorId: "cologne-electorate" }),
  estate("trier", "Electorate of Trier", IMPERIAL_ESTATE_TYPE_ECCLESIASTICAL,
    ["electoral-rhenish"], [C.TRIER], { electorId: "trier" }),
  estate("palatinate", "Electoral Palatinate", IMPERIAL_ESTATE_TYPE_PRINCE,
    ["electoral-rhenish"], [C.HEIDELBERG], { electorId: "palatinate" }),
  estate("electoral-saxony", "Electorate of Saxony", IMPERIAL_ESTATE_TYPE_PRINCE,
    ["upper-saxon"], [C.WITTENBERG], { electorId: "electoral-saxony" }),
  estate("brandenburg", "Margraviate of Brandenburg", IMPERIAL_ESTATE_TYPE_PRINCE,
    ["upper-saxon"], [C.BERLIN], { electorId: "brandenburg" }),
  estate("ducal-saxony", "Albertine Duchy of Saxony", IMPERIAL_ESTATE_TYPE_PRINCE,
    ["upper-saxon"], [C.LEIPZIG]),
  estate("liege", "Prince-Bishopric of Liege", IMPERIAL_ESTATE_TYPE_ECCLESIASTICAL,
    ["lower-rhenish-westphalian"], [C.LIEGE]),
  estate("magdeburg", "Prince-Archbishopric of Magdeburg", IMPERIAL_ESTATE_TYPE_ECCLESIASTICAL,
    ["lower-saxon"], [C.MAGDEBURG]),
  estate("utrecht", "Prince-Bishopric of Utrecht", IMPERIAL_ESTATE_TYPE_ECCLESIASTICAL,
    ["lower-rhenish-westphalian"], [C.UTRECHT]),
  estate("cleves-mark", "United Duchies of Julich-Cleves-Berg", IMPERIAL_ESTATE_TYPE_PRINCE,
    ["lower-rhenish-westphalian"], [C.SOEST], { autonomousCityIds: [C.SOEST.id] }),
  estate("calenberg", "Principality of Calenberg", IMPERIAL_ESTATE_TYPE_PRINCE,
    ["lower-saxon"], [C.HANNOVER], { autonomousCityIds: [C.HANNOVER.id] }),
  freeCity("augsburg", C.AUGSBURG, "swabian"),
  freeCity("cologne", C.COLOGNE, "lower-rhenish-westphalian"),
  freeCity("nuremberg", C.NUREMBERG, "franconian"),
  freeCity("lubeck", C.LUBECK, "lower-saxon"),
  freeCity("hamburg", C.HAMBURG, "lower-saxon"),
  freeCity("bremen", C.BREMEN, "lower-saxon"),
  freeCity("speyer", C.SPEYER, "upper-rhenish"),
  freeCity("regensburg", C.REGENSBURG, "bavarian"),
  freeCity("worms", C.WORMS, "upper-rhenish"),
  freeCity("metz", C.METZ, "upper-rhenish")
]);

const ESTATES_BY_FACTION_ID = new Map(IMPERIAL_ESTATES_1522.map((item) => [item.factionId, item]));
const ESTATES_BY_CITY_ID = new Map(IMPERIAL_ESTATES_1522.flatMap((item) => (
  item.cityIds.map((cityId) => [cityId, item])
)));

if (ESTATES_BY_FACTION_ID.size !== IMPERIAL_ESTATES_1522.length) {
  throw new Error("Imperial Estate registry contains duplicate factions");
}
if (ESTATES_BY_CITY_ID.size !== IMPERIAL_ESTATES_1522.reduce((sum, item) => sum + item.cityIds.length, 0)) {
  throw new Error("Imperial city registry assigns one city to multiple Estates");
}
for (const item of IMPERIAL_ESTATES_1522) assertFactionId(item.factionId);

export function imperialEstateForFaction(factionId) {
  assertFactionId(factionId);
  return ESTATES_BY_FACTION_ID.get(factionId) || null;
}

export function imperialEstateForCityId(cityId) {
  if (typeof cityId !== "string" || cityId.trim() === "") {
    throw new Error("Imperial city lookup requires a canonical city id");
  }
  return ESTATES_BY_CITY_ID.get(cityId) || null;
}

export function imperialEstateForCity(cityRecord) {
  if (!cityRecord || typeof cityRecord !== "object") {
    throw new Error("Imperial city lookup requires a city record");
  }
  if (typeof cityRecord.cityId !== "string" || cityRecord.cityId.trim() === "") {
    throw new Error("Imperial membership requires the city's canonical cityId");
  }
  return imperialEstateForCityId(cityRecord.cityId);
}

export function isImperialMemberFaction(factionId) {
  return imperialEstateForFaction(factionId) !== null;
}

export function imperialCircleMembers(circleId) {
  if (!IMPERIAL_CIRCLES_1512.some((item) => item.id === circleId)) {
    throw new Error(`Unknown Imperial Circle: ${circleId}`);
  }
  return Object.freeze(IMPERIAL_ESTATES_1522
    .filter((item) => item.circleIds.includes(circleId))
    .map((item) => item.factionId));
}

function freeCity(factionId, cityRef, circleId) {
  return estate(factionId, `Free Imperial City of ${cityRef.displayCity}`, IMPERIAL_ESTATE_TYPE_FREE_CITY,
    [circleId], [cityRef], { autonomousCityIds: [cityRef.id] });
}

function estate(factionId, label, estateType, circleIds, cityRefs, details = {}) {
  return Object.freeze({
    factionId,
    label,
    estateType,
    circleIds: Object.freeze([...circleIds]),
    cityIds: Object.freeze(cityRefs.map((item) => item.id)),
    electorId: details.electorId || null,
    autonomousCityIds: Object.freeze([...(details.autonomousCityIds || [])])
  });
}

function city(id, cityName, country, displayCity = cityName) {
  return Object.freeze({ id, city: cityName, country, displayCity });
}

function circle(id, name) {
  return Object.freeze({ id, name });
}
