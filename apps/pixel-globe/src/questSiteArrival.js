const NON_PORT_COLONIZATION_KINDS = new Set([
  "found-colony",
  "investigate-lost-colony"
]);

export const COLONIZATION_SITE_ARRIVAL_RADIUS_PX = 48;

export function questSiteArrivalCandidate({
  colonizationObjective = null,
  cityCalls = [],
  playerInteractionPoint = null,
  treasureTileId = null,
  nearestShoreTileId = null
}) {
  if (!Array.isArray(cityCalls)) throw new Error("Quest-site arrival requires city calls");

  if (NON_PORT_COLONIZATION_KINDS.has(colonizationObjective?.kind)) {
    const siteCall = cityCalls.find((call) => call.tileId === colonizationObjective.tileId);
    if (siteCall && siteCall.requiredTradePort !== true &&
        colonizationSiteCallIsInArrivalRange(siteCall, playerInteractionPoint)) {
      return Object.freeze({
        kind: "colonization",
        call: siteCall,
        releaseAnchorOnDialogueClose: true
      });
    }
  }

  if (Number.isInteger(treasureTileId) && treasureTileId === nearestShoreTileId) {
    return Object.freeze({ kind: "treasure", tileId: treasureTileId });
  }
  return null;
}

export function colonizationSiteCallIsInArrivalRange(call, playerInteractionPoint) {
  if (!call?.character) return false;
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

export function resolveQuestSiteAnchorOnDialogueClose({
  anchored,
  releaseAnchorOnDialogueClose
}) {
  if (typeof anchored !== "boolean" || typeof releaseAnchorOnDialogueClose !== "boolean") {
    throw new Error("Quest-site anchor closure requires explicit boolean state");
  }
  if (!releaseAnchorOnDialogueClose) {
    return Object.freeze({ anchored, released: false });
  }
  if (!anchored) {
    throw new Error("Automatic quest-site dialogue closed without its anchor down");
  }
  return Object.freeze({ anchored: false, released: true });
}
