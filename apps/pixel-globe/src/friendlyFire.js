export const FRIENDLY_FIRE_DIRECT = "direct";
export const FRIENDLY_FIRE_WARNING = "warning";
export const FRIENDLY_FIRE_SAME_VOLLEY = "same-volley";
export const FRIENDLY_FIRE_ESCALATE = "escalate";

export function classifyPlayerCannonHit(incidentsByFaction, {
  factionId,
  volleyId,
  targetAlreadyEngaged,
  firedDuringCombat,
  targetAlreadyHostile
}) {
  if (!(incidentsByFaction instanceof Map)) {
    throw new Error("Friendly-fire classification requires an incident map");
  }
  if (typeof factionId !== "string" || factionId.length === 0) {
    throw new Error(`Friendly-fire classification requires a faction: ${factionId}`);
  }
  if (typeof targetAlreadyEngaged !== "boolean" || typeof firedDuringCombat !== "boolean" ||
      typeof targetAlreadyHostile !== "boolean") {
    throw new Error("Friendly-fire classification requires explicit combat flags");
  }
  if (targetAlreadyEngaged || !firedDuringCombat || targetAlreadyHostile) {
    return FRIENDLY_FIRE_DIRECT;
  }
  if (!Number.isInteger(volleyId) || volleyId < 0) {
    throw new Error(`Friendly-fire classification requires a cannon volley id: ${volleyId}`);
  }

  const previousVolleyId = incidentsByFaction.get(factionId);
  if (previousVolleyId === undefined) {
    incidentsByFaction.set(factionId, volleyId);
    return FRIENDLY_FIRE_WARNING;
  }
  return previousVolleyId === volleyId
    ? FRIENDLY_FIRE_SAME_VOLLEY
    : FRIENDLY_FIRE_ESCALATE;
}

export function clearFriendlyFireIncidents(incidentsByFaction) {
  if (!(incidentsByFaction instanceof Map)) {
    throw new Error("Clearing friendly fire requires an incident map");
  }
  incidentsByFaction.clear();
}
