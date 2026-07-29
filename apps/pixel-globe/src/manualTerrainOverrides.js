const SHALLOW_WATER_ELEVATION = -0.20500000000000002;

export const MANUAL_SHALLOW_WATER_TILE_IDS_BY_SUBDIVISIONS = Object.freeze({
  7: Object.freeze([
    38891, // Gulf of Khambhat at Cambay's historical harbor.
    38903 // Outlet from the inner gulf to the existing Arabian Sea coast.
  ])
});

// Restore small, historically recognizable landforms that disappear at the
// globe bake's resolution. Each island settlement gets its own landmass so a
// port can never be silently relocated to another island.
export const MANUAL_LAND_TILE_OVERRIDES_BY_SUBDIVISIONS = Object.freeze({
  7: Object.freeze([
    Object.freeze({
      tileId: 98761,
      sourceTerrain: "beach",
      terrainType: "mediterranean_hot",
      elevation: -0.03629907425729602,
      landmassId: 57
    }),
    // Banda Islands
    Object.freeze({
      tileId: 91800,
      sourceTerrain: "beach",
      terrainType: "tropical_rainforest",
      elevation: -0.036,
      landmassId: 1270
    }),
    // Ambon (Hitu)
    Object.freeze({
      tileId: 91677,
      sourceTerrain: "beach",
      terrainType: "tropical_rainforest",
      elevation: -0.033,
      landmassId: 1271
    }),
    // Makian
    Object.freeze({
      tileId: 91735,
      sourceTerrain: "beach",
      terrainType: "tropical_rainforest",
      elevation: -0.026,
      landmassId: 1272
    }),
    // Halmahera (Gane)
    Object.freeze({
      tileId: 91683,
      sourceTerrain: "beach",
      terrainType: "tropical_rainforest",
      elevation: -0.041,
      landmassId: 1273
    }),
    // Buru
    Object.freeze({
      tileId: 91681,
      sourceTerrain: "beach",
      terrainType: "tropical_rainforest",
      elevation: -0.025,
      landmassId: 1274
    }),
    // Cozumel (Cuzamil)
    Object.freeze({
      tileId: 136831,
      sourceTerrain: "lake",
      terrainType: "tropical_savanna",
      elevation: -0.041,
      landmassId: 1275
    }),
    // Tongatapu
    Object.freeze({
      tileId: 90267,
      sourceTerrain: "water",
      terrainType: "tropical_rainforest",
      elevation: -0.035,
      landmassId: 1276
    }),
    // Rarotonga
    Object.freeze({
      tileId: 85318,
      sourceTerrain: "water",
      terrainType: "tropical_rainforest",
      elevation: -0.02,
      landmassId: 1277
    }),
    // Niue
    Object.freeze({
      tileId: 89746,
      sourceTerrain: "water",
      terrainType: "tropical_rainforest",
      elevation: -0.03,
      landmassId: 1278
    }),
    // Rangiroa
    Object.freeze({
      tileId: 143938,
      sourceTerrain: "water",
      terrainType: "tropical_rainforest",
      elevation: -0.042,
      landmassId: 1279
    }),
    // Tarawa
    Object.freeze({
      tileId: 67709,
      sourceTerrain: "water",
      terrainType: "tropical_rainforest",
      elevation: -0.042,
      landmassId: 1280
    }),
    // Rapa Nui
    Object.freeze({
      tileId: 141773,
      sourceTerrain: "water",
      terrainType: "tropical_savanna",
      elevation: -0.02,
      landmassId: 1281
    }),
    // Guanahani
    Object.freeze({
      tileId: 34610,
      sourceTerrain: "water",
      terrainType: "tropical_savanna",
      elevation: -0.042,
      landmassId: 1282
    }),
    // Guam (Umatac)
    Object.freeze({
      tileId: 16050,
      sourceTerrain: "lake",
      terrainType: "tropical_rainforest",
      elevation: -0.02,
      landmassId: 1283
    }),
    // Mactan
    Object.freeze({
      tileId: 90803,
      sourceTerrain: "beach",
      terrainType: "tropical_monsoon",
      elevation: -0.04,
      landmassId: 1284
    }),
    // Tahuata (Vaitahu)
    Object.freeze({
      tileId: 142904,
      sourceTerrain: "water",
      terrainType: "tropical_rainforest",
      elevation: -0.015,
      landmassId: 1285
    })
  ])
});

export function applyManualTerrainOverrides(earthRows, subdivisions) {
  if (!Array.isArray(earthRows)) throw new Error("Manual terrain overrides require Earth tile rows");
  const shallowWaterTileIds = MANUAL_SHALLOW_WATER_TILE_IDS_BY_SUBDIVISIONS[subdivisions] || [];
  const landOverrides = MANUAL_LAND_TILE_OVERRIDES_BY_SUBDIVISIONS[subdivisions] || [];
  if (
    shallowWaterTileIds.length === 0 &&
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
    ...(MANUAL_SHALLOW_WATER_TILE_IDS_BY_SUBDIVISIONS[subdivisions] || [])
  ];
  for (const tileId of tileIds) {
    if (reachableNavigationMask[tileId] !== 1) {
      throw new Error(`Manual shallow-water tile ${tileId} is isolated from the ocean`);
    }
  }
}
