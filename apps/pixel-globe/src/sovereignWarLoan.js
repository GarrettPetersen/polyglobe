import {
  DIPLOMACY_WAR,
  NEUTRAL_FACTION_ID,
  PIRATE_FACTION_ID,
  assertFactionId
} from "./factions.js";
import { WEATHER_MINUTES_PER_DAY } from "./weather.js";

export const SOVEREIGN_WAR_LOAN_OFFER_THRESHOLD = 900_000;
export const SOVEREIGN_WAR_LOAN_PRINCIPAL = 1_000_000;
export const SOVEREIGN_WAR_LOAN_REPAYMENT = 1_200_000;
export const SOVEREIGN_WAR_LOAN_RESERVE_SLOTS = 2;
export const SOVEREIGN_WAR_LOAN_CONTRACT_ITEM_ID = "sovereign-war-loan-contract";

export const SOVEREIGN_WAR_LOAN_ACTIVE = "active";
export const SOVEREIGN_WAR_LOAN_REPAYMENT_READY = "repayment-ready";
export const SOVEREIGN_WAR_LOAN_DEFAULT_READY = "default-ready";

const SOVEREIGN_WAR_LOAN_MEMORY_VERSION = 1;
const SOVEREIGN_WAR_LOAN_OFFER_COOLDOWN_MINUTES = 180 * WEATHER_MINUTES_PER_DAY;
const SOVEREIGN_WAR_LOAN_HISTORY_LIMIT = 12;
const CONTRACT_STATUSES = new Set([
  SOVEREIGN_WAR_LOAN_ACTIVE,
  SOVEREIGN_WAR_LOAN_REPAYMENT_READY,
  SOVEREIGN_WAR_LOAN_DEFAULT_READY
]);

export function createSovereignWarLoanMemory() {
  return {
    version: SOVEREIGN_WAR_LOAN_MEMORY_VERSION,
    sequence: 0,
    offer: null,
    contract: null,
    lastOfferMinuteByFactionId: {},
    history: []
  };
}

export function migrateSovereignWarLoanMemory(memory) {
  if (memory === undefined || memory === null) return createSovereignWarLoanMemory();
  validateSovereignWarLoanMemory(memory);
  return memory;
}

export function validateSovereignWarLoanMemory(memory) {
  if (!memory || typeof memory !== "object" || Array.isArray(memory) ||
      memory.version !== SOVEREIGN_WAR_LOAN_MEMORY_VERSION ||
      !Number.isInteger(memory.sequence) || memory.sequence < 0 ||
      !memory.lastOfferMinuteByFactionId ||
      typeof memory.lastOfferMinuteByFactionId !== "object" ||
      Array.isArray(memory.lastOfferMinuteByFactionId) ||
      !Array.isArray(memory.history) || memory.history.length > SOVEREIGN_WAR_LOAN_HISTORY_LIMIT) {
    throw new Error("Invalid sovereign war-loan memory");
  }
  if (memory.offer !== null) validateWarLoanOffer(memory.offer);
  if (memory.contract !== null) validateWarLoanContract(memory.contract);
  if (memory.offer !== null && memory.contract !== null) {
    throw new Error("A sovereign war-loan offer cannot coexist with a contract");
  }
  for (const [factionId, simMinute] of Object.entries(memory.lastOfferMinuteByFactionId)) {
    assertSovereignFactionId(factionId);
    assertMinute(simMinute, `last ${factionId} war-loan offer`);
  }
  for (const entry of memory.history) validateWarLoanHistoryEntry(entry);
  return memory;
}

export function createSovereignWarLoanOffer(memory, {
  borrowerFactionId,
  enemyFactionId,
  capital,
  simMinute,
  doubloons
}) {
  validateSovereignWarLoanMemory(memory);
  assertSovereignFactionId(borrowerFactionId);
  assertSovereignFactionId(enemyFactionId);
  if (borrowerFactionId === enemyFactionId) throw new Error("A sovereign cannot borrow against itself");
  if (!capital || capital.factionId !== borrowerFactionId || capital.isFactionCapital !== true ||
      capital.capitalOfFactionId !== borrowerFactionId || !Number.isInteger(capital.tileId)) {
    throw new Error(`War-loan offer requires the ${borrowerFactionId} capital`);
  }
  const capitalPortId = requiredPortId(capital);
  const capitalTileId = capital.tileId;
  assertPortReference(capitalPortId, capitalTileId, "war-loan capital");
  assertMinute(simMinute, "war-loan offer");
  if (!Number.isFinite(doubloons) || doubloons < 0) throw new Error(`Invalid purse: ${doubloons}`);
  if (doubloons < SOVEREIGN_WAR_LOAN_OFFER_THRESHOLD || memory.contract) return null;
  if (memory.offer) return memory.offer;
  const lastOfferMinute = memory.lastOfferMinuteByFactionId[borrowerFactionId];
  if (Number.isFinite(lastOfferMinute) &&
      simMinute < lastOfferMinute + SOVEREIGN_WAR_LOAN_OFFER_COOLDOWN_MINUTES) {
    return null;
  }
  memory.sequence += 1;
  memory.offer = {
    id: `sovereign-war-loan:${borrowerFactionId}:${memory.sequence}`,
    borrowerFactionId,
    enemyFactionId,
    capitalPortId,
    capitalTileId,
    offeredMinute: simMinute,
    presentationTier: 0
  };
  validateSovereignWarLoanMemory(memory);
  return memory.offer;
}

export function sovereignWarLoanOfferNeedsPresentation(memory, city, doubloons) {
  validateSovereignWarLoanMemory(memory);
  const offer = memory.offer;
  if (!offer || !cityMatchesPortReference(city, offer.capitalPortId, offer.capitalTileId)) return false;
  if (!Number.isFinite(doubloons) || doubloons < 0) throw new Error(`Invalid purse: ${doubloons}`);
  const tier = doubloons >= SOVEREIGN_WAR_LOAN_PRINCIPAL ? 2 : 1;
  return offer.presentationTier < tier;
}

export function markSovereignWarLoanOfferPresented(memory, doubloons) {
  validateSovereignWarLoanMemory(memory);
  if (!memory.offer) throw new Error("No sovereign war-loan offer is awaiting presentation");
  if (!Number.isFinite(doubloons) || doubloons < SOVEREIGN_WAR_LOAN_OFFER_THRESHOLD) {
    throw new Error("A sovereign war loan cannot be presented below its wealth threshold");
  }
  memory.offer.presentationTier = doubloons >= SOVEREIGN_WAR_LOAN_PRINCIPAL ? 2 : 1;
  validateSovereignWarLoanMemory(memory);
  return memory.offer;
}

export function declineSovereignWarLoanOffer(memory, simMinute) {
  validateSovereignWarLoanMemory(memory);
  if (!memory.offer) throw new Error("No sovereign war-loan offer can be declined");
  assertMinute(simMinute, "war-loan refusal");
  const declined = memory.offer;
  memory.lastOfferMinuteByFactionId[declined.borrowerFactionId] = simMinute;
  memory.offer = null;
  validateSovereignWarLoanMemory(memory);
  return declined;
}

export function cancelStaleSovereignWarLoanOffer(memory, {
  relationBetween,
  capitalFactionId = undefined,
  simMinute
}) {
  validateSovereignWarLoanMemory(memory);
  if (typeof relationBetween !== "function") throw new Error("War-loan offer reconciliation needs diplomacy");
  assertMinute(simMinute, "war-loan offer reconciliation");
  const offer = memory.offer;
  if (!offer) return null;
  const stillAtWar = relationBetween(offer.borrowerFactionId, offer.enemyFactionId) === DIPLOMACY_WAR;
  const stillSovereignCapital = capitalFactionId === undefined ||
    capitalFactionId === offer.borrowerFactionId;
  if (stillAtWar && stillSovereignCapital) return null;
  memory.lastOfferMinuteByFactionId[offer.borrowerFactionId] = simMinute;
  memory.offer = null;
  validateSovereignWarLoanMemory(memory);
  return offer;
}

export function fundSovereignWarLoan(memory, {
  ports,
  borrowerRulerName,
  simMinute,
  doubloons,
  relationBetween
}) {
  validateSovereignWarLoanMemory(memory);
  const offer = memory.offer;
  if (!offer) throw new Error("No sovereign war-loan offer can be funded");
  if (!Array.isArray(ports)) throw new Error("A sovereign war loan requires a port ledger");
  if (typeof borrowerRulerName !== "string" || borrowerRulerName.trim() === "") {
    throw new Error("A sovereign war loan requires the borrower's ruler");
  }
  assertMinute(simMinute, "war-loan issue");
  if (!Number.isFinite(doubloons) || doubloons < SOVEREIGN_WAR_LOAN_PRINCIPAL) {
    throw new Error(`A sovereign war loan requires ${SOVEREIGN_WAR_LOAN_PRINCIPAL} doubloons`);
  }
  if (typeof relationBetween !== "function" ||
      relationBetween(offer.borrowerFactionId, offer.enemyFactionId) !== DIPLOMACY_WAR) {
    throw new Error("A sovereign war loan can only be issued during the named war");
  }
  const borrowerPortIds = controlledPortIds(ports, offer.borrowerFactionId);
  const enemyPortIds = controlledPortIds(ports, offer.enemyFactionId);
  if (borrowerPortIds.length === 0 || enemyPortIds.length === 0) {
    throw new Error("A sovereign war loan requires ports on both sides of the war");
  }
  memory.contract = {
    ...offer,
    borrowerRulerName,
    issuedMinute: simMinute,
    status: SOVEREIGN_WAR_LOAN_ACTIVE,
    settlementMinute: null,
    startingBorrowerPortIds: borrowerPortIds,
    startingEnemyPortIds: enemyPortIds,
    reserveSlotIds: [],
    offensiveShipIds: []
  };
  memory.offer = null;
  validateSovereignWarLoanMemory(memory);
  return memory.contract;
}

export function recordSovereignWarLoanMobilization(memory, { reserveSlotIds, offensiveShipIds }) {
  validateSovereignWarLoanMemory(memory);
  const contract = memory.contract;
  if (!contract || contract.status !== SOVEREIGN_WAR_LOAN_ACTIVE) {
    throw new Error("War-loan mobilization requires an active contract");
  }
  assertUniqueStringArray(reserveSlotIds, "war-loan reserve slots");
  assertUniqueStringArray(offensiveShipIds, "war-loan offensive ships");
  if (reserveSlotIds.length !== SOVEREIGN_WAR_LOAN_RESERVE_SLOTS) {
    throw new Error(`War-loan mobilization requires ${SOVEREIGN_WAR_LOAN_RESERVE_SLOTS} reserve slots`);
  }
  contract.reserveSlotIds = [...reserveSlotIds];
  contract.offensiveShipIds = [...offensiveShipIds];
  validateSovereignWarLoanMemory(memory);
  return contract;
}

export function resolveSovereignWarLoan(memory, {
  relationBetween,
  ports,
  treaties = [],
  collapsedFactionIds = [],
  simMinute
}) {
  validateSovereignWarLoanMemory(memory);
  const contract = memory.contract;
  if (!contract || contract.status !== SOVEREIGN_WAR_LOAN_ACTIVE) return null;
  if (typeof relationBetween !== "function") throw new Error("War-loan settlement needs diplomacy");
  if (!Array.isArray(ports) || !Array.isArray(treaties) || !Array.isArray(collapsedFactionIds)) {
    throw new Error("War-loan settlement requires ports, treaties, and collapsed factions");
  }
  assertMinute(simMinute, "war-loan settlement");
  if (relationBetween(contract.borrowerFactionId, contract.enemyFactionId) === DIPLOMACY_WAR) return null;

  const treaty = treaties
    .filter((entry) => entry?.simMinute >= contract.issuedMinute && (
      (entry.winnerFactionId === contract.borrowerFactionId &&
        entry.loserFactionId === contract.enemyFactionId) ||
      (entry.winnerFactionId === contract.enemyFactionId &&
        entry.loserFactionId === contract.borrowerFactionId)
    ))
    .sort((a, b) => b.simMinute - a.simMinute || String(a.id).localeCompare(String(b.id)))[0] || null;
  const collapsed = new Set(collapsedFactionIds);
  let won;
  let basis;
  if (treaty) {
    won = treaty.winnerFactionId === contract.borrowerFactionId;
    basis = `treaty:${treaty.id}`;
  } else if (collapsed.has(contract.borrowerFactionId)) {
    won = false;
    basis = "borrower-collapsed";
  } else if (collapsed.has(contract.enemyFactionId)) {
    won = true;
    basis = "enemy-collapsed";
  } else {
    const currentFactionByPortId = new Map(ports.map((port) => [requiredPortId(port), port.factionId]));
    const gains = contract.startingEnemyPortIds.filter(
      (portId) => currentFactionByPortId.get(portId) === contract.borrowerFactionId
    ).length;
    const losses = contract.startingBorrowerPortIds.filter(
      (portId) => currentFactionByPortId.get(portId) !== contract.borrowerFactionId
    ).length;
    won = gains > losses;
    basis = `ports:${gains}-${losses}`;
  }
  contract.status = won ? SOVEREIGN_WAR_LOAN_REPAYMENT_READY : SOVEREIGN_WAR_LOAN_DEFAULT_READY;
  contract.settlementMinute = simMinute;
  validateSovereignWarLoanMemory(memory);
  return Object.freeze({
    contractId: contract.id,
    borrowerFactionId: contract.borrowerFactionId,
    enemyFactionId: contract.enemyFactionId,
    status: contract.status,
    won,
    basis,
    offensiveShipIds: Object.freeze([...contract.offensiveShipIds])
  });
}

export function completeSovereignWarLoanAudience(memory, expectedStatus, simMinute) {
  validateSovereignWarLoanMemory(memory);
  if (![SOVEREIGN_WAR_LOAN_REPAYMENT_READY, SOVEREIGN_WAR_LOAN_DEFAULT_READY].includes(expectedStatus)) {
    throw new Error(`Invalid war-loan audience status: ${expectedStatus}`);
  }
  const contract = memory.contract;
  if (!contract || contract.status !== expectedStatus) {
    throw new Error(`No ${expectedStatus} war-loan audience is ready`);
  }
  assertMinute(simMinute, "war-loan audience");
  const entry = {
    id: contract.id,
    borrowerFactionId: contract.borrowerFactionId,
    enemyFactionId: contract.enemyFactionId,
    issuedMinute: contract.issuedMinute,
    settlementMinute: contract.settlementMinute,
    completedMinute: simMinute,
    status: expectedStatus,
    repaidAmount: expectedStatus === SOVEREIGN_WAR_LOAN_REPAYMENT_READY
      ? SOVEREIGN_WAR_LOAN_REPAYMENT
      : 0
  };
  memory.history.unshift(entry);
  if (memory.history.length > SOVEREIGN_WAR_LOAN_HISTORY_LIMIT) {
    memory.history.length = SOVEREIGN_WAR_LOAN_HISTORY_LIMIT;
  }
  memory.lastOfferMinuteByFactionId[contract.borrowerFactionId] = simMinute;
  memory.contract = null;
  validateSovereignWarLoanMemory(memory);
  return Object.freeze({ ...entry });
}

export function sovereignWarLoanContractIsCarried(memory) {
  validateSovereignWarLoanMemory(memory);
  return memory.contract !== null;
}

function validateWarLoanOffer(offer) {
  if (!offer || typeof offer.id !== "string" || offer.id === "" ||
      !Number.isInteger(offer.presentationTier) || offer.presentationTier < 0 ||
      offer.presentationTier > 2) {
    throw new Error("Invalid sovereign war-loan offer");
  }
  assertSovereignFactionId(offer.borrowerFactionId);
  assertSovereignFactionId(offer.enemyFactionId);
  if (offer.borrowerFactionId === offer.enemyFactionId) throw new Error("Invalid self-directed war loan");
  assertPortReference(offer.capitalPortId, offer.capitalTileId, "war-loan offer capital");
  assertMinute(offer.offeredMinute, "war-loan offer");
  return offer;
}

function validateWarLoanContract(contract) {
  validateWarLoanOffer(contract);
  if (typeof contract.borrowerRulerName !== "string" || contract.borrowerRulerName.trim() === "" ||
      !CONTRACT_STATUSES.has(contract.status)) {
    throw new Error(`Invalid sovereign war-loan contract: ${contract.id}`);
  }
  assertMinute(contract.issuedMinute, "war-loan issue");
  if (contract.settlementMinute !== null) assertMinute(contract.settlementMinute, "war-loan settlement");
  if ((contract.status === SOVEREIGN_WAR_LOAN_ACTIVE) !== (contract.settlementMinute === null)) {
    throw new Error(`War-loan settlement state does not match its status: ${contract.id}`);
  }
  assertUniqueStringArray(contract.startingBorrowerPortIds, "borrower starting ports", true);
  assertUniqueStringArray(contract.startingEnemyPortIds, "enemy starting ports", true);
  assertUniqueStringArray(contract.reserveSlotIds, "war-loan reserve slots");
  assertUniqueStringArray(contract.offensiveShipIds, "war-loan offensive ships");
  if (![0, SOVEREIGN_WAR_LOAN_RESERVE_SLOTS].includes(contract.reserveSlotIds.length)) {
    throw new Error(`Invalid funded reserve count on ${contract.id}`);
  }
  return contract;
}

function validateWarLoanHistoryEntry(entry) {
  if (!entry || typeof entry.id !== "string" || entry.id === "" ||
      ![SOVEREIGN_WAR_LOAN_REPAYMENT_READY, SOVEREIGN_WAR_LOAN_DEFAULT_READY].includes(entry.status) ||
      !Number.isInteger(entry.repaidAmount) || entry.repaidAmount < 0) {
    throw new Error("Invalid sovereign war-loan history entry");
  }
  assertSovereignFactionId(entry.borrowerFactionId);
  assertSovereignFactionId(entry.enemyFactionId);
  assertMinute(entry.issuedMinute, "historical war-loan issue");
  assertMinute(entry.settlementMinute, "historical war-loan settlement");
  assertMinute(entry.completedMinute, "historical war-loan audience");
  const expected = entry.status === SOVEREIGN_WAR_LOAN_REPAYMENT_READY
    ? SOVEREIGN_WAR_LOAN_REPAYMENT
    : 0;
  if (entry.repaidAmount !== expected) throw new Error(`Invalid war-loan repayment: ${entry.id}`);
  return entry;
}

function controlledPortIds(ports, factionId) {
  const ids = ports.filter((port) => port?.factionId === factionId).map(requiredPortId).sort();
  if (new Set(ids).size !== ids.length) throw new Error(`Duplicate port references for ${factionId}`);
  return ids;
}

function requiredPortId(port) {
  const portId = port?.portId;
  if (typeof portId !== "string" || portId.trim() === "") {
    throw new Error(`War-loan port has no canonical reference: ${port?.tileId ?? "missing"}`);
  }
  return portId;
}

function cityMatchesPortReference(city, portId, tileId) {
  return city?.portId === portId && city?.tileId === tileId;
}

function assertPortReference(portId, tileId, label) {
  if (typeof portId !== "string" || portId.trim() === "" || !Number.isInteger(tileId) || tileId < 0) {
    throw new Error(`Invalid ${label}: ${portId || "missing"}/${tileId}`);
  }
}

function assertSovereignFactionId(factionId) {
  assertFactionId(factionId);
  if (factionId === NEUTRAL_FACTION_ID || factionId === PIRATE_FACTION_ID) {
    throw new Error(`War-loan faction must be sovereign: ${factionId}`);
  }
  return factionId;
}

function assertUniqueStringArray(values, label, nonempty = false) {
  if (!Array.isArray(values) || (nonempty && values.length === 0) ||
      values.some((value) => typeof value !== "string" || value.trim() === "") ||
      new Set(values).size !== values.length) {
    throw new Error(`Invalid ${label}`);
  }
}

function assertMinute(value, label) {
  if (!Number.isFinite(value) || value < 0) throw new Error(`Invalid ${label} minute: ${value}`);
}
