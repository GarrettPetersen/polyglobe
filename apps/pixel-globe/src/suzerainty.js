import {
  NEUTRAL_FACTION_ID,
  PIRATE_FACTION_ID,
  assertFactionId
} from "./factions.js";

export const SUZERAINTY_KIND_VASSAL = "vassal";
export const SUZERAINTY_KIND_AUTONOMOUS_VASSAL = "autonomous-vassal";
export const SUZERAINTY_KIND_TRIBUTARY = "tributary";
export const SUZERAINTY_KIND_PERSONAL_UNION = "personal-union";
export const SUZERAINTY_HISTORY_LIMIT = 32;
export const SUZERAINTY_EVENT_KINDS = Object.freeze(["established", "released"]);

const SUZERAINTY_KINDS = new Set([
  SUZERAINTY_KIND_VASSAL,
  SUZERAINTY_KIND_AUTONOMOUS_VASSAL,
  SUZERAINTY_KIND_TRIBUTARY,
  SUZERAINTY_KIND_PERSONAL_UNION
]);

const SUZERAINTY_TERMS = Object.freeze({
  [SUZERAINTY_KIND_PERSONAL_UNION]: terms({
    foreignPolicy: "shared",
    tribute: false,
    mutualDefense: true,
    offensiveWarObligation: true,
    suzerainCustomsRate: 0.02,
    subjectCustomsRate: 0.02,
    sovereignMarketAccess: false
  }),
  [SUZERAINTY_KIND_VASSAL]: terms({
    foreignPolicy: "shared",
    tribute: true,
    mutualDefense: true,
    offensiveWarObligation: true,
    suzerainCustomsRate: 0.02,
    subjectCustomsRate: 0.05,
    sovereignMarketAccess: true
  }),
  [SUZERAINTY_KIND_AUTONOMOUS_VASSAL]: terms({
    foreignPolicy: "independent",
    tribute: true,
    mutualDefense: true,
    offensiveWarObligation: false,
    suzerainCustomsRate: 0.02,
    subjectCustomsRate: 0.05,
    sovereignMarketAccess: true
  }),
  [SUZERAINTY_KIND_TRIBUTARY]: terms({
    foreignPolicy: "independent",
    tribute: true,
    mutualDefense: false,
    offensiveWarObligation: false,
    suzerainCustomsRate: 0.02,
    subjectCustomsRate: 0.02,
    sovereignMarketAccess: false
  })
});

export const INITIAL_SUZERAINTIES_1522 = Object.freeze([
  initialSuzerainty("burgundian-netherlands", "spain", SUZERAINTY_KIND_PERSONAL_UNION),
  initialSuzerainty("bohemia", "hungary", SUZERAINTY_KIND_PERSONAL_UNION),
  initialSuzerainty("hormuz", "portugal", SUZERAINTY_KIND_VASSAL),
  initialSuzerainty("crimea", "ottoman", SUZERAINTY_KIND_AUTONOMOUS_VASSAL, {
    tribute: false,
    offensiveWarObligation: true
  }),
  initialSuzerainty("wallachia", "ottoman", SUZERAINTY_KIND_AUTONOMOUS_VASSAL),
  initialSuzerainty("moldavia", "ottoman", SUZERAINTY_KIND_AUTONOMOUS_VASSAL),
  initialSuzerainty("hejaz", "ottoman", SUZERAINTY_KIND_AUTONOMOUS_VASSAL, {
    tribute: false
  }),
  initialSuzerainty("ragusa", "ottoman", SUZERAINTY_KIND_TRIBUTARY),
  initialSuzerainty("joseon", "ming", SUZERAINTY_KIND_TRIBUTARY),
  initialSuzerainty("ryukyu", "ming", SUZERAINTY_KIND_TRIBUTARY),
  ...[
    "hosokawa", "ouchi", "shimazu", "so", "shoni", "nagao", "ando"
  ].map((factionId) => initialSuzerainty(
    factionId,
    "japan",
    SUZERAINTY_KIND_AUTONOMOUS_VASSAL,
    {
      tribute: false,
      mutualDefense: false,
      sovereignMarketAccess: false
    }
  )),
  initialSuzerainty("kakizaki", "ando", SUZERAINTY_KIND_AUTONOMOUS_VASSAL, {
    tribute: false,
    mutualDefense: false,
    sovereignMarketAccess: false
  })
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

export function migrateSuzeraintyMemory(memory, startMinute = 0, { inactiveFactionIds = [] } = {}) {
  const inactive = validatedFactionSet(inactiveFactionIds, "inactive suzerainty faction");
  const source = memory == null ? createSuzeraintyMemory(startMinute) : memory;
  const migrated = {
    byVassalId: Object.fromEntries(Object.entries(source.byVassalId || {})
      .map(([factionId, entry]) => [factionId, relationship(entry)])
      .filter(([, entry]) => (
        !inactive.has(entry.vassalFactionId) && !inactive.has(entry.suzerainFactionId)
      ))),
    history: source.history || []
  };
  const formerCombinedUnion = migrated.byVassalId.spain;
  if (formerCombinedUnion?.source === "historical-1522" &&
      formerCombinedUnion.suzerainFactionId === "habsburg" &&
      formerCombinedUnion.kind === SUZERAINTY_KIND_PERSONAL_UNION) {
    delete migrated.byVassalId.spain;
  }
  const historicallyChanged = new Set(migrated.history.map((event) => event.vassalFactionId));
  const formerCombinedUnionDiverged = !migrated.byVassalId["burgundian-netherlands"] && (
    migrated.byVassalId.spain !== undefined || historicallyChanged.has("spain")
  );
  if (formerCombinedUnionDiverged) historicallyChanged.add("burgundian-netherlands");
  for (const initial of INITIAL_SUZERAINTIES_1522) {
    if (inactive.has(initial.vassalFactionId) || inactive.has(initial.suzerainFactionId)) continue;
    const existing = migrated.byVassalId[initial.vassalFactionId];
    if (existing?.source === "historical-1522") {
      migrated.byVassalId[initial.vassalFactionId] = relationship({
        ...initial,
        establishedMinute: existing.establishedMinute,
        source: existing.source
      });
    } else if (!existing && !historicallyChanged.has(initial.vassalFactionId)) {
      migrated.byVassalId[initial.vassalFactionId] = relationship({
        ...initial,
        establishedMinute: startMinute,
        source: "historical-1522"
      });
    }
  }
  return validateSuzeraintyMemory(migrated);
}

function validatedFactionSet(factionIds, label) {
  if (!Array.isArray(factionIds) && !(factionIds instanceof Set)) {
    throw new Error(`${label} ids must be an array or set`);
  }
  const validated = new Set();
  for (const factionId of factionIds) validated.add(assertFactionId(factionId));
  return validated;
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
  for (const factionId of Object.keys(memory.byVassalId)) dependencyPrincipal(memory, factionId);
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

export function factionIsSubjectOf(memory, subjectFactionId, suzerainFactionId) {
  assertSuzeraintyMemoryShape(memory);
  assertFactionId(subjectFactionId);
  assertFactionId(suzerainFactionId);
  let currentFactionId = subjectFactionId;
  const visited = new Set();
  while (memory.byVassalId[currentFactionId]) {
    if (visited.has(currentFactionId)) {
      throw new Error(`Suzerainty cycle includes ${currentFactionId}`);
    }
    visited.add(currentFactionId);
    const relationship = memory.byVassalId[currentFactionId];
    if (relationship.suzerainFactionId === suzerainFactionId) return true;
    currentFactionId = relationship.suzerainFactionId;
  }
  return false;
}

export function vassalsOf(memory, suzerainFactionId) {
  return dependentsOf(memory, suzerainFactionId)
    .filter((entry) => [
      SUZERAINTY_KIND_VASSAL,
      SUZERAINTY_KIND_AUTONOMOUS_VASSAL
    ].includes(entry.kind))
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
  while (memory.byVassalId[current] &&
      suzeraintyTermsForRelationship(memory.byVassalId[current]).foreignPolicy === "shared") {
    if (visited.has(current)) throw new Error(`Suzerainty cycle includes ${current}`);
    visited.add(current);
    current = memory.byVassalId[current].suzerainFactionId;
  }
  return current;
}

export function suzeraintyTermsForKind(kind) {
  assertKind(kind);
  return SUZERAINTY_TERMS[kind];
}

export function suzeraintyTermsForRelationship(entry) {
  validateRelationship(entry);
  return entry.terms;
}

export function defensivePartnersOf(memory, factionId) {
  assertSuzeraintyMemoryShape(memory);
  assertFactionId(factionId);
  const partners = [];
  const own = memory.byVassalId[factionId];
  if (own && suzeraintyTermsForRelationship(own).mutualDefense) {
    partners.push(own.suzerainFactionId);
  }
  for (const dependent of dependentsOf(memory, factionId)) {
    if (suzeraintyTermsForRelationship(dependent).mutualDefense) {
      partners.push(dependent.vassalFactionId);
    }
  }
  return Object.freeze([...new Set(partners)].sort());
}

export function offensivePartnersOf(memory, factionId) {
  assertSuzeraintyMemoryShape(memory);
  assertFactionId(factionId);
  return Object.freeze(dependentsOf(memory, factionId)
    .filter((entry) => suzeraintyTermsForRelationship(entry).offensiveWarObligation)
    .map((entry) => entry.vassalFactionId));
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
  termOverrides = {},
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
  if (dependencyPrincipal(memory, suzerainFactionId) === vassalFactionId) {
    throw new Error(`Suzerainty would create a cycle: ${vassalFactionId}/${suzerainFactionId}`);
  }
  const previous = memory.byVassalId[vassalFactionId] || null;
  memory.byVassalId[vassalFactionId] = relationship({
    vassalFactionId,
    suzerainFactionId,
    kind,
    termOverrides,
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
  const relationshipTerms = suzeraintyTermsForRelationship(direct);
  return Object.freeze({
    customsRate: traderIsSuzerain
      ? relationshipTerms.suzerainCustomsRate
      : relationshipTerms.subjectCustomsRate,
    sovereignMarketAccess: relationshipTerms.sovereignMarketAccess && traderIsSuzerain,
    foreignPolicy: relationshipTerms.foreignPolicy,
    tribute: relationshipTerms.tribute,
    mutualDefense: relationshipTerms.mutualDefense,
    offensiveWarObligation: relationshipTerms.offensiveWarObligation,
    kind: direct.kind,
    traderIsSuzerain,
    vassalFactionId: direct.vassalFactionId,
    suzerainFactionId: direct.suzerainFactionId
  });
}

function dependencyPrincipal(memory, factionId) {
  let current = factionId;
  const visited = new Set();
  while (memory.byVassalId[current]) {
    if (visited.has(current)) throw new Error(`Suzerainty cycle includes ${current}`);
    visited.add(current);
    current = memory.byVassalId[current].suzerainFactionId;
  }
  return current;
}

function terms(details) {
  return Object.freeze(details);
}

function initialSuzerainty(vassalFactionId, suzerainFactionId, kind, termOverrides = {}) {
  return Object.freeze({
    vassalFactionId,
    suzerainFactionId,
    kind,
    termOverrides: Object.freeze({ ...termOverrides })
  });
}

function relationship({
  vassalFactionId,
  suzerainFactionId,
  kind,
  terms: savedTerms,
  termOverrides = {},
  establishedMinute,
  source
}) {
  const relationshipTerms = normalizeTerms(kind, savedTerms || {
    ...suzeraintyTermsForKind(kind),
    ...termOverrides
  });
  return {
    vassalFactionId,
    suzerainFactionId,
    kind,
    terms: relationshipTerms,
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
  normalizeTerms(entry.kind, entry.terms);
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
  if (!SUZERAINTY_EVENT_KINDS.includes(event.kind)) {
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

function normalizeTerms(kind, value) {
  assertKind(kind);
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Suzerainty ${kind} requires constitutional terms`);
  }
  const normalized = {
    foreignPolicy: value.foreignPolicy,
    tribute: value.tribute,
    mutualDefense: value.mutualDefense,
    offensiveWarObligation: value.offensiveWarObligation,
    suzerainCustomsRate: value.suzerainCustomsRate,
    subjectCustomsRate: value.subjectCustomsRate,
    sovereignMarketAccess: value.sovereignMarketAccess
  };
  if (!["shared", "independent"].includes(normalized.foreignPolicy)) {
    throw new Error(`Invalid ${kind} foreign policy: ${normalized.foreignPolicy}`);
  }
  for (const field of ["tribute", "mutualDefense", "offensiveWarObligation", "sovereignMarketAccess"]) {
    if (typeof normalized[field] !== "boolean") {
      throw new Error(`Invalid ${kind} constitutional term: ${field}`);
    }
  }
  for (const field of ["suzerainCustomsRate", "subjectCustomsRate"]) {
    if (!Number.isFinite(normalized[field]) || normalized[field] < 0 || normalized[field] > 0.25) {
      throw new Error(`Invalid ${kind} constitutional term: ${field}`);
    }
  }
  return Object.freeze(normalized);
}

function assertMinute(value, label) {
  if (!Number.isFinite(value) || value < 0) throw new Error(`Invalid ${label}: ${value}`);
}

function assertSource(source) {
  if (typeof source !== "string" || source.trim() === "") {
    throw new Error("Suzerainty source is required");
  }
}
