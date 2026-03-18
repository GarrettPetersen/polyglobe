/**
 * Terrain types and elevation for globe tiles.
 */

/**
 * Terrain types based on Köppen-Geiger climate classification.
 * Each climate zone gets its own type for maximum game-world flexibility.
 */
export type TerrainType =
  // Water / special
  | "water"
  | "beach"
  | "mountain"
  
  // Tropical (A)
  | "tropical_rainforest"    // Af
  | "tropical_monsoon"       // Am  
  | "tropical_savanna"       // Aw
  
  // Arid (B)
  | "hot_desert"             // BWh
  | "cold_desert"            // BWk
  | "hot_steppe"             // BSh
  | "cold_steppe"            // BSk
  
  // Temperate (C)
  | "mediterranean_hot"      // Csa
  | "mediterranean_warm"     // Csb
  | "mediterranean_cold"     // Csc
  | "humid_subtropical"      // Cwa
  | "subtropical_highland"   // Cwb
  | "subtropical_highland_cold" // Cwc
  | "humid_subtropical_hot"  // Cfa
  | "oceanic"                // Cfb
  | "subpolar_oceanic"       // Cfc
  
  // Continental (D)
  | "hot_summer_continental" // Dsa
  | "warm_summer_continental" // Dsb
  | "subarctic_dry"          // Dsc
  | "subarctic_very_cold_dry" // Dsd
  | "humid_continental_hot"  // Dwa
  | "humid_continental_warm" // Dwb
  | "subarctic_dry_winter"   // Dwc
  | "subarctic_very_cold_dry_winter" // Dwd
  | "humid_continental"      // Dfa
  | "warm_summer_humid"      // Dfb
  | "subarctic"              // Dfc
  | "subarctic_very_cold"    // Dfd
  
  // Polar (E)
  | "tundra"                 // ET
  | "ice_cap"                // EF
  
  // Legacy/fallback
  | "land"
  | "desert"
  | "snow"
  | "ice"
  | "forest"
  | "grassland"
  | "swamp";

export interface TileTerrain {
  tileId: number;
  type: TerrainType;
  /** Elevation multiplier at tile center (0 = sea level, 1 = full scale). */
  elevation: number;
}

export const DEFAULT_TERRAIN: TileTerrain["type"] = "water";
