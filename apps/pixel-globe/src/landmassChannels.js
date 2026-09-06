import { isWaterSurfaceRow, terrainRowsNeedLandmassChannel } from "./terrainSurface.js";

// Narrow island channels are drawn between land hexes. Their water belongs to
// an adjacent sea/lake or to an actual river, including wholly inland islands.
export function landmassChannelNavigationAnchor({ graph, earthRows, riverMasks, a, b }) {
  if (!graph.neighbors[a]?.includes(b) || !terrainRowsNeedLandmassChannel(earthRows[a], earthRows[b])) {
    throw new Error(`Invalid landmass channel endpoints: ${a}:${b}`);
  }
  if (!riverMasks || riverMasks.length !== graph.tileCount) {
    throw new Error("Landmass channels require complete river masks");
  }
  const candidates = [...new Set([a, b, ...graph.neighbors[a], ...graph.neighbors[b]])];
  const surfaceIds = candidates.filter((id) => isWaterSurfaceRow(earthRows[id]));
  const kind = surfaceIds.length > 0 ? "surface" : "river";
  const waterIds = kind === "surface" ? surfaceIds : candidates.filter((id) => riverMasks[id] !== 0);
  if (waterIds.length === 0) throw new Error(`Landmass channel ${a}:${b} has no adjacent surface water or river`);
  // Geographic selection is stable while the screen layout stretches and moves.
  const midpoint = [0, 1, 2].map((axis) => graph.centers[a * 3 + axis] + graph.centers[b * 3 + axis]);
  const proximity = (id) => midpoint.reduce((sum, value, axis) => sum + value * graph.centers[id * 3 + axis], 0);
  waterIds.sort((left, right) => proximity(right) - proximity(left) || left - right);
  return { tileId: waterIds[0], kind };
}
