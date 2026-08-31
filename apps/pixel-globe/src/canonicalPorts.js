import { requireCityId } from "./entityIds.js";

function canonicalPort(id, cityId, city, country) {
  if (typeof id !== "string" || !/^[a-z0-9-]+$/.test(id)) {
    throw new Error(`Invalid canonical port id: ${id}`);
  }
  if (typeof city !== "string" || city.trim() === "" ||
      typeof country !== "string" || country.trim() === "") {
    throw new Error(`Canonical port ${id} requires a city and country`);
  }
  if (typeof cityId !== "string" || cityId.trim() === "") {
    throw new Error(`Canonical port ${id} requires a canonical city id`);
  }
  return Object.freeze({ id, cityId, city: city.trim(), country: country.trim() });
}

export const CANONICAL_PORTS = Object.freeze({
  ADEN: canonicalPort("aden", "aden|yemen", "Aden", "Yemen"),
  AGRA: canonicalPort("agra", "agra|india", "Agra", "India"),
  ALGIERS: canonicalPort("algiers", "algiers|algeria", "Algiers", "Algeria"),
  BAGHDAD: canonicalPort("baghdad", "baghdad|iraq", "Baghdad", "Iraq"),
  BANDA_VILLAGE: canonicalPort("banda-village", "banda village|indonesia", "Banda Village", "Indonesia"),
  BARCELONA: canonicalPort("barcelona", "barcelona|spain", "Barcelona", "Spain"),
  BEIJING: canonicalPort("beijing", "beijing|china", "Beijing", "China"),
  BIRGU: canonicalPort("birgu", "birgu|malta", "Birgu", "Malta"),
  BORDEAUX: canonicalPort("bordeaux", "bordeaux|france", "Bordeaux", "France"),
  BREMEN: canonicalPort("bremen", "bremen|germany", "Bremen", "Germany"),
  BUDAPEST: canonicalPort("budapest", "budapest|hungary", "Budapest", "Hungary"),
  CHAN_CHAN: canonicalPort("chan-chan", "chanchan|peru", "Chanchan", "Peru"),
  CHANGSHA: canonicalPort("changsha", "changsha|china", "Changsha", "China"),
  DELHI: canonicalPort("delhi", "delhi|india", "Delhi", "India"),
  DIU: canonicalPort("diu", "diu|india", "Diu", "India"),
  FUZHOU: canonicalPort("fuzhou", "fuzhou|china", "Fuzhou", "China"),
  GENT: canonicalPort("gent", "gent|belgium", "Gent", "Belgium"),
  GOA: canonicalPort("goa", "goa|india", "Goa", "India"),
  GUANGZHOU: canonicalPort("guangzhou", "guangzhou|china", "Guangzhou", "China"),
  HAFNARFJORDUR: canonicalPort("hafnarfjordur", "hafnarfjordur|iceland", "Hafnarfjordur", "Iceland"),
  HAMBURG: canonicalPort("hamburg", "hamburg|germany", "Hamburg", "Germany"),
  HANSEONG: canonicalPort("hanseong", "seoul|republic of korea", "Seoul", "Republic of Korea"),
  JEDDAH: canonicalPort("jeddah", "jeddah|saudi arabia", "Jeddah", "Saudi Arabia"),
  JINJIANG: canonicalPort("jinjiang", "tsinkiang|china", "Tsinkiang", "China"),
  KAGOSHIMA: canonicalPort("kagoshima", "kagoshima|japan", "Kagoshima", "Japan"),
  KERKIRA: canonicalPort("kerkira", "kerkira|greece", "Kerkira", "Greece"),
  KAZAN: canonicalPort("kazan", "kazan|russian federation", "Kazan", "Russian Federation"),
  KYOTO: canonicalPort("kyoto", "kyoto|japan", "Kyoto", "Japan"),
  LISBON: canonicalPort("lisbon", "lisbon|portugal", "Lisbon", "Portugal"),
  LONDON: canonicalPort("london", "london|united kingdom", "London", "United Kingdom"),
  LUBECK: canonicalPort("lubeck", "lubeck|germany", "Lubeck", "Germany"),
  MASSAWA: canonicalPort("massawa", "massawa|ethiopia", "Massawa", "Ethiopia"),
  MARSEILLE: canonicalPort("marseille", "marseille|france", "Marseille", "France"),
  NAGASAKI: canonicalPort("nagasaki", "nagasaki|japan", "Nagasaki", "Japan"),
  NAHA: canonicalPort("naha", "naha|japan", "Naha", "Japan"),
  NANJING: canonicalPort("nanjing", "nanjing|china", "Nanjing", "China"),
  NINGBO: canonicalPort("ningbo", "ningbo|china", "Ningbo", "China"),
  PANAMA_CITY: canonicalPort("panama-city", "panama city|panama", "Panama City", "Panama"),
  PARIS: canonicalPort("paris", "paris|france", "Paris", "France"),
  RHODES: canonicalPort("rhodes", "rhodes|greece", "Rhodes", "Greece"),
  ROME: canonicalPort("rome", "rome|italy", "Rome", "Italy"),
  SANTO_DOMINGO: canonicalPort("santo-domingo", "santo domingo|dominican republic", "Santo Domingo", "Dominican Republic"),
  SEVILLE: canonicalPort("seville", "seville|spain", "Seville", "Spain"),
  TRIPOLI: canonicalPort("tripoli", "tripoli|libya", "Tripoli", "Libya"),
  TUNIS: canonicalPort("tunis", "tunis|tunisia", "Tunis", "Tunisia"),
  TSUSHIMA_FUCHU: canonicalPort("tsushima-fuchu", "tsushima fuchu|japan", "Tsushima Fuchu", "Japan"),
  VALENCIA: canonicalPort("valencia", "valencia|spain", "Valencia", "Spain"),
  VERACRUZ: canonicalPort("veracruz", "veracruz|mexico", "Veracruz", "Mexico"),
  VIENNA: canonicalPort("vienna", "vienna|austria", "Vienna", "Austria"),
  YAMAGUCHI: canonicalPort("yamaguchi", "yamaguchi|japan", "Yamaguchi", "Japan")
});

export const REQUIRED_CANONICAL_PORTS = Object.freeze(Object.values(CANONICAL_PORTS));

const referencesById = new Map();
const validatedCatalogs = new WeakMap();
for (const reference of REQUIRED_CANONICAL_PORTS) {
  if (referencesById.has(reference.id)) {
    throw new Error(`Duplicate canonical port id: ${reference.id}`);
  }
  referencesById.set(reference.id, reference);
}

export function portMatchesCanonicalReference(port, reference) {
  assertCanonicalReference(reference);
  return Boolean(port) && requireCityId(port, "Canonical port candidate") === reference.cityId;
}

export function requireCanonicalPort(portCities, reference, context = "game system") {
  if (!Array.isArray(portCities)) throw new Error(`${context} requires the dockable port catalog`);
  assertCanonicalReference(reference);
  const validated = validatedCatalogs.get(portCities);
  if (validated) {
    const port = validated.get(reference.id);
    if (!port) throw new Error(`${context} is missing validated canonical port ${reference.city}`);
    return port;
  }
  const matches = portCities.filter((port) => portMatchesCanonicalReference(port, reference));
  if (matches.length !== 1) {
    throw new Error(
      `${context} requires exactly one dockable canonical port ${reference.city}, ` +
      `${reference.country}; found ${matches.length}`
    );
  }
  return matches[0];
}

export function findCanonicalPort(portCities, reference, context = "game system") {
  if (!Array.isArray(portCities)) throw new Error(`${context} requires the dockable port catalog`);
  assertCanonicalReference(reference);
  const validated = validatedCatalogs.get(portCities);
  if (validated) return validated.get(reference.id) || null;
  const matches = portCities.filter((port) => portMatchesCanonicalReference(port, reference));
  if (matches.length > 1) {
    throw new Error(
      `${context} requires at most one dockable canonical port ${reference.city}, ` +
      `${reference.country}; found ${matches.length}`
    );
  }
  return matches[0] || null;
}

export function validateCanonicalPortCatalog(portCities) {
  const resolved = new Map();
  for (const reference of REQUIRED_CANONICAL_PORTS) {
    resolved.set(reference.id, requireCanonicalPort(portCities, reference, "Canonical port registry"));
  }
  validatedCatalogs.set(portCities, resolved);
  return resolved;
}

export function canonicalPortDisplayName(port) {
  const name = port?.portAlias || port?.displayCity || port?.city;
  if (typeof name !== "string" || name.trim() === "") {
    throw new Error("Canonical port has no display name");
  }
  return name.trim();
}

function assertCanonicalReference(reference) {
  if (!reference || referencesById.get(reference.id) !== reference) {
    throw new Error(`Unregistered canonical port reference: ${reference?.id || "missing"}`);
  }
}
