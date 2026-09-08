import { shipStatsForSlug } from "./shipStats.js";

// Only launched ships are complete; rounding must not promise a finished hull.
export function shipyardUnfinishedBuildPercent(progress) {
  if (!Number.isFinite(progress) || progress < 0 || progress > 1) {
    throw new Error(`Invalid shipyard construction progress: ${progress}`);
  }
  return Math.min(99, Math.floor(progress * 100));
}

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

// Validate at view construction so every headless dialogue journey exercises
// the same contract as the vessel overlay, including quest reward listings.
export function validateShipyardDialoguePresentation(presentation) {
  const listing = presentation.listing;
  if (!listing || typeof listing.id !== "string" || listing.id === "") {
    throw new Error("Shipyard dialogue requires an identified listing");
  }
  shipyardListingCondition(listing.source);
  shipStatsForSlug(listing.shipSlug);
  shipStatsForSlug(presentation.currentShipSlug);
  if (!Number.isFinite(listing.price) || listing.price < 0) {
    throw new Error(`Shipyard dialogue has an invalid price: ${listing.id}`);
  }
  const terms = presentation.purchaseTerms;
  if (!terms || terms.listingPrice !== listing.price ||
      !Number.isFinite(terms.tradeInValue) || terms.tradeInValue < 0 ||
      terms.netPrice !== terms.listingPrice - terms.tradeInValue) {
    throw new Error(`Shipyard dialogue has invalid purchase terms: ${listing.id}`);
  }
  return presentation;
}
