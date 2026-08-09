export const FRIENDLY_FIRE_DIRECT = "direct";
export const FRIENDLY_FIRE_WARNING = "warning";
export const FRIENDLY_FIRE_SAME_VOLLEY = "same-volley";
export const FRIENDLY_FIRE_FORGIVEN = "forgiven";
export const FRIENDLY_FIRE_WARNING_LIMIT_PER_FACTION = 1;

export function classifyPlayerCannonHit(incidentsByFaction, {
  factionId,
  volleyId,
  targetAlreadyEngaged,
  targetIsCombatAlly,
  firedDuringCombat,
  targetAlreadyHostile
}) {
  if (!(incidentsByFaction instanceof Map)) {
    throw new Error("Friendly-fire classification requires an incident map");
  }
  if (typeof factionId !== "string" || factionId.length === 0) {
    throw new Error(`Friendly-fire classification requires a faction: ${factionId}`);
  }
  if (typeof targetAlreadyEngaged !== "boolean" || typeof targetIsCombatAlly !== "boolean" ||
      typeof firedDuringCombat !== "boolean" || typeof targetAlreadyHostile !== "boolean") {
    throw new Error("Friendly-fire classification requires explicit combat flags");
  }
  if (targetIsCombatAlly) return FRIENDLY_FIRE_FORGIVEN;
  if (targetAlreadyEngaged || !firedDuringCombat || targetAlreadyHostile) {
    return FRIENDLY_FIRE_DIRECT;
  }
  if (!Number.isInteger(volleyId) || volleyId < 0) {
    throw new Error(`Friendly-fire classification requires a cannon volley id: ${volleyId}`);
  }

  const incident = incidentsByFaction.get(factionId);
  if (incident === undefined) {
    incidentsByFaction.set(factionId, Object.freeze({
      lastVolleyId: volleyId,
      warningCount: 1
    }));
    return FRIENDLY_FIRE_WARNING;
  }
  if (!incident || !Number.isInteger(incident.lastVolleyId) || !Number.isInteger(incident.warningCount)) {
    throw new Error(`Invalid friendly-fire incident record for ${factionId}`);
  }
  if (incident.lastVolleyId === volleyId) return FRIENDLY_FIRE_SAME_VOLLEY;
  if (incident.warningCount >= FRIENDLY_FIRE_WARNING_LIMIT_PER_FACTION) {
    return FRIENDLY_FIRE_FORGIVEN;
  }
  incidentsByFaction.set(factionId, Object.freeze({
    lastVolleyId: volleyId,
    warningCount: incident.warningCount + 1
  }));
  return FRIENDLY_FIRE_WARNING;
}

export function clearFriendlyFireIncidents(incidentsByFaction) {
  if (!(incidentsByFaction instanceof Map)) {
    throw new Error("Clearing friendly fire requires an incident map");
  }
  incidentsByFaction.clear();
}
