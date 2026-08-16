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
  BEIJING: canonicalPort("beijing", "Beijing", "China"),
  BIRGU: canonicalPort("birgu", "Birgu", "Malta"),
  BORDEAUX: canonicalPort("bordeaux", "Bordeaux", "France"),
  BREMEN: canonicalPort("bremen", "Bremen", "Germany"),
  CHANGSHA: canonicalPort("changsha", "Changsha", "China"),
  DELHI: canonicalPort("delhi", "Delhi", "India"),
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
  KYOTO: canonicalPort("kyoto", "Kyoto", "Japan"),
  LISBON: canonicalPort("lisbon", "Lisbon", "Portugal"),
  LONDON: canonicalPort("london", "London", "United Kingdom"),
  LUBECK: canonicalPort("lubeck", "Lubeck", "Germany"),
  MASSAWA: canonicalPort("massawa", "Massawa", "Ethiopia"),
  NAGASAKI: canonicalPort("nagasaki", "Nagasaki", "Japan"),
  NAHA: canonicalPort("naha", "Naha", "Japan"),
  NANJING: canonicalPort("nanjing", "Nanjing", "China"),
  NINGBO: canonicalPort("ningbo", "Ningbo", "China"),
  RHODES: canonicalPort("rhodes", "Rhodes", "Greece"),
  ROME: canonicalPort("rome", "Rome", "Italy"),
  SANTO_DOMINGO: canonicalPort("santo-domingo", "Santo Domingo", "Dominican Republic"),
  SEVILLE: canonicalPort("seville", "Seville", "Spain"),
  TRIPOLI: canonicalPort("tripoli", "Tripoli", "Libya"),
  TSUSHIMA_FUCHU: canonicalPort("tsushima-fuchu", "Tsushima Fuchu", "Japan"),
  VERACRUZ: canonicalPort("veracruz", "Veracruz", "Mexico"),
  YAMAGUCHI: canonicalPort("yamaguchi", "Yamaguchi", "Japan")
});

export const REQUIRED_CANONICAL_PORTS = Object.freeze(Object.values(CANONICAL_PORTS));

const referencesById = new Map();
const referencesByIdentity = new Map();
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
  return `${normalizeIdentityPart(port.city)}|${normalizeIdentityPart(port.country)}`;
}

export function portMatchesCanonicalReference(port, reference) {
  assertCanonicalReference(reference);
  return Boolean(port) && canonicalPortIdentity(port) === canonicalPortIdentity(reference);
}

export function requireCanonicalPort(portCities, reference, context = "game system") {
  if (!Array.isArray(portCities)) throw new Error(`${context} requires the dockable port catalog`);
  assertCanonicalReference(reference);
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
