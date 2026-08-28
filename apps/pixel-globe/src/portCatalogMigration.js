export const PORT_CATALOG_VERSION = 1;

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
    return PRE_NORTH_MALUKU_PORT_TILE_IDS;
  }
  if (payload.portCatalogVersion !== PORT_CATALOG_VERSION) {
    throw new Error(
      `Saved voyage port catalog version ${payload.portCatalogVersion} cannot load into ` +
        `${PORT_CATALOG_VERSION}`
    );
  }
  return null;
}
