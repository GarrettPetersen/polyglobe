import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { CITY_DATA_YEAR, loadCityCatalogFromCsv } from "./cityCatalogData.js";
import { cityRequiresPortAccess } from "./cityCatalogSelection.js";
import {
  INLAND_CITY_IDS_1522,
  INLAND_CITY_SAILING_GATEWAYS_1522
} from "./cityPortAccessPolicy.js";
import { validateCanonicalPortCatalog } from "./canonicalPorts.js";
import {
  MAX_MOUNTAIN_DISCOVERY_RADIUS_PX,
  buildWorldDiscoveries,
  restrictMountainsToNavigableView
} from "./discoveries.js";
import { buildGeodesicGraph, createDirectionIndex } from "./geodesic.js";
import { decodeGeodesicGraphBake } from "./geodesicBake.js";
import { buildMountainLandmarks } from "./mountainLandmarks.js";
import { applyManualTerrainOverrides } from "./manualTerrainOverrides.js";
import { MANUAL_CITY_RIVER_HEX_CHAINS_BY_SUBDIVISIONS } from "./manualRiverHexChains.js";
import { isWaterSurfaceRow } from "./terrainSurface.js";
import { buildWorldNavigationTopology } from "./worldNavigationTopology.js";
import {
  WORLD_WATERWAY_INVARIANTS,
  boundedNavigablePathExists
} from "./worldMapInvariants.js";
import {
  placeCityCatalogOnWorld,
  portCitiesOnWorld,
  validateCityPortAccessCatalog
} from "./worldPortPlacement.js";
import {
  WORLD_GLOBE_SUBDIVISIONS,
  WORLD_LANDMARK_VIEWPORT_RADIUS_PX,
  WORLD_PIXELS_PER_RADIAN
} from "./worldScale.js";

const repoRoot = new URL("../../../", import.meta.url);

test("subdivision-eight preserves authored waterways, ports, barriers, and landmark approaches", async () => {
  const graphBytes = await readFile(new URL(
    "examples/globe-demo/public/geodesic-graph-8.bin",
    repoRoot
  ));
  const graph = decodeGeodesicGraphBake(
    graphBytes.buffer.slice(graphBytes.byteOffset, graphBytes.byteOffset + graphBytes.byteLength),
    WORLD_GLOBE_SUBDIVISIONS
  );
  const earth = JSON.parse(await readFile(new URL(
    "examples/globe-demo/public/earth-globe-cache-8.json",
    repoRoot
  ), "utf8"));
  const earthRows = applyManualTerrainOverrides(earth.tiles, WORLD_GLOBE_SUBDIVISIONS);
  const navigation = buildWorldNavigationTopology({
    graph,
    earthRows,
    earthCache: earth,
    subdivisions: WORLD_GLOBE_SUBDIVISIONS
  });
  const directionIndex = createDirectionIndex(graph);

  assert.equal(
    riverTilesConnected(graph, navigation.riverMasks, 93216, 61636),
    false,
    "the Lancang/Mekong must not cross the Yunnan divide into the Jinsha/Yangtze"
  );
  assert.equal(
    riverTilesConnected(graph, navigation.riverMasks, 61752, 61636),
    false,
    "the Pearl and Yangtze drainage networks must remain separate"
  );

  for (const invariant of WORLD_WATERWAY_INVARIANTS) {
    assert.equal(
      boundedNavigablePathExists({
        graph,
        earthRows,
        navigation,
        directionIndex,
        ...invariant
      }),
      invariant.connected,
      invariant.name
    );
  }

  const cityCsv = await readFile(new URL(
    "examples/globe-demo/public/datasets/urbanization-dominance-pruned/urbanization-dominance-pruned.csv",
    repoRoot
  ), "utf8");
  const cities = loadCityCatalogFromCsv(cityCsv, CITY_DATA_YEAR);
  const placementOptions = {
    graph,
    directionIndex,
    earthRows,
    reachableNavigationMask: navigation.reachableNavigationMask,
    riverMasks: navigation.riverMasks
  };
  const placedByTileId = placeCityCatalogOnWorld({ ...placementOptions, cities });
  const ports = portCitiesOnWorld(placedByTileId, placementOptions);
  assert.equal(validateCityPortAccessCatalog(placedByTileId, ports, placementOptions), true);
  assert.doesNotThrow(() => validateCanonicalPortCatalog(ports));
  const portCityIds = new Set(ports.map((city) => city.cityId));
  const northMalukuPorts = [
    ["ternate|indonesia", 366292],
    ["tidore|indonesia", 366350],
    ["makian village|indonesia", 366359]
  ].map(([cityId, expectedTileId]) => {
    const port = ports.find((candidate) => candidate.cityId === cityId);
    assert.ok(port, `${cityId} must remain a dockable North Maluku island`);
    assert.equal(port.tileId, expectedTileId, `${cityId} must occupy its authored island tile`);
    return port;
  });
  assert.equal(
    new Set(northMalukuPorts.map(({ landmassId }) => landmassId)).size,
    northMalukuPorts.length,
    "Ternate, Tidore, and Makian must be three distinct islands"
  );
  assert.ok(
    graph.neighbors[northMalukuPorts[0].tileId].includes(northMalukuPorts[1].tileId),
    "Ternate and Tidore should be adjacent across their narrow channel"
  );
  assert.ok(
    graph.neighbors[northMalukuPorts[1].tileId].includes(northMalukuPorts[2].tileId),
    "Tidore and Makian should form the next reach of the volcanic island chain"
  );
  for (const city of cities.filter(cityRequiresPortAccess)) {
    assert.ok(portCityIds.has(city.cityId), `${city.cityId} must remain water-accessible`);
  }
  assert.ok(!portCityIds.has("mecca|saudi arabia"), "Mecca must remain inland behind Jeddah");
  assert.ok(portCityIds.has("delhi|india"), "Delhi must retain its Yamuna approach");
  assert.ok(portCityIds.has("tomogaura|japan"), "Iwami must retain its historical Tomogaura export harbor");
  assert.ok(portCityIds.has("gao|mali"), "Gao must retain its Niger approach");
  assert.ok(portCityIds.has("tombouctou|mali"), "Timbuktu must retain its Kabara approach");
  for (const cityId of [
    "cuttack|india",
    "nanchang|china",
    "chengdu|china",
    "xian|china",
    "pegu|myanmar",
    "jaunpur|india",
    "cremona|italy",
    "tours|france",
    "angers|france",
    "coimbra|portugal"
  ]) {
    assert.ok(portCityIds.has(cityId), `${cityId} must retain its historic river approach`);
  }
  const placedCityIds = new Set([...placedByTileId.values()].map((city) => city.cityId));
  for (const cityId of INLAND_CITY_IDS_1522) {
    assert.ok(placedCityIds.has(cityId), `${cityId} must resolve to a placed canonical city`);
    assert.ok(!portCityIds.has(cityId), `${cityId} must remain an inland settlement`);
  }
  for (const { inlandCityId, gatewayCityId } of INLAND_CITY_SAILING_GATEWAYS_1522) {
    assert.ok(portCityIds.has(gatewayCityId), `${inlandCityId} requires gateway ${gatewayCityId}`);
  }
  const manualRiverCityIds = Object.keys(
    MANUAL_CITY_RIVER_HEX_CHAINS_BY_SUBDIVISIONS[WORLD_GLOBE_SUBDIVISIONS]
  );
  for (const cityId of manualRiverCityIds) {
    assert.ok(
      portCityIds.has(cityId),
      `${cityId} must remain dockable at its authored river ending`
    );
  }

  const discoveries = buildWorldDiscoveries(graph, directionIndex, {
    landMask: Uint8Array.from(earthRows, (row) => isWaterSurfaceRow(row) ? 0 : 1),
    cityTileIds: placedByTileId.keys(),
    riverMasks: navigation.riverMasks,
    riverToWaterMasks: navigation.riverToWaterMasks,
    navigationMask: navigation.reachableNavigationMask,
    pixelsPerRadian: WORLD_PIXELS_PER_RADIAN
  });
  for (const discovery of discoveries) {
    assert.ok(
      discovery.navigationDistancePx <= discovery.radiusPx,
      `${discovery.displayName} must be discoverable from navigable water`
    );
    assert.ok(
      discovery.navigationDistancePx <= WORLD_LANDMARK_VIEWPORT_RADIUS_PX,
      `${discovery.displayName} must fit between its approach and the viewport edge`
    );
  }

  const namedMountains = JSON.parse(await readFile(new URL(
    "examples/globe-demo/public/mountains.json",
    repoRoot
  ), "utf8"));
  const subdivisionEightMountainRegistry = buildMountainLandmarks(
    namedMountains,
    graph,
    directionIndex,
    earth.peaks
  );
  const mountainRegistry = restrictMountainsToNavigableView(
    subdivisionEightMountainRegistry,
    graph,
    navigation.reachableNavigationMask,
    MAX_MOUNTAIN_DISCOVERY_RADIUS_PX / WORLD_PIXELS_PER_RADIAN
  );
  assert.deepEqual(
    mountainRegistry.inaccessibleFamous.map((mountain) => mountain.displayName).sort(),
    ["Mount Kenya", "Muztag Feng", "Vinson Massif"],
    "the larger globe must not strand mountains that were discoverable on the old map"
  );

  const subdivisionSevenEarth = JSON.parse(await readFile(new URL(
    "examples/globe-demo/public/earth-globe-cache-7.json",
    repoRoot
  ), "utf8"));
  const subdivisionSevenGraph = buildGeodesicGraph(7);
  const subdivisionSevenMountainRegistry = buildMountainLandmarks(
    namedMountains,
    subdivisionSevenGraph,
    createDirectionIndex(subdivisionSevenGraph),
    subdivisionSevenEarth.peaks
  );
  assert.deepEqual(
    new Map(subdivisionEightMountainRegistry.famous.map(({ displayName, id }) => [displayName, id])),
    new Map(subdivisionSevenMountainRegistry.famous.map(({ displayName, id }) => [displayName, id])),
    "named discovery ids must remain stable when the globe topology changes"
  );
});

function riverTilesConnected(graph, riverMasks, startTileId, targetTileId) {
  const seen = new Uint8Array(graph.tileCount);
  const queue = new Uint32Array(graph.tileCount);
  let head = 0;
  let tail = 0;
  seen[startTileId] = 1;
  queue[tail++] = startTileId;
  while (head < tail) {
    const tileId = queue[head++];
    if (tileId === targetTileId) return true;
    for (let edge = 0; edge < graph.edgeCount[tileId]; edge++) {
      if ((riverMasks[tileId] & (1 << edge)) === 0) continue;
      const neighborId = graph.edgeNeighbors[tileId][edge];
      if (neighborId === undefined || seen[neighborId]) continue;
      const reciprocalEdge = graph.edgeNeighbors[neighborId].indexOf(tileId);
      if (reciprocalEdge < 0 || (riverMasks[neighborId] & (1 << reciprocalEdge)) === 0) continue;
      seen[neighborId] = 1;
      queue[tail++] = neighborId;
    }
  }
  return false;
}
