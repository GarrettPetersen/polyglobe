export const COMBAT_THREAT_SMALL = "small";
export const COMBAT_THREAT_BIG = "big";

export function combatMusicTrackForThreat(threat) {
  if (threat === COMBAT_THREAT_SMALL) return "combatSmall";
  if (threat === COMBAT_THREAT_BIG) return "combatBig";
  throw new Error(`Unknown combat music threat: ${threat}`);
}

export function continuingPortBombardmentThreat({
  playerAttackActive,
  batteryDisabled,
  gunCount
}) {
  if (typeof playerAttackActive !== "boolean") {
    throw new Error(`Invalid port bombardment player attack state: ${playerAttackActive}`);
  }
  if (typeof batteryDisabled !== "boolean") {
    throw new Error(`Invalid port bombardment battery state: ${batteryDisabled}`);
  }
  if (!Number.isInteger(gunCount) || gunCount <= 0) {
    throw new Error(`Invalid port bombardment gun count: ${gunCount}`);
  }
  if (!playerAttackActive || !batteryDisabled) return null;
  return gunCount >= 2 ? COMBAT_THREAT_BIG : COMBAT_THREAT_SMALL;
}
