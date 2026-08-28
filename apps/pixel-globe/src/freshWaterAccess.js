import { isWaterSurfaceRow } from "./terrainSurface.js";

export function buildFreshWaterSurfaceMask({
  graph,
  earthRows,
  saltwaterPassageTileIds = []
}) {
  if (!graph || !Number.isInteger(graph.tileCount) || !isGraphRowCollection(graph.neighbors)) {
    throw new Error("Fresh-water classification requires a geodesic graph");
  }
  if (!Array.isArray(earthRows) || earthRows.length !== graph.tileCount) {
    throw new Error("Fresh-water classification requires one terrain row per globe tile");
  }
  if (!Array.isArray(saltwaterPassageTileIds)) {
    throw new Error("Fresh-water classification requires saltwater passage tile ids");
  }

  const marine = new Uint8Array(graph.tileCount);
  const queue = [];
  const seedMarineTile = (tileId, source) => {
    if (!Number.isInteger(tileId) || tileId < 0 || tileId >= graph.tileCount) {
      throw new Error(`Invalid ${source} tile id: ${tileId}`);
    }
    if (!isWaterSurfaceRow(earthRows[tileId]) || marine[tileId]) return;
    marine[tileId] = 1;
    queue.push(tileId);
  };

  for (let tileId = 0; tileId < graph.tileCount; tileId++) {
    if (earthRows[tileId]?.t === "water") seedMarineTile(tileId, "ocean");
  }
  for (const tileId of saltwaterPassageTileIds) {
    seedMarineTile(tileId, "saltwater passage");
  }

  for (let head = 0; head < queue.length; head++) {
    const tileId = queue[head];
    for (const neighborId of graph.neighbors[tileId]) {
      if (marine[neighborId] || !isWaterSurfaceRow(earthRows[neighborId])) continue;
      marine[neighborId] = 1;
      queue.push(neighborId);
    }
  }

  const freshwater = new Uint8Array(graph.tileCount);
  const visited = marine.slice();
  for (let startTileId = 0; startTileId < graph.tileCount; startTileId++) {
    if (visited[startTileId] || !isWaterSurfaceRow(earthRows[startTileId])) continue;
    const component = [startTileId];
    visited[startTileId] = 1;
    let hasLakeTerrain = earthRows[startTileId]?.t === "lake";
    for (let head = 0; head < component.length; head++) {
      const tileId = component[head];
      for (const neighborId of graph.neighbors[tileId]) {
        if (visited[neighborId] || !isWaterSurfaceRow(earthRows[neighborId])) continue;
        visited[neighborId] = 1;
        hasLakeTerrain ||= earthRows[neighborId]?.t === "lake";
        component.push(neighborId);
      }
    }
    if (!hasLakeTerrain) continue;
    for (const tileId of component) freshwater[tileId] = 1;
  }
  return freshwater;
}

export function shipCanRefillFreshWater({
  navigationKind,
  waterTileId,
  frozen = false,
  freshwaterSurface = false,
  saltwaterPassageTileIds = []
}) {
  if (frozen || (navigationKind !== "river" && navigationKind !== "lake")) return false;
  if (!Number.isInteger(waterTileId) || waterTileId < 0) {
    throw new Error(`Fresh water requires a valid tile id: ${waterTileId}`);
  }
  if (navigationKind === "lake") return freshwaterSurface === true;
  return !saltwaterPassageTileIds.includes(waterTileId);
}
import { isGraphRowCollection } from "./geodesicBake.js";
