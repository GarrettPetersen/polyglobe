import { cityTerritoryId } from "./entityIds.js";

export const COLONIAL_FOUNDING_CONQUERED = "conquered-city";
export const COLONIAL_FOUNDING_NEGOTIATED = "negotiated-settlement";
export const COLONIAL_FOUNDING_SETTLER = "settler-colony";

export const COLONIAL_FOUNDING_TYPES = Object.freeze([
  COLONIAL_FOUNDING_CONQUERED,
  COLONIAL_FOUNDING_NEGOTIATED,
  COLONIAL_FOUNDING_SETTLER
]);

export const COLONIAL_CITY_FOUNDINGS = Object.freeze([
  colonialFounding("santo domingo|dominican republic", "Santo Domingo", "Dominican Republic", COLONIAL_FOUNDING_SETTLER, 1496, "spain", {
    label: "Spanish settler colony",
    note: "Older Caribbean colonial base, useful as a pre-1522 reference point."
  }),
  colonialFounding("nombre de dios|panama", "Nombre de Dios", "Panama", COLONIAL_FOUNDING_SETTLER, 1510, "spain", {
    label: "Spanish settler colony",
    note: "Early Caribbean/Panama staging port."
  }),
  colonialFounding("goa|india", "Goa", "India", COLONIAL_FOUNDING_CONQUERED, 1510, "portugal", {
    label: "Portuguese conquered city",
    note: "Existing Indian Ocean city taken by force and made a Portuguese capital."
  }),
  colonialFounding("mozambique|mozambique", "Mozambique", "Mozambique", COLONIAL_FOUNDING_NEGOTIATED, 1507, "portugal", {
    label: "Portuguese negotiated trade base",
    note: "Older Swahili settlement used as a Portuguese port and naval base."
  }),
  colonialFounding("havana|cuba", "Havana", "Cuba", COLONIAL_FOUNDING_SETTLER, 1519, "spain", {
    label: "Spanish settler colony",
    note: "New Spanish Caribbean port."
  }),
  colonialFounding("veracruz|mexico", "Veracruz", "Mexico", COLONIAL_FOUNDING_SETTLER, 1519, "spain", {
    label: "Spanish settler colony",
    note: "Spanish Gulf port founded during the conquest of Mexico."
  }),
  colonialFounding("panama city|panama", "Panama City", "Panama", COLONIAL_FOUNDING_SETTLER, 1519, "spain", {
    label: "Spanish settler colony",
    note: "Pacific-side Spanish administrative and shipping base."
  }),
  colonialFounding("mexico city|mexico", "Mexico City", "Mexico", COLONIAL_FOUNDING_CONQUERED, 1521, "spain", {
    label: "Spanish conquered capital",
    precolonialName: "Tenochtitlan",
    note: "Existing Mexica capital conquered and refounded as Mexico City."
  }),
  colonialFounding("quito|ecuador", "Quito", "Ecuador", COLONIAL_FOUNDING_CONQUERED, 1534, "spain", {
    label: "Spanish conquered city",
    note: "Andean city refounded after Spanish conquest."
  }),
  colonialFounding("lima|peru", "Lima", "Peru", COLONIAL_FOUNDING_SETTLER, 1535, "spain", {
    label: "Spanish settler colony",
    note: "New Spanish administrative capital for Peru."
  }),
  colonialFounding("diu|india", "Diu", "India", COLONIAL_FOUNDING_NEGOTIATED, 1535, "portugal", {
    label: "Portuguese negotiated fortress",
    note: "Portuguese position established by treaty in an existing Gujarati port."
  }),
  colonialFounding("asuncion|paraguay", "Asuncion", "Paraguay", COLONIAL_FOUNDING_SETTLER, 1537, "spain", {
    label: "Spanish settler colony",
    note: "Riverine Spanish settlement in the Paraguay basin."
  }),
  colonialFounding("recife|brazil", "Recife", "Brazil", COLONIAL_FOUNDING_SETTLER, 1537, "portugal", {
    label: "Portuguese settler colony",
    note: "Sugar-port settlement on the Pernambuco coast."
  }),
  colonialFounding("bogota|columbia", "Bogota", "Columbia", COLONIAL_FOUNDING_CONQUERED, 1538, "spain", {
    label: "Spanish conquered city",
    precolonialName: "Bacata",
    note: "New Granada city founded after conquest; dataset country spelling is Columbia."
  }),
  colonialFounding("ayacucho|peru", "Ayacucho", "Peru", COLONIAL_FOUNDING_SETTLER, 1540, "spain", {
    label: "Spanish settler colony",
    note: "Spanish Andean town."
  }),
  colonialFounding("santiago|chile", "Santiago", "Chile", COLONIAL_FOUNDING_SETTLER, 1541, "spain", {
    label: "Spanish settler colony",
    note: "Spanish Chilean capital."
  }),
  colonialFounding("potosi|bolivia", "Potosi", "Bolivia", COLONIAL_FOUNDING_SETTLER, 1545, "spain", {
    label: "Spanish mining colony",
    note: "Silver mining city with major economic significance."
  }),
  colonialFounding("zacatecas|mexico", "Zacatecas", "Mexico", COLONIAL_FOUNDING_SETTLER, 1548, "spain", {
    label: "Spanish mining colony",
    note: "Northern Mexican silver city."
  }),
  colonialFounding("salvador|brazil", "Salvador", "Brazil", COLONIAL_FOUNDING_SETTLER, 1549, "portugal", {
    label: "Portuguese settler colony",
    note: "First capital of colonial Brazil."
  }),
  colonialFounding("concepcion|chile", "Concepcion", "Chile", COLONIAL_FOUNDING_SETTLER, 1550, "spain", {
    label: "Spanish settler colony",
    note: "Spanish coastal settlement in Chile."
  }),
  colonialFounding("sao paolo|brazil", "Sao Paolo", "Brazil", COLONIAL_FOUNDING_SETTLER, 1554, "portugal", {
    label: "Portuguese settler colony",
    note: "Mission settlement; dataset spelling is Sao Paolo."
  }),
  colonialFounding("rio de janeiro|brazil", "Rio de Janeiro", "Brazil", COLONIAL_FOUNDING_SETTLER, 1565, "portugal", {
    label: "Portuguese settler colony",
    note: "Portuguese Brazil port city."
  }),
  colonialFounding("caracas|venezuela", "Caracas", "Venezuela", COLONIAL_FOUNDING_SETTLER, 1567, "spain", {
    label: "Spanish settler colony",
    note: "Spanish Venezuela settlement."
  }),
  colonialFounding("manila|philippines", "Manila", "Philippines", COLONIAL_FOUNDING_CONQUERED, 1571, "spain", {
    label: "Spanish conquered city",
    precolonialName: "Maynila",
    note: "Existing Tagalog port conquered and made capital of the Spanish East Indies."
  }),
  colonialFounding("nagasaki|japan", "Nagasaki", "Japan", COLONIAL_FOUNDING_NEGOTIATED, 1571, "japan", {
    label: "Japanese port opened to Portuguese trade",
    note: "Planned by Jesuits and Omura Sumitada under Japanese authority for the Portuguese China trade."
  }),
  colonialFounding("huancavelica|peru", "Huancavelica", "Peru", COLONIAL_FOUNDING_SETTLER, 1572, "spain", {
    label: "Spanish mining colony",
    note: "Mercury mining city feeding the silver economy."
  }),
  colonialFounding("luanda|angola", "Luanda", "Angola", COLONIAL_FOUNDING_SETTLER, 1576, "portugal", {
    label: "Portuguese settler colony",
    note: "Portuguese Atlantic Africa port."
  }),
  colonialFounding("buenos aires|argentina", "Buenos Aires", "Argentina", COLONIAL_FOUNDING_SETTLER, 1580, "spain", {
    label: "Spanish settler colony",
    note: "Rio de la Plata port settlement."
  }),
  colonialFounding("st. john's|canada", "St. John's", "Canada", COLONIAL_FOUNDING_SETTLER, 1583, "england", {
    label: "English settler/fishing colony",
    note: "Newfoundland claim and fishing base; useful for North Atlantic colonization."
  })
]);

const COLONIZATION_ECONOMY_REGION_BY_REGION = Object.freeze({
  acadia: "temperate-american-colony",
  angola: "sub-saharan",
  bermuda: "atlantic-island-colony",
  brazil: "brazilian-coast",
  caribbean: "caribbean",
  carolina: "temperate-american-colony",
  chile: "andean",
  connecticut: "temperate-american-colony",
  delaware: "temperate-american-colony",
  florida: "temperate-american-colony",
  "hudson-river": "temperate-american-colony",
  japan: "east-asian",
  newfoundland: "temperate-american-colony",
  "new-england": "temperate-american-colony",
  "new-france": "temperate-american-colony",
  "new-netherland": "temperate-american-colony",
  "new-spain": "mesoamerican",
  "rio-de-la-plata": "rio-de-la-plata",
  "spanish-east-indies": "southeast-asian",
  "upper-peru": "andean",
  venezuela: "tropical-american-colony",
  virginia: "temperate-american-colony"
});

export const COLONIZATION_TARGETS = Object.freeze([
  colonizationTarget("lima|peru", "Lima", "Peru", -12.04318, -77.02824, COLONIAL_FOUNDING_SETTLER, 1535, "spain", {
    label: "Spanish settler capital",
    region: "peru",
    waterAccess: "coastal",
    datasetFirstYear: 1700,
    datasetFirstPopulation: 37259,
    datasetSource: "chandler",
    note: "Future Peru capital; dataset gives a later city row but the site is absent in 1522."
  }),
  colonizationTarget("recife|brazil", "Recife", "Brazil", -8.05389, -34.88111, COLONIAL_FOUNDING_SETTLER, 1537, "portugal", {
    label: "Portuguese sugar port",
    region: "brazil",
    waterAccess: "coastal",
    datasetFirstYear: 1635,
    datasetFirstPopulation: 7000,
    datasetSource: "chandler"
  }),
  colonizationTarget("asuncion|paraguay", "Asuncion", "Paraguay", -25.30066, -57.63591, COLONIAL_FOUNDING_SETTLER, 1537, "spain", {
    label: "Spanish river colony",
    region: "rio-de-la-plata",
    waterAccess: "river",
    datasetFirstYear: 1640,
    datasetFirstPopulation: 4000,
    datasetSource: "chandler"
  }),
  colonizationTarget("ayacucho|peru", "Ayacucho", "Peru", -13.1615, -74.22154, COLONIAL_FOUNDING_SETTLER, 1540, "spain", {
    label: "Spanish Andean town",
    region: "peru",
    waterAccess: "inland",
    datasetFirstYear: 1574,
    datasetFirstPopulation: 13000,
    datasetSource: "chandler"
  }),
  colonizationTarget("santiago|chile", "Santiago", "Chile", -33.45, -70.666667, COLONIAL_FOUNDING_SETTLER, 1541, "spain", {
    label: "Spanish settler capital",
    region: "chile",
    waterAccess: "inland",
    datasetFirstYear: 1657,
    datasetFirstPopulation: 4918,
    datasetSource: "chandler"
  }),
  colonizationTarget("potosi|bolivia", "Potosi", "Bolivia", -19.58361, -65.75306, COLONIAL_FOUNDING_SETTLER, 1545, "spain", {
    label: "Spanish mining boomtown",
    region: "upper-peru",
    waterAccess: "inland",
    datasetFirstYear: 1547,
    datasetFirstPopulation: 14000,
    datasetSource: "chandler",
    note: "Best created by a silver discovery rather than ordinary shore settlement."
  }),
  colonizationTarget("zacatecas|mexico", "Zacatecas", "Mexico", 22.76843, -102.58141, COLONIAL_FOUNDING_SETTLER, 1548, "spain", {
    label: "Spanish mining boomtown",
    region: "new-spain",
    waterAccess: "inland",
    datasetFirstYear: 1548,
    datasetFirstPopulation: 12000,
    datasetSource: "chandler"
  }),
  colonizationTarget("salvador|brazil", "Salvador", "Brazil", -12.97111, -38.51083, COLONIAL_FOUNDING_SETTLER, 1549, "portugal", {
    label: "Portuguese colonial capital",
    region: "brazil",
    waterAccess: "coastal",
    datasetFirstYear: 1549,
    datasetFirstPopulation: 1000,
    datasetSource: "chandler"
  }),
  colonizationTarget("concepcion|chile", "Concepcion", "Chile", -36.818938, -73.050319, COLONIAL_FOUNDING_SETTLER, 1550, "spain", {
    label: "Spanish Chilean port",
    region: "chile",
    waterAccess: "coastal",
    datasetFirstYear: 1900,
    datasetFirstPopulation: 53000,
    datasetSource: "chandler"
  }),
  colonizationTarget("sao paolo|brazil", "Sao Paolo", "Brazil", -23.5475, -46.63611, COLONIAL_FOUNDING_SETTLER, 1554, "portugal", {
    label: "Portuguese mission settlement",
    region: "brazil",
    waterAccess: "inland",
    datasetFirstYear: 1900,
    datasetFirstPopulation: 239000,
    datasetSource: "chandler",
    note: "Dataset spelling is Sao Paolo."
  }),
  colonizationTarget("rio de janeiro|brazil", "Rio de Janeiro", "Brazil", -22.90278, -43.2075, COLONIAL_FOUNDING_SETTLER, 1565, "portugal", {
    label: "Portuguese Brazil port",
    region: "brazil",
    waterAccess: "coastal",
    datasetFirstYear: 1700,
    datasetFirstPopulation: 20000,
    datasetSource: "chandler"
  }),
  colonizationTarget("st. augustine|united states of america", "St. Augustine", "United States of America", 29.9012, -81.3124, COLONIAL_FOUNDING_SETTLER, 1565, "spain", {
    label: "Spanish Florida colony",
    region: "florida",
    waterAccess: "coastal",
    datasetFirstYear: null,
    datasetSource: "manual-colonization-target"
  }),
  colonizationTarget("caracas|venezuela", "Caracas", "Venezuela", 10.48801, -66.87919, COLONIAL_FOUNDING_SETTLER, 1567, "spain", {
    label: "Spanish Venezuela city",
    region: "venezuela",
    waterAccess: "coastal",
    datasetFirstYear: 1607,
    datasetFirstPopulation: 3000,
    datasetSource: "chandler"
  }),
  colonizationTarget("manila|philippines", "Manila", "Philippines", 14.58, 121, COLONIAL_FOUNDING_CONQUERED, 1571, "spain", {
    label: "Spanish conquered capital",
    region: "spanish-east-indies",
    waterAccess: "coastal",
    precolonialName: "Maynila",
    datasetFirstYear: 1571,
    datasetFirstPopulation: 12000,
    datasetSource: "chandler"
  }),
  colonizationTarget("nagasaki|japan", "Nagasaki", "Japan", 32.752558, 129.878192, COLONIAL_FOUNDING_NEGOTIATED, 1571, "japan", {
    label: "Japanese port opened to Portuguese trade",
    preexistingSettlement: true,
    preexistingPopulation: 600,
    originFactionId: "portugal",
    originTerritoryId: "portugal",
    originCountry: "Portugal",
    approvalFactionId: "japan",
    approvalCargo: [
      { goodId: "matchlocks", quantity: 4 },
      { goodId: "gunpowder", quantity: 3 }
    ],
    initialImports: [
      { goodId: "matchlocks", quantity: 8 }
    ],
    foreignSettlementIds: ["portuguese-nagasaki"],
    region: "japan",
    waterAccess: "coastal",
    datasetFirstYear: 1583,
    datasetFirstPopulation: 25000,
    datasetSource: "chandler"
  }),
  colonizationTarget("huancavelica|peru", "Huancavelica", "Peru", -12.78542, -74.97501, COLONIAL_FOUNDING_SETTLER, 1572, "spain", {
    label: "Spanish mercury boomtown",
    region: "peru",
    waterAccess: "inland",
    datasetFirstYear: 1592,
    datasetFirstPopulation: 20000,
    datasetSource: "chandler",
    note: "Mercury site that can strengthen silver production."
  }),
  colonizationTarget("luanda|angola", "Luanda", "Angola", -8.838333, 13.23444, COLONIAL_FOUNDING_SETTLER, 1576, "portugal", {
    label: "Portuguese Atlantic port",
    region: "angola",
    waterAccess: "coastal",
    datasetFirstYear: 1600,
    datasetFirstPopulation: 30000,
    datasetSource: "chandler"
  }),
  colonizationTarget("buenos aires|argentina", "Buenos Aires", "Argentina", -34.61315, -58.37723, COLONIAL_FOUNDING_SETTLER, 1580, "spain", {
    label: "Spanish Rio de la Plata port",
    region: "rio-de-la-plata",
    waterAccess: "coastal",
    datasetFirstYear: 1602,
    datasetFirstPopulation: 500,
    datasetSource: "chandler"
  }),
  colonizationTarget("st. john's|canada", "St. John's", "Canada", 47.5615, -52.7126, COLONIAL_FOUNDING_SETTLER, 1583, "england", {
    label: "English Newfoundland fishing base",
    region: "newfoundland",
    waterAccess: "coastal",
    datasetFirstYear: 1583,
    datasetFirstPopulation: 2000,
    datasetSource: "manual_override_canada_ports"
  }),
  colonizationTarget("roanoke|united states of america", "Roanoke", "United States of America", 35.9358, -75.7085, COLONIAL_FOUNDING_SETTLER, 1587, "england", {
    label: "English Roanoke Island colony",
    region: "virginia",
    waterAccess: "island",
    aftermathId: "roanoke-lost-colony",
    datasetFirstYear: null,
    datasetSource: "manual-colonization-target"
  }),
  colonizationTarget("port royal|canada", "Port Royal", "Canada", 44.741944, -65.515556, COLONIAL_FOUNDING_SETTLER, 1605, "france", {
    label: "French Acadian colony",
    region: "acadia",
    waterAccess: "coastal",
    datasetFirstYear: null,
    datasetSource: "manual-colonization-target",
    note: "Can seed Acadia and early New France."
  }),
  colonizationTarget("jamestown|united states of america", "Jamestown", "United States of America", 37.2092, -76.7752, COLONIAL_FOUNDING_SETTLER, 1607, "england", {
    label: "English Virginia colony",
    region: "virginia",
    waterAccess: "river",
    datasetFirstYear: null,
    datasetSource: "manual-colonization-target"
  }),
  colonizationTarget("quebec|canada", "Quebec", "Canada", 46.81228, -71.21454, COLONIAL_FOUNDING_SETTLER, 1608, "france", {
    label: "French New France capital",
    region: "new-france",
    waterAccess: "river",
    datasetFirstYear: 1720,
    datasetFirstPopulation: 7000,
    datasetSource: "chandler"
  }),
  colonizationTarget("st. george's|bermuda", "St. George's", "Bermuda", 32.3794, -64.6778, COLONIAL_FOUNDING_SETTLER, 1612, "england", {
    label: "English Bermuda colony",
    region: "bermuda",
    waterAccess: "island",
    datasetFirstYear: null,
    datasetSource: "manual-colonization-target"
  }),
  colonizationTarget("fort orange|united states of america", "Fort Orange", "United States of America", 42.652578, -73.756233, COLONIAL_FOUNDING_NEGOTIATED, 1624, "burgundian-netherlands", {
    label: "Dutch negotiated trade post",
    historicalPower: "Dutch/Low Countries",
    originTerritoryId: "netherlands",
    originCountry: "Netherlands",
    region: "hudson-river",
    waterAccess: "river",
    datasetCityId: "albany|united states of america",
    datasetCity: "Albany",
    datasetCountry: "United States of America",
    datasetFirstYear: 1800,
    datasetFirstPopulation: 5389,
    datasetSource: "chandler"
  }),
  colonizationTarget("plymouth|united states of america", "Plymouth", "United States of America", 41.9584, -70.6673, COLONIAL_FOUNDING_SETTLER, 1620, "england", {
    label: "English New England colony",
    region: "new-england",
    waterAccess: "coastal",
    datasetFirstYear: null,
    datasetSource: "manual-colonization-target"
  }),
  colonizationTarget("new amsterdam|united states of america", "New Amsterdam", "United States of America", 40.714353, -74.005972, COLONIAL_FOUNDING_SETTLER, 1624, "burgundian-netherlands", {
    label: "Dutch settler colony",
    historicalPower: "Dutch/Low Countries",
    originTerritoryId: "netherlands",
    originCountry: "Netherlands",
    region: "new-netherland",
    waterAccess: "coastal",
    datasetCityId: "new york|united states of america",
    datasetCity: "New York",
    datasetCountry: "United States of America",
    datasetFirstYear: 1703,
    datasetFirstPopulation: 4436,
    datasetSource: "chandler"
  }),
  colonizationTarget("bridgetown|barbados", "Bridgetown", "Barbados", 13.0975, -59.6167, COLONIAL_FOUNDING_SETTLER, 1628, "england", {
    label: "English Caribbean sugar colony",
    region: "caribbean",
    waterAccess: "coastal",
    datasetFirstYear: null,
    datasetSource: "manual-colonization-target"
  }),
  colonizationTarget("boston|united states of america", "Boston", "United States of America", 42.358431, -71.059772, COLONIAL_FOUNDING_SETTLER, 1630, "england", {
    label: "English New England town",
    region: "new-england",
    waterAccess: "coastal",
    datasetFirstYear: 1700,
    datasetFirstPopulation: 6700,
    datasetSource: "chandler"
  }),
  colonizationTarget("trois-rivieres|canada", "Trois-Rivieres", "Canada", 46.3432, -72.543, COLONIAL_FOUNDING_SETTLER, 1634, "france", {
    label: "French New France settlement",
    region: "new-france",
    waterAccess: "river",
    datasetFirstYear: null,
    datasetSource: "manual-colonization-target"
  }),
  colonizationTarget("hartford|united states of america", "Hartford", "United States of America", 41.7658, -72.6734, COLONIAL_FOUNDING_SETTLER, 1635, "england", {
    label: "English Connecticut river town",
    region: "connecticut",
    waterAccess: "river",
    datasetFirstYear: null,
    datasetSource: "manual-colonization-target"
  }),
  colonizationTarget("providence|united states of america", "Providence", "United States of America", 41.824, -71.4128, COLONIAL_FOUNDING_SETTLER, 1636, "england", {
    label: "English Rhode Island colony",
    region: "new-england",
    waterAccess: "coastal",
    datasetFirstYear: null,
    datasetSource: "manual-colonization-target"
  }),
  colonizationTarget("new haven|united states of america", "New Haven", "United States of America", 41.3083, -72.9279, COLONIAL_FOUNDING_SETTLER, 1638, "england", {
    label: "English Connecticut port",
    region: "connecticut",
    waterAccess: "coastal",
    datasetFirstYear: null,
    datasetSource: "manual-colonization-target"
  }),
  colonizationTarget("ville-marie|canada", "Ville-Marie", "Canada", 45.50884, -73.58781, COLONIAL_FOUNDING_SETTLER, 1642, "france", {
    label: "French Montreal mission settlement",
    region: "new-france",
    waterAccess: "river",
    datasetCityId: "montreal|canada",
    datasetCity: "Montreal",
    datasetCountry: "Canada",
    datasetFirstYear: 1809,
    datasetFirstPopulation: 16000,
    datasetSource: "chandler"
  }),
  colonizationTarget("charleston|united states of america", "Charleston", "United States of America", 32.7833, -79.9333, COLONIAL_FOUNDING_SETTLER, 1670, "england", {
    label: "English Carolina port",
    region: "carolina",
    waterAccess: "coastal",
    datasetFirstYear: 1800,
    datasetFirstPopulation: 18844,
    datasetSource: "chandler"
  }),
  colonizationTarget("philadelphia|united states of america", "Philadelphia", "United States of America", 39.95, -75.1667, COLONIAL_FOUNDING_SETTLER, 1682, "england", {
    label: "English Delaware river city",
    region: "delaware",
    waterAccess: "river",
    datasetFirstYear: 1700,
    datasetFirstPopulation: 4400,
    datasetSource: "chandler"
  })
]);

const COLONIAL_FOUNDING_TYPE_SET = new Set(COLONIAL_FOUNDING_TYPES);
const COLONIAL_CITY_FOUNDINGS_BY_KEY = new Map(COLONIAL_CITY_FOUNDINGS.map((entry) => [
  entry.cityId,
  entry
]));
const COLONIZATION_TARGETS_BY_KEY = buildColonizationTargetMap();
const LEGACY_COLONIZATION_TARGET_CITY_IDS = new Map(COLONIZATION_TARGETS.map((target) => [
  legacyColonizationTargetKey(target.city, target.country),
  target.cityId
]));

if (LEGACY_COLONIZATION_TARGET_CITY_IDS.size !== COLONIZATION_TARGETS.length) {
  throw new Error("Colonization targets contain duplicate legacy presentation identities");
}

if (COLONIAL_CITY_FOUNDINGS_BY_KEY.size !== COLONIAL_CITY_FOUNDINGS.length) {
  throw new Error("Colonial city registry contains duplicate city keys");
}

for (const entry of COLONIAL_CITY_FOUNDINGS) {
  if (!COLONIAL_FOUNDING_TYPE_SET.has(entry.type)) {
    throw new Error(`Invalid colonial founding type: ${entry.type}`);
  }
}

for (const target of COLONIZATION_TARGETS) {
  if (!COLONIAL_FOUNDING_TYPE_SET.has(target.type)) {
    throw new Error(`Invalid colonization target type: ${target.type}`);
  }
}

export function colonialFoundingForCity(city) {
  if (!city || typeof city !== "object") return null;
  if (!nonEmptyString(city.cityId)) return null;
  return COLONIAL_CITY_FOUNDINGS_BY_KEY.get(city.cityId) || null;
}

export function colonizationTargetForCity(city) {
  if (!city || typeof city !== "object") return null;
  if (!nonEmptyString(city.cityId)) return null;
  return COLONIZATION_TARGETS_BY_KEY.get(city.cityId) || null;
}

// IDENTITY_MIGRATION_EXCEPTION: released saves before game-state v93 stored
// colonization targets as presentation text. Resolve that text exactly once at
// the load boundary; current runtime state must use cityId.
export function legacyColonizationTargetCityId(city, country) {
  const cityId = LEGACY_COLONIZATION_TARGET_CITY_IDS.get(
    legacyColonizationTargetKey(city, country)
  );
  if (!cityId) throw new Error(`Legacy colonization target does not resolve: ${city}, ${country}`);
  return cityId;
}

export function withColonialFounding(cityRecord) {
  const colonialFounding = colonialFoundingForCity(cityRecord);
  return colonialFounding ? { ...cityRecord, colonialFounding } : cityRecord;
}

function colonialFounding(cityId, city, country, type, year, factionId, details = {}) {
  if (!COLONIAL_FOUNDING_TYPES.includes(type)) throw new Error(`Invalid colonial founding type: ${type}`);
  if (!Number.isInteger(year) || year <= 0) throw new Error(`Invalid colonial founding year: ${city}`);
  return Object.freeze({
    cityId,
    city,
    country,
    type,
    year,
    factionId,
    label: details.label || type,
    precolonialName: details.precolonialName || null,
    note: details.note || ""
  });
}

function colonizationTarget(cityId, city, country, lat, lon, type, year, factionId, details = {}) {
  if (!COLONIAL_FOUNDING_TYPES.includes(type)) throw new Error(`Invalid colonization target type: ${type}`);
  if (!Number.isInteger(year) || year <= 1522) throw new Error(`Invalid colonization target year: ${city}`);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) throw new Error(`Invalid colonization target coordinates: ${city}`);
  const datasetFirstYear = details.datasetFirstYear ?? null;
  const preexistingSettlement = details.preexistingSettlement === true;
  const preexistingPopulation = details.preexistingPopulation ?? null;
  if (datasetFirstYear !== null && (!Number.isInteger(datasetFirstYear) || datasetFirstYear < year)) {
    throw new Error(`Invalid colonization target dataset year: ${city}`);
  }
  if (preexistingSettlement && (!Number.isInteger(preexistingPopulation) || preexistingPopulation <= 0)) {
    throw new Error(`Existing colonization settlement needs a population: ${city}`);
  }
  if (!preexistingSettlement && preexistingPopulation !== null) {
    throw new Error(`New colonization target cannot have an existing population: ${city}`);
  }
  const cityType = details.cityType || colonizationCityType(type, factionId, cityId);
  const aftermathId = details.aftermathId ?? null;
  if (aftermathId !== null && !/^[a-z0-9][a-z0-9-]*$/.test(aftermathId)) {
    throw new Error(`Invalid colonization aftermath id: ${city}`);
  }
  return Object.freeze({
    cityId,
    city,
    country,
    lat,
    lon,
    type,
    year,
    canFoundFromYear: details.canFoundFromYear || 1522,
    factionId,
    preexistingSettlement,
    preexistingPopulation,
    originFactionId: details.originFactionId || factionId,
    originTerritoryId: details.originTerritoryId || null,
    originCountry: details.originCountry || null,
    aftermathId,
    approvalFactionId: details.approvalFactionId || null,
    approvalCargo: colonizationApprovalCargo(details.approvalCargo),
    initialImports: colonizationInitialImports(details.initialImports),
    foreignSettlementIds: colonizationForeignSettlementIds(details.foreignSettlementIds),
    historicalPower: details.historicalPower || null,
    label: details.label || type,
    region: details.region || null,
    waterAccess: details.waterAccess || "coastal",
    cityType,
    economyRegion: colonizationEconomyRegion(details.region, details.waterAccess || "coastal", cityType),
    precolonialName: details.precolonialName || null,
    datasetCityId: details.datasetCityId || cityId,
    datasetCity: details.datasetCity || city,
    datasetCountry: details.datasetCountry || country,
    datasetFirstYear,
    datasetFirstPopulation: details.datasetFirstPopulation || null,
    datasetSource: details.datasetSource || null,
    note: details.note || ""
  });
}

function colonizationEconomyRegion(region, waterAccess, cityType) {
  if (region === "peru") return waterAccess === "coastal" ? "andean-coast" : "andean";
  const economyRegion = COLONIZATION_ECONOMY_REGION_BY_REGION[region];
  if (!economyRegion) {
    throw new Error(`Colonization target needs an economy region mapping: ${region || cityType}`);
  }
  return economyRegion;
}

function colonizationForeignSettlementIds(value) {
  if (value === undefined) return Object.freeze([]);
  if (!Array.isArray(value)) throw new Error("Colonization foreign settlement ids must be an array");
  const ids = value.map((entry) => {
    if (typeof entry !== "string" || entry === "") {
      throw new Error(`Invalid colonization foreign settlement id: ${entry}`);
    }
    return entry;
  });
  if (new Set(ids).size !== ids.length) {
    throw new Error("Colonization foreign settlement ids must be unique");
  }
  return Object.freeze(ids);
}

function colonizationApprovalCargo(value) {
  if (value === undefined) return Object.freeze([]);
  if (!Array.isArray(value)) throw new Error("Colonization approval cargo must be an array");
  const seen = new Set();
  return Object.freeze(value.map((entry) => {
    if (!entry || !/^[a-z0-9][a-z0-9-]*$/.test(entry.goodId) ||
        !Number.isInteger(entry.quantity) || entry.quantity <= 0) {
      throw new Error(`Invalid colonization approval cargo: ${entry?.goodId || "missing"}`);
    }
    if (seen.has(entry.goodId)) throw new Error(`Duplicate colonization approval cargo: ${entry.goodId}`);
    seen.add(entry.goodId);
    return Object.freeze({ goodId: entry.goodId, quantity: entry.quantity });
  }));
}

function colonizationInitialImports(value) {
  if (value === undefined) return Object.freeze([]);
  if (!Array.isArray(value)) throw new Error("Colonization initial imports must be an array");
  const seen = new Set();
  return Object.freeze(value.map((entry) => {
    if (!entry || !/^[a-z0-9][a-z0-9-]*$/.test(entry.goodId) ||
        !Number.isInteger(entry.quantity) || entry.quantity <= 0) {
      throw new Error(`Invalid colonization initial import: ${entry?.goodId || "missing"}`);
    }
    if (seen.has(entry.goodId)) throw new Error(`Duplicate colonization initial import: ${entry.goodId}`);
    seen.add(entry.goodId);
    return Object.freeze({ goodId: entry.goodId, quantity: entry.quantity });
  }));
}

function buildColonizationTargetMap() {
  const map = new Map();
  for (const target of COLONIZATION_TARGETS) {
    addTargetKey(map, target.cityId, target);
    addTargetKey(map, target.datasetCityId, target);
  }
  return map;
}

function addTargetKey(map, key, target) {
  const prev = map.get(key);
  if (prev && prev !== target) throw new Error(`Colonization target registry contains duplicate id: ${key}`);
  map.set(key, target);
}

function legacyColonizationTargetKey(city, country) {
  if (!nonEmptyString(city) || !nonEmptyString(country)) {
    throw new Error("Legacy colonization target requires city and country text");
  }
  return `${city}\u0000${country}`;
}

function colonizationCityType(type, factionId, cityId) {
  const territoryId = cityTerritoryId({ cityId }, "Colonization target");
  if (territoryId === "japan") return "east-asian";
  if (territoryId === "philippines") return "southeast-asian";
  if (["peru", "bolivia", "chile"].includes(territoryId)) return "andean";
  if (territoryId === "mexico") return "mesoamerican";
  if (type === COLONIAL_FOUNDING_CONQUERED) return localCityTypeForTerritory(territoryId);
  if (factionId === "spain" || factionId === "portugal") return "mediterranean";
  if (["france", "england", "burgundian-netherlands", "habsburg"].includes(factionId)) {
    return "northern-european";
  }
  return localCityTypeForTerritory(territoryId);
}

function localCityTypeForTerritory(territoryId) {
  if (territoryId === "angola") return "sub-saharan";
  if (["brazil", "venezuela", "paraguay", "argentina"].includes(territoryId)) {
    return "mediterranean";
  }
  return "northern-european";
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}
