import {
  DIPLOMACY_ALLY,
  DIPLOMACY_FRIENDLY,
  DIPLOMACY_HOSTILE,
  DIPLOMACY_NEUTRAL,
  DIPLOMACY_WAR,
  FACTIONS,
  NEUTRAL_FACTION_ID,
  PIRATE_FACTION_ID,
  assertFactionId,
  diplomacyBetween
} from "./factions.js";
import {
  createSuzeraintyMemory,
  defensivePartnersOf,
  dependentsOf,
  directSuzeraintyBetween,
  establishSuzerainty,
  foreignPolicyPrincipal,
  migrateSuzeraintyMemory,
  offensivePartnersOf,
  releaseFactionPersonalUnions,
  releaseFactionSuzerainties,
  releaseVassal,
  SUZERAINTY_KIND_PERSONAL_UNION,
  SUZERAINTY_KIND_AUTONOMOUS_VASSAL,
  SUZERAINTY_KIND_TRIBUTARY,
  suzerainForFaction,
  validateSuzeraintyMemory
} from "./suzerainty.js";
import { factionDiplomaticAggressionMultiplier } from "./factionExpansion.js";
import { imperialDefensePartners } from "./imperialConstitution.js";

export const WORLD_DIPLOMACY_VERSION = 10;
export const DIPLOMACY_MIN_EVENT_DAYS = 75;
export const DIPLOMACY_MAX_EVENT_DAYS = 150;
export const DIPLOMACY_PAIR_COOLDOWN_DAYS = 120;
export const DIPLOMACY_HISTORY_LIMIT = 24;

const MINUTES_PER_DAY = 24 * 60;
const DIPLOMACY_PAIR_COOLDOWN_MINUTES = DIPLOMACY_PAIR_COOLDOWN_DAYS * MINUTES_PER_DAY;
const MAX_CATCH_UP_EVENTS = 24;
const RELATION_LADDER = Object.freeze([
  DIPLOMACY_WAR,
  DIPLOMACY_HOSTILE,
  DIPLOMACY_NEUTRAL,
  DIPLOMACY_FRIENDLY,
  DIPLOMACY_ALLY
]);
const RELATIONS = new Set(RELATION_LADDER);
const SOVEREIGN_FACTIONS = FACTIONS.filter((faction) => (
  faction.id !== NEUTRAL_FACTION_ID && faction.id !== PIRATE_FACTION_ID
));
const FACTIONS_BY_ID = new Map(FACTIONS.map((faction) => [faction.id, faction]));
const DIPLOMACY_INTRODUCED_FACTION_IDS = Object.freeze([
  "burgundian-netherlands",
  "wallachia",
  "moldavia",
  "ragusa",
  "hejaz",
  "ryukyu",
  "ainu",
  "hosokawa",
  "ouchi",
  "shimazu",
  "so",
  "shoni",
  "nagao",
  "ando",
  "kakizaki",
  "mughal",
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
  "florence",
  "kazan"
]);

export function createWorldDiplomacy({ startMinute = 0, seedKey = "world" } = {}) {
  assertMinute(startMinute, "diplomacy start minute");
  if (typeof seedKey !== "string" || seedKey.trim() === "") {
    throw new Error("World diplomacy requires a seed key");
  }
  const state = {
    version: WORLD_DIPLOMACY_VERSION,
    seed: hashString32(seedKey),
    sequence: 0,
    startMinute,
    lastUpdateMinute: startMinute,
    nextEventMinute: startMinute,
    overrides: {},
    pairLastChangedMinute: {},
    contacts: {},
    suzerainties: createSuzeraintyMemory(startMinute),
    history: []
  };
  state.nextEventMinute += diplomacyEventIntervalMinutes(state, 0);
  return state;
}

export function validateWorldDiplomacy(state) {
  if (!state || typeof state !== "object" || state.version !== WORLD_DIPLOMACY_VERSION) {
    throw new Error(`Unsupported world diplomacy version: ${state?.version ?? "missing"}`);
  }
  if (!Number.isInteger(state.seed) || state.seed < 0 || state.seed > 0xffffffff) {
    throw new Error(`Invalid world diplomacy seed: ${state.seed}`);
  }
  if (!Number.isInteger(state.sequence) || state.sequence < 0) {
    throw new Error(`Invalid world diplomacy sequence: ${state.sequence}`);
  }
  assertMinute(state.startMinute, "diplomacy start minute");
  assertMinute(state.lastUpdateMinute, "diplomacy update minute");
  assertMinute(state.nextEventMinute, "next diplomacy event minute");
  if (state.lastUpdateMinute < state.startMinute || state.nextEventMinute < state.startMinute) {
    throw new Error("World diplomacy clock precedes its start minute");
  }
  validateRelationTable(state.overrides, "diplomacy override", true);
  validateMinuteTable(state.pairLastChangedMinute, "diplomacy pair change");
  validateContactTable(state.contacts);
  validateSuzeraintyMemory(state.suzerainties);
  if (!Array.isArray(state.history) || state.history.length > DIPLOMACY_HISTORY_LIMIT) {
    throw new Error("Invalid world diplomacy history");
  }
  for (const event of state.history) validateDiplomacyEvent(event);
  return state;
}

export function migrateWorldDiplomacy(state, {
  inactiveFactionIds = /** @type {string[] | Set<string>} */ ([]),
  neutralizeIntroducedFactions = state?.version < WORLD_DIPLOMACY_VERSION
} = {}) {
  if (!state || typeof state !== "object") {
    throw new Error("World diplomacy migration requires a saved state");
  }
  const inactiveFactionCount = Array.isArray(inactiveFactionIds)
    ? inactiveFactionIds.length
    : inactiveFactionIds instanceof Set
      ? inactiveFactionIds.size
      : null;
  if (inactiveFactionCount === null) {
    throw new Error("Inactive diplomacy faction ids must be an array or set");
  }
  const hasContextualMigration = inactiveFactionCount > 0 || neutralizeIntroducedFactions;
  if (state.version === WORLD_DIPLOMACY_VERSION && !hasContextualMigration) {
    return validateWorldDiplomacy(state);
  }
  if (![1, 2, 3, 4, 5, 6, 7, 8, 9, WORLD_DIPLOMACY_VERSION].includes(state.version)) {
    throw new Error(`Unsupported world diplomacy version: ${state.version ?? "missing"}`);
  }
  const migratedOverrides = removeRetiredFactionPairs(state.overrides);
  preserveLegacyOpeningWars(state.version, migratedOverrides);
  const migratedSuzerainties = migrateSuzeraintyMemory(state.suzerainties, state.startMinute, {
    inactiveFactionIds
  });
  if (neutralizeIntroducedFactions) {
    neutralizeNewFactionDefaults(migratedOverrides, migratedSuzerainties);
  }
  return validateWorldDiplomacy({
    ...state,
    version: WORLD_DIPLOMACY_VERSION,
    overrides: migratedOverrides,
    pairLastChangedMinute: removeRetiredFactionPairs(state.pairLastChangedMinute),
    contacts: state.version < 3 ? {} : removeRetiredFactionPairs(state.contacts),
    suzerainties: migratedSuzerainties,
    history: state.history.filter((event) => !diplomacyEventUsesRetiredFaction(event))
  });
}

function preserveLegacyOpeningWars(savedVersion, overrides) {
  if (savedVersion >= WORLD_DIPLOMACY_VERSION) return;
  for (const [factionAId, factionBId] of [
    ["england", "france"],
    ["hospitallers", "ottoman"]
  ]) {
    const key = diplomacyPairKey(factionAId, factionBId);
    if (overrides[key] === undefined) overrides[key] = DIPLOMACY_WAR;
  }
}

function neutralizeNewFactionDefaults(overrides, suzerainties) {
  for (const factionId of DIPLOMACY_INTRODUCED_FACTION_IDS) {
    for (const other of SOVEREIGN_FACTIONS) {
      const preservesBurgundianUnion = factionId === "burgundian-netherlands" &&
        other.id === "spain" && directSuzeraintyBetween(suzerainties, factionId, other.id);
      if (other.id === factionId || diplomacyBetween(factionId, other.id) === DIPLOMACY_NEUTRAL ||
          preservesBurgundianUnion) continue;
      overrides[diplomacyPairKey(factionId, other.id)] = DIPLOMACY_NEUTRAL;
    }
  }
  return overrides;
}

function removeRetiredFactionPairs(table) {
  if (!table || typeof table !== "object" || Array.isArray(table)) return table;
  return Object.fromEntries(Object.entries(table).filter(([key]) => !key.split("|").includes("aztec")));
}

function diplomacyEventUsesRetiredFaction(event) {
  return [event?.factionAId, event?.factionBId, event?.causeFactionAId, event?.causeFactionBId].includes("aztec");
}

export function recordDiplomaticPortCall(state, visitingFactionId, portFactionId, simMinute) {
  validateWorldDiplomacy(state);
  assertFactionId(visitingFactionId);
  assertFactionId(portFactionId);
  assertMinute(simMinute, "diplomatic port call minute");
  if (visitingFactionId === portFactionId ||
      visitingFactionId === NEUTRAL_FACTION_ID || portFactionId === NEUTRAL_FACTION_ID ||
      visitingFactionId === PIRATE_FACTION_ID || portFactionId === PIRATE_FACTION_ID) {
    return null;
  }
  const policyPair = diplomaticPolicyPair(state, visitingFactionId, portFactionId);
  if (!policyPair) return null;
  const key = diplomacyPairKey(policyPair.factionAId, policyPair.factionBId);
  const previous = state.contacts[key];
  const contact = previous
    ? {
        firstContactMinute: previous.firstContactMinute,
        lastContactMinute: Math.max(previous.lastContactMinute, simMinute),
        portCalls: previous.portCalls + 1
      }
    : { firstContactMinute: simMinute, lastContactMinute: simMinute, portCalls: 1 };
  state.contacts[key] = contact;
  return { factionAId: key.split("|")[0], factionBId: key.split("|")[1], ...contact };
}

export function diplomaticContactBetween(state, factionAId, factionBId) {
  if (!state?.contacts || typeof state.contacts !== "object") {
    throw new Error("World diplomacy has no contact ledger");
  }
  assertFactionId(factionAId);
  assertFactionId(factionBId);
  if (factionAId === factionBId) return null;
  const policyPair = diplomaticPolicyPair(state, factionAId, factionBId);
  return policyPair
    ? state.contacts[diplomacyPairKey(policyPair.factionAId, policyPair.factionBId)] || null
    : null;
}

export function worldDiplomacyBetween(state, factionAId, factionBId) {
  assertFactionId(factionAId);
  assertFactionId(factionBId);
  if (factionAId === factionBId) return DIPLOMACY_ALLY;
  if (!state?.suzerainties) return rawWorldDiplomacyBetween(state, factionAId, factionBId);
  if (directSuzeraintyBetween(state.suzerainties, factionAId, factionBId)) {
    return rawWorldDiplomacyBetween(state, factionAId, factionBId);
  }
  const principalAId = foreignPolicyPrincipal(state.suzerainties, factionAId);
  const principalBId = foreignPolicyPrincipal(state.suzerainties, factionBId);
  if (principalAId === principalBId) return DIPLOMACY_ALLY;
  return rawWorldDiplomacyBetween(state, principalAId, principalBId);
}

export function rawWorldDiplomacyBetween(state, factionAId, factionBId) {
  assertFactionId(factionAId);
  assertFactionId(factionBId);
  if (factionAId === factionBId) return DIPLOMACY_ALLY;
  const key = diplomacyPairKey(factionAId, factionBId);
  const override = state?.overrides?.[key];
  if (override !== undefined) {
    if (!RELATIONS.has(override)) throw new Error(`Invalid diplomacy override: ${key}=${override}`);
    return override;
  }
  return diplomacyBetween(factionAId, factionBId);
}

export function advanceWorldDiplomacy(state, currentMinute, influence = {}) {
  validateWorldDiplomacy(state);
  assertMinute(currentMinute, "current diplomacy minute");
  if (currentMinute < state.lastUpdateMinute) {
    throw new Error(`World diplomacy cannot move backward: ${currentMinute} < ${state.lastUpdateMinute}`);
  }

  const events = [];
  let guard = 0;
  while (currentMinute >= state.nextEventMinute && guard < MAX_CATCH_UP_EVENTS) {
    const eventMinute = state.nextEventMinute;
    const primary = chooseDiplomacyEvent(state, eventMinute, influence);
    if (primary) {
      const attackerFirst = diplomacyRandom(state, state.sequence, "war-side") < 0.5;
      const relation = worldDiplomacyBetween(state, primary.factionAId, primary.factionBId);
      const resolved = primary.direction === "worsen" && relation === DIPLOMACY_HOSTILE
        ? declareDiplomaticWar(
            state,
            attackerFirst ? primary.factionAId : primary.factionBId,
            attackerFirst ? primary.factionBId : primary.factionAId,
            eventMinute,
            influence
          )
        : primary.direction === "improve" && relation === DIPLOMACY_WAR
          ? makeDiplomaticPeace(state, primary.factionAId, primary.factionBId, eventMinute, influence)
          : adjustDiplomaticStance(
              state,
              primary.factionAId,
              primary.factionBId,
              primary.direction,
              eventMinute,
              influence
            );
      events.push(...resolved);
    }
    state.sequence += 1;
    state.nextEventMinute = eventMinute + diplomacyEventIntervalMinutes(state, state.sequence);
    guard += 1;
  }
  if (guard >= MAX_CATCH_UP_EVENTS && currentMinute >= state.nextEventMinute) {
    state.nextEventMinute = currentMinute + diplomacyEventIntervalMinutes(state, state.sequence + 1);
  }
  state.lastUpdateMinute = currentMinute;
  return events;
}

export function declareDiplomaticWar(state, attackerId, defenderId, simMinute, influence = {}) {
  validateWorldDiplomacy(state);
  assertSovereignPair(attackerId, defenderId);
  assertMinute(simMinute, "war declaration minute");

  const events = [];
  const direct = directSuzeraintyBetween(state.suzerainties, attackerId, defenderId);
  if (direct) {
    const unionDissolved = direct.kind === SUZERAINTY_KIND_PERSONAL_UNION;
    releaseVassal(state.suzerainties, {
      vassalFactionId: direct.vassalFactionId,
      simMinute,
      source: unionDissolved ? "dynastic-split" : "rebellion"
    });
    events.push(diplomacyEvent({
      state,
      simMinute,
      kind: unionDissolved ? "union-dissolved" : "rebellion",
      factionAId: direct.vassalFactionId,
      factionBId: direct.suzerainFactionId,
      reason: diplomacyEventReason(influence, attackerId, defenderId),
      headline: unionDissolved
        ? `The dynastic union of ${factionName(direct.vassalFactionId)} and ` +
          `${factionName(direct.suzerainFactionId)} dissolves.`
        : `${factionName(direct.vassalFactionId)} rebels against ${factionName(direct.suzerainFactionId)}.`
    }));
    if (unionDissolved) {
      setDynamicRelation(state, attackerId, defenderId, DIPLOMACY_HOSTILE, simMinute);
    }
  } else {
    const policyPair = diplomaticPolicyPair(state, attackerId, defenderId);
    if (!policyPair) return [];
    attackerId = policyPair.factionAId;
    defenderId = policyPair.factionBId;
  }
  if (worldDiplomacyBetween(state, attackerId, defenderId) === DIPLOMACY_ALLY) {
    recordDiplomacyEvents(state, events);
    return events;
  }

  if (worldDiplomacyBetween(state, attackerId, defenderId) !== DIPLOMACY_WAR) {
    setDynamicRelation(state, attackerId, defenderId, DIPLOMACY_WAR, simMinute);
    events.push(diplomacyEvent({
      state,
      simMinute,
      kind: "war",
      factionAId: attackerId,
      factionBId: defenderId,
      reason: diplomacyEventReason(influence, attackerId, defenderId),
      headline: `${factionName(attackerId)} declares war on ${factionName(defenderId)}.`
    }));
  }

  const calls = [
    ...defensivePartnersOf(state.suzerainties, defenderId)
      .map((allyId) => ({ allyId, enemyId: attackerId, chance: 1, reason: "mutual-defense" })),
    ...offensivePartnersOf(state.suzerainties, attackerId)
      .map((allyId) => ({ allyId, enemyId: defenderId, chance: 1, reason: "war-obligation" })),
    ...alliesOf(state, defenderId).map((allyId) => ({ allyId, enemyId: attackerId, chance: 0.72 })),
    ...alliesOf(state, attackerId).map((allyId) => ({ allyId, enemyId: defenderId, chance: 0.58 })),
    ...(influence.imperialConstitution
      ? imperialDefensePartners(
          influence.imperialConstitution,
          defenderId,
          attackerId,
          simMinute
        ).map((allyId) => ({
          allyId,
          enemyId: attackerId,
          chance: 1,
          reason: "imperial-defence"
        }))
      : [])
  ];
  const calledPairs = new Set();
  for (let index = 0; index < calls.length; index++) {
    const { allyId, enemyId, chance, reason = "alliance" } = calls[index];
    const callKey = diplomacyPairKey(allyId, enemyId);
    if (calledPairs.has(callKey)) continue;
    calledPairs.add(callKey);
    const currentRelation = worldDiplomacyBetween(state, allyId, enemyId);
    if (allyId === enemyId || currentRelation === DIPLOMACY_WAR || currentRelation === DIPLOMACY_ALLY) continue;
    if (pairIsCoolingDown(state, allyId, enemyId, simMinute)) continue;
    const roll = diplomacyRandom(state, state.sequence, `alliance|${attackerId}|${defenderId}|${allyId}|${index}`);
    if (roll >= chance) continue;
    setDynamicRelation(state, allyId, enemyId, DIPLOMACY_WAR, simMinute);
    events.push(diplomacyEvent({
      state,
      simMinute,
      kind: "alliance-war",
      factionAId: allyId,
      factionBId: enemyId,
      causeFactionAId: attackerId,
      causeFactionBId: defenderId,
      reason,
      headline: `${factionName(allyId)} enters the war against ${factionName(enemyId)}.`
    }));
  }

  recordDiplomacyEvents(state, events);
  return events;
}

export function makeDiplomaticPeace(state, factionAId, factionBId, simMinute, influence = {}) {
  validateWorldDiplomacy(state);
  assertSovereignPair(factionAId, factionBId);
  assertMinute(simMinute, "peace treaty minute");
  const policyPair = diplomaticPolicyPair(state, factionAId, factionBId);
  if (!policyPair) return [];
  factionAId = policyPair.factionAId;
  factionBId = policyPair.factionBId;
  if (worldDiplomacyBetween(state, factionAId, factionBId) !== DIPLOMACY_WAR) return [];
  setDynamicRelation(state, factionAId, factionBId, DIPLOMACY_HOSTILE, simMinute);
  const events = [diplomacyEvent({
    state,
    simMinute,
    kind: "peace",
    factionAId,
    factionBId,
    reason: diplomacyEventReason(influence, factionAId, factionBId),
    headline: `${factionName(factionAId)} and ${factionName(factionBId)} make peace.`
  })];
  recordDiplomacyEvents(state, events);
  return events;
}

export function makeFactionPeaceWithAllEnemies(state, factionId, simMinute, influence = {}) {
  validateWorldDiplomacy(state);
  assertFactionId(factionId);
  assertMinute(simMinute, "general peace treaty minute");
  if (factionId === NEUTRAL_FACTION_ID || factionId === PIRATE_FACTION_ID) {
    throw new Error(`General peace requires a sovereign faction: ${factionId}`);
  }

  const events = [];
  for (const faction of SOVEREIGN_FACTIONS) {
    if (faction.id === factionId) continue;
    if (worldDiplomacyBetween(state, factionId, faction.id) !== DIPLOMACY_WAR) continue;
    events.push(...makeDiplomaticPeace(state, factionId, faction.id, simMinute, influence));
  }
  return events;
}

export function adjustDiplomaticStance(
  state,
  factionAId,
  factionBId,
  direction,
  simMinute,
  influence = {}
) {
  validateWorldDiplomacy(state);
  assertSovereignPair(factionAId, factionBId);
  assertMinute(simMinute, "diplomatic stance minute");
  if (direction !== "improve" && direction !== "worsen") {
    throw new Error(`Invalid diplomatic stance direction: ${direction}`);
  }
  const policyPair = diplomaticPolicyPair(state, factionAId, factionBId);
  if (!policyPair) return [];
  factionAId = policyPair.factionAId;
  factionBId = policyPair.factionBId;
  const previous = worldDiplomacyBetween(state, factionAId, factionBId);
  const previousIndex = RELATION_LADDER.indexOf(previous);
  const nextIndex = clamp(previousIndex + (direction === "improve" ? 1 : -1), 0, RELATION_LADDER.length - 1);
  if (nextIndex === previousIndex) return [];
  const relation = RELATION_LADDER[nextIndex];
  setDynamicRelation(state, factionAId, factionBId, relation, simMinute);
  const kind = stanceEventKind(previous, relation);
  const events = [diplomacyEvent({
    state,
    simMinute,
    kind,
    factionAId,
    factionBId,
    previousRelation: previous,
    relation,
    reason: diplomacyEventReason(influence, factionAId, factionBId),
    headline: stanceHeadline(kind, factionAId, factionBId)
  })];
  recordDiplomacyEvents(state, events);
  return events;
}

export function establishDiplomaticSuzerainty(state, {
  vassalFactionId,
  suzerainFactionId,
  kind,
  simMinute,
  source = "peace-treaty",
  relation = DIPLOMACY_HOSTILE
}) {
  validateWorldDiplomacy(state);
  assertSovereignPair(vassalFactionId, suzerainFactionId);
  assertMinute(simMinute, "diplomatic suzerainty minute");
  if (!RELATIONS.has(relation) || relation === DIPLOMACY_WAR) {
    throw new Error(`Invalid initial vassal relation: ${relation}`);
  }
  const principalId = foreignPolicyPrincipal(state.suzerainties, suzerainFactionId);
  const relationshipEvent = establishSuzerainty(state.suzerainties, {
    vassalFactionId,
    suzerainFactionId: principalId,
    kind,
    simMinute,
    source
  });
  setDynamicRelation(state, vassalFactionId, principalId, relation, simMinute);
  const event = diplomacyEvent({
    state,
    simMinute,
    kind: "vassalage",
    factionAId: vassalFactionId,
    factionBId: principalId,
    relationshipKind: relationshipEvent.relationshipKind,
    reason: source,
    headline: suzeraintyHeadline(kind, vassalFactionId, principalId)
  });
  recordDiplomacyEvents(state, [event]);
  return event;
}

export function releaseDiplomaticVassal(state, {
  vassalFactionId,
  simMinute,
  source = "envoy-treaty",
  relation = DIPLOMACY_NEUTRAL
}) {
  validateWorldDiplomacy(state);
  assertFactionId(vassalFactionId);
  assertMinute(simMinute, "diplomatic independence minute");
  if (!RELATIONS.has(relation) || relation === DIPLOMACY_WAR) {
    throw new Error(`Invalid post-independence relation: ${relation}`);
  }
  const existing = state.suzerainties.byVassalId[vassalFactionId];
  if (!existing) return null;
  const suzerainFactionId = existing.suzerainFactionId;
  releaseVassal(state.suzerainties, { vassalFactionId, simMinute, source });
  setDynamicRelation(state, vassalFactionId, suzerainFactionId, relation, simMinute);
  const event = diplomacyEvent({
    state,
    simMinute,
    kind: "independence",
    factionAId: vassalFactionId,
    factionBId: suzerainFactionId,
    relationshipKind: existing.kind,
    reason: source,
    headline: `${factionName(vassalFactionId)} is released from ${factionName(suzerainFactionId)}'s overlordship.`
  });
  recordDiplomacyEvents(state, [event]);
  return event;
}

export function succeedDiplomaticFaction(state, {
  predecessorFactionId,
  successorFactionId,
  simMinute,
  source = "dynastic-succession",
  headline
}) {
  validateWorldDiplomacy(state);
  assertSovereignPair(predecessorFactionId, successorFactionId);
  assertMinute(simMinute, "diplomatic succession minute");
  if (typeof source !== "string" || source.trim() === "") {
    throw new Error("Diplomatic succession source is required");
  }
  if (typeof headline !== "string" || headline.trim() === "") {
    throw new Error("Diplomatic succession headline is required");
  }

  const inheritedRelations = new Map();
  for (const faction of SOVEREIGN_FACTIONS) {
    if ([predecessorFactionId, successorFactionId].includes(faction.id)) continue;
    inheritedRelations.set(faction.id, rawWorldDiplomacyBetween(state, predecessorFactionId, faction.id));
  }
  const ownSuzerainty = state.suzerainties.byVassalId[predecessorFactionId] || null;
  const inheritedDependents = dependentsOf(state.suzerainties, predecessorFactionId);
  releaseFactionSuzerainties(state.suzerainties, predecessorFactionId, simMinute, source);
  if (ownSuzerainty && ownSuzerainty.suzerainFactionId !== successorFactionId) {
    establishSuzerainty(state.suzerainties, {
      vassalFactionId: successorFactionId,
      suzerainFactionId: ownSuzerainty.suzerainFactionId,
      kind: ownSuzerainty.kind,
      termOverrides: ownSuzerainty.terms,
      simMinute,
      source
    });
  }
  for (const dependent of inheritedDependents) {
    if (dependent.vassalFactionId === successorFactionId) continue;
    establishSuzerainty(state.suzerainties, {
      vassalFactionId: dependent.vassalFactionId,
      suzerainFactionId: successorFactionId,
      kind: dependent.kind,
      termOverrides: dependent.terms,
      simMinute,
      source
    });
  }

  for (const [otherFactionId, relation] of inheritedRelations) {
    setDynamicRelation(state, successorFactionId, otherFactionId, relation, simMinute);
    const predecessorContact = state.contacts[diplomacyPairKey(predecessorFactionId, otherFactionId)];
    if (predecessorContact) {
      state.contacts[diplomacyPairKey(successorFactionId, otherFactionId)] = { ...predecessorContact };
    }
  }
  const event = diplomacyEvent({
    state,
    simMinute,
    kind: "succession",
    factionAId: successorFactionId,
    factionBId: predecessorFactionId,
    reason: source,
    headline
  });
  recordDiplomacyEvents(state, [event]);
  validateWorldDiplomacy(state);
  return Object.freeze(event);
}

function suzeraintyHeadline(kind, subjectId, suzerainId) {
  if (kind === SUZERAINTY_KIND_PERSONAL_UNION) {
    return `${factionName(subjectId)} enters a personal union with ${factionName(suzerainId)}.`;
  }
  if (kind === SUZERAINTY_KIND_TRIBUTARY) {
    return `${factionName(subjectId)} agrees to pay tribute to ${factionName(suzerainId)}.`;
  }
  if (kind === SUZERAINTY_KIND_AUTONOMOUS_VASSAL) {
    return `${factionName(subjectId)} accepts ${factionName(suzerainId)} as protector while retaining its own foreign policy.`;
  }
  return `${factionName(subjectId)} accepts ${factionName(suzerainId)} as suzerain.`;
}

export function dissolveFactionDiplomaticSuzerainties(state, factionId, simMinute, source = "annexation") {
  validateWorldDiplomacy(state);
  assertFactionId(factionId);
  assertMinute(simMinute, "diplomatic suzerainty dissolution minute");
  return releaseFactionSuzerainties(state.suzerainties, factionId, simMinute, source);
}

export function dissolveFactionDiplomaticPersonalUnions(
  state,
  factionId,
  simMinute,
  source = "forced-treaty"
) {
  validateWorldDiplomacy(state);
  assertFactionId(factionId);
  assertMinute(simMinute, "diplomatic personal union dissolution minute");
  return releaseFactionPersonalUnions(state.suzerainties, factionId, simMinute, source);
}

export function suzerainFactionForState(state, factionId) {
  validateWorldDiplomacy(state);
  return suzerainForFaction(state.suzerainties, factionId);
}

export function foreignPolicyPrincipalForState(state, factionId) {
  validateWorldDiplomacy(state);
  return foreignPolicyPrincipal(state.suzerainties, factionId);
}

export function playerDiplomacyBias(influence, factionAId, factionBId, eventKind) {
  if (eventKind !== "war" && eventKind !== "peace") throw new Error(`Invalid diplomacy event kind: ${eventKind}`);
  const homeFactionId = influence?.homeFactionId || null;
  if (!homeFactionId || (homeFactionId !== factionAId && homeFactionId !== factionBId)) return 1;
  if (influence.homeFactionInGoodStanding === false) return 1;
  const otherId = homeFactionId === factionAId ? factionBId : factionAId;
  const decisions = influence.decisions || {};
  const reputation = Number(influence.reputation?.[otherId] || 0);
  const trade = decisionCount(decisions, `reputation.trade.${otherId}`);
  const deliveries = decisionCount(decisions, `reputation.delivery.${otherId}`);
  const missions = decisionCount(decisions, `reputation.mission.${otherId}`);
  const attacks = decisionCount(decisions, `reputation.attack.${otherId}`);
  const piracy = decisionCount(decisions, `reputation.piracy.${otherId}`);
  const peacefulPressure = trade * 0.025 + deliveries * 0.22 + missions * 0.18 +
    Math.max(0, reputation) * 0.014;
  const hostilePressure = attacks * 0.55 + piracy * 0.3 + Math.max(0, -reputation) * 0.018;
  const score = eventKind === "war" ? hostilePressure - peacefulPressure : peacefulPressure - hostilePressure;
  return clamp(Math.exp(score), 0.15, 6);
}

export function recentDiplomacyEvents(state, limit = 3) {
  validateWorldDiplomacy(state);
  if (!Number.isInteger(limit) || limit < 0) throw new Error(`Invalid diplomacy history limit: ${limit}`);
  return state.history.slice(0, limit);
}

export function diplomacyEventNotice(event) {
  validateDiplomacyEvent(event);
  const a = factionShortName(event.factionAId).toUpperCase();
  const b = factionShortName(event.factionBId).toUpperCase();
  if (event.kind === "succession") return "MUGHALS TAKE DELHI";
  if (event.kind === "peace") return `PEACE: ${a} / ${b}`;
  if (event.kind === "alliance") return `ALLIANCE: ${a} / ${b}`;
  if (event.kind === "alliance-ended") return `ALLIANCE ENDS: ${a} / ${b}`;
  if (event.kind === "relations-improve") return `RELATIONS IMPROVE: ${a} / ${b}`;
  if (event.kind === "relations-worsen") return `RELATIONS WORSEN: ${a} / ${b}`;
  if (event.kind === "alliance-war") return `ALLY JOINS WAR: ${a} / ${b}`;
  if (event.kind === "vassalage") {
    if (event.relationshipKind === SUZERAINTY_KIND_TRIBUTARY) {
      return event.headline.toUpperCase();
    }
    if (event.relationshipKind === SUZERAINTY_KIND_AUTONOMOUS_VASSAL) {
      return `PROTECTORATE: ${a} / ${b}`;
    }
    if (event.relationshipKind === SUZERAINTY_KIND_PERSONAL_UNION) return `UNION: ${a} / ${b}`;
    return `VASSALAGE: ${a} / ${b}`;
  }
  if (event.kind === "rebellion") return `REBELLION: ${a} / ${b}`;
  if (event.kind === "independence") return `INDEPENDENCE: ${a} / ${b}`;
  if (event.kind === "union-dissolved") return `UNION DISSOLVED: ${a} / ${b}`;
  return `WAR: ${a} / ${b}`;
}

export function diplomacyPairKey(factionAId, factionBId) {
  assertFactionId(factionAId);
  assertFactionId(factionBId);
  return factionAId < factionBId ? `${factionAId}|${factionBId}` : `${factionBId}|${factionAId}`;
}

function chooseDiplomacyEvent(state, eventMinute, influence) {
  const candidates = [];
  const warCount = currentWarCount(state);
  const warBalance = warCount >= 16 ? 0.18 : warCount >= 13 ? 0.48 : warCount <= 7 ? 1.55 : 1;
  const peaceBalance = warCount >= 13 ? 1.5 : warCount <= 7 ? 0.7 : 1;

  for (let i = 0; i < SOVEREIGN_FACTIONS.length; i++) {
    for (let j = i + 1; j < SOVEREIGN_FACTIONS.length; j++) {
      const factionAId = SOVEREIGN_FACTIONS[i].id;
      const factionBId = SOVEREIGN_FACTIONS[j].id;
      const policyPair = diplomaticPolicyPair(state, factionAId, factionBId);
      if (!policyPair || diplomacyPairKey(policyPair.factionAId, policyPair.factionBId) !==
          diplomacyPairKey(factionAId, factionBId)) {
        continue;
      }
      if (diplomacyPairIsLocked(influence, factionAId, factionBId)) continue;
      if (pairIsCoolingDown(state, factionAId, factionBId, eventMinute)) continue;
      const relation = worldDiplomacyBetween(state, factionAId, factionBId);
      const contact = state.contacts[diplomacyPairKey(factionAId, factionBId)];
      if (!contact) continue;
      const interactionWeight = 1 + Math.min(2, Math.log2(contact.portCalls + 1) * 0.25);
      const aggressionMultiplier = factionDiplomaticAggressionMultiplier(
        factionAId,
        factionBId,
        eventMinute
      );
      if (relation !== DIPLOMACY_ALLY) {
        candidates.push({
          direction: "improve",
          factionAId,
          factionBId,
          weight: 0.1 * interactionWeight * (relation === DIPLOMACY_WAR ? peaceBalance : 1) *
            (relation === DIPLOMACY_WAR ? 1 : 1 / Math.sqrt(aggressionMultiplier)) *
            playerDiplomacyBias(influence, factionAId, factionBId, "peace")
        });
      }
      if (relation !== DIPLOMACY_WAR) {
        candidates.push({
          direction: "worsen",
          factionAId,
          factionBId,
          weight: 0.1 * interactionWeight * (relation === DIPLOMACY_HOSTILE ? warBalance : 1) *
            aggressionMultiplier *
            playerDiplomacyBias(influence, factionAId, factionBId, "war")
        });
      }
    }
  }
  return weightedChoice(candidates, diplomacyRandom(state, state.sequence, "primary-event"));
}

function diplomacyPairIsLocked(influence, factionAId, factionBId) {
  const locked = influence?.lockedPairKeys || [];
  if (!Array.isArray(locked)) throw new Error("Diplomatic influence locks must be an array");
  return locked.includes(diplomacyPairKey(factionAId, factionBId));
}

function setDynamicRelation(state, factionAId, factionBId, relation, simMinute) {
  const key = diplomacyPairKey(factionAId, factionBId);
  if (!RELATIONS.has(relation)) throw new Error(`Invalid dynamic diplomacy relation: ${relation}`);
  if (relation === diplomacyBetween(factionAId, factionBId)) delete state.overrides[key];
  else state.overrides[key] = relation;
  state.pairLastChangedMinute[key] = simMinute;
}

function alliesOf(state, factionId) {
  return SOVEREIGN_FACTIONS
    .map((faction) => faction.id)
    .filter((otherId) => otherId !== factionId)
    .filter((otherId) => foreignPolicyPrincipal(state.suzerainties, otherId) === otherId)
    .filter((otherId) => worldDiplomacyBetween(state, factionId, otherId) === DIPLOMACY_ALLY);
}

function pairIsCoolingDown(state, factionAId, factionBId, simMinute) {
  const changedMinute = state.pairLastChangedMinute[diplomacyPairKey(factionAId, factionBId)];
  return Number.isFinite(changedMinute) && simMinute - changedMinute < DIPLOMACY_PAIR_COOLDOWN_MINUTES;
}

function currentWarCount(state) {
  const principals = SOVEREIGN_FACTIONS.filter((faction) => (
    foreignPolicyPrincipal(state.suzerainties, faction.id) === faction.id
  ));
  let count = 0;
  for (let i = 0; i < principals.length; i++) {
    for (let j = i + 1; j < principals.length; j++) {
      if (worldDiplomacyBetween(state, principals[i].id, principals[j].id) === DIPLOMACY_WAR) {
        count += 1;
      }
    }
  }
  return count;
}

function diplomaticPolicyPair(state, factionAId, factionBId) {
  assertFactionId(factionAId);
  assertFactionId(factionBId);
  if (factionAId === factionBId) return null;
  const direct = directSuzeraintyBetween(state.suzerainties, factionAId, factionBId);
  if (direct?.kind === SUZERAINTY_KIND_PERSONAL_UNION) return null;
  if (direct) {
    return { factionAId, factionBId };
  }
  const principalAId = foreignPolicyPrincipal(state.suzerainties, factionAId);
  const principalBId = foreignPolicyPrincipal(state.suzerainties, factionBId);
  return principalAId === principalBId
    ? null
    : { factionAId: principalAId, factionBId: principalBId };
}

function recordDiplomacyEvents(state, events) {
  if (events.length === 0) return;
  state.history.unshift(...events.slice().reverse());
  if (state.history.length > DIPLOMACY_HISTORY_LIMIT) state.history.length = DIPLOMACY_HISTORY_LIMIT;
}

function diplomacyEvent({ state, simMinute, kind, factionAId, factionBId, reason, headline, ...details }) {
  return {
    id: `diplomacy-${state.sequence}-${kind}-${diplomacyPairKey(factionAId, factionBId)}`,
    simMinute,
    kind,
    factionAId,
    factionBId,
    reason: reason || "world",
    headline,
    ...details
  };
}

function diplomacyEventIntervalMinutes(state, sequence) {
  const span = DIPLOMACY_MAX_EVENT_DAYS - DIPLOMACY_MIN_EVENT_DAYS;
  const days = DIPLOMACY_MIN_EVENT_DAYS + diplomacyRandom(state, sequence, "interval") * span;
  return Math.round(days * MINUTES_PER_DAY);
}

function diplomacyRandom(state, sequence, salt) {
  return hashString32(`${state.seed}|${sequence}|${salt}`) / 0x100000000;
}

function weightedChoice(candidates, roll) {
  const weighted = candidates.filter((candidate) => Number.isFinite(candidate.weight) && candidate.weight > 0);
  const total = weighted.reduce((sum, candidate) => sum + candidate.weight, 0);
  if (total <= 0) return null;
  let target = roll * total;
  for (const candidate of weighted) {
    target -= candidate.weight;
    if (target <= 0) return candidate;
  }
  return weighted[weighted.length - 1] || null;
}

function playerInfluenceReason(influence, factionAId, factionBId) {
  const warBias = playerDiplomacyBias(influence, factionAId, factionBId, "war");
  const peaceBias = playerDiplomacyBias(influence, factionAId, factionBId, "peace");
  return warBias !== 1 || peaceBias !== 1 ? "player-influenced" : "world";
}

function diplomacyEventReason(influence, factionAId, factionBId) {
  if (typeof influence?.eventReason === "string" && influence.eventReason.trim() !== "") {
    return influence.eventReason.trim();
  }
  return playerInfluenceReason(influence, factionAId, factionBId);
}

function decisionCount(decisions, key) {
  const value = decisions[key];
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function factionName(factionId) {
  return FACTIONS_BY_ID.get(factionId)?.name || factionId;
}

function factionShortName(factionId) {
  const faction = FACTIONS_BY_ID.get(factionId);
  return faction?.shortName || faction?.name || factionId;
}

function assertSovereignPair(factionAId, factionBId) {
  assertFactionId(factionAId);
  assertFactionId(factionBId);
  if (factionAId === factionBId || [factionAId, factionBId].includes(NEUTRAL_FACTION_ID) ||
      [factionAId, factionBId].includes(PIRATE_FACTION_ID)) {
    throw new Error(`Dynamic diplomacy requires two sovereign factions: ${factionAId}/${factionBId}`);
  }
}

function validateRelationTable(table, label, sovereignOnly) {
  if (!table || typeof table !== "object" || Array.isArray(table)) throw new Error(`Invalid ${label} table`);
  for (const [key, relation] of Object.entries(table)) {
    const [factionAId, factionBId] = parsePairKey(key);
    if (sovereignOnly) assertSovereignPair(factionAId, factionBId);
    if (!RELATIONS.has(relation)) throw new Error(`Invalid ${label}: ${key}=${relation}`);
  }
}

function validateMinuteTable(table, label) {
  if (!table || typeof table !== "object" || Array.isArray(table)) throw new Error(`Invalid ${label} table`);
  for (const [key, minute] of Object.entries(table)) {
    parsePairKey(key);
    assertMinute(minute, `${label} ${key}`);
  }
}

function validateContactTable(table) {
  if (!table || typeof table !== "object" || Array.isArray(table)) {
    throw new Error("Invalid diplomatic contact table");
  }
  for (const [key, contact] of Object.entries(table)) {
    const [factionAId, factionBId] = parsePairKey(key);
    assertSovereignPair(factionAId, factionBId);
    if (!contact || typeof contact !== "object" ||
        !Number.isInteger(contact.portCalls) || contact.portCalls <= 0) {
      throw new Error(`Invalid diplomatic contact: ${key}`);
    }
    assertMinute(contact.firstContactMinute, `first diplomatic contact ${key}`);
    assertMinute(contact.lastContactMinute, `last diplomatic contact ${key}`);
    if (contact.lastContactMinute < contact.firstContactMinute) {
      throw new Error(`Diplomatic contact ends before it begins: ${key}`);
    }
  }
}

function parsePairKey(key) {
  if (typeof key !== "string") throw new Error(`Invalid diplomacy pair key: ${key}`);
  const parts = key.split("|");
  if (parts.length !== 2 || parts[0] >= parts[1]) throw new Error(`Invalid diplomacy pair key: ${key}`);
  assertFactionId(parts[0]);
  assertFactionId(parts[1]);
  return parts;
}

function validateDiplomacyEvent(event) {
  if (!event || typeof event !== "object" || typeof event.id !== "string" || event.id === "") {
    throw new Error("Invalid diplomacy history event");
  }
  if (![
    "war",
    "peace",
    "alliance-war",
    "alliance",
    "alliance-ended",
    "relations-improve",
    "relations-worsen",
    "vassalage",
    "rebellion",
    "independence",
    "union-dissolved",
    "succession"
  ].includes(event.kind)) {
    throw new Error(`Invalid diplomacy history event kind: ${event.kind}`);
  }
  assertSovereignPair(event.factionAId, event.factionBId);
  assertMinute(event.simMinute, "diplomacy event minute");
  if (typeof event.headline !== "string" || event.headline === "") {
    throw new Error(`Diplomacy event ${event.id} has no headline`);
  }
}

function stanceEventKind(previous, relation) {
  if (previous === DIPLOMACY_FRIENDLY && relation === DIPLOMACY_ALLY) return "alliance";
  if (previous === DIPLOMACY_ALLY && relation === DIPLOMACY_FRIENDLY) return "alliance-ended";
  return RELATION_LADDER.indexOf(relation) > RELATION_LADDER.indexOf(previous)
    ? "relations-improve"
    : "relations-worsen";
}

function stanceHeadline(kind, factionAId, factionBId) {
  const a = factionName(factionAId);
  const b = factionName(factionBId);
  if (kind === "alliance") return `${a} and ${b} form an alliance.`;
  if (kind === "alliance-ended") return `${a} and ${b} dissolve their alliance.`;
  if (kind === "relations-improve") return `${a} and ${b} improve relations.`;
  return `${a} and ${b} move toward conflict.`;
}

function assertMinute(value, label) {
  if (!Number.isFinite(value) || value < 0) throw new Error(`Invalid ${label}: ${value}`);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function hashString32(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 0xc2b2ae35);
  hash ^= hash >>> 16;
  return hash >>> 0;
}
