import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { CITY_DATA_YEAR, loadCityCatalogFromCsv } from "./cityCatalogData.js";
import {
  CANONICAL_PORTS,
  REQUIRED_CANONICAL_PORTS,
  requireCanonicalPort,
  validateCanonicalPortCatalog
} from "./canonicalPorts.js";
import { COLONIZATION_TARGETS } from "./colonialCities.js";
import { createDirectionIndex } from "./geodesic.js";
import { decodeGeodesicGraphBake } from "./geodesicBake.js";
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
  portAccessTileIds,
  portCitiesOnWorld
} from "./worldPortPlacement.js";
import { subdivisionSevenPortReferenceCatalog } from "./subdivisionSevenPortMigration.js";

const appRoot = new URL("../", import.meta.url);
const repoRoot = new URL("../../../", import.meta.url);

test("port sailing distance bakes are strict, symmetric, and support unreachable routes", () => {
  const bake = parsePortSailingDistances({
    format: PORT_SAILING_DISTANCE_FORMAT,
    version: PORT_SAILING_DISTANCE_VERSION,
    subdivisions: 7,
    earthCacheVersion: "test-earth",
    referenceWeatherDay: 215,
    endpoints: [
      { tileId: 10, name: "Alpha", country: "A", kind: "port" },
      { tileId: 20, name: "Beta", country: "B", kind: "colony" }
    ],
    distancesKm: [[0, null], [null, 0]]
  }, { subdivisions: 7, earthCacheVersion: "test-earth" });

  assert.equal(portSailingDistanceKm(bake, { tileId: 10 }, 20), null);
  assert.doesNotThrow(() => assertPortSailingDistanceCoverage(bake, [{ tileId: 10 }, { tileId: 20 }]));
  assert.doesNotThrow(() => assertPortSailingDistanceCoverage(bake, [
    { tileId: 10 },
    { tileId: 10, preexistingSettlement: true },
    { tileId: 20 }
  ]));
  assert.throws(
    () => assertPortSailingDistanceCoverage(bake, [{ tileId: 10 }, { tileId: 10 }, { tileId: 20 }]),
    /Duplicate required port sailing endpoint tile: 10/
  );
  assert.throws(() => portSailingDistanceKm(bake, 10, 30), /no destination tile 30/);
  assert.throws(
    () => parsePortSailingDistances({
      format: PORT_SAILING_DISTANCE_FORMAT,
      version: PORT_SAILING_DISTANCE_VERSION,
      subdivisions: 7,
      earthCacheVersion: "test-earth",
      referenceWeatherDay: 215,
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
  const [distanceSource, earthSource, graphSource, cityCsv] = await Promise.all([
    readFile(new URL("public/assets/data/port-sailing-distances.json", appRoot), "utf8"),
    readFile(new URL("examples/globe-demo/public/earth-globe-cache-8.json", repoRoot), "utf8"),
    readFile(new URL("examples/globe-demo/public/geodesic-graph-8.bin", repoRoot)),
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
  const graph = decodeGeodesicGraphBake(
    graphSource.buffer.slice(graphSource.byteOffset, graphSource.byteOffset + graphSource.byteLength),
    earth.subdivisions
  );
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
  const canonicalPorts = validateCanonicalPortCatalog(portCities);
  assert.equal(canonicalPorts.size, REQUIRED_CANONICAL_PORTS.length);
  const colonyTargets = placeColonizationTargetsOnWorld({
    ...placementOptions,
    targets: COLONIZATION_TARGETS,
    occupiedCities: cityByTileId.values()
  });
  const restorePortReferences = subdivisionSevenPortReferenceCatalog(portCities, colonyTargets);
  assert.equal(
    portCities.some((port) => port.tileId === 294413),
    false,
    "unfounded St. Augustine must not begin as a dockable port"
  );
  assert.equal(
    restorePortReferences.find((reference) => reference.tileId === 294413)?.city,
    "St. Augustine",
    "save migration must still resolve a quest pointing at founded St. Augustine"
  );
  assert.ok(
    portCities.every((port) => Number.isInteger(port.landmassId)),
    "every placed port should retain its terrain landmass"
  );
  assert.ok(
    colonyTargets.every((target) => Number.isInteger(target.landmassId)),
    "every colony site should retain its terrain landmass"
  );
  const nagasakiVillage = portCities.find((port) => port.city === "Nagasaki" && port.country === "Japan");
  const hakata = portCities.find((port) => port.city === "Fukuoka" && port.country === "Japan");
  const ningbo = requireCanonicalPort(portCities, CANONICAL_PORTS.NINGBO, "Production port test");
  const hangzhou = portCities.find((port) => port.city === "Hangzhou" && port.country === "China");
  const nagasakiTarget = colonyTargets.find((target) => target.city === "Nagasaki" && target.country === "Japan");
  assert.ok(nagasakiVillage, "Nagasaki village should be a baked port");
  assert.ok(hakata, "historical Hakata should remain a baked Japanese port");
  assert.equal(hakata.displayCity, "Hakata");
  assert.equal(hakata.tileId, 65406, "Hakata should use the open coastal hex east of Nagasaki");
  assert.equal(
    graph.neighbors[nagasakiVillage.tileId].includes(hakata.tileId),
    false,
    "Hakata and Nagasaki should not occupy neighboring city hexes"
  );
  assert.ok(hangzhou, "Hangzhou should remain a dockable port");
  const ningboNeighbor = portCities.find((port) => (
    port.tileId !== ningbo.tileId && graph.neighbors[ningbo.tileId].includes(port.tileId)
  ));
  assert.equal(ningboNeighbor, undefined, "Ningbo should not neighbor another dockable port");
  assert.equal(nagasakiTarget?.tileId, nagasakiVillage.tileId);
  assert.doesNotThrow(() => assertPortSailingDistanceCoverage(bake, [
    ...portCities,
    ...colonyTargets
  ]));

  const colonyNames = new Set(bake.endpoints.filter((endpoint) => endpoint.kind === "colony").map((endpoint) => endpoint.name));
  const expectedColonyNames = COLONIZATION_TARGETS
    .filter((target) => target.waterAccess !== "inland" && !target.preexistingSettlement)
    .map((target) => target.city);
  for (const name of expectedColonyNames) assert.equal(colonyNames.has(name), true, `${name} must be baked`);
  assert.equal(requiredEndpoint(bake, "Nagasaki").kind, "port");

  const istanbul = requiredEndpoint(bake, "Istanbul");
  const cairo = requiredEndpoint(bake, "Cairo");
  const wuhan = requiredEndpoint(bake, "Wuchang");
  const kholmogory = requiredEndpoint(bake, "Kholmogory");
  const salerno = requiredEndpoint(bake, "Salerno");
  const lisbon = requiredEndpoint(bake, "Lisbon");
  const tombouctou = requiredEndpoint(bake, "Timbuktu");
  const gao = requiredEndpoint(bake, "Gao");
  const baghdad = requiredEndpoint(bake, "Baghdad");
  const tombouctouPort = portCities.find((port) => port.city === "Tombouctou");
  if (!tombouctouPort) throw new Error("Tombouctou must remain a dockable port city");
  const tombouctouAccess = portAccessTileIds(placementOptions, tombouctouPort.tileId);
  assert.ok(portSailingDistanceKm(bake, istanbul, wuhan) > portSailingDistanceKm(bake, istanbul, cairo) * 10);
  assert.ok(portSailingDistanceKm(bake, kholmogory, salerno) > 0);
  assert.ok(portSailingDistanceKm(bake, tombouctou, lisbon) > 0, "Timbuktu must remain reachable through the Niger");
  assert.ok(portSailingDistanceKm(bake, gao, lisbon) > 0, "Gao must remain reachable through the Niger");
  assert.ok(portSailingDistanceKm(bake, baghdad, lisbon) > 0, "Baghdad must reach the sea through the Tigris");
  assert.equal(
    tombouctouAccess.some((tileId) => (navigation.riverMasks[tileId] || 0) !== 0),
    true,
    "Timbuktu must retain a dockable Niger approach"
  );
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
