export const MINIMAP_CITY_COLOR = "#0b5e65";
export const MINIMAP_VILLAGE_COLOR = "#547e64";

export function minimapSettlementMarkers(settlements, { isRevealed, project }) {
  if (!settlements || typeof settlements[Symbol.iterator] !== "function") {
    throw new Error("Minimap settlements must be iterable");
  }
  if (typeof isRevealed !== "function" || typeof project !== "function") {
    throw new Error("Minimap settlement markers require reveal and projection functions");
  }

  const markers = new Map();
  for (const settlement of settlements) {
    if (!settlement || !Number.isInteger(settlement.tileId) || !isRevealed(settlement)) continue;
    const point = project(settlement);
    if (!point) continue;
    if (!Number.isInteger(point.x) || !Number.isInteger(point.y)) {
      throw new Error(`Minimap settlement projection must be pixel aligned: ${point.x},${point.y}`);
    }
    const kind = settlement.settlementType === "village" ? "village" : "city";
    const key = `${point.x}:${point.y}`;
    const existing = markers.get(key);
    if (existing?.kind === "city" || (existing && kind === "village")) continue;
    markers.set(key, Object.freeze({ x: point.x, y: point.y, kind }));
  }
  return Object.freeze([...markers.values()]);
}

export function minimapSettlementColor(kind) {
  if (kind === "city") return MINIMAP_CITY_COLOR;
  if (kind === "village") return MINIMAP_VILLAGE_COLOR;
  throw new Error(`Unknown minimap settlement kind: ${kind}`);
}
