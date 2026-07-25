import {
  DIPLOMACY_ALLY,
  DIPLOMACY_FRIENDLY,
  DIPLOMACY_HOSTILE,
  DIPLOMACY_NEUTRAL,
  DIPLOMACY_WAR,
  NEUTRAL_FACTION_ID,
  PIRATE_FACTION_ID,
  assertFactionId,
  factionHasFlag
} from "./factions.js";

export const FOREIGN_SETTLEMENT_EXPULSION_MEMORY_VERSION = 1;
const DIPLOMACY_RELATIONS = new Set([
  DIPLOMACY_ALLY,
  DIPLOMACY_FRIENDLY,
  DIPLOMACY_NEUTRAL,
  DIPLOMACY_HOSTILE,
  DIPLOMACY_WAR
]);

const FOREIGN_SETTLEMENT_SPECS = Object.freeze([
  settlement({
    id: "portuguese-hormuz",
    city: "Hormuz",
    country: "Iran",
    factionId: "portugal",
    label: "Portuguese fortress and factory",
    factorText: "The Portuguese captain holds the fortress and customs house, while the Hormuzi court still governs the island kingdom."
  }),
  settlement({
    id: "portuguese-muscat",
    city: "Muscat",
    country: "Oman",
    factionId: "portugal",
    label: "Portuguese fortress and factory",
    factorText: "The Portuguese fortress guards its factory and anchorage under the Crown's compact with Hormuz."
  }),
  settlement({
    id: "portuguese-ternate",
    city: "Ternate",
    country: "Indonesia",
    factionId: "portugal",
    label: "Portuguese fort and factory",
    factorText: "Portuguese masons are raising a fort and factory beside the clove anchorage; their flag already covers their warehouse trade."
  }),
  settlement({
    id: "portuguese-ayutthaya",
    city: "Ayutthaya",
    country: "Thailand",
    factionId: "portugal",
    label: "Portuguese quarter",
    factorText: "The Portuguese quarter keeps its own warehouses by the river, under privileges granted by the king."
  }),
  settlement({
    id: "portuguese-patani",
    city: "Patani",
    country: "Thailand",
    factionId: "portugal",
    label: "Portuguese trading post",
    factorText: "Portuguese factors keep a small trading post here, joining Patani to their routes through Malacca and Siam."
  }),
  settlement({
    id: "portuguese-cochin",
    city: "Cochin",
    country: "India",
    factionId: "portugal",
    label: "Portuguese fort and factory",
    factorText: "The Portuguese fort and factory command their own pepper warehouses beside the raja's city."
  }),
  settlement({
    id: "portuguese-calicut",
    city: "Calicut",
    country: "India",
    factionId: "portugal",
    label: "Portuguese fort and factory",
    factorText: "The Portuguese fortress keeps a factory on the quay, though its bargain with the Zamorin remains an uneasy one."
  }),
  settlement({
    id: "portuguese-colombo",
    city: "Colombo",
    country: "Sri Lanka",
    factionId: "portugal",
    label: "Portuguese fort and cinnamon factory",
    factorText: "A Portuguese fort and cinnamon factory stand beside the harbor under treaty with the local court."
  }),
  settlement({
    id: "portuguese-quilon",
    city: "Quilon",
    country: "India",
    factionId: "portugal",
    label: "Portuguese fort and pepper factory",
    factorText: "The Portuguese fort at Tangasseri guards a factory that ships Quilon's pepper under its own privileges."
  }),
  settlement({
    id: "venetian-constantinople",
    city: "Istanbul",
    country: "Turkey",
    factionId: "venice",
    label: "Venetian merchant quarter",
    factorText: "The Venetian bailo and his merchants keep their own warehouses across the Golden Horn in Pera."
  }),
  settlement({
    id: "venetian-alexandria",
    city: "Alexandria",
    country: "Egypt",
    factionId: "venice",
    label: "Venetian fondaco",
    factorText: "Venetian merchants lodge and trade through their fondaco under the eye of their consul."
  }),
  settlement({
    id: "portuguese-nagasaki",
    city: "Nagasaki",
    country: "Japan",
    factionId: "portugal",
    label: "Portuguese merchant settlement",
    factorText: "Portuguese merchants keep a privileged quarter around the new harbor, while Japanese officials retain the city.",
    activeAtStart: false
  })
]);

const FOREIGN_SETTLEMENT_BY_ID = new Map(
  FOREIGN_SETTLEMENT_SPECS.map((entry) => [entry.id, entry])
);
const STARTING_SETTLEMENTS_BY_CITY = new Map();
const EMPTY_FOREIGN_SETTLEMENTS = Object.freeze([]);
const PORT_SETTLEMENTS_CACHE = new WeakMap();
const CITY_FLAG_IDS_CACHE = new WeakMap();

for (const entry of FOREIGN_SETTLEMENT_SPECS) {
  if (!entry.activeAtStart) continue;
  const key = cityKey(entry.city, entry.country);
  const existing = STARTING_SETTLEMENTS_BY_CITY.get(key) || [];
  existing.push(entry);
  STARTING_SETTLEMENTS_BY_CITY.set(key, existing);
}

for (const [key, entries] of STARTING_SETTLEMENTS_BY_CITY) {
  STARTING_SETTLEMENTS_BY_CITY.set(key, Object.freeze(entries.slice()));
}

export const FOREIGN_SETTLEMENTS_1522 = Object.freeze(
  FOREIGN_SETTLEMENT_SPECS.filter((entry) => entry.activeAtStart)
);

export function foreignSettlementById(settlementId) {
  if (typeof settlementId !== "string" || settlementId === "") {
    throw new Error(`Invalid foreign settlement id: ${settlementId}`);
  }
  const entry = FOREIGN_SETTLEMENT_BY_ID.get(settlementId);
  if (!entry) throw new Error(`Unknown foreign settlement: ${settlementId}`);
  return entry;
}

export function foreignSettlementsByIds(settlementIds) {
  if (!Array.isArray(settlementIds)) throw new Error("Foreign settlement ids must be an array");
  const seen = new Set();
  return Object.freeze(settlementIds.map((settlementId) => {
    const entry = foreignSettlementById(settlementId);
    if (seen.has(entry.factionId)) {
      throw new Error(`Duplicate foreign settlement faction: ${entry.factionId}`);
    }
    seen.add(entry.factionId);
    return entry;
  }));
}

export function foreignSettlementsForCity1522(city) {
  assertCityIdentity(city);
  return STARTING_SETTLEMENTS_BY_CITY.get(cityKey(city.city, city.country)) || EMPTY_FOREIGN_SETTLEMENTS;
}

export function withForeignSettlements1522(city) {
  assertCityIdentity(city);
  const foreignSettlements = foreignSettlementsForCity1522(city);
  return foreignSettlements.length > 0
    ? { ...city, foreignSettlements }
    : city;
}

export function portForeignSettlements(port) {
  if (!port || typeof port !== "object") throw new Error("Foreign settlement lookup requires a port");
  const entries = port.foreignSettlements ?? EMPTY_FOREIGN_SETTLEMENTS;
  if (!Array.isArray(entries)) throw new Error("Port foreign settlements must be an array");
  const cached = PORT_SETTLEMENTS_CACHE.get(port);
  if (
    cached?.entries === entries &&
    cached.city === port.city &&
    cached.country === port.country
  ) {
    return entries;
  }
  const seen = new Set();
  for (const entry of entries) {
    assertForeignSettlement(entry);
    if (entry.city !== port.city || entry.country !== port.country) {
      throw new Error(
        `Foreign settlement ${entry.id} belongs in ${entry.city}, ${entry.country}, not ${port.city}, ${port.country}`
      );
    }
    if (seen.has(entry.factionId)) {
      throw new Error(`Port has duplicate foreign settlement faction: ${entry.factionId}`);
    }
    seen.add(entry.factionId);
  }
  PORT_SETTLEMENTS_CACHE.set(port, {
    entries,
    city: port.city,
    country: port.country
  });
  return entries;
}

export function createForeignSettlementExpulsionMemory() {
  return {
    version: FOREIGN_SETTLEMENT_EXPULSION_MEMORY_VERSION,
    revision: 0,
    byId: {}
  };
}

export function migrateForeignSettlementExpulsionMemory(memory) {
  if (memory === undefined || memory === null) return createForeignSettlementExpulsionMemory();
  return validateForeignSettlementExpulsionMemory(memory);
}

export function validateForeignSettlementExpulsionMemory(memory) {
  assertExpulsionMemoryShape(memory);
  if (!Number.isInteger(memory.revision) || memory.revision < 0) {
    throw new Error(`Invalid foreign settlement expulsion revision: ${memory.revision}`);
  }
  const records = Object.entries(memory.byId);
  if (memory.revision !== records.length) {
    throw new Error(
      `Foreign settlement expulsion revision does not match its records: ${memory.revision}/${records.length}`
    );
  }
  for (const [settlementId, record] of records) {
    const settlement = foreignSettlementById(settlementId);
    if (!record || typeof record !== "object" || record.settlementId !== settlementId) {
      throw new Error(`Invalid foreign settlement expulsion record: ${settlementId}`);
    }
    const hostFactionId = assertFactionId(record.hostFactionId);
    if (record.residentFactionId !== settlement.factionId) {
      throw new Error(`Foreign settlement expulsion has the wrong resident faction: ${settlementId}`);
    }
    if (hostFactionId === settlement.factionId) {
      throw new Error(`Foreign settlement cannot be expelled by its own faction: ${settlementId}`);
    }
    if (![DIPLOMACY_HOSTILE, DIPLOMACY_WAR].includes(record.relation)) {
      throw new Error(`Invalid foreign settlement expulsion relation: ${record.relation}`);
    }
    if (!Number.isFinite(record.simMinute) || record.simMinute < 0) {
      throw new Error(`Invalid foreign settlement expulsion minute: ${record.simMinute}`);
    }
    if (record.city !== settlement.city || record.country !== settlement.country) {
      throw new Error(`Foreign settlement expulsion is assigned to the wrong city: ${settlementId}`);
    }
    if (record.label !== settlement.label) {
      throw new Error(`Foreign settlement expulsion has the wrong label: ${settlementId}`);
    }
  }
  return memory;
}

export function expelHostileForeignSettlements({
  memory,
  ports,
  relationBetween,
  simMinute
}) {
  validateForeignSettlementExpulsionMemory(memory);
  if (!Array.isArray(ports)) throw new Error("Foreign settlement expulsion requires a port list");
  if (typeof relationBetween !== "function") {
    throw new Error("Foreign settlement expulsion requires a diplomacy resolver");
  }
  if (!Number.isFinite(simMinute) || simMinute < 0) {
    throw new Error(`Invalid foreign settlement expulsion minute: ${simMinute}`);
  }
  const events = [];
  for (const port of ports) {
    const hostFactionId = assertFactionId(port.factionId || NEUTRAL_FACTION_ID);
    for (const settlement of portForeignSettlements(port)) {
      if (memory.byId[settlement.id] || settlement.factionId === hostFactionId) continue;
      const relation = relationBetween(hostFactionId, settlement.factionId);
      if (!DIPLOMACY_RELATIONS.has(relation)) {
        throw new Error(
          `Invalid foreign settlement diplomacy: ${hostFactionId}/${settlement.factionId}=${relation}`
        );
      }
      if (![DIPLOMACY_HOSTILE, DIPLOMACY_WAR].includes(relation)) continue;
      const record = {
        settlementId: settlement.id,
        city: settlement.city,
        country: settlement.country,
        label: settlement.label,
        residentFactionId: settlement.factionId,
        hostFactionId,
        relation,
        simMinute
      };
      memory.byId[settlement.id] = record;
      memory.revision += 1;
      events.push(Object.freeze({ ...record }));
    }
  }
  validateForeignSettlementExpulsionMemory(memory);
  return Object.freeze(events);
}

export function foreignSettlementWasExpelled(memory, settlementId) {
  if (memory === undefined || memory === null) return false;
  assertExpulsionMemoryShape(memory);
  foreignSettlementById(settlementId);
  return Boolean(memory.byId[settlementId]);
}

export function expelledForeignSettlements(port, expulsionMemory) {
  if (expulsionMemory === undefined || expulsionMemory === null) return EMPTY_FOREIGN_SETTLEMENTS;
  assertExpulsionMemoryShape(expulsionMemory);
  return Object.freeze(
    portForeignSettlements(port).filter((entry) => expulsionMemory.byId[entry.id])
  );
}

export function activeForeignSettlements(port, expulsionMemory = null) {
  if (expulsionMemory !== null) assertExpulsionMemoryShape(expulsionMemory);
  const sovereignFactionId = assertFactionId(port.factionId || NEUTRAL_FACTION_ID);
  return Object.freeze(
    portForeignSettlements(port).filter((entry) => (
      entry.factionId !== sovereignFactionId &&
      !expulsionMemory?.byId[entry.id]
    ))
  );
}

export function cityFlagFactionIds(port, expulsionMemory = null) {
  const sovereignFactionId = assertFactionId(port.factionId || NEUTRAL_FACTION_ID);
  const foreignSettlements = portForeignSettlements(port);
  const expulsionRevision = expulsionMemory?.revision ?? 0;
  if (expulsionMemory !== null) assertExpulsionMemoryShape(expulsionMemory);
  const cached = CITY_FLAG_IDS_CACHE.get(port);
  if (
    cached?.sovereignFactionId === sovereignFactionId &&
    cached.foreignSettlements === foreignSettlements &&
    cached.expulsionRevision === expulsionRevision
  ) {
    return cached.ids;
  }
  const ids = [];
  if (factionHasFlag(sovereignFactionId)) ids.push(sovereignFactionId);
  for (const entry of foreignSettlements) {
    if (
      entry.factionId !== sovereignFactionId &&
      !expulsionMemory?.byId[entry.id] &&
      factionHasFlag(entry.factionId) &&
      !ids.includes(entry.factionId)
    ) {
      ids.push(entry.factionId);
    }
  }
  const result = Object.freeze(ids);
  CITY_FLAG_IDS_CACHE.set(port, {
    sovereignFactionId,
    foreignSettlements,
    expulsionRevision,
    ids: result
  });
  return result;
}

function settlement({
  id,
  city,
  country,
  factionId,
  label,
  factorText,
  activeAtStart = true
}) {
  const entry = Object.freeze({
    id,
    city,
    country,
    factionId,
    label,
    factorText,
    activeAtStart
  });
  assertForeignSettlement(entry);
  return entry;
}

function assertForeignSettlement(entry) {
  if (!entry || typeof entry !== "object") throw new Error("Invalid foreign settlement");
  for (const field of ["id", "city", "country", "label", "factorText"]) {
    if (typeof entry[field] !== "string" || entry[field] === "") {
      throw new Error(`Foreign settlement has invalid ${field}: ${entry[field]}`);
    }
  }
  const factionId = assertFactionId(entry.factionId);
  if (factionId === NEUTRAL_FACTION_ID || factionId === PIRATE_FACTION_ID) {
    throw new Error(`Invalid foreign settlement faction: ${factionId}`);
  }
  if (typeof entry.activeAtStart !== "boolean") {
    throw new Error(`Foreign settlement has invalid start state: ${entry.id}`);
  }
}

function assertCityIdentity(city) {
  if (!city || typeof city !== "object") throw new Error("Foreign settlement lookup requires a city");
  if (typeof city.city !== "string" || city.city === "") throw new Error("City requires a name");
  if (typeof city.country !== "string" || city.country === "") throw new Error("City requires a country");
}

function assertExpulsionMemoryShape(memory) {
  if (
    !memory ||
    typeof memory !== "object" ||
    memory.version !== FOREIGN_SETTLEMENT_EXPULSION_MEMORY_VERSION ||
    !memory.byId ||
    typeof memory.byId !== "object" ||
    Array.isArray(memory.byId)
  ) {
    throw new Error(`Invalid foreign settlement expulsion memory version: ${memory?.version ?? "missing"}`);
  }
}

function cityKey(city, country) {
  return `${city.trim().toLowerCase()}|${country.trim().toLowerCase()}`;
}
