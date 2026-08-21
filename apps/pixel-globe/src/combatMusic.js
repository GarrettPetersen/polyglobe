export const COMBAT_THREAT_SMALL = "small";
export const COMBAT_THREAT_BIG = "big";

export function combatMusicTrackForThreat(threat) {
  if (threat === COMBAT_THREAT_SMALL) return "combatSmall";
  if (threat === COMBAT_THREAT_BIG) return "combatBig";
  throw new Error(`Unknown combat music threat: ${threat}`);
}
