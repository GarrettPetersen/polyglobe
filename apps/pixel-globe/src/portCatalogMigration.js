import {
  orphanedSubdivisionSevenPortTileIds,
  subdivisionSevenPortMigrationForWorld
} from "./subdivisionSevenPortMigration.js";

export const PORT_CATALOG_VERSION = 3;
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
const UNVERSIONED_PORT_TILE_IDS = new Map([
  ...PRE_NORTH_MALUKU_PORT_TILE_IDS,
  ...PRE_RIVER_OUTLET_PORT_TILE_IDS
]);

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
  return payload.portCatalogVersion < 3 ? PRE_RIVER_OUTLET_PORT_TILE_IDS : null;
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
