import { CITY_GROUND_REAR_PAINTER_Z } from "./cityPainterOrder.js";

const FACADES = new Set(["Inn", "Smith", "Home", "Home 2", "Market Stall",
  "Market Stall Copy", "Market Stall Copy Copy", "Shipyard"]);

export function cityAssaultBuildingIsForeground(painterZ) {
  if (!Number.isFinite(painterZ)) throw new Error(`Invalid assault building painter depth: ${painterZ}`);
  return painterZ > CITY_GROUND_REAR_PAINTER_Z;
}

export function cityAssaultFacadeFoundationHeight(layerName, rasterHeight, painterZ) {
  if (!cityAssaultBuildingIsForeground(painterZ) || !FACADES.has(layerName)) return null;
  if (!Number.isInteger(rasterHeight) || rasterHeight < 14) {
    throw new Error(`Invalid assault facade height: ${layerName}/${rasterHeight}`);
  }
  return Math.max(8, Math.round(rasterHeight * 0.2));
}

// Keep every structure opaque during an assault. Street buildings are rendered
// as damaged foundations only when they stand in front of the battlefield.
export function cityCombatEntryOpacity(entry, assaultActive) {
  if (typeof assaultActive !== "boolean" || !Number.isFinite(entry?.z)) {
    throw new Error("City combat visibility requires painter depth and assault state");
  }
  return 1;
}
