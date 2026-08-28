import { SUBDIVISION_EIGHT_MAP_DATA } from "./subdivisionEightMapData.js";
import { requiredSubdivisionMapData } from "./mapCorrectionData.js";

const SHALLOW_WATER_ELEVATION = -0.20500000000000002;
const LAKE_MALAWI_ELEVATION = -0.0369949146978479;

export const MANUAL_SHALLOW_WATER_TILE_IDS_BY_SUBDIVISIONS = Object.freeze({
  7: Object.freeze([
    38891, // Gulf of Khambhat at Cambay's historical harbor.
    38903, // Outlet from the inner gulf to the existing Arabian Sea coast.
    98867, // Western Gulf of Corinth, opening from the Gulf of Patras.
    24803, // Central Gulf of Corinth.
    98890, // Eastern Gulf of Corinth, stopping west of the historical isthmus.
    88775, // Cook Strait between New Zealand's North and South Islands.
    31618, // Mozambique's southwest island channel.
    125890, // Mozambique's northwest island channel.
    125896 // Mozambique's northeast island channel.
  ]),
  8: SUBDIVISION_EIGHT_MAP_DATA.shallowWaterTileIds
});

// Lake Malawi is narrower than a subdivision-seven hex in places. The base
// terrain bake leaves three false land barriers across its centerline even
// though its southern outlet correctly joins the Shire River.
export const MANUAL_LAKE_TILE_OVERRIDES_BY_SUBDIVISIONS = Object.freeze({
  7: Object.freeze([
    Object.freeze({ tileId: 124778, sourceTerrain: "humid_subtropical" }),
    Object.freeze({ tileId: 7886, sourceTerrain: "humid_subtropical" }),
    Object.freeze({ tileId: 31571, sourceTerrain: "subtropical_highland" })
  ]),
  8: SUBDIVISION_EIGHT_MAP_DATA.lakeOverrides
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
    // Okinawa (Naha). The base bake misclassifies the island's southwest tile
    // as a lake while retaining the northeast tile as landmass 555.
    Object.freeze({
      tileId: 64993,
      sourceTerrain: "lake",
      terrainType: "humid_subtropical_hot",
      elevation: -0.03,
      landmassId: 555
    }),
    // Tsushima (Fuchu). Its southern settlement tile belongs to the same
    // island as the surviving northern land tile in the base bake.
    Object.freeze({
      tileId: 65413,
      sourceTerrain: "lake",
      terrainType: "humid_subtropical_hot",
      elevation: -0.03,
      landmassId: 504
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
    // Rapa Nui village
    Object.freeze({
      tileId: 141773,
      sourceTerrain: "water",
      terrainType: "tropical_savanna",
      elevation: -0.02,
      landmassId: 1281
    }),
    // Eastern Rapa Nui, separating the village from the monument grounds.
    Object.freeze({
      tileId: 141771,
      sourceTerrain: "water",
      terrainType: "tropical_savanna",
      elevation: -0.024,
      landmassId: 1281
    }),
    // The Moai grounds on Rapa Nui's eastern end.
    Object.freeze({
      tileId: 8932,
      sourceTerrain: "water",
      terrainType: "tropical_savanna",
      elevation: -0.026,
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
    }),
    // Corsica (Bastia)
    Object.freeze({
      tileId: 162196,
      sourceTerrain: "lake",
      terrainType: "mediterranean_hot",
      elevation: -0.03,
      landmassId: 414
    }),
    // Malta (Birgu)
    Object.freeze({
      tileId: 161924,
      sourceTerrain: "lake",
      terrainType: "mediterranean_hot",
      elevation: -0.03,
      landmassId: 1286
    }),
    // Corfu (Kerkira)
    Object.freeze({
      tileId: 98751,
      sourceTerrain: "beach",
      terrainType: "mediterranean_hot",
      elevation: -0.03,
      landmassId: 1287
    }),
    // Madeira (Funchal)
    Object.freeze({
      tileId: 161303,
      sourceTerrain: "water",
      terrainType: "mediterranean_warm",
      elevation: -0.03,
      landmassId: 1288
    }),
    // Terceira (Angra)
    Object.freeze({
      tileId: 72876,
      sourceTerrain: "beach",
      terrainType: "mediterranean_warm",
      elevation: -0.03,
      landmassId: 441
    }),
    // Gran Canaria (Las Palmas)
    Object.freeze({
      tileId: 163196,
      sourceTerrain: "beach",
      terrainType: "cold_desert",
      elevation: -0.03,
      landmassId: 548
    }),
    // Santiago, Cape Verde (Ribeira Grande)
    Object.freeze({
      tileId: 159153,
      sourceTerrain: "beach",
      terrainType: "hot_desert",
      elevation: -0.03,
      landmassId: 688
    }),
    // Sao Tome
    Object.freeze({
      tileId: 160114,
      sourceTerrain: "beach",
      terrainType: "tropical_rainforest",
      elevation: -0.03,
      landmassId: 850
    }),
    // Male
    Object.freeze({
      tileId: 39426,
      sourceTerrain: "water",
      terrainType: "tropical_rainforest",
      elevation: -0.03,
      landmassId: 1289
    }),
    // Zanzibar
    Object.freeze({
      tileId: 124671,
      sourceTerrain: "beach",
      terrainType: "tropical_savanna",
      elevation: -0.03,
      landmassId: 1290
    }),
    // Cocos Island
    Object.freeze({
      tileId: 34387,
      sourceTerrain: "water",
      terrainType: "tropical_rainforest",
      elevation: -0.015,
      landmassId: 1291
    }),
    // Juan Fernandez Islands
    Object.freeze({
      tileId: 106244,
      sourceTerrain: "water",
      terrainType: "mediterranean_warm",
      elevation: -0.015,
      landmassId: 1292
    }),
    // Raoul Island, Kermadec Islands
    Object.freeze({
      tileId: 89845,
      sourceTerrain: "water",
      terrainType: "humid_subtropical",
      elevation: -0.02,
      landmassId: 1293
    }),
    // Norfolk Island
    Object.freeze({
      tileId: 89294,
      sourceTerrain: "water",
      terrainType: "humid_subtropical",
      elevation: -0.02,
      landmassId: 1294
    }),
    // Lord Howe Island
    Object.freeze({
      tileId: 147600,
      sourceTerrain: "lake",
      terrainType: "humid_subtropical",
      elevation: -0.018,
      landmassId: 1295
    }),
    // Pitcairn Island
    Object.freeze({
      tileId: 144889,
      sourceTerrain: "water",
      terrainType: "tropical_rainforest",
      elevation: -0.015,
      landmassId: 1296
    }),
    // Mangareva
    Object.freeze({
      tileId: 143707,
      sourceTerrain: "water",
      terrainType: "tropical_rainforest",
      elevation: -0.02,
      landmassId: 1297
    }),
    // Tubuai
    Object.freeze({
      tileId: 143441,
      sourceTerrain: "water",
      terrainType: "tropical_rainforest",
      elevation: -0.025,
      landmassId: 1298
    }),
    // Babeldaob, Palau
    Object.freeze({
      tileId: 22966,
      sourceTerrain: "lake",
      terrainType: "tropical_rainforest",
      elevation: -0.025,
      landmassId: 1299
    }),
    // Yap
    Object.freeze({
      tileId: 15782,
      sourceTerrain: "lake",
      terrainType: "tropical_rainforest",
      elevation: -0.03,
      landmassId: 1300
    }),
    // Chuuk
    Object.freeze({
      tileId: 16921,
      sourceTerrain: "water",
      terrainType: "tropical_rainforest",
      elevation: -0.025,
      landmassId: 1301
    }),
    // Pohnpei
    Object.freeze({
      tileId: 67580,
      sourceTerrain: "water",
      terrainType: "tropical_rainforest",
      elevation: -0.015,
      landmassId: 1302
    }),
    // Kosrae
    Object.freeze({
      tileId: 68532,
      sourceTerrain: "water",
      terrainType: "tropical_rainforest",
      elevation: -0.015,
      landmassId: 1303
    }),
    // Majuro
    Object.freeze({
      tileId: 67971,
      sourceTerrain: "water",
      terrainType: "tropical_rainforest",
      elevation: -0.042,
      landmassId: 1304
    }),
    // Nauru
    Object.freeze({
      tileId: 86665,
      sourceTerrain: "water",
      terrainType: "tropical_savanna",
      elevation: -0.03,
      landmassId: 1305
    }),
    // Banaba
    Object.freeze({
      tileId: 21751,
      sourceTerrain: "water",
      terrainType: "tropical_savanna",
      elevation: -0.03,
      landmassId: 1306
    }),
    // Rotuma
    Object.freeze({
      tileId: 22330,
      sourceTerrain: "water",
      terrainType: "tropical_rainforest",
      elevation: -0.02,
      landmassId: 1307
    }),
    // Uvea, Wallis Islands
    Object.freeze({
      tileId: 5632,
      sourceTerrain: "water",
      terrainType: "tropical_rainforest",
      elevation: -0.03,
      landmassId: 1308
    }),
    // Futuna
    Object.freeze({
      tileId: 22362,
      sourceTerrain: "water",
      terrainType: "tropical_rainforest",
      elevation: -0.02,
      landmassId: 1309
    }),
    // Funafuti
    Object.freeze({
      tileId: 22375,
      sourceTerrain: "water",
      terrainType: "tropical_rainforest",
      elevation: -0.042,
      landmassId: 1310
    }),
    // Tokelau
    Object.freeze({
      tileId: 84770,
      sourceTerrain: "water",
      terrainType: "tropical_rainforest",
      elevation: -0.042,
      landmassId: 1311
    }),
    // Lifou, Loyalty Islands
    Object.freeze({
      tileId: 89494,
      sourceTerrain: "lake",
      terrainType: "tropical_savanna",
      elevation: -0.03,
      landmassId: 1312
    }),
    // Mozambique
    Object.freeze({
      tileId: 125893,
      sourceTerrain: "tropical_savanna",
      terrainType: "tropical_savanna",
      elevation: -0.042,
      landmassId: 1313
    })
  ]),
  8: SUBDIVISION_EIGHT_MAP_DATA.landOverrides
});

export function applyManualTerrainOverrides(earthRows, subdivisions) {
  if (!Array.isArray(earthRows)) throw new Error("Manual terrain overrides require Earth tile rows");
  const shallowWaterTileIds = requiredSubdivisionMapData(
    MANUAL_SHALLOW_WATER_TILE_IDS_BY_SUBDIVISIONS,
    subdivisions,
    "manual shallow-water corrections"
  );
  const lakeOverrides = requiredSubdivisionMapData(
    MANUAL_LAKE_TILE_OVERRIDES_BY_SUBDIVISIONS,
    subdivisions,
    "manual lake corrections"
  );
  const landOverrides = requiredSubdivisionMapData(
    MANUAL_LAND_TILE_OVERRIDES_BY_SUBDIVISIONS,
    subdivisions,
    "manual land corrections"
  );
  if (
    shallowWaterTileIds.length === 0 &&
    lakeOverrides.length === 0 &&
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
  for (const override of lakeOverrides) {
    const source = manualTerrainSource(earthRows, override.tileId, "lake");
    if (source.t !== override.sourceTerrain) {
      throw new Error(
        `Manual lake tile ${override.tileId} is ${source.t}, expected ${override.sourceTerrain}`
      );
    }
    const { h: _hill, l: _lake, m: _landmass, o: _ocean, ...shared } = source;
    correctedRows[override.tileId] = {
      ...shared,
      t: "lake",
      e: LAKE_MALAWI_ELEVATION,
      l: 11
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
  const tileIds = requiredSubdivisionMapData(
    MANUAL_SHALLOW_WATER_TILE_IDS_BY_SUBDIVISIONS,
    subdivisions,
    "manual shallow-water corrections"
  );
  for (const tileId of tileIds) {
    if (reachableNavigationMask[tileId] !== 1) {
      throw new Error(`Manual shallow-water tile ${tileId} is isolated from the ocean`);
    }
  }
}
