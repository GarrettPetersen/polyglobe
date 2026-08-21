import test from "node:test";
import assert from "node:assert/strict";
import {
  chartRebuildRequest,
  createChartRebuildTracker,
  createCoveredChartRepairQueue,
  planChartLayoutTransaction
} from "./chartLayoutEngine.js";

test("one chart transaction settles a movable group against its complete topology", () => {
  const positions = new Map([
    [0, { x: 0, y: 0 }],
    [1, { x: 24, y: 12 }],
    [2, { x: 48, y: 24 }]
  ]);
  const references = new Map([
    [0, { x: 0, y: 0 }],
    [1, { x: 24, y: 0 }],
    [2, { x: 48, y: 0 }]
  ]);
  const result = planChartLayoutTransaction({
    positions,
    tileIds: new Set([1, 2]),
    neighborsById: [[1], [0, 2], [1]],
    surfaceMaskById: new Uint8Array([2, 2, 2]),
    referencePositionsForIds: (ids) => new Map(
      [...ids].map((id) => [id, references.get(id)])
    ),
    maximumStepPx: Number.POSITIVE_INFINITY,
    landSlackPx: 3,
    waterSlackPx: 6
  });

  assert.deepEqual(result.settledPositions.get(1), { x: 24, y: 0 });
  assert.deepEqual(result.settledPositions.get(2), { x: 48, y: 0 });
  assert.deepEqual([...result.referencePositions.keys()].sort(), [0, 1, 2]);
});

test("chart transactions can preserve a fixed target while sharing the same reference field", () => {
  const positions = new Map([
    [0, { x: 0, y: 0 }],
    [1, { x: 24, y: 0 }]
  ]);
  const result = planChartLayoutTransaction({
    positions,
    tileIds: new Set([0, 1]),
    neighborsById: [[1], [0]],
    surfaceMaskById: new Uint8Array([1, 1]),
    referencePositionsForIds: () => new Map([
      [0, { x: 0, y: 0 }],
      [1, { x: 24, y: 8 }]
    ]),
    excludedTargetIds: new Set([0]),
    maximumStepPx: 1,
    incrementalRepair: true
  });

  assert.equal(result.targetsById.has(0), false);
  assert.deepEqual(result.targetsById.get(1), { x: 24, y: 8 });
});

test("chart transactions omit positioned neighbors outside the caller's reference field", () => {
  const result = planChartLayoutTransaction({
    positions: new Map([
      [0, { x: 0, y: 0 }],
      [1, { x: 24, y: 0 }],
      [2, { x: 48, y: 0 }]
    ]),
    tileIds: new Set([1]),
    neighborsById: [[1], [0, 2], [1]],
    surfaceMaskById: new Uint8Array([2, 2, 2]),
    referencePositionsForIds: (ids) => new Map(
      [...ids].map((id) => [id, { x: id * 24, y: 0 }])
    ),
    topologyIncludesId: (id) => id !== 2
  });

  assert.deepEqual([...result.referencePositions.keys()].sort(), [0, 1]);
});

test("chart transactions leave an unprojectable target fixed", () => {
  const positions = new Map([
    [0, { x: 0, y: 0 }],
    [1, { x: 24, y: 0 }],
    [2, { x: 48, y: 0 }]
  ]);
  const result = planChartLayoutTransaction({
    positions,
    tileIds: new Set([1, 2]),
    neighborsById: [[1], [0, 2], [1]],
    surfaceMaskById: new Uint8Array([2, 2, 2]),
    referencePositionsForIds: () => new Map([
      [0, { x: 0, y: 0 }],
      [1, { x: 24, y: 8 }]
    ]),
    maximumStepPx: Number.POSITIVE_INFINITY
  });

  assert.deepEqual(result.targetsById.get(1), { x: 24, y: 8 });
  assert.equal(result.targetsById.has(2), false);
  assert.equal(result.settledPositions.has(2), false);
});

test("covered repair queues discard exposed stale work and apply concealed work once", () => {
  const queue = createCoveredChartRepairQueue();
  const positions = new Map([
    [1, { x: 10, y: 10 }],
    [2, { x: 20, y: 20 }]
  ]);
  queue.stage(new Map([
    [1, { x: 11, y: 10 }],
    [2, { x: 21, y: 20 }]
  ]), "polar fog");

  const applicable = queue.collectApplicable({
    positions,
    remainsCovered: (position) => position.x === 10,
    overlapsViewport: () => true
  });
  assert.deepEqual([...applicable.keys()], [1]);
  assert.equal(queue.size, 1);
  assert.equal(queue.apply(positions, applicable), 1);
  assert.deepEqual(positions.get(1), { x: 11, y: 10 });
  assert.equal(queue.size, 0);
});

test("offscreen covered repairs remain applicable after their visual cover clears", () => {
  const queue = createCoveredChartRepairQueue();
  const positions = new Map([[7, { x: 700, y: 700 }]]);
  queue.stage(new Map([[7, { x: 701, y: 700 }]]), "cloud bank");
  const applicable = queue.collectApplicable({
    positions,
    remainsCovered: () => false,
    overlapsViewport: () => false
  });
  assert.deepEqual([...applicable.keys()], [7]);
});

test("chart rebuild requests and counters use one canonical reason roster", () => {
  const tracker = createChartRebuildTracker();
  const request = chartRebuildRequest({
    missingChart: false,
    concealedRepair: true,
    swellRepair: true,
    viewportCoverage: true,
    missingCenter: false,
    projectionTravel: false
  });
  assert.equal(request.required, true);
  tracker.record(request);
  assert.deepEqual(tracker.snapshot(), {
    missingChart: 0,
    concealedRepair: 1,
    swellRepair: 1,
    viewportCoverage: 1,
    missingCenter: 0,
    projectionTravel: 0
  });
});
