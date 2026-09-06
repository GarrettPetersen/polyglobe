import assert from "node:assert/strict";
import test from "node:test";
import { landmassSeparationAudit, connectedLandTileIds, isolatedCoastalWaterRegions, riverOpeningAudit, settlementPlacementDisplacements } from "./worldGeographyAudit.js";
import { boundedNavigablePathExists } from "./worldMapInvariants.js";

function fixture() {
  const graph = {
    tileCount: 5,
    centers: new Float32Array([0, 1, 2, 3, 4].flatMap((lon) => [Math.cos(lon * Math.PI / 180), 0, -Math.sin(lon * Math.PI / 180)])),
    latDeg: new Float32Array(5), lonDeg: new Float32Array([0, 1, 2, 3, 4]),
    neighbors: [[1], [0, 2], [1, 3], [2, 4], [3]],
    edgeNeighbors: [[1], [0, 2], [1, 3], [2, 4], [3]]
  };
  const earthRows = [{ t: "beach", o: 1 }, { t: "beach", o: 1 }, { t: "humid_continental" }, { t: "water" }, { t: "lake", l: 9 }];
  const navigation = { riverMasks: new Uint8Array(5), riverToWaterMasks: new Uint8Array(5), reachableNavigationMask: new Uint8Array([0, 0, 0, 1, 1]) };
  return { graph, earthRows, navigation };
}

test("the broad scan finds enclosed ocean coast, leaves inland lakes alone, and recognizes a repaired outlet", () => {
  const world = fixture();
  assert.deepEqual(isolatedCoastalWaterRegions(world).map(({ tileIds }) => tileIds), [[0, 1]]);
  const before = structuredClone(world.earthRows);
  assert.deepEqual(connectedLandTileIds({ ...world, startTileId: 2 }), [2]);
  assert.deepEqual(world.earthRows, before, "auditing must not alter terrain");
  world.earthRows[2] = { t: "beach", o: 1 };
  assert.deepEqual(isolatedCoastalWaterRegions(world), []);
  world.earthRows = world.earthRows.map(() => ({ t: "lake", l: 9 }));
  assert.deepEqual(isolatedCoastalWaterRegions(world), []);
});

test("placement audit compares canonical settlements to intended coordinates, including authored gateways", () => {
  const { graph } = fixture();
  const settlement = { cityId: "test:colony", tileId: 4, lat: 0, lon: 0 };
  const report = settlementPlacementDisplacements({ graph, settlements: [settlement], minimumDistanceKm: 75 });
  assert.equal(report[0].cityId, settlement.cityId);
  assert.ok(report[0].distanceKm > 400);
  assert.deepEqual(settlementPlacementDisplacements({ graph, settlements: [{ ...settlement, placementLat: 0, placementLon: 4 }] }), []);
  assert.throws(() => settlementPlacementDisplacements({ graph, settlements: [{ ...settlement, tileId: 99 }] }), /invalid city or tile/);
  assert.throws(() => isolatedCoastalWaterRegions({ graph, earthRows: [] }), /one terrain row/);
});

test("waterway audits never snap an isolated endpoint across a land bridge to reachable ocean", () => {
  const world = fixture();
  const options = { ...world, from: [0, 0], to: [0, 4], bounds: [-1, 1, -1, 5] };
  assert.equal(boundedNavigablePathExists(options), false);
  world.earthRows[2] = { t: "beach", o: 1 };
  assert.equal(boundedNavigablePathExists(options), true);
  world.earthRows[0] = { t: "humid_continental" };
  world.earthRows[1] = { t: "humid_continental" };
  assert.throws(() => boundedNavigablePathExists(options), /no local navigation tile/);
});

test("surface-water contracts reject river shortcuts and paths outside the geographic corridor", () => {
  const world = fixture();
  world.navigation.riverMasks[2] = 3;
  const options = { ...world, from: [0, 0], to: [0, 4], bounds: [-1, 1, -1, 5], endpointSearchRings: 0 };
  assert.equal(boundedNavigablePathExists(options), true);
  assert.equal(boundedNavigablePathExists({ ...options, surfaceWaterOnly: true }), false);
  assert.throws(() => boundedNavigablePathExists({ ...options, bounds: [-1, 1, 1, 5] }), /no local navigation tile/);
});

test("river scans detect a closed mouth and still report a closed branch when another outlet works", () => {
  const world = fixture();
  world.earthRows = [{ t: "beach", o: 1 }, { t: "humid_continental" }, { t: "humid_continental" }, { t: "humid_continental" }, { t: "water" }];
  world.navigation.riverMasks.set([0, 2, 3, 1, 0]);
  let report = riverOpeningAudit(world);
  assert.equal(report.networksWithoutOutlet.length, 1);
  assert.deepEqual(report.coastalDeadEnds.map(({ tileId }) => tileId), [1, 3]);
  world.navigation.riverMasks[3] = 3;
  report = riverOpeningAudit(world);
  assert.equal(report.outletCount, 1);
  assert.deepEqual(report.networksWithoutOutlet, []);
  assert.deepEqual(report.coastalDeadEnds.map(({ tileId }) => tileId), [1]);
  world.navigation.riverMasks[1] = 3;
  assert.deepEqual(riverOpeningAudit(world).coastalDeadEnds, []);
});

test("separation scan catches new bridges, wrong island IDs, splits and stale exceptions", () => {
  const { graph } = fixture();
  const earthRows = [{ t: "forest", m: 1 }, { t: "forest", m: 1 }, { t: "water" },
    { t: "forest", m: 2 }, { t: "ice" }];
  const options = { graph, earthRows };
  assert.deepEqual(landmassSeparationAudit(options).unexpectedContacts, []);
  earthRows[2] = { t: "forest", m: 1 };
  assert.deepEqual(landmassSeparationAudit(options).unexpectedContacts, [{ tileIds: [2, 3], landmassIds: [1, 2] }]);
  const reviewedContacts = [{ reviewReason: "sub-hex island", tileIds: [2, 3], landmassIds: [1, 2] }];
  assert.deepEqual(landmassSeparationAudit({ ...options, reviewedContacts }).unexpectedContacts, []);
  assert.throws(() => landmassSeparationAudit({ ...options, reviewedContacts: [...reviewedContacts, ...reviewedContacts] }), /Duplicate/);
  earthRows[2] = { t: "water" };
  assert.deepEqual(landmassSeparationAudit({ ...options, reviewedContacts }).obsoleteReviews, reviewedContacts);
  earthRows[3].m = 1;
  assert.equal(landmassSeparationAudit(options).splitLandmasses[0].landmassId, 1);
  delete earthRows[3].m;
  assert.throws(() => landmassSeparationAudit(options), /lacks landmass ID/);
});
