import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildGeodesicGraph, createDirectionIndex, findNearestTileId } from "./geodesic.js";
import {
  CHART_SEAM_ATLAS_VERSION,
  chartSeamAtlasCoverage,
  chartSeamRegionForPosition,
  chartSeamTransitionTarget,
  parseChartSeamAtlas,
  projectPositionInChartRegion,
  synchronizeChartSheetPositions,
  unprojectPositionInChartRegion
} from "./chartSeamAtlas.js";
import { applyManualTerrainOverrides } from "./manualTerrainOverrides.js";
import { isWaterSurfaceRow } from "./terrainSurface.js";

const RAW_ATLAS = Object.freeze({
  version: CHART_SEAM_ATLAS_VERSION,
  subdivisions: 7,
  earthVersion: "v20",
  regions: [
    { id: 0, center: [1, 0, 0], neighbors: [1, 3] },
    { id: 1, center: [0, 0, -1], neighbors: [0, 2] },
    { id: 2, center: [-1, 0, 0], neighbors: [1, 3] },
    { id: 3, center: [0, 0, 1], neighbors: [0, 2] }
  ]
});

const ATLAS = parseChartSeamAtlas(RAW_ATLAS, { subdivisions: 7, earthVersion: "v20" });

test("chart seam atlas validates its world bake contract", () => {
  assert.throws(
    () => parseChartSeamAtlas(RAW_ATLAS, { subdivisions: 6, earthVersion: "v20" }),
    /subdivisions mismatch/
  );
  assert.throws(
    () => parseChartSeamAtlas(RAW_ATLAS, { subdivisions: 7, earthVersion: "v19" }),
    /Earth version mismatch/
  );
});

test("chart seam atlas classifies every direction into one flat region", () => {
  assert.equal(chartSeamRegionForPosition(ATLAS, [1, 0, 0]), 0);
  assert.equal(chartSeamRegionForPosition(ATLAS, [0, 0, -1]), 1);
  assert.equal(chartSeamRegionForPosition(ATLAS, [-1, 0, 0]), 2);
  assert.deepEqual(
    chartSeamAtlasCoverage(ATLAS, [[1, 0, 0], [0, 0, -1], [-1, 0, 0], [0, 0, 1]])
      .visitedRegionIds,
    [0, 1, 2, 3]
  );
});

test("river and lake pockets retain the ocean sheet they entered", () => {
  const acrossBoundary = [0.65, 0, -0.76];
  assert.equal(chartSeamTransitionTarget(ATLAS, 0, acrossBoundary, {
    navigationKind: "openWater",
    hysteresisDot: 0
  }), 1);
  assert.equal(chartSeamTransitionTarget(ATLAS, 0, acrossBoundary, {
    navigationKind: "river",
    hysteresisDot: 0
  }), null);
  assert.equal(chartSeamTransitionTarget(ATLAS, 0, acrossBoundary, {
    navigationKind: "lake",
    hysteresisDot: 0
  }), null);
});

test("seam hysteresis prevents boundary chatter", () => {
  const almostEqual = [Math.SQRT1_2 - 0.00001, 0, -Math.SQRT1_2];
  assert.equal(chartSeamTransitionTarget(ATLAS, 0, almostEqual), null);
});

test("a region gives every globe position one stable north-up chart coordinate", () => {
  const positions = [
    direction(0, 0),
    direction(20, 35),
    direction(-30, -45),
    direction(70, 10)
  ];
  for (const position of positions) {
    const point = projectPositionInChartRegion(ATLAS, 0, position);
    const restored = unprojectPositionInChartRegion(ATLAS, 0, point);
    assert.ok(distance(restored, position) < 1e-10);
  }
  const south = projectPositionInChartRegion(ATLAS, 0, direction(10, 5));
  const north = projectPositionInChartRegion(ATLAS, 0, direction(11, 5));
  assert.ok(Math.abs(south.x - north.x) < 1e-12);
  assert.ok(north.y < south.y, "North must always point toward the top of a chart sheet");
});

test("a live chart sheet cannot move any tile that was already drawn", () => {
  const positions = new Map([[7, { x: 10, y: 20 }]]);
  synchronizeChartSheetPositions(positions, [
    { id: 7, layoutX: 10, layoutY: 20 },
    { id: 8, layoutX: 30, layoutY: 40 }
  ]);
  assert.deepEqual(positions.get(8), { x: 30, y: 40 });
  assert.throws(
    () => synchronizeChartSheetPositions(positions, [{ id: 7, layoutX: 11, layoutY: 20 }]),
    /changed immutable tile 7/
  );
});

test("Lisbon can circumnavigate without opening a chart message", async (t) => {
  const [atlasData, earth] = await Promise.all([
    readJson("../../../examples/globe-demo/public/chart-seam-atlas-7.json"),
    readJson("../../../examples/globe-demo/public/earth-globe-cache-7.json")
  ]);
  const atlas = parseChartSeamAtlas(atlasData, {
    subdivisions: earth.subdivisions,
    earthVersion: earth.version
  });
  const graph = buildGeodesicGraph(earth.subdivisions);
  const directionIndex = createDirectionIndex(graph);
  const earthRows = applyManualTerrainOverrides(earth.tiles, earth.subdivisions);
  const waterMask = Uint8Array.from(earthRows, (row) => isWaterSurfaceRow(row) ? 1 : 0);
  const waterClearance = waterClearanceFromLand(graph, waterMask, 12);
  const route = sampledRoute([
    [38.72, -9.14],
    [25, -22],
    [0, -28],
    [-34, 18],
    [-24, 58],
    [-18, 95],
    [-18, 135],
    [-20, 170],
    [-18, -150],
    [-15, -112],
    [-8, -80],
    [4, -48],
    [26, -28],
    [38.72, -9.14]
  ], 0.25);

  let activeRegionId = chartSeamRegionForPosition(atlas, route[0]);
  let pendingRegionId = null;
  let hiddenOceanChanges = 0;
  const messageOpens = 0;
  let maximumProjectedNeighborDistancePx = 0;
  for (const position of route) {
    const candidate = chartSeamTransitionTarget(atlas, activeRegionId, position);
    if (candidate !== null) pendingRegionId = chartSeamRegionForPosition(atlas, position);
    const tileId = findNearestTileId(graph, directionIndex, position);
    if (pendingRegionId !== null && waterMask[tileId] && waterClearance[tileId] >= 12) {
      activeRegionId = pendingRegionId;
      pendingRegionId = null;
      hiddenOceanChanges++;
    }
    for (const neighborId of graph.neighbors[tileId]) {
      const pa = projectPositionInChartRegion(atlas, activeRegionId, graphPosition(graph, tileId));
      const pb = projectPositionInChartRegion(atlas, activeRegionId, graphPosition(graph, neighborId));
      maximumProjectedNeighborDistancePx = Math.max(
        maximumProjectedNeighborDistancePx,
        Math.hypot(pa.x - pb.x, pa.y - pb.y) * 2450
      );
    }
  }

  t.diagnostic(
    `${hiddenOceanChanges} hidden ocean sheet changes, ${messageOpens} messages, ` +
    `${maximumProjectedNeighborDistancePx.toFixed(1)}px maximum neighboring-center distance`
  );
  assert.ok(hiddenOceanChanges >= 4, "The route must exercise several atlas sheets");
  assert.equal(messageOpens, 0);
  assert.equal(pendingRegionId, null, "The returning Atlantic leg must settle onto its final sheet");
  assert.ok(
    maximumProjectedNeighborDistancePx <= 40,
    `Fixed sheets must not tear neighboring tiles apart (${maximumProjectedNeighborDistancePx}px)`
  );
});

test("fixed sheets keep Mediterranean, Scandinavia, Argentina, and Smolensk traversals intact", async (t) => {
  const [atlasData, earth] = await Promise.all([
    readJson("../../../examples/globe-demo/public/chart-seam-atlas-7.json"),
    readJson("../../../examples/globe-demo/public/earth-globe-cache-7.json")
  ]);
  const atlas = parseChartSeamAtlas(atlasData, {
    subdivisions: earth.subdivisions,
    earthVersion: earth.version
  });
  const graph = buildGeodesicGraph(earth.subdivisions);
  const directionIndex = createDirectionIndex(graph);
  const traversals = new Map([
    ["Mediterranean", [[36, -6], [36, 10], [37, 24], [32, 32]]],
    ["Scandinavia", [[55, 10], [62, 8], [70, 20]]],
    ["Argentina", [[-55, -68], [-42, -63], [-23, -58]]],
    ["Smolensk", [[54.7, 20], [55, 26], [54.8, 32]]]
  ]);
  for (const [label, waypoints] of traversals) {
    const route = sampledRoute(waypoints, 0.2);
    const activeRegionId = chartSeamRegionForPosition(atlas, route[0]);
    let maximum = 0;
    const positions = new Map();
    for (const position of route) {
      const tileId = findNearestTileId(graph, directionIndex, position);
      const projectedTiles = [tileId, ...graph.neighbors[tileId]].map((id) => {
        const point = projectPositionInChartRegion(atlas, activeRegionId, graphPosition(graph, id));
        return { id, layoutX: Math.round(point.x * 2450), layoutY: Math.round(point.y * 2450) };
      });
      synchronizeChartSheetPositions(positions, projectedTiles);
      const center = positions.get(tileId);
      for (const neighborId of graph.neighbors[tileId]) {
        const neighbor = positions.get(neighborId);
        maximum = Math.max(maximum, Math.hypot(center.x - neighbor.x, center.y - neighbor.y));
      }
    }
    t.diagnostic(`${label}: ${maximum.toFixed(1)}px maximum neighboring-center distance`);
    assert.ok(maximum <= 40, `${label} traversal opened a ${maximum}px chart tear`);
  }
});

async function readJson(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, import.meta.url), "utf8"));
}

function graphPosition(graph, tileId) {
  const offset = tileId * 3;
  return [graph.centers[offset], graph.centers[offset + 1], graph.centers[offset + 2]];
}

function waterClearanceFromLand(graph, waterMask, maximumDepth) {
  const distance = new Uint8Array(graph.tileCount);
  distance.fill(maximumDepth);
  const queue = [];
  for (let tileId = 0; tileId < graph.tileCount; tileId++) {
    if (waterMask[tileId]) continue;
    distance[tileId] = 0;
    queue.push(tileId);
  }
  for (let head = 0; head < queue.length; head++) {
    const tileId = queue[head];
    const nextDistance = distance[tileId] + 1;
    if (nextDistance >= maximumDepth) continue;
    for (const neighborId of graph.neighbors[tileId]) {
      if (distance[neighborId] <= nextDistance) continue;
      distance[neighborId] = nextDistance;
      queue.push(neighborId);
    }
  }
  return distance;
}

function sampledRoute(waypoints, stepDeg) {
  const route = [];
  for (let index = 1; index < waypoints.length; index++) {
    const from = direction(...waypoints[index - 1]);
    const to = direction(...waypoints[index]);
    const angle = Math.acos(Math.max(-1, Math.min(1, dot(from, to))));
    const steps = Math.max(1, Math.ceil(angle * 180 / Math.PI / stepDeg));
    for (let step = index === 1 ? 0 : 1; step <= steps; step++) {
      route.push(sphericalInterpolate(from, to, step / steps));
    }
  }
  return route;
}

function sphericalInterpolate(from, to, amount) {
  const angle = Math.acos(Math.max(-1, Math.min(1, dot(from, to))));
  if (angle < 1e-12) return from.slice();
  const sinAngle = Math.sin(angle);
  const fromWeight = Math.sin((1 - amount) * angle) / sinAngle;
  const toWeight = Math.sin(amount * angle) / sinAngle;
  const value = from.map((component, index) => component * fromWeight + to[index] * toWeight);
  const magnitude = Math.hypot(...value);
  return value.map((component) => component / magnitude);
}

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function distance(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

function direction(latitudeDeg, longitudeDeg) {
  const latitude = latitudeDeg * Math.PI / 180;
  const longitude = longitudeDeg * Math.PI / 180;
  return [
    Math.cos(latitude) * Math.cos(longitude),
    Math.sin(latitude),
    -Math.cos(latitude) * Math.sin(longitude)
  ];
}
