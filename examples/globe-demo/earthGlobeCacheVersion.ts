/**
 * Bump when land/water rules or inputs change so the demo refetches or you regenerate cache:
 * earth-region-grid.bin, lakes/marine GeoJSON, strait tile IDs, river scalerank/filter,
 * mountains.json, koppen.bin / elevation.bin, river rules, or buildTerrainFromEarthRaster options.
 *
 * Cache files are per subdivision: `public/earth-globe-cache-{n}.json` (and legacy `earth-globe-cache.json` for n=6).
 */
/** Highest subdivision the demo UI and cache builder support (geodesic tile count grows as ~4^n). */
export const MAX_EARTH_GLOBE_SUBDIVISIONS = 7;

/**
 * Strait tiles forced to water in `resolveLandWaterByRegions` — **only valid at geodesic subdivisions === 6**.
 * Do not pass at other scales (tile IDs are different).
 */
export const EARTH_STRAIT_TILE_IDS_SUBDIVISION_6 = [
  40361, 24757, 4129, 25328,
] as const;

export const EARTH_GLOBE_CACHE_VERSION = "v19";

/** Legacy cache JSON used version "6-v17" before per-subdivision filenames. */
export const EARTH_GLOBE_CACHE_LEGACY_VERSIONS = ["6-v17"] as const;

export function isEarthGlobeCacheVersionOk(
  fileVersion: string,
  requestedSubdivisions: number,
): boolean {
  if (fileVersion === EARTH_GLOBE_CACHE_VERSION) return true;
  if (
    requestedSubdivisions === 6 &&
    EARTH_GLOBE_CACHE_LEGACY_VERSIONS.includes(
      fileVersion as (typeof EARTH_GLOBE_CACHE_LEGACY_VERSIONS)[number],
    )
  ) {
    return true;
  }
  return false;
}
