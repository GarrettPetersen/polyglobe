import { createDirectionIndex, findNearestTileId } from "./geodesic.js";
import { canTraverseWorldNavigationEdge } from "./worldNavigationTopology.js";

export const WORLD_WATERWAY_INVARIANTS = Object.freeze([
  passage("Strait of Gibraltar", [35.8, -6.2], [36.0, -5.0], [34.5, 37.5, -7.0, -3.0]),
  passage("Bosporus", [40.7, 28.7], [41.25, 29.1], [40.3, 41.6, 28.4, 29.5]),
  passage("Dardanelles", [40.05, 25.8], [40.65, 27.4], [39.5, 41.0, 25.0, 28.0]),
  passage("Strait of Hormuz", [26.3, 56.3], [25.7, 57.3], [24.5, 27.5, 55.0, 58.5]),
  passage("Bab-el-Mandeb", [12.5, 43.3], [12.5, 44.0], [11.5, 13.5, 42.5, 45.0]),
  passage("Strait of Malacca", [2.2, 101.0], [3.0, 100.0], [0.0, 6.0, 98.0, 104.0]),
  passage("Sunda Strait", [-6.0, 105.2], [-6.5, 106.0], [-8.0, -4.0, 103.5, 108.0]),
  passage("Cook Strait", [-41.2, 174.0], [-41.5, 175.0], [-43.0, -39.5, 172.0, 176.5]),
  passage("Mozambique Channel", [-19.0, 39.0], [-19.0, 42.0], [-27.0, -10.0, 32.0, 47.0]),
  passage("Lake Malawi and Shire approach", [-9.7, 34.3], [-14.3, 35.2], [-15.0, -9.0, 33.5, 36.0]),
  passage("Strait of Magellan", [-52.7, -75.0], [-52.7, -70.0], [-55.0, -50.0, -76.0, -68.0]),
  barrier("Isthmus of Panama", [9.3, -80.3], [8.0, -79.0], [6.0, 11.0, -83.0, -77.0]),
  barrier("Isthmus of Suez", [29.8, 32.5], [31.6, 32.3], [28.0, 32.5, 30.5, 34.0]),
  barrier("Isthmus of Corinth", [38.0, 22.8], [37.8, 23.2], [37.4, 38.6, 21.5, 24.0])
]);

export function boundedNavigablePathExists({
  graph,
  earthRows,
  navigation,
  from,
  to,
  bounds,
  directionIndex = createDirectionIndex(graph)
}) {
  validateInvariantInputs(graph, earthRows, navigation, from, to, bounds);
  const startTileId = nearestNavigableTile(graph, directionIndex, navigation, from);
  const destinationTileId = nearestNavigableTile(graph, directionIndex, navigation, to);
  const seen = new Uint8Array(graph.tileCount);
  const queue = new Uint32Array(graph.tileCount);
  let head = 0;
  let tail = 0;
  seen[startTileId] = 1;
  queue[tail++] = startTileId;
  while (head < tail) {
    const tileId = queue[head++];
    if (tileId === destinationTileId) return true;
    for (const neighborId of graph.neighbors[tileId]) {
      if (seen[neighborId] || !tileWithinBounds(graph, neighborId, bounds) ||
          navigation.reachableNavigationMask[neighborId] !== 1) continue;
      if (!canTraverseWorldNavigationEdge({
        graph,
        earthRows,
        riverMasks: navigation.riverMasks,
        riverToWaterMasks: navigation.riverToWaterMasks,
        fromTileId: tileId,
        toTileId: neighborId
      })) continue;
      seen[neighborId] = 1;
      queue[tail++] = neighborId;
    }
  }
  return false;
}

function nearestNavigableTile(graph, directionIndex, navigation, [lat, lon]) {
  const startTileId = findNearestTileId(graph, directionIndex, latLonToDirection(lat, lon));
  const seen = new Uint8Array(graph.tileCount);
  const queue = new Uint32Array(graph.tileCount);
  let head = 0;
  let tail = 0;
  seen[startTileId] = 1;
  queue[tail++] = startTileId;
  while (head < tail) {
    const tileId = queue[head++];
    if (navigation.reachableNavigationMask[tileId] === 1) return tileId;
    for (const neighborId of graph.neighbors[tileId]) {
      if (seen[neighborId]) continue;
      seen[neighborId] = 1;
      queue[tail++] = neighborId;
    }
  }
  throw new Error(`No navigable world tile exists near ${lat}/${lon}`);
}

function tileWithinBounds(graph, tileId, [south, north, west, east]) {
  const lat = graph.latDeg[tileId];
  const lon = graph.lonDeg[tileId];
  return lat >= south && lat <= north && lon >= west && lon <= east;
}

function validateInvariantInputs(graph, earthRows, navigation, from, to, bounds) {
  if (!graph || !Number.isInteger(graph.tileCount) || !Array.isArray(earthRows) ||
      earthRows.length !== graph.tileCount) {
    throw new Error("Waterway invariant requires a complete world graph and terrain cache");
  }
  for (const mask of [
    navigation?.reachableNavigationMask,
    navigation?.riverMasks,
    navigation?.riverToWaterMasks
  ]) {
    if (!(mask instanceof Uint8Array) || mask.length !== graph.tileCount) {
      throw new Error("Waterway invariant requires complete navigation masks");
    }
  }
  if (![from, to].every(validCoordinatePair) || !Array.isArray(bounds) || bounds.length !== 4 ||
      bounds.some((value) => !Number.isFinite(value))) {
    throw new Error("Waterway invariant received malformed geographic coordinates");
  }
}

function validCoordinatePair(value) {
  return Array.isArray(value) && value.length === 2 && value.every(Number.isFinite);
}

function passage(name, from, to, bounds) {
  return Object.freeze({ name, from: Object.freeze(from), to: Object.freeze(to), bounds: Object.freeze(bounds), connected: true });
}

function barrier(name, from, to, bounds) {
  return Object.freeze({ name, from: Object.freeze(from), to: Object.freeze(to), bounds: Object.freeze(bounds), connected: false });
}

function latLonToDirection(latDeg, lonDeg) {
  const lat = latDeg * Math.PI / 180;
  const lon = lonDeg * Math.PI / 180;
  const cosLat = Math.cos(lat);
  return [cosLat * Math.cos(lon), Math.sin(lat), -cosLat * Math.sin(lon)];
}
