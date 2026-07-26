import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  CITY_DATA_YEAR,
  cityLabelText,
  loadCityCatalogFromCsv
} from "../src/cityCatalogData.js";
import { cityHasPortAccess } from "../src/cityPortAccess.js";
import { buildGeodesicGraph, createDirectionIndex } from "../src/geodesic.js";
import { applyManualTerrainOverrides } from "../src/manualTerrainOverrides.js";
import { buildWorldNavigationTopology } from "../src/worldNavigationTopology.js";
import { placeCityCatalogOnWorld } from "../src/worldPortPlacement.js";

const SUBDIVISIONS = 7;
const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sharedRoot = resolve(appRoot, "../../examples/globe-demo/public");
const earthPath = resolve(sharedRoot, `earth-globe-cache-${SUBDIVISIONS}.json`);
const cityPath = resolve(
  sharedRoot,
  "datasets/urbanization-dominance-pruned/urbanization-dominance-pruned.csv"
);

const [earthSource, cityCsv] = await Promise.all([
  readFile(earthPath, "utf8"),
  readFile(cityPath, "utf8")
]);
const earthCache = JSON.parse(earthSource);
const earthRows = applyManualTerrainOverrides(earthCache.tiles, SUBDIVISIONS);
const graph = buildGeodesicGraph(SUBDIVISIONS);
const directionIndex = createDirectionIndex(graph);
const navigation = buildWorldNavigationTopology({
  graph,
  earthRows,
  earthCache,
  subdivisions: SUBDIVISIONS
});
const cities = loadCityCatalogFromCsv(cityCsv, CITY_DATA_YEAR);
const placedCities = placeCityCatalogOnWorld({
  graph,
  directionIndex,
  earthRows,
  reachableNavigationMask: navigation.reachableNavigationMask,
  riverMasks: navigation.riverMasks,
  cities
});
const portAccessOptions = {
  graph,
  earthRows,
  reachableNavigationMask: navigation.reachableNavigationMask,
  riverMasks: navigation.riverMasks
};
const landlocked = [...placedCities.values()]
  .filter((city) => !cityHasPortAccess({ ...portAccessOptions, tileId: city.tileId }))
  .map((city) => ({
    city: cityLabelText(city),
    country: city.country,
    tileId: city.tileId,
    nearestNavigableRings: nearestNavigableRingDistance({
      graph,
      earthRows,
      reachableNavigationMask: navigation.reachableNavigationMask,
      riverMasks: navigation.riverMasks,
      startTileId: city.tileId
    })
  }))
  .sort((a, b) => (
    a.nearestNavigableRings - b.nearestNavigableRings ||
    a.city.localeCompare(b.city) ||
    a.country.localeCompare(b.country)
  ));

console.log(
  `[pixel-globe] ${landlocked.length}/${placedCities.size} placed 1522 settlements ` +
  "lack ocean-reachable water within one graph ring"
);
console.log("rings\tcity\tcountry\ttile");
for (const city of landlocked) {
  console.log(
    `${city.nearestNavigableRings}\t${city.city}\t${city.country}\t${city.tileId}`
  );
}

function nearestNavigableRingDistance({
  graph,
  earthRows,
  reachableNavigationMask,
  riverMasks,
  startTileId
}) {
  const seen = new Uint8Array(graph.tileCount);
  const queue = [{ tileId: startTileId, distance: 0 }];
  seen[startTileId] = 1;
  for (let head = 0; head < queue.length; head++) {
    const current = queue[head];
    if (
      reachableNavigationMask[current.tileId] === 1 &&
      (
        isWaterSurface(earthRows[current.tileId]) ||
        riverMasks[current.tileId] !== 0
      )
    ) return current.distance;
    for (const neighborId of graph.neighbors[current.tileId]) {
      if (seen[neighborId]) continue;
      seen[neighborId] = 1;
      queue.push({ tileId: neighborId, distance: current.distance + 1 });
    }
  }
  throw new Error(`No ocean-reachable navigation tile exists for city tile ${startTileId}`);
}

function isWaterSurface(row) {
  return row?.t === "water" || row?.t === "lake" || row?.t === "beach";
}
