function canonicalPort(id, city, country) {
  if (typeof id !== "string" || !/^[a-z0-9-]+$/.test(id)) {
    throw new Error(`Invalid canonical port id: ${id}`);
  }
  if (typeof city !== "string" || city.trim() === "" ||
      typeof country !== "string" || country.trim() === "") {
    throw new Error(`Canonical port ${id} requires a city and country`);
  }
  return Object.freeze({ id, city: city.trim(), country: country.trim() });
}

export const CANONICAL_PORTS = Object.freeze({
  ADEN: canonicalPort("aden", "Aden", "Yemen"),
  AGRA: canonicalPort("agra", "Agra", "India"),
  ALGIERS: canonicalPort("algiers", "Algiers", "Algeria"),
  BAGHDAD: canonicalPort("baghdad", "Baghdad", "Iraq"),
  BANDA_VILLAGE: canonicalPort("banda-village", "Banda Village", "Indonesia"),
  BARCELONA: canonicalPort("barcelona", "Barcelona", "Spain"),
  BEIJING: canonicalPort("beijing", "Beijing", "China"),
  BIRGU: canonicalPort("birgu", "Birgu", "Malta"),
  BORDEAUX: canonicalPort("bordeaux", "Bordeaux", "France"),
  BREMEN: canonicalPort("bremen", "Bremen", "Germany"),
  BUDAPEST: canonicalPort("budapest", "Budapest", "Hungary"),
  CHAN_CHAN: canonicalPort("chan-chan", "Chanchan", "Peru"),
  CHANGSHA: canonicalPort("changsha", "Changsha", "China"),
  DELHI: canonicalPort("delhi", "Delhi", "India"),
  DIU: canonicalPort("diu", "Diu", "India"),
  FUZHOU: canonicalPort("fuzhou", "Fuzhou", "China"),
  GENT: canonicalPort("gent", "Gent", "Belgium"),
  GOA: canonicalPort("goa", "Goa", "India"),
  GUANGZHOU: canonicalPort("guangzhou", "Guangzhou", "China"),
  HAFNARFJORDUR: canonicalPort("hafnarfjordur", "Hafnarfjordur", "Iceland"),
  HAMBURG: canonicalPort("hamburg", "Hamburg", "Germany"),
  HANSEONG: canonicalPort("hanseong", "Seoul", "Republic of Korea"),
  JEDDAH: canonicalPort("jeddah", "Jeddah", "Saudi Arabia"),
  JINJIANG: canonicalPort("jinjiang", "Tsinkiang", "China"),
  KAGOSHIMA: canonicalPort("kagoshima", "Kagoshima", "Japan"),
  KERKIRA: canonicalPort("kerkira", "Kerkira", "Greece"),
  KAZAN: canonicalPort("kazan", "Kazan", "Russian Federation"),
  KYOTO: canonicalPort("kyoto", "Kyoto", "Japan"),
  LISBON: canonicalPort("lisbon", "Lisbon", "Portugal"),
  LONDON: canonicalPort("london", "London", "United Kingdom"),
  LUBECK: canonicalPort("lubeck", "Lubeck", "Germany"),
  MASSAWA: canonicalPort("massawa", "Massawa", "Ethiopia"),
  MARSEILLE: canonicalPort("marseille", "Marseille", "France"),
  NAGASAKI: canonicalPort("nagasaki", "Nagasaki", "Japan"),
  NAHA: canonicalPort("naha", "Naha", "Japan"),
  NANJING: canonicalPort("nanjing", "Nanjing", "China"),
  NINGBO: canonicalPort("ningbo", "Ningbo", "China"),
  PANAMA_CITY: canonicalPort("panama-city", "Panama City", "Panama"),
  PARIS: canonicalPort("paris", "Paris", "France"),
  RHODES: canonicalPort("rhodes", "Rhodes", "Greece"),
  ROME: canonicalPort("rome", "Rome", "Italy"),
  SANTO_DOMINGO: canonicalPort("santo-domingo", "Santo Domingo", "Dominican Republic"),
  SEVILLE: canonicalPort("seville", "Seville", "Spain"),
  TRIPOLI: canonicalPort("tripoli", "Tripoli", "Libya"),
  TUNIS: canonicalPort("tunis", "Tunis", "Tunisia"),
  TSUSHIMA_FUCHU: canonicalPort("tsushima-fuchu", "Tsushima Fuchu", "Japan"),
  VALENCIA: canonicalPort("valencia", "Valencia", "Spain"),
  VERACRUZ: canonicalPort("veracruz", "Veracruz", "Mexico"),
  VIENNA: canonicalPort("vienna", "Vienna", "Austria"),
  YAMAGUCHI: canonicalPort("yamaguchi", "Yamaguchi", "Japan")
});

export const REQUIRED_CANONICAL_PORTS = Object.freeze(Object.values(CANONICAL_PORTS));

const referencesById = new Map();
const referencesByIdentity = new Map();
const validatedCatalogs = new WeakMap();
const identityCache = new WeakMap();
for (const reference of REQUIRED_CANONICAL_PORTS) {
  const identity = canonicalPortIdentity(reference);
  if (referencesById.has(reference.id)) {
    throw new Error(`Duplicate canonical port id: ${reference.id}`);
  }
  if (referencesByIdentity.has(identity)) {
    throw new Error(`Duplicate canonical port identity: ${identity}`);
  }
  referencesById.set(reference.id, reference);
  referencesByIdentity.set(identity, reference);
}

export function canonicalPortIdentity(port) {
  if (typeof port?.city !== "string" || port.city.trim() === "" ||
      typeof port?.country !== "string" || port.country.trim() === "") {
    throw new Error("Canonical port identity requires a city and country");
  }
  const cached = identityCache.get(port);
  if (cached?.city === port.city && cached.country === port.country) return cached.identity;
  const identity = `${normalizeIdentityPart(port.city)}|${normalizeIdentityPart(port.country)}`;
  identityCache.set(port, { city: port.city, country: port.country, identity });
  return identity;
}

export function portMatchesCanonicalReference(port, reference) {
  assertCanonicalReference(reference);
  return Boolean(port) && canonicalPortIdentity(port) === canonicalPortIdentity(reference);
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

function normalizeIdentityPart(value) {
  return value.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}
