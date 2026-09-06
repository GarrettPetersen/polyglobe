import { soundDuesStraitAt } from "./soundDues.js";
import { landmassChannelNavigationAnchor } from "./landmassChannels.js";
import { REVIEWED_LANDMASS_CONTACTS } from "./reviewedLandmassContacts.js";
import { FACTION_SEA_CAPITALS_1522, markFactionSeaCapitalsOnPorts } from "./factions.js";
import { MAX_SETTLEMENT_PLACEMENT_DISTANCE_KM, localSettlementTiles, reviewedSettlementLandmassId } from "./settlementGeography.js";
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
  DEMO_GIBRALTAR_BARRIER_COORDINATES,
  DEMO_MEDITERRANEAN_SEED,
  buildDemoMediterraneanAccessMask,
  demoAccessiblePortsForMask
} from "./demoVoyage.js";
import {
  MAX_MOUNTAIN_DISCOVERY_RADIUS_PX,
  buildWorldDiscoveries,
  mountainDiscoveryCatalog,
  restrictMountainsToNavigableView
} from "./discoveries.js";
import { reconcileSavedDiscoveryReferences } from "./discoveryCatalogReferences.js";
import { validateExplorerReportDialogueCatalog } from "./explorerDiscoveryDialogue.js";
import { buildGeodesicGraph, createDirectionIndex, findNearestTileId } from "./geodesic.js";
import { decodeGeodesicGraphBake } from "./geodesicBake.js";
import { buildMountainLandmarks } from "./mountainLandmarks.js";
import { applyManualTerrainOverrides, assertManualShallowWaterReachesOcean } from "./manualTerrainOverrides.js";
import { MANUAL_CITY_RIVER_HEX_CHAINS_BY_SUBDIVISIONS } from "./manualRiverHexChains.js";
import { isWaterSurfaceRow } from "./terrainSurface.js";
import { COLONIZATION_TARGETS } from "./colonialCities.js";
import { landmassSeparationAudit, connectedLandTileIds, isolatedCoastalWaterRegions, riverOpeningAudit, settlementPlacementDisplacements } from "./worldGeographyAudit.js";
import {
  buildWorldNavigationTopology,
  canTraverseWorldNavigationEdge,
  isWorldNavigableTile
} from "./worldNavigationTopology.js";
import {
  WORLD_WATERWAY_INVARIANTS,
  boundedNavigablePathExists
} from "./worldMapInvariants.js";
import {
  nearestTileMatching,
  placeCityCatalogOnWorld,
  placeColonizationTargetsOnWorld,
  portAccessTileIds,
  portCitiesOnWorld,
  validateCityPortAccessCatalog
} from "./worldPortPlacement.js";
import { createWorldEconomy, portMarket } from "./economy.js";
import { SHIPBUILDING_MATERIAL_GOOD_IDS } from "./shipyards.js";
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
  assert.equal(
    isWaterSurfaceRow(earthRows[160967]),
    true,
    "the Loire estuary must not become an exaggerated land island"
  );
  const navigation = buildWorldNavigationTopology({
    graph,
    earthRows,
    earthCache: earth,
    subdivisions: WORLD_GLOBE_SUBDIVISIONS
  });
  const directionIndex = createDirectionIndex(graph);
  assertManualShallowWaterReachesOcean(navigation.reachableNavigationMask, 8);

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

  const danishPassage = { from: [56.5, 12], to: [54.5, 12], bounds: [54.3, 57, 8.8, 14], surfaceWaterOnly: true };
  assert.equal(boundedNavigablePathExists({ graph, earthRows, navigation, directionIndex, ...danishPassage }), true);
  const tollBlockedRows = earthRows.map((row, tileId) =>
    isWaterSurfaceRow(row) && soundDuesStraitAt({ lat: graph.latDeg[tileId], lon: graph.lonDeg[tileId] })
      ? { ...row, t: "temperate", m: 57 } : row);
  assert.equal(boundedNavigablePathExists({ graph, earthRows: tollBlockedRows, navigation, directionIndex, ...danishPassage }), false,
    "every Baltic/Kattegat route through the actual map must cross a Sound Dues gate");

  for (const tileId of [261225, 444587]) assert.equal(isWaterSurfaceRow(earthRows[tileId]), true,
    "minor empty coastal fragments may be omitted instead of joining larger islands");
  const separation = landmassSeparationAudit({ graph, earthRows, reviewedContacts: REVIEWED_LANDMASS_CONTACTS });
  assert.deepEqual(separation.unexpectedContacts, [], "unreviewed landmass bridges");
  assert.deepEqual(separation.obsoleteReviews, [], "obsolete channel exceptions need review");
  assert.deepEqual(separation.splitLandmasses, [], "one connected island per landmass ID");
  for (const { tileIds: [a, b] } of REVIEWED_LANDMASS_CONTACTS) {
    const anchor = landmassChannelNavigationAnchor({ graph, earthRows, riverMasks: navigation.riverMasks, a, b });
    assert.equal(navigation.reachableNavigationMask[anchor.tileId], 1, `channel ${a}:${b} must connect to navigable water`);
    if (a === 74311 && b === 296827) assert.equal(anchor.kind, "river", "Montreal is a river island");
  }
  const bridgedSound = earthRows.slice();
  bridgedSound[393304] = { ...earthRows[393293], id: 393304 };
  assert.equal(landmassSeparationAudit({ graph, earthRows: bridgedSound,
    reviewedContacts: REVIEWED_LANDMASS_CONTACTS }).unexpectedContacts.length, 3);
  assert.equal(boundedNavigablePathExists({ graph, earthRows: bridgedSound, navigation, directionIndex,
    ...WORLD_WATERWAY_INVARIANTS.find(({ name }) => name === "Oresund") }), false,
    "the original Copenhagen land bridge must fail even though both shores retain correct IDs");
  for (const landTileId of [393293, 391910]) {
    const connected = connectedLandTileIds({ graph, earthRows, startTileId: landTileId });
    assert.equal(new Set(connected.map((id) => earthRows[id].m)).size, 1, "Danish islands must not touch another landmass");
  }
  const vancouver = connectedLandTileIds({ graph, earthRows, startTileId: 185976 });
  assert.ok(vancouver.length >= 30, "Vancouver Island must retain its substantial land area");
  assert.ok(vancouver.every((id) => earthRows[id].m === 358), "Vancouver Island must stay separate from mainland BC");
  assert.ok(!vancouver.includes(46552));
  for (const [tileId, landmassId] of [[366292, 846], [366350, 847]]) {
    assert.equal(isWaterSurfaceRow(earthRows[tileId]), false, "Ternate and Tidore must remain land despite their small size");
    assert.equal(earthRows[tileId].m, landmassId, "Ternate and Tidore retain distinct island identities");
  }
  const islandTileIds = connectedLandTileIds({ graph, earthRows, startTileId: 299003 });
  assert.deepEqual(islandTileIds, [74856, 299000, 299003, 299014],
    "Long Island must retain its land and be separated from the mainland by water");
  assert.equal(new Set(islandTileIds.map((id) => earthRows[id].m)).size, 1);
  assert.notEqual(earthRows[299003].m, earthRows[4714].m);
  for (const blockedChannelTile of [298999, 298720, 74786, 299005]) {
    const regressedRows = earthRows.slice();
    regressedRows[blockedChannelTile] = earth.tiles[blockedChannelTile];
    assert.ok(connectedLandTileIds({ graph, earthRows: regressedRows, startTileId: 299003 }).includes(4714),
      `restoring false land tile ${blockedChannelTile} must reproduce the mainland attachment`);
  }
  const upperBay = WORLD_WATERWAY_INVARIANTS.find(({ name }) => name === "Upper Chesapeake Bay");
  const blockedBayRows = earthRows.slice();
  blockedBayRows[73665] = earth.tiles[73665];
  assert.equal(boundedNavigablePathExists({ graph, earthRows: blockedBayRows, navigation, directionIndex, ...upperBay }), false,
    "the upper bay contract must reject the original land bridge, even if a river crosses it");
  assert.ok(isolatedCoastalWaterRegions({ graph, earthRows: blockedBayRows })
    .some(({ tileIds }) => tileIds.includes(294253)), "the broad scan must detect the original enclosed upper bay");
  assert.ok(!isolatedCoastalWaterRegions({ graph, earthRows })
    .some(({ tileIds }) => tileIds.includes(294253)), "the corrected bay must open to the ocean");
  for (const tileId of [294316, 18469, 18467, 294251]) {
    assert.equal(navigation.riverMasks[tileId], 0, `tidal rivers must not cut across peninsula tile ${tileId}`);
  }
  const openingAudit = riverOpeningAudit({ graph, earthRows, navigation });
  assert.deepEqual(openingAudit.networksWithoutOutlet, [], "every river component needs its real water outlet");
  assert.deepEqual(isolatedCoastalWaterRegions({graph, earthRows}).filter(({tileIds}) =>
    !tileIds.some((id) => navigation.reachableNavigationMask[id] === 1)), [],
    "marine inlets need ocean access; real closed water bodies must be classified as lakes");
  const caspianTileId = findNearestTileId(graph, directionIndex, latLonToDirection(42, 50));
  assert.equal(earthRows[caspianTileId].l, 39, "Caspian identity must be retained");
  assert.equal(navigation.reachableNavigationMask[caspianTileId], 0, "the Caspian is an endorheic basin");
  assert.equal(earthRows[88824].l, 47, "Lake Taupo belongs to the Waikato drainage");
  assert.equal(navigation.riverMasks[354653], 0, "Moawhango must not cross into Tongariro");
  for (const { name, from } of WORLD_WATERWAY_INVARIANTS.filter(({ name }) => name.endsWith("outlet"))) {
    const startTileId = findNearestTileId(graph, directionIndex, latLonToDirection(...from));
    assert.ok(!openingAudit.coastalDeadEnds.some(({ tileId }) => tileId === startTileId), `${name} must have an outlet`);
    assert.equal(navigation.reachableNavigationMask[startTileId], 1, `${name} must reach the ocean`);
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
  // Navigation availability and capital status must never move a settlement.
  const withoutNavigation = { ...placementOptions,
    reachableNavigationMask: new Uint8Array(graph.tileCount), riverMasks: new Uint8Array(graph.tileCount) };
  const landOnly = placeCityCatalogOnWorld({ ...withoutNavigation,
    cities: cities.map((city) => ({ ...city, declaredCapitalFactionId: undefined })) });
  assert.deepEqual([...landOnly.keys()], [...placedByTileId.keys()]);
  assert.throws(() => placeCityCatalogOnWorld({ ...placementOptions, cities: [cities[0], cities[0]] }), /Duplicate city placement ID/);
  const soest = cities.find(({cityId}) => cityId === "soest|germany");
  const soestTileId = [...placedByTileId.values()].find(({cityId}) => cityId === soest.cityId).tileId;
  const wrongLandmassRows = earthRows.slice();
  for (const tileId of localSettlementTiles({graph, startId: soestTileId, coordinates: soest})) {
    wrongLandmassRows[tileId] = { ...earthRows[tileId], m: 120 };
  }
  assert.throws(() => placeCityCatalogOnWorld({ ...placementOptions, earthRows: wrongLandmassRows,
    cities: [soest] }), /reviewed landmass 57 within 45 km/);
  const colonySites = placeColonizationTargetsOnWorld({
    ...placementOptions, targets: COLONIZATION_TARGETS, occupiedCities: [...placedByTileId.values()]
  });
  const jamestown = colonySites.find(({ cityId }) => cityId === "jamestown|united states of america");
  const roanoke = colonySites.find(({ cityId }) => cityId === "roanoke|united states of america");
  assert.equal(jamestown.tileId, 294323);
  assert.deepEqual(settlementPlacementDisplacements({ graph, settlements: [jamestown], minimumDistanceKm: 20 }), []);
  assert.ok(graph.latDeg[jamestown.tileId] > graph.latDeg[roanoke.tileId] + 1,
    "Jamestown belongs on the James, well north of Roanoke");
  assert.notEqual(navigation.riverMasks[jamestown.tileId], 0, "Jamestown must stand on the tidal James route");
  const asuncion = colonySites.find(({ cityId }) => cityId === "asuncion|paraguay");
  assert.equal(asuncion.tileId, 430596);
  assert.deepEqual(settlementPlacementDisplacements({ graph, settlements: [asuncion], minimumDistanceKm: 20 }), [],
    "the Paraguay-Parana outlet must keep Asuncion off Brazil's coast");
  const ports = portCitiesOnWorld(placedByTileId, placementOptions);
  assert.equal(validateCityPortAccessCatalog(placedByTileId, ports, placementOptions), true);
  assert.doesNotThrow(() => validateCanonicalPortCatalog(ports));
  for (const cityId of ["dienne|senegal", "rufisque|senegal"]) {
    const port = ports.find((city) => city.cityId === cityId);
    assert.ok(port, `${cityId} must be a reachable port`);
    assert.deepEqual(settlementPlacementDisplacements({ graph, settlements: [port], minimumDistanceKm: 20 }), [],
      `${cityId} must remain within one hex of its historical location`);
    const approaches = portAccessTileIds(placementOptions, port.tileId);
    assert.ok(approaches.every((tileId) => navigation.reachableNavigationMask[tileId] === 1));
    if (cityId === "rufisque|senegal") {
      assert.ok(approaches.some((tileId) => isWaterSurfaceRow(earthRows[tileId])),
        "Rufisque requires a surface-water Atlantic approach, not an inland river shortcut");
    } else {
      assert.ok(approaches.some((tileId) => navigation.riverMasks[tileId] !== 0),
        "Djenne must use the Bani/Niger river network");
    }
  }
  const isNavigableTile = (tileId) => isWorldNavigableTile({
    earthRows,
    riverMasks: navigation.riverMasks,
    reachableNavigationMask: navigation.reachableNavigationMask,
    tileId
  });
  const nearestNavigableTile = ({ lat, lon }) => {
    const requestedTileId = findNearestTileId(
      graph,
      directionIndex,
      latLonToDirection(lat, lon)
    );
    const tileId = isNavigableTile(requestedTileId)
      ? requestedTileId
      : nearestTileMatching(graph, requestedTileId, isNavigableTile);
    assert.notEqual(tileId, undefined, `expected demo navigation near ${lat}, ${lon}`);
    return tileId;
  };
  const demoAccessMask = buildDemoMediterraneanAccessMask({
    graph,
    seedTileId: nearestNavigableTile(DEMO_MEDITERRANEAN_SEED),
    blockedTileIds: DEMO_GIBRALTAR_BARRIER_COORDINATES.map(nearestNavigableTile),
    isNavigableTile,
    canTraverseEdge: (fromTileId, toTileId) => canTraverseWorldNavigationEdge({
      graph,
      earthRows,
      riverMasks: navigation.riverMasks,
      riverToWaterMasks: navigation.riverToWaterMasks,
      fromTileId,
      toTileId
    })
  });
  for (const [name, lat, lon, accessible] of [
    ["Mediterranean side of Gibraltar", 36, -5, 1],
    ["Atlantic side of Gibraltar", 35.8, -6.2, 0],
    ["Atlantic Ocean", 34, -10, 0],
    ["Black Sea", 43, 34, 1],
    ["Nile", 30.5, 31.25, 1],
    ["Danube", 45.5, 28.5, 1],
    ["Red Sea", 21, 38, 0]
  ]) {
    assert.equal(demoAccessMask[nearestNavigableTile({ lat, lon })], accessible,
      `the subdivision-eight demo boundary must preserve access at ${name}`);
  }
  const demoPorts = demoAccessiblePortsForMask({
    ports,
    accessMask: demoAccessMask,
    accessTileIdsForPort: (port) => portAccessTileIds(placementOptions, port.tileId)
  });
  assert.ok(demoPorts.some((port) => port.cityId === "ceuta|morocco"), "Ceuta must remain inside the demo boundary");
  const demoEconomy = createWorldEconomy({
    ports: demoPorts,
    shipyardPorts: demoPorts,
    startMinute: 0,
    seedKey: "mediterranean-demo-material-coverage"
  });
  for (const goodId of SHIPBUILDING_MATERIAL_GOOD_IDS) {
    const suppliers = demoPorts.filter((port) => {
      const row = portMarket(demoEconomy, port).find((candidate) => candidate.good.id === goodId);
      return row?.listedForSale === true && row.productionPerDay > row.consumptionPerDay;
    });
    assert.ok(
      suppliers.length > 0,
      `Mediterranean demo needs a sustainable source of ${goodId}`
    );
  }
  const capitalPorts = markFactionSeaCapitalsOnPorts(ports);
  assert.equal(capitalPorts.size, FACTION_SEA_CAPITALS_1522.length);
  for (const capital of FACTION_SEA_CAPITALS_1522) {
    const port = ports.find(({cityId}) => cityId === capital.cityId);
    assert.equal(port.factionId, capital.factionId);
    assert.ok(portAccessTileIds(placementOptions, port.tileId).length > 0,
      `${capital.factionId} needs a functional capital at ${capital.cityId}`);
  }
  const settlements = [...placedByTileId.values(), ...colonySites];
  for (const settlement of settlements) {
    assert.equal(settlement.landmassId, reviewedSettlementLandmassId(settlement), settlement.cityId);
  }
  assert.deepEqual(settlementPlacementDisplacements({graph, settlements,
    minimumDistanceKm: MAX_SETTLEMENT_PLACEMENT_DISTANCE_KM}), []);
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
    ["Mount Ararat", "Mount Kenya", "Muztag Feng", "Vinson Massif"],
    "mountain visibility must respect real drainage divides; Ararat has no Black Sea river approach"
  );
  const fullMountainCatalog = mountainDiscoveryCatalog(mountainRegistry);
  validateExplorerReportDialogueCatalog(fullMountainCatalog);
  assert.deepEqual(new Set(fullMountainCatalog.map(({ id }) => id)),
    new Set(subdivisionEightMountainRegistry.famous.map(({ id }) => id)),
    "navigation changes must not remove canonical landmarks from saved journals");
  const savedDiscoveries = { memory: {
    discoveries: Object.fromEntries(fullMountainCatalog.map((entry) => [entry.id, { ...entry }])),
    discoveryOrder: fullMountainCatalog.map(({ id }) => id),
    pendingDiscoveryPortDialogueIds: [], campaignGoal: null
  } };
  assert.equal(reconcileSavedDiscoveryReferences(savedDiscoveries, fullMountainCatalog), 0);

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

function latLonToDirection(latDeg, lonDeg) {
  const lat = latDeg * Math.PI / 180;
  const lon = lonDeg * Math.PI / 180;
  const cosLat = Math.cos(lat);
  return [cosLat * Math.cos(lon), Math.sin(lat), -cosLat * Math.sin(lon)];
}
