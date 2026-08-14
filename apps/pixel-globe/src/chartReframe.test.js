import assert from "node:assert/strict";
import test from "node:test";

import {
  constrainChartRepairToTopology,
  assertChartReframePositionPreserved,
  captureChartReframePosition,
  chartReframeCandidateIsNorthUp,
  chartNorthUpDriftExceedsThreshold,
  createExactNorthUpRepairPlan,
  createExactNorthUpLayout,
  exactNorthUpLayoutPosition,
  interpolateChartRepairPlan,
  measureChartNorthUpDrift,
  northUpProjectionIsStable,
  planChartSettlementTowardTargets,
  retainPositionLockedProjectedTiles,
  selectRepresentativeChartDriftCalls
} from "./chartReframe.js";

test("unified chart settlement pulls a torn adjacent pair back together", () => {
  const positions = new Map([
    [1, { x: 0, y: 0 }],
    [2, { x: 80, y: 0 }]
  ]);
  const targetsById = new Map([
    [1, { x: 0, y: 0 }],
    [2, { x: 24, y: 0 }]
  ]);
  const result = planChartSettlementTowardTargets({
    positions,
    targetsById,
    tileIds: new Set([1, 2]),
    maximumStepPx: Number.POSITIVE_INFINITY,
    referencePositions: targetsById,
    neighborsById: [[], [2], [1]],
    surfaceMaskById: Uint8Array.from([0, 2, 2]),
    landSlackPx: 3,
    waterSlackPx: 6
  });
  const a = result.settledPositions.get(1) ?? positions.get(1);
  const b = result.settledPositions.get(2) ?? positions.get(2);

  assert.ok(Math.abs(Math.hypot(b.x - a.x, b.y - a.y) - 24) <= 3);
  assert.ok(result.worstEdge.errorPx <= result.worstEdge.allowedErrorPx + 1);
});

test("full patch settlement cannot grandfather a newly admitted tear", () => {
  const positions = new Map([
    [1, { x: 200, y: 0 }],
    [2, { x: 24, y: 0 }]
  ]);
  const referencePositions = new Map([
    [1, { x: 0, y: 0 }],
    [2, { x: 24, y: 0 }]
  ]);
  const result = planChartSettlementTowardTargets({
    positions,
    targetsById: new Map([[2, { x: 24, y: 0 }]]),
    tileIds: new Set([2]),
    maximumStepPx: Number.POSITIVE_INFINITY,
    referencePositions,
    neighborsById: [[], [2], [1]],
    surfaceMaskById: Uint8Array.from([0, 2, 2]),
    landSlackPx: 3,
    waterSlackPx: 6,
    incrementalRepair: false
  });
  const retained = positions.get(1);
  const admitted = result.settledPositions.get(2) ?? positions.get(2);

  assert.deepEqual(retained, { x: 200, y: 0 });
  assert.ok(
    Math.abs(Math.hypot(admitted.x - retained.x, admitted.y - retained.y) - 24) <= 3,
    `newly admitted edge remained ${Math.hypot(
      admitted.x - retained.x,
      admitted.y - retained.y
    ).toFixed(2)}px long`
  );
});

test("unified chart settlement pushes compressed adjacent tiles apart", () => {
  const positions = new Map([
    [1, { x: 0, y: 0 }],
    [2, { x: 5, y: 0 }]
  ]);
  const targetsById = new Map([
    [1, { x: 0, y: 0 }],
    [2, { x: 24, y: 0 }]
  ]);
  const result = planChartSettlementTowardTargets({
    positions,
    targetsById,
    tileIds: new Set([1, 2]),
    maximumStepPx: Number.POSITIVE_INFINITY,
    referencePositions: targetsById,
    neighborsById: [[], [2], [1]],
    surfaceMaskById: Uint8Array.from([0, 2, 2]),
    landSlackPx: 3,
    waterSlackPx: 6
  });
  const a = result.settledPositions.get(1) ?? positions.get(1);
  const b = result.settledPositions.get(2) ?? positions.get(2);

  assert.ok(Math.hypot(b.x - a.x, b.y - a.y) >= 21);
});

test("unified chart settlement respects a concealed tile's pixel budget", () => {
  const positions = new Map([
    [1, { x: 0, y: 0 }],
    [2, { x: 40, y: 0 }]
  ]);
  const targetsById = new Map([[2, { x: 24, y: 0 }]]);
  const result = planChartSettlementTowardTargets({
    positions,
    targetsById,
    tileIds: new Set([2]),
    maximumStepPx: 1,
    referencePositions: new Map([
      [1, { x: 0, y: 0 }],
      [2, { x: 24, y: 0 }]
    ]),
    neighborsById: [[], [2], [1]],
    surfaceMaskById: Uint8Array.from([0, 2, 2]),
    landSlackPx: 3,
    waterSlackPx: 6
  });

  assert.deepEqual(result.settledPositions.get(2), { x: 39, y: 0 });
});

test("unified chart settlement rotates an intact neighbor mesh toward north-up", () => {
  const targetsById = new Map([
    [0, { x: 0, y: 0 }],
    [1, { x: 24, y: 0 }],
    [2, { x: 12, y: 21 }],
    [3, { x: -12, y: 21 }],
    [4, { x: -24, y: 0 }],
    [5, { x: -12, y: -21 }],
    [6, { x: 12, y: -21 }]
  ]);
  const angle = 12 * Math.PI / 180;
  const positions = new Map([...targetsById].map(([id, point]) => [id, {
    x: Math.round(point.x * Math.cos(angle) - point.y * Math.sin(angle)),
    y: Math.round(point.x * Math.sin(angle) + point.y * Math.cos(angle))
  }]));
  const neighborsById = [
    [1, 2, 3, 4, 5, 6],
    [0, 2, 6],
    [0, 1, 3],
    [0, 2, 4],
    [0, 3, 5],
    [0, 4, 6],
    [0, 5, 1]
  ];
  const before = [...positions].reduce((sum, [id, point]) => {
    const target = targetsById.get(id);
    return sum + Math.hypot(point.x - target.x, point.y - target.y);
  }, 0);
  const result = planChartSettlementTowardTargets({
    positions,
    targetsById,
    tileIds: new Set(targetsById.keys()),
    maximumStepPx: 8,
    referencePositions: targetsById,
    neighborsById,
    surfaceMaskById: new Uint8Array(7).fill(2),
    landSlackPx: 3,
    waterSlackPx: 6
  });
  const after = [...positions].reduce((sum, [id, point]) => {
    const settled = result.settledPositions.get(id) ?? point;
    const target = targetsById.get(id);
    return sum + Math.hypot(settled.x - target.x, settled.y - target.y);
  }, 0);

  assert.ok(after < before * 0.3, `expected ${after.toFixed(2)} to improve ${before.toFixed(2)}`);
  assert.ok(result.worstEdge.errorPx <= result.worstEdge.allowedErrorPx + 1);
});

test("small covered moves unwind tilt away from a fixed navigation patch", () => {
  const tileCount = 12;
  const targetsById = new Map(Array.from({ length: tileCount }, (_, id) => [
    id,
    { x: id * 24, y: 0 }
  ]));
  const angle = 12 * Math.PI / 180;
  const positions = new Map([...targetsById].map(([id, point]) => [id, {
    x: Math.round(point.x * Math.cos(angle)),
    y: Math.round(point.x * Math.sin(angle))
  }]));
  const neighborsById = Array.from({ length: tileCount }, (_, id) => [
    ...(id > 0 ? [id - 1] : []),
    ...(id + 1 < tileCount ? [id + 1] : [])
  ]);
  const fixedPosition = { ...positions.get(1) };
  const movableIds = new Set(Array.from({ length: tileCount - 2 }, (_, index) => index + 2));
  const initialFarError = Math.hypot(
    positions.get(tileCount - 1).x - targetsById.get(tileCount - 1).x,
    positions.get(tileCount - 1).y - targetsById.get(tileCount - 1).y
  );

  for (let pass = 0; pass < 30; pass++) {
    const result = planChartSettlementTowardTargets({
      positions,
      targetsById,
      tileIds: movableIds,
      maximumStepPx: 2,
      referencePositions: targetsById,
      neighborsById,
      surfaceMaskById: new Uint8Array(tileCount).fill(1),
      landSlackPx: 3,
      waterSlackPx: 6,
      incrementalRepair: true
    });
    for (const [id, point] of result.settledPositions) positions.set(id, point);
  }

  const farPosition = positions.get(tileCount - 1);
  const farTarget = targetsById.get(tileCount - 1);
  const finalFarError = Math.hypot(
    farPosition.x - farTarget.x,
    farPosition.y - farTarget.y
  );
  assert.deepEqual(positions.get(1), fixedPosition);
  assert.ok(
    finalFarError < initialFarError * 0.2,
    `expected iterative correction ${finalFarError.toFixed(2)} to improve ${initialFarError.toFixed(2)}`
  );
  for (let id = 0; id + 1 < tileCount; id++) {
    const a = positions.get(id);
    const b = positions.get(id + 1);
    assert.ok(Math.abs(Math.hypot(b.x - a.x, b.y - a.y) - 24) <= 6.1);
  }
});

test("an exact hidden reframe discards prior tears and follows fresh projection", () => {
  const layout = createExactNorthUpLayout([
    { id: 10, x: 120, y: 80 },
    { id: 11, x: 142, y: 80 },
    { id: 12, x: 131, y: 99 }
  ], 200, 120);

  assert.deepEqual([...layout.positions.entries()], [
    [10, { x: 20, y: 20 }],
    [11, { x: 42, y: 20 }],
    [12, { x: 31, y: 39 }]
  ]);
  assert.deepEqual({ viewX: layout.viewX, viewY: layout.viewY }, { viewX: 0, viewY: 0 });
});

test("partial concealed repairs target the same field as a fresh north-up redraw", () => {
  const projected = { id: 11, x: 142, y: 80 };
  const fresh = createExactNorthUpLayout([projected], 200, 120).positions.get(11);
  assert.deepEqual(exactNorthUpLayoutPosition({
    projected,
    viewX: 0,
    viewY: 0,
    viewportWidth: 200,
    viewportHeight: 120
  }), fresh);
  assert.deepEqual(exactNorthUpLayoutPosition({
    projected,
    viewX: 37,
    viewY: -12,
    viewportWidth: 200,
    viewportHeight: 120
  }), { x: fresh.x + 37, y: fresh.y - 12 });
});

test("concealed repair projects retained tiles outside the fresh viewport collection", () => {
  const retainedPositions = new Map([
    [10, { x: 10, y: 10 }],
    [50350, { x: 220, y: 15 }],
    [99, { x: -40, y: 30 }]
  ]);
  const plan = createExactNorthUpRepairPlan({
    tileIds: new Set([50350, 99]),
    retainedPositions,
    projectTile: (id) => id === 50350 ? { x: 188, y: 42 } : null,
    viewX: 20,
    viewY: -5,
    viewportWidth: 200,
    viewportHeight: 120
  });

  assert.deepEqual(plan.get(50350), { x: 108, y: -23 });
  assert.equal(plan.has(99), false);
});

test("concealed chart repairs approach north-up targets in monotonic pixel steps", () => {
  const result = interpolateChartRepairPlan({
    positions: new Map([
      [1, { x: 10, y: 20 }],
      [2, { x: 4, y: 7 }],
      [3, { x: 0, y: 0 }]
    ]),
    targetsById: new Map([
      [1, { x: 14, y: 17 }],
      [2, { x: 5, y: 7 }]
    ]),
    tileIds: new Set([1, 2, 3]),
    maximumStepPx: 1
  });

  assert.deepEqual(result.nextPositions.get(1), { x: 11, y: 19 });
  assert.deepEqual(result.nextPositions.get(2), { x: 5, y: 7 });
  assert.equal(result.nextPositions.has(3), false);
  assert.deepEqual([...result.completedTileIds], [2]);
});

test("concealed repair groups cannot pull away from a clear neighbor", () => {
  const positions = new Map([
    [1, { x: 0, y: 0 }],
    [2, { x: 24, y: 0 }],
    [3, { x: 48, y: 0 }]
  ]);
  const constrained = constrainChartRepairToTopology({
    positions,
    proposedPositions: new Map([
      [1, { x: 0, y: 3 }],
      [2, { x: 24, y: 3 }]
    ]),
    referencePositions: positions,
    neighborsById: [
      [2],
      [1, 3],
      [2]
    ],
    surfaceMaskById: Uint8Array.from([2, 2, 2]),
    landSlackPx: 3,
    waterSlackPx: 6
  });

  assert.deepEqual(constrained.get(1), { x: 0, y: 3 });
  assert.deepEqual(constrained.get(2), { x: 24, y: 3 });
  const clearBoundaryError = Math.hypot(
    48 - constrained.get(2).x - 24,
    0 - constrained.get(2).y
  );
  assert.ok(clearBoundaryError <= 3);
});

test("a north-up repair cannot improve rotation by stretching a neighbor edge", () => {
  const positions = new Map([
    [0, { x: 0, y: 0 }],
    [1, { x: 3, y: 21 }]
  ]);
  const constrained = constrainChartRepairToTopology({
    positions,
    proposedPositions: new Map([[1, { x: 4, y: 20 }]]),
    referencePositions: new Map([
      [0, { x: 0, y: 0 }],
      [1, { x: 24, y: 0 }]
    ]),
    neighborsById: [[1], [0]],
    surfaceMaskById: Uint8Array.from([2, 2]),
    landSlackPx: 3,
    waterSlackPx: 6
  });

  assert.notDeepEqual(constrained.get(1), { x: 4, y: 20 });
  const accepted = constrained.get(1);
  assert.ok(Math.abs(Math.hypot(accepted.x, accepted.y) - 24) <= 3);
});

test("a visible position lock remains in a rebuild that projects it off-screen", () => {
  const retained = retainPositionLockedProjectedTiles({
    projectedTiles: [{ id: 10, x: 50, y: 30 }],
    positionLocks: new Map([
      [10, { x: 0, y: 0 }],
      [50483, { x: -18, y: 42 }]
    ]),
    projectTile: () => null,
    fallbackProjection: (position) => ({ x: position.x + 100, y: position.y + 60 })
  });

  assert.deepEqual(retained, [
    { id: 10, x: 50, y: 30 },
    { id: 50483, x: 82, y: 102 }
  ]);
});

test("chart reframing preserves exact player and NPC globe positions", () => {
  const position = directionAt(31.2, 121.5);
  const player = captureChartReframePosition(position, "player");
  const npc = captureChartReframePosition(directionAt(30.8, 121.2), "NPC ship test-1");

  assert.doesNotThrow(() => assertChartReframePositionPreserved(player, position));
  assert.doesNotThrow(
    () => assertChartReframePositionPreserved(npc, directionAt(30.8, 121.2))
  );
  assert.throws(
    () => assertChartReframePositionPreserved(player, directionAt(31.3, 121.5)),
    /changed player's global position/
  );
  assert.throws(
    () => assertChartReframePositionPreserved(npc, directionAt(30.9, 121.2)),
    /changed NPC ship test-1's global position/
  );
});

test("ordinary and very high latitudes retain a true north-up projection", () => {
  assert.equal(northUpProjectionIsStable(directionAt(0, 0)), true);
  assert.equal(northUpProjectionIsStable(directionAt(84, 20)), true);
  assert.equal(northUpProjectionIsStable(directionAt(89.999, 20)), true);
});

test("only a position extremely close to the exact pole uses the numerical fallback", () => {
  assert.equal(northUpProjectionIsStable(directionAt(89.99999, 20)), false);
  assert.equal(northUpProjectionIsStable(directionAt(-89.99999, 20)), false);
  assert.equal(northUpProjectionIsStable(directionAt(90, 20)), false);
});

test("chart drift separates rotation from residual distortion", () => {
  const radians = 3 * Math.PI / 180;
  const samples = [
    rotatedSample(80, 0, radians),
    rotatedSample(0, 60, radians),
    rotatedSample(-70, 20, radians),
    rotatedSample(30, -50, radians)
  ];
  const metrics = measureChartNorthUpDrift(samples);

  assert.ok(Math.abs(metrics.rotationDeg - 3) < 1e-9);
  assert.ok(metrics.rmsDistortionPx < 1e-9);
  assert.ok(metrics.maxDistortionPx < 1e-9);
  assert.equal(metrics.worstDistortionSampleIndex, -1);
  assert.equal(metrics.needsReframe, true);
});

test("two separated samples are enough to measure north-up rotation", () => {
  const radians = -4 * Math.PI / 180;
  const metrics = measureChartNorthUpDrift([
    rotatedSample(-80, 0, radians),
    rotatedSample(80, 0, radians)
  ]);

  assert.ok(Math.abs(metrics.rotationDeg + 4) < 1e-9);
  assert.ok(metrics.rmsDistortionPx < 1e-9);
  assert.equal(metrics.needsReframe, true);
});

test("chart drift sampling selects at most four visible spatial extrema", () => {
  const calls = [
    { id: 1, x: -80, y: 0 },
    { id: 2, x: 75, y: 2 },
    { id: 3, x: 0, y: -60 },
    { id: 4, x: 1, y: 55 },
    { id: 5, x: 5, y: 5 },
    { id: 6, x: 400, y: 0 }
  ];
  const selected = selectRepresentativeChartDriftCalls(calls, {
    viewX: 0,
    viewY: 0,
    halfWidth: 100,
    halfHeight: 80
  });

  assert.deepEqual(selected.map((call) => call.id), [2, 1, 4, 3]);
  assert.equal(selected.length, 4);
  assert.ok(!selected.some((call) => call.id === 5 || call.id === 6));
});

test("chart drift sampling deduplicates extrema on a tiny chart", () => {
  const onlyCall = { id: 7, x: 0, y: 0 };
  assert.deepEqual(
    selectRepresentativeChartDriftCalls([onlyCall], {
      viewX: 0,
      viewY: 0,
      halfWidth: 10,
      halfHeight: 10
    }),
    [onlyCall]
  );
});

test("organic local distortion marks a chart for reframing", () => {
  const metrics = measureChartNorthUpDrift([
    { localX: 80, localY: 0, northX: 80, northY: 0 },
    { localX: 3, localY: 60, northX: 0, northY: 60 },
    { localX: -70, localY: 26, northX: -70, northY: 20 },
    { localX: 30, localY: -50, northX: 30, northY: -50 }
  ]);

  assert.equal(metrics.needsReframe, true);
  assert.ok(metrics.rmsDistortionPx >= 1.5);
  assert.equal(metrics.worstDistortionSampleIndex, 2);
});

test("a fresh north-up chart remains below every correction threshold", () => {
  const metrics = measureChartNorthUpDrift([
    { localX: 80, localY: 0, northX: 80, northY: 0 },
    { localX: 0, localY: 60, northX: 0, northY: 60 },
    { localX: -70, localY: 20, northX: -70, northY: 20 }
  ]);

  assert.equal(metrics.needsReframe, false);
  assert.equal(chartNorthUpDriftExceedsThreshold(metrics), false);
});

test("a fresh reframe must be north-up rather than merely better than its predecessor", () => {
  const northeastCandidate = driftMetrics({
    rotationDeg: -7.22,
    rmsDistortionPx: 0.95,
    maxDistortionPx: 1.6
  });
  const improvedButStillWrong = driftMetrics({
    rotationDeg: 3.5,
    rmsDistortionPx: 0.7,
    maxDistortionPx: 1.2
  });

  assert.equal(chartReframeCandidateIsNorthUp(northeastCandidate), false);
  assert.equal(chartReframeCandidateIsNorthUp(improvedButStillWrong), false);
});

test("a fresh reframe accepts only a north-up result with pixel-rounding error", () => {
  const corrected = driftMetrics({
    rotationDeg: 0.01,
    rmsDistortionPx: 0.64,
    maxDistortionPx: 1.2
  });
  const alreadyNorthUp = driftMetrics({
    rotationDeg: 0,
    rmsDistortionPx: 0,
    maxDistortionPx: 0
  });
  const roundedCandidate = driftMetrics({
    rotationDeg: 0.04,
    rmsDistortionPx: 0.64,
    maxDistortionPx: 1.1
  });

  assert.equal(chartReframeCandidateIsNorthUp(corrected), true);
  assert.equal(chartReframeCandidateIsNorthUp(alreadyNorthUp), true);
  assert.equal(chartReframeCandidateIsNorthUp(roundedCandidate), true);
  assert.equal(
    chartReframeCandidateIsNorthUp(driftMetrics({
      rotationDeg: 0,
      rmsDistortionPx: 0,
      maxDistortionPx: 0,
      sampleCount: 0
    })),
    false
  );
});

test("chart drift rejects malformed samples and metrics", () => {
  assert.throws(
    () => measureChartNorthUpDrift([{ localX: 0, localY: 0, northX: Number.NaN, northY: 0 }]),
    /invalid northX/
  );
  assert.throws(
    () => chartNorthUpDriftExceedsThreshold({ sampleCount: -1 }),
    /non-negative sample count/
  );
  assert.throws(
    () => northUpProjectionIsStable([0, 0, 0]),
    /cannot be zero/
  );
});

function driftMetrics({
  rotationDeg,
  rmsDistortionPx,
  maxDistortionPx,
  sampleCount = 4
}) {
  return {
    sampleCount,
    rotationDeg,
    rmsDistortionPx,
    maxDistortionPx,
    needsReframe: false
  };
}

function rotatedSample(northX, northY, radians) {
  return {
    northX,
    northY,
    localX: northX * Math.cos(radians) - northY * Math.sin(radians),
    localY: northX * Math.sin(radians) + northY * Math.cos(radians)
  };
}

function directionAt(latitudeDeg, longitudeDeg) {
  const latitude = latitudeDeg * Math.PI / 180;
  const longitude = longitudeDeg * Math.PI / 180;
  return [
    Math.cos(latitude) * Math.cos(longitude),
    Math.sin(latitude),
    -Math.cos(latitude) * Math.sin(longitude)
  ];
}
