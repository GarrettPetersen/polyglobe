// Approximate footprint on the equal-area game grid. This is cartographic
// simplification eligibility, never permission to delete a gameplay location.
export const MIN_SUBSTANTIAL_ISLAND_AREA_KM2 = 1200;
export const MAX_NEARBY_LANDMASS_DISTANCE_KM = 75;

export function islandRetentionReason({ areaKm2, distanceToLargerLandmassKm, gameplaySiteIds }) {
  if (!Number.isFinite(areaKm2) || areaKm2 <= 0 ||
      !(distanceToLargerLandmassKm === null || (Number.isFinite(distanceToLargerLandmassKm) && distanceToLargerLandmassKm >= 0)) ||
      !Array.isArray(gameplaySiteIds) || gameplaySiteIds.some((id) => typeof id !== "string" || id.length === 0)) {
    throw new Error("Island retention requires area, distance in km, and canonical gameplay site IDs");
  }
  if (gameplaySiteIds.length) return "gameplay-site";
  if (areaKm2 >= MIN_SUBSTANTIAL_ISLAND_AREA_KM2) return "substantial-landmass";
  if (distanceToLargerLandmassKm === null || distanceToLargerLandmassKm > MAX_NEARBY_LANDMASS_DISTANCE_KM) {
    return "isolated-landfall";
  }
  return null;
}
