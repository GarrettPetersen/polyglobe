import { gameMinuteForDate } from "./rulers.js";

const MUGHAL_FACTION_ID = "mughal";
const HUMAYUN_ACCESSION_MINUTE = gameMinuteForDate(1530, 12, 26);

export const MUGHAL_EXPANSION_WARSHIP_TARGET = 5;

const EXPANSION_PROFILES = Object.freeze({
  [MUGHAL_FACTION_ID]: Object.freeze({
    aggressionMultiplier: 2.2,
    conquestCommissionChance: 0.72,
    reinforcementWarships: MUGHAL_EXPANSION_WARSHIP_TARGET,
    targets: Object.freeze([
      // Babur's eastern campaigns culminated at Ghagra; Humayun later invaded Gujarat.
      Object.freeze({ factionId: "bengal", fromMinute: 0, priority: 4 }),
      Object.freeze({ factionId: "gujarat", fromMinute: HUMAYUN_ACCESSION_MINUTE, priority: 2.5 })
    ])
  })
});

export function factionExpansionProfile(factionId) {
  return EXPANSION_PROFILES[factionId] || null;
}

export function factionExpansionTargetPriority(factionId, targetFactionId, simMinute) {
  assertMinute(simMinute);
  const profile = factionExpansionProfile(factionId);
  if (!profile) return 0;
  const target = profile.targets.find((candidate) => (
    candidate.factionId === targetFactionId && simMinute >= candidate.fromMinute
  ));
  return target?.priority || 0;
}

export function factionDiplomaticAggressionMultiplier(factionAId, factionBId, simMinute) {
  assertMinute(simMinute);
  return Math.max(
    directedDiplomaticAggression(factionAId, factionBId, simMinute),
    directedDiplomaticAggression(factionBId, factionAId, simMinute)
  );
}

export function factionConquestCommissionChance(factionId, defaultChance) {
  assertChance(defaultChance);
  return factionExpansionProfile(factionId)?.conquestCommissionChance ?? defaultChance;
}

export function factionExpansionWarshipTarget(factionId) {
  return factionExpansionProfile(factionId)?.reinforcementWarships || 0;
}

function directedDiplomaticAggression(factionId, targetFactionId, simMinute) {
  const profile = factionExpansionProfile(factionId);
  if (!profile) return 1;
  const targetPriority = factionExpansionTargetPriority(factionId, targetFactionId, simMinute);
  return profile.aggressionMultiplier * Math.max(1, targetPriority);
}

function assertMinute(value) {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`Invalid faction expansion minute: ${value}`);
  }
}

function assertChance(value) {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`Invalid default conquest commission chance: ${value}`);
  }
}
