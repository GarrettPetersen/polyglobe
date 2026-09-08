const FACADES = new Set(["Inn", "Smith", "Home", "Home 2", "Market Stall",
  "Market Stall Copy", "Market Stall Copy Copy", "Shipyard"]);

export function cityAssaultFacadeFoundationHeight(layerName, rasterHeight) {
  if (!FACADES.has(layerName)) return null;
  if (!Number.isInteger(rasterHeight) || rasterHeight < 14) {
    throw new Error(`Invalid assault facade height: ${layerName}/${rasterHeight}`);
  }
  return Math.max(8, Math.round(rasterHeight * 0.2));
}

// Keep every structure opaque during an assault. Street buildings are rendered
// as damaged foundations by the building renderer.
export function cityCombatEntryOpacity(entry, assaultActive) {
  if (typeof assaultActive !== "boolean" || !Number.isFinite(entry?.z)) {
    throw new Error("City combat visibility requires painter depth and assault state");
  }
  return 1;
}
