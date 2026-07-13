const SHALLOW_WATER_ELEVATION = -0.20500000000000002;

export const MANUAL_SHALLOW_WATER_TILE_IDS_BY_SUBDIVISIONS = Object.freeze({
  7: Object.freeze([
    38891 // Gulf of Khambhat at Cambay's historical harbor.
  ])
});

export function applyManualTerrainOverrides(earthRows, subdivisions) {
  if (!Array.isArray(earthRows)) throw new Error("Manual terrain overrides require Earth tile rows");
  const tileIds = MANUAL_SHALLOW_WATER_TILE_IDS_BY_SUBDIVISIONS[subdivisions] || [];
  if (tileIds.length === 0) return earthRows;

  const correctedRows = earthRows.slice();
  for (const tileId of tileIds) {
    const source = earthRows[tileId];
    if (!source || source.id !== tileId) {
      throw new Error(`Manual terrain override tile ${tileId} does not match the Earth cache`);
    }
    const { h: _hill, l: _lake, m: _landmass, ...shared } = source;
    correctedRows[tileId] = {
      ...shared,
      t: "beach",
      e: SHALLOW_WATER_ELEVATION,
      o: 1
    };
  }
  return correctedRows;
}
