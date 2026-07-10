import { findNearestTileId } from "./geodesic.js";

export const GREAT_PYRAMID_DISCOVERY_ID = "landmark-great-pyramid";
export const LAKE_VICTORIA_DISCOVERY_ID = "landmark-lake-victoria";
export const CIRCUMNAVIGATION_DISCOVERY_ID = "achievement-circumnavigation";

const WORLD_DISCOVERY_SPECS = Object.freeze([
  {
    id: GREAT_PYRAMID_DISCOVERY_ID,
    kind: "landmark",
    displayName: "The Great Pyramid",
    notice: "You have discovered the Great Pyramid",
    detail: "Giza",
    lat: 29.9792,
    lon: 31.1342,
    radiusPx: 78,
    spriteKey: "egyptian_pyramid"
  },
  {
    id: LAKE_VICTORIA_DISCOVERY_ID,
    kind: "landmark",
    displayName: "Lake Victoria",
    notice: "You have discovered Lake Victoria",
    detail: "Africa's great lake",
    lat: -1.0,
    lon: 33.0,
    radiusPx: 120,
    spriteKey: null
  }
]);

export const CIRCUMNAVIGATION_DISCOVERY = Object.freeze({
  id: CIRCUMNAVIGATION_DISCOVERY_ID,
  kind: "achievement",
  displayName: "Circumnavigated the Globe",
  notice: "You have circumnavigated the globe",
  detail: "A full voyage around the world"
});

export function buildWorldDiscoveries(graph, directionIndex, placement) {
  if (!graph || !directionIndex) throw new Error("Cannot place world discoveries without a geodesic graph");
  return WORLD_DISCOVERY_SPECS.map((spec) => {
    const direction = latLonToDirection(spec.lat, spec.lon);
    const tileId = findNearestTileId(graph, directionIndex, direction);
    const spriteTileId = spec.spriteKey
      ? findDedicatedLandmarkTile(spec, tileId, graph, placement)
      : null;
    return Object.freeze({
      ...spec,
      direction,
      tileId,
      spriteTileId
    });
  });
}

function findDedicatedLandmarkTile(spec, originTileId, graph, placement) {
  validateLandmarkPlacement(graph, placement);
  const cityTileIds = new Set(placement.cityTileIds);
  const riverTileIds = new Set();
  for (let tileId = 0; tileId < graph.tileCount; tileId++) {
    if (placement.riverMasks[tileId] || placement.riverToWaterMasks[tileId]) riverTileIds.add(tileId);
  }

  const seen = new Set([originTileId]);
  let frontier = [originTileId];
  while (frontier.length > 0) {
    const eligible = frontier.filter((tileId) =>
      placement.landMask[tileId] &&
      longitudeDelta(graph.lonDeg[tileId], spec.lon) < 0 &&
      !tileOrNeighborsIntersect(tileId, graph, cityTileIds) &&
      !tileOrNeighborsIntersect(tileId, graph, riverTileIds)
    );
    if (eligible.length > 0) {
      eligible.sort((a, b) => landmarkTileScore(a, spec, graph) - landmarkTileScore(b, spec, graph) || a - b);
      return eligible[0];
    }

    const next = [];
    for (const tileId of frontier) {
      for (const neighborId of graph.neighbors[tileId]) {
        if (seen.has(neighborId)) continue;
        seen.add(neighborId);
        next.push(neighborId);
      }
    }
    frontier = next;
  }
  throw new Error(`Could not find a dedicated land hex for ${spec.displayName}`);
}

function validateLandmarkPlacement(graph, placement) {
  if (!placement) throw new Error("World discovery sprites require dedicated-hex placement data");
  for (const key of ["landMask", "riverMasks", "riverToWaterMasks"]) {
    if (!placement[key] || placement[key].length !== graph.tileCount) {
      throw new Error(`World discovery placement requires a complete ${key}`);
    }
  }
  if (!placement.cityTileIds || typeof placement.cityTileIds[Symbol.iterator] !== "function") {
    throw new Error("World discovery placement requires city tile ids");
  }
}

function tileOrNeighborsIntersect(tileId, graph, blockedTileIds) {
  if (blockedTileIds.has(tileId)) return true;
  return graph.neighbors[tileId].some((neighborId) => blockedTileIds.has(neighborId));
}

function landmarkTileScore(tileId, spec, graph) {
  const latDifference = Math.abs(graph.latDeg[tileId] - spec.lat);
  const lonDifference = Math.abs(longitudeDelta(graph.lonDeg[tileId], spec.lon));
  return latDifference + lonDifference;
}

function longitudeDelta(lon, originLon) {
  return ((lon - originLon + 540) % 360) - 180;
}

export function restrictMountainsToNavigableView(registry, graph, navigableMask, maxDistanceRad) {
  if (!registry || !Array.isArray(registry.famous)) throw new Error("Missing mountain landmark registry");
  if (!graph || !navigableMask || navigableMask.length !== graph.tileCount) {
    throw new Error("Mountain navigation filter requires a complete navigation mask");
  }
  if (!Number.isFinite(maxDistanceRad) || maxDistanceRad <= 0) {
    throw new Error(`Invalid mountain viewing distance: ${maxDistanceRad}`);
  }

  const accessible = registry.famous.filter((mountain) =>
    mountainIsAccessibleFromNavigation(mountain.tileId, graph, navigableMask, maxDistanceRad)
  );
  const famousByTileId = new Map(accessible.map((mountain) => [mountain.tileId, mountain]));
  return {
    ...registry,
    famous: accessible,
    famousByTileId,
    inaccessibleFamous: registry.famous.filter((mountain) => !famousByTileId.has(mountain.tileId))
  };
}

export function mountainIsAccessibleFromNavigation(tileId, graph, navigableMask, maxDistanceRad) {
  if (!Number.isInteger(tileId) || tileId < 0 || tileId >= graph.tileCount) {
    throw new Error(`Invalid mountain tile: ${tileId}`);
  }
  const approximateTileSpacing = Math.sqrt(4 * Math.PI / graph.tileCount);
  const maxSteps = Math.ceil(maxDistanceRad / approximateTileSpacing) + 3;
  const minimumDot = Math.cos(maxDistanceRad);
  const startOffset = tileId * 3;
  const startX = graph.centers[startOffset];
  const startY = graph.centers[startOffset + 1];
  const startZ = graph.centers[startOffset + 2];
  const seen = new Set([tileId]);
  const queue = [{ tileId, depth: 0 }];

  for (let index = 0; index < queue.length; index++) {
    const current = queue[index];
    const offset = current.tileId * 3;
    const dot = startX * graph.centers[offset] +
      startY * graph.centers[offset + 1] +
      startZ * graph.centers[offset + 2];
    if (navigableMask[current.tileId] && dot >= minimumDot) return true;
    if (current.depth >= maxSteps) continue;
    for (const neighborId of graph.neighbors[current.tileId]) {
      if (seen.has(neighborId)) continue;
      seen.add(neighborId);
      queue.push({ tileId: neighborId, depth: current.depth + 1 });
    }
  }
  return false;
}

export function mountainDiscovery(mountain) {
  return {
    id: mountain.id,
    kind: "mountain",
    displayName: mountain.displayName,
    notice: `You have discovered ${mountain.displayName}`,
    detail: `${Math.round(mountain.elevationM).toLocaleString("en-US")} m`,
    tileId: mountain.tileId,
    radiusPx: 120
  };
}

function latLonToDirection(latDeg, lonDeg) {
  const lat = latDeg * Math.PI / 180;
  const lon = lonDeg * Math.PI / 180;
  const cosLat = Math.cos(lat);
  return [cosLat * Math.cos(lon), Math.sin(lat), -cosLat * Math.sin(lon)];
}
