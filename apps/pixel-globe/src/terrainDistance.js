// Geodesic neighbor lengths vary slightly with latitude and mesh orientation.
// These broad gameplay bands use nominal path kilometres, not survey distances.
// A subdivision-7 step is approximately 60 km; each subdivision halves it.
export function terrainStepDistanceKm(subdivisions) {
  if (!Number.isInteger(subdivisions) || subdivisions < 0 || subdivisions > 8) {
    throw new Error(`Invalid terrain distance subdivision: ${subdivisions}`);
  }
  return 60 * 2 ** (7 - subdivisions);
}

export function coastalWaterBands({ neighbors, oceanMask, subdivisions, bandCount = 4, bandWidthKm = 60 }) {
  const stepKm = terrainStepDistanceKm(subdivisions);
  if (!Number.isInteger(bandCount) || bandCount < 1 || bandCount > 254 ||
      !Number.isFinite(bandWidthKm) || bandWidthKm <= 0 || neighbors.length !== oceanMask.length) {
    throw new Error("Coastal shading requires matching topology and positive distance bands");
  }
  const distancesKm = new Float64Array(neighbors.length).fill(Infinity);
  const queue = [];
  for (let id = 0; id < neighbors.length; id++) {
    if (oceanMask[id] && neighbors[id].some((neighbor) => !oceanMask[neighbor])) {
      distancesKm[id] = stepKm;
      queue.push(id);
    }
  }
  for (let head = 0; head < queue.length; head++) {
    const id = queue[head];
    const nextKm = distancesKm[id] + stepKm;
    if (nextKm > bandCount * bandWidthKm) continue;
    for (const neighbor of neighbors[id]) {
      if (!oceanMask[neighbor] || distancesKm[neighbor] <= nextKm) continue;
      distancesKm[neighbor] = nextKm;
      queue.push(neighbor);
    }
  }
  return Uint8Array.from(distancesKm, (distanceKm) =>
    Math.min(bandCount + 1, Math.ceil(distanceKm / bandWidthKm)));
}
