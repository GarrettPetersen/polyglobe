const NON_PORT_COLONIZATION_KINDS = new Set([
  "found-colony",
  "investigate-lost-colony"
]);

export const COLONIZATION_SITE_ARRIVAL_RADIUS_PX = 48;
export const QUEST_SITE_OVERLAY_CHARACTER_ALERT = "character-alert";
export const QUEST_SITE_OVERLAY_DIALOGUE = "dialogue";
const QUEST_SITE_OVERLAY_KINDS = new Set([
  QUEST_SITE_OVERLAY_CHARACTER_ALERT,
  QUEST_SITE_OVERLAY_DIALOGUE
]);

export function questSiteArrivalCandidate({
  colonizationObjective = null,
  cityCalls = [],
  playerInteractionPoint = null,
  treasureTileId = null,
  treasureShoreTileId = null
}) {
  if (!Array.isArray(cityCalls)) throw new Error("Quest-site arrival requires city calls");

  if (NON_PORT_COLONIZATION_KINDS.has(colonizationObjective?.kind)) {
    const siteCall = cityCalls.find((call) => call.tileId === colonizationObjective.tileId);
    if (siteCall && siteCall.requiredTradePort !== true &&
        colonizationSiteCallIsInArrivalRange(siteCall, playerInteractionPoint)) {
      return Object.freeze({
        kind: "colonization",
        call: siteCall,
        actionType: colonizationObjective.kind === "found-colony" ? "land-colonists" : null,
        releaseAnchorOnOverlayClose: true
      });
    }
  }

  if (Number.isInteger(treasureTileId) && treasureTileId === treasureShoreTileId) {
    return Object.freeze({ kind: "treasure", tileId: treasureTileId });
  }
  return null;
}

// Sighting markers use the settled local chart, whose visible tiles can be
// displaced from an ideal globe projection. Arrival must use that same frame.
export function questSearchAreaReached(sitePoint, playerPoint) {
  if (sitePoint === null) return false; // The sighting is outside the local chart.
  for (const point of [sitePoint, playerPoint]) {
    if (!Number.isFinite(point?.x) || !Number.isFinite(point?.y)) {
      throw new Error("Quest search arrival requires finite local chart coordinates");
    }
  }
  return Math.hypot(sitePoint.x - playerPoint.x, sitePoint.y - playerPoint.y) <= 28;
}

export function colonizationSiteCallIsInArrivalRange(call, playerInteractionPoint) {
  // An uninhabited destination has no port staff. Proximity is geographic;
  // the arrival scene supplies the expedition organizer as its speaker.
  if (!call) throw new Error("Colonization-site arrival requires its site call");
  if (!Number.isFinite(call.interactionX) || !Number.isFinite(call.interactionY)) {
    throw new Error(`Colonization-site interaction point is missing for ${call.portId || call.tileId}`);
  }
  if (!Number.isFinite(playerInteractionPoint?.x) || !Number.isFinite(playerInteractionPoint?.y)) {
    throw new Error("Colonization-site arrival requires a finite player interaction point");
  }
  const dx = playerInteractionPoint.x - call.interactionX;
  const dy = playerInteractionPoint.y - call.interactionY;
  return dx * dx + dy * dy <=
    COLONIZATION_SITE_ARRIVAL_RADIUS_PX * COLONIZATION_SITE_ARRIVAL_RADIUS_PX;
}

export function questSiteArrivalOverlayKind({
  dialogueOpen,
  characterAlertOpen
}) {
  if (typeof dialogueOpen !== "boolean" || typeof characterAlertOpen !== "boolean") {
    throw new Error("Quest-site arrival overlay state must be explicit booleans");
  }
  if (dialogueOpen) return QUEST_SITE_OVERLAY_DIALOGUE;
  if (characterAlertOpen) return QUEST_SITE_OVERLAY_CHARACTER_ALERT;
  throw new Error("Automatic quest-site arrival did not open a supported overlay");
}

export function resolveAutomaticQuestSiteAnchorClosure({
  anchored,
  trackedOverlayKind,
  closingOverlayKind
}) {
  if (typeof anchored !== "boolean") {
    throw new Error("Quest-site anchor closure requires explicit anchor state");
  }
  if (!QUEST_SITE_OVERLAY_KINDS.has(trackedOverlayKind) ||
      !QUEST_SITE_OVERLAY_KINDS.has(closingOverlayKind)) {
    throw new Error(`Unknown quest-site overlay closure: ${trackedOverlayKind}/${closingOverlayKind}`);
  }
  if (trackedOverlayKind !== closingOverlayKind) {
    return Object.freeze({ anchored, released: false });
  }
  if (!anchored) {
    throw new Error("Automatic quest-site overlay closed without its anchor down");
  }
  return Object.freeze({ anchored: false, released: true });
}
