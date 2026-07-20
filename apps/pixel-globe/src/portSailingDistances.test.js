import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { CITY_DATA_YEAR, loadCityCatalogFromCsv } from "./cityCatalogData.js";
import { COLONIZATION_TARGETS } from "./colonialCities.js";
import { buildGeodesicGraph, createDirectionIndex } from "./geodesic.js";
import { applyManualTerrainOverrides } from "./manualTerrainOverrides.js";
import {
  PORT_SAILING_DISTANCE_FORMAT,
  PORT_SAILING_DISTANCE_VERSION,
  assertPortSailingDistanceCoverage,
  parsePortSailingDistances,
  portSailingDistanceKm
} from "./portSailingDistances.js";
import { buildWorldNavigationTopology } from "./worldNavigationTopology.js";
import {
  placeCityCatalogOnWorld,
  placeColonizationTargetsOnWorld,
  portCitiesOnWorld
} from "./worldPortPlacement.js";

const appRoot = new URL("../", import.meta.url);
const repoRoot = new URL("../../../", import.meta.url);

test("port sailing distance bakes are strict, symmetric, and support unreachable routes", () => {
  const bake = parsePortSailingDistances({
    format: PORT_SAILING_DISTANCE_FORMAT,
    version: PORT_SAILING_DISTANCE_VERSION,
    subdivisions: 7,
    earthCacheVersion: "test-earth",
    endpoints: [
      { tileId: 10, name: "Alpha", country: "A", kind: "port" },
      { tileId: 20, name: "Beta", country: "B", kind: "colony" }
    ],
    distancesKm: [[0, null], [null, 0]]
  }, { subdivisions: 7, earthCacheVersion: "test-earth" });

  assert.equal(portSailingDistanceKm(bake, { tileId: 10 }, 20), null);
  assert.doesNotThrow(() => assertPortSailingDistanceCoverage(bake, [{ tileId: 10 }, { tileId: 20 }]));
  assert.throws(() => portSailingDistanceKm(bake, 10, 30), /no destination tile 30/);
  assert.throws(
    () => parsePortSailingDistances({
      format: PORT_SAILING_DISTANCE_FORMAT,
      version: PORT_SAILING_DISTANCE_VERSION,
      subdivisions: 7,
      earthCacheVersion: "test-earth",
      endpoints: [
        { tileId: 10, name: "Alpha", country: "A", kind: "port" },
        { tileId: 20, name: "Beta", country: "B", kind: "port" }
      ],
      distancesKm: [[0, 12], [11, 0]]
    }),
    /asymmetric/
  );
});

test("the checked-in bake covers colony sites and uses navigable sailing distances", async () => {
  const [distanceSource, earthSource, cityCsv] = await Promise.all([
    readFile(new URL("public/assets/data/port-sailing-distances.json", appRoot), "utf8"),
    readFile(new URL("examples/globe-demo/public/earth-globe-cache-7.json", repoRoot), "utf8"),
    readFile(new URL(
      "examples/globe-demo/public/datasets/urbanization-dominance-pruned/urbanization-dominance-pruned.csv",
      repoRoot
    ), "utf8")
  ]);
  const earth = JSON.parse(earthSource);
  const bake = parsePortSailingDistances(JSON.parse(distanceSource), {
    subdivisions: earth.subdivisions,
    earthCacheVersion: String(earth.version)
  });
  const graph = buildGeodesicGraph(earth.subdivisions);
  const directionIndex = createDirectionIndex(graph);
  const earthRows = applyManualTerrainOverrides(earth.tiles, earth.subdivisions);
  const navigation = buildWorldNavigationTopology({
    graph,
    earthRows,
    earthCache: earth,
    subdivisions: earth.subdivisions
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
  assert.doesNotThrow(() => assertPortSailingDistanceCoverage(bake, [...portCities, ...colonyTargets]));

  const colonyNames = new Set(bake.endpoints.filter((endpoint) => endpoint.kind === "colony").map((endpoint) => endpoint.name));
  const expectedColonyNames = COLONIZATION_TARGETS
    .filter((target) => target.waterAccess !== "inland")
    .map((target) => target.city);
  for (const name of expectedColonyNames) assert.equal(colonyNames.has(name), true, `${name} must be baked`);

  const istanbul = requiredEndpoint(bake, "Istanbul");
  const cairo = requiredEndpoint(bake, "Cairo");
  const wuhan = requiredEndpoint(bake, "Wuhan");
  const kholmogory = requiredEndpoint(bake, "Kholmogory");
  const salerno = requiredEndpoint(bake, "Salerno");
  assert.ok(portSailingDistanceKm(bake, istanbul, wuhan) > portSailingDistanceKm(bake, istanbul, cairo) * 10);
  assert.ok(portSailingDistanceKm(bake, kholmogory, salerno) > 0);
  assert.equal(
    bake.distancesKm.some((row) => row.some((distance) => distance === null)),
    false,
    "all current ports and colony sites should share the open-water sailing network"
  );
});

function requiredEndpoint(bake, name) {
  const endpoint = bake.endpoints.find((candidate) => candidate.name === name);
  if (!endpoint) throw new Error(`Missing checked-in sailing endpoint: ${name}`);
  return endpoint;
}
