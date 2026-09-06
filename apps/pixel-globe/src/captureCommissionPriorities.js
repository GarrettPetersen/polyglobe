import {
  CANONICAL_PORTS,
  portMatchesCanonicalReference
} from "./canonicalPorts.js";
import { assertFactionId } from "./factions.js";
import { factionExpansionTargetPriority } from "./factionExpansion.js";

export const CAPTURE_COMMISSION_PRIORITY_RETAKE = "retake";
export const CAPTURE_COMMISSION_PRIORITY_HISTORICAL_CONQUEST = "historical-conquest";
export const CAPTURE_COMMISSION_PRIORITY_HISTORICAL_ATTEMPT = "historical-attempt";
export const CAPTURE_COMMISSION_PRIORITY_STRATEGIC = "strategic";

const PRIORITY_TIERS = Object.freeze({
  [CAPTURE_COMMISSION_PRIORITY_RETAKE]: 1,
  [CAPTURE_COMMISSION_PRIORITY_HISTORICAL_CONQUEST]: 2,
  [CAPTURE_COMMISSION_PRIORITY_HISTORICAL_ATTEMPT]: 3,
  [CAPTURE_COMMISSION_PRIORITY_STRATEGIC]: 4
});

// These are ambitions a contemporary court could plausibly pursue. The labels
// are simulation metadata only; no character speaks with knowledge of the future.
const HISTORICAL_CONQUEST_TARGETS = historicalTargets([
  ["ottoman", CANONICAL_PORTS.ADEN, 2],
  ["ottoman", CANONICAL_PORTS.TUNIS, 2.5],
  ["ottoman", CANONICAL_PORTS.RHODES, 4],
  ["ottoman", CANONICAL_PORTS.BUDAPEST, 2.5],
  ["ottoman", CANONICAL_PORTS.BAGHDAD, 2],
  ["ottoman", CANONICAL_PORTS.TRIPOLI, 1.5],
  ["mughal", CANONICAL_PORTS.DELHI, 3],
  ["spain", CANONICAL_PORTS.TUNIS, 2]
]);

const HISTORICAL_ATTEMPT_TARGETS = historicalTargets([
  // Garcia Henriques landed troops in 1529, but Bandanese resistance stopped the fort.
  ["portugal", CANONICAL_PORTS.BANDA_VILLAGE, 1.75],
  ["ottoman", CANONICAL_PORTS.VIENNA, 2],
  ["ottoman", CANONICAL_PORTS.KERKIRA, 1.75],
  ["ottoman", CANONICAL_PORTS.BIRGU, 1.5],
  ["spain", CANONICAL_PORTS.ALGIERS, 2],
  ["portugal", CANONICAL_PORTS.DIU, 2]
]);

export function captureCommissionPriorityForPort(issuerFactionId, port, simMinute) {
  const issuerId = assertFactionId(issuerFactionId);
  if (!port || typeof port !== "object") {
    throw new Error("Capture-commission priority requires a port");
  }
  if (!Number.isFinite(simMinute) || simMinute < 0) {
    throw new Error(`Invalid capture-commission minute: ${simMinute}`);
  }
  if (port.foundingFactionId === issuerId) {
    return priority(CAPTURE_COMMISSION_PRIORITY_RETAKE, 1);
  }

  const conquest = matchingHistoricalTarget(HISTORICAL_CONQUEST_TARGETS, issuerId, port);
  const expansionPriority = factionExpansionTargetPriority(
    issuerId,
    assertFactionId(port.factionId),
    simMinute
  );
  if (conquest || expansionPriority > 0) {
    return priority(
      CAPTURE_COMMISSION_PRIORITY_HISTORICAL_CONQUEST,
      Math.max(conquest?.weight || 0, expansionPriority)
    );
  }

  const attempt = matchingHistoricalTarget(HISTORICAL_ATTEMPT_TARGETS, issuerId, port);
  if (attempt) {
    return priority(CAPTURE_COMMISSION_PRIORITY_HISTORICAL_ATTEMPT, attempt.weight);
  }
  return priority(CAPTURE_COMMISSION_PRIORITY_STRATEGIC, 1);
}

function historicalTargets(entries) {
  return Object.freeze(entries.map(([issuerFactionId, port, weight]) => {
    assertFactionId(issuerFactionId);
    if (!Number.isFinite(weight) || weight <= 0) {
      throw new Error(`Invalid historical capture weight: ${weight}`);
    }
    return Object.freeze({ issuerFactionId, port, weight });
  }));
}

function matchingHistoricalTarget(targets, issuerFactionId, port) {
  return targets.find((target) => (
    target.issuerFactionId === issuerFactionId &&
    portMatchesCanonicalReference(port, target.port)
  )) || null;
}

function priority(kind, weight) {
  return Object.freeze({
    kind,
    tier: PRIORITY_TIERS[kind],
    weight
  });
}
