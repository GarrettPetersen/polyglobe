import { isWaterSurfaceRow } from "./terrainSurface.js";
import { terrainBlocksRoad, terrainRoadPenalty as terrainKindRoadPenalty } from "./terrainMetadata.js";

export const ROAD_MOUNTAIN_ELEVATION = 0.13;

export function roadTileIsPassable(row, { namedPeak = false, hasRiver = false } = {}) {
  if (!row || typeof row !== "object") throw new Error("Road passability requires a terrain row");
  if (typeof namedPeak !== "boolean" || typeof hasRiver !== "boolean") {
    throw new Error("Road passability flags must be boolean");
  }
  const terrain = row.t || "";
  return !isWaterSurfaceRow(row) &&
    !terrainBlocksRoad(terrain) &&
    !namedPeak &&
    !hasRiver &&
    !(Number.isFinite(row.e) && row.e >= ROAD_MOUNTAIN_ELEVATION);
}

export function roadTerrainPenalty(row) {
  if (!row || typeof row !== "object") throw new Error("Road terrain cost requires a terrain row");
  const terrain = row.t || "";
  const elevation = Number.isFinite(row.e) ? Math.max(0, row.e) : 0;
  let penalty = 1;

  if (row.h === 1) penalty += 0.55;
  if (elevation > 0.075) penalty += 0.8;
  else if (elevation > 0.035) penalty += 0.25;
  penalty += terrainKindRoadPenalty(terrain);

  return penalty;
}
