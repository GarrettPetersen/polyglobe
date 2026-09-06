import {
  orphanedSubdivisionSevenPortTileIds,
  subdivisionSevenPortMigrationForWorld
} from "./subdivisionSevenPortMigration.js";

export const PORT_CATALOG_VERSION = 5;
const EARLIEST_SUPPORTED_PORT_CATALOG_VERSION = 1;

// The first subdivision-eight release placed North Maluku's three ports on an
// overlarge shared landmass. These one-time mappings preserve saves made before
// the authored Ternate, Tidore, and Makian islands were separated. Tile 366350
// is deliberately both old Makian and current Tidore, so the save's catalog
// version must select this migration before ordinary current-tile lookup.
export const PRE_NORTH_MALUKU_PORT_TILE_IDS = new Map([
  [23005, 366292],
  [366276, 366350],
  [366350, 366359]
]);

// Restoring the Parana's outlet lets Asuncion occupy the Paraguay River again,
// instead of the Brazilian coast chosen by the former nearest-port search.
export const PRE_RIVER_OUTLET_PORT_TILE_IDS = new Map([[431742, 430596]]);
// Dienne's erroneous Senegal location becomes Djenné on the Bani in Mali.
// Only its spatial reference changes; the canonical city ID is retained.
export const PRE_DJENNE_CORRECTION_TILE_IDS = new Map([[636087, 162642]]);
// Reviewed geography v5: preserve canonical destinations and explicit inland gateways.
export const PRE_GEOGRAPHY_REVIEW_PORT_TILE_IDS = new Map([
  [24932, 99402], // bakhchiserai|ukraine
  [392993, 98411], // berlin|germany
  [624685, 156249], // bhimavaram|india
  [644084, 644072], // cologne|germany
  [393189, 393304], // copenhagen|denmark
  [155459, 621479], // diu|india
  [262268, 262000], // edo|japan
  [220059, 220062], // gavle|sweden
  [644622, 161189], // gent|belgium
  [383664, 96083], // gresik|indonesia
  [393048, 392979], // hannover|germany
  [408402, 408401], // hormuz|iran
  [98463, 393227], // kalmar|sweden
  [221509, 55605], // kazan|russian federation
  [222038, 55605], // kholmogory|russian federation
  [124740, 497864], // kilwa|tanzania
  [262514, 262516], // kyoto|japan
  [392449, 392535], // leipzig|germany
  [393038, 24688], // lubeck|germany
  [392420, 392432], // nurnberg|germany
  [298952, 298683], // philadelphia|united states of america
  [2459, 624802], // rajahmundry|india
  [294247, 294245], // roanoke|united states of america
  [98455, 393294], // roskilde|denmark
  [16479, 262453], // sakai|japan
  [65382, 261380], // seoul|republic of korea
  [392686, 98335], // soderkoping|sweden
  [161056, 160882], // soest|germany
  [6430, 406360], // suez|egypt
  [643413, 160888], // utrecht|netherlands
  [160923, 643564], // york|united kingdom
]);
const UNVERSIONED_PORT_TILE_IDS = composePortTileMigrations(new Map([
  ...PRE_NORTH_MALUKU_PORT_TILE_IDS,
  ...PRE_RIVER_OUTLET_PORT_TILE_IDS,
  ...PRE_DJENNE_CORRECTION_TILE_IDS
]), PRE_GEOGRAPHY_REVIEW_PORT_TILE_IDS);

export function sameTopologyPortMigrationForSavedVoyage(payload, {
  savedSubdivisions,
  currentSubdivisions
}) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Saved voyage payload is missing");
  }
  if (savedSubdivisions !== currentSubdivisions) return null;
  if (savedSubdivisions !== 8) {
    throw new Error(
      `No same-topology port catalog migration exists for subdivision ${savedSubdivisions}`
    );
  }
  if (payload.portCatalogVersion === undefined) {
    return UNVERSIONED_PORT_TILE_IDS;
  }
  if (!Number.isInteger(payload.portCatalogVersion) ||
      payload.portCatalogVersion < EARLIEST_SUPPORTED_PORT_CATALOG_VERSION ||
      payload.portCatalogVersion > PORT_CATALOG_VERSION) {
    throw new Error(
      `Saved voyage port catalog version ${payload.portCatalogVersion} cannot load into ` +
        `${PORT_CATALOG_VERSION}`
    );
  }
  if (payload.portCatalogVersion === PORT_CATALOG_VERSION) return null;
  return composePortTileMigrations(new Map([
    ...(payload.portCatalogVersion < 3 ? PRE_RIVER_OUTLET_PORT_TILE_IDS : []),
    ...(payload.portCatalogVersion < 4 ? PRE_DJENNE_CORRECTION_TILE_IDS : [])
  ]), PRE_GEOGRAPHY_REVIEW_PORT_TILE_IDS);
}

export function portReferenceMigrationForSavedVoyage(payload, topology, currentPlacements) {
  const topologyMigration = subdivisionSevenPortMigrationForWorld(topology);
  const catalogMigration = sameTopologyPortMigrationForSavedVoyage(payload, topology);
  if (topologyMigration && catalogMigration) {
    throw new Error("Saved voyage selected conflicting port migrations");
  }
  const migration = orphanedSubdivisionSevenPortTileIds(currentPlacements);
  for (const [savedTileId, currentTileId] of topologyMigration || catalogMigration || []) {
    migration.set(savedTileId, currentTileId);
  }
  return migration.size > 0 ? migration : null;
}

function composePortTileMigrations(earlier, later) {
  const composed = new Map(later);
  for (const [savedTileId, intermediateTileId] of earlier) {
    composed.set(savedTileId, later.get(intermediateTileId) ?? intermediateTileId);
  }
  return composed;
}
