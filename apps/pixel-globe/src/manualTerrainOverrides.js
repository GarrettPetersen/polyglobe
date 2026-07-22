const SHALLOW_WATER_ELEVATION = -0.20500000000000002;

export const MANUAL_SHALLOW_WATER_TILE_IDS_BY_SUBDIVISIONS = Object.freeze({
  7: Object.freeze([
    38891, // Gulf of Khambhat at Cambay's historical harbor.
    38903 // Outlet from the inner gulf to the existing Arabian Sea coast.
  ])
});

// The base terrain bake labels the Barents/White Sea route as permanent ice.
// Weather already supplies seasonal sea ice for these ocean tiles, so retain
// the winter closure while allowing the historical Kholmogory route to thaw.
export const MANUAL_SEASONAL_SEA_TILE_IDS_BY_SUBDIVISIONS = Object.freeze({
  7: Object.freeze([
    14116, 56276, 900, 56432, 14152, 56436, 3560, 56428, 14150,
    56425, 901, 56335, 14129, 56339, 56338, 56352, 56353
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
