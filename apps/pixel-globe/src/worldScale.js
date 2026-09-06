import { buildGeodesicGraph, createDirectionIndex, findNearestTileId } from "./geodesic.js";

export const WORLD_GLOBE_SUBDIVISIONS = 8;
export const WORLD_DISCRETE_WEATHER_SUBDIVISIONS = 6;
export const WORLD_RUNTIME_WEATHER_SUBDIVISIONS = 7;
export const WORLD_BASE_PIXELS_PER_RADIAN = 2450;
export const WORLD_RENDER_SCALE = 2.5;
export const WORLD_PIXELS_PER_RADIAN = WORLD_BASE_PIXELS_PER_RADIAN * WORLD_RENDER_SCALE;
export const WORLD_SHIP_SCREEN_SPEED_SCALE = 1.2;
export const WORLD_KINEMATIC_SCALE = WORLD_SHIP_SCREEN_SPEED_SCALE / WORLD_RENDER_SCALE;
export const WORLD_GAME_TIME_SCALE = 2700;
export const WORLD_LANDMARK_VIEWPORT_RADIUS_PX = 220;

export function geodesicTileCount(subdivisions) {
  if (!Number.isInteger(subdivisions) || subdivisions < 0 || subdivisions > 8) {
    throw new Error(`Invalid geodesic tile-count subdivision: ${subdivisions}`);
  }
  return 10 * 4 ** subdivisions + 2;
}

export function buildFineToCoarseTileMapping(graph, coarseSubdivisions) {
  if (!graph || !Number.isInteger(graph.tileCount) || !Number.isInteger(graph.subdivisions)) {
    throw new Error("Fine-to-coarse mapping requires a geodesic graph");
  }
  if (coarseSubdivisions >= graph.subdivisions) {
    throw new Error(
      `Fine-to-coarse mapping requires a coarser subdivision: ${graph.subdivisions}/${coarseSubdivisions}`
    );
  }
  const coarseTileCount = geodesicTileCount(coarseSubdivisions);
  if (graph.tileCount !== geodesicTileCount(graph.subdivisions) || coarseTileCount >= graph.tileCount) {
    throw new Error("Fine-to-coarse mapping received inconsistent graph tile counts");
  }
  const mapping = new Uint32Array(graph.tileCount);
  for (let tileId = 0; tileId < coarseTileCount; tileId++) mapping[tileId] = tileId;
  if (graph.subdivisions === coarseSubdivisions + 1) {
    for (let tileId = coarseTileCount; tileId < graph.tileCount; tileId++) {
      const coarseParents = [...graph.neighbors[tileId]].filter((neighborId) => neighborId < coarseTileCount);
      if (coarseParents.length !== 2) {
        throw new Error(
          `Subdivision ${graph.subdivisions} tile ${tileId} has ${coarseParents.length} coarse parents`
        );
      }
      // New vertices are exact edge midpoints, so both parents are equidistant.
      // Alternate deterministically instead of biasing all weather toward the
      // lower-numbered endpoint and creating long directional seams.
      mapping[tileId] = coarseParents[tileId & 1];
    }
    return mapping;
  }
  // A center-only prefix is not a graph: exact nearest lookup traverses the
  // coarse mesh, whose edges differ from the fine mesh's edges.
  const coarseGraph = buildGeodesicGraph(coarseSubdivisions);
  const directionIndex = createDirectionIndex(coarseGraph);
  for (let tileId = coarseTileCount; tileId < graph.tileCount; tileId++) {
    const offset = tileId * 3;
    mapping[tileId] = findNearestTileId(coarseGraph, directionIndex, [
      graph.centers[offset],
      graph.centers[offset + 1],
      graph.centers[offset + 2]
    ]);
  }
  return mapping;
}

export function expandCoarseTileMask(coarseMask, fineToCoarseTileId, outMask) {
  if (!(coarseMask instanceof Uint8Array) || !(fineToCoarseTileId instanceof Uint32Array) ||
      !(outMask instanceof Uint8Array) || outMask.length !== fineToCoarseTileId.length) {
    throw new Error("Coarse tile-mask expansion requires complete typed arrays");
  }
  for (let tileId = 0; tileId < outMask.length; tileId++) {
    const coarseTileId = fineToCoarseTileId[tileId];
    if (coarseTileId >= coarseMask.length) {
      throw new Error(`Fine tile ${tileId} maps outside coarse mask: ${coarseTileId}`);
    }
    outMask[tileId] = coarseMask[coarseTileId];
  }
  return outMask;
}
