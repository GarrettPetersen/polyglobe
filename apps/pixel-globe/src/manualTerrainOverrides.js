const SHALLOW_WATER_ELEVATION = -0.20500000000000002;

export const MANUAL_SHALLOW_WATER_TILE_IDS_BY_SUBDIVISIONS = Object.freeze({
  7: Object.freeze([
    38891, // Gulf of Khambhat at Cambay's historical harbor.
    38903 // Outlet from the inner gulf to the existing Arabian Sea coast.
  ])
});

// The base terrain bake labels the northern Norway, Barents, and White Sea
// coasts as permanent ice. This generated subdivision-7 band contains every
// permanent-ice ocean tile within two graph edges of the coast from northern
// Norway around the Kola Peninsula to the White Sea. Runtime weather then
// decides which of them freeze instead of carving a straight permanent route.
export const NORWAY_WHITE_SEA_SEASONAL_ICE_RULE = Object.freeze({
  subdivisions: 7,
  graphRadius: 2,
  minLatitude: 65,
  maxLatitude: 72,
  minLongitude: 4,
  maxLongitude: 43
});

export const MANUAL_SEASONAL_SEA_TILE_IDS_BY_SUBDIVISIONS = Object.freeze({
  7: Object.freeze([
    55207, 13844, 55205, 56347, 56346, 14133, 56353, 56352,
    56338, 56351, 56339, 14131, 56389, 56340, 14129, 56343,
    56385, 56335, 14130, 56369, 56336, 901, 56368, 56454,
    56425, 56426, 14150, 56429, 56428, 56427, 56472, 56479,
    3560, 56465, 14159, 56466, 56468, 14145, 56404, 14116
  ])
});

// Restore small, historically recognizable landforms that disappear at the
// globe bake's resolution. This tile extends Salento east from the connected
// Italian landmass, giving the peninsula its characteristic heel.
export const MANUAL_LAND_TILE_OVERRIDES_BY_SUBDIVISIONS = Object.freeze({
  7: Object.freeze([
    Object.freeze({
      tileId: 98761,
      sourceTerrain: "beach",
      terrainType: "mediterranean_hot",
      elevation: -0.03629907425729602,
      landmassId: 57
    })
  ])
});

export function applyManualTerrainOverrides(earthRows, subdivisions) {
  if (!Array.isArray(earthRows)) throw new Error("Manual terrain overrides require Earth tile rows");
  const shallowWaterTileIds = MANUAL_SHALLOW_WATER_TILE_IDS_BY_SUBDIVISIONS[subdivisions] || [];
  const seasonalSeaTileIds = MANUAL_SEASONAL_SEA_TILE_IDS_BY_SUBDIVISIONS[subdivisions] || [];
  const landOverrides = MANUAL_LAND_TILE_OVERRIDES_BY_SUBDIVISIONS[subdivisions] || [];
  if (
    shallowWaterTileIds.length === 0 &&
    seasonalSeaTileIds.length === 0 &&
    landOverrides.length === 0
  ) return earthRows;

  const correctedRows = earthRows.slice();
  for (const tileId of shallowWaterTileIds) {
    const source = manualTerrainSource(earthRows, tileId, "terrain override");
    const { h: _hill, l: _lake, m: _landmass, ...shared } = source;
    correctedRows[tileId] = {
      ...shared,
      t: "beach",
      e: SHALLOW_WATER_ELEVATION,
      o: 1
    };
  }
  for (const tileId of seasonalSeaTileIds) {
    const source = manualTerrainSource(earthRows, tileId, "seasonal-sea");
    if (source.t !== "ice") {
      throw new Error(`Manual seasonal-sea tile ${tileId} is ${source.t}, expected permanent ice`);
    }
    const { h: _hill, l: _lake, m: _landmass, ...shared } = source;
    correctedRows[tileId] = { ...shared, t: "water", o: 1 };
  }
  for (const override of landOverrides) {
    const source = manualTerrainSource(earthRows, override.tileId, "land");
    if (source.t !== override.sourceTerrain) {
      throw new Error(
        `Manual land tile ${override.tileId} is ${source.t}, expected ${override.sourceTerrain}`
      );
    }
    const { h: _hill, l: _lake, m: _landmass, o: _ocean, ...shared } = source;
    correctedRows[override.tileId] = {
      ...shared,
      t: override.terrainType,
      e: override.elevation,
      m: override.landmassId
    };
  }
  return correctedRows;
}

function manualTerrainSource(earthRows, tileId, kind) {
  const source = earthRows[tileId];
  if (!source || source.id !== tileId) {
    throw new Error(`Manual ${kind} tile ${tileId} does not match the Earth cache`);
  }
  return source;
}

export function assertManualShallowWaterReachesOcean(reachableNavigationMask, subdivisions) {
  if (!reachableNavigationMask || typeof reachableNavigationMask.length !== "number") {
    throw new Error("Manual shallow-water validation requires a navigation mask");
  }
  const tileIds = [
    ...(MANUAL_SHALLOW_WATER_TILE_IDS_BY_SUBDIVISIONS[subdivisions] || []),
    ...(MANUAL_SEASONAL_SEA_TILE_IDS_BY_SUBDIVISIONS[subdivisions] || [])
  ];
  for (const tileId of tileIds) {
    if (reachableNavigationMask[tileId] !== 1) {
      throw new Error(`Manual shallow-water tile ${tileId} is isolated from the ocean`);
    }
  }
}
