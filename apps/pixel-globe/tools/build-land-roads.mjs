import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CITY_DATA_YEAR, cityLabelText, loadCityCatalogFromCsv } from "../src/cityCatalogData.js";
import { createDirectionIndex } from "../src/geodesic.js";
import { decodeGeodesicGraphBake } from "../src/geodesicBake.js";
import { LAND_ROAD_FORMAT, LAND_ROAD_VERSION, parseLandRoadNetwork } from "../src/landRoadNetwork.js";
import { applyManualTerrainOverrides } from "../src/manualTerrainOverrides.js";
import { roadTerrainPenalty, roadTileIsPassable } from "../src/roadTerrain.js";
import { terrainRowsNeedLandmassChannel } from "../src/terrainSurface.js";
import { buildWorldNavigationTopology } from "../src/worldNavigationTopology.js";
import { placeCityCatalogOnWorld } from "../src/worldPortPlacement.js";
import { graphEdgeDistanceKm, MinDistanceHeap } from "../src/weightedGraphSearch.js";
import { WORLD_GLOBE_SUBDIVISIONS } from "../src/worldScale.js";

const SUBDIVISIONS = WORLD_GLOBE_SUBDIVISIONS;
const NEARBY_CANDIDATE_COUNT = 10;
const ROUTES_PER_CITY = 2;
const MAX_CANDIDATE_DISTANCE_KM = 1200;
const MAX_ROUTE_DISTANCE_KM = 1500;
const toolRoot = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(toolRoot, "..");
const repoRoot = resolve(appRoot, "../..");
const sharedRoot = resolve(repoRoot, "examples/globe-demo/public");
const earthPath = resolve(sharedRoot, `earth-globe-cache-${SUBDIVISIONS}.json`);
const graphPath = resolve(sharedRoot, `geodesic-graph-${SUBDIVISIONS}.bin`);
const cityPath = resolve(
  sharedRoot,
  "datasets/urbanization-dominance-pruned/urbanization-dominance-pruned.csv"
);
const outputPath = resolve(appRoot, "public/assets/data/land-roads.json");

const [earthSource, graphSource, cityCsv] = await Promise.all([
  readFile(earthPath, "utf8"),
  readFile(graphPath),
  readFile(cityPath, "utf8")
]);
const earthCache = JSON.parse(earthSource);
if (earthCache.subdivisions !== SUBDIVISIONS) {
  throw new Error(`Expected Earth cache subdivision ${SUBDIVISIONS}, got ${earthCache.subdivisions}`);
}
const earthRows = applyManualTerrainOverrides(earthCache.tiles, SUBDIVISIONS);
const graph = decodeGeodesicGraphBake(
  graphSource.buffer.slice(graphSource.byteOffset, graphSource.byteOffset + graphSource.byteLength),
  SUBDIVISIONS
);
const directionIndex = createDirectionIndex(graph);
const navigation = buildWorldNavigationTopology({
  graph,
  earthRows,
  earthCache,
  subdivisions: SUBDIVISIONS
});
const cityCatalog = loadCityCatalogFromCsv(cityCsv, CITY_DATA_YEAR);
const cityByTileId = placeCityCatalogOnWorld({
  graph,
  directionIndex,
  earthRows,
  reachableNavigationMask: navigation.reachableNavigationMask,
  riverMasks: navigation.riverMasks,
  cities: cityCatalog
});
const cities = [...cityByTileId.values()]
  .map((city) => Object.freeze({
    tileId: city.tileId,
    name: cityLabelText(city),
    country: city.country
  }))
  .sort((a, b) => a.tileId - b.tileId);
const namedPeakTileIds = new Set((earthCache.peaks || []).map((entry) => entry[0]));
const routes = buildRoadRoutes({
  graph,
  earthRows,
  riverMasks: navigation.riverMasks,
  namedPeakTileIds,
  cities
});
const output = {
  format: LAND_ROAD_FORMAT,
  version: LAND_ROAD_VERSION,
  subdivisions: SUBDIVISIONS,
  earthCacheVersion: String(earthCache.version),
  cities,
  routes
};
parseLandRoadNetwork(output, {
  subdivisions: SUBDIVISIONS,
  earthCacheVersion: String(earthCache.version)
});
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(output)}\n`);
console.log(`[pixel-globe] baked ${routes.length} land roads among ${cities.length} cities to ${outputPath}`);

function buildRoadRoutes({ graph, earthRows, riverMasks, namedPeakTileIds, cities }) {
  const routeByPair = new Map();
  for (let originIndex = 0; originIndex < cities.length; originIndex++) {
    const origin = cities[originIndex];
    const candidates = nearbyRoadCandidates(graph, origin, cities);
    const paths = weightedLandPaths({
      graph,
      earthRows,
      riverMasks,
      namedPeakTileIds,
      origin,
      candidates
    }).sort((a, b) => a.weightedCost - b.weightedCost || a.distanceKm - b.distanceKm);
    for (const path of paths.slice(0, ROUTES_PER_CITY)) {
      if (path.distanceKm > MAX_ROUTE_DISTANCE_KM) continue;
      const key = roadPairKey(origin.tileId, path.destination.tileId);
      if (routeByPair.has(key)) continue;
      const fromTileId = Math.min(origin.tileId, path.destination.tileId);
      const toTileId = Math.max(origin.tileId, path.destination.tileId);
      const tileIds = origin.tileId === fromTileId ? path.tileIds : [...path.tileIds].reverse();
      routeByPair.set(key, Object.freeze({
        id: `road-${fromTileId}-${toTileId}`,
        fromTileId,
        toTileId,
        distanceKm: Math.max(1, Math.round(path.distanceKm)),
        weightedCost: Math.max(1, Math.round(path.weightedCost)),
        tileIds
      }));
    }
    if ((originIndex + 1) % 50 === 0 || originIndex === cities.length - 1) {
      console.log(`[pixel-globe] land roads ${originIndex + 1}/${cities.length}`);
    }
  }
  return [...routeByPair.values()].sort((a, b) => a.fromTileId - b.fromTileId || a.toTileId - b.toTileId);
}

function nearbyRoadCandidates(graph, origin, cities) {
  return cities
    .filter((city) => city.tileId !== origin.tileId)
    .map((city) => ({ city, distanceKm: graphEdgeDistanceKm(graph, origin.tileId, city.tileId) }))
    .filter((entry) => entry.distanceKm <= MAX_CANDIDATE_DISTANCE_KM)
    .sort((a, b) => a.distanceKm - b.distanceKm || a.city.tileId - b.city.tileId)
    .slice(0, NEARBY_CANDIDATE_COUNT)
    .map((entry) => entry.city);
}

function weightedLandPaths({ graph, earthRows, riverMasks, namedPeakTileIds, origin, candidates }) {
  if (candidates.length === 0) return [];
  const targetByTileId = new Map(candidates.map((city) => [city.tileId, city]));
  const distances = new Float64Array(graph.tileCount);
  distances.fill(Infinity);
  const physicalDistances = new Float64Array(graph.tileCount);
  physicalDistances.fill(Infinity);
  const previous = new Int32Array(graph.tileCount);
  previous.fill(-1);
  const heap = new MinDistanceHeap();
  distances[origin.tileId] = 0;
  physicalDistances[origin.tileId] = 0;
  heap.push(origin.tileId, 0);
  const found = new Map();

  while (heap.size > 0 && found.size < candidates.length) {
    const current = heap.pop();
    if (current.distance !== distances[current.tileId]) continue;
    const destination = targetByTileId.get(current.tileId);
    if (destination && !found.has(current.tileId)) {
      found.set(current.tileId, {
        destination,
        weightedCost: current.distance,
        distanceKm: physicalDistances[current.tileId],
        tileIds: reconstructPath(previous, origin.tileId, current.tileId)
      });
      // A road may terminate at a river city, but it must not use that endpoint
      // as a bridge across the otherwise blocked river tile.
      continue;
    }
    for (const neighborId of graph.neighbors[current.tileId]) {
      if (terrainRowsNeedLandmassChannel(earthRows[current.tileId], earthRows[neighborId])) continue;
      const isEndpoint = neighborId === origin.tileId || targetByTileId.has(neighborId);
      if (!isEndpoint && !roadTileIsPassable(earthRows[neighborId], {
        namedPeak: namedPeakTileIds.has(neighborId),
        hasRiver: (riverMasks[neighborId] || 0) !== 0
      })) continue;
      const edgeKm = graphEdgeDistanceKm(graph, current.tileId, neighborId);
      const currentPenalty = roadEndpointPenalty(
        earthRows[current.tileId],
        current.tileId,
        origin.tileId,
        targetByTileId
      );
      const neighborPenalty = roadEndpointPenalty(
        earthRows[neighborId],
        neighborId,
        origin.tileId,
        targetByTileId
      );
      const candidateCost = current.distance + edgeKm * (currentPenalty + neighborPenalty) * 0.5;
      if (candidateCost >= distances[neighborId]) continue;
      distances[neighborId] = candidateCost;
      physicalDistances[neighborId] = physicalDistances[current.tileId] + edgeKm;
      previous[neighborId] = current.tileId;
      heap.push(neighborId, candidateCost);
    }
  }
  return [...found.values()];
}

function roadEndpointPenalty(row, tileId, originTileId, targetByTileId) {
  return tileId === originTileId || targetByTileId.has(tileId) ? 1 : roadTerrainPenalty(row);
}

function reconstructPath(previous, originTileId, destinationTileId) {
  const path = [];
  let tileId = destinationTileId;
  while (tileId !== -1) {
    path.push(tileId);
    if (tileId === originTileId) return path.reverse();
    tileId = previous[tileId];
  }
  throw new Error(`Land road path ${originTileId} to ${destinationTileId} has no predecessor chain`);
}

function roadPairKey(a, b) {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}
