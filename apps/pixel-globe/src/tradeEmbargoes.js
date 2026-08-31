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
  factionById
} from "./factions.js";
import { gameMinuteForDate, rulerAtMinute } from "./rulers.js";
import {
  isMuslimReligion,
  isRomanCatholicReligion
} from "./religiousAttitudes.js";
import {
  rawWorldDiplomacyBetween,
  validateWorldDiplomacy
} from "./worldDiplomacy.js";
import { requireCityId, requireEntityId } from "./entityIds.js";

export const TRADE_EMBARGO_VERSION = 2;
export const TRADE_EMBARGO_SCOPE_ALL_GOODS = "all-goods";
export const TRADE_EMBARGO_SCOPE_WAR_MATERIEL = "war-materiel";
export const TRADE_EMBARGO_RESTRICTION_IMPORTS = "enemy-imports";
export const TRADE_EMBARGO_RESTRICTION_EXPORTS = "strategic-exports";
export const TRADE_EMBARGO_RESTRICTION_BLOCKADE = "naval-blockade";
export const TRADE_EMBARGO_AUTHORITY_NATIONAL = "national";
export const TRADE_EMBARGO_AUTHORITY_PAPAL = "papal";
export const TRADE_EMBARGO_HISTORY_LIMIT = 32;
export const TRADE_EMBARGO_ORDER_LIMIT = 48;
export const TRADE_EMBARGO_ENFORCEMENT_VERSION = 3;
export const TRADE_EMBARGO_REPUTATION_PENALTY = 9;
export const PAPAL_EMBARGO_REPUTATION_PENALTY = 5;
export const TRADE_EMBARGO_EVENT_KINDS = Object.freeze([
  "imposed",
  "lifted",
  "followers-changed"
]);

const MINUTES_PER_DAY = 24 * 60;
const REVIEW_MIN_DAYS = 75;
const REVIEW_MAX_DAYS = 135;
const MAX_CATCH_UP_REVIEWS = 12;
const MIN_NATIONAL_EMBARGO_DAYS = 90;
const PLAYER_INCIDENT_LIMIT = 24;
const CHECKED_SHIP_LIMIT = 32;
const SOVEREIGN_FACTIONS = Object.freeze(FACTIONS.filter(({ id }) => (
  id !== NEUTRAL_FACTION_ID && id !== PIRATE_FACTION_ID
)));
const EMBARGO_SCOPES = new Set([
  TRADE_EMBARGO_SCOPE_ALL_GOODS,
  TRADE_EMBARGO_SCOPE_WAR_MATERIEL
]);
const EMBARGO_AUTHORITIES = new Set([
  TRADE_EMBARGO_AUTHORITY_NATIONAL,
  TRADE_EMBARGO_AUTHORITY_PAPAL
]);
const EMBARGO_RESTRICTIONS = new Set([
  TRADE_EMBARGO_RESTRICTION_IMPORTS,
  TRADE_EMBARGO_RESTRICTION_EXPORTS,
  TRADE_EMBARGO_RESTRICTION_BLOCKADE
]);
const EMBARGO_EVENT_KINDS = new Set(TRADE_EMBARGO_EVENT_KINDS);
const HISTORICAL_TRANSITION_STATES = new Set(["completed", "averted"]);

export const TRADE_EMBARGO_WAR_MATERIEL_GOOD_IDS = Object.freeze([
  "timber",
  "iron",
  "copper",
  "naval-stores",
  "sulfur",
  "arms",
  "gunpowder",
  "matchlocks",
  "linen-cloth"
]);

const WAR_MATERIEL_GOOD_ID_SET = new Set(TRADE_EMBARGO_WAR_MATERIEL_GOOD_IDS);

const HISTORICAL_NATIONAL_EMBARGOES_AT_START = Object.freeze([
  historicalOrder("france", "england", TRADE_EMBARGO_SCOPE_ALL_GOODS),
  historicalOrder("spain", "france", TRADE_EMBARGO_SCOPE_ALL_GOODS),
  historicalOrder("burgundian-netherlands", "france", TRADE_EMBARGO_SCOPE_ALL_GOODS),
  historicalOrder("habsburg", "france", TRADE_EMBARGO_SCOPE_ALL_GOODS)
]);

export const ENGLISH_FRENCH_EMBARGO_MINUTE = gameMinuteForDate(1522, 5, 29);
export const HOSPITALLER_OTTOMAN_BLOCKADE_MINUTE = gameMinuteForDate(1522, 6, 1);
export const LUBECK_DANISH_BLOCKADE_MINUTE = gameMinuteForDate(1522, 6, 1);

const HISTORICAL_TRADE_TRANSITIONS_1522 = Object.freeze([
  Object.freeze({
    id: "english-french-war-embargo",
    minute: ENGLISH_FRENCH_EMBARGO_MINUTE,
    issuerFactionId: "england",
    targetFactionId: "france",
    scope: TRADE_EMBARGO_SCOPE_ALL_GOODS,
    restrictionKind: TRADE_EMBARGO_RESTRICTION_IMPORTS,
    source: "english-declaration-29-may-1522"
  }),
  Object.freeze({
    id: "hospitaller-ottoman-blockade",
    minute: HOSPITALLER_OTTOMAN_BLOCKADE_MINUTE,
    issuerFactionId: "hospitallers",
    targetFactionId: "ottoman",
    scope: TRADE_EMBARGO_SCOPE_ALL_GOODS,
    restrictionKind: TRADE_EMBARGO_RESTRICTION_BLOCKADE,
    source: "rhodes-campaign-1522"
  }),
  Object.freeze({
    id: "lubeck-danish-blockade",
    minute: LUBECK_DANISH_BLOCKADE_MINUTE,
    issuerFactionId: "lubeck",
    targetFactionId: "denmark-norway",
    scope: TRADE_EMBARGO_SCOPE_ALL_GOODS,
    restrictionKind: TRADE_EMBARGO_RESTRICTION_BLOCKADE,
    source: "sound-blockade-1522"
  })
]);

const HISTORICAL_PAPAL_FOLLOWERS_1522 = Object.freeze([
  "papal-states",
  "hospitallers",
  "spain",
  "burgundian-netherlands",
  "habsburg",
  "hungary",
  "portugal",
  "england"
]);

export function createTradeEmbargoMemory({ startMinute = 0, seedKey = "embargoes" } = {}) {
  assertMinute(startMinute, "trade embargo start");
  assertSeedKey(seedKey);
  const memory = {
    version: TRADE_EMBARGO_VERSION,
    seed: hashString32(`${seedKey}|trade-embargoes`),
    sequence: 0,
    nextOrderId: 1,
    startMinute,
    lastUpdateMinute: startMinute,
    nextReviewMinute: startMinute,
    historicalTransitions: {},
    orders: [],
    history: []
  };
  for (const order of HISTORICAL_NATIONAL_EMBARGOES_AT_START) {
    imposeOrder(memory, {
      authorityKind: TRADE_EMBARGO_AUTHORITY_NATIONAL,
      issuerFactionId: order.issuerFactionId,
      targetFactionId: order.targetFactionId,
      scope: order.scope,
      restrictionKind: TRADE_EMBARGO_RESTRICTION_IMPORTS,
      followerFactionIds: [order.issuerFactionId],
      simMinute: startMinute,
      source: "historical-1522"
    });
  }
  imposeOrder(memory, {
    authorityKind: TRADE_EMBARGO_AUTHORITY_PAPAL,
    issuerFactionId: "papal-states",
    targetFactionId: "ottoman",
    scope: TRADE_EMBARGO_SCOPE_WAR_MATERIEL,
    restrictionKind: TRADE_EMBARGO_RESTRICTION_EXPORTS,
    followerFactionIds: HISTORICAL_PAPAL_FOLLOWERS_1522,
    simMinute: startMinute,
    source: "apostolic-prohibition-1522"
  });
  for (const transition of HISTORICAL_TRADE_TRANSITIONS_1522) {
    if (startMinute < transition.minute) continue;
    imposeOrder(memory, {
      authorityKind: TRADE_EMBARGO_AUTHORITY_NATIONAL,
      issuerFactionId: transition.issuerFactionId,
      targetFactionId: transition.targetFactionId,
      scope: transition.scope,
      restrictionKind: transition.restrictionKind,
      followerFactionIds: [transition.issuerFactionId],
      simMinute: startMinute,
      source: transition.source
    });
    memory.historicalTransitions[transition.id] = "completed";
  }
  memory.nextReviewMinute = startMinute + reviewIntervalMinutes(memory, 0);
  return validateTradeEmbargoMemory(memory);
}

export function migrateTradeEmbargoMemory(memory, { startMinute = 0, seedKey = "embargoes" } = {}) {
  if (memory === undefined || memory === null) {
    return createTradeEmbargoMemory({ startMinute, seedKey });
  }
  if (memory.version === TRADE_EMBARGO_VERSION) {
    return validateTradeEmbargoMemory(structuredClone(memory));
  }
  if (memory.version !== 1) {
    throw new Error(`Unsupported trade embargo version: ${memory.version ?? "missing"}`);
  }
  const migrated = structuredClone(memory);
  migrated.version = TRADE_EMBARGO_VERSION;
  migrated.orders = migrated.orders.map((order) => ({
    ...order,
    restrictionKind: order.authorityKind === TRADE_EMBARGO_AUTHORITY_PAPAL
      ? TRADE_EMBARGO_RESTRICTION_EXPORTS
      : TRADE_EMBARGO_RESTRICTION_IMPORTS
  }));
  migrated.history = migrated.history.map((event) => ({
    ...event,
    restrictionKind: event.authorityKind === TRADE_EMBARGO_AUTHORITY_PAPAL
      ? TRADE_EMBARGO_RESTRICTION_EXPORTS
      : TRADE_EMBARGO_RESTRICTION_IMPORTS
  }));
  migrated.historicalTransitions = Object.fromEntries(
    HISTORICAL_TRADE_TRANSITIONS_1522
      .map((transition) => ({
        transition,
        matchingOrder: migrated.orders.some((order) => (
          order.authorityKind === TRADE_EMBARGO_AUTHORITY_NATIONAL &&
          order.issuerFactionId === transition.issuerFactionId &&
          order.targetFactionId === transition.targetFactionId
        ))
      }))
      .filter(({ transition, matchingOrder }) => (
        matchingOrder || transition.minute <= migrated.lastUpdateMinute
      ))
      .map((transition) => [
        transition.transition.id,
        transition.matchingOrder ? "completed" : "averted"
      ])
  );
  return validateTradeEmbargoMemory(migrated);
}

export function validateTradeEmbargoMemory(memory) {
  if (!memory || typeof memory !== "object" || memory.version !== TRADE_EMBARGO_VERSION) {
    throw new Error(`Unsupported trade embargo version: ${memory?.version ?? "missing"}`);
  }
  if (!Number.isInteger(memory.seed) || memory.seed < 0 || memory.seed > 0xffffffff) {
    throw new Error(`Invalid trade embargo seed: ${memory.seed}`);
  }
  if (!Number.isInteger(memory.sequence) || memory.sequence < 0 ||
      !Number.isInteger(memory.nextOrderId) || memory.nextOrderId <= 0) {
    throw new Error("Invalid trade embargo sequence");
  }
  assertMinute(memory.startMinute, "trade embargo start");
  assertMinute(memory.lastUpdateMinute, "trade embargo update");
  assertMinute(memory.nextReviewMinute, "trade embargo review");
  if (memory.lastUpdateMinute < memory.startMinute || memory.nextReviewMinute < memory.startMinute) {
    throw new Error("Trade embargo clock precedes its start");
  }
  if (!Array.isArray(memory.orders) || memory.orders.length > TRADE_EMBARGO_ORDER_LIMIT) {
    throw new Error("Trade embargo orders must be a bounded array");
  }
  if (!Array.isArray(memory.history) || memory.history.length > TRADE_EMBARGO_HISTORY_LIMIT) {
    throw new Error("Trade embargo history must be a bounded array");
  }
  if (!memory.historicalTransitions || typeof memory.historicalTransitions !== "object" ||
      Array.isArray(memory.historicalTransitions)) {
    throw new Error("Trade embargo historical transitions must be an object");
  }
  for (const [transitionId, status] of Object.entries(memory.historicalTransitions)) {
    if (!HISTORICAL_TRADE_TRANSITIONS_1522.some(({ id }) => id === transitionId) ||
        !HISTORICAL_TRANSITION_STATES.has(status)) {
      throw new Error(`Invalid trade embargo historical transition: ${transitionId}=${status}`);
    }
  }
  const orderIds = new Set();
  for (const order of memory.orders) {
    validateEmbargoOrder(order);
    if (orderIds.has(order.id)) throw new Error(`Duplicate trade embargo order: ${order.id}`);
    orderIds.add(order.id);
  }
  for (const event of memory.history) validateEmbargoEvent(event);
  return memory;
}

export function nextTradeEmbargoPoliticsMinute(memory) {
  validateTradeEmbargoMemory(memory);
  return Math.min(memory.nextReviewMinute, nextHistoricalTradeTransitionMinute(memory));
}

export function advanceTradeEmbargoPolitics(memory, diplomacy, currentMinute, {
  authorityForFaction = () => 50,
  papalAuthority = 50,
  inactiveFactionIds = []
} = {}) {
  validateTradeEmbargoMemory(memory);
  validateWorldDiplomacy(diplomacy);
  assertMinute(currentMinute, "trade embargo current minute");
  if (currentMinute < memory.lastUpdateMinute) {
    throw new Error(`Trade embargo politics cannot move backward: ${currentMinute} < ${memory.lastUpdateMinute}`);
  }
  if (typeof authorityForFaction !== "function") {
    throw new Error("Trade embargo politics requires an authority resolver");
  }
  assertAuthority(papalAuthority, "Papal embargo authority");
  const inactive = new Set(inactiveFactionIds);
  for (const factionId of inactive) assertFactionId(factionId);
  const events = [];
  let guard = 0;
  while (guard < MAX_CATCH_UP_REVIEWS) {
    const historicalMinute = nextHistoricalTradeTransitionMinute(memory);
    if (currentMinute < Math.min(memory.nextReviewMinute, historicalMinute)) break;
    if (historicalMinute <= memory.nextReviewMinute) {
      events.push(...applyHistoricalTradeTransitions(
        memory,
        diplomacy,
        historicalMinute,
        inactive
      ));
      continue;
    }
    const reviewMinute = memory.nextReviewMinute;
    events.push(...reviewTradeEmbargoes(memory, diplomacy, reviewMinute, {
      authorityForFaction,
      papalAuthority,
      inactive
    }));
    memory.sequence += 1;
    memory.nextReviewMinute = reviewMinute + reviewIntervalMinutes(memory, memory.sequence);
    guard += 1;
  }
  if (guard >= MAX_CATCH_UP_REVIEWS && currentMinute >= memory.nextReviewMinute) {
    memory.nextReviewMinute = currentMinute + reviewIntervalMinutes(memory, memory.sequence + 1);
  }
  memory.lastUpdateMinute = currentMinute;
  validateTradeEmbargoMemory(memory);
  return Object.freeze(events.map((event) => Object.freeze(copyEvent(event))));
}

export function activeTradeEmbargoOrders(memory) {
  validateTradeEmbargoMemory(memory);
  return Object.freeze(memory.orders
    .filter((order) => order.liftedMinute === null)
    .map((order) => Object.freeze(copyOrder(order))));
}

export function recentTradeEmbargoEvents(memory, limit = 10) {
  validateTradeEmbargoMemory(memory);
  if (!Number.isInteger(limit) || limit < 0) {
    throw new Error(`Invalid trade embargo history limit: ${limit}`);
  }
  return Object.freeze(memory.history.slice(0, limit)
    .map((event) => Object.freeze(copyEvent(event))));
}

export function tradeEmbargoOrderById(memory, orderId) {
  validateTradeEmbargoMemory(memory);
  const order = memory.orders.find((entry) => entry.id === orderId);
  if (!order) throw new Error(`Unknown trade embargo order: ${orderId}`);
  return Object.freeze(copyOrder(order));
}

export function tradeEmbargoOrdersForPurchase(memory, {
  sourceFactionId,
  goodId,
  playerFactionId = NEUTRAL_FACTION_ID
}) {
  validateTradeEmbargoMemory(memory);
  const targetFactionId = assertFactionId(sourceFactionId);
  assertFactionId(playerFactionId);
  if (typeof goodId !== "string" || goodId === "") {
    throw new Error("Trade embargo purchase requires a good id");
  }
  if (targetFactionId === NEUTRAL_FACTION_ID || targetFactionId === PIRATE_FACTION_ID) {
    return Object.freeze([]);
  }
  return Object.freeze(memory.orders.filter((order) => (
    order.liftedMinute === null &&
    order.restrictionKind === TRADE_EMBARGO_RESTRICTION_IMPORTS &&
    order.targetFactionId === targetFactionId &&
    embargoOrderControlsGood(order, goodId) &&
    order.followerFactionIds.some((factionId) => factionId !== targetFactionId)
  )).map((order) => Object.freeze(copyOrder(order))));
}

export function tradeEmbargoOrdersForSale(memory, {
  destinationFactionId,
  goodId,
  playerFactionId = NEUTRAL_FACTION_ID
}) {
  validateTradeEmbargoMemory(memory);
  const targetFactionId = assertFactionId(destinationFactionId);
  assertFactionId(playerFactionId);
  if (typeof goodId !== "string" || goodId === "") {
    throw new Error("Trade embargo sale requires a good id");
  }
  if (targetFactionId === NEUTRAL_FACTION_ID || targetFactionId === PIRATE_FACTION_ID) {
    return Object.freeze([]);
  }
  return Object.freeze(memory.orders.filter((order) => (
    order.liftedMinute === null &&
    order.restrictionKind === TRADE_EMBARGO_RESTRICTION_EXPORTS &&
    order.targetFactionId === targetFactionId &&
    embargoOrderControlsGood(order, goodId) &&
    order.followerFactionIds.some((factionId) => factionId !== targetFactionId)
  )).map((order) => Object.freeze(copyOrder(order))));
}

export function tradeEmbargoOrdersForShipping(memory, {
  shipFactionId,
  destinationFactionId,
  goodId
}) {
  validateTradeEmbargoMemory(memory);
  const carrierFactionId = assertFactionId(shipFactionId);
  const destinationId = assertFactionId(destinationFactionId);
  if (typeof goodId !== "string" || goodId === "") {
    throw new Error("Trade blockade check requires a good id");
  }
  return Object.freeze(memory.orders.filter((order) => (
    order.liftedMinute === null &&
    order.restrictionKind === TRADE_EMBARGO_RESTRICTION_BLOCKADE &&
    embargoOrderControlsGood(order, goodId) &&
    (order.targetFactionId === carrierFactionId || order.targetFactionId === destinationId)
  )).map((order) => Object.freeze(copyOrder(order))));
}

export function embargoOrderControlsGood(order, goodId) {
  validateEmbargoOrder(order);
  if (typeof goodId !== "string" || goodId === "") {
    throw new Error("Trade embargo scope check requires a good id");
  }
  return order.scope === TRADE_EMBARGO_SCOPE_ALL_GOODS || WAR_MATERIEL_GOOD_ID_SET.has(goodId);
}

export function tradeEmbargoScopeLabel(scope) {
  if (scope === TRADE_EMBARGO_SCOPE_ALL_GOODS) return "all merchandise";
  if (scope === TRADE_EMBARGO_SCOPE_WAR_MATERIEL) return "war materiel";
  throw new Error(`Unknown trade embargo scope: ${scope}`);
}

export function tradeEmbargoRegimeLabel(order) {
  validateEmbargoOrder(order);
  const target = factionById(order.targetFactionId);
  if (order.restrictionKind === TRADE_EMBARGO_RESTRICTION_EXPORTS) {
    return order.authorityKind === TRADE_EMBARGO_AUTHORITY_PAPAL
      ? `the Holy See's prohibition on furnishing ${tradeEmbargoScopeLabel(order.scope)} to ${target.shortName}`
      : `${factionById(order.issuerFactionId).shortName}'s prohibition on furnishing ${tradeEmbargoScopeLabel(order.scope)} to ${target.shortName}`;
  }
  if (order.restrictionKind === TRADE_EMBARGO_RESTRICTION_BLOCKADE) {
    return `${factionById(order.issuerFactionId).shortName}'s blockade of ${target.adjective} shipping`;
  }
  const issuer = factionById(order.issuerFactionId);
  return `the ${issuer.adjective} ban on ${target.adjective} merchandise`;
}

export function tradeEmbargoEventNotice(event) {
  validateEmbargoEvent(event);
  const issuer = factionById(event.issuerFactionId);
  const target = factionById(event.targetFactionId);
  if (event.kind === "imposed") {
    if (event.restrictionKind === TRADE_EMBARGO_RESTRICTION_EXPORTS) {
      return event.authorityKind === TRADE_EMBARGO_AUTHORITY_PAPAL
        ? `THE HOLY SEE FORBIDS ARMING ${target.shortName.toUpperCase()}`
        : `${issuer.shortName.toUpperCase()} FORBIDS EXPORTS TO ${target.shortName.toUpperCase()}`;
    }
    return event.restrictionKind === TRADE_EMBARGO_RESTRICTION_BLOCKADE
      ? `${issuer.shortName.toUpperCase()} BLOCKADES ${target.shortName.toUpperCase()}`
      : `${issuer.shortName.toUpperCase()} BANS ${target.adjective.toUpperCase()} MERCHANDISE`;
  }
  if (event.kind === "lifted") {
    if (event.restrictionKind === TRADE_EMBARGO_RESTRICTION_BLOCKADE) {
      return `${issuer.shortName.toUpperCase()} RAISES THE BLOCKADE OF ${target.shortName.toUpperCase()}`;
    }
    return event.authorityKind === TRADE_EMBARGO_AUTHORITY_PAPAL
      ? `THE HOLY SEE LIFTS ITS PROHIBITION AGAINST ${target.shortName.toUpperCase()}`
      : `${issuer.shortName.toUpperCase()} LIFTS ITS BAN ON ${target.adjective.toUpperCase()} MERCHANDISE`;
  }
  if (event.kind === "followers-changed") {
    return `CATHOLIC POWERS RECONSIDER THE PAPAL PROHIBITION AGAINST ${target.shortName.toUpperCase()}`;
  }
  throw new Error(`Unknown trade embargo event: ${event.kind}`);
}

export function createTradeEmbargoEnforcementMemory() {
  return {
    version: TRADE_EMBARGO_ENFORCEMENT_VERSION,
    nextIncidentId: 1,
    incidents: []
  };
}

export function migrateTradeEmbargoEnforcementMemory(memory, { embargoMemory = null } = {}) {
  if (memory === undefined || memory === null) return createTradeEmbargoEnforcementMemory();
  if (![1, 2, TRADE_EMBARGO_ENFORCEMENT_VERSION].includes(memory.version)) {
    throw new Error(`Unsupported trade embargo enforcement version: ${memory.version ?? "missing"}`);
  }
  if (embargoMemory !== null) validateTradeEmbargoMemory(embargoMemory);
  let incidents = memory.incidents.map((incident) => ({
    ...copyIncident(incident),
    restrictionKind: incident.restrictionKind || TRADE_EMBARGO_RESTRICTION_IMPORTS
  }));
  if (memory.version === 1 && embargoMemory !== null) {
    incidents = incidents.filter((incident) => {
      const order = embargoMemory.orders.find((entry) => entry.id === incident.orderId);
      return order?.restrictionKind === incident.restrictionKind;
    });
  }
  return validateTradeEmbargoEnforcementMemory({
    version: memory.version === TRADE_EMBARGO_ENFORCEMENT_VERSION
      ? TRADE_EMBARGO_ENFORCEMENT_VERSION
      : 2,
    nextIncidentId: memory.nextIncidentId,
    incidents
  });
}

export function validateTradeEmbargoEnforcementMemory(memory) {
  if (!memory || typeof memory !== "object" ||
      ![2, TRADE_EMBARGO_ENFORCEMENT_VERSION].includes(memory.version)) {
    throw new Error(`Unsupported trade embargo enforcement version: ${memory?.version ?? "missing"}`);
  }
  if (!Number.isInteger(memory.nextIncidentId) || memory.nextIncidentId <= 0) {
    throw new Error(`Invalid next trade embargo incident id: ${memory.nextIncidentId}`);
  }
  if (!Array.isArray(memory.incidents) || memory.incidents.length > PLAYER_INCIDENT_LIMIT) {
    throw new Error("Trade embargo enforcement incidents must be a bounded array");
  }
  const ids = new Set();
  for (const incident of memory.incidents) {
    validateIncident(incident, { legacy: memory.version === 2 });
    if (ids.has(incident.id)) throw new Error(`Duplicate trade embargo incident: ${incident.id}`);
    ids.add(incident.id);
  }
  return memory;
}

export function recordTradeEmbargoPurchase(memory, orders, {
  port,
  goodId,
  quantity,
  transactionValue,
  simMinute
}) {
  validateTradeEmbargoEnforcementMemory(memory);
  if (!Array.isArray(orders)) throw new Error("Trade embargo purchase requires embargo orders");
  if (!port || !Number.isInteger(port.tileId) || port.tileId < 0) {
    throw new Error("Trade embargo purchase requires a placed port");
  }
  const originCityId = requireCityId(port, "Trade embargo purchase port");
  if (typeof goodId !== "string" || goodId === "" ||
      !Number.isFinite(quantity) || quantity <= 0 ||
      !Number.isFinite(transactionValue) || transactionValue <= 0) {
    throw new Error("Trade embargo purchase requires valid cargo and value");
  }
  assertMinute(simMinute, "trade embargo purchase");
  const recorded = [];
  for (const order of orders) {
    validateEmbargoOrder(order);
    if (order.liftedMinute !== null || !embargoOrderControlsGood(order, goodId)) continue;
    let incident = memory.incidents.find((entry) => (
      entry.orderId === order.id && entry.originCityId === originCityId &&
      entry.interceptingShipId === null && entry.combatActive === false
    ));
    if (!incident) {
      incident = {
        id: `trade-embargo-${memory.nextIncidentId++}`,
        orderId: order.id,
        restrictionKind: order.restrictionKind,
        targetFactionId: order.targetFactionId,
        originCityId,
        originTileId: port.tileId,
        originName: port.displayCity || port.city || port.name,
        startedMinute: simMinute,
        transactionValue: 0,
        cargo: {},
        checkedShipIds: [],
        interceptingShipId: null,
        enforcingFactionId: null,
        combatActive: false
      };
      memory.incidents.push(incident);
    }
    incident.transactionValue += transactionValue;
    incident.cargo[goodId] = (incident.cargo[goodId] || 0) + quantity;
    validateIncident(incident);
    recorded.push(Object.freeze(copyIncident(incident)));
  }
  if (memory.incidents.length > PLAYER_INCIDENT_LIMIT) {
    const unresolved = memory.incidents.filter((incident) => (
      incident.interceptingShipId !== null || incident.combatActive
    ));
    if (unresolved.length > PLAYER_INCIDENT_LIMIT) {
      throw new Error("Too many unresolved trade embargo inspections");
    }
    while (memory.incidents.length > PLAYER_INCIDENT_LIMIT) {
      const index = memory.incidents.findIndex((incident) => (
        incident.interceptingShipId === null && !incident.combatActive
      ));
      if (index < 0) throw new Error("Trade embargo incident limit cannot be reconciled");
      memory.incidents.splice(index, 1);
    }
  }
  return Object.freeze(recorded);
}

export function consumeTrackedEmbargoCargo(memory, goodId, quantity) {
  validateTradeEmbargoEnforcementMemory(memory);
  if (typeof goodId !== "string" || goodId === "" || !Number.isFinite(quantity) || quantity < 0) {
    throw new Error(`Invalid tracked embargo cargo consumption: ${goodId}=${quantity}`);
  }
  let consumed = 0;
  const incidents = [...memory.incidents]
    .filter((incident) => (incident.cargo[goodId] || 0) > 0)
    .sort((a, b) => a.startedMinute - b.startedMinute || a.id.localeCompare(b.id));
  for (const incident of incidents) {
    const held = incident.cargo[goodId];
    const removed = Math.min(held, quantity);
    const after = held - removed;
    if (after > 0) incident.cargo[goodId] = after;
    else delete incident.cargo[goodId];
    consumed = Math.max(consumed, removed);
  }
  pruneEmptyIncidents(memory);
  return consumed;
}

export function tradeEmbargoIncidentForInspection(
  enforcementMemory,
  embargoMemory,
  enforcingFactionId,
  npcShipId,
  cargo
) {
  validateTradeEmbargoEnforcementMemory(enforcementMemory);
  validateTradeEmbargoMemory(embargoMemory);
  const factionId = assertFactionId(enforcingFactionId);
  assertNpcShipId(npcShipId);
  validateCargoManifest(cargo);
  pruneInactiveOrEmptyIncidents(enforcementMemory, embargoMemory, cargo);
  return enforcementMemory.incidents.find((incident) => {
    const order = embargoMemory.orders.find((entry) => entry.id === incident.orderId);
    return order && order.liftedMinute === null &&
      order.restrictionKind === incident.restrictionKind &&
      order.followerFactionIds.includes(factionId) &&
      incident.combatActive === false && embargoCargoAvailable(incident, cargo).quantity > 0 &&
      (incident.interceptingShipId === npcShipId || (
        incident.interceptingShipId === null && !incident.checkedShipIds.includes(npcShipId)
      ));
  }) || null;
}

export function resolveTradeEmbargoInspection(memory, incidentId, enforcingFactionId, npcShipId, roll) {
  validateTradeEmbargoEnforcementMemory(memory);
  const factionId = assertFactionId(enforcingFactionId);
  assertNpcShipId(npcShipId);
  assertRoll(roll, "trade embargo inspection");
  const incident = requiredIncident(memory, incidentId);
  if (incident.interceptingShipId !== null) {
    if (incident.interceptingShipId !== npcShipId || incident.enforcingFactionId !== factionId) {
      throw new Error(`Trade embargo incident ${incidentId} already has another interceptor`);
    }
    return inspectionResult(incident, false);
  }
  if (incident.checkedShipIds.includes(npcShipId)) {
    throw new Error(`Ship ${npcShipId} already checked embargo incident ${incidentId}`);
  }
  const detected = roll < tradeEmbargoDetectionChance(incident);
  if (detected) {
    incident.interceptingShipId = npcShipId;
    incident.enforcingFactionId = factionId;
  } else {
    incident.checkedShipIds.push(npcShipId);
    if (incident.checkedShipIds.length > CHECKED_SHIP_LIMIT) {
      incident.checkedShipIds.splice(0, incident.checkedShipIds.length - CHECKED_SHIP_LIMIT);
    }
  }
  return inspectionResult(incident, detected);
}

export function resolveTradeEmbargoIncident(memory, incidentId) {
  validateTradeEmbargoEnforcementMemory(memory);
  const index = memory.incidents.findIndex((entry) => entry.id === incidentId);
  if (index < 0) throw new Error(`Unknown trade embargo incident: ${incidentId}`);
  const [incident] = memory.incidents.splice(index, 1);
  return Object.freeze(copyIncident(incident));
}

export function tradeEmbargoIncidentById(memory, incidentId) {
  validateTradeEmbargoEnforcementMemory(memory);
  return Object.freeze(copyIncident(requiredIncident(memory, incidentId)));
}

export function beginTradeEmbargoEnforcementCombat(memory, incidentId) {
  validateTradeEmbargoEnforcementMemory(memory);
  const incident = requiredIncident(memory, incidentId);
  if (incident.interceptingShipId === null || incident.enforcingFactionId === null) {
    throw new Error(`Cannot fight an unresolved trade embargo inspection: ${incidentId}`);
  }
  incident.combatActive = true;
  return Object.freeze(copyIncident(incident));
}

export function activeTradeEmbargoCombatFactionIds(memory) {
  validateTradeEmbargoEnforcementMemory(memory);
  return [...new Set(memory.incidents
    .filter((incident) => incident.combatActive)
    .map((incident) => incident.enforcingFactionId))];
}

export function embargoCargoAvailable(incident, cargo) {
  validateIncident(incident);
  validateCargoManifest(cargo);
  const manifest = {};
  for (const [goodId, quantity] of Object.entries(incident.cargo)) {
    const available = Math.min(quantity, cargo[goodId] || 0);
    if (available > 0) manifest[goodId] = available;
  }
  return Object.freeze({
    manifest: Object.freeze(manifest),
    quantity: Object.values(manifest).reduce((sum, quantity) => sum + quantity, 0)
  });
}

export function tradeEmbargoDetectionChance(incident) {
  validateIncident(incident);
  const cargoQuantity = Object.values(incident.cargo).reduce((sum, quantity) => sum + quantity, 0);
  const valueRisk = Math.log2(1 + incident.transactionValue / 300) * 0.065;
  const quantityRisk = Math.min(0.14, cargoQuantity * 0.012);
  return Math.min(0.72, 0.2 + valueRisk + quantityRisk);
}

export function tradeEmbargoFine(incident) {
  validateIncident(incident);
  return Math.max(100, Math.round(incident.transactionValue * 0.4 / 10) * 10);
}

export function npcCaptainLawfulness(shipId, seed) {
  assertNpcShipId(shipId);
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) {
    throw new Error(`Invalid NPC lawfulness seed: ${seed}`);
  }
  return hashString32(`${shipId}|${seed}|trade-lawfulness`) / 0x100000000;
}

export function npcWillSmuggleEmbargoedCargo({ shipId, seed, expectedProfit, cargoValue }) {
  if (!Number.isFinite(expectedProfit) || !Number.isFinite(cargoValue) || cargoValue <= 0) {
    throw new Error("NPC embargo choice requires valid trade values");
  }
  const lawfulness = npcCaptainLawfulness(shipId, seed);
  const profitTemptation = Math.min(0.32, Math.max(0, expectedProfit / cargoValue) * 0.3);
  return lawfulness < 0.18 + profitTemptation;
}

export function npcEmbargoInspectionOutcome({ shipId, enforcerFactionId, simMinute, cargoValue }) {
  assertNpcShipId(shipId);
  assertFactionId(enforcerFactionId);
  assertMinute(simMinute, "NPC embargo inspection");
  if (!Number.isFinite(cargoValue) || cargoValue <= 0) {
    throw new Error(`Invalid NPC embargo cargo value: ${cargoValue}`);
  }
  const roll = hashString32(
    `${shipId}|${enforcerFactionId}|${Math.floor(simMinute / MINUTES_PER_DAY)}|embargo-inspection`
  ) / 0x100000000;
  const caught = roll < Math.min(0.7, 0.2 + Math.log2(1 + cargoValue / 300) * 0.07);
  return Object.freeze({
    caught,
    fine: caught ? Math.max(80, Math.round(cargoValue * 0.35 / 10) * 10) : 0
  });
}

function reviewTradeEmbargoes(memory, diplomacy, simMinute, {
  authorityForFaction,
  papalAuthority,
  inactive
}) {
  const events = [];
  for (const order of memory.orders.filter((entry) => entry.liftedMinute === null)) {
    if (inactive.has(order.issuerFactionId) || inactive.has(order.targetFactionId)) {
      events.push(liftOrder(memory, order, simMinute, "realm-inactive"));
      continue;
    }
    const relation = rawWorldDiplomacyBetween(
      diplomacy,
      order.issuerFactionId,
      order.targetFactionId
    );
    const oldEnough = simMinute - order.imposedMinute >= MIN_NATIONAL_EMBARGO_DAYS * MINUTES_PER_DAY;
    if (order.authorityKind === TRADE_EMBARGO_AUTHORITY_NATIONAL && (
      relation === DIPLOMACY_ALLY || relation === DIPLOMACY_FRIENDLY ||
      relation === DIPLOMACY_NEUTRAL && oldEnough
    )) {
      events.push(liftOrder(memory, order, simMinute, "diplomatic-relaxation"));
      continue;
    }
    if (order.authorityKind === TRADE_EMBARGO_AUTHORITY_PAPAL &&
        !papalTargetJustifiesProhibition(diplomacy, order.targetFactionId, simMinute)) {
      events.push(liftOrder(memory, order, simMinute, "apostolic-relaxation"));
      continue;
    }
    if (order.authorityKind === TRADE_EMBARGO_AUTHORITY_PAPAL) {
      const followers = papalFollowersForOrder(
        memory,
        diplomacy,
        order,
        simMinute,
        papalAuthority,
        inactive
      );
      if (!arrayEqual(followers, order.followerFactionIds)) {
        order.followerFactionIds = followers;
        const event = embargoEvent(order, "followers-changed", simMinute, "papal-alignment");
        recordEvent(memory, event);
        events.push(event);
      }
    }
  }

  const papalTarget = papalEmbargoCandidate(memory, diplomacy, simMinute, inactive);
  if (papalTarget) {
    const provisional = {
      authorityKind: TRADE_EMBARGO_AUTHORITY_PAPAL,
      issuerFactionId: "papal-states",
      targetFactionId: papalTarget,
      scope: TRADE_EMBARGO_SCOPE_WAR_MATERIEL,
      restrictionKind: TRADE_EMBARGO_RESTRICTION_EXPORTS,
      followerFactionIds: []
    };
    const followers = papalFollowersForOrder(
      memory,
      diplomacy,
      provisional,
      simMinute,
      papalAuthority,
      inactive
    );
    events.push(imposeOrder(memory, {
      ...provisional,
      followerFactionIds: followers,
      simMinute,
      source: "papal-politics"
    }));
  }

  const nationalCandidate = nationalEmbargoCandidate(
    memory,
    diplomacy,
    simMinute,
    authorityForFaction,
    inactive
  );
  if (nationalCandidate) {
    events.push(imposeOrder(memory, {
      authorityKind: TRADE_EMBARGO_AUTHORITY_NATIONAL,
      issuerFactionId: nationalCandidate.issuerFactionId,
      targetFactionId: nationalCandidate.targetFactionId,
      scope: TRADE_EMBARGO_SCOPE_ALL_GOODS,
      restrictionKind: TRADE_EMBARGO_RESTRICTION_IMPORTS,
      followerFactionIds: [nationalCandidate.issuerFactionId],
      simMinute,
      source: "political-simulation"
    }));
  }
  return events;
}

function applyHistoricalTradeTransitions(memory, diplomacy, currentMinute, inactive) {
  const events = [];
  for (const transition of HISTORICAL_TRADE_TRANSITIONS_1522) {
    if (memory.historicalTransitions[transition.id] !== undefined ||
        currentMinute < transition.minute) continue;
    const relation = rawWorldDiplomacyBetween(
      diplomacy,
      transition.issuerFactionId,
      transition.targetFactionId
    );
    if (inactive.has(transition.issuerFactionId) || inactive.has(transition.targetFactionId) ||
        relation !== DIPLOMACY_WAR) {
      memory.historicalTransitions[transition.id] = "averted";
      continue;
    }
    events.push(imposeOrder(memory, {
      authorityKind: TRADE_EMBARGO_AUTHORITY_NATIONAL,
      issuerFactionId: transition.issuerFactionId,
      targetFactionId: transition.targetFactionId,
      scope: transition.scope,
      restrictionKind: transition.restrictionKind,
      followerFactionIds: [transition.issuerFactionId],
      simMinute: transition.minute,
      source: transition.source
    }));
    memory.historicalTransitions[transition.id] = "completed";
  }
  return events;
}

function nextHistoricalTradeTransitionMinute(memory) {
  return HISTORICAL_TRADE_TRANSITIONS_1522
    .filter(({ id }) => memory.historicalTransitions[id] === undefined)
    .reduce((minimum, transition) => Math.min(minimum, transition.minute), Infinity);
}

function nationalEmbargoCandidate(memory, diplomacy, simMinute, authorityForFaction, inactive) {
  const candidates = [];
  for (const issuer of SOVEREIGN_FACTIONS) {
    if (inactive.has(issuer.id)) continue;
    const authority = authorityForFaction(issuer.id);
    assertAuthority(authority, `${issuer.id} embargo authority`);
    for (const target of SOVEREIGN_FACTIONS) {
      if (issuer.id === target.id || inactive.has(target.id) ||
          hasActiveOrder(memory, TRADE_EMBARGO_AUTHORITY_NATIONAL, issuer.id, target.id)) continue;
      const relation = rawWorldDiplomacyBetween(diplomacy, issuer.id, target.id);
      if (relation !== DIPLOMACY_WAR && relation !== DIPLOMACY_HOSTILE) continue;
      const weight = (relation === DIPLOMACY_WAR ? 5 : 1.25) * (0.55 + authority / 100);
      candidates.push({ issuerFactionId: issuer.id, targetFactionId: target.id, weight });
    }
  }
  return weightedCandidate(memory, candidates, `national|${simMinute}`);
}

function papalEmbargoCandidate(memory, diplomacy, simMinute, inactive) {
  if (inactive.has("papal-states")) return null;
  const candidates = SOVEREIGN_FACTIONS.filter((faction) => (
    !inactive.has(faction.id) &&
    isMuslimReligion(rulerAtMinute(faction.id, simMinute)?.religionId) &&
    !hasActivePapalOrder(memory, faction.id) &&
    papalTargetJustifiesProhibition(diplomacy, faction.id, simMinute)
  )).map((faction) => ({
    targetFactionId: faction.id,
    weight: rawWorldDiplomacyBetween(diplomacy, "papal-states", faction.id) === DIPLOMACY_WAR ? 4 : 2
  }));
  return weightedCandidate(memory, candidates, `papal|${simMinute}`)?.targetFactionId || null;
}

function papalTargetJustifiesProhibition(diplomacy, targetFactionId, simMinute) {
  if (!isMuslimReligion(rulerAtMinute(targetFactionId, simMinute)?.religionId)) return false;
  return SOVEREIGN_FACTIONS.some((faction) => {
    const ruler = rulerAtMinute(faction.id, simMinute);
    return ruler && isRomanCatholicReligion(ruler.religionId) &&
      rawWorldDiplomacyBetween(diplomacy, faction.id, targetFactionId) === DIPLOMACY_WAR;
  });
}

function papalFollowersForOrder(memory, diplomacy, order, simMinute, papalAuthority, inactive) {
  return SOVEREIGN_FACTIONS.filter((faction) => {
    if (inactive.has(faction.id) || faction.id === order.targetFactionId) return false;
    if (faction.id === "papal-states" || faction.id === "hospitallers") return true;
    const ruler = rulerAtMinute(faction.id, simMinute);
    if (!ruler || !isRomanCatholicReligion(ruler.religionId)) return false;
    const relationToPope = rawWorldDiplomacyBetween(diplomacy, faction.id, "papal-states");
    const relationToTarget = rawWorldDiplomacyBetween(diplomacy, faction.id, order.targetFactionId);
    if ([DIPLOMACY_HOSTILE, DIPLOMACY_WAR].includes(relationToPope) ||
        [DIPLOMACY_ALLY, DIPLOMACY_FRIENDLY].includes(relationToTarget)) return false;
    const relationScore = relationToPope === DIPLOMACY_ALLY ? 0.28
      : relationToPope === DIPLOMACY_FRIENDLY ? 0.18 : 0;
    const targetScore = relationToTarget === DIPLOMACY_WAR ? 0.28
      : relationToTarget === DIPLOMACY_HOSTILE ? 0.16 : 0;
    const chance = Math.min(0.94, 0.16 + papalAuthority / 170 + ruler.piety * 0.18 +
      relationScore + targetScore);
    return embargoRandom(memory, `follow|${order.id || order.targetFactionId}|${faction.id}|${simMinute}`) < chance;
  }).map((faction) => faction.id).sort();
}

function imposeOrder(memory, {
  authorityKind,
  issuerFactionId,
  targetFactionId,
  scope,
  restrictionKind,
  followerFactionIds,
  simMinute,
  source
}) {
  assertFactionId(issuerFactionId);
  assertFactionId(targetFactionId);
  if (issuerFactionId === targetFactionId) throw new Error("A power cannot embargo itself");
  if (!EMBARGO_AUTHORITIES.has(authorityKind) || !EMBARGO_SCOPES.has(scope) ||
      !EMBARGO_RESTRICTIONS.has(restrictionKind)) {
    throw new Error(`Invalid trade embargo order: ${authorityKind}/${scope}/${restrictionKind}`);
  }
  if (hasActiveOrder(memory, authorityKind, issuerFactionId, targetFactionId)) {
    throw new Error(`Duplicate active trade embargo: ${issuerFactionId}/${targetFactionId}`);
  }
  assertMinute(simMinute, "trade embargo imposition");
  if (typeof source !== "string" || source === "") throw new Error("Trade embargo requires a source");
  const followers = normalizedFactionIds(followerFactionIds);
  if (authorityKind === TRADE_EMBARGO_AUTHORITY_NATIONAL &&
      (followers.length !== 1 || followers[0] !== issuerFactionId)) {
    throw new Error("National trade embargoes must be enforced by their issuer");
  }
  const order = {
    id: `embargo-${memory.nextOrderId++}`,
    authorityKind,
    issuerFactionId,
    targetFactionId,
    scope,
    restrictionKind,
    followerFactionIds: followers,
    imposedMinute: simMinute,
    liftedMinute: null,
    source
  };
  validateEmbargoOrder(order);
  memory.orders.push(order);
  if (memory.orders.length > TRADE_EMBARGO_ORDER_LIMIT) {
    const retiredIndex = memory.orders.findIndex((entry) => entry.liftedMinute !== null);
    if (retiredIndex < 0) throw new Error("Active trade embargo order limit exceeded");
    memory.orders.splice(retiredIndex, 1);
  }
  const event = embargoEvent(order, "imposed", simMinute, source);
  recordEvent(memory, event);
  return event;
}

function liftOrder(memory, order, simMinute, source) {
  if (order.liftedMinute !== null) throw new Error(`Trade embargo already lifted: ${order.id}`);
  order.liftedMinute = simMinute;
  const event = embargoEvent(order, "lifted", simMinute, source);
  recordEvent(memory, event);
  return event;
}

function embargoEvent(order, kind, simMinute, source) {
  const event = {
    id: `${order.id}:${kind}:${simMinute}`,
    orderId: order.id,
    kind,
    authorityKind: order.authorityKind,
    issuerFactionId: order.issuerFactionId,
    targetFactionId: order.targetFactionId,
    scope: order.scope,
    restrictionKind: order.restrictionKind,
    followerFactionIds: [...order.followerFactionIds],
    simMinute,
    source
  };
  validateEmbargoEvent(event);
  return event;
}

function recordEvent(memory, event) {
  memory.history.unshift(copyEvent(event));
  if (memory.history.length > TRADE_EMBARGO_HISTORY_LIMIT) {
    memory.history.length = TRADE_EMBARGO_HISTORY_LIMIT;
  }
}

function hasActiveOrder(memory, authorityKind, issuerFactionId, targetFactionId) {
  return memory.orders.some((order) => (
    order.liftedMinute === null && order.authorityKind === authorityKind &&
    order.issuerFactionId === issuerFactionId && order.targetFactionId === targetFactionId
  ));
}

function hasActivePapalOrder(memory, targetFactionId) {
  return hasActiveOrder(
    memory,
    TRADE_EMBARGO_AUTHORITY_PAPAL,
    "papal-states",
    targetFactionId
  );
}

function validateEmbargoOrder(order) {
  if (!order || typeof order !== "object" || typeof order.id !== "string" || order.id === "") {
    throw new Error("Trade embargo order requires an id");
  }
  if (!EMBARGO_AUTHORITIES.has(order.authorityKind) || !EMBARGO_SCOPES.has(order.scope) ||
      !EMBARGO_RESTRICTIONS.has(order.restrictionKind)) {
    throw new Error(`Invalid trade embargo order ${order.id}`);
  }
  assertFactionId(order.issuerFactionId);
  assertFactionId(order.targetFactionId);
  if (order.issuerFactionId === order.targetFactionId) {
    throw new Error(`Trade embargo order targets its issuer: ${order.id}`);
  }
  const followers = normalizedFactionIds(order.followerFactionIds);
  if (!arrayEqual(followers, order.followerFactionIds)) {
    throw new Error(`Trade embargo followers are not canonical: ${order.id}`);
  }
  if (order.authorityKind === TRADE_EMBARGO_AUTHORITY_NATIONAL &&
      (followers.length !== 1 || followers[0] !== order.issuerFactionId)) {
    throw new Error(`National embargo has invalid enforcers: ${order.id}`);
  }
  assertMinute(order.imposedMinute, "trade embargo imposition");
  if (order.liftedMinute !== null) {
    assertMinute(order.liftedMinute, "trade embargo lifting");
    if (order.liftedMinute < order.imposedMinute) {
      throw new Error(`Trade embargo lifts before it begins: ${order.id}`);
    }
  }
  if (typeof order.source !== "string" || order.source === "") {
    throw new Error(`Trade embargo has no source: ${order.id}`);
  }
}

function validateEmbargoEvent(event) {
  if (!event || typeof event !== "object" || typeof event.id !== "string" || event.id === "" ||
      typeof event.orderId !== "string" || event.orderId === "" ||
      !EMBARGO_EVENT_KINDS.has(event.kind)) {
    throw new Error("Invalid trade embargo event");
  }
  if (!EMBARGO_AUTHORITIES.has(event.authorityKind) || !EMBARGO_SCOPES.has(event.scope) ||
      !EMBARGO_RESTRICTIONS.has(event.restrictionKind)) {
    throw new Error(`Invalid trade embargo event policy: ${event.id}`);
  }
  assertFactionId(event.issuerFactionId);
  assertFactionId(event.targetFactionId);
  normalizedFactionIds(event.followerFactionIds);
  assertMinute(event.simMinute, "trade embargo event");
  if (typeof event.source !== "string" || event.source === "") {
    throw new Error(`Trade embargo event has no source: ${event.id}`);
  }
}

function validateIncident(incident, { legacy = false } = {}) {
  if (!incident || typeof incident !== "object" || typeof incident.id !== "string" || incident.id === "" ||
      typeof incident.orderId !== "string" || incident.orderId === "") {
    throw new Error("Invalid trade embargo incident");
  }
  assertFactionId(incident.targetFactionId);
  if (!EMBARGO_RESTRICTIONS.has(incident.restrictionKind)) {
    throw new Error(`Invalid trade embargo incident restriction: ${incident.id}`);
  }
  const originId = legacy ? incident.originPortId : incident.originCityId;
  if (typeof originId !== "string" || originId === "" ||
      !Number.isInteger(incident.originTileId) || incident.originTileId < 0 ||
      typeof incident.originName !== "string" || incident.originName === "") {
    throw new Error(`Invalid trade embargo incident origin: ${incident.id}`);
  }
  requireEntityId(originId, "Trade embargo incident origin");
  assertMinute(incident.startedMinute, "trade embargo incident");
  if (!Number.isFinite(incident.transactionValue) || incident.transactionValue <= 0) {
    throw new Error(`Invalid trade embargo incident value: ${incident.id}`);
  }
  validateCargoManifest(incident.cargo, { positive: true });
  if (Object.keys(incident.cargo).length === 0) {
    throw new Error(`Trade embargo incident has no cargo: ${incident.id}`);
  }
  if (!Array.isArray(incident.checkedShipIds) || incident.checkedShipIds.length > CHECKED_SHIP_LIMIT ||
      new Set(incident.checkedShipIds).size !== incident.checkedShipIds.length) {
    throw new Error(`Invalid trade embargo inspection history: ${incident.id}`);
  }
  incident.checkedShipIds.forEach(assertNpcShipId);
  if ((incident.interceptingShipId === null) !== (incident.enforcingFactionId === null)) {
    throw new Error(`Trade embargo interceptor is incomplete: ${incident.id}`);
  }
  if (incident.interceptingShipId !== null) {
    assertNpcShipId(incident.interceptingShipId);
    assertFactionId(incident.enforcingFactionId);
  }
  if (typeof incident.combatActive !== "boolean" ||
      (incident.combatActive && incident.interceptingShipId === null)) {
    throw new Error(`Invalid trade embargo combat state: ${incident.id}`);
  }
}

function pruneInactiveOrEmptyIncidents(enforcementMemory, embargoMemory, cargo) {
  enforcementMemory.incidents = enforcementMemory.incidents.filter((incident) => {
    const order = embargoMemory.orders.find((entry) => entry.id === incident.orderId);
    if (!order || order.liftedMinute !== null ||
        order.restrictionKind !== incident.restrictionKind) return false;
    return incident.interceptingShipId !== null || embargoCargoAvailable(incident, cargo).quantity > 0;
  });
}

function pruneEmptyIncidents(memory) {
  memory.incidents = memory.incidents.filter((incident) => (
    incident.interceptingShipId !== null || Object.keys(incident.cargo).length > 0
  ));
}

function inspectionResult(incident, newlyDetected) {
  return Object.freeze({
    incident: Object.freeze(copyIncident(incident)),
    detected: incident.interceptingShipId !== null,
    newlyDetected,
    detectionChance: tradeEmbargoDetectionChance(incident),
    fine: tradeEmbargoFine(incident)
  });
}

function requiredIncident(memory, incidentId) {
  if (typeof incidentId !== "string" || incidentId === "") {
    throw new Error("Trade embargo inspection requires an incident id");
  }
  const incident = memory.incidents.find((entry) => entry.id === incidentId);
  if (!incident) throw new Error(`Unknown trade embargo incident: ${incidentId}`);
  return incident;
}

function validateCargoManifest(cargo, { positive = false } = {}) {
  if (!cargo || typeof cargo !== "object" || Array.isArray(cargo)) {
    throw new Error("Trade embargo cargo manifest must be an object");
  }
  for (const [goodId, quantity] of Object.entries(cargo)) {
    if (goodId === "" || !Number.isFinite(quantity) || quantity < 0 || positive && quantity <= 0) {
      throw new Error(`Invalid trade embargo cargo: ${goodId}=${quantity}`);
    }
  }
}

function copyOrder(order) {
  return { ...order, followerFactionIds: [...order.followerFactionIds] };
}

function copyEvent(event) {
  return { ...event, followerFactionIds: [...event.followerFactionIds] };
}

function copyIncident(incident) {
  return {
    ...incident,
    cargo: { ...incident.cargo },
    checkedShipIds: [...incident.checkedShipIds]
  };
}

function historicalOrder(issuerFactionId, targetFactionId, scope) {
  return Object.freeze({ issuerFactionId, targetFactionId, scope });
}

function normalizedFactionIds(factionIds) {
  if (!Array.isArray(factionIds)) throw new Error("Trade embargo followers must be an array");
  const normalized = [...new Set(factionIds.map(assertFactionId))].sort();
  if (normalized.some((id) => id === NEUTRAL_FACTION_ID || id === PIRATE_FACTION_ID)) {
    throw new Error("Neutral and pirate factions cannot enforce a trade embargo");
  }
  return normalized;
}

function weightedCandidate(memory, candidates, key) {
  if (candidates.length === 0) return null;
  const total = candidates.reduce((sum, candidate) => sum + candidate.weight, 0);
  let roll = embargoRandom(memory, key) * total;
  for (const candidate of candidates) {
    roll -= candidate.weight;
    if (roll < 0) return candidate;
  }
  throw new Error("Trade embargo weighted choice failed");
}

function reviewIntervalMinutes(memory, sequence) {
  const range = REVIEW_MAX_DAYS - REVIEW_MIN_DAYS;
  return (REVIEW_MIN_DAYS + embargoRandom(memory, `interval|${sequence}`) * range) * MINUTES_PER_DAY;
}

function embargoRandom(memory, key) {
  return hashString32(`${memory.seed}|${memory.sequence}|${key}`) / 0x100000000;
}

function assertAuthority(value, label) {
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new Error(`Invalid ${label}: ${value}`);
  }
}

function assertMinute(value, label) {
  if (!Number.isFinite(value) || value < 0) throw new Error(`Invalid ${label}: ${value}`);
}

function assertSeedKey(value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error("Trade embargo memory requires a seed key");
  }
}

function assertNpcShipId(value) {
  if (typeof value !== "string" || value === "") {
    throw new Error(`Invalid trade embargo inspector ship: ${value}`);
  }
}

function assertRoll(value, label) {
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new Error(`Invalid ${label} roll: ${value}`);
  }
}

function arrayEqual(a, b) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function hashString32(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
