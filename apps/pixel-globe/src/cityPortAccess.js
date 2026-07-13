export const CITY_PORT_ACCESS_RING_DISTANCE = 1;

export function cityIsLandlocked(options) {
  return !cityHasPortAccess(options);
}

export function cityHasPortAccess(options) {
  return cityPortAccessRingDistance(options) <= CITY_PORT_ACCESS_RING_DISTANCE;
}

export function cityPortAccessRingDistance({
  graph,
  earthRows,
  reachableNavigationMask,
  riverMasks,
  tileId
}) {
  if (!graph?.neighbors || !earthRows || !reachableNavigationMask || !riverMasks) {
    throw new Error("City port access requires graph, terrain, navigation, and river data");
  }
  if (!Number.isInteger(tileId) || tileId < 0 || tileId >= graph.neighbors.length) {
    throw new Error(`Invalid city tile for port access: ${tileId}`);
  }

  const visited = new Set([tileId]);
  const queue = [{ tileId, distance: 0 }];

  for (let head = 0; head < queue.length; head++) {
    const current = queue[head];
    if (isCityPortAccessTile({
      earthRows,
      reachableNavigationMask,
      riverMasks,
      tileId: current.tileId
    })) {
      return current.distance;
    }
    if (current.distance >= CITY_PORT_ACCESS_RING_DISTANCE) continue;

    for (const neighborId of graph.neighbors[current.tileId] || []) {
      if (visited.has(neighborId)) continue;
      visited.add(neighborId);
      queue.push({ tileId: neighborId, distance: current.distance + 1 });
    }
  }
  return Infinity;
}

export function isCityPortAccessTile({
  earthRows,
  reachableNavigationMask,
  riverMasks,
  tileId
}) {
  if (!reachableNavigationMask[tileId]) return false;
  const terrainType = earthRows[tileId]?.t || "";
  const isWaterSurface = terrainType === "water" || terrainType === "lake" || terrainType === "beach";
  return isWaterSurface || (riverMasks[tileId] || 0) !== 0;
}
