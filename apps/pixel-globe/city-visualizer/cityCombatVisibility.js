import { cityPortAssaultLanePainterZ } from "./cityPainterOrder.js";

const FACADES = new Set(["Inn", "Smith", "Home", "Home 2", "Market Stall",
  "Market Stall Copy", "Market Stall Copy Copy", "Gate", "Near Castle", "Shipyard"]);

// Keep every structure opaque during an assault. Street buildings are rendered
// as damaged foundations by the building renderer.
export function cityCombatEntryOpacity(entry, assaultActive) {
  if (typeof assaultActive !== "boolean" || !Number.isFinite(entry?.z)) {
    throw new Error("City combat visibility requires painter depth and assault state");
  }
  return 1;
}
