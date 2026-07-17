import { isWaterSurfaceRow } from "./terrainSurface.js";

export const ROAD_MOUNTAIN_ELEVATION = 0.13;

export function roadTileIsPassable(row, { namedPeak = false, hasRiver = false } = {}) {
  if (!row || typeof row !== "object") throw new Error("Road passability requires a terrain row");
  if (typeof namedPeak !== "boolean" || typeof hasRiver !== "boolean") {
    throw new Error("Road passability flags must be boolean");
  }
  const terrain = row.t || "";
  return !isWaterSurfaceRow(row) &&
    terrain !== "mountain" &&
    terrain !== "ice" &&
    !terrain.includes("ice_cap") &&
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
  if (terrain.includes("tropical") || terrain.includes("jungle")) penalty += 1.15;
  else if (terrain.includes("desert")) penalty += 0.85;
  else if (terrain.includes("steppe")) penalty += 0.45;
  else if (terrain.includes("tundra") || terrain.includes("subarctic")) penalty += 0.7;
  else if (terrain.includes("continental")) penalty += 0.25;
  else if (terrain.includes("forest")) penalty += 0.35;
  else if (terrain.includes("humid") || terrain.includes("oceanic")) penalty += 0.15;

  return penalty;
}
