const NON_PORT_COLONIZATION_KINDS = new Set([
  "found-colony",
  "investigate-lost-colony"
]);

export function questSiteArrivalCandidate({
  colonizationObjective = null,
  cityCalls = [],
  portCallIsInRange,
  treasureTileId = null,
  nearestShoreTileId = null
}) {
  if (!Array.isArray(cityCalls)) throw new Error("Quest-site arrival requires city calls");
  if (typeof portCallIsInRange !== "function") {
    throw new Error("Quest-site arrival requires an interaction-range resolver");
  }

  if (NON_PORT_COLONIZATION_KINDS.has(colonizationObjective?.kind)) {
    const siteCall = cityCalls.find((call) => call.tileId === colonizationObjective.tileId);
    if (siteCall && siteCall.requiredTradePort !== true && portCallIsInRange(siteCall)) {
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
