import { requireCityId } from "./entityIds.js";
import { SETTLEMENT_LANDMASSES } from "./settlementGeographyData.js";
import { greatCircleDistanceKm } from "./worldDistance.js";

// Roughly two subdivision-eight hexes. A missing river or coastline must be
// repaired explicitly, never by searching arbitrarily far for a usable dock.
export const MAX_SETTLEMENT_PLACEMENT_DISTANCE_KM = 45;

const landmassByCityId = new Map();
const landmassIds = new Set();
for (const landmass of SETTLEMENT_LANDMASSES) {
  if (!Number.isInteger(landmass.id) || landmass.id <= 0 || landmassIds.has(landmass.id)) {
    throw new Error(`Invalid or duplicate reviewed landmass: ${landmass.id}`);
  }
  landmassIds.add(landmass.id);
  for (const cityId of landmass.cityIds) {
    requireCityId({ cityId }, "Reviewed settlement geography");
    if (landmassByCityId.has(cityId)) throw new Error(`Duplicate settlement geography: ${cityId}`);
    landmassByCityId.set(cityId, landmass.id);
  }
}

export function reviewedSettlementLandmassId(settlement) {
  const cityId = requireCityId(settlement, "Settlement geography");
  const landmassId = landmassByCityId.get(cityId);
  if (landmassId === undefined) {
    throw new Error(`Settlement ${cityId} needs a reviewed landmass in settlementGeographyData.js`);
  }
  return landmassId;
}

export function localSettlementTiles({ graph, startId, coordinates }) {
  if (!Number.isInteger(startId) || startId < 0 || startId >= graph.tileCount) {
    throw new Error(`Invalid settlement placement origin: ${startId}`);
  }
  const seen = new Set([startId]);
  const queue = [startId];
  const candidates = [];
  for (let head = 0; head < queue.length; head++) {
    const tileId = queue[head];
    const distanceKm = greatCircleDistanceKm(coordinates, {
      lat: graph.latDeg[tileId], lon: graph.lonDeg[tileId]
    });
    if (distanceKm > MAX_SETTLEMENT_PLACEMENT_DISTANCE_KM) continue;
    candidates.push(tileId);
    for (const neighborId of graph.neighbors[tileId]) {
      if (seen.has(neighborId)) continue;
      seen.add(neighborId);
      queue.push(neighborId);
    }
  }
  // Preserve deterministic graph-ring order. Reordering equal-ring candidates
  // would needlessly move already released settlements and their save references.
  return candidates;
}
