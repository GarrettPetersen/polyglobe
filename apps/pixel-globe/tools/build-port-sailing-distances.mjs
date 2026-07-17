import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CITY_DATA_YEAR, cityLabelText, loadCityCatalogFromCsv } from "../src/cityCatalogData.js";
import { COLONIZATION_TARGETS } from "../src/colonialCities.js";
import { buildGeodesicGraph, createDirectionIndex } from "../src/geodesic.js";
import { applyManualTerrainOverrides } from "../src/manualTerrainOverrides.js";
import {
  PORT_SAILING_DISTANCE_FORMAT,
  PORT_SAILING_DISTANCE_VERSION,
  parsePortSailingDistances
} from "../src/portSailingDistances.js";
import {
  canTraverseWorldNavigationEdge,
  buildWorldNavigationTopology
} from "../src/worldNavigationTopology.js";
import {
  placeCityCatalogOnWorld,
  placeColonizationTargetsOnWorld,
  portAccessTileIds,
  portCitiesOnWorld
} from "../src/worldPortPlacement.js";
import { EARTH_RADIUS_KM } from "../src/worldDistance.js";

const SUBDIVISIONS = 7;
const toolRoot = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(toolRoot, "..");
const repoRoot = resolve(appRoot, "../..");
const sharedRoot = resolve(repoRoot, "examples/globe-demo/public");
const earthPath = resolve(sharedRoot, `earth-globe-cache-${SUBDIVISIONS}.json`);
const cityPath = resolve(
  sharedRoot,
  "datasets/urbanization-dominance-pruned/urbanization-dominance-pruned.csv"
);
const outputPath = resolve(appRoot, "public/assets/data/port-sailing-distances.json");

const [earthSource, cityCsv] = await Promise.all([
  readFile(earthPath, "utf8"),
  readFile(cityPath, "utf8")
]);
const earthCache = JSON.parse(earthSource);
if (earthCache.subdivisions !== SUBDIVISIONS) {
  throw new Error(`Expected Earth cache subdivision ${SUBDIVISIONS}, got ${earthCache.subdivisions}`);
}
const earthRows = applyManualTerrainOverrides(earthCache.tiles, SUBDIVISIONS);
const graph = buildGeodesicGraph(SUBDIVISIONS);
if (graph.tileCount !== earthCache.tileCount || graph.tileCount !== earthRows.length) {
  throw new Error(`Port route world mismatch: graph ${graph.tileCount}, cache ${earthCache.tileCount}, rows ${earthRows.length}`);
}
const directionIndex = createDirectionIndex(graph);
const navigation = buildWorldNavigationTopology({
  graph,
  earthRows,
  earthCache,
  subdivisions: SUBDIVISIONS
});
const placementOptions = {
  graph,
  directionIndex,
  earthRows,
  reachableNavigationMask: navigation.reachableNavigationMask,
  riverMasks: navigation.riverMasks
};
const cityCatalog = loadCityCatalogFromCsv(cityCsv, CITY_DATA_YEAR);
const cityByTileId = placeCityCatalogOnWorld({ ...placementOptions, cities: cityCatalog });
const portCities = portCitiesOnWorld(cityByTileId, placementOptions);
const colonyTargets = placeColonizationTargetsOnWorld({
  ...placementOptions,
  targets: COLONIZATION_TARGETS,
  occupiedTileIds: cityByTileId.keys()
});
const endpoints = [
  ...portCities.map((city) => endpointRecord(city, "port", cityLabelText(city), placementOptions)),
  ...colonyTargets.map((colony) => endpointRecord(colony, "colony", colony.city, placementOptions))
].sort((a, b) => a.tileId - b.tileId);
reportDisconnectedSailingEndpoints({ graph, earthRows, navigation, endpoints });

const distancesKm = buildAllPairSailingDistances({
  graph,
  earthRows,
  navigation,
  endpoints
});
const output = {
  format: PORT_SAILING_DISTANCE_FORMAT,
  version: PORT_SAILING_DISTANCE_VERSION,
  subdivisions: SUBDIVISIONS,
  earthCacheVersion: String(earthCache.version),
  endpoints: endpoints.map(({ accessTileIds: _accessTileIds, ...endpoint }) => endpoint),
  distancesKm
};
parsePortSailingDistances(output, {
  subdivisions: SUBDIVISIONS,
  earthCacheVersion: String(earthCache.version)
});
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(output)}\n`);
console.log(
  `[pixel-globe] baked ${endpoints.length} sailing endpoints ` +
  `(${portCities.length} current ports, ${colonyTargets.length} colony sites) to ${outputPath}`
);

function endpointRecord(record, kind, name, placementOptions) {
  return Object.freeze({
    tileId: record.tileId,
    name,
    country: record.country,
    kind,
    accessTileIds: portAccessTileIds(placementOptions, record.tileId)
  });
}

function reportDisconnectedSailingEndpoints({ graph, earthRows, navigation, endpoints }) {
  const reachable = new Uint8Array(graph.tileCount);
  const queue = [...endpoints[0].accessTileIds];
  for (const tileId of queue) reachable[tileId] = 1;
  for (let head = 0; head < queue.length; head++) {
    const tileId = queue[head];
    for (const neighborId of graph.neighbors[tileId]) {
      if (reachable[neighborId] || navigation.reachableNavigationMask[neighborId] !== 1) continue;
      if (!canTraverseWorldNavigationEdge({
        graph,
        earthRows,
        riverMasks: navigation.riverMasks,
        riverToWaterMasks: navigation.riverToWaterMasks,
        fromTileId: tileId,
        toTileId: neighborId
      })) continue;
      reachable[neighborId] = 1;
      queue.push(neighborId);
    }
  }
  const disconnected = endpoints.filter((endpoint) => (
    endpoint.accessTileIds.every((tileId) => reachable[tileId] !== 1)
  ));
  if (disconnected.length > 0) {
    console.warn(
      `[pixel-globe] ${disconnected.length} endpoint(s) have no sailing route to ${endpoints[0].name}: ` +
      disconnected.map((endpoint) => `${endpoint.name} (${endpoint.tileId})`).join(", ") +
      "; their matrix distances are null"
    );
  }
}

function buildAllPairSailingDistances({ graph, earthRows, navigation, endpoints }) {
  const matrix = Array.from({ length: endpoints.length }, (_, rowIndex) => (
    Array.from({ length: endpoints.length }, (_, columnIndex) => rowIndex === columnIndex ? 0 : null)
  ));
  for (let originIndex = 0; originIndex < endpoints.length - 1; originIndex++) {
    const targetIndicesByAccessTile = new Map();
    for (let targetIndex = originIndex + 1; targetIndex < endpoints.length; targetIndex++) {
      for (const tileId of endpoints[targetIndex].accessTileIds) {
        const indices = targetIndicesByAccessTile.get(tileId) || [];
        indices.push(targetIndex);
        targetIndicesByAccessTile.set(tileId, indices);
      }
    }
    const targetDistances = dijkstraToPortTargets({
      graph,
      earthRows,
      navigation,
      sourceTileIds: endpoints[originIndex].accessTileIds,
      targetIndicesByAccessTile,
      targetCount: endpoints.length - originIndex - 1
    });
    for (let targetIndex = originIndex + 1; targetIndex < endpoints.length; targetIndex++) {
      const distance = targetDistances.get(targetIndex);
      if (!Number.isFinite(distance)) continue;
      const rounded = Math.max(1, Math.round(distance));
      matrix[originIndex][targetIndex] = rounded;
      matrix[targetIndex][originIndex] = rounded;
    }
    if ((originIndex + 1) % 20 === 0 || originIndex === endpoints.length - 2) {
      console.log(`[pixel-globe] sailing routes ${originIndex + 1}/${endpoints.length - 1}`);
    }
  }
  return matrix;
}

function dijkstraToPortTargets({
  graph,
  earthRows,
  navigation,
  sourceTileIds,
  targetIndicesByAccessTile,
  targetCount
}) {
  const distances = new Float64Array(graph.tileCount);
  distances.fill(Infinity);
  const heap = new MinHeap();
  for (const tileId of sourceTileIds) {
    distances[tileId] = 0;
    heap.push(tileId, 0);
  }
  const targetDistances = new Map();
  while (heap.tileIds.length > 0 && targetDistances.size < targetCount) {
    const current = heap.pop();
    if (current.distance !== distances[current.tileId]) continue;
    const targetIndices = targetIndicesByAccessTile.get(current.tileId);
    if (targetIndices) {
      for (const targetIndex of targetIndices) {
        if (!targetDistances.has(targetIndex)) targetDistances.set(targetIndex, current.distance);
      }
    }
    for (const neighborId of graph.neighbors[current.tileId]) {
      if (navigation.reachableNavigationMask[neighborId] !== 1) continue;
      if (!canTraverseWorldNavigationEdge({
        graph,
        earthRows,
        riverMasks: navigation.riverMasks,
        riverToWaterMasks: navigation.riverToWaterMasks,
        fromTileId: current.tileId,
        toTileId: neighborId
      })) continue;
      const candidate = current.distance + edgeDistanceKm(graph, current.tileId, neighborId);
      if (candidate >= distances[neighborId]) continue;
      distances[neighborId] = candidate;
      heap.push(neighborId, candidate);
    }
  }
  return targetDistances;
}

function edgeDistanceKm(graph, a, b) {
  const aOffset = a * 3;
  const bOffset = b * 3;
  const dot = Math.max(-1, Math.min(1,
    graph.centers[aOffset] * graph.centers[bOffset] +
    graph.centers[aOffset + 1] * graph.centers[bOffset + 1] +
    graph.centers[aOffset + 2] * graph.centers[bOffset + 2]
  ));
  return Math.acos(dot) * EARTH_RADIUS_KM;
}

function MinHeap() {
  this.tileIds = [];
  this.distances = [];
  this.push = (tileId, distance) => {
    let index = this.tileIds.length;
    this.tileIds.push(tileId);
    this.distances.push(distance);
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.distances[parent] <= distance) break;
      this.tileIds[index] = this.tileIds[parent];
      this.distances[index] = this.distances[parent];
      index = parent;
    }
    this.tileIds[index] = tileId;
    this.distances[index] = distance;
  };
  this.pop = () => {
    if (this.tileIds.length === 0) throw new Error("Cannot pop an empty sailing-route heap");
    const tileId = this.tileIds[0];
    const distance = this.distances[0];
    const lastTileId = this.tileIds.pop();
    const lastDistance = this.distances.pop();
    if (this.tileIds.length > 0) {
      let index = 0;
      while (true) {
        const left = index * 2 + 1;
        if (left >= this.tileIds.length) break;
        const right = left + 1;
        const child = right < this.tileIds.length && this.distances[right] < this.distances[left] ? right : left;
        if (this.distances[child] >= lastDistance) break;
        this.tileIds[index] = this.tileIds[child];
        this.distances[index] = this.distances[child];
        index = child;
      }
      this.tileIds[index] = lastTileId;
      this.distances[index] = lastDistance;
    }
    return { tileId, distance };
  };
}
