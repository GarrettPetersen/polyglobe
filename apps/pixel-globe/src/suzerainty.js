import {
  NEUTRAL_FACTION_ID,
  PIRATE_FACTION_ID,
  assertFactionId
} from "./factions.js";

export const SUZERAINTY_KIND_VASSAL = "vassal";
export const SUZERAINTY_KIND_TRIBUTARY = "tributary";
export const SUZERAINTY_KIND_PERSONAL_UNION = "personal-union";
export const SUZERAINTY_HISTORY_LIMIT = 32;

const SUZERAINTY_KINDS = new Set([
  SUZERAINTY_KIND_VASSAL,
  SUZERAINTY_KIND_TRIBUTARY,
  SUZERAINTY_KIND_PERSONAL_UNION
]);

export const INITIAL_SUZERAINTIES_1522 = Object.freeze([
  initialSuzerainty("spain", "habsburg", SUZERAINTY_KIND_PERSONAL_UNION),
  initialSuzerainty("hormuz", "portugal", SUZERAINTY_KIND_VASSAL),
  initialSuzerainty("crimea", "ottoman", SUZERAINTY_KIND_VASSAL),
  initialSuzerainty("joseon", "ming", SUZERAINTY_KIND_TRIBUTARY)
]);

export function createSuzeraintyMemory(startMinute = 0) {
  assertMinute(startMinute, "suzerainty start minute");
  return {
    byVassalId: Object.fromEntries(INITIAL_SUZERAINTIES_1522.map((entry) => [
      entry.vassalFactionId,
      relationship({
        ...entry,
        establishedMinute: startMinute,
        source: "historical-1522"
      })
    ])),
    history: []
  };
}

export function migrateSuzeraintyMemory(memory, startMinute = 0) {
  if (memory == null) return createSuzeraintyMemory(startMinute);
  return validateSuzeraintyMemory({
    byVassalId: memory.byVassalId || {},
    history: memory.history || []
  });
}

export function validateSuzeraintyMemory(memory) {
  if (!memory || typeof memory !== "object" || Array.isArray(memory)) {
    throw new Error("Suzerainty memory must be an object");
  }
  if (!memory.byVassalId || typeof memory.byVassalId !== "object" ||
      Array.isArray(memory.byVassalId)) {
    throw new Error("Suzerainty relationships must be an object");
  }
  for (const [vassalFactionId, entry] of Object.entries(memory.byVassalId)) {
    validateRelationship(entry);
    if (entry.vassalFactionId !== vassalFactionId) {
      throw new Error(`Suzerainty key does not match its vassal: ${vassalFactionId}`);
    }
  }
  for (const factionId of Object.keys(memory.byVassalId)) {
    foreignPolicyPrincipal(memory, factionId);
  }
  if (!Array.isArray(memory.history) || memory.history.length > SUZERAINTY_HISTORY_LIMIT) {
    throw new Error("Invalid suzerainty history");
  }
  for (const event of memory.history) validateSuzeraintyEvent(event);
  return memory;
}

export function suzeraintyForVassal(memory, factionId) {
  assertSuzeraintyMemoryShape(memory);
  assertFactionId(factionId);
  return memory.byVassalId[factionId] || null;
}

export function suzerainForFaction(memory, factionId) {
  return suzeraintyForVassal(memory, factionId)?.suzerainFactionId || null;
}

export function vassalsOf(memory, suzerainFactionId) {
  return dependentsOf(memory, suzerainFactionId)
    .filter((entry) => entry.kind !== SUZERAINTY_KIND_PERSONAL_UNION)
    .map((entry) => entry.vassalFactionId);
}

export function dependentsOf(memory, suzerainFactionId) {
  assertSuzeraintyMemoryShape(memory);
  assertFactionId(suzerainFactionId);
  return Object.values(memory.byVassalId)
    .filter((entry) => entry.suzerainFactionId === suzerainFactionId)
    .sort((a, b) => a.vassalFactionId.localeCompare(b.vassalFactionId));
}

export function foreignPolicyPrincipal(memory, factionId) {
  assertSuzeraintyMemoryShape(memory);
  assertFactionId(factionId);
  let current = factionId;
  const visited = new Set();
  while (memory.byVassalId[current]) {
    if (visited.has(current)) throw new Error(`Suzerainty cycle includes ${current}`);
    visited.add(current);
    current = memory.byVassalId[current].suzerainFactionId;
  }
  return current;
}

export function directSuzeraintyBetween(memory, factionAId, factionBId) {
  assertSuzeraintyMemoryShape(memory);
  assertFactionId(factionAId);
  assertFactionId(factionBId);
  const a = memory.byVassalId[factionAId];
  if (a?.suzerainFactionId === factionBId) return a;
  const b = memory.byVassalId[factionBId];
  return b?.suzerainFactionId === factionAId ? b : null;
}

export function establishSuzerainty(memory, {
  vassalFactionId,
  suzerainFactionId,
  kind = SUZERAINTY_KIND_VASSAL,
  simMinute,
  source = "peace-treaty"
}) {
  validateSuzeraintyMemory(memory);
  assertSovereignFaction(vassalFactionId, "vassal");
  assertSovereignFaction(suzerainFactionId, "suzerain");
  if (vassalFactionId === suzerainFactionId) {
    throw new Error("A faction cannot be its own suzerain");
  }
  assertKind(kind);
  assertMinute(simMinute, "suzerainty establishment minute");
  assertSource(source);
  if (foreignPolicyPrincipal(memory, suzerainFactionId) === vassalFactionId) {
    throw new Error(`Suzerainty would create a cycle: ${vassalFactionId}/${suzerainFactionId}`);
  }
  const previous = memory.byVassalId[vassalFactionId] || null;
  memory.byVassalId[vassalFactionId] = relationship({
    vassalFactionId,
    suzerainFactionId,
    kind,
    establishedMinute: simMinute,
    source
  });
  const event = suzeraintyEvent({
    kind: "established",
    vassalFactionId,
    suzerainFactionId,
    relationshipKind: kind,
    previousSuzerainFactionId: previous?.suzerainFactionId || null,
    simMinute,
    source
  });
  recordEvent(memory, event);
  return event;
}

export function releaseVassal(memory, {
  vassalFactionId,
  simMinute,
  source = "rebellion"
}) {
  validateSuzeraintyMemory(memory);
  assertSovereignFaction(vassalFactionId, "vassal");
  assertMinute(simMinute, "suzerainty release minute");
  assertSource(source);
  const previous = memory.byVassalId[vassalFactionId];
  if (!previous) return null;
  delete memory.byVassalId[vassalFactionId];
  const event = suzeraintyEvent({
    kind: "released",
    vassalFactionId,
    suzerainFactionId: previous.suzerainFactionId,
    relationshipKind: previous.kind,
    previousSuzerainFactionId: previous.suzerainFactionId,
    simMinute,
    source
  });
  recordEvent(memory, event);
  return event;
}

export function releaseFactionSuzerainties(memory, factionId, simMinute, source = "annexation") {
  validateSuzeraintyMemory(memory);
  assertSovereignFaction(factionId, "annexed faction");
  assertMinute(simMinute, "suzerainty dissolution minute");
  const released = [];
  if (memory.byVassalId[factionId]) {
    released.push(releaseVassal(memory, { vassalFactionId: factionId, simMinute, source }));
  }
  for (const dependent of dependentsOf(memory, factionId)) {
    released.push(releaseVassal(memory, {
      vassalFactionId: dependent.vassalFactionId,
      simMinute,
      source
    }));
  }
  return released.filter(Boolean);
}

export function releaseFactionPersonalUnions(memory, factionId, simMinute, source = "forced-treaty") {
  validateSuzeraintyMemory(memory);
  assertSovereignFaction(factionId, "union faction");
  assertMinute(simMinute, "personal union dissolution minute");
  const released = [];
  const own = memory.byVassalId[factionId];
  if (own?.kind === SUZERAINTY_KIND_PERSONAL_UNION) {
    released.push(releaseVassal(memory, { vassalFactionId: factionId, simMinute, source }));
  }
  for (const dependent of dependentsOf(memory, factionId)) {
    if (dependent.kind !== SUZERAINTY_KIND_PERSONAL_UNION) continue;
    released.push(releaseVassal(memory, {
      vassalFactionId: dependent.vassalFactionId,
      simMinute,
      source
    }));
  }
  return released.filter(Boolean);
}

export function suzeraintyTradePrivilege(memory, traderFactionId, portFactionId) {
  assertSuzeraintyMemoryShape(memory);
  assertFactionId(traderFactionId);
  assertFactionId(portFactionId);
  const direct = directSuzeraintyBetween(memory, traderFactionId, portFactionId);
  if (!direct) return null;
  const traderIsSuzerain = traderFactionId === direct.suzerainFactionId;
  const reciprocalPrivilege = [
    SUZERAINTY_KIND_TRIBUTARY,
    SUZERAINTY_KIND_PERSONAL_UNION
  ].includes(direct.kind);
  return Object.freeze({
    customsRate: reciprocalPrivilege || traderIsSuzerain ? 0.02 : 0.05,
    // Shared dynasties and tribute did not merge crown monopolies; a ruling suzerain could compel access.
    sovereignMarketAccess: direct.kind === SUZERAINTY_KIND_VASSAL && traderIsSuzerain,
    kind: direct.kind,
    traderIsSuzerain,
    vassalFactionId: direct.vassalFactionId,
    suzerainFactionId: direct.suzerainFactionId
  });
}

function initialSuzerainty(vassalFactionId, suzerainFactionId, kind) {
  return Object.freeze({ vassalFactionId, suzerainFactionId, kind });
}

function relationship({
  vassalFactionId,
  suzerainFactionId,
  kind,
  establishedMinute,
  source
}) {
  return {
    vassalFactionId,
    suzerainFactionId,
    kind,
    establishedMinute,
    source
  };
}

function validateRelationship(entry) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    throw new Error("Invalid suzerainty relationship");
  }
  assertSovereignFaction(entry.vassalFactionId, "vassal");
  assertSovereignFaction(entry.suzerainFactionId, "suzerain");
  if (entry.vassalFactionId === entry.suzerainFactionId) {
    throw new Error("A faction cannot be its own suzerain");
  }
  assertKind(entry.kind);
  assertMinute(entry.establishedMinute, "suzerainty establishment minute");
  assertSource(entry.source);
}

function suzeraintyEvent(details) {
  return {
    id: `suzerainty-${details.simMinute}-${details.kind}-${details.vassalFactionId}`,
    ...details
  };
}

function validateSuzeraintyEvent(event) {
  if (!event || typeof event !== "object" || typeof event.id !== "string" || event.id === "") {
    throw new Error("Invalid suzerainty event");
  }
  if (!["established", "released"].includes(event.kind)) {
    throw new Error(`Invalid suzerainty event kind: ${event.kind}`);
  }
  assertSovereignFaction(event.vassalFactionId, "vassal");
  assertSovereignFaction(event.suzerainFactionId, "suzerain");
  assertKind(event.relationshipKind);
  assertMinute(event.simMinute, "suzerainty event minute");
  assertSource(event.source);
}

function recordEvent(memory, event) {
  memory.history.unshift(event);
  if (memory.history.length > SUZERAINTY_HISTORY_LIMIT) {
    memory.history.length = SUZERAINTY_HISTORY_LIMIT;
  }
}

function assertSuzeraintyMemoryShape(memory) {
  if (!memory?.byVassalId || typeof memory.byVassalId !== "object" ||
      Array.isArray(memory.byVassalId)) {
    throw new Error("Suzerainty relationships are unavailable");
  }
}

function assertSovereignFaction(factionId, label) {
  assertFactionId(factionId);
  if ([NEUTRAL_FACTION_ID, PIRATE_FACTION_ID].includes(factionId)) {
    throw new Error(`Invalid ${label} faction: ${factionId}`);
  }
}

function assertKind(kind) {
  if (!SUZERAINTY_KINDS.has(kind)) throw new Error(`Invalid suzerainty kind: ${kind}`);
}

function assertMinute(value, label) {
  if (!Number.isFinite(value) || value < 0) throw new Error(`Invalid ${label}: ${value}`);
}

function assertSource(source) {
  if (typeof source !== "string" || source.trim() === "") {
    throw new Error("Suzerainty source is required");
  }
}
