export const COLONIAL_FOUNDING_CONQUERED = "conquered-city";
export const COLONIAL_FOUNDING_NEGOTIATED = "negotiated-settlement";
export const COLONIAL_FOUNDING_SETTLER = "settler-colony";

export const COLONIAL_FOUNDING_TYPES = Object.freeze([
  COLONIAL_FOUNDING_CONQUERED,
  COLONIAL_FOUNDING_NEGOTIATED,
  COLONIAL_FOUNDING_SETTLER
]);

export const COLONIAL_CITY_FOUNDINGS = Object.freeze([
  colonialFounding("Santo Domingo", "Dominican Republic", COLONIAL_FOUNDING_SETTLER, 1496, "spain", {
    label: "Spanish settler colony",
    note: "Older Caribbean colonial base, useful as a pre-1522 reference point."
  }),
  colonialFounding("Nombre de Dios", "Panama", COLONIAL_FOUNDING_SETTLER, 1510, "spain", {
    label: "Spanish settler colony",
    note: "Early Caribbean/Panama staging port."
  }),
  colonialFounding("Goa", "India", COLONIAL_FOUNDING_CONQUERED, 1510, "portugal", {
    label: "Portuguese conquered city",
    note: "Existing Indian Ocean city taken by force and made a Portuguese capital."
  }),
  colonialFounding("Mozambique Island", "Mozambique", COLONIAL_FOUNDING_NEGOTIATED, 1507, "portugal", {
    label: "Portuguese negotiated trade base",
    note: "Older Swahili settlement used as a Portuguese port and naval base."
  }),
  colonialFounding("Havana", "Cuba", COLONIAL_FOUNDING_SETTLER, 1519, "spain", {
    label: "Spanish settler colony",
    note: "New Spanish Caribbean port."
  }),
  colonialFounding("Veracruz", "Mexico", COLONIAL_FOUNDING_SETTLER, 1519, "spain", {
    label: "Spanish settler colony",
    note: "Spanish Gulf port founded during the conquest of Mexico."
  }),
  colonialFounding("Panama City", "Panama", COLONIAL_FOUNDING_SETTLER, 1519, "spain", {
    label: "Spanish settler colony",
    note: "Pacific-side Spanish administrative and shipping base."
  }),
  colonialFounding("Mexico City", "Mexico", COLONIAL_FOUNDING_CONQUERED, 1521, "spain", {
    label: "Spanish conquered capital",
    precolonialName: "Tenochtitlan",
    note: "Existing Mexica capital conquered and refounded as Mexico City."
  }),
  colonialFounding("Quito", "Ecuador", COLONIAL_FOUNDING_CONQUERED, 1534, "spain", {
    label: "Spanish conquered city",
    note: "Andean city refounded after Spanish conquest."
  }),
  colonialFounding("Lima", "Peru", COLONIAL_FOUNDING_SETTLER, 1535, "spain", {
    label: "Spanish settler colony",
    note: "New Spanish administrative capital for Peru."
  }),
  colonialFounding("Diu", "India", COLONIAL_FOUNDING_NEGOTIATED, 1535, "portugal", {
    label: "Portuguese negotiated fortress",
    note: "Portuguese position established by treaty in an existing Gujarati port."
  }),
  colonialFounding("Asuncion", "Paraguay", COLONIAL_FOUNDING_SETTLER, 1537, "spain", {
    label: "Spanish settler colony",
    note: "Riverine Spanish settlement in the Paraguay basin."
  }),
  colonialFounding("Recife", "Brazil", COLONIAL_FOUNDING_SETTLER, 1537, "portugal", {
    label: "Portuguese settler colony",
    note: "Sugar-port settlement on the Pernambuco coast."
  }),
  colonialFounding("Bogota", "Columbia", COLONIAL_FOUNDING_CONQUERED, 1538, "spain", {
    label: "Spanish conquered city",
    precolonialName: "Bacata",
    note: "New Granada city founded after conquest; dataset country spelling is Columbia."
  }),
  colonialFounding("Ayacucho", "Peru", COLONIAL_FOUNDING_SETTLER, 1540, "spain", {
    label: "Spanish settler colony",
    note: "Spanish Andean town."
  }),
  colonialFounding("Santiago", "Chile", COLONIAL_FOUNDING_SETTLER, 1541, "spain", {
    label: "Spanish settler colony",
    note: "Spanish Chilean capital."
  }),
  colonialFounding("Potosi", "Bolivia", COLONIAL_FOUNDING_SETTLER, 1545, "spain", {
    label: "Spanish mining colony",
    note: "Silver mining city with major economic significance."
  }),
  colonialFounding("Zacatecas", "Mexico", COLONIAL_FOUNDING_SETTLER, 1548, "spain", {
    label: "Spanish mining colony",
    note: "Northern Mexican silver city."
  }),
  colonialFounding("Salvador", "Brazil", COLONIAL_FOUNDING_SETTLER, 1549, "portugal", {
    label: "Portuguese settler colony",
    note: "First capital of colonial Brazil."
  }),
  colonialFounding("Concepcion", "Chile", COLONIAL_FOUNDING_SETTLER, 1550, "spain", {
    label: "Spanish settler colony",
    note: "Spanish coastal settlement in Chile."
  }),
  colonialFounding("Sao Paolo", "Brazil", COLONIAL_FOUNDING_SETTLER, 1554, "portugal", {
    label: "Portuguese settler colony",
    note: "Mission settlement; dataset spelling is Sao Paolo."
  }),
  colonialFounding("Rio de Janeiro", "Brazil", COLONIAL_FOUNDING_SETTLER, 1565, "portugal", {
    label: "Portuguese settler colony",
    note: "Portuguese Brazil port city."
  }),
  colonialFounding("Caracas", "Venezuela", COLONIAL_FOUNDING_SETTLER, 1567, "spain", {
    label: "Spanish settler colony",
    note: "Spanish Venezuela settlement."
  }),
  colonialFounding("Manila", "Philippines", COLONIAL_FOUNDING_CONQUERED, 1571, "spain", {
    label: "Spanish conquered city",
    precolonialName: "Maynila",
    note: "Existing Tagalog port conquered and made capital of the Spanish East Indies."
  }),
  colonialFounding("Nagasaki", "Japan", COLONIAL_FOUNDING_NEGOTIATED, 1571, "japan", {
    label: "Japanese port opened to Portuguese trade",
    note: "Planned by Jesuits and Omura Sumitada under Japanese authority for the Portuguese China trade."
  }),
  colonialFounding("Huancavelica", "Peru", COLONIAL_FOUNDING_SETTLER, 1572, "spain", {
    label: "Spanish mining colony",
    note: "Mercury mining city feeding the silver economy."
  }),
  colonialFounding("Luanda", "Angola", COLONIAL_FOUNDING_SETTLER, 1576, "portugal", {
    label: "Portuguese settler colony",
    note: "Portuguese Atlantic Africa port."
  }),
  colonialFounding("Buenos Aires", "Argentina", COLONIAL_FOUNDING_SETTLER, 1580, "spain", {
    label: "Spanish settler colony",
    note: "Rio de la Plata port settlement."
  }),
  colonialFounding("St. John's", "Canada", COLONIAL_FOUNDING_SETTLER, 1583, "england", {
    label: "English settler/fishing colony",
    note: "Newfoundland claim and fishing base; useful for North Atlantic colonization."
  })
]);

export const COLONIZATION_TARGETS = Object.freeze([
  colonizationTarget("Lima", "Peru", -12.04318, -77.02824, COLONIAL_FOUNDING_SETTLER, 1535, "spain", {
    label: "Spanish settler capital",
    region: "peru",
    waterAccess: "coastal",
    datasetFirstYear: 1700,
    datasetFirstPopulation: 37259,
    datasetSource: "chandler",
    note: "Future Peru capital; dataset gives a later city row but the site is absent in 1522."
  }),
  colonizationTarget("Recife", "Brazil", -8.05389, -34.88111, COLONIAL_FOUNDING_SETTLER, 1537, "portugal", {
    label: "Portuguese sugar port",
    region: "brazil",
    waterAccess: "coastal",
    datasetFirstYear: 1635,
    datasetFirstPopulation: 7000,
    datasetSource: "chandler"
  }),
  colonizationTarget("Asuncion", "Paraguay", -25.30066, -57.63591, COLONIAL_FOUNDING_SETTLER, 1537, "spain", {
    label: "Spanish river colony",
    region: "rio-de-la-plata",
    waterAccess: "river",
    datasetFirstYear: 1640,
    datasetFirstPopulation: 4000,
    datasetSource: "chandler"
  }),
  colonizationTarget("Ayacucho", "Peru", -13.1615, -74.22154, COLONIAL_FOUNDING_SETTLER, 1540, "spain", {
    label: "Spanish Andean town",
    region: "peru",
    waterAccess: "inland",
    datasetFirstYear: 1574,
    datasetFirstPopulation: 13000,
    datasetSource: "chandler"
  }),
  colonizationTarget("Santiago", "Chile", -33.45, -70.666667, COLONIAL_FOUNDING_SETTLER, 1541, "spain", {
    label: "Spanish settler capital",
    region: "chile",
    waterAccess: "inland",
    datasetFirstYear: 1657,
    datasetFirstPopulation: 4918,
    datasetSource: "chandler"
  }),
  colonizationTarget("Potosi", "Bolivia", -19.58361, -65.75306, COLONIAL_FOUNDING_SETTLER, 1545, "spain", {
    label: "Spanish mining boomtown",
    region: "upper-peru",
    waterAccess: "inland",
    datasetFirstYear: 1547,
    datasetFirstPopulation: 14000,
    datasetSource: "chandler",
    note: "Best created by a silver discovery rather than ordinary shore settlement."
  }),
  colonizationTarget("Zacatecas", "Mexico", 22.76843, -102.58141, COLONIAL_FOUNDING_SETTLER, 1548, "spain", {
    label: "Spanish mining boomtown",
    region: "new-spain",
    waterAccess: "inland",
    datasetFirstYear: 1548,
    datasetFirstPopulation: 12000,
    datasetSource: "chandler"
  }),
  colonizationTarget("Salvador", "Brazil", -12.97111, -38.51083, COLONIAL_FOUNDING_SETTLER, 1549, "portugal", {
    label: "Portuguese colonial capital",
    region: "brazil",
    waterAccess: "coastal",
    datasetFirstYear: 1549,
    datasetFirstPopulation: 1000,
    datasetSource: "chandler"
  }),
  colonizationTarget("Concepcion", "Chile", -36.818938, -73.050319, COLONIAL_FOUNDING_SETTLER, 1550, "spain", {
    label: "Spanish Chilean port",
    region: "chile",
    waterAccess: "coastal",
    datasetFirstYear: 1900,
    datasetFirstPopulation: 53000,
    datasetSource: "chandler"
  }),
  colonizationTarget("Sao Paolo", "Brazil", -23.5475, -46.63611, COLONIAL_FOUNDING_SETTLER, 1554, "portugal", {
    label: "Portuguese mission settlement",
    region: "brazil",
    waterAccess: "inland",
    datasetFirstYear: 1900,
    datasetFirstPopulation: 239000,
    datasetSource: "chandler",
    note: "Dataset spelling is Sao Paolo."
  }),
  colonizationTarget("Rio de Janeiro", "Brazil", -22.90278, -43.2075, COLONIAL_FOUNDING_SETTLER, 1565, "portugal", {
    label: "Portuguese Brazil port",
    region: "brazil",
    waterAccess: "coastal",
    datasetFirstYear: 1700,
    datasetFirstPopulation: 20000,
    datasetSource: "chandler"
  }),
  colonizationTarget("St. Augustine", "United States of America", 29.9012, -81.3124, COLONIAL_FOUNDING_SETTLER, 1565, "spain", {
    label: "Spanish Florida colony",
    region: "florida",
    waterAccess: "coastal",
    datasetFirstYear: null,
    datasetSource: "manual-colonization-target"
  }),
  colonizationTarget("Caracas", "Venezuela", 10.48801, -66.87919, COLONIAL_FOUNDING_SETTLER, 1567, "spain", {
    label: "Spanish Venezuela city",
    region: "venezuela",
    waterAccess: "coastal",
    datasetFirstYear: 1607,
    datasetFirstPopulation: 3000,
    datasetSource: "chandler"
  }),
  colonizationTarget("Manila", "Philippines", 14.58, 121, COLONIAL_FOUNDING_CONQUERED, 1571, "spain", {
    label: "Spanish conquered capital",
    region: "spanish-east-indies",
    waterAccess: "coastal",
    precolonialName: "Maynila",
    datasetFirstYear: 1571,
    datasetFirstPopulation: 12000,
    datasetSource: "chandler"
  }),
  colonizationTarget("Nagasaki", "Japan", 32.752558, 129.878192, COLONIAL_FOUNDING_NEGOTIATED, 1571, "japan", {
    label: "Japanese port opened to Portuguese trade",
    originFactionId: "portugal",
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
  colonizationTarget("Huancavelica", "Peru", -12.78542, -74.97501, COLONIAL_FOUNDING_SETTLER, 1572, "spain", {
    label: "Spanish mercury boomtown",
    region: "peru",
    waterAccess: "inland",
    datasetFirstYear: 1592,
    datasetFirstPopulation: 20000,
    datasetSource: "chandler",
    note: "Mercury site that can strengthen silver production."
  }),
  colonizationTarget("Luanda", "Angola", -8.838333, 13.23444, COLONIAL_FOUNDING_SETTLER, 1576, "portugal", {
    label: "Portuguese Atlantic port",
    region: "angola",
    waterAccess: "coastal",
    datasetFirstYear: 1600,
    datasetFirstPopulation: 30000,
    datasetSource: "chandler"
  }),
  colonizationTarget("Buenos Aires", "Argentina", -34.61315, -58.37723, COLONIAL_FOUNDING_SETTLER, 1580, "spain", {
    label: "Spanish Rio de la Plata port",
    region: "rio-de-la-plata",
    waterAccess: "coastal",
    datasetFirstYear: 1602,
    datasetFirstPopulation: 500,
    datasetSource: "chandler"
  }),
  colonizationTarget("St. John's", "Canada", 47.5615, -52.7126, COLONIAL_FOUNDING_SETTLER, 1583, "england", {
    label: "English Newfoundland fishing base",
    region: "newfoundland",
    waterAccess: "coastal",
    datasetFirstYear: 1583,
    datasetFirstPopulation: 2000,
    datasetSource: "manual_override_canada_ports"
  }),
  colonizationTarget("Port Royal", "Canada", 44.741944, -65.515556, COLONIAL_FOUNDING_SETTLER, 1605, "france", {
    label: "French Acadian colony",
    region: "acadia",
    waterAccess: "coastal",
    datasetFirstYear: null,
    datasetSource: "manual-colonization-target",
    note: "Can seed Acadia and early New France."
  }),
  colonizationTarget("Jamestown", "United States of America", 37.2092, -76.7752, COLONIAL_FOUNDING_SETTLER, 1607, "england", {
    label: "English Virginia colony",
    region: "virginia",
    waterAccess: "river",
    datasetFirstYear: null,
    datasetSource: "manual-colonization-target"
  }),
  colonizationTarget("Quebec", "Canada", 46.81228, -71.21454, COLONIAL_FOUNDING_SETTLER, 1608, "france", {
    label: "French New France capital",
    region: "new-france",
    waterAccess: "river",
    datasetFirstYear: 1720,
    datasetFirstPopulation: 7000,
    datasetSource: "chandler"
  }),
  colonizationTarget("St. George's", "Bermuda", 32.3794, -64.6778, COLONIAL_FOUNDING_SETTLER, 1612, "england", {
    label: "English Bermuda colony",
    region: "bermuda",
    waterAccess: "island",
    datasetFirstYear: null,
    datasetSource: "manual-colonization-target"
  }),
  colonizationTarget("Fort Orange", "United States of America", 42.652578, -73.756233, COLONIAL_FOUNDING_NEGOTIATED, 1624, "habsburg", {
    label: "Dutch negotiated trade post",
    historicalPower: "Dutch/Low Countries",
    originCountry: "Netherlands",
    region: "hudson-river",
    waterAccess: "river",
    datasetCity: "Albany",
    datasetCountry: "United States of America",
    datasetFirstYear: 1800,
    datasetFirstPopulation: 5389,
    datasetSource: "chandler"
  }),
  colonizationTarget("Plymouth", "United States of America", 41.9584, -70.6673, COLONIAL_FOUNDING_SETTLER, 1620, "england", {
    label: "English New England colony",
    region: "new-england",
    waterAccess: "coastal",
    datasetFirstYear: null,
    datasetSource: "manual-colonization-target"
  }),
  colonizationTarget("New Amsterdam", "United States of America", 40.714353, -74.005972, COLONIAL_FOUNDING_SETTLER, 1624, "habsburg", {
    label: "Dutch settler colony",
    historicalPower: "Dutch/Low Countries",
    originCountry: "Netherlands",
    region: "new-netherland",
    waterAccess: "coastal",
    datasetCity: "New York",
    datasetCountry: "United States of America",
    datasetFirstYear: 1703,
    datasetFirstPopulation: 4436,
    datasetSource: "chandler"
  }),
  colonizationTarget("Bridgetown", "Barbados", 13.0975, -59.6167, COLONIAL_FOUNDING_SETTLER, 1628, "england", {
    label: "English Caribbean sugar colony",
    region: "caribbean",
    waterAccess: "coastal",
    datasetFirstYear: null,
    datasetSource: "manual-colonization-target"
  }),
  colonizationTarget("Boston", "United States of America", 42.358431, -71.059772, COLONIAL_FOUNDING_SETTLER, 1630, "england", {
    label: "English New England town",
    region: "new-england",
    waterAccess: "coastal",
    datasetFirstYear: 1700,
    datasetFirstPopulation: 6700,
    datasetSource: "chandler"
  }),
  colonizationTarget("Trois-Rivieres", "Canada", 46.3432, -72.543, COLONIAL_FOUNDING_SETTLER, 1634, "france", {
    label: "French New France settlement",
    region: "new-france",
    waterAccess: "river",
    datasetFirstYear: null,
    datasetSource: "manual-colonization-target"
  }),
  colonizationTarget("Hartford", "United States of America", 41.7658, -72.6734, COLONIAL_FOUNDING_SETTLER, 1635, "england", {
    label: "English Connecticut river town",
    region: "connecticut",
    waterAccess: "river",
    datasetFirstYear: null,
    datasetSource: "manual-colonization-target"
  }),
  colonizationTarget("Providence", "United States of America", 41.824, -71.4128, COLONIAL_FOUNDING_SETTLER, 1636, "england", {
    label: "English Rhode Island colony",
    region: "new-england",
    waterAccess: "coastal",
    datasetFirstYear: null,
    datasetSource: "manual-colonization-target"
  }),
  colonizationTarget("New Haven", "United States of America", 41.3083, -72.9279, COLONIAL_FOUNDING_SETTLER, 1638, "england", {
    label: "English Connecticut port",
    region: "connecticut",
    waterAccess: "coastal",
    datasetFirstYear: null,
    datasetSource: "manual-colonization-target"
  }),
  colonizationTarget("Ville-Marie", "Canada", 45.50884, -73.58781, COLONIAL_FOUNDING_SETTLER, 1642, "france", {
    label: "French Montreal mission settlement",
    region: "new-france",
    waterAccess: "river",
    datasetCity: "Montreal",
    datasetCountry: "Canada",
    datasetFirstYear: 1809,
    datasetFirstPopulation: 16000,
    datasetSource: "chandler"
  }),
  colonizationTarget("Charleston", "United States of America", 32.7833, -79.9333, COLONIAL_FOUNDING_SETTLER, 1670, "england", {
    label: "English Carolina port",
    region: "carolina",
    waterAccess: "coastal",
    datasetFirstYear: 1800,
    datasetFirstPopulation: 18844,
    datasetSource: "chandler"
  }),
  colonizationTarget("Philadelphia", "United States of America", 39.95, -75.1667, COLONIAL_FOUNDING_SETTLER, 1682, "england", {
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
  colonialCityKey(entry.city, entry.country),
  entry
]));
const COLONIZATION_TARGETS_BY_KEY = buildColonizationTargetMap();

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
  if (!nonEmptyString(city.city) || !nonEmptyString(city.country)) return null;
  return COLONIAL_CITY_FOUNDINGS_BY_KEY.get(colonialCityKey(city.city, city.country)) || null;
}

export function colonizationTargetForCity(city) {
  if (!city || typeof city !== "object") return null;
  if (!nonEmptyString(city.city) || !nonEmptyString(city.country)) return null;
  return COLONIZATION_TARGETS_BY_KEY.get(colonialCityKey(city.city, city.country)) || null;
}

export function withColonialFounding(cityRecord) {
  const colonialFounding = colonialFoundingForCity(cityRecord);
  return colonialFounding ? { ...cityRecord, colonialFounding } : cityRecord;
}

function colonialFounding(city, country, type, year, factionId, details = {}) {
  if (!COLONIAL_FOUNDING_TYPES.includes(type)) throw new Error(`Invalid colonial founding type: ${type}`);
  if (!Number.isInteger(year) || year <= 0) throw new Error(`Invalid colonial founding year: ${city}`);
  return Object.freeze({
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

function colonizationTarget(city, country, lat, lon, type, year, factionId, details = {}) {
  if (!COLONIAL_FOUNDING_TYPES.includes(type)) throw new Error(`Invalid colonization target type: ${type}`);
  if (!Number.isInteger(year) || year <= 1522) throw new Error(`Invalid colonization target year: ${city}`);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) throw new Error(`Invalid colonization target coordinates: ${city}`);
  const datasetFirstYear = details.datasetFirstYear ?? null;
  if (datasetFirstYear !== null && (!Number.isInteger(datasetFirstYear) || datasetFirstYear < year)) {
    throw new Error(`Invalid colonization target dataset year: ${city}`);
  }
  return Object.freeze({
    city,
    country,
    lat,
    lon,
    type,
    year,
    canFoundFromYear: details.canFoundFromYear || 1522,
    factionId,
    originFactionId: details.originFactionId || factionId,
    originCountry: details.originCountry || null,
    approvalFactionId: details.approvalFactionId || null,
    approvalCargo: colonizationApprovalCargo(details.approvalCargo),
    initialImports: colonizationInitialImports(details.initialImports),
    foreignSettlementIds: colonizationForeignSettlementIds(details.foreignSettlementIds),
    historicalPower: details.historicalPower || null,
    label: details.label || type,
    region: details.region || null,
    waterAccess: details.waterAccess || "coastal",
    cityType: details.cityType || colonizationCityType(type, factionId, country),
    precolonialName: details.precolonialName || null,
    datasetCity: details.datasetCity || city,
    datasetCountry: details.datasetCountry || country,
    datasetFirstYear,
    datasetFirstPopulation: details.datasetFirstPopulation || null,
    datasetSource: details.datasetSource || null,
    note: details.note || ""
  });
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
    addTargetKey(map, target.city, target.country, target);
    addTargetKey(map, target.datasetCity, target.datasetCountry, target);
  }
  return map;
}

function addTargetKey(map, city, country, target) {
  const key = colonialCityKey(city, country);
  const prev = map.get(key);
  if (prev && prev !== target) throw new Error(`Colonization target registry contains duplicate key: ${city}, ${country}`);
  map.set(key, target);
}

function colonizationCityType(type, factionId, country) {
  if (country === "Japan") return "east-asian";
  if (country === "Philippines") return "southeast-asian";
  if (["Peru", "Bolivia", "Chile"].includes(country)) return "andean";
  if (country === "Mexico") return "mesoamerican";
  if (type === COLONIAL_FOUNDING_CONQUERED) return localCityTypeForCountry(country);
  if (factionId === "spain" || factionId === "portugal") return "mediterranean";
  if (factionId === "france" || factionId === "england" || factionId === "habsburg") return "northern-european";
  return localCityTypeForCountry(country);
}

function localCityTypeForCountry(country) {
  if (country === "Angola") return "sub-saharan";
  if (country === "Brazil" || country === "Venezuela" || country === "Paraguay" || country === "Argentina") {
    return "mediterranean";
  }
  return "northern-european";
}

function colonialCityKey(city, country) {
  return `${city.trim().toLowerCase()}|${country.trim().toLowerCase()}`;
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}
