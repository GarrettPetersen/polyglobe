import { isWaterSurfaceRow } from "./terrainSurface.js";
import { greatCircleDistanceKm } from "./worldDistance.js";
import { canTraverseWorldNavigationEdge } from "./worldNavigationTopology.js";

export function riverOpeningAudit({ graph, earthRows, navigation }) {
  validateWorld(graph, earthRows);
  if (!(navigation?.riverMasks instanceof Uint8Array) || navigation.riverMasks.length !== graph.tileCount ||
      !(navigation.riverToWaterMasks instanceof Uint8Array) || navigation.riverToWaterMasks.length !== graph.tileCount) {
    throw new Error("River opening audit requires complete river masks");
  }
  const seen = new Uint8Array(graph.tileCount);
  const networksWithoutOutlet = [];
  const coastalDeadEnds = [];
  let networkCount = 0;
  let outletCount = 0;
  for (let start = 0; start < graph.tileCount; start++) {
    if (seen[start] || navigation.riverMasks[start] === 0 || isWaterSurfaceRow(earthRows[start])) continue;
    networkCount++;
    const riverTileIds = [start];
    const terminalTileIds = [];
    let networkOutlets = 0;
    seen[start] = 1;
    for (let head = 0; head < riverTileIds.length; head++) {
      const tileId = riverTileIds[head];
      let riverNeighbors = 0;
      let tileOutlets = 0;
      for (const neighborId of graph.neighbors[tileId]) {
        if (!canTraverseWorldNavigationEdge({ graph, earthRows, ...navigation, fromTileId: tileId, toTileId: neighborId })) continue;
        if (isWaterSurfaceRow(earthRows[neighborId])) { tileOutlets++; continue; }
        riverNeighbors++;
        if (seen[neighborId]) continue;
        seen[neighborId] = 1;
        riverTileIds.push(neighborId);
      }
      networkOutlets += tileOutlets;
      if (riverNeighbors > 1 || tileOutlets > 0) continue;
      terminalTileIds.push(tileId);
      const nearbyCoasts = new Map();
      const addCoast = (coastTileId, viaTileId) => {
        const row = earthRows[coastTileId];
        if ((row.t !== "beach" && row.t !== "water") || nearbyCoasts.has(coastTileId)) return;
        nearbyCoasts.set(coastTileId, { tileId: coastTileId, viaTileId });
      };
      for (const neighborId of graph.neighbors[tileId]) addCoast(neighborId, null);
      for (const neighborId of graph.neighbors[tileId]) {
        if (isWaterSurfaceRow(earthRows[neighborId])) continue;
        for (const coastTileId of graph.neighbors[neighborId]) addCoast(coastTileId, neighborId);
      }
      if (nearbyCoasts.size > 0) coastalDeadEnds.push({
        tileId, lat: graph.latDeg[tileId], lon: graph.lonDeg[tileId],
        nearbyCoasts: [...nearbyCoasts.values()].sort((a, b) => a.tileId - b.tileId)
      });
    }
    outletCount += networkOutlets;
    if (networkOutlets === 0) networksWithoutOutlet.push({
      riverTileIds: riverTileIds.sort((a, b) => a - b), terminalTileIds: terminalTileIds.sort((a, b) => a - b)
    });
  }
  return {
    networkCount, outletCount,
    coastalDeadEnds: coastalDeadEnds.sort((a, b) => a.tileId - b.tileId),
    // Includes tributary breaks and genuinely closed basins; review the source
    // river geometry before deciding whether and where an outlet belongs.
    networksWithoutOutlet: networksWithoutOutlet.sort((a, b) => b.riverTileIds.length - a.riverTileIds.length || a.riverTileIds[0] - b.riverTileIds[0])
  };
}

// Offline diagnostics only. A coastal lagoon can be intentionally enclosed, so
// these are review candidates, not instructions to carve an automatic outlet.
export function isolatedCoastalWaterRegions({ graph, earthRows }) {
  validateWorld(graph, earthRows);
  const seen = new Uint8Array(graph.tileCount);
  const candidates = [];
  for (let start = 0; start < graph.tileCount; start++) {
    if (seen[start] || !isWaterSurfaceRow(earthRows[start])) continue;
    const tileIds = [start];
    seen[start] = 1;
    let hasOpenOcean = false;
    let coastalTileCount = 0;
    for (let head = 0; head < tileIds.length; head++) {
      const tileId = tileIds[head];
      const row = earthRows[tileId];
      hasOpenOcean ||= row.t === "water";
      if (row.t === "beach" && Number.isInteger(row.o)) coastalTileCount++;
      for (const neighborId of graph.neighbors[tileId]) {
        if (seen[neighborId] || !isWaterSurfaceRow(earthRows[neighborId])) continue;
        seen[neighborId] = 1;
        tileIds.push(neighborId);
      }
    }
    if (hasOpenOcean || coastalTileCount === 0) continue;
    candidates.push({
      tileIds: tileIds.sort((a, b) => a - b),
      coastalTileCount,
      lat: graph.latDeg[start],
      lon: graph.lonDeg[start]
    });
  }
  return candidates.sort((a, b) => b.coastalTileCount - a.coastalTileCount || a.tileIds[0] - b.tileIds[0]);
}

export function connectedLandTileIds({ graph, earthRows, startTileId }) {
  validateWorld(graph, earthRows);
  if (!Number.isInteger(startTileId) || startTileId < 0 || startTileId >= graph.tileCount ||
      isWaterSurfaceRow(earthRows[startTileId])) {
    throw new Error(`Land connectivity audit requires a land tile: ${startTileId}`);
  }
  const seen = new Uint8Array(graph.tileCount);
  const tileIds = [startTileId];
  seen[startTileId] = 1;
  for (let head = 0; head < tileIds.length; head++) {
    for (const neighborId of graph.neighbors[tileIds[head]]) {
      if (seen[neighborId] || isWaterSurfaceRow(earthRows[neighborId])) continue;
      seen[neighborId] = 1;
      tileIds.push(neighborId);
    }
  }
  return tileIds.sort((a, b) => a - b);
}

export function settlementPlacementDisplacements({ graph, settlements, minimumDistanceKm = 75 }) {
  if (!Array.isArray(settlements) || !Number.isFinite(minimumDistanceKm) || minimumDistanceKm < 0) {
    throw new Error("Settlement placement audit requires settlements and a nonnegative distance in km");
  }
  return settlements.map((settlement) => {
    const { cityId, tileId } = settlement;
    if (typeof cityId !== "string" || cityId === "" || !Number.isInteger(tileId) ||
        tileId < 0 || tileId >= graph.tileCount) {
      throw new Error(`Settlement placement audit has an invalid city or tile: ${cityId}/${tileId}`);
    }
    const actual = { lat: graph.latDeg[tileId], lon: graph.lonDeg[tileId] };
    // Explicit maritime gateways are intentional. Check their authored position
    // instead of diagnosing the inland city they serve as a misplaced harbor.
    const intended = {
      lat: settlement.placementLat ?? settlement.lat,
      lon: settlement.placementLon ?? settlement.lon
    };
    return { cityId, tileId, distanceKm: greatCircleDistanceKm(intended, actual), intended, actual };
  }).filter(({ distanceKm }) => distanceKm > minimumDistanceKm)
    .sort((a, b) => b.distanceKm - a.distanceKm || a.cityId.localeCompare(b.cityId));
}

function validateWorld(graph, earthRows) {
  if (!Number.isInteger(graph?.tileCount) || !Array.isArray(earthRows) || earthRows.length !== graph.tileCount) {
    throw new Error("Geography audit requires one terrain row per graph tile");
  }
}
