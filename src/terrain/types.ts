/**
 * Terrain types and elevation for globe tiles.
 */

export type TerrainType =
  | "water"
  | "land"
  | "mountain"
  | "desert"
  | "snow"
  | "ice"
  | "forest"
  | "grassland"
  | "swamp"
  | "beach";

export interface TileTerrain {
  tileId: number;
  type: TerrainType;
  /** Elevation multiplier at tile center (0 = sea level, 1 = full scale). */
  elevation: number;
}

export const DEFAULT_TERRAIN: TileTerrain["type"] = "water";
