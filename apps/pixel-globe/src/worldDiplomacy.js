import {
  DIPLOMACY_ALLY,
  DIPLOMACY_NEUTRAL,
  DIPLOMACY_WAR,
  FACTIONS,
  NEUTRAL_FACTION_ID,
  PIRATE_FACTION_ID,
  assertFactionId,
  diplomacyBetween
} from "./factions.js";

export const WORLD_DIPLOMACY_VERSION = 1;
export const DIPLOMACY_MIN_EVENT_DAYS = 75;
export const DIPLOMACY_MAX_EVENT_DAYS = 150;
export const DIPLOMACY_PAIR_COOLDOWN_DAYS = 120;
export const DIPLOMACY_HISTORY_LIMIT = 24;

const MINUTES_PER_DAY = 24 * 60;
const DIPLOMACY_PAIR_COOLDOWN_MINUTES = DIPLOMACY_PAIR_COOLDOWN_DAYS * MINUTES_PER_DAY;
const MAX_CATCH_UP_EVENTS = 24;
const RELATIONS = new Set([DIPLOMACY_ALLY, DIPLOMACY_NEUTRAL, DIPLOMACY_WAR]);
const SOVEREIGN_FACTIONS = FACTIONS.filter((faction) => (
  faction.id !== NEUTRAL_FACTION_ID && faction.id !== PIRATE_FACTION_ID
));
const FACTIONS_BY_ID = new Map(FACTIONS.map((faction) => [faction.id, faction]));

// Shared theatres keep procedural wars geographically and politically legible.
const DIPLOMATIC_THEATRES = Object.freeze([
  Object.freeze(["england", "scotland", "france", "spain", "portugal", "habsburg", "denmark-norway"]),
  Object.freeze(["habsburg", "hungary", "ottoman", "venice", "genoa", "papal-states", "muscovy", "poland-lithuania"]),
  Object.freeze(["spain", "portugal", "ottoman", "venice", "genoa", "papal-states", "morocco"]),
  Object.freeze(["portugal", "ottoman", "safavid", "ethiopia", "gujarat", "vijayanagara"]),
  Object.freeze(["portugal", "safavid", "gujarat", "vijayanagara", "bengal", "delhi"]),
  Object.freeze(["portugal", "ming", "japan", "joseon", "ayutthaya"]),
  Object.freeze(["spain", "portugal", "aztec", "inca"]),
  Object.freeze(["portugal", "spain", "morocco", "songhai"])
]);

const PLAUSIBLE_WAR_PAIRS = new Set();
for (const theatre of DIPLOMATIC_THEATRES) {
  for (let i = 0; i < theatre.length; i++) {
    for (let j = i + 1; j < theatre.length; j++) {
      PLAUSIBLE_WAR_PAIRS.add(diplomacyPairKey(theatre[i], theatre[j]));
    }
  }
}

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
  if (!Array.isArray(state.history) || state.history.length > DIPLOMACY_HISTORY_LIMIT) {
    throw new Error("Invalid world diplomacy history");
  }
  for (const event of state.history) validateDiplomacyEvent(event);
  return state;
}

export function worldDiplomacyBetween(state, factionAId, factionBId) {
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
      const resolved = primary.kind === "war"
        ? declareDiplomaticWar(
            state,
            attackerFirst ? primary.factionAId : primary.factionBId,
            attackerFirst ? primary.factionBId : primary.factionAId,
            eventMinute,
            influence
          )
        : makeDiplomaticPeace(state, primary.factionAId, primary.factionBId, eventMinute, influence);
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
  if (worldDiplomacyBetween(state, attackerId, defenderId) === DIPLOMACY_ALLY) return [];

  const events = [];
  if (worldDiplomacyBetween(state, attackerId, defenderId) !== DIPLOMACY_WAR) {
    setDynamicRelation(state, attackerId, defenderId, DIPLOMACY_WAR, simMinute);
    events.push(diplomacyEvent({
      state,
      simMinute,
      kind: "war",
      factionAId: attackerId,
      factionBId: defenderId,
      reason: playerInfluenceReason(influence, attackerId, defenderId),
      headline: `${factionName(attackerId)} declares war on ${factionName(defenderId)}.`
    }));
  }

  const calls = [
    ...alliesOf(state, defenderId).map((allyId) => ({ allyId, enemyId: attackerId, chance: 0.72 })),
    ...alliesOf(state, attackerId).map((allyId) => ({ allyId, enemyId: defenderId, chance: 0.58 }))
  ];
  for (let index = 0; index < calls.length; index++) {
    const { allyId, enemyId, chance } = calls[index];
    if (allyId === enemyId || worldDiplomacyBetween(state, allyId, enemyId) !== DIPLOMACY_NEUTRAL) continue;
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
      reason: "alliance",
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
  if (worldDiplomacyBetween(state, factionAId, factionBId) !== DIPLOMACY_WAR) return [];
  setDynamicRelation(state, factionAId, factionBId, DIPLOMACY_NEUTRAL, simMinute);
  const events = [diplomacyEvent({
    state,
    simMinute,
    kind: "peace",
    factionAId,
    factionBId,
    reason: playerInfluenceReason(influence, factionAId, factionBId),
    headline: `${factionName(factionAId)} and ${factionName(factionBId)} make peace.`
  })];
  recordDiplomacyEvents(state, events);
  return events;
}

export function playerDiplomacyBias(influence, factionAId, factionBId, eventKind) {
  if (eventKind !== "war" && eventKind !== "peace") throw new Error(`Invalid diplomacy event kind: ${eventKind}`);
  const homeFactionId = influence?.homeFactionId || null;
  if (!homeFactionId || (homeFactionId !== factionAId && homeFactionId !== factionBId)) return 1;
  const otherId = homeFactionId === factionAId ? factionBId : factionAId;
  const decisions = influence.decisions || {};
  const reputation = Number(influence.reputation?.[otherId] || 0);
  const trade = decisionCount(decisions, `reputation.trade.${otherId}`);
  const deliveries = decisionCount(decisions, `reputation.delivery.${otherId}`);
  const attacks = decisionCount(decisions, `reputation.attack.${otherId}`);
  const piracy = decisionCount(decisions, `reputation.piracy.${otherId}`);
  const peacefulPressure = trade * 0.025 + deliveries * 0.22 + Math.max(0, reputation) * 0.014;
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
  if (event.kind === "peace") return `PEACE: ${a} / ${b}`;
  if (event.kind === "alliance-war") return `ALLY JOINS WAR: ${a} / ${b}`;
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
      if (pairIsCoolingDown(state, factionAId, factionBId, eventMinute)) continue;
      const relation = worldDiplomacyBetween(state, factionAId, factionBId);
      if (relation === DIPLOMACY_WAR) {
        candidates.push({
          kind: "peace",
          factionAId,
          factionBId,
          weight: peaceBalance * playerDiplomacyBias(influence, factionAId, factionBId, "peace")
        });
      } else if (
        relation === DIPLOMACY_NEUTRAL &&
        PLAUSIBLE_WAR_PAIRS.has(diplomacyPairKey(factionAId, factionBId))
      ) {
        candidates.push({
          kind: "war",
          factionAId,
          factionBId,
          weight: 0.13 * warBalance * playerDiplomacyBias(influence, factionAId, factionBId, "war")
        });
      }
    }
  }
  return weightedChoice(candidates, diplomacyRandom(state, state.sequence, "primary-event"));
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
    .filter((otherId) => worldDiplomacyBetween(state, factionId, otherId) === DIPLOMACY_ALLY);
}

function pairIsCoolingDown(state, factionAId, factionBId, simMinute) {
  const changedMinute = state.pairLastChangedMinute[diplomacyPairKey(factionAId, factionBId)];
  return Number.isFinite(changedMinute) && simMinute - changedMinute < DIPLOMACY_PAIR_COOLDOWN_MINUTES;
}

function currentWarCount(state) {
  let count = 0;
  for (let i = 0; i < SOVEREIGN_FACTIONS.length; i++) {
    for (let j = i + 1; j < SOVEREIGN_FACTIONS.length; j++) {
      if (worldDiplomacyBetween(state, SOVEREIGN_FACTIONS[i].id, SOVEREIGN_FACTIONS[j].id) === DIPLOMACY_WAR) {
        count += 1;
      }
    }
  }
  return count;
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

function decisionCount(decisions, key) {
  const value = decisions[key];
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function factionName(factionId) {
  return FACTIONS_BY_ID.get(factionId)?.name || factionId;
}

function factionShortName(factionId) {
  const faction = FACTIONS_BY_ID.get(factionId);
  return faction?.adjective || faction?.name || factionId;
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
  if (!["war", "peace", "alliance-war"].includes(event.kind)) {
    throw new Error(`Invalid diplomacy history event kind: ${event.kind}`);
  }
  assertSovereignPair(event.factionAId, event.factionBId);
  assertMinute(event.simMinute, "diplomacy event minute");
  if (typeof event.headline !== "string" || event.headline === "") {
    throw new Error(`Diplomacy event ${event.id} has no headline`);
  }
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
