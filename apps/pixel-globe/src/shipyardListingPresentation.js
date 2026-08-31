const SHIPYARD_LISTING_CONDITIONS = Object.freeze({
  "new-build": Object.freeze({
    menuAdjective: "New",
    sentenceLead: "A newly built",
    overlayHeading: "SHIPYARD / NEW VESSEL",
    comparisonHeading: "NEW"
  }),
  "trade-in": Object.freeze({
    menuAdjective: "Pre-owned",
    sentenceLead: "A pre-owned",
    overlayHeading: "SHIPYARD / USED VESSEL",
    comparisonHeading: "USED"
  })
});

export function shipyardListingCondition(source) {
  if (typeof source !== "string" || source === "") {
    throw new Error("Shipyard listing condition requires a source");
  }
  const condition = SHIPYARD_LISTING_CONDITIONS[source];
  if (!condition) throw new Error(`Unknown shipyard listing source: ${source}`);
  return condition;
}
