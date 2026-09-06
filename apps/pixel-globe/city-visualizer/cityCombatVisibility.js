import { cityPortAssaultLanePainterZ } from "./cityPainterOrder.js";

const FACADES = new Set(["Inn", "Smith", "Home", "Home 2", "Market Stall",
  "Market Stall Copy", "Market Stall Copy Copy", "Gate", "Near Castle", "Shipyard"]);

// Keep the street's depth ordering, but cut away foreground facades for the
// duration of an assault. A stable cutaway avoids flickering as units cross.
export function cityCombatEntryOpacity(entry, assaultActive) {
  if (typeof assaultActive !== "boolean" || !Number.isFinite(entry?.z)) {
    throw new Error("City combat visibility requires painter depth and assault state");
  }
  const facade = (entry.kind === "static" && FACADES.has(entry.layerName)) ||
    ["city-building", "gate-front", "shipyard-front"].includes(entry.kind);
  return assaultActive && facade && entry.z > cityPortAssaultLanePainterZ(0) ? 0.22 : 1;
}
