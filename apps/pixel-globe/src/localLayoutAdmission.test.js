import test from "node:test";
import assert from "node:assert/strict";
import {
  buildGeodesicGraph,
  createDirectionIndex,
  findNearestTileId,
  graphCenter,
  normalize3
} from "./geodesic.js";
import {
  admitProjectedTiles,
  refreshOffscreenElasticLayoutTiles,
  projectedViewportTileIds,
  retainLocalLayoutAnchor,
  viewportElasticCorrectionSupport
} from "./localLayoutAdmission.js";

const TRAVERSAL_SCREEN_W = 455;
const TRAVERSAL_SCREEN_H = 256;
const TRAVERSAL_MARGIN = 72;
const TRAVERSAL_PIXELS_PER_RADIAN = 620;

test("new tiles use their exact projected shape in the retained chart frame", () => {
  const positions = new Map([
    [0, { x: 0, y: 0 }],
    [3, { x: 100, y: 20 }]
  ]);
  const projectedById = new Map([
    [0, { x: 100, y: 80 }],
    [1, { x: 120, y: 90 }],
    [2, { x: 180, y: 110 }],
    [3, { x: 200, y: 100 }]
  ]);

  admitProjectedTiles({
    positions,
    projectedById,
    pendingIds: [1, 2],
    anchorId: 0,
    ...admissionTopology(4, [[0, 1], [0, 2], [2, 3]])
  });

  assert.deepEqual(positions.get(0), { x: 0, y: 0 });
  assert.deepEqual(positions.get(3), { x: 100, y: 20 });
  assert.deepEqual(positions.get(1), { x: 20, y: 10 });
  assert.deepEqual(positions.get(2), { x: 80, y: 30 });
  assert.equal(positions.get(2).x - positions.get(1).x, 60);
  assert.equal(positions.get(2).y - positions.get(1).y, 20);
});

test("layout translation does not alter the projected shape with one retained tile", () => {
  const positions = new Map([[0, { x: 40, y: 60 }]]);
  const projectedById = new Map([
    [0, { x: 10, y: 20 }],
    [1, { x: 100, y: 120 }],
    [2, { x: 130, y: 150 }]
  ]);

  const admitted = admitProjectedTiles({
    positions,
    projectedById,
    pendingIds: [1, 2],
    anchorId: 0,
    ...admissionTopology(3, [[0, 1], [1, 2]])
  });

  assert.equal(admitted, 2);
  assert.deepEqual(positions.get(0), { x: 40, y: 60 });
  assert.deepEqual(positions.get(1), { x: 130, y: 160 });
  assert.deepEqual(positions.get(2), { x: 160, y: 190 });
});

test("high-latitude tangent frame rotation cannot tear adjacent tiles apart", () => {
  const angle = 28 * Math.PI / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const rotate = ({ x, y }) => ({
    x: x * cos - y * sin,
    y: x * sin + y * cos
  });
  const retainedChartPoints = new Map([
    [0, { x: 0, y: 0 }],
    [1, { x: 24, y: 0 }],
    [2, { x: 0, y: 24 }],
    [3, { x: -24, y: 0 }]
  ]);
  const projectedById = new Map();
  for (const [id, point] of retainedChartPoints.entries()) {
    projectedById.set(id, rotate(point));
  }
  projectedById.set(4, rotate({ x: 48, y: 0 }));

  admitProjectedTiles({
    positions: retainedChartPoints,
    projectedById,
    pendingIds: [4],
    anchorId: 0,
    ...admissionTopology(5, [[0, 1], [0, 2], [0, 3], [1, 4]])
  });

  assert.deepEqual(retainedChartPoints.get(4), { x: 48, y: 0 });
  assert.equal(
    Math.hypot(
      retainedChartPoints.get(4).x - retainedChartPoints.get(1).x,
      retainedChartPoints.get(4).y - retainedChartPoints.get(1).y
    ),
    24
  );
});

test("uniform ocean admits a subpixel-safe north-up correction", () => {
  const points = rotatedAdmissionPoints(2);
  admitProjectedTiles({
    positions: points.positions,
    projectedById: points.projectedById,
    pendingIds: [2],
    anchorId: 0,
    ...admissionTopology(3, [[0, 1], [1, 2]], 0)
  });

  assert.deepEqual(points.positions.get(2), { x: 48, y: 1 });
});

test("the same correction keeps protected geography rigidly attached", () => {
  const points = rotatedAdmissionPoints(2);
  admitProjectedTiles({
    positions: points.positions,
    projectedById: points.projectedById,
    pendingIds: [2],
    anchorId: 0,
    ...admissionTopology(3, [[0, 1], [1, 2]], 255)
  });

  assert.deepEqual(points.positions.get(2), { x: 48, y: 0 });
});

test("buffer protection permits a partial north-up correction", () => {
  const elastic = rotatedAdmissionPoints(10);
  const buffered = rotatedAdmissionPoints(10);
  const rigid = rotatedAdmissionPoints(10);
  const elasticTopology = admissionTopology(3, [[0, 1], [1, 2]], 0);
  const bufferedTopology = admissionTopology(3, [[0, 1], [1, 2]], 0);
  bufferedTopology.protectionById[2] = 128;
  const rigidTopology = admissionTopology(3, [[0, 1], [1, 2]], 255);

  for (const [points, topology] of [
    [elastic, elasticTopology],
    [buffered, bufferedTopology],
    [rigid, rigidTopology]
  ]) {
    admitProjectedTiles({
      positions: points.positions,
      projectedById: points.projectedById,
      pendingIds: [2],
      anchorId: 0,
      ...topology
    });
  }

  assert.ok(buffered.positions.get(2).y > rigid.positions.get(2).y);
  assert.ok(buffered.positions.get(2).y < elastic.positions.get(2).y);
});

test("an ocean-only viewport fully resets north-up over one screen of movement", () => {
  const result = simulateOceanViewportTurnover({ protectedViewport: false });

  assert.ok(
    Math.abs(result.initialRotationDeg) >= 7,
    `Ocean reset regression did not begin rotated (${result.initialRotationDeg.toFixed(2)} degrees)`
  );
  assert.ok(
    Math.abs(result.finalRotationDeg) <= 1,
    `Ocean viewport retained ${result.finalRotationDeg.toFixed(2)} degrees after a full turnover`
  );
  assert.ok(
    result.finalRmsError <= 6,
    `Ocean viewport retained ${result.finalRmsError.toFixed(2)}px RMS distortion`
  );
});

test("a finite Atlantic-like ocean crossing keeps readmitting hidden water toward north-up", () => {
  const result = simulateFiniteOceanCrossing({ refreshOffscreenEachStep: true });
  const stalePreload = simulateFiniteOceanCrossing({ refreshOffscreenEachStep: false });

  assert.ok(
    Math.abs(result.initialRotationDeg) >= 13,
    `Finite ocean reset did not begin substantially rotated (${result.initialRotationDeg.toFixed(2)} degrees)`
  );
  assert.ok(
    result.elasticSteps >= 12,
    `Finite ocean crossing exposed too little elastic water (${result.elasticSteps} steps)`
  );
  assert.ok(
    Math.abs(result.exitRotationDeg) <= 2,
    `Finite ocean crossing exited open water at ${result.exitRotationDeg.toFixed(2)} degrees`
  );
  assert.ok(
    Math.abs(stalePreload.exitRotationDeg) >= Math.abs(result.exitRotationDeg) + 3,
    `One-time preload cleanup unexpectedly recovered as well as repeated cleanup ` +
      `(${stalePreload.exitRotationDeg.toFixed(2)} vs ${result.exitRotationDeg.toFixed(2)} degrees)`
  );
});

test("protected geography does not use the full ocean north-up reset", () => {
  const result = simulateOceanViewportTurnover({ protectedViewport: true });

  assert.ok(
    Math.abs(result.finalRotationDeg) >= 6,
    `Protected viewport unexpectedly reset to ${result.finalRotationDeg.toFixed(2)} degrees`
  );
});

test("a protected island does not veto correction supported by surrounding elastic water", () => {
  const protectionById = new Uint8Array(5);
  protectionById[2] = 255;
  const projectedTiles = [
    { id: 0, x: 20, y: 20 },
    { id: 1, x: 80, y: 40 },
    { id: 2, x: 50, y: 30 },
    { id: 3, x: 20, y: 50 },
    { id: 4, x: 80, y: 10 }
  ];

  const support = viewportElasticCorrectionSupport({
    projectedTiles,
    protectionById,
    viewportWidth: 100,
    viewportHeight: 60,
    tileVisualRadius: 10
  });

  assert.equal(support.correctionActive, true);
  assert.deepEqual([...support.elasticTileIds], [0, 1, 3, 4]);
  assert.equal(support.viewportTileIds.has(2), true);
});

test("a viewport without a spanning elastic region cannot correct north-up", () => {
  const protectionById = new Uint8Array([255, 0, 0]);
  const support = viewportElasticCorrectionSupport({
    projectedTiles: [
      { id: 0, x: 20, y: 20 },
      { id: 1, x: 45, y: 30 },
      { id: 2, x: 55, y: 30 }
    ],
    protectionById,
    viewportWidth: 100,
    viewportHeight: 60,
    tileVisualRadius: 10
  });

  assert.equal(support.correctionActive, false);
});

test("a newly centered tile is retained before an elastic north-up correction", () => {
  const positions = new Map([[1, { x: -40, y: 0 }]]);
  const projectedTiles = [
    { id: 1, x: -80, y: 50 },
    { id: 2, x: 50, y: 50 }
  ];
  const protectionById = new Uint8Array(3);

  assert.equal(retainLocalLayoutAnchor({
    positions,
    anchorId: 2,
    viewX: 50.4,
    viewY: 49.6
  }), true);
  assert.deepEqual(positions.get(2), { x: 50, y: 50 });
  assert.doesNotThrow(() => refreshOffscreenElasticLayoutTiles({
    positions,
    projectedTiles,
    protectionById,
    viewportWidth: 100,
    viewportHeight: 100,
    tileVisualRadius: 18,
    anchorId: 2
  }));
  assert.deepEqual(positions.get(2), { x: 50, y: 50 });
});

test("the offscreen preload margin cannot steer the visible frame fit", () => {
  const positions = new Map([
    [0, { x: 0, y: 0 }],
    [1, { x: 24, y: 0 }],
    [2, { x: 200, y: 100 }]
  ]);
  const projectedById = new Map([
    [0, { x: 0, y: 0 }],
    [1, { x: 24, y: 0 }],
    [2, { x: 240, y: 0 }],
    [3, { x: 48, y: 0 }]
  ]);

  admitProjectedTiles({
    positions,
    projectedById,
    pendingIds: [3],
    anchorId: 0,
    registrationIds: new Set([0, 1]),
    ...admissionTopology(4, [[0, 1], [0, 2], [1, 3]])
  });

  assert.deepEqual(positions.get(3), { x: 48, y: 0 });
});

test("successive high-latitude chart rebuilds keep newly entering neighbors attached", () => {
  const registered = simulateHighLatitudeTraversal(admitProjectedTiles);
  const translationOnly = simulateHighLatitudeTraversal(admitWithTranslationOnly);

  assert.ok(
    registered.admittedTotal > 500,
    `Expected a moving chart to admit many tiles, got ${registered.admittedTotal}`
  );
  assert.ok(
    registered.maxNeighborDistance < 31,
    `High-latitude traversal tore a neighboring tile edge to ${registered.maxNeighborDistance.toFixed(2)}px`
  );
  assert.ok(
    registered.maxNeighborStretch < 1.2,
    `High-latitude traversal stretched a neighboring tile edge by ${registered.maxNeighborStretch.toFixed(3)}x`
  );
  assert.ok(
    translationOnly.maxNeighborDistance > registered.maxNeighborDistance + 10,
    "Traversal regression must detect the former translation-only frame mismatch"
  );
});

test("one hundred high-latitude circuits keep admission drift bounded", () => {
  const result = simulateRepeatedCircuit({
    centerRowForPhase: () => 0,
    frameRotationForPhase: (phase) => phase * Math.sin(62 * Math.PI / 180)
  });

  assertRepeatedCircuitIsStable(result, "62-degree latitude circuit");
});

test("one hundred oblique great-circle circuits keep admission drift bounded", () => {
  const result = simulateRepeatedCircuit({
    centerRowForPhase: (phase) => Math.round(Math.sin(phase) * 18),
    frameRotationForPhase: (phase) => Math.sin(phase) * 0.75 + Math.sin(phase * 2) * 0.2
  });

  assertRepeatedCircuitIsStable(result, "52-degree oblique circuit");
});

test("a screen-spaced island chain permits north-up correction for one hundred circuits", () => {
  const result = simulateIslandChainCircuits();
  const settled = result.circuitMetrics[9];
  const last = result.circuitMetrics.at(-1);

  assert.equal(
    result.correctionSteps,
    result.totalSteps,
    "Recurring island protection unexpectedly vetoed elastic correction"
  );
  assert.equal(
    result.fullyElasticSteps,
    0,
    "Island-chain regression accidentally provided an all-elastic viewport"
  );
  assert.equal(
    result.visibleTilePositionChanges,
    0,
    "Elastic correction moved a tile that was already visible"
  );
  assert.ok(
    last.maxRotationDeg <= 3.5,
    `Island-chain chart reached ${last.maxRotationDeg.toFixed(2)} degrees after 100 circuits; ` +
      `samples ${[0, 1, 2, 9, 24, 49, 74, 99].map((index) => (
        result.circuitMetrics[index].maxRotationDeg.toFixed(1)
      )).join("/")}`
  );
  assert.ok(
    last.maxRotationDeg <= settled.maxRotationDeg + 0.5,
    `Island-chain rotation grew from ${settled.maxRotationDeg.toFixed(2)} to ` +
      `${last.maxRotationDeg.toFixed(2)} degrees`
  );
  assert.ok(
    last.maxRmsError <= settled.maxRmsError + 1,
    `Island-chain distortion grew from ${settled.maxRmsError.toFixed(2)}px to ` +
      `${last.maxRmsError.toFixed(2)}px`
  );
});

function simulateHighLatitudeTraversal(admitTiles) {
  const graph = buildGeodesicGraph(5);
  const directionIndex = createDirectionIndex(graph);
  const protectionById = new Uint8Array(graph.tileCount);
  protectionById.fill(255);
  const positions = new Map();
  let viewX = 0;
  let viewY = 0;
  let previousDirection = directionAt(63.9, -25);
  let camera = northUpFrame(previousDirection);
  let admittedTotal = 0;
  let maxNeighborDistance = 0;
  let maxNeighborStretch = 1;

  for (let step = 0; step <= 80; step++) {
    const direction = directionAt(63.9, -25 + step * 0.35);
    if (step > 0) {
      const delta = [
        direction[0] - previousDirection[0],
        direction[1] - previousDirection[1],
        direction[2] - previousDirection[2]
      ];
      viewX += dot3(delta, camera.right) * TRAVERSAL_PIXELS_PER_RADIAN;
      viewY -= dot3(delta, camera.up) * TRAVERSAL_PIXELS_PER_RADIAN;
      camera = northUpFrame(direction);
    }

    const centerId = findNearestTileId(graph, directionIndex, direction);
    const projectedVisible = collectTraversalTiles(graph, camera);
    const projectedById = new Map(projectedVisible.map((point) => [point.id, point]));
    const pendingIds = projectedVisible
      .map((point) => point.id)
      .filter((id) => !positions.has(id));
    if (!positions.has(centerId)) {
      positions.set(centerId, { x: Math.round(viewX), y: Math.round(viewY) });
      const pendingIndex = pendingIds.indexOf(centerId);
      if (pendingIndex >= 0) pendingIds.splice(pendingIndex, 1);
    }

    admittedTotal += admitTiles({
      positions,
      projectedById,
      pendingIds,
      anchorId: centerId,
      neighborsById: graph.neighbors,
      protectionById
    });
    const visibleIds = new Set(projectedById.keys());
    for (const id of positions.keys()) {
      if (!visibleIds.has(id)) positions.delete(id);
    }

    for (const [id, position] of positions.entries()) {
      for (const neighborId of graph.neighbors[id]) {
        const neighbor = positions.get(neighborId);
        if (!neighbor) continue;
        maxNeighborDistance = Math.max(
          maxNeighborDistance,
          Math.hypot(neighbor.x - position.x, neighbor.y - position.y)
        );
        const projected = projectedById.get(id);
        const projectedNeighbor = projectedById.get(neighborId);
        const projectedDistance = Math.hypot(
          projectedNeighbor.x - projected.x,
          projectedNeighbor.y - projected.y
        );
        const visualDistance = Math.hypot(
          neighbor.x - position.x,
          neighbor.y - position.y
        );
        maxNeighborStretch = Math.max(maxNeighborStretch, visualDistance / projectedDistance);
      }
    }
    previousDirection = direction;
  }

  return { admittedTotal, maxNeighborDistance, maxNeighborStretch };
}

function simulateRepeatedCircuit({ centerRowForPhase, frameRotationForPhase }) {
  const columns = 360;
  const rows = 48;
  const tileSpacingX = 24;
  const tileSpacingY = 21;
  const tileCount = columns * rows;
  const neighborsById = torusGridNeighbors(columns, rows);
  const protectionById = new Uint8Array(tileCount);
  for (let row = 0; row < rows; row++) {
    for (const protectedColumn of [0, 90, 180, 270]) {
      for (let offset = -1; offset <= 1; offset++) {
        protectionById[gridTileId(protectedColumn + offset, row, columns, rows)] = 255;
      }
    }
  }

  const positions = new Map();
  const stepsPerCircuit = columns;
  const totalSteps = stepsPerCircuit * 100;
  let admittedTotal = 0;
  let maxRotationDeg = 0;
  let maxRotationStep = 0;
  let maxRmsError = 0;
  let maxProtectedEdgeStretch = 0;
  let protectedEdgeSamples = 0;
  let anchorSeeds = 0;
  const circuitMetrics = Array.from({ length: 100 }, () => ({
    maxRotationDeg: 0,
    maxRmsError: 0,
    maxProtectedEdgeStretch: 0
  }));

  for (let step = 0; step < totalSteps; step++) {
    const phase = step * Math.PI * 2 / stepsPerCircuit;
    const centerColumn = step;
    const centerRow = centerRowForPhase(phase);
    const centerId = gridTileId(centerColumn, centerRow, columns, rows);
    const frameRotation = frameRotationForPhase(phase);
    const cos = Math.cos(frameRotation);
    const sin = Math.sin(frameRotation);
    const projectedById = new Map();
    for (let rowOffset = -3; rowOffset <= 3; rowOffset++) {
      for (let columnOffset = -4; columnOffset <= 4; columnOffset++) {
        const id = gridTileId(
          centerColumn + columnOffset,
          centerRow + rowOffset,
          columns,
          rows
        );
        const x = columnOffset * tileSpacingX;
        const y = rowOffset * tileSpacingY;
        projectedById.set(id, {
          x: Math.round(x * cos - y * sin),
          y: Math.round(x * sin + y * cos)
        });
      }
    }
    const pendingIds = [...projectedById.keys()].filter((id) => !positions.has(id));
    if (!positions.has(centerId)) {
      anchorSeeds++;
      positions.set(centerId, {
        x: centerColumn * tileSpacingX,
        y: centerRow * tileSpacingY
      });
      const pendingIndex = pendingIds.indexOf(centerId);
      if (pendingIndex >= 0) pendingIds.splice(pendingIndex, 1);
    }

    admittedTotal += admitProjectedTiles({
      positions,
      projectedById,
      pendingIds,
      anchorId: centerId,
      neighborsById,
      protectionById
    });
    const visibleIds = new Set(projectedById.keys());
    for (const id of positions.keys()) {
      if (!visibleIds.has(id)) positions.delete(id);
    }

    const frameError = measureVisibleFrameError(positions, projectedById, centerId);
    const circuitMetric = circuitMetrics[Math.floor(step / stepsPerCircuit)];
    circuitMetric.maxRotationDeg = Math.max(
      circuitMetric.maxRotationDeg,
      Math.abs(frameError.rotationDeg)
    );
    circuitMetric.maxRmsError = Math.max(circuitMetric.maxRmsError, frameError.rmsError);
    if (Math.abs(frameError.rotationDeg) > maxRotationDeg) {
      maxRotationDeg = Math.abs(frameError.rotationDeg);
      maxRotationStep = step;
    }
    maxRmsError = Math.max(maxRmsError, frameError.rmsError);
    for (const [id, position] of positions.entries()) {
      for (const neighborId of neighborsById[id]) {
        if (neighborId <= id || !protectionById[id] || !protectionById[neighborId]) continue;
        const neighbor = positions.get(neighborId);
        const projected = projectedById.get(id);
        const projectedNeighbor = projectedById.get(neighborId);
        if (!neighbor || !projected || !projectedNeighbor) continue;
        const visualDistance = Math.hypot(neighbor.x - position.x, neighbor.y - position.y);
        const projectedDistance = Math.hypot(
          projectedNeighbor.x - projected.x,
          projectedNeighbor.y - projected.y
        );
        maxProtectedEdgeStretch = Math.max(
          maxProtectedEdgeStretch,
          Math.abs(visualDistance / projectedDistance - 1)
        );
        circuitMetric.maxProtectedEdgeStretch = Math.max(
          circuitMetric.maxProtectedEdgeStretch,
          Math.abs(visualDistance / projectedDistance - 1)
        );
        protectedEdgeSamples++;
      }
    }
  }

  return {
    admittedTotal,
    maxRotationDeg,
    maxRotationStep,
    maxRmsError,
    maxProtectedEdgeStretch,
    protectedEdgeSamples,
    anchorSeeds,
    circuitMetrics
  };
}

function simulateIslandChainCircuits() {
  const columns = 120;
  const rows = 15;
  const centerRow = 7;
  const tileSpacingX = 24;
  const tileSpacingY = 21;
  const viewportWidth = 240;
  const viewportHeight = 126;
  const tileVisualRadius = 12;
  const preloadHalfColumns = 15;
  const preloadHalfRows = 5;
  const stepsPerCircuit = columns;
  const totalSteps = stepsPerCircuit * 100;
  const neighborsById = torusGridNeighbors(columns, rows);
  const protectionById = new Uint8Array(columns * rows);
  for (let islandColumn = 0; islandColumn < columns; islandColumn += 12) {
    for (let rowOffset = -3; rowOffset <= 3; rowOffset++) {
      for (let columnOffset = -3; columnOffset <= 3; columnOffset++) {
        const distance = Math.abs(rowOffset) + Math.abs(columnOffset);
        if (distance > 3) continue;
        const protection = distance <= 1 ? 255 : distance === 2 ? 192 : 128;
        const id = gridTileId(
          islandColumn + columnOffset,
          centerRow + rowOffset,
          columns,
          rows
        );
        protectionById[id] = Math.max(protectionById[id], protection);
      }
    }
  }

  const projectedWindow = (step) => {
    const projectedById = new Map();
    const phase = step * Math.PI * 2 / stepsPerCircuit;
    const rotation = Math.sin(phase) * 0.2 + Math.sin(phase * 2) * 0.05;
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    for (let rowOffset = -preloadHalfRows; rowOffset <= preloadHalfRows; rowOffset++) {
      for (let columnOffset = -preloadHalfColumns; columnOffset <= preloadHalfColumns; columnOffset++) {
        const id = gridTileId(step + columnOffset, centerRow + rowOffset, columns, rows);
        const x = columnOffset * tileSpacingX;
        const y = rowOffset * tileSpacingY;
        projectedById.set(id, {
          x: viewportWidth / 2 + x * cos - y * sin,
          y: viewportHeight / 2 + x * sin + y * cos
        });
      }
    }
    return projectedById;
  };

  const positions = new Map();
  let projectedById = projectedWindow(0);
  const initialRotation = 12 * Math.PI / 180;
  const initialCos = Math.cos(initialRotation);
  const initialSin = Math.sin(initialRotation);
  for (const [id, projected] of projectedById.entries()) {
    const x = projected.x - viewportWidth / 2;
    const y = projected.y - viewportHeight / 2;
    positions.set(id, {
      x: Math.round(x * initialCos - y * initialSin),
      y: Math.round(x * initialSin + y * initialCos)
    });
  }

  let correctionSteps = 0;
  let fullyElasticSteps = 0;
  let visibleTilePositionChanges = 0;
  const circuitMetrics = Array.from({ length: 100 }, () => ({
    maxRotationDeg: 0,
    maxRmsError: 0
  }));

  for (let step = 1; step <= totalSteps; step++) {
    projectedById = projectedWindow(step);
    const projectedTiles = [...projectedById.entries()].map(([id, point]) => ({ id, ...point }));
    const support = viewportElasticCorrectionSupport({
      projectedTiles,
      protectionById,
      viewportWidth,
      viewportHeight,
      tileVisualRadius
    });
    const anchorId = gridTileId(step, centerRow, columns, rows);
    assert.equal(
      positions.has(anchorId),
      true,
      `Island-chain traversal lost its preloaded anchor at step ${step}`
    );
    const visibleBefore = new Map();
    for (const id of support.viewportTileIds) {
      const position = positions.get(id);
      if (position) visibleBefore.set(id, { ...position });
    }

    if (support.correctionActive) {
      correctionSteps++;
      refreshOffscreenElasticLayoutTiles({
        positions,
        projectedTiles,
        protectionById,
        viewportWidth,
        viewportHeight,
        tileVisualRadius,
        anchorId
      });
    }
    if ([...support.viewportTileIds].every((id) => protectionById[id] === 0)) {
      fullyElasticSteps++;
    }
    for (const [id, before] of visibleBefore.entries()) {
      const after = positions.get(id);
      if (!after || after.x !== before.x || after.y !== before.y) visibleTilePositionChanges++;
    }

    const pendingIds = [...projectedById.keys()].filter((id) => !positions.has(id));
    admitProjectedTiles({
      positions,
      projectedById,
      pendingIds,
      anchorId,
      neighborsById,
      protectionById,
      registrationIds: support.correctionActive
        ? support.elasticTileIds
        : support.viewportTileIds,
      correctElasticTilesNorthUp: support.correctionActive
    });
    const retainedIds = new Set(projectedById.keys());
    for (const id of positions.keys()) {
      if (!retainedIds.has(id)) positions.delete(id);
    }

    const measuredPositions = new Map();
    for (const id of support.elasticTileIds) {
      const position = positions.get(id);
      if (position) measuredPositions.set(id, position);
    }
    const frame = measureCenteredFrameError(measuredPositions, projectedById);
    const metric = circuitMetrics[Math.min(99, Math.floor((step - 1) / stepsPerCircuit))];
    metric.maxRotationDeg = Math.max(metric.maxRotationDeg, Math.abs(frame.rotationDeg));
    metric.maxRmsError = Math.max(metric.maxRmsError, frame.rmsError);
  }

  return {
    correctionSteps,
    fullyElasticSteps,
    totalSteps,
    visibleTilePositionChanges,
    circuitMetrics
  };
}

function simulateOceanViewportTurnover({ protectedViewport }) {
  const columns = 50;
  const rows = 7;
  const tileSpacingX = 24;
  const tileSpacingY = 21;
  const viewportWidth = 240;
  const viewportHeight = 126;
  const tileVisualRadius = 12;
  const viewportHalfColumns = 5;
  const preloadHalfColumns = 11;
  const neighborsById = torusGridNeighbors(columns, rows);
  const protectionById = new Uint8Array(columns * rows);
  if (protectedViewport) protectionById.fill(255);
  const positions = new Map();
  const rotation = 8 * Math.PI / 180;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);

  const projectedWindow = (centerColumn) => {
    const projectedById = new Map();
    for (let row = 0; row < rows; row++) {
      for (let columnOffset = -preloadHalfColumns; columnOffset <= preloadHalfColumns; columnOffset++) {
        const column = centerColumn + columnOffset;
        const id = gridTileId(column, row, columns, rows);
        projectedById.set(id, {
          x: viewportWidth / 2 + columnOffset * tileSpacingX,
          y: viewportHeight / 2 + (row - 3) * tileSpacingY
        });
      }
    }
    return projectedById;
  };

  let projectedById = projectedWindow(5);
  for (const [id, projected] of projectedById.entries()) {
    positions.set(id, {
      x: Math.round(projected.x * cos - projected.y * sin),
      y: Math.round(projected.x * sin + projected.y * cos)
    });
  }
  let anchorId = gridTileId(5, 3, columns, rows);
  const initial = measureVisibleFrameError(positions, projectedById, anchorId);
  if (!protectedViewport) {
    refreshOffscreenElasticLayoutTiles({
      positions,
      projectedTiles: [...projectedById.entries()].map(([id, point]) => ({ id, ...point })),
      protectionById,
      viewportWidth,
      viewportHeight,
      tileVisualRadius,
      anchorId
    });
  }

  const finalCenterColumn = 5 + viewportHalfColumns * 2 + 2;
  for (let centerColumn = 6; centerColumn <= finalCenterColumn; centerColumn++) {
    projectedById = projectedWindow(centerColumn);
    anchorId = gridTileId(centerColumn, 3, columns, rows);
    const pendingIds = [...projectedById.keys()].filter((id) => !positions.has(id));
    admitProjectedTiles({
      positions,
      projectedById,
      pendingIds,
      anchorId,
      neighborsById,
      protectionById,
      registrationIds: projectedViewportTileIds({
        projectedTiles: [...projectedById.entries()].map(([id, point]) => ({ id, ...point })),
        protectionById,
        viewportWidth,
        viewportHeight,
        tileVisualRadius
      }),
      correctElasticTilesNorthUp: !protectedViewport
    });
    const visibleIds = new Set(projectedById.keys());
    for (const id of positions.keys()) {
      if (!visibleIds.has(id)) positions.delete(id);
    }
  }

  const final = measureVisibleFrameError(positions, projectedById, anchorId);
  return {
    initialRotationDeg: initial.rotationDeg,
    finalRotationDeg: final.rotationDeg,
    finalRmsError: final.rmsError
  };
}

function simulateFiniteOceanCrossing({ refreshOffscreenEachStep }) {
  const columns = 80;
  const rows = 7;
  const tileSpacingX = 24;
  const tileSpacingY = 21;
  const viewportWidth = 240;
  const viewportHeight = 126;
  const tileVisualRadius = 12;
  const preloadHalfColumns = 15;
  const elasticStartColumn = 20;
  const elasticEndColumn = 52;
  const neighborsById = torusGridNeighbors(columns, rows);
  const protectionById = new Uint8Array(columns * rows);
  protectionById.fill(255);
  for (let row = 0; row < rows; row++) {
    for (let column = elasticStartColumn; column <= elasticEndColumn; column++) {
      protectionById[gridTileId(column, row, columns, rows)] = 0;
    }
  }
  const positions = new Map();
  const rotation = 14 * Math.PI / 180;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);

  const projectedWindow = (centerColumn) => {
    const projectedById = new Map();
    // A north-up tangent frame rotates continuously while travelling east at
    // nonzero latitude. Model that transport so this is a traversal test, not
    // merely a flat window sliding over a static grid.
    const frameRotation = (centerColumn - 8) * 0.65 * Math.PI / 180;
    const frameCos = Math.cos(frameRotation);
    const frameSin = Math.sin(frameRotation);
    for (let row = 0; row < rows; row++) {
      for (let columnOffset = -preloadHalfColumns; columnOffset <= preloadHalfColumns; columnOffset++) {
        const column = centerColumn + columnOffset;
        const id = gridTileId(column, row, columns, rows);
        const x = columnOffset * tileSpacingX;
        const y = (row - 3) * tileSpacingY;
        projectedById.set(id, {
          x: viewportWidth / 2 + x * frameCos - y * frameSin,
          y: viewportHeight / 2 + x * frameSin + y * frameCos
        });
      }
    }
    return projectedById;
  };

  let projectedById = projectedWindow(8);
  for (const [id, projected] of projectedById.entries()) {
    positions.set(id, {
      x: Math.round(projected.x * cos - projected.y * sin),
      y: Math.round(projected.x * sin + projected.y * cos)
    });
  }
  const initialAnchorId = gridTileId(8, 3, columns, rows);
  const initial = measureVisibleFrameError(positions, projectedById, initialAnchorId);
  let exitRotationDeg = initial.rotationDeg;
  let elasticSteps = 0;
  let resetActive = false;

  for (let centerColumn = 9; centerColumn <= 60; centerColumn++) {
    projectedById = projectedWindow(centerColumn);
    const projectedTiles = [...projectedById.entries()].map(([id, point]) => ({ id, ...point }));
    const viewportIds = projectedViewportTileIds({
      projectedTiles,
      protectionById,
      viewportWidth,
      viewportHeight,
      tileVisualRadius
    });
    const correctElasticTilesNorthUp = [...viewportIds].every((id) => protectionById[id] === 0);
    const anchorId = gridTileId(centerColumn, 3, columns, rows);
    retainLocalLayoutAnchor({
      positions,
      anchorId,
      viewX: viewportWidth / 2,
      viewY: viewportHeight / 2
    });
    if (correctElasticTilesNorthUp) {
      elasticSteps++;
    }
    if (correctElasticTilesNorthUp && (refreshOffscreenEachStep || !resetActive)) {
      refreshOffscreenElasticLayoutTiles({
        positions,
        projectedTiles,
        protectionById,
        viewportWidth,
        viewportHeight,
        tileVisualRadius,
        anchorId
      });
    }
    resetActive = correctElasticTilesNorthUp;
    const pendingIds = [...projectedById.keys()].filter((id) => !positions.has(id));
    admitProjectedTiles({
      positions,
      projectedById,
      pendingIds,
      anchorId,
      neighborsById,
      protectionById,
      registrationIds: viewportIds,
      correctElasticTilesNorthUp
    });
    const retainedIds = new Set(projectedById.keys());
    for (const id of positions.keys()) {
      if (!retainedIds.has(id)) positions.delete(id);
    }
    if (correctElasticTilesNorthUp) {
      const visiblePositions = new Map(
        [...positions.entries()].filter(([id]) => viewportIds.has(id))
      );
      const frame = measureVisibleFrameError(visiblePositions, projectedById, anchorId);
      exitRotationDeg = frame.rotationDeg;
    }
  }

  return {
    initialRotationDeg: initial.rotationDeg,
    exitRotationDeg,
    elasticSteps
  };
}

function torusGridNeighbors(columns, rows) {
  const neighbors = Array.from({ length: columns * rows }, () => []);
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const id = gridTileId(column, row, columns, rows);
      neighbors[id].push(
        gridTileId(column - 1, row, columns, rows),
        gridTileId(column + 1, row, columns, rows),
        gridTileId(column, row - 1, columns, rows),
        gridTileId(column, row + 1, columns, rows)
      );
    }
  }
  return neighbors;
}

function gridTileId(column, row, columns, rows) {
  return modulo(row, rows) * columns + modulo(column, columns);
}

function measureVisibleFrameError(positions, projectedById, anchorId) {
  const anchorPosition = positions.get(anchorId);
  const anchorProjected = projectedById.get(anchorId);
  let dotSum = 0;
  let crossSum = 0;
  const samples = [];
  for (const [id, position] of positions.entries()) {
    if (id === anchorId) continue;
    const projected = projectedById.get(id);
    if (!projected) continue;
    const projectedVector = {
      x: projected.x - anchorProjected.x,
      y: projected.y - anchorProjected.y
    };
    const layoutVector = {
      x: position.x - anchorPosition.x,
      y: position.y - anchorPosition.y
    };
    dotSum += projectedVector.x * layoutVector.x + projectedVector.y * layoutVector.y;
    crossSum += projectedVector.x * layoutVector.y - projectedVector.y * layoutVector.x;
    samples.push({ projectedVector, layoutVector });
  }
  const rotation = Math.atan2(crossSum, dotSum);
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  let squaredError = 0;
  for (const { projectedVector, layoutVector } of samples) {
    const expectedX = projectedVector.x * cos - projectedVector.y * sin;
    const expectedY = projectedVector.x * sin + projectedVector.y * cos;
    squaredError += (layoutVector.x - expectedX) ** 2 + (layoutVector.y - expectedY) ** 2;
  }
  return {
    rotationDeg: rotation * 180 / Math.PI,
    rmsError: samples.length > 0 ? Math.sqrt(squaredError / samples.length) : 0
  };
}

function measureCenteredFrameError(positions, projectedById) {
  const samples = [];
  let projectedCenterX = 0;
  let projectedCenterY = 0;
  let layoutCenterX = 0;
  let layoutCenterY = 0;
  for (const [id, position] of positions.entries()) {
    const projected = projectedById.get(id);
    if (!projected) continue;
    samples.push({ position, projected });
    projectedCenterX += projected.x;
    projectedCenterY += projected.y;
    layoutCenterX += position.x;
    layoutCenterY += position.y;
  }
  assert.ok(samples.length >= 2, "Centered frame measurement requires two retained samples");
  projectedCenterX /= samples.length;
  projectedCenterY /= samples.length;
  layoutCenterX /= samples.length;
  layoutCenterY /= samples.length;

  let dotSum = 0;
  let crossSum = 0;
  const vectors = [];
  for (const { position, projected } of samples) {
    const projectedVector = {
      x: projected.x - projectedCenterX,
      y: projected.y - projectedCenterY
    };
    const layoutVector = {
      x: position.x - layoutCenterX,
      y: position.y - layoutCenterY
    };
    dotSum += projectedVector.x * layoutVector.x + projectedVector.y * layoutVector.y;
    crossSum += projectedVector.x * layoutVector.y - projectedVector.y * layoutVector.x;
    vectors.push({ projectedVector, layoutVector });
  }
  const rotation = Math.atan2(crossSum, dotSum);
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  let squaredError = 0;
  for (const { projectedVector, layoutVector } of vectors) {
    const expectedX = projectedVector.x * cos - projectedVector.y * sin;
    const expectedY = projectedVector.x * sin + projectedVector.y * cos;
    squaredError += (layoutVector.x - expectedX) ** 2 + (layoutVector.y - expectedY) ** 2;
  }
  return {
    rotationDeg: rotation * 180 / Math.PI,
    rmsError: Math.sqrt(squaredError / vectors.length)
  };
}

function assertRepeatedCircuitIsStable(result, label) {
  const settledCircuit = result.circuitMetrics[9];
  const lastCircuit = result.circuitMetrics.at(-1);
  assert.ok(
    result.admittedTotal > 10000,
    `${label} did not repeatedly readmit tiles (${result.admittedTotal} admissions)`
  );
  assert.ok(
    lastCircuit.maxRotationDeg <= settledCircuit.maxRotationDeg + 2,
    `${label} rotation grew from ${settledCircuit.maxRotationDeg.toFixed(2)} to ` +
      `${lastCircuit.maxRotationDeg.toFixed(2)} degrees after 100 circuits; samples ` +
      `${[0, 9, 24, 49, 74, 99].map((index) => (
        result.circuitMetrics[index].maxRotationDeg.toFixed(1)
      )).join("/")}`
  );
  assert.ok(
    lastCircuit.maxRmsError <= settledCircuit.maxRmsError + 1,
    `${label} RMS distortion grew from ${settledCircuit.maxRmsError.toFixed(2)}px to ` +
      `${lastCircuit.maxRmsError.toFixed(2)}px after 100 circuits`
  );
  assert.ok(result.protectedEdgeSamples > 100, `${label} did not cross protected landmarks`);
  assert.ok(
    lastCircuit.maxProtectedEdgeStretch <= settledCircuit.maxProtectedEdgeStretch + 0.03,
    `${label} protected-edge stretch grew from ` +
      `${(settledCircuit.maxProtectedEdgeStretch * 100).toFixed(2)}% to ` +
      `${(lastCircuit.maxProtectedEdgeStretch * 100).toFixed(2)}% after 100 circuits`
  );
}

function admitWithTranslationOnly({ positions, projectedById, pendingIds, anchorId }) {
  const anchorPosition = positions.get(anchorId);
  const anchorProjected = projectedById.get(anchorId);
  if (!anchorPosition || !anchorProjected) throw new Error("Translation-only admission lost its anchor");
  for (const id of pendingIds) {
    const projected = projectedById.get(id);
    positions.set(id, {
      x: Math.round(anchorPosition.x + projected.x - anchorProjected.x),
      y: Math.round(anchorPosition.y + projected.y - anchorProjected.y)
    });
  }
  return pendingIds.length;
}

test("projection registration never changes scale or shear", () => {
  const positions = new Map([
    [0, { x: 10, y: 20 }],
    [1, { x: 10, y: 60 }]
  ]);
  const projectedById = new Map([
    [0, { x: 100, y: 100 }],
    [1, { x: 140, y: 100 }],
    [2, { x: 180, y: 100 }],
    [3, { x: 140, y: 140 }]
  ]);

  admitProjectedTiles({
    positions,
    projectedById,
    pendingIds: [2, 3],
    anchorId: 0,
    ...admissionTopology(4, [[0, 1], [1, 2], [1, 3]])
  });

  assert.deepEqual(positions.get(2), { x: 10, y: 100 });
  assert.deepEqual(positions.get(3), { x: -30, y: 60 });
  assert.equal(Math.hypot(positions.get(2).x - 10, positions.get(2).y - 20), 80);
  assert.equal(Math.hypot(positions.get(3).x - 10, positions.get(3).y - 20), Math.hypot(40, 40));
});

test("admission fails when its projected anchor is missing", () => {
  assert.throws(
    () => admitProjectedTiles({
      positions: new Map([[0, { x: 0, y: 0 }]]),
      projectedById: new Map([[1, { x: 20, y: 10 }]]),
      pendingIds: [1],
      anchorId: 0,
      ...admissionTopology(2, [[0, 1]])
    }),
    /Projected anchor position/
  );
});

function collectTraversalTiles(graph, camera) {
  const points = [];
  for (let id = 0; id < graph.tileCount; id++) {
    const projected = projectDirection(graphCenter(graph, id), camera);
    if (!projected) continue;
    if (
      projected.x < -TRAVERSAL_MARGIN ||
      projected.x > TRAVERSAL_SCREEN_W + TRAVERSAL_MARGIN ||
      projected.y < -TRAVERSAL_MARGIN ||
      projected.y > TRAVERSAL_SCREEN_H + TRAVERSAL_MARGIN
    ) continue;
    points.push({ id, ...projected });
  }
  return points;
}

function projectDirection(direction, camera) {
  const d = dot3(direction, camera.center);
  if (d <= 0.2) return null;
  const vx = dot3(direction, camera.right);
  const vy = dot3(direction, camera.up);
  const sinTheta = Math.sqrt(Math.max(0, 1 - d * d));
  const scale = sinTheta > 1e-6 ? Math.acos(clamp(d, -1, 1)) / sinTheta : 1;
  return {
    x: Math.round(TRAVERSAL_SCREEN_W / 2 + vx * scale * TRAVERSAL_PIXELS_PER_RADIAN),
    y: Math.round(TRAVERSAL_SCREEN_H / 2 - vy * scale * TRAVERSAL_PIXELS_PER_RADIAN)
  };
}

function northUpFrame(center) {
  const north = [0, 1, 0];
  const projection = projectToTangent(north, center);
  const up = normalize3(projection);
  const right = normalize3(cross3(up, center));
  return { center, right, up };
}

function directionAt(latDeg, lonDeg) {
  const lat = latDeg * Math.PI / 180;
  const lon = lonDeg * Math.PI / 180;
  return [
    Math.cos(lat) * Math.cos(lon),
    Math.sin(lat),
    -Math.cos(lat) * Math.sin(lon)
  ];
}

function projectToTangent(vector, normal) {
  const dot = dot3(vector, normal);
  return [
    vector[0] - normal[0] * dot,
    vector[1] - normal[1] * dot,
    vector[2] - normal[2] * dot
  ];
}

function cross3(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0]
  ];
}

function dot3(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function rotatedAdmissionPoints(angleDeg) {
  const angle = angleDeg * Math.PI / 180;
  const rotate = ({ x, y }) => ({
    x: x * Math.cos(angle) - y * Math.sin(angle),
    y: x * Math.sin(angle) + y * Math.cos(angle)
  });
  return {
    positions: new Map([
      [0, { x: 0, y: 0 }],
      [1, { x: 24, y: 0 }]
    ]),
    projectedById: new Map([
      [0, rotate({ x: 0, y: 0 })],
      [1, rotate({ x: 24, y: 0 })],
      [2, rotate({ x: 48, y: 0 })]
    ])
  };
}

function admissionTopology(tileCount, edges, protection = 255) {
  const neighborsById = Array.from({ length: tileCount }, () => []);
  for (const [a, b] of edges) {
    neighborsById[a].push(b);
    neighborsById[b].push(a);
  }
  const protectionById = new Uint8Array(tileCount);
  protectionById.fill(protection);
  return { neighborsById, protectionById };
}

function modulo(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}
