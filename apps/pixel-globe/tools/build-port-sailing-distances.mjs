import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CITY_DATA_YEAR, cityLabelText, loadCityCatalogFromCsv } from "../src/cityCatalogData.js";
import { COLONIZATION_TARGETS } from "../src/colonialCities.js";
import { createDirectionIndex } from "../src/geodesic.js";
import { decodeGeodesicGraphBake } from "../src/geodesicBake.js";
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
import {
  WEATHER_DAYS,
  decodePixelRuntimeWeatherBakeFile,
  fillIceMaskForDay
} from "../src/weather.js";
import { graphEdgeDistanceKm, MinDistanceHeap } from "../src/weightedGraphSearch.js";
import {
  WORLD_GLOBE_SUBDIVISIONS,
  WORLD_RUNTIME_WEATHER_SUBDIVISIONS,
  buildFineToCoarseTileMapping,
  expandCoarseTileMask,
  geodesicTileCount
} from "../src/worldScale.js";

const SUBDIVISIONS = WORLD_GLOBE_SUBDIVISIONS;
// August 4 in the fixed 365-day weather cycle: northern shipping lanes are near
// their annual maximum extent without combining incompatible ice states.
const REFERENCE_WEATHER_DAY = 215;
const SEASONAL_ICE_ROUTE_PENALTY = 4;
const toolRoot = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(toolRoot, "..");
const repoRoot = resolve(appRoot, "../..");
const sharedRoot = resolve(repoRoot, "examples/globe-demo/public");
const earthPath = resolve(sharedRoot, `earth-globe-cache-${SUBDIVISIONS}.json`);
const graphPath = resolve(sharedRoot, `geodesic-graph-${SUBDIVISIONS}.bin`);
const runtimeWeatherPath = resolve(
  sharedRoot,
  `globe-runtime-bake-${WORLD_RUNTIME_WEATHER_SUBDIVISIONS}.bin`
);
const cityPath = resolve(
  sharedRoot,
  "datasets/urbanization-dominance-pruned/urbanization-dominance-pruned.csv"
);
const outputPath = resolve(appRoot, "public/assets/data/port-sailing-distances.json");

const [earthSource, graphSource, runtimeWeatherSource, cityCsv] = await Promise.all([
  readFile(earthPath, "utf8"),
  readFile(graphPath),
  readFile(runtimeWeatherPath),
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
if (graph.tileCount !== earthCache.tileCount || graph.tileCount !== earthRows.length) {
  throw new Error(`Port route world mismatch: graph ${graph.tileCount}, cache ${earthCache.tileCount}, rows ${earthRows.length}`);
}
const runtimeWeather = decodePixelRuntimeWeatherBakeFile(
  runtimeWeatherSource.buffer.slice(
    runtimeWeatherSource.byteOffset,
    runtimeWeatherSource.byteOffset + runtimeWeatherSource.byteLength
  ),
  earthCache.version,
  WORLD_RUNTIME_WEATHER_SUBDIVISIONS,
  geodesicTileCount(WORLD_RUNTIME_WEATHER_SUBDIVISIONS)
);
const fineToCoarseWeatherTileId = buildFineToCoarseTileMapping(
  graph,
  WORLD_RUNTIME_WEATHER_SUBDIVISIONS
);
const iceMask = new Uint8Array(graph.tileCount);
const coarseIceMask = new Uint8Array(runtimeWeather.seaIceCycle.tileCount);
fillIceMaskForDay(runtimeWeather.seaIceCycle, REFERENCE_WEATHER_DAY, coarseIceMask);
expandCoarseTileMask(coarseIceMask, fineToCoarseWeatherTileId, iceMask);
const coarseAnnualIceFractions = buildAnnualIceFractions(
  runtimeWeather.seaIceCycle,
  runtimeWeather.seaIceCycle.tileCount
);
const annualIceFractions = Float32Array.from(
  fineToCoarseWeatherTileId,
  (tileId) => coarseAnnualIceFractions[tileId]
);
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
  occupiedCities: cityByTileId.values()
});
const portTileIds = new Set(portCities.map((port) => port.tileId));
const endpoints = [
  ...portCities.map((city) => endpointRecord(city, "port", cityLabelText(city), placementOptions)),
  ...colonyTargets
    .filter((colony) => !portTileIds.has(colony.tileId))
    .map((colony) => endpointRecord(colony, "colony", colony.city, placementOptions))
].sort((a, b) => a.tileId - b.tileId);
reportDisconnectedSailingEndpoints({ graph, earthRows, navigation, iceMask, endpoints });

const distancesKm = buildAllPairSailingDistances({
  graph,
  earthRows,
  navigation,
  iceMask,
  annualIceFractions,
  endpoints
});
const output = {
  format: PORT_SAILING_DISTANCE_FORMAT,
  version: PORT_SAILING_DISTANCE_VERSION,
  subdivisions: SUBDIVISIONS,
  earthCacheVersion: String(earthCache.version),
  referenceWeatherDay: REFERENCE_WEATHER_DAY,
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

function reportDisconnectedSailingEndpoints({ graph, earthRows, navigation, iceMask, endpoints }) {
  const reachable = new Uint8Array(graph.tileCount);
  const queue = endpoints[0].accessTileIds.filter((tileId) => iceMask[tileId] !== 1);
  if (queue.length === 0) {
    throw new Error(`Reference weather day ${REFERENCE_WEATHER_DAY} freezes every approach to ${endpoints[0].name}`);
  }
  for (const tileId of queue) reachable[tileId] = 1;
  for (let head = 0; head < queue.length; head++) {
    const tileId = queue[head];
    for (const neighborId of graph.neighbors[tileId]) {
      if (
        reachable[neighborId] ||
        navigation.reachableNavigationMask[neighborId] !== 1 ||
        iceMask[neighborId] === 1
      ) continue;
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

function buildAllPairSailingDistances({
  graph,
  earthRows,
  navigation,
  iceMask,
  annualIceFractions,
  endpoints
}) {
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
      iceMask,
      annualIceFractions,
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
  iceMask,
  annualIceFractions,
  sourceTileIds,
  targetIndicesByAccessTile,
  targetCount
}) {
  const routeCosts = new Float64Array(graph.tileCount);
  routeCosts.fill(Infinity);
  const routeDistances = new Float64Array(graph.tileCount);
  routeDistances.fill(Infinity);
  const heap = new MinDistanceHeap();
  for (const tileId of sourceTileIds) {
    if (iceMask[tileId] === 1) continue;
    routeCosts[tileId] = 0;
    routeDistances[tileId] = 0;
    heap.push(tileId, 0);
  }
  const targetDistances = new Map();
  while (heap.size > 0 && targetDistances.size < targetCount) {
    const current = heap.pop();
    if (current.distance !== routeCosts[current.tileId]) continue;
    const targetIndices = targetIndicesByAccessTile.get(current.tileId);
    if (targetIndices) {
      for (const targetIndex of targetIndices) {
        if (!targetDistances.has(targetIndex)) {
          targetDistances.set(targetIndex, routeDistances[current.tileId]);
        }
      }
    }
    for (const neighborId of graph.neighbors[current.tileId]) {
      if (navigation.reachableNavigationMask[neighborId] !== 1 || iceMask[neighborId] === 1) continue;
      if (!canTraverseWorldNavigationEdge({
        graph,
        earthRows,
        riverMasks: navigation.riverMasks,
        riverToWaterMasks: navigation.riverToWaterMasks,
        fromTileId: current.tileId,
        toTileId: neighborId
      })) continue;
      const edgeDistance = graphEdgeDistanceKm(graph, current.tileId, neighborId);
      const annualIceFraction = Math.max(
        annualIceFractions[current.tileId],
        annualIceFractions[neighborId]
      );
      const candidateCost = current.distance + edgeDistance * (
        1 + annualIceFraction * SEASONAL_ICE_ROUTE_PENALTY
      );
      const candidateDistance = routeDistances[current.tileId] + edgeDistance;
      if (
        candidateCost > routeCosts[neighborId] ||
        (
          candidateCost === routeCosts[neighborId] &&
          candidateDistance >= routeDistances[neighborId]
        )
      ) continue;
      routeCosts[neighborId] = candidateCost;
      routeDistances[neighborId] = candidateDistance;
      heap.push(neighborId, candidateCost);
    }
  }
  return targetDistances;
}

function buildAnnualIceFractions(cycle, tileCount) {
  const iceDays = new Uint16Array(tileCount);
  const dailyIceMask = new Uint8Array(tileCount);
  for (let day = 0; day < WEATHER_DAYS; day++) {
    fillIceMaskForDay(cycle, day, dailyIceMask);
    for (let tileId = 0; tileId < tileCount; tileId++) {
      iceDays[tileId] += dailyIceMask[tileId];
    }
  }
  return Float32Array.from(iceDays, (days) => days / WEATHER_DAYS);
}
