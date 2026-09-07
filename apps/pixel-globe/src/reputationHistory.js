import { assertFactionId } from "./factions.js";

export const REPUTATION_CHANGE_REASONS = Object.freeze({
  direct: Object.freeze({ label: "Standing adjustment" }), diplomacy: Object.freeze({ label: "Diplomatic mission" }), religion: Object.freeze({ label: "Change of faith" }),
  vassalage: Object.freeze({ label: "Vassal agreement" }), trade: Object.freeze({ label: "Trade" }), delivery: Object.freeze({ label: "Cargo delivered" }),
  imperialPeace: Object.freeze({ label: "Imperial peace broken" }), friendlyFire: Object.freeze({ label: "Friendly fire" }), selfDefense: Object.freeze({ label: "Self defence" }),
  mercy: Object.freeze({ label: "Prisoners spared" }), piracy: Object.freeze({ label: "Piracy" }), attack: Object.freeze({ label: "Ships or port attacked" }),
  embargo: Object.freeze({ label: "Embargo violation" }), theft: Object.freeze({ label: "Mission cargo stolen" }), mission: Object.freeze({ label: "Mission completed" }),
  papalService: Object.freeze({ label: "Service to the Pope" }), succession: Object.freeze({ label: "Succession" })
});
export const REPUTATION_CHANGE_WINDOW_MINUTES = 30 * 1440;

export function validateReputationChanges(changes) {
  if (!changes || typeof changes !== "object" || Array.isArray(changes)) throw new Error("Missing faction standing history");
  for (const [factionId, change] of Object.entries(changes)) {
    assertFactionId(factionId);
    if (!change || !Object.hasOwn(REPUTATION_CHANGE_REASONS, change.reason) ||
        !Number.isFinite(change.simMinute) || change.simMinute < 0 ||
        !Number.isFinite(change.before) || !Number.isFinite(change.after) ||
        change.before === change.after || Math.abs(change.before) > 100 || Math.abs(change.after) > 100) {
      throw new Error(`Invalid faction standing change: ${factionId}`);
    }
  }
}

// One latest observation per canonical faction: bounded, persisted, and never
// reconstructed from today's political circumstances or undated decisions.
export function recordReputationChange(changes, factionId, before, after, reason, simMinute) {
  assertFactionId(factionId);
  const record = { before, after, reason, simMinute };
  if (before === after) return;
  validateReputationChanges({ [factionId]: record });
  changes[factionId] = record;
}

export function recentReputationChange(changes, factionId, simMinute) {
  if (!Number.isFinite(simMinute) || simMinute < 0) throw new Error("Invalid standing history clock");
  const change = changes[factionId];
  if (!change || change.simMinute > simMinute || simMinute - change.simMinute > REPUTATION_CHANGE_WINDOW_MINUTES) return null;
  return Object.freeze({ ...change, delta: Math.round((change.after - change.before) * 1000) / 1000,
    daysAgo: Math.floor((simMinute - change.simMinute) / 1440), reasonLabel: REPUTATION_CHANGE_REASONS[change.reason].label });
}
