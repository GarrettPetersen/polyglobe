import { createDirectionIndex, findNearestTileId } from "./geodesic.js";
import { canTraverseWorldNavigationEdge } from "./worldNavigationTopology.js";
import { isWaterSurfaceRow } from "./terrainSurface.js";

export const WORLD_WATERWAY_INVARIANTS = Object.freeze([
  surfacePassage("Oresund", [56.1, 12.65], [55.35, 12.65], [55.2, 56.3, 12.2, 13.2]),
  surfacePassage("Great Belt", [55.8, 10.95], [54.9, 11.0], [54.8, 56.0, 10.5, 11.5]),
  surfacePassage("Little Belt", [55.72, 10.05], [54.9, 9.9], [54.8, 55.9, 9.4, 10.5]),
  passage("Utrecht via Vaartse Rijn and Lek", [52.09, 5.12], [51.96, 3.85], [51.5, 52.5, 3.5, 5.5]),
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
  surfacePassage("Long Island Sound", [41.01, -73.77], [41.15, -72.50], [40.85, 41.45, -73.95, -72.1]),
  surfacePassage("East River outlet", [40.55, -73.96], [41.01, -73.77], [40.3, 41.15, -74.2, -73.55]),
  surfacePassage("Upper Chesapeake Bay", [39.03, -76.41], [38.18, -76.21], [38.0, 39.25, -76.65, -75.9]),
  surfacePassage("Chesapeake Bay mouth", [38.18, -76.21], [36.9, -75.8], [36.5, 38.4, -76.6, -75.5]),
  passage("Tidal James via Jamestown", [37.53, -77.43], [37.10, -76.15], [36.8, 37.7, -77.7, -75.9]),
  passage("Tidal Potomac", [38.90, -77.05], [38.10, -76.25], [38.0, 39.2, -77.5, -76.0]),
  // Independent geographic probes, kept separate from the generated repair
  // chains so deleting a correction cannot also delete its regression test.
  riverOutlet("Niger central outlet", [4.54, 6.31], [4.30, 6.40]),
  riverOutlet("Niger western outlet", [5.26, 5.51], [5.02, 5.36]),
  riverOutlet("Niger eastern outlet", [4.54, 6.81], [4.30, 6.66]),
  riverOutlet("Ob outlet", [66.84, 69.23], [66.65, 69.79]),
  riverOutlet("Amur outlet", [52.98, 140.76], [53.05, 141.16]),
  riverOutlet("Zambezi delta outlet", [-18.79, 35.95], [-18.95, 36.17]),
  riverOutlet("Orinoco western outlet", [8.97, -61.09], [8.82, -60.83]),
  riverOutlet("Mackenzie delta outlet", [68.78, -135.84], [69.07, -136.03]),
  riverOutlet("Irrawaddy western outlet", [16.10, 94.71], [15.84, 94.70]),
  riverOutlet("Irrawaddy central outlet", [16.00, 94.95], [15.74, 94.95]),
  riverOutlet("Irrawaddy eastern outlet", [16.37, 95.96], [16.11, 95.95]),
  riverOutlet("Parana delta outlet", [-33.89, -58.54], [-34.31, -58.28]),
  passage("Rhine and Main to the North Sea", [49.45, 11.08], [51.96, 3.85], [49.0, 52.5, 3.5, 11.5]),
  passage("Northern Dvina to the White Sea", [64.22, 41.66], [65.0, 39.6], [63.4, 65.4, 39.0, 43.0]),
  passage("Hanover via Leine Aller and Weser", [52.37, 9.73], [53.6, 8.5], [52.0, 54.0, 8.0, 10.0]),
  passage("Berlin via Havel and Elbe", [52.52, 13.40], [53.75, 9.3], [51.7, 54.2, 8.8, 13.7]),
  passage("Kyoto via Yodo to Osaka Bay", [35.02, 135.77], [34.5, 135.2], [34.3, 35.3, 135.0, 136.0]),
  passage("Tidal Delaware to Delaware Bay", [39.95, -75.14], [38.9, -75.08], [38.5, 40.3, -75.9, -74.7]),
  passage("Upper Columbia joins its lower course", [46.2, -119.0], [45.9, -119.6], [45.5, 46.8, -120, -118.5]),
  passage("Jinsha joins the upper Yangtze", [27.9, 100.0], [26.6, 101.8], [26.0, 28.5, 99.0, 102.2]),
  passage("Baikal drains through Angara to Yenisey", [52.7, 104.0], [58.2, 93.0], [51.5, 59.5, 92.0, 107.0]),
  barrier("Lena Baikal watershed", [54.157, 107.898], [54.083, 108.365], [52.0, 55.0, 106.0, 110.0]),
  barrier("Caspian Black Sea watershed", [43.0, 49.0], [43.0, 35.0], [40.0, 57.0, 33.0, 52.0]),
  barrier("Isthmus of Panama", [9.3, -80.3], [8.0, -79.0], [6.0, 11.0, -83.0, -77.0]),
  barrier("Isthmus of Suez", [29.4, 32.6], [31.6, 32.3], [28.0, 32.5, 30.5, 34.0]),
  barrier("Isthmus of Corinth", [38.0, 22.8], [37.8, 23.2], [37.4, 38.6, 21.5, 24.0])
]);

export function boundedNavigablePathExists({
  graph,
  earthRows,
  navigation,
  from,
  to,
  bounds,
  endpointSearchRings = 1,
  surfaceWaterOnly = false,
  directionIndex = createDirectionIndex(graph)
}) {
  validateInvariantInputs(graph, earthRows, navigation, from, to, bounds);
  if (!Number.isInteger(endpointSearchRings) || endpointSearchRings < 0 || endpointSearchRings > 1) {
    throw new Error("Waterway endpoint search must be limited to zero or one graph ring");
  }
  const acceptsTile = (tileId) => tileWithinBounds(graph, tileId, bounds) && (
    isWaterSurfaceRow(earthRows[tileId]) || (!surfaceWaterOnly && navigation.riverMasks[tileId] !== 0)
  );
  const startTileId = nearestNavigableTile(graph, directionIndex, from, acceptsTile, endpointSearchRings);
  const destinationTileId = nearestNavigableTile(graph, directionIndex, to, acceptsTile, endpointSearchRings);
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
      if (seen[neighborId] || !acceptsTile(neighborId)) continue;
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

function nearestNavigableTile(graph, directionIndex, [lat, lon], acceptsTile, searchRings) {
  const startTileId = findNearestTileId(graph, directionIndex, latLonToDirection(lat, lon));
  // Never jump to a distant reachable shore: that can skip the very blockage
  // being audited. Isolated water is a valid endpoint whose route must fail.
  const candidates = searchRings === 0 ? [startTileId] : [startTileId, ...graph.neighbors[startTileId]];
  const tileId = candidates.find(acceptsTile);
  if (tileId !== undefined) return tileId;
  throw new Error(`Waterway endpoint ${lat}/${lon} has no local navigation tile within ${searchRings} rings`);
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

function surfacePassage(name, from, to, bounds) {
  return Object.freeze({ ...passage(name, from, to, bounds), endpointSearchRings: 0, surfaceWaterOnly: true });
}

function riverOutlet(name, from, to) {
  const bounds = [Math.min(from[0], to[0]) - 0.3, Math.max(from[0], to[0]) + 0.3,
    Math.min(from[1], to[1]) - 0.3, Math.max(from[1], to[1]) + 0.3];
  return Object.freeze({ ...passage(name, from, to, bounds), endpointSearchRings: 0 });
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
