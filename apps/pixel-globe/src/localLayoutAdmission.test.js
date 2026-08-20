import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildGeodesicGraph,
  createDirectionIndex,
  findNearestTileId,
  graphCenter,
  normalize3
} from "./geodesic.js";
import {
  MAX_ELASTIC_FRAME_CORRECTION_PX,
  MAX_PROTECTED_ADMISSION_SLACK_PX,
  ProtectedChartStitchError,
  admitProjectedTiles,
  chartAdmissionCorrectionPolicy,
  chartAdmissionTileMayMove,
  refreshOffscreenLayoutTiles,
  projectedViewportTileIds,
  resolveLocalLayoutAnchor,
  retainLocalLayoutAnchor,
  planVisibleElasticTilesWithinMotion,
  viewportElasticCorrectionSupport
} from "./localLayoutAdmission.js";

test("live admission never moves a retained tile that may still be visible", () => {
  assert.equal(chartAdmissionTileMayMove({
    newlyAdmitted: false,
    concealed: false,
    overlapsAuthoritativeViewport: true
  }), false);
  assert.equal(chartAdmissionTileMayMove({
    newlyAdmitted: false,
    concealed: true,
    overlapsAuthoritativeViewport: true
  }), true);
  assert.equal(chartAdmissionTileMayMove({
    newlyAdmitted: false,
    concealed: false,
    overlapsAuthoritativeViewport: false
  }), true);
  assert.equal(chartAdmissionTileMayMove({
    newlyAdmitted: true,
    concealed: false,
    overlapsAuthoritativeViewport: true
  }), true);
});

test("featureless water admission can spend the whole viewport correcting north-up", () => {
  const support = {
    viewportTileIds: new Set([0, 1, 2]),
    elasticTileIds: new Set([0, 1, 2]),
    correctionActive: true
  };
  const policy = chartAdmissionCorrectionPolicy({
    support,
    protectionById: new Uint8Array([0, 0, 0]),
    elasticityMaskById: new Uint8Array([1, 1, 1]),
    continuityMaskById: new Uint8Array([1, 1, 1]),
    viewportWidth: 320,
    viewportHeight: 180
  });

  assert.equal(policy.correctElasticTilesNorthUp, true);
  assert.equal(policy.registrationIds, support.elasticTileIds);
  assert.equal(policy.maxElasticCorrectionPx, Math.hypot(320, 180));
  assert.equal(policy.fullyElasticWater, true);
});

test("coastal admission keeps the bounded elastic correction used by production", () => {
  const support = {
    viewportTileIds: new Set([0, 1, 2]),
    elasticTileIds: new Set([0, 1]),
    correctionActive: true
  };
  const policy = chartAdmissionCorrectionPolicy({
    support,
    protectionById: new Uint8Array([0, 0, 255]),
    elasticityMaskById: new Uint8Array([1, 1, 0]),
    continuityMaskById: new Uint8Array([1, 1, 2]),
    viewportWidth: 320,
    viewportHeight: 180
  });

  assert.equal(policy.maxElasticCorrectionPx, MAX_ELASTIC_FRAME_CORRECTION_PX);
  assert.equal(policy.fullyElasticWater, false);
});
import { predictiveAdmissionProjection } from "./chartAdmissionProjection.js";
import {
  chartFaultNeedsCloudRepair,
  chartRotationNeedsFullCloudRepair
} from "./chartVisualFault.js";
import { chooseChartVisualRepair } from "./chartVisualRepairPolicy.js";
import { chartVisualRepairBurden } from "./chartVisualRepairBurden.js";
import {
  constrainChartRepairToTopology,
  createExactNorthUpRepairPlan,
  exactNorthUpLayoutPosition,
  interpolateChartRepairPlan,
  planChartSettlementTowardTargets
} from "./chartReframe.js";
import {
  chartFogConcealsCircleForRepair,
  chartFogObscuresCircle,
  nextPolarChartRepairPressure,
  polarChartFogFrame
} from "./chartRepairFog.js";
import {
  buildChartTileProtection,
  buildDirectChartProtectionComponents
} from "./chartTileProtection.js";
import { MANUAL_CITY_RIVER_HEX_CHAINS_BY_SUBDIVISIONS } from "./manualRiverHexChains.js";
import { applyManualTerrainOverrides } from "./manualTerrainOverrides.js";
import { isWaterSurfaceRow } from "./terrainSurface.js";
import { buildWorldNavigationTopology } from "./worldNavigationTopology.js";

// Exercise the widest compact sailing viewport currently observed in chart
// integrity telemetry; wider views expose more globe curvature at once.
const TRAVERSAL_SCREEN_W = 482;
const TRAVERSAL_SCREEN_H = 256;
const TRAVERSAL_MARGIN = 72;
const TRAVERSAL_PIXELS_PER_RADIAN = 620;
const TRAVERSAL_REBUILD_DISTANCE_PX = 28;
const TEST_CONTINUITY_CORRECTION_LIMITS_BY_CLASS = new Map([
  [1, MAX_PROTECTED_ADMISSION_SLACK_PX * 2],
  [2, MAX_PROTECTED_ADMISSION_SLACK_PX]
]);
// A visible edge can retain up to three pixels of legitimate placement slack
// at each endpoint while the fresh projection changes with camera curvature;
// integer endpoint projection contributes at most another two pixels.
const MAX_VISIBLE_PROTECTED_EDGE_LENGTH_ERROR_PX =
  MAX_PROTECTED_ADMISSION_SLACK_PX * 2 + 2;
const PRINT_CHART_BENCHMARK = process.env.PIXEL_GLOBE_PRINT_CHART_BENCHMARK === "1";

function reportChartBenchmark(label, result) {
  if (!PRINT_CHART_BENCHMARK) return;
  const metrics = {
    movementFrames: result.movementFrames,
    chartBuilds: result.chartBuilds,
    polarFogRepairPasses: result.polarFogRepairPasses,
    polarFogTilesSettled: result.polarFogTilesSettled,
    maxPolarFogRepairPressure: result.maxPolarFogRepairPressure,
    stepsWithoutProtectedCoast: result.stepsWithoutProtectedCoast,
    stepsWithProtectedCoast: result.stepsWithProtectedCoast,
    maxRotationDeg: result.maxRotationDeg,
    maxRotationStep: result.maxRotationStep,
    maxRotationLocation: result.maxRotationLocation,
    maxProtectedRotationStep: result.maxProtectedRotationStep,
    maxRmsDistortionPx: result.maxRmsDistortionPx,
    maxDistortionPx: result.maxDistortionPx,
    maxTerrainEdgeGapPx: result.maxTerrainEdgeGapPx,
    maxTerrainEdgeCompressionPx: result.maxTerrainEdgeCompressionPx,
    firstCompressionRepairPx: result.firstCompressionRepairPx,
    maxProtectedRotationDeg: result.maxProtectedRotationDeg,
    finalProtectedRotationDeg: result.finalProtectedRotationDeg,
    maxProtectedEdgeErrorPx: result.maxProtectedEdgeErrorPx,
    maxLandEdgeGapPx: result.maxLandEdgeGapPx,
    maxPostAdmissionLandEdgeGapPx: result.maxPostAdmissionLandEdgeGapPx,
    maxPostAdmissionLandEdgeGapDetails: result.maxPostAdmissionLandEdgeGapDetails,
    maxLandEdgeGapDetails: result.maxLandEdgeGapPx > 7
      ? result.maxLandEdgeGapDetails
      : undefined,
    missingVisibleLandNeighbors: result.missingVisibleLandNeighbors,
    firstMissingVisibleLandNeighbor: result.firstMissingVisibleLandNeighbor,
    maxViewportCoverageGapPx: result.maxViewportCoverageGapPx,
    maxViewportCoverageGapDetails: result.maxViewportCoverageGapDetails,
    visibleProtectedRedraws: result.visibleProtectedRedraws,
    visibleLandRedraws: result.visibleLandRedraws,
    repairDemand: result.repairDemand
  };
  console.log(`[chart-benchmark] ${label} ${JSON.stringify(metrics)}`);
}

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

test("a concealed repair group is not constrained by its own unrevealed tiles", () => {
  const neighborsById = [[1, 3], [0, 2], [1], [0]];
  const protectionById = new Uint8Array(4);
  const projectedById = new Map([
    [0, { x: 0, y: 0 }],
    [1, { x: 24, y: 0 }],
    [2, { x: 48, y: 0 }],
    [3, { x: 0, y: 24 }]
  ]);
  const originalPositions = new Map([
    [0, { x: 0, y: 0 }],
    [1, { x: 17, y: 17 }],
    [2, { x: 34, y: 34 }],
    [3, { x: 0, y: 24 }]
  ]);
  const admissionOptions = {
    projectedById,
    anchorId: 0,
    neighborsById,
    protectionById,
    registrationIds: new Set([0, 3]),
    rigidRegistrationIds: new Set([0, 3]),
    correctElasticTilesNorthUp: true,
    maxElasticCorrectionPx: 100,
    maxProtectedCorrectionPx: MAX_PROTECTED_ADMISSION_SLACK_PX,
    continuityMaskById: new Uint8Array(4),
    maxContinuityCorrectionPx: MAX_PROTECTED_ADMISSION_SLACK_PX,
    protectedCorrectionViewportIds: new Set([0, 1, 2, 3]),
    liveViewportAdmissionIds: new Set()
  };

  const sequentialPositions = new Map(originalPositions);
  sequentialPositions.delete(1);
  admitProjectedTiles({
    ...admissionOptions,
    positions: sequentialPositions,
    pendingIds: [1]
  });
  assert.deepEqual(sequentialPositions.get(1), { x: 17, y: 17 });

  const groupedPositions = new Map(originalPositions);
  groupedPositions.delete(1);
  groupedPositions.delete(2);
  admitProjectedTiles({
    ...admissionOptions,
    positions: groupedPositions,
    pendingIds: [1, 2]
  });
  assert.deepEqual(groupedPositions.get(1), { x: 24, y: 0 });
  assert.deepEqual(groupedPositions.get(2), { x: 48, y: 0 });
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

test("a newly exposed ocean edge cannot make an unbounded correction jump", () => {
  const points = rotatedAdmissionPoints(60);
  admitProjectedTiles({
    positions: points.positions,
    projectedById: points.projectedById,
    pendingIds: [2],
    anchorId: 0,
    ...admissionTopology(3, [[0, 1], [1, 2]], 0),
    registrationIds: new Set([0, 1]),
    correctElasticTilesNorthUp: true,
    continuityMaskById: new Uint8Array([1, 1, 1]),
    maxContinuityCorrectionPx: MAX_PROTECTED_ADMISSION_SLACK_PX
  });

  const admitted = points.positions.get(2);
  const retained = points.positions.get(1);
  const edgeLength = Math.hypot(admitted.x - retained.x, admitted.y - retained.y);
  assert.ok(
    Math.abs(edgeLength - 24) <= MAX_PROTECTED_ADMISSION_SLACK_PX,
    `Elastic ocean boundary changed to ${edgeLength.toFixed(2)}px`
  );
});

test("a newly exposed uniform land edge cannot open a large correction tear", () => {
  const points = rotatedAdmissionPoints(60);
  const topology = admissionTopology(3, [[0, 1], [1, 2]], 0);
  admitProjectedTiles({
    positions: points.positions,
    projectedById: points.projectedById,
    pendingIds: [2],
    anchorId: 0,
    ...topology,
    registrationIds: new Set([0, 1]),
    correctElasticTilesNorthUp: true,
    continuityMaskById: new Uint8Array([1, 1, 1]),
    maxContinuityCorrectionPx: MAX_PROTECTED_ADMISSION_SLACK_PX
  });

  const admitted = points.positions.get(2);
  const retained = points.positions.get(1);
  const edgeLength = Math.hypot(
    admitted.x - retained.x,
    admitted.y - retained.y
  );
  assert.ok(
    Math.abs(edgeLength - 24) <= MAX_PROTECTED_ADMISSION_SLACK_PX,
    `Uniform land boundary opened to ${edgeLength.toFixed(2)}px`
  );
  assert.ok(
    Math.hypot(admitted.x - 48, admitted.y) <= MAX_PROTECTED_ADMISSION_SLACK_PX,
    `Uniform land exceeded its ${MAX_PROTECTED_ADMISSION_SLACK_PX}px continuity allowance`
  );
});

test("ordinary admission gives uniform water more north-up slack than land", () => {
  const water = rotatedAdmissionPoints(60);
  const land = rotatedAdmissionPoints(60);
  const topology = admissionTopology(3, [[0, 1], [1, 2]], 0);
  const common = {
    pendingIds: [2],
    anchorId: 0,
    ...topology,
    registrationIds: new Set([0, 1]),
    correctElasticTilesNorthUp: true,
    maxContinuityCorrectionPx: MAX_PROTECTED_ADMISSION_SLACK_PX,
    continuityCorrectionLimitsByClass: TEST_CONTINUITY_CORRECTION_LIMITS_BY_CLASS
  };
  admitProjectedTiles({
    positions: water.positions,
    projectedById: water.projectedById,
    ...common,
    continuityMaskById: new Uint8Array([1, 1, 1])
  });
  admitProjectedTiles({
    positions: land.positions,
    projectedById: land.projectedById,
    ...common,
    continuityMaskById: new Uint8Array([2, 2, 2])
  });

  const target = water.projectedById.get(2);
  const waterDistance = Math.hypot(
    water.positions.get(2).x - target.x,
    water.positions.get(2).y - target.y
  );
  const landDistance = Math.hypot(
    land.positions.get(2).x - target.x,
    land.positions.get(2).y - target.y
  );
  assert.ok(
    waterDistance < landDistance,
    `Water (${waterDistance.toFixed(2)}px) did not absorb more frame correction than land ` +
      `(${landDistance.toFixed(2)}px)`
  );
  assert.ok(
    Math.abs(Math.hypot(
      water.positions.get(2).x - water.positions.get(1).x,
      water.positions.get(2).y - water.positions.get(1).y
    ) - 24) <= MAX_PROTECTED_ADMISSION_SLACK_PX * 2
  );
  assert.ok(
    Math.abs(Math.hypot(
      land.positions.get(2).x - land.positions.get(1).x,
      land.positions.get(2).y - land.positions.get(1).y
    ) - 24) <= MAX_PROTECTED_ADMISSION_SLACK_PX
  );
});

test("a quiet interval can admit ocean without applying a north-up jump", () => {
  const points = rotatedAdmissionPoints(60);
  admitProjectedTiles({
    positions: points.positions,
    projectedById: points.projectedById,
    pendingIds: [2],
    anchorId: 0,
    ...admissionTopology(3, [[0, 1], [1, 2]], 0),
    registrationIds: new Set([0, 1]),
    correctElasticTilesNorthUp: false,
    maxElasticCorrectionPx: 0
  });

  assert.deepEqual(points.positions.get(2), { x: 48, y: 0 });
});

test("new elastic tiles use the corrected frame even as they enter the live viewport", () => {
  const offscreen = rotatedAdmissionPoints(60);
  const live = rotatedAdmissionPoints(60);
  const topology = admissionTopology(3, [[0, 1], [1, 2]], 0);
  const args = {
    pendingIds: [2],
    anchorId: 0,
    ...topology,
    registrationIds: new Set([0, 1]),
    correctElasticTilesNorthUp: true
  };

  admitProjectedTiles({
    positions: offscreen.positions,
    projectedById: offscreen.projectedById,
    ...args
  });
  admitProjectedTiles({
    positions: live.positions,
    projectedById: live.projectedById,
    ...args,
    liveViewportAdmissionIds: new Set([2])
  });

  assert.notDeepEqual(offscreen.positions.get(2), { x: 48, y: 0 });
  assert.deepEqual(live.positions.get(2), offscreen.positions.get(2));
});

test("visible ocean can settle toward north-up during swell motion on any axis", () => {
  const positions = new Map([
    [0, { x: 50, y: 50 }],
    [1, { x: 72, y: 50 }],
    [2, { x: 94, y: 50 }],
    [3, { x: 116, y: 50 }]
  ]);
  const projectedById = new Map([
    [0, { x: 80, y: 50 }],
    [1, { x: 104, y: 50 }],
    [2, { x: 128, y: 50 }],
    [3, { x: 152, y: 50 }]
  ]);
  const previousOffsetsById = new Map([
    [1, { x: 1, y: 0 }],
    [2, { x: 1, y: 0 }],
    [3, { x: 0, y: 1 }]
  ]);
  const currentOffsetsById = new Map([
    [1, { x: 0, y: 0 }],
    [2, { x: 0, y: 0 }],
    [3, { x: 0, y: 0 }]
  ]);

  const settlement = planVisibleElasticTilesWithinMotion({
    positions,
    projectedById,
    protectionById: new Uint8Array([255, 0, 255, 0]),
    movableTileIds: new Set([1, 2, 3]),
    previousOffsetsById,
    currentOffsetsById,
    anchorId: 0,
    viewportWidth: 160,
    viewportHeight: 100,
    tileVisualRadius: 18,
    viewX: 50,
    viewY: 50,
    maximumStepPx: 2
  });
  for (const [id, position] of settlement) positions.set(id, position);

  assert.equal(settlement.size, 2);
  assert.deepEqual(positions.get(1), { x: 73, y: 50 });
  assert.deepEqual(positions.get(2), { x: 94, y: 50 });
  assert.deepEqual(positions.get(3), { x: 117, y: 50 });
  assert.ok(
    Math.hypot(
      positions.get(3).x + currentOffsetsById.get(3).x -
        (116 + previousOffsetsById.get(3).x),
      positions.get(3).y + currentOffsetsById.get(3).y -
        (50 + previousOffsetsById.get(3).y)
    ) <= 2,
    "The swell-hidden correction exceeded its bounded visual motion"
  );
});

test("successive swells converge on the exact fresh north-up redraw field", () => {
  const positions = new Map([
    [0, { x: 50, y: 50 }],
    [1, { x: 86, y: 58 }],
    [2, { x: 106, y: 64 }]
  ]);
  const projectedById = new Map([
    [0, { x: 80, y: 50 }],
    [1, { x: 104, y: 50 }],
    [2, { x: 128, y: 50 }]
  ]);
  const movableTileIds = new Set([1, 2]);
  const offsets = new Map([[1, { x: 0, y: 0 }], [2, { x: 0, y: 0 }]]);
  const movedOffsets = new Map([[1, { x: 1, y: 0 }], [2, { x: 1, y: 0 }]]);
  for (let pass = 0; pass < 30; pass++) {
    const settlement = planVisibleElasticTilesWithinMotion({
      positions,
      projectedById,
      protectionById: new Uint8Array([255, 0, 0]),
      movableTileIds,
      previousOffsetsById: offsets,
      currentOffsetsById: movedOffsets,
      anchorId: 0,
      viewportWidth: 160,
      viewportHeight: 100,
      tileVisualRadius: 18,
      viewX: 50,
      viewY: 50,
      maximumStepPx: 2
    });
    for (const [id, position] of settlement) positions.set(id, position);
  }
  for (const id of movableTileIds) {
    assert.deepEqual(positions.get(id), exactNorthUpLayoutPosition({
      projected: projectedById.get(id),
      viewX: 50,
      viewY: 50,
      viewportWidth: 160,
      viewportHeight: 100
    }));
  }
});

test("concealed grouped repairs converge north-up without opening a topology seam", () => {
  const angle = 14 * Math.PI / 180;
  const positions = new Map([[0, { x: 0, y: 0 }]]);
  const targetsById = new Map([[0, { x: 0, y: 0 }]]);
  for (let id = 1; id <= 5; id++) {
    const distance = id * 24;
    positions.set(id, {
      x: Math.round(Math.cos(angle) * distance),
      y: Math.round(Math.sin(angle) * distance)
    });
    targetsById.set(id, { x: distance, y: 0 });
  }
  const neighborsById = Array.from({ length: 6 }, () => []);
  for (let id = 0; id < 5; id++) {
    neighborsById[id].push(id + 1);
    neighborsById[id + 1].push(id);
  }
  const movingIds = new Set([1, 2, 3, 4, 5]);
  const surfaceMaskById = new Uint8Array([2, 2, 2, 2, 2, 2]);

  for (let pass = 0; pass < 120; pass++) {
    const repair = interpolateChartRepairPlan({
      positions,
      targetsById,
      tileIds: movingIds,
      maximumStepPx: 1
    });
    const constrained = constrainChartRepairToTopology({
      positions,
      proposedPositions: repair.nextPositions,
      referencePositions: targetsById,
      neighborsById,
      surfaceMaskById,
      landSlackPx: MAX_PROTECTED_ADMISSION_SLACK_PX,
      waterSlackPx: MAX_PROTECTED_ADMISSION_SLACK_PX * 2
    });
    for (const [id, point] of constrained) positions.set(id, point);
  }

  for (const [id, target] of targetsById) {
    assert.deepEqual(positions.get(id), target, `Concealed tile ${id} did not reach north-up`);
  }
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

test("new protected geometry stays within its three-pixel admission circle", () => {
  const rigid = rotatedAdmissionPoints(10);
  const corrected = rotatedAdmissionPoints(10);
  const live = rotatedAdmissionPoints(10);
  const topology = admissionTopology(3, [[0, 1], [1, 2]], 255);

  admitProjectedTiles({
    positions: rigid.positions,
    projectedById: rigid.projectedById,
    pendingIds: [2],
    anchorId: 0,
    ...topology
  });
  admitProjectedTiles({
    positions: corrected.positions,
    projectedById: corrected.projectedById,
    pendingIds: [2],
    anchorId: 0,
    ...topology,
    maxProtectedCorrectionPx: MAX_PROTECTED_ADMISSION_SLACK_PX
  });
  admitProjectedTiles({
    positions: live.positions,
    projectedById: live.projectedById,
    pendingIds: [2],
    anchorId: 0,
    ...topology,
    maxProtectedCorrectionPx: MAX_PROTECTED_ADMISSION_SLACK_PX,
    liveViewportAdmissionIds: new Set([2])
  });

  assert.ok(
    corrected.positions.get(2).y > rigid.positions.get(2).y,
    "Protected admission did not make its preventative north-up correction"
  );
  for (const id of [2]) {
    const baseline = rigid.positions.get(id);
    for (const [label, adjusted] of [
      ["buffered", corrected.positions.get(id)],
      ["live", live.positions.get(id)]
    ]) {
      assert.ok(
        Math.hypot(adjusted.x - baseline.x, adjusted.y - baseline.y) <=
          MAX_PROTECTED_ADMISSION_SLACK_PX,
        `Protected tile ${id} exceeded its ${label} admission circle`
      );
    }
  }
  for (const id of [0, 1]) {
    assert.deepEqual(corrected.positions.get(id), rigid.positions.get(id));
    assert.deepEqual(live.positions.get(id), rigid.positions.get(id));
  }
});

test("a directly protected coast remains attached to its retained protection buffer", () => {
  const positions = new Map([
    [0, { x: 0, y: 0 }],
    [1, { x: 0, y: 24 }]
  ]);
  const projectedById = new Map([
    [0, { x: 0, y: 0 }],
    [1, { x: 24, y: 0 }],
    [2, { x: 48, y: 0 }]
  ]);
  const neighborsById = [[1], [0, 2], [1]];
  const protectionById = new Uint8Array([0, 192, 255]);
  const directProtectionComponentById = new Int32Array([-1, -1, 0]);

  admitProjectedTiles({
    positions,
    projectedById,
    pendingIds: [2],
    anchorId: 0,
    neighborsById,
    protectionById,
    directProtectionComponentById,
    registrationIds: new Set([0, 1]),
    rigidRegistrationIds: new Set([0, 1]),
    correctElasticTilesNorthUp: true,
    maxElasticCorrectionPx: MAX_ELASTIC_FRAME_CORRECTION_PX,
    maxProtectedCorrectionPx: MAX_PROTECTED_ADMISSION_SLACK_PX,
    continuityMaskById: new Uint8Array([2, 2, 2]),
    maxContinuityCorrectionPx: MAX_PROTECTED_ADMISSION_SLACK_PX,
    protectedCorrectionViewportIds: new Set([0, 1, 2]),
    liveViewportAdmissionIds: new Set([2])
  });

  const buffer = positions.get(1);
  const coast = positions.get(2);
  assert.ok(
    Math.abs(Math.hypot(coast.x - buffer.x, coast.y - buffer.y) - 24) <=
      MAX_PROTECTED_ADMISSION_SLACK_PX,
    `Direct coast detached from its buffer: ${JSON.stringify({ buffer, coast })}`
  );
});

test("an over-constrained protected stitch can use retained-frame admission", () => {
  const topology = admissionTopology(3, [[0, 2], [1, 2]], 255);
  const projectedById = new Map([
    [0, { x: 0, y: 0 }],
    [1, { x: 24, y: 0 }],
    [2, { x: 12, y: 20 }]
  ]);
  const admissionArgs = {
    projectedById,
    pendingIds: [2],
    anchorId: 0,
    ...topology,
    directProtectionComponentById: new Int32Array([0, 0, 0]),
    registrationIds: new Set([0, 1]),
    rigidRegistrationIds: new Set([0, 1]),
    correctElasticTilesNorthUp: true,
    maxProtectedCorrectionPx: MAX_PROTECTED_ADMISSION_SLACK_PX,
    liveViewportAdmissionIds: new Set([2])
  };
  const strictPositions = new Map([
    [0, { x: 0, y: 0 }],
    [1, { x: 55, y: 0 }]
  ]);

  assert.throws(
    () => admitProjectedTiles({ positions: strictPositions, ...admissionArgs }),
    ProtectedChartStitchError
  );
  assert.equal(strictPositions.has(2), false);

  const recoveredPositions = new Map([
    [0, { x: 0, y: 0 }],
    [1, { x: 55, y: 0 }]
  ]);
  let recoveredError = null;
  const admitted = admitProjectedTiles({
    positions: recoveredPositions,
    ...admissionArgs,
    recoverProtectedStitchError: (error) => {
      recoveredError = error;
      return true;
    }
  });

  assert.equal(admitted, 1);
  assert.equal(recoveredError instanceof ProtectedChartStitchError, true);
  assert.equal(recoveredError.tileId, 2);
  assert.equal(recoveredError.neighborId, 1);
  assert.deepEqual(recoveredPositions.get(0), { x: 0, y: 0 });
  assert.deepEqual(recoveredPositions.get(1), { x: 55, y: 0 });
  assert.deepEqual(recoveredPositions.get(2), { x: 12, y: 20 });
});

test("declining protected stitch recovery preserves the strict failure", () => {
  const positions = new Map([
    [0, { x: 0, y: 0 }],
    [1, { x: 55, y: 0 }]
  ]);

  assert.throws(
    () => admitProjectedTiles({
      positions,
      projectedById: new Map([
        [0, { x: 0, y: 0 }],
        [1, { x: 24, y: 0 }],
        [2, { x: 12, y: 20 }]
      ]),
      pendingIds: [2],
      anchorId: 0,
      ...admissionTopology(3, [[0, 2], [1, 2]], 255),
      directProtectionComponentById: new Int32Array([0, 0, 0]),
      registrationIds: new Set([0, 1]),
      rigidRegistrationIds: new Set([0, 1]),
      correctElasticTilesNorthUp: true,
      maxProtectedCorrectionPx: MAX_PROTECTED_ADMISSION_SLACK_PX,
      liveViewportAdmissionIds: new Set([2]),
      recoverProtectedStitchError: () => false
    }),
    ProtectedChartStitchError
  );
  assert.equal(positions.has(2), false);
});

test("protected coastline entering beside corrected ocean keeps its component rigid", () => {
  const positions = new Map([
    [0, { x: 0, y: 0 }],
    [1, { x: 0, y: 24 }],
    [4, { x: 0, y: 24 }],
    [5, { x: 24, y: 24 }]
  ]);
  const projectedById = new Map([
    [0, { x: 0, y: 0 }],
    [1, { x: 24, y: 0 }],
    [2, { x: 48, y: 0 }],
    [3, { x: 72, y: 0 }],
    [4, { x: 0, y: 24 }],
    [5, { x: 24, y: 24 }]
  ]);
  const { neighborsById, protectionById } = admissionTopology(
    6,
    [[0, 1], [1, 2], [2, 3], [4, 5]],
    0
  );
  for (const id of [0, 1, 2, 3]) protectionById[id] = 255;

  admitProjectedTiles({
    positions,
    projectedById,
    pendingIds: [2, 3],
    anchorId: 0,
    neighborsById,
    protectionById,
    registrationIds: new Set([4, 5]),
    rigidRegistrationIds: new Set([0, 1, 4, 5]),
    correctElasticTilesNorthUp: true
  });

  assert.deepEqual(positions.get(2), { x: 0, y: 48 });
  assert.deepEqual(positions.get(3), { x: 0, y: 72 });
});

test("north-up correction preserves a protected one-tile sea channel", () => {
  const positions = new Map([
    [0, { x: 0, y: 0 }],
    [1, { x: 21, y: 12 }],
    [3, { x: 0, y: 24 }],
    [4, { x: 24, y: 24 }]
  ]);
  const projectedById = new Map([
    [0, { x: 0, y: 0 }],
    [1, { x: 24, y: 0 }],
    [2, { x: 48, y: 0 }],
    [3, { x: 0, y: 24 }],
    [4, { x: 24, y: 24 }]
  ]);
  const { neighborsById, protectionById } = admissionTopology(
    5,
    [[0, 1], [1, 2], [3, 4]],
    0
  );
  for (const id of [0, 1, 2]) protectionById[id] = 255;

  admitProjectedTiles({
    positions,
    projectedById,
    pendingIds: [2],
    anchorId: 0,
    neighborsById,
    protectionById,
    registrationIds: new Set([3, 4]),
    rigidRegistrationIds: new Set([0, 1, 3, 4]),
    correctElasticTilesNorthUp: true
  });

  assert.deepEqual(positions.get(2), { x: 42, y: 24 });
  assert.ok(Math.abs(Math.hypot(
    positions.get(1).x - positions.get(0).x,
    positions.get(1).y - positions.get(0).y
  ) - 24) < 0.5);
  assert.ok(Math.abs(Math.hypot(
    positions.get(2).x - positions.get(1).x,
    positions.get(2).y - positions.get(1).y
  ) - 24) < 0.5);
});

test("a disconnected protected fragment enters north-up until adjacency reconnects it", () => {
  const positions = new Map([
    [0, { x: 0, y: 0 }],
    [1, { x: 0, y: 24 }],
    [4, { x: 0, y: 24 }],
    [5, { x: 24, y: 24 }]
  ]);
  const projectedById = new Map([
    [0, { x: 0, y: 0 }],
    [1, { x: 24, y: 0 }],
    [2, { x: 200, y: 0 }],
    [3, { x: 224, y: 0 }],
    [4, { x: 0, y: 24 }],
    [5, { x: 24, y: 24 }]
  ]);
  const { neighborsById, protectionById } = admissionTopology(
    6,
    [[0, 1], [2, 3], [4, 5]],
    0
  );
  for (const id of [0, 1, 2, 3]) protectionById[id] = 255;
  const directProtectionComponentById = new Int32Array([7, 7, 7, 7, -1, -1]);

  admitProjectedTiles({
    positions,
    projectedById,
    pendingIds: [2, 3],
    anchorId: 0,
    neighborsById,
    protectionById,
    directProtectionComponentById,
    registrationIds: new Set([4, 5]),
    rigidRegistrationIds: new Set([0, 1, 4, 5]),
    correctElasticTilesNorthUp: true
  });

  assert.deepEqual(positions.get(2), { x: 200, y: 0 });
  assert.deepEqual(positions.get(3), { x: 224, y: 0 });
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

test("a badly tilted coastal chart recovers after entering open ocean with live anchor selection", () => {
  const result = simulateFiniteOceanCrossing({
    refreshOffscreenEachStep: true,
    resolveNearestAnchor: true,
    initialRotationDeg: 21
  });

  assert.ok(
    Math.abs(result.initialRotationDeg) >= 20,
    `Open-ocean recovery regression did not begin badly tilted ` +
      `(${result.initialRotationDeg.toFixed(2)} degrees)`
  );
  assert.ok(
    Math.abs(result.exitRotationDeg) <= 2,
    `Open-ocean recovery retained ${result.exitRotationDeg.toFixed(2)} degrees of tilt`
  );
  assert.ok(
    result.maximumAbsoluteRotationDeg <= Math.abs(result.initialRotationDeg) + 0.5,
    `Open-ocean correction worsened tilt from ${result.initialRotationDeg.toFixed(2)} to ` +
      `${result.maximumAbsoluteRotationDeg.toFixed(2)} degrees`
  );
});

test("a finite uniform ocean absorbs large tilt in either direction with production limits", () => {
  for (const initialRotationDeg of [-45, -21, 21, 45]) {
    const result = simulateFiniteOceanCrossing({
      refreshOffscreenEachStep: true,
      resolveNearestAnchor: true,
      initialRotationDeg
    });
    assert.ok(
      Math.abs(result.exitRotationDeg) <= 2,
      `${initialRotationDeg} degree ocean entry retained ` +
        `${result.exitRotationDeg.toFixed(2)} degrees at the far shore`
    );
    assert.ok(
      result.maximumAbsoluteRotationDeg <= Math.abs(result.initialRotationDeg) + 0.5,
      `${initialRotationDeg} degree ocean correction first worsened to ` +
        `${result.maximumAbsoluteRotationDeg.toFixed(2)} degrees`
    );
  }
});

test("protected geography corrects gradually instead of using the full ocean reset", () => {
  const result = simulateOceanViewportTurnover({ protectedViewport: true });

  assert.ok(
    Math.abs(result.finalRotationDeg) >= 2,
    `Protected viewport corrected in one visible jump to ${result.finalRotationDeg.toFixed(2)} degrees`
  );
  assert.ok(
    Math.abs(result.finalRotationDeg) < Math.abs(result.initialRotationDeg),
    `Protected viewport did not improve from ${result.initialRotationDeg.toFixed(2)} degrees`
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
  assert.doesNotThrow(() => refreshOffscreenLayoutTiles({
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

test("fully offscreen protected geography is rebuilt before it returns", () => {
  const positions = new Map([
    [0, { x: 50, y: 50 }],
    [1, { x: 82, y: 50 }],
    [2, { x: 170, y: 50 }]
  ]);
  const projectedTiles = [
    { id: 0, x: 50, y: 50 },
    { id: 1, x: 82, y: 50 },
    { id: 2, x: 170, y: 50 }
  ];
  const protectionById = new Uint8Array([255, 255, 255]);

  const discarded = refreshOffscreenLayoutTiles({
    positions,
    projectedTiles,
    protectionById,
    viewportWidth: 100,
    viewportHeight: 100,
    tileVisualRadius: 18,
    anchorId: 0
  });

  assert.equal(discarded, 1);
  assert.equal(positions.has(0), true);
  assert.equal(positions.has(1), true);
  assert.equal(positions.has(2), false);
});

test("offscreen eviction follows the authoritative drawn position", () => {
  const positions = new Map([
    [0, { x: 50, y: 50 }],
    [1, { x: 170, y: 50 }]
  ]);
  const projectedTiles = [
    { id: 0, x: 50, y: 50 },
    { id: 1, x: 60, y: 50 }
  ];

  const discarded = refreshOffscreenLayoutTiles({
    positions,
    projectedTiles,
    protectionById: new Uint8Array([255, 255]),
    viewportWidth: 100,
    viewportHeight: 100,
    tileVisualRadius: 18,
    anchorId: 0
  });

  assert.equal(discarded, 1);
  assert.equal(positions.has(1), false);
});

test("offscreen eviction retains every sprite still visible through the camera offset", () => {
  const positions = new Map([
    [0, { x: 0, y: 0 }],
    [1, { x: -42, y: 0 }],
    [2, { x: 72, y: 0 }]
  ]);
  const projectedTiles = [
    { id: 0, x: 50, y: 50 },
    { id: 1, x: 8, y: 50 },
    { id: 2, x: 122, y: 50 }
  ];

  const discarded = refreshOffscreenLayoutTiles({
    positions,
    projectedTiles,
    protectionById: new Uint8Array([255, 255, 255]),
    viewportWidth: 100,
    viewportHeight: 100,
    tileVisualRadius: 18,
    anchorId: 0,
    viewX: 0,
    viewY: 0
  });

  assert.equal(discarded, 1);
  assert.deepEqual(positions.get(1), { x: -42, y: 0 });
  assert.equal(positions.has(2), false);
});

test("offscreen eviction can retain a connector endpoint beyond the tile sprite radius", () => {
  const positions = new Map([
    [0, { x: 50, y: 50 }],
    [1, { x: -30, y: 50 }]
  ]);
  const projectedTiles = [
    { id: 0, x: 50, y: 50 },
    { id: 1, x: -30, y: 50 }
  ];

  const discarded = refreshOffscreenLayoutTiles({
    positions,
    projectedTiles,
    protectionById: new Uint8Array([255, 255]),
    viewportWidth: 100,
    viewportHeight: 100,
    tileVisualRadius: 36,
    anchorId: 0
  });

  assert.equal(discarded, 0);
  assert.deepEqual(positions.get(1), { x: -30, y: 50 });
});

test("offscreen refresh solves only the approach band around the viewport", () => {
  const positions = new Map([
    [0, { x: 50, y: 50 }],
    [1, { x: 240, y: 50 }],
    [2, { x: 240, y: 50 }],
    [3, { x: 120, y: 50 }]
  ]);
  const projectedTiles = [
    { id: 0, x: 50, y: 50 },
    { id: 1, x: 240, y: 50 },
    { id: 2, x: 120, y: 50 },
    { id: 3, x: 240, y: 50 }
  ];

  const discarded = refreshOffscreenLayoutTiles({
    positions,
    projectedTiles,
    protectionById: new Uint8Array(4),
    viewportWidth: 100,
    viewportHeight: 100,
    tileVisualRadius: 10,
    refreshMarginPx: 24,
    anchorId: 0
  });

  assert.equal(discarded, 2);
  assert.equal(positions.has(1), true, "distant cached tile was needlessly refreshed");
  assert.equal(positions.has(2), false, "projected approach tile was not refreshed");
  assert.equal(positions.has(3), false, "drawn approach tile was not refreshed");
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
    registered.maxNeighborStretch < 1.3,
    `High-latitude traversal stretched a neighboring tile edge by ${registered.maxNeighborStretch.toFixed(3)}x`
  );
  assert.ok(
    translationOnly.maxNeighborDistance > registered.maxNeighborDistance + 10,
    "Traversal regression must detect the former translation-only frame mismatch"
  );
});

test("a moving Lisbon-to-Kamchatka-to-Lisbon circuit never redraws visible geography", () => {
  const result = simulateLisbonToKamchatkaCoastalVoyage();
  reportChartBenchmark("world-circuit", result);

  assert.ok(
    result.movementFrames >= 3000,
    `Coastal voyage was too coarsely sampled (${result.movementFrames} moving frames)`
  );
  assert.ok(
    result.chartBuilds >= 100,
    `Coastal voyage rebuilt too few moving charts (${result.chartBuilds})`
  );
  assert.ok(
    result.stepsWithProtectedCoast >= 50,
    `Coastal voyage sampled too little protected geography ` +
      `(${result.stepsWithProtectedCoast} moving frames)`
  );
  assert.ok(
    result.maxVisibleProtectedAdmissionShiftPx <= MAX_PROTECTED_ADMISSION_SLACK_PX,
    `Visible protected admission shifted ${result.maxVisibleProtectedAdmissionShiftPx.toFixed(2)}px`
  );
  assert.equal(
    result.visibleProtectedRedraws,
    0,
    "A protected tile that was already visible was discarded or moved during the voyage"
  );
  assert.equal(
    result.visibleLandRedraws,
    0,
    "A land tile that was already visible was discarded or moved during the voyage"
  );
  assert.ok(
    result.maxRotationDeg <= 6,
    `No-stop world circuit exceeded its emergency tilt bound at ` +
      `${result.maxRotationDeg.toFixed(2)} degrees`
  );
  assert.equal(
    result.missingVisibleLandNeighbors,
    0,
    "No-stop world circuit omitted connected land inside the viewport"
  );
  assertLandTraversalIsContinuous(result, "Round-the-world coastal voyage");
  assert.ok(
    Math.abs(result.finalProtectedRotationDeg) <= 9,
    `Round-the-world protected coast finished at ` +
      `${result.finalProtectedRotationDeg.toFixed(2)} degrees of tilt`
  );
  assertTraversalRepairBurden(result, "Round-the-world coastal voyage", 100);
});

test("a coast-heavy Mediterranean crossing keeps protected geography north-up", () => {
  const result = simulateLisbonToKamchatkaCoastalVoyage(
    MAX_PROTECTED_ADMISSION_SLACK_PX,
    {
      routeWaypoints: [
        [38.72, -9.14],
        [36.0, -5.5],
        [37.6, -0.98],
        [41.3, 2.1],
        [43.3, 5.3],
        [44.4, 8.9],
        [40.8, 14.2],
        [38.1, 13.4],
        [35.9, 14.5],
        [35.3, 25.1],
        [36.4, 28.2],
        [34.7, 33.0],
        [31.2, 29.9]
      ],
      subdivisions: 7,
      pixelsPerRadian: 2450,
      chartMargin: 218,
      usePolarFogRepairs: true,
      applyVisualRepairs: false
    }
  );
  reportChartBenchmark("mediterranean", result);

  assert.ok(
    result.movementFrames >= 400,
    `Mediterranean crossing was too coarsely sampled (${result.movementFrames} moving frames)`
  );
  assert.ok(
    result.chartBuilds >= 60,
    `Mediterranean crossing rebuilt too few moving charts (${result.chartBuilds})`
  );
  assert.ok(
    result.stepsWithProtectedCoast >= 60,
    `Mediterranean crossing sampled too little protected coastline ` +
      `(${result.stepsWithProtectedCoast} moving charts)`
  );
  assert.ok(
    result.protectedEdgeSamples >= 100,
    `Mediterranean crossing measured too few protected land edges ` +
      `(${result.protectedEdgeSamples})`
  );
  assert.equal(result.visibleProtectedRedraws, 0);
  assert.equal(result.visibleLandRedraws, 0);
  assert.equal(result.polarFogRepairPasses, 0, "Warm-water traversal used polar fog");
  assert.equal(result.maxPolarFogRepairPressure, 0, "Warm-water traversal raised polar fog");
  assert.ok(
    result.maxRotationDeg <= 6,
    `Mediterranean chart reached ${result.maxRotationDeg.toFixed(2)} degrees of tilt`
  );
  assert.ok(
    result.maxProtectedEdgeErrorPx <= MAX_VISIBLE_PROTECTED_EDGE_LENGTH_ERROR_PX,
    `Mediterranean protected edge opened by ` +
      `${result.maxProtectedEdgeErrorPx.toFixed(2)}px of separation at ` +
      `${JSON.stringify(result.maxProtectedEdgeDetails)}`
  );
  assertLandTraversalIsContinuous(result, "Mediterranean crossing");
  assert.ok(
    Math.abs(result.finalProtectedRotationDeg) <= 4,
    `Mediterranean coast finished at ${result.finalProtectedRotationDeg.toFixed(2)} degrees ` +
      `(whole chart ${result.finalRotationDeg.toFixed(2)} degrees, ` +
      `maximum ${result.maxProtectedRotationDeg.toFixed(2)} degrees near ` +
      `${result.maxProtectedRotationLocation}; samples ` +
      `${result.rotationSamples.map((sample) => (
        `${sample.step}:${sample.protected.toFixed(1)}`
      )).join("/")})`
  );
  assertTraversalRepairBurden(result, "Mediterranean crossing", 25);
});

test("a Cape-to-Portugal Atlantic loop reaches Madeira with an intact coast", () => {
  const result = simulateLisbonToKamchatkaCoastalVoyage(
    MAX_PROTECTED_ADMISSION_SLACK_PX,
    {
      routeWaypoints: [
        [-34.0, 18.4],
        [-35.0, 5.0],
        [-32.0, -15.0],
        [-24.0, -32.0],
        [-8.0, -40.0],
        [8.0, -38.0],
        [22.0, -29.0],
        [31.5, -20.0],
        [32.65, -16.9],
        [36.0, -12.0],
        [38.72, -9.14]
      ],
      subdivisions: 7,
      pixelsPerRadian: 2450,
      chartMargin: 218,
      useGameWorld: true,
      usePolarFogRepairs: false
    }
  );
  reportChartBenchmark("cape-atlantic-portugal", result);

  assert.ok(
    result.stepsWithoutProtectedCoast >= 20,
    `Atlantic loop sampled too little elastic open water ` +
      `(${result.stepsWithoutProtectedCoast} open-water chart builds)`
  );
  assert.equal(result.visibleProtectedRedraws, 0);
  assert.equal(result.visibleLandRedraws, 0);
  assert.ok(
    result.maxProtectedEdgeErrorPx <= MAX_VISIBLE_PROTECTED_EDGE_LENGTH_ERROR_PX,
    `Cape-to-Portugal coast opened by ${result.maxProtectedEdgeErrorPx.toFixed(2)}px at ` +
      `${JSON.stringify(result.maxProtectedEdgeDetails)}`
  );
  assert.ok(
    result.maxPostAdmissionLandEdgeGapPx <= MAX_VISIBLE_PROTECTED_EDGE_LENGTH_ERROR_PX,
    `Cape-to-Portugal admission opened a ${result.maxPostAdmissionLandEdgeGapPx.toFixed(2)}px ` +
      `land gap at ${JSON.stringify(result.maxPostAdmissionLandEdgeGapDetails)}`
  );
  assert.ok(
    Math.abs(result.finalProtectedRotationDeg) <= 4,
    `Portugal coast finished at ${result.finalProtectedRotationDeg.toFixed(2)} degrees of tilt`
  );
  assertLandTraversalIsContinuous(result, "Cape-to-Portugal Atlantic loop");
});

test("an east-to-west Scandinavia traversal escalates concealed repair before geometry fails", () => {
  const result = simulateLisbonToKamchatkaCoastalVoyage(
    MAX_PROTECTED_ADMISSION_SLACK_PX,
    {
      routeWaypoints: [
        [64.2, 41.7],
        [66.2, 41.0],
        [68.0, 39.0],
        [70.0, 34.0],
        [71.2, 26.0],
        [71.5, 18.0],
        [70.8, 11.0],
        [69.0, 8.5],
        [66.0, 7.5],
        [63.0, 5.0],
        [60.0, 4.5],
        [58.0, 2.0],
        [57.0, -2.0],
        [55.8, -5.0]
      ],
      subdivisions: 7,
      pixelsPerRadian: 2450,
      chartMargin: 218,
      usePolarFogRepairs: true
    }
  );
  reportChartBenchmark("scandinavia", result);
  assert.equal(result.visibleProtectedRedraws, 0);
  assert.equal(result.visibleLandRedraws, 0);
  assert.ok(
    result.maxRotationDeg <= 6,
    `Scandinavian chart escaped repair control at ${result.maxRotationDeg.toFixed(2)} degrees`
  );
  assert.ok(
    result.maxProtectedEdgeErrorPx <= MAX_VISIBLE_PROTECTED_EDGE_LENGTH_ERROR_PX,
    `Scandinavian protected edge opened by ` +
      `${result.maxProtectedEdgeErrorPx.toFixed(2)}px at ` +
      `${JSON.stringify(result.maxProtectedEdgeDetails)}`
  );
  assert.ok(
    result.maxTerrainEdgeGapPx <= 12,
    `Scandinavian chart opened an extreme ${result.maxTerrainEdgeGapPx.toFixed(2)}px terrain gap`
  );
  assert.ok(
    result.maxTerrainEdgeCompressionPx <= 16,
    `Scandinavian chart compressed a visible edge by ` +
      `${result.maxTerrainEdgeCompressionPx.toFixed(2)}px`
  );
  assert.ok(result.polarFogRepairPasses > 0, "Polar fog never repaired the moving chart");
  assert.ok(result.polarFogTilesSettled > 0, "Polar fog did not settle any chart tiles");
  assert.ok(
    result.firstCompressionRepairPx === null || result.firstCompressionRepairPx <= 7,
    `Scandinavian repair waited for ${result.firstCompressionRepairPx?.toFixed(2)}px compression`
  );
  assert.ok(
    result.maxPolarFogRepairPressure >= 0.9,
    "Polar edge fog did not tighten around the clear navigational neighborhood"
  );
  assert.equal(
    result.repairDemand.fullCloudBanks,
    0,
    "Scandinavian traversal summoned general clouds instead of using existing polar fog"
  );
  assertLandTraversalIsContinuous(result, "Scandinavian crossing");
  assertTraversalRepairBurden(result, "Scandinavian crossing", 45);
});

test("a Scandinavia traversal into the Baltic reaches Gotland without distortion", () => {
  const result = simulateLisbonToKamchatkaCoastalVoyage(
    MAX_PROTECTED_ADMISSION_SLACK_PX,
    {
      routeWaypoints: [
        [64.2, 41.7],
        [68.0, 39.0],
        [71.2, 26.0],
        [71.5, 18.0],
        [69.0, 8.5],
        [63.0, 5.0],
        [58.0, 2.0],
        [56.0, 7.0],
        [55.5, 11.0],
        [56.0, 15.0],
        [57.0, 18.0],
        [58.15, 20.64],
        [59.5, 24.0],
        [59.8, 29.0]
      ],
      subdivisions: 7,
      pixelsPerRadian: 2450,
      chartMargin: 218,
      useGameWorld: true,
      usePolarFogRepairs: true
    }
  );
  reportChartBenchmark("scandinavia-baltic", result);

  assert.equal(result.visibleProtectedRedraws, 0);
  assert.equal(result.visibleLandRedraws, 0);
  assert.ok(
    result.maxRmsDistortionPx <= 12,
    `Baltic chart reached ${result.maxRmsDistortionPx.toFixed(2)}px RMS distortion`
  );
  assert.ok(
    result.maxProtectedEdgeErrorPx <= MAX_VISIBLE_PROTECTED_EDGE_LENGTH_ERROR_PX,
    `Baltic protected edge opened by ${result.maxProtectedEdgeErrorPx.toFixed(2)}px at ` +
      `${JSON.stringify(result.maxProtectedEdgeDetails)}`
  );
  assertLandTraversalIsContinuous(result, "Scandinavia-to-Baltic crossing");
});

test("a northbound Scotland-to-Arctic-Norway voyage never outruns drawn terrain", () => {
  const result = simulateLisbonToKamchatkaCoastalVoyage(
    MAX_PROTECTED_ADMISSION_SLACK_PX,
    {
      routeWaypoints: [
        [55.9, -4.3],
        [58.0, -2.0],
        [60.0, 1.5],
        [62.0, 4.5],
        [64.0, 6.0],
        [66.0, 10.0],
        [68.0, 14.0],
        [70.0, 19.0],
        [71.5, 25.0],
        [73.0, 30.0]
      ],
      subdivisions: 7,
      pixelsPerRadian: 2450,
      chartMargin: 218,
      usePolarFogRepairs: true
    }
  );
  reportChartBenchmark("scotland-arctic-norway", result);

  assert.ok(
    result.maxViewportCoverageGapPx <= 36,
    `Northbound chart left ${result.maxViewportCoverageGapPx.toFixed(2)}px of empty viewport ` +
      `near ${JSON.stringify(result.maxViewportCoverageGapDetails)}`
  );
  assert.equal(result.missingVisibleLandNeighbors, 0);
  assert.equal(result.visibleLandRedraws, 0);
  assert.ok(
    result.maxRmsDistortionPx <= 12,
    `Northbound chart reached ${result.maxRmsDistortionPx.toFixed(2)}px RMS distortion`
  );
  assert.ok(
    result.maxTerrainEdgeCompressionPx <= 12,
    `Northbound chart compressed a visible edge by ` +
      `${result.maxTerrainEdgeCompressionPx.toFixed(2)}px`
  );
});

test("a Scotland-to-Iceland voyage repairs North Atlantic distortion", () => {
  const result = simulateLisbonToKamchatkaCoastalVoyage(
    MAX_PROTECTED_ADMISSION_SLACK_PX,
    {
      routeWaypoints: [
        [55.9, -4.3],
        [56.53, -2.66],
        [58.0, -5.0],
        [59.5, -9.0],
        [60.5, -13.5],
        [61.46, -17.72],
        [63.0, -20.0],
        [64.15, -21.94]
      ],
      subdivisions: 7,
      pixelsPerRadian: 2450,
      chartMargin: 218,
      useGameWorld: true,
      usePolarFogRepairs: true
    }
  );
  reportChartBenchmark("scotland-iceland", result);

  assert.equal(result.visibleProtectedRedraws, 0);
  assert.equal(result.visibleLandRedraws, 0);
  assert.ok(
    result.maxRotationDeg <= 6,
    `North Atlantic chart reached ${result.maxRotationDeg.toFixed(2)} degrees of tilt`
  );
  assert.ok(
    result.maxRmsDistortionPx <= 12,
    `North Atlantic chart reached ${result.maxRmsDistortionPx.toFixed(2)}px RMS distortion`
  );
  assert.ok(
    result.maxTerrainEdgeCompressionPx <= 12,
    `North Atlantic chart compressed a visible edge by ` +
      `${result.maxTerrainEdgeCompressionPx.toFixed(2)}px`
  );
  assertLandTraversalIsContinuous(result, "Scotland-to-Iceland crossing");
});

test("a south-to-north Argentina coastal traversal cannot tear adjacent land", () => {
  const result = simulateLisbonToKamchatkaCoastalVoyage(
    MAX_PROTECTED_ADMISSION_SLACK_PX,
    {
      routeWaypoints: [
        [38.7, -9.1],
        [20.0, -17.0],
        [0.0, -25.0],
        [-20.0, -35.0],
        [-40.0, -50.0],
        [-54.8, -67.5],
        [-51.0, -68.0],
        [-47.0, -66.0],
        [-43.0, -64.0],
        [-39.0, -62.0],
        [-35.0, -58.0],
        [-32.0, -53.0]
      ],
      subdivisions: 7,
      pixelsPerRadian: 2450,
      chartMargin: 218
    }
  );
  reportChartBenchmark("argentina", result);

  assert.equal(result.visibleProtectedRedraws, 0);
  assert.equal(result.visibleLandRedraws, 0);
  assert.ok(
    result.maxRotationDeg <= 8,
    `Argentina chart reached ${result.maxRotationDeg.toFixed(2)} degrees of tilt`
  );
  assert.ok(
    result.maxProtectedEdgeErrorPx <= MAX_VISIBLE_PROTECTED_EDGE_LENGTH_ERROR_PX,
    `Argentina protected edge opened by ` +
      `${result.maxProtectedEdgeErrorPx.toFixed(2)}px at ` +
      `${JSON.stringify(result.maxProtectedEdgeDetails)}`
  );
  assert.ok(
    result.maxTerrainEdgeGapPx <= 30,
    `Argentina chart opened an extreme ${result.maxTerrainEdgeGapPx.toFixed(2)}px terrain gap`
  );
  assertTraversalRepairBurden(result, "Argentina crossing", 30);
});

test("a western Patagonia fjord traversal repairs broad distortion without stalling", () => {
  const result = simulateLisbonToKamchatkaCoastalVoyage(
    MAX_PROTECTED_ADMISSION_SLACK_PX,
    {
      routeWaypoints: [
        [-35.0, -95.0],
        [-42.0, -84.0],
        [-49.0, -78.0],
        [-53.5, -75.5],
        [-55.0, -70.0],
        [-52.2, -74.33],
        [-49.0, -75.2],
        [-45.0, -74.8],
        [-41.0, -73.8]
      ],
      subdivisions: 7,
      pixelsPerRadian: 2450,
      chartMargin: 218,
      useGameWorld: true,
      usePolarFogRepairs: true
    }
  );
  reportChartBenchmark("western-patagonia", result);

  assert.equal(result.visibleProtectedRedraws, 0);
  assert.equal(result.visibleLandRedraws, 0);
  assert.ok(
    result.maxRotationDeg <= 6,
    `Western Patagonia chart reached ${result.maxRotationDeg.toFixed(2)} degrees of tilt`
  );
  assert.ok(
    result.maxRmsDistortionPx <= 12,
    `Western Patagonia chart reached ${result.maxRmsDistortionPx.toFixed(2)}px RMS distortion`
  );
  assert.ok(
    result.maxProtectedEdgeErrorPx <= MAX_VISIBLE_PROTECTED_EDGE_LENGTH_ERROR_PX,
    `Western Patagonia protected edge opened by ` +
      `${result.maxProtectedEdgeErrorPx.toFixed(2)}px at ` +
      `${JSON.stringify(result.maxProtectedEdgeDetails)}`
  );
  assertLandTraversalIsContinuous(result, "Western Patagonia crossing");
  assertTraversalRepairBurden(result, "Western Patagonia crossing", 35);
});

test("a moving river voyage to Smolensk cannot tear visible land", () => {
  const result = simulateLisbonToKamchatkaCoastalVoyage(
    MAX_PROTECTED_ADMISSION_SLACK_PX,
    {
      routeWaypoints: [
        [46.5, 32.0],
        [47.4, 34.2],
        [49.0, 34.0],
        [50.45, 30.52],
        [52.0, 31.0],
        [53.5, 32.0],
        [54.78, 32.04]
      ],
      subdivisions: 7,
      pixelsPerRadian: 2450,
      chartMargin: 218,
      useGameWorld: true
    }
  );
  reportChartBenchmark("smolensk", result);

  assert.equal(result.visibleLandRedraws, 0);
  assertLandTraversalIsContinuous(result, "Smolensk river voyage");
  assertTraversalRepairBurden(result, "Smolensk river voyage", 5);
});

test("uniform land cannot masquerade as the elastic ocean correction reservoir", () => {
  const support = viewportElasticCorrectionSupport({
    projectedTiles: [
      { id: 0, x: 20, y: 20 },
      { id: 1, x: 50, y: 20 },
      { id: 2, x: 80, y: 20 },
      { id: 3, x: 50, y: 50 }
    ],
    protectionById: new Uint8Array(4),
    elasticityMaskById: new Uint8Array([0, 0, 0, 1]),
    viewportWidth: 100,
    viewportHeight: 70,
    tileVisualRadius: 18
  });

  assert.deepEqual([...support.elasticTileIds], [3]);
  assert.equal(support.correctionActive, false);
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
    const projectedVisible = collectTraversalTiles(graph, camera, {
      viewportWidth: 455,
      viewportHeight: 256
    });
    const projectedById = new Map(projectedVisible.map((point) => [point.id, point]));
    const admissionAnchorId = resolveLocalLayoutAnchor({
      positions,
      projectedById,
      preferredAnchorId: centerId,
      viewX,
      viewY
    });
    const pendingIds = projectedVisible
      .map((point) => point.id)
      .filter((id) => !positions.has(id));
    const pendingAnchorIndex = pendingIds.indexOf(admissionAnchorId);
    if (pendingAnchorIndex >= 0) pendingIds.splice(pendingAnchorIndex, 1);

    admittedTotal += admitTiles({
      positions,
      projectedById,
      pendingIds,
      anchorId: admissionAnchorId,
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

function simulateLisbonToKamchatkaCoastalVoyage(
  maxProtectedCorrectionPx = MAX_PROTECTED_ADMISSION_SLACK_PX,
  {
    routeWaypoints = null,
    subdivisions = 5,
    pixelsPerRadian = TRAVERSAL_PIXELS_PER_RADIAN,
    chartMargin = TRAVERSAL_MARGIN,
    useGameWorld = false,
    usePolarFogRepairs = true,
    applyVisualRepairs = true
  } = {}
) {
  const graph = buildGeodesicGraph(subdivisions);
  const directionIndex = createDirectionIndex(graph);
  const route = geographicRouteDirections(routeWaypoints || [
    [38.72, -9.14],
    [20.0, -17.0],
    [5.0, -5.0],
    [-10.0, 5.0],
    [-25.0, 13.0],
    [-35.0, 20.0],
    [-20.0, 35.0],
    [-5.0, 40.0],
    [12.0, 50.0],
    [22.0, 59.0],
    [19.0, 72.0],
    [8.0, 81.0],
    [5.0, 96.0],
    [1.5, 104.0],
    [10.0, 108.0],
    [24.0, 120.0],
    [38.0, 135.0],
    [58.0, 163.0],
    [53.0, 179.0],
    [56.0, -155.0],
    [52.0, -135.0],
    [45.0, -125.0],
    [37.0, -123.0],
    [30.0, -118.0],
    [23.0, -111.0],
    [16.0, -101.0],
    [11.0, -90.0],
    [8.0, -80.0],
    [-10.0, -78.0],
    [-35.0, -73.0],
    [-55.0, -68.0],
    [-35.0, -55.0],
    [-15.0, -40.0],
    [5.0, -30.0],
    [25.0, -20.0],
    [38.72, -9.14]
  ], 0.1);
  const { protectionById, terrainClassByTileId } = useGameWorld
    ? gameWorldProtection(graph)
    : worldCoastProtection(graph);
  const continuityMaskById = Uint8Array.from(
    terrainClassByTileId,
    (terrainClass) => terrainClass === "water" ? 1 : 2
  );
  const directProtectionComponentById = buildDirectChartProtectionComponents({
    graph,
    protection: protectionById
  });
  const positions = new Map();
  const admittedStepById = new Map();
  let camera = northUpFrame(route[0]);
  let previousDirection = route[0];
  let viewX = TRAVERSAL_SCREEN_W / 2;
  let viewY = TRAVERSAL_SCREEN_H / 2;
  let maxRotationDeg = 0;
  let maxRmsDistortionPx = 0;
  let maxDistortionPx = 0;
  let maxTerrainEdgeGapPx = 0;
  let maxTerrainEdgeCompressionPx = 0;
  let firstCompressionRepairPx = null;
  let maxProtectedRotationDeg = 0;
  let maxProtectedRotationStep = 0;
  let maxProtectedRotationLocation = "unknown";
  let maxRotationStep = 0;
  let maxRotationLocation = "unknown";
  let finalRotationDeg = 0;
  let finalProtectedRotationDeg = 0;
  let maxProtectedEdgeStretch = 0;
  let maxProtectedEdgeErrorPx = 0;
  let maxProtectedEdgeDetails = null;
  let maxLandEdgeGapPx = 0;
  let maxLandEdgeGapDetails = null;
  let maxPostAdmissionLandEdgeGapPx = 0;
  let maxPostAdmissionLandEdgeGapDetails = null;
  let missingVisibleLandNeighbors = 0;
  let firstMissingVisibleLandNeighbor = null;
  let maxVisibleProtectedAdmissionShiftPx = 0;
  let maxViewportCoverageGapPx = 0;
  let maxViewportCoverageGapDetails = null;
  let visibleProtectedRedraws = 0;
  let visibleLandRedraws = 0;
  let protectedEdgeSamples = 0;
  let stepsWithoutProtectedCoast = 0;
  let stepsWithProtectedCoast = 0;
  let chartBuilds = 0;
  let polarFogRepairPasses = 0;
  let polarFogTilesSettled = 0;
  let polarFogRepairPressure = 0;
  let maxPolarFogRepairPressure = 0;
  let distanceSinceBuildPx = Number.POSITIVE_INFINITY;
  const rotationSamples = [];
  const repairDemand = createTraversalRepairDemand();

  for (let step = 0; step < route.length; step++) {
    const direction = route[step];
    if (step > 0) {
      const delta = [
        direction[0] - previousDirection[0],
        direction[1] - previousDirection[1],
        direction[2] - previousDirection[2]
      ];
      const moveX = dot3(delta, camera.right) * pixelsPerRadian;
      const moveY = -dot3(delta, camera.up) * pixelsPerRadian;
      viewX += moveX;
      viewY += moveY;
      distanceSinceBuildPx += Math.hypot(moveX, moveY);
      camera = northUpFrame(direction);
      previousDirection = direction;
    }
    if (
      step < route.length - 1 &&
      distanceSinceBuildPx < TRAVERSAL_REBUILD_DISTANCE_PX
    ) {
      const coverage = measureTraversalViewportCoverage(positions, viewX, viewY);
      if (coverage.gapPx > maxViewportCoverageGapPx) {
        maxViewportCoverageGapPx = coverage.gapPx;
        maxViewportCoverageGapDetails = {
          step,
          location: directionLocation(direction),
          ...coverage
        };
      }
      continue;
    }
    distanceSinceBuildPx = 0;
    chartBuilds++;

    const centerId = findNearestTileId(graph, directionIndex, direction);
    const projectedTiles = collectTraversalTiles(graph, camera, {
      centerId,
      pixelsPerRadian,
      chartMargin
    });
    const collectedIds = new Set(projectedTiles.map(({ id }) => id));
    for (const [id, position] of positions.entries()) {
      const screenX = position.x - viewX + TRAVERSAL_SCREEN_W / 2;
      const screenY = position.y - viewY + TRAVERSAL_SCREEN_H / 2;
      if (
        collectedIds.has(id) ||
        screenX < -18 || screenX > TRAVERSAL_SCREEN_W + 18 ||
        screenY < -18 || screenY > TRAVERSAL_SCREEN_H + 18
      ) {
        continue;
      }
      const projected = projectDirection(graphCenter(graph, id), camera, pixelsPerRadian);
      if (!projected) {
        throw new Error(`Cannot retain visible traversal tile in chart projection: ${id}`);
      }
      projectedTiles.push({ id, ...projected });
      collectedIds.add(id);
    }
    const projectedById = new Map(projectedTiles.map((point) => [point.id, point]));
    const hadCenter = positions.has(centerId);
    const admissionAnchorId = resolveLocalLayoutAnchor({
      positions,
      projectedById,
      preferredAnchorId: centerId,
      viewX,
      viewY
    });
    if (!hadCenter && admissionAnchorId === centerId) admittedStepById.set(centerId, step);
    const support = viewportElasticCorrectionSupport({
      projectedTiles,
      protectionById,
      elasticityMaskById: Uint8Array.from(
        terrainClassByTileId,
        (terrainClass) => terrainClass === "water" ? 1 : 0
      ),
      viewportWidth: TRAVERSAL_SCREEN_W,
      viewportHeight: TRAVERSAL_SCREEN_H,
      tileVisualRadius: 18,
      authoritativePositions: positions,
      viewX,
      viewY
    });
    const fogConcealedProjectedIds = usePolarFogRepairs
      ? new Set(projectedTiles.filter((tile) => traversalProjectedTileIsFogConcealed({
          projected: tile,
          direction,
          repairPressure: polarFogRepairPressure
        })).map((tile) => tile.id))
      : new Set();
    const correctionViewportIds = new Set(
      [...support.viewportTileIds].filter((id) => !fogConcealedProjectedIds.has(id))
    );
    const liveSupport = {
      ...support,
      viewportTileIds: correctionViewportIds,
      elasticTileIds: new Set(
        [...support.elasticTileIds].filter((id) => correctionViewportIds.has(id))
      )
    };
    const correctionPolicy = chartAdmissionCorrectionPolicy({
      support: liveSupport,
      protectionById,
      elasticityMaskById: Uint8Array.from(
        terrainClassByTileId,
        (terrainClass) => terrainClass === "water" ? 1 : 0
      ),
      continuityMaskById,
      viewportWidth: TRAVERSAL_SCREEN_W,
      viewportHeight: TRAVERSAL_SCREEN_H
    });
    const viewportIsFullyElasticWater = correctionPolicy.fullyElasticWater;
    const visibleProtectedBefore = new Map();
    const visibleLandBefore = new Map();
    for (const [id, position] of positions.entries()) {
      const screenX = position.x - viewX + TRAVERSAL_SCREEN_W / 2;
      const screenY = position.y - viewY + TRAVERSAL_SCREEN_H / 2;
      if (
        screenX < -18 || screenX > TRAVERSAL_SCREEN_W + 18 ||
        screenY < -18 || screenY > TRAVERSAL_SCREEN_H + 18
      ) {
        continue;
      }
      if (protectionById[id] === 255) visibleProtectedBefore.set(id, { ...position });
      if (terrainClassByTileId[id] === "land") visibleLandBefore.set(id, { ...position });
    }
    refreshOffscreenLayoutTiles({
      positions,
      projectedTiles,
      protectionById,
      viewportWidth: TRAVERSAL_SCREEN_W,
      viewportHeight: TRAVERSAL_SCREEN_H,
      tileVisualRadius: 18,
      anchorId: admissionAnchorId,
      viewX,
      viewY
    });
    const pendingIds = projectedTiles
      .map((point) => point.id)
      .filter((id) => !positions.has(id));
    const centerPendingIndex = pendingIds.indexOf(admissionAnchorId);
    if (centerPendingIndex >= 0) pendingIds.splice(centerPendingIndex, 1);
    const admissionProjectedById = predictiveAdmissionProjection({
      projectedTiles,
      directionForTile: (id) => graphCenter(graph, id),
      camera,
      viewportWidth: TRAVERSAL_SCREEN_W,
      viewportHeight: TRAVERSAL_SCREEN_H,
      tileVisualRadius: 18,
      pixelsPerRadian,
      maximumLookaheadPx: chartMargin
    });
    const admissionArgs = {
      positions,
      projectedById: admissionProjectedById,
      pendingIds,
      anchorId: admissionAnchorId,
      neighborsById: graph.neighbors,
      protectionById,
      directProtectionComponentById,
      registrationIds: correctionPolicy.registrationIds,
      rigidRegistrationIds: correctionViewportIds,
      correctElasticTilesNorthUp: correctionPolicy.correctElasticTilesNorthUp,
      maxElasticCorrectionPx: correctionPolicy.maxElasticCorrectionPx,
      maxProtectedCorrectionPx,
      continuityMaskById,
      maxContinuityCorrectionPx: MAX_PROTECTED_ADMISSION_SLACK_PX,
      continuityCorrectionLimitsByClass:
        TEST_CONTINUITY_CORRECTION_LIMITS_BY_CLASS,
      protectedCorrectionViewportIds: correctionViewportIds,
      liveViewportAdmissionIds: correctionViewportIds,
      finalizeContinuityEdges: false,
      recoverProtectedStitchError: () => true
    };
    if (maxProtectedCorrectionPx > 0) {
      const rigidPositions = new Map(
        [...positions.entries()].map(([id, position]) => [id, { ...position }])
      );
      admitProjectedTiles({
        ...admissionArgs,
        positions: rigidPositions,
        maxProtectedCorrectionPx: 0
      });
      admitProjectedTiles(admissionArgs);
      for (const id of pendingIds) {
        if (protectionById[id] !== 255) continue;
        const rigid = rigidPositions.get(id);
        const corrected = positions.get(id);
        if (!support.viewportTileIds.has(id)) continue;
        maxVisibleProtectedAdmissionShiftPx = Math.max(
          maxVisibleProtectedAdmissionShiftPx,
          Math.hypot(corrected.x - rigid.x, corrected.y - rigid.y)
        );
      }
    } else {
      admitProjectedTiles(admissionArgs);
    }
    for (const id of pendingIds) admittedStepById.set(id, step);

    const newlyAdmittedTileIds = new Set(pendingIds.filter((id) => positions.has(id)));
    const admissionConcealedIds = usePolarFogRepairs
      ? traversalPolarFogRepairTileIds({
          positions,
          direction,
          viewX,
          viewY,
          repairPressure: polarFogRepairPressure
        }).concealed
      : new Set();
    const admissionSettlementTileIds = traversalAdmissionSettlementTileIds({
      positions,
      newlyAdmittedTileIds,
      concealedTileIds: admissionConcealedIds,
      neighborsById: graph.neighbors,
      excludedTileIds: new Set([centerId]),
      viewX,
      viewY
    });
    const admissionMaximumStepPxById = new Map(
      [...admissionSettlementTileIds].map((id) => [
        id,
        newlyAdmittedTileIds.has(id) || traversalTileIsOffscreen(positions.get(id), viewX, viewY)
          ? Number.POSITIVE_INFINITY
          : 1
      ])
    );
    const admissionSettlement = settleTraversalTilesTowardNorthUp({
      positions,
      projectedById,
      tileIds: admissionSettlementTileIds,
      neighborsById: graph.neighbors,
      continuityMaskById,
      excludedTileId: centerId,
      viewX,
      viewY,
      maximumStepPx: 1,
      maximumStepPxById: admissionMaximumStepPxById
    });
    for (const [id, position] of admissionSettlement.settledPositions) {
      positions.set(id, position);
    }
    for (const id of newlyAdmittedTileIds) {
      const position = positions.get(id);
      const projected = projectedById.get(id);
      if (!position || !projected || terrainClassByTileId[id] !== "land") continue;
      for (const neighborId of graph.neighbors[id]) {
        if (terrainClassByTileId[neighborId] !== "land") continue;
        const neighbor = positions.get(neighborId);
        const projectedNeighbor = projectedById.get(neighborId);
        if (!neighbor || !projectedNeighbor) continue;
        const gapPx = Math.max(0,
          Math.hypot(neighbor.x - position.x, neighbor.y - position.y) -
          Math.hypot(projectedNeighbor.x - projected.x, projectedNeighbor.y - projected.y)
        );
        if (gapPx <= maxPostAdmissionLandEdgeGapPx) continue;
        maxPostAdmissionLandEdgeGapPx = gapPx;
        maxPostAdmissionLandEdgeGapDetails = {
          step,
          location: directionLocation(direction),
          ids: [id, neighborId],
          bothNew: newlyAdmittedTileIds.has(neighborId),
          bothSettled: admissionSettlementTileIds.has(id) &&
            admissionSettlementTileIds.has(neighborId),
          solverWorstEdge: admissionSettlement.worstEdge,
          gapPx
        };
      }
    }

    const retainedIds = new Set(projectedById.keys());
    for (const id of positions.keys()) {
      if (!retainedIds.has(id)) positions.delete(id);
    }
    const concealedRepairIds = new Set(admissionConcealedIds);
    const coveredRepairIds = new Set();
    // A chart build represents several rendered frames of travel. Production
    // fog settlement advances once per presented frame, so model several ticks
    // of the slow, concealed repair between movement samples.
    const repairScans = usePolarFogRepairs ? 4 : 1;
    for (let repairScan = 0; repairScan < repairScans; repairScan++) {
      if (usePolarFogRepairs) {
        const repairVisiblePositions = traversalVisiblePositions({
          positions,
          viewX,
          viewY
        });
        const repairFrame = repairVisiblePositions.size >= 2
          ? measureCenteredFrameError(repairVisiblePositions, projectedById)
          : { rotationDeg: 0, rmsError: 0, maxErrorPx: 0 };
        const repairTear = measureTraversalTerrainTear({
          visiblePositions: repairVisiblePositions,
          projectedById,
          neighborsById: graph.neighbors,
          terrainClassByTileId,
          viewX,
          viewY
        });
        polarFogRepairPressure = nextPolarChartRepairPressure({
          currentPressure: polarFogRepairPressure,
          latitudeDeg: traversalLatitudeDeg(direction),
          drift: {
            rotationDeg: repairFrame.rotationDeg,
            rmsDistortionPx: repairFrame.rmsError,
            maxDistortionPx: repairFrame.maxErrorPx
          },
          terrainTear: repairTear,
          elapsedSeconds: 0.24
        });
        maxPolarFogRepairPressure = Math.max(
          maxPolarFogRepairPressure,
          polarFogRepairPressure
        );
      }
      const polarFogRepair = usePolarFogRepairs
        ? traversalPolarFogRepairTileIds({
            positions,
            direction,
            viewX,
            viewY,
            repairPressure: polarFogRepairPressure
          })
        : { concealed: new Set(), dense: new Set() };
      for (const id of polarFogRepair.concealed) concealedRepairIds.add(id);
      if (polarFogRepair.concealed.size === 0) continue;
      const maximumStepPxById = new Map(
        [...polarFogRepair.concealed].map((id) => [
          id,
          polarFogRepair.dense.has(id) ? Number.POSITIVE_INFINITY : 1
        ])
      );
      const repair = settleTraversalTilesTowardNorthUp({
        positions,
        tileIds: polarFogRepair.concealed,
        projectedById,
        neighborsById: graph.neighbors,
        continuityMaskById,
        excludedTileId: centerId,
        viewX,
        viewY,
        maximumStepPx: 1,
        maximumStepPxById
      });
      if (repair.settledPositions.size > 0) {
        polarFogRepairPasses++;
        polarFogTilesSettled += repair.settledPositions.size;
        for (const [id, position] of repair.settledPositions) positions.set(id, position);
      }
    }
    const visualRepairVisiblePositions = traversalVisiblePositions({
      positions,
      viewX,
      viewY
    });
    for (const id of concealedRepairIds) visualRepairVisiblePositions.delete(id);
    const visualRepairFrame = visualRepairVisiblePositions.size >= 2
      ? measureCenteredFrameError(visualRepairVisiblePositions, projectedById)
      : {
          rotationDeg: 0,
          rmsError: 0,
          maxErrorPx: 0,
          maxErrorTileId: null
        };
    const visualRepairTear = measureTraversalTerrainTear({
      visiblePositions: visualRepairVisiblePositions,
      projectedById,
      neighborsById: graph.neighbors,
      terrainClassByTileId,
      viewX,
      viewY
    });
    const visualRepairSelection = concealedRepairIds.size > 0
      ? { kind: "none", repair: null }
      : recordTraversalRepairDemand(repairDemand, {
        drift: {
          rotationDeg: visualRepairFrame.rotationDeg,
          rmsDistortionPx: visualRepairFrame.rmsError,
          maxDistortionPx: visualRepairFrame.maxErrorPx
        },
        terrainTear: visualRepairTear,
        distortionPoint: traversalScreenPosition(
          visualRepairVisiblePositions.get(visualRepairFrame.maxErrorTileId),
          viewX,
          viewY
        ),
        distortionSurface: terrainClassByTileId[visualRepairFrame.maxErrorTileId],
        swellRepairAvailable: viewportIsFullyElasticWater || (
          !chartRotationNeedsFullCloudRepair(visualRepairFrame) &&
          visualRepairTear.surface === "water" &&
          visualRepairTear.tileIds.every((id) => protectionById[id] === 0)
        ),
        elasticTileCount: support.elasticTileIds.size
      });
    if (applyVisualRepairs && visualRepairSelection.kind !== "none") {
      const movedTileIds = applyTraversalVisualRepair({
        kind: visualRepairSelection.kind,
        fault: visualRepairSelection.repair?.fault || {
          x: visualRepairTear.screenX,
          y: visualRepairTear.screenY,
          sizePx: visualRepairTear.extraPx,
          surface: visualRepairTear.surface
        },
        positions,
        projectedById,
        visiblePositions: visualRepairVisiblePositions,
        neighborsById: graph.neighbors,
        continuityMaskById,
        terrainClassByTileId,
        protectionById,
        centerId,
        viewX,
        viewY
      });
      for (const id of movedTileIds) coveredRepairIds.add(id);
    }
    for (const [id, before] of visibleProtectedBefore.entries()) {
      if (concealedRepairIds.has(id) || coveredRepairIds.has(id)) continue;
      const after = positions.get(id);
      if (!after || after.x !== before.x || after.y !== before.y) {
        visibleProtectedRedraws++;
      }
    }
    for (const [id, before] of visibleLandBefore.entries()) {
      if (concealedRepairIds.has(id) || coveredRepairIds.has(id)) continue;
      const after = positions.get(id);
      if (!after || after.x !== before.x || after.y !== before.y) {
        visibleLandRedraws++;
      }
    }
    const coverage = measureTraversalViewportCoverage(positions, viewX, viewY);
    if (coverage.gapPx > maxViewportCoverageGapPx) {
      maxViewportCoverageGapPx = coverage.gapPx;
      maxViewportCoverageGapDetails = {
        step,
        location: directionLocation(direction),
        ...coverage
      };
    }
    const visiblePositions = new Map();
    const visibleProtectedPositions = new Map();
    let visibleProtectedTiles = 0;
    for (const [id, position] of positions.entries()) {
      if (concealedRepairIds.has(id)) continue;
      const screenX = position.x - viewX + TRAVERSAL_SCREEN_W / 2;
      const screenY = position.y - viewY + TRAVERSAL_SCREEN_H / 2;
      if (
        screenX < -18 || screenX > TRAVERSAL_SCREEN_W + 18 ||
        screenY < -18 || screenY > TRAVERSAL_SCREEN_H + 18
      ) {
        continue;
      }
      visiblePositions.set(id, position);
      if (protectionById[id] === 255) {
        visibleProtectedTiles++;
        visibleProtectedPositions.set(id, position);
      }
    }
    if (visibleProtectedTiles === 0) stepsWithoutProtectedCoast++;
    else stepsWithProtectedCoast++;
    const frame = visiblePositions.size >= 2
      ? measureCenteredFrameError(visiblePositions, projectedById)
      : {
          rotationDeg: 0,
          rmsError: 0,
          maxErrorPx: 0,
          maxErrorTileId: null
        };
    const terrainTear = measureTraversalTerrainTear({
      visiblePositions,
      projectedById,
      neighborsById: graph.neighbors,
      terrainClassByTileId,
      viewX,
      viewY
    });
    maxRmsDistortionPx = Math.max(maxRmsDistortionPx, frame.rmsError);
    maxDistortionPx = Math.max(maxDistortionPx, frame.maxErrorPx);
    maxTerrainEdgeGapPx = Math.max(maxTerrainEdgeGapPx, terrainTear.extraPx);
    if (terrainTear.compressionPx > 0) {
      maxTerrainEdgeCompressionPx = Math.max(
        maxTerrainEdgeCompressionPx,
        terrainTear.compressionPx
      );
      if (
        firstCompressionRepairPx === null &&
        chartFaultNeedsCloudRepair({
          drift: {
            rotationDeg: frame.rotationDeg,
            rmsDistortionPx: frame.rmsError,
            maxDistortionPx: frame.maxErrorPx
          },
          terrainTear
        })
      ) {
        firstCompressionRepairPx = terrainTear.compressionPx;
      }
    }
    if (Math.abs(frame.rotationDeg) > maxRotationDeg) {
      maxRotationDeg = Math.abs(frame.rotationDeg);
      maxRotationStep = step;
      maxRotationLocation = directionLocation(direction);
    }
    finalRotationDeg = frame.rotationDeg;
    if (visibleProtectedPositions.size >= 2) {
      const protectedFrame = measureProtectedComponentTilt({
        positions: visibleProtectedPositions,
        projectedById,
        neighborsById: graph.neighbors,
        protectionById
      });
      if (Math.abs(protectedFrame.rotationDeg) > maxProtectedRotationDeg) {
        maxProtectedRotationDeg = Math.abs(protectedFrame.rotationDeg);
        maxProtectedRotationStep = step;
        maxProtectedRotationLocation = directionLocation(direction);
      }
      finalProtectedRotationDeg = protectedFrame.rotationDeg;
      if (step % 50 === 0 || step === route.length - 1) {
        rotationSamples.push({
          step,
          protected: protectedFrame.rotationDeg,
          full: frame.rotationDeg
        });
      }
    }

    for (const [id, position] of visiblePositions.entries()) {
      if (terrainClassByTileId[id] === "land") {
        const screenX = position.x - viewX + TRAVERSAL_SCREEN_W / 2;
        const screenY = position.y - viewY + TRAVERSAL_SCREEN_H / 2;
        const safelyInsideViewport = (
          screenX >= 36 && screenX <= TRAVERSAL_SCREEN_W - 36 &&
          screenY >= 36 && screenY <= TRAVERSAL_SCREEN_H - 36
        );
        for (const neighborId of graph.neighbors[id]) {
          if (terrainClassByTileId[neighborId] !== "land") continue;
          const neighbor = visiblePositions.get(neighborId);
          if (!neighbor) {
            if (concealedRepairIds.has(neighborId)) continue;
            if (safelyInsideViewport) {
              missingVisibleLandNeighbors++;
              firstMissingVisibleLandNeighbor ??= {
                step,
                location: directionLocation(direction),
                ids: [id, neighborId],
                tileLocations: [
                  directionLocation(graphCenter(graph, id)),
                  directionLocation(graphCenter(graph, neighborId))
                ]
              };
            }
            continue;
          }
          if (neighborId <= id) continue;
          const projected = projectedById.get(id);
          const projectedNeighbor = projectedById.get(neighborId);
          if (!projected || !projectedNeighbor) continue;
          const visualDistance = Math.hypot(neighbor.x - position.x, neighbor.y - position.y);
          const projectedDistance = Math.hypot(
            projectedNeighbor.x - projected.x,
            projectedNeighbor.y - projected.y
          );
          const edgeGapPx = Math.max(0, visualDistance - projectedDistance);
          if (edgeGapPx > maxLandEdgeGapPx) {
            maxLandEdgeGapPx = edgeGapPx;
            maxLandEdgeGapDetails = {
              step,
              location: directionLocation(direction),
              ids: [id, neighborId],
              protections: [protectionById[id], protectionById[neighborId]],
              tileLocations: [
                directionLocation(graphCenter(graph, id)),
                directionLocation(graphCenter(graph, neighborId))
              ],
              admittedSteps: [
                admittedStepById.get(id) ?? null,
                admittedStepById.get(neighborId) ?? null
              ],
              visualRepairKind: visualRepairSelection.kind,
              coveredByRepair: [
                coveredRepairIds.has(id),
                coveredRepairIds.has(neighborId)
              ],
              visualDistance,
              projectedDistance
            };
          }
        }
      }
      if (protectionById[id] !== 255) continue;
      for (const neighborId of graph.neighbors[id]) {
        if (neighborId <= id || protectionById[neighborId] !== 255) continue;
        const neighbor = visiblePositions.get(neighborId);
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
        const edgeErrorPx = Math.abs(visualDistance - projectedDistance);
        if (edgeErrorPx > maxProtectedEdgeErrorPx) {
          maxProtectedEdgeErrorPx = edgeErrorPx;
          maxProtectedEdgeDetails = {
            step,
            location: directionLocation(direction),
            ids: [id, neighborId],
            tileLocations: [
              directionLocation(graphCenter(graph, id)),
              directionLocation(graphCenter(graph, neighborId))
            ],
            admittedSteps: [
              admittedStepById.get(id) ?? null,
              admittedStepById.get(neighborId) ?? null
            ],
            visualDistance,
            projectedDistance
          };
        }
        protectedEdgeSamples++;
      }
    }
  }

  return {
    movementFrames: route.length,
    chartBuilds,
    polarFogRepairPasses,
    polarFogTilesSettled,
    maxPolarFogRepairPressure,
    stepsWithoutProtectedCoast,
    stepsWithProtectedCoast,
    maxRotationDeg,
    maxRmsDistortionPx,
    maxDistortionPx,
    maxTerrainEdgeGapPx,
    maxTerrainEdgeCompressionPx,
    firstCompressionRepairPx,
    maxProtectedRotationDeg,
    maxProtectedRotationStep,
    maxProtectedRotationLocation,
    maxRotationStep,
    maxRotationLocation,
    finalRotationDeg,
    finalProtectedRotationDeg,
    maxProtectedEdgeStretch,
    maxProtectedEdgeErrorPx,
    maxProtectedEdgeDetails,
    maxLandEdgeGapPx,
    maxLandEdgeGapDetails,
    maxPostAdmissionLandEdgeGapPx,
    maxPostAdmissionLandEdgeGapDetails,
    missingVisibleLandNeighbors,
    firstMissingVisibleLandNeighbor,
    maxVisibleProtectedAdmissionShiftPx,
    maxViewportCoverageGapPx,
    maxViewportCoverageGapDetails,
    visibleProtectedRedraws,
    visibleLandRedraws,
    protectedEdgeSamples,
    rotationSamples,
    repairDemand: finishTraversalRepairDemand(repairDemand)
  };
}

function measureTraversalViewportCoverage(positions, viewX, viewY) {
  if (positions.size === 0) return { gapPx: Number.POSITIVE_INFINITY, screenX: 0, screenY: 0 };
  const samples = [
    [0, 0],
    [TRAVERSAL_SCREEN_W / 2, 0],
    [TRAVERSAL_SCREEN_W, 0],
    [0, TRAVERSAL_SCREEN_H / 2],
    [TRAVERSAL_SCREEN_W / 2, TRAVERSAL_SCREEN_H / 2],
    [TRAVERSAL_SCREEN_W, TRAVERSAL_SCREEN_H / 2],
    [0, TRAVERSAL_SCREEN_H],
    [TRAVERSAL_SCREEN_W / 2, TRAVERSAL_SCREEN_H],
    [TRAVERSAL_SCREEN_W, TRAVERSAL_SCREEN_H]
  ];
  let gapPx = 0;
  let worst = samples[0];
  for (const [screenX, screenY] of samples) {
    const localX = viewX - TRAVERSAL_SCREEN_W / 2 + screenX;
    const localY = viewY - TRAVERSAL_SCREEN_H / 2 + screenY;
    let nearestDistancePx = Number.POSITIVE_INFINITY;
    for (const position of positions.values()) {
      nearestDistancePx = Math.min(
        nearestDistancePx,
        Math.hypot(position.x - localX, position.y - localY)
      );
    }
    if (nearestDistancePx <= gapPx) continue;
    gapPx = nearestDistancePx;
    worst = [screenX, screenY];
  }
  return { gapPx, screenX: worst[0], screenY: worst[1] };
}


function traversalPolarFogRepairTileIds({
  positions,
  direction,
  viewX,
  viewY,
  repairPressure
}) {
  const frame = polarChartFogFrame({
    latitudeDeg: traversalLatitudeDeg(direction),
    viewportWidth: TRAVERSAL_SCREEN_W,
    viewportHeight: TRAVERSAL_SCREEN_H,
    focusX: TRAVERSAL_SCREEN_W / 2,
    focusY: TRAVERSAL_SCREEN_H / 2,
    repairPressure
  });
  if (!frame) return { concealed: new Set(), dense: new Set() };
  const concealed = new Set();
  const dense = new Set();
  for (const [id, position] of positions) {
    const screen = traversalScreenPosition(position, viewX, viewY);
    if (
      screen.x < -21 || screen.x > TRAVERSAL_SCREEN_W + 21 ||
      screen.y < -21 || screen.y > TRAVERSAL_SCREEN_H + 21
    ) continue;
    if (chartFogConcealsCircleForRepair(frame, screen.x, screen.y, 21)) {
      concealed.add(id);
      if (chartFogObscuresCircle(frame, screen.x, screen.y, 21)) dense.add(id);
    }
  }
  return { concealed, dense };
}

function traversalProjectedTileIsFogConcealed({ projected, direction, repairPressure }) {
  if (!projected) return false;
  const frame = polarChartFogFrame({
    latitudeDeg: traversalLatitudeDeg(direction),
    viewportWidth: TRAVERSAL_SCREEN_W,
    viewportHeight: TRAVERSAL_SCREEN_H,
    focusX: TRAVERSAL_SCREEN_W / 2,
    focusY: TRAVERSAL_SCREEN_H / 2,
    repairPressure
  });
  if (!frame) return false;
  return chartFogConcealsCircleForRepair(
    frame,
    projected.x,
    projected.y,
    21
  );
}

function traversalLatitudeDeg(direction) {
  return Math.asin(clamp(direction[1], -1, 1)) * 180 / Math.PI;
}

function traversalVisiblePositions({ positions, viewX, viewY }) {
  const visible = new Map();
  for (const [id, position] of positions) {
    const screen = traversalScreenPosition(position, viewX, viewY);
    if (
      screen.x < -18 || screen.x > TRAVERSAL_SCREEN_W + 18 ||
      screen.y < -18 || screen.y > TRAVERSAL_SCREEN_H + 18
    ) continue;
    visible.set(id, position);
  }
  return visible;
}

function traversalAdmissionSettlementTileIds({
  positions,
  newlyAdmittedTileIds,
  concealedTileIds,
  neighborsById,
  excludedTileIds,
  viewX,
  viewY
}) {
  const tileIds = new Set(newlyAdmittedTileIds);
  const queue = [...newlyAdmittedTileIds].map((id) => ({ id, depth: 0 }));
  const maximumSupportDepth = 3;
  for (let head = 0; head < queue.length; head++) {
    const { id, depth } = queue[head];
    if (depth >= maximumSupportDepth) continue;
    for (const neighborId of neighborsById[id]) {
      if (tileIds.has(neighborId) || excludedTileIds.has(neighborId)) continue;
      const position = positions.get(neighborId);
      if (!position) continue;
      if (
        !concealedTileIds.has(neighborId) &&
        !traversalTileIsOffscreen(position, viewX, viewY)
      ) continue;
      tileIds.add(neighborId);
      queue.push({ id: neighborId, depth: depth + 1 });
    }
  }
  return tileIds;
}

function traversalTileIsOffscreen(position, viewX = 0, viewY = 0) {
  const screen = traversalScreenPosition(position, viewX, viewY);
  return screen.x < -21 || screen.x > TRAVERSAL_SCREEN_W + 21 ||
    screen.y < -21 || screen.y > TRAVERSAL_SCREEN_H + 21;
}

function settleTraversalTilesTowardNorthUp({
  positions,
  projectedById,
  tileIds,
  neighborsById,
  continuityMaskById,
  excludedTileId,
  viewX,
  viewY,
  maximumStepPx,
  maximumStepPxById = null
}) {
  const topologyIds = new Set(tileIds);
  for (const id of tileIds) {
    for (const neighborId of neighborsById[id]) {
      if (positions.has(neighborId)) topologyIds.add(neighborId);
    }
  }
  const referencePositions = createExactNorthUpRepairPlan({
    tileIds: topologyIds,
    retainedPositions: positions,
    projectTile: (id) => projectedById.get(id) || null,
    viewX,
    viewY,
    viewportWidth: TRAVERSAL_SCREEN_W,
    viewportHeight: TRAVERSAL_SCREEN_H
  });
  const targetsById = new Map(
    [...referencePositions].filter(([id]) => tileIds.has(id) && id !== excludedTileId)
  );
  return planChartSettlementTowardTargets({
    positions,
    targetsById,
    tileIds,
    maximumStepPx,
    maximumStepPxById,
    referencePositions,
    neighborsById,
    surfaceMaskById: continuityMaskById,
    landSlackPx: MAX_PROTECTED_ADMISSION_SLACK_PX,
    waterSlackPx: MAX_PROTECTED_ADMISSION_SLACK_PX * 2
  });
}

function applyTraversalVisualRepair({
  kind,
  fault,
  positions,
  projectedById,
  visiblePositions,
  neighborsById,
  continuityMaskById,
  terrainClassByTileId,
  protectionById,
  centerId,
  viewX,
  viewY
}) {
  const repairTileIds = new Set();
  const faultX = Number.isFinite(fault?.x) ? fault.x : TRAVERSAL_SCREEN_W / 2;
  const faultY = Number.isFinite(fault?.y) ? fault.y : TRAVERSAL_SCREEN_H / 2;
  const partialRadiusPx = Math.max(56, Math.min(96, (fault?.sizePx || 0) + 30));
  const candidatePositions = kind === "closing-fog" || kind === "heat-haze"
    ? positions
    : visiblePositions;
  for (const [id, position] of candidatePositions) {
    if (!projectedById.has(id)) continue;
    if (id === centerId) continue;
    const screen = traversalScreenPosition(position, viewX, viewY);
    const distanceFromPlayer = Math.hypot(
      screen.x - TRAVERSAL_SCREEN_W / 2,
      screen.y - TRAVERSAL_SCREEN_H / 2
    );
    const distanceFromFault = Math.hypot(screen.x - faultX, screen.y - faultY);
    const eligible = kind === "swell"
      ? terrainClassByTileId[id] === "water" && protectionById[id] === 0
      : kind === "partial-cloud"
      ? distanceFromFault <= partialRadiusPx
      : kind === "closing-fog"
      ? distanceFromPlayer >= 48
      : kind === "heat-haze";
    if (eligible) repairTileIds.add(id);
  }
  if (repairTileIds.size === 0) return new Set();

  // One moving-chart sample represents many presented frames. These passes
  // model the one-pixel concealed settlement ticks that occur while a swell,
  // cloud bank, fog bank, or heat haze crosses the live game viewport.
  const maximumPasses = kind === "swell"
    ? 16
    : kind === "partial-cloud"
    ? 128
    : 320;
  const repair = settleTraversalTilesTowardNorthUp({
    positions,
    tileIds: repairTileIds,
    neighborsById,
    projectedById,
    continuityMaskById,
    excludedTileId: centerId,
    viewX,
    viewY,
    maximumStepPx: maximumPasses
  });
  const movedTileIds = new Set(repair.settledPositions.keys());
  for (const [id, position] of repair.settledPositions) {
    positions.set(id, position);
  }
  return movedTileIds;
}

function createTraversalRepairDemand() {
  return {
    evaluations: 0,
    repairDemandEvaluations: 0,
    activeKind: "none",
    swellRepairPasses: 0,
    swellTilesSettled: 0,
    cloudBanksStarted: 0,
    partialCloudBanksStarted: 0,
    cloudBankSecondsScheduled: 0,
    cloudTargetViewportEquivalents: 0,
    closingFogsStarted: 0,
    closingFogSecondsScheduled: 0,
    maximumFogDepthRatio: 0
  };
}

function recordTraversalRepairDemand(stats, {
  drift,
  terrainTear,
  distortionPoint,
  distortionSurface,
  swellRepairAvailable,
  elasticTileCount
}) {
  stats.evaluations++;
  if (!chartFaultNeedsCloudRepair({ drift, terrainTear })) {
    stats.activeKind = "none";
    return { kind: "none", repair: null };
  }
  stats.repairDemandEvaluations++;
  let kind = "swell";
  let repair = null;
  if (!swellRepairAvailable) {
    repair = chooseChartVisualRepair({
      drift,
      terrainTear,
      distortionPoint,
      viewportWidth: TRAVERSAL_SCREEN_W,
      viewportHeight: TRAVERSAL_SCREEN_H,
      swellRepairAvailable: false,
      distortionSurface
    });
    kind = repair.kind;
  }
  if (kind === "swell") {
    stats.swellRepairPasses++;
    stats.swellTilesSettled += elasticTileCount;
    stats.activeKind = kind;
    return { kind, repair };
  }
  if (kind === "none") {
    stats.activeKind = kind;
    return { kind, repair };
  }
  if (stats.activeKind === kind) return { kind, repair };
  stats.activeKind = kind;
  if (kind === "closing-fog") {
    stats.closingFogsStarted++;
    stats.closingFogSecondsScheduled += 41.8;
    stats.maximumFogDepthRatio = Math.max(
      stats.maximumFogDepthRatio,
      traversalFogDepthForFault(repair.fault)
    );
    return { kind, repair };
  }
  stats.cloudBanksStarted++;
  const partial = kind === "partial-cloud";
  if (partial) stats.partialCloudBanksStarted++;
  const span = partial
    ? Math.max(72, Math.min(164, repair.fault.sizePx + 36))
    : Math.hypot(TRAVERSAL_SCREEN_W, TRAVERSAL_SCREEN_H);
  stats.cloudTargetViewportEquivalents += partial
    ? span * span / (TRAVERSAL_SCREEN_W * TRAVERSAL_SCREEN_H)
    : 1;
  stats.cloudBankSecondsScheduled += Math.hypot(
    TRAVERSAL_SCREEN_W,
    TRAVERSAL_SCREEN_H
  ) * 2 / 7;
  return { kind, repair };
}

function finishTraversalRepairDemand(stats) {
  const burden = chartVisualRepairBurden(stats);
  const demandRatio = stats.evaluations > 0
    ? stats.repairDemandEvaluations / stats.evaluations
    : 0;
  return Object.freeze({
    ...stats,
    activeKind: undefined,
    repairDemandRatio: Math.round(demandRatio * 1000) / 1000,
    fullCloudBanks: burden.fullCloudBanks,
    burdenScore: Math.round((burden.burdenScore + demandRatio * 5) * 100) / 100
  });
}

function traversalFogDepthForFault(fault) {
  const focusX = TRAVERSAL_SCREEN_W / 2;
  const focusY = TRAVERSAL_SCREEN_H / 2;
  const fadeBandPx = 42;
  const maximumClearRadius = Math.max(
    Math.hypot(focusX, focusY),
    Math.hypot(TRAVERSAL_SCREEN_W - focusX, focusY),
    Math.hypot(focusX, TRAVERSAL_SCREEN_H - focusY),
    Math.hypot(TRAVERSAL_SCREEN_W - focusX, TRAVERSAL_SCREEN_H - focusY)
  ) + fadeBandPx;
  const minimumClearRadius = Math.max(
    42,
    Math.min(TRAVERSAL_SCREEN_W, TRAVERSAL_SCREEN_H) * 0.18
  );
  const faultDistance = Math.hypot(fault.x - focusX, fault.y - focusY);
  const geometryDepth = (
    maximumClearRadius + fadeBandPx - (faultDistance - 21)
  ) / (maximumClearRadius - minimumClearRadius);
  return Math.max(0.995, Math.min(1, geometryDepth));
}

function measureTraversalTerrainTear({
  visiblePositions,
  projectedById,
  neighborsById,
  terrainClassByTileId,
  viewX,
  viewY
}) {
  let worst = null;
  let compressionPx = 0;
  for (const [id, position] of visiblePositions.entries()) {
    for (const neighborId of neighborsById[id]) {
      if (neighborId <= id) continue;
      const neighbor = visiblePositions.get(neighborId);
      const projected = projectedById.get(id);
      const projectedNeighbor = projectedById.get(neighborId);
      if (!neighbor || !projected || !projectedNeighbor) continue;
      const actualDistance = Math.hypot(neighbor.x - position.x, neighbor.y - position.y);
      const projectedDistance = Math.hypot(
        projectedNeighbor.x - projected.x,
        projectedNeighbor.y - projected.y
      );
      const signedExtraPx = actualDistance - projectedDistance;
      const extraPx = Math.abs(signedExtraPx);
      compressionPx = Math.max(compressionPx, -signedExtraPx);
      if (worst && extraPx <= worst.extraPx) continue;
      const aSurface = terrainClassByTileId[id];
      const bSurface = terrainClassByTileId[neighborId];
      const aScreen = traversalScreenPosition(position, viewX, viewY);
      const bScreen = traversalScreenPosition(neighbor, viewX, viewY);
      worst = {
        extraPx,
        signedExtraPx,
        tileIds: [id, neighborId],
        surface: aSurface === bSurface ? aSurface : "coast",
        screenX: (aScreen.x + bScreen.x) / 2,
        screenY: (aScreen.y + bScreen.y) / 2
      };
    }
  }
  if (worst) return { ...worst, compressionPx };
  return {
    extraPx: 0,
    signedExtraPx: 0,
    compressionPx: 0,
    tileIds: [],
    surface: null,
    screenX: TRAVERSAL_SCREEN_W / 2,
    screenY: TRAVERSAL_SCREEN_H / 2
  };
}

function traversalScreenPosition(position, viewX, viewY) {
  if (!position) return { x: TRAVERSAL_SCREEN_W / 2, y: TRAVERSAL_SCREEN_H / 2 };
  return {
    x: position.x - viewX + TRAVERSAL_SCREEN_W / 2,
    y: position.y - viewY + TRAVERSAL_SCREEN_H / 2
  };
}

function assertLandTraversalIsContinuous(result, label) {
  // The terrain rasters overlap at ordinary edge lengths. Ten pixels permits
  // each endpoint's three-pixel preventative circle plus integer projection
  // and raster overlap, while still rejecting a visible inter-hex strip.
  const maximumVisibleGapPx = 10;
  assert.ok(
    result.maxLandEdgeGapPx <= maximumVisibleGapPx,
    `${label} opened a ${result.maxLandEdgeGapPx.toFixed(2)}px visible land tear at ` +
      `${JSON.stringify(result.maxLandEdgeGapDetails)}`
  );
  assert.equal(
    result.missingVisibleLandNeighbors,
    0,
    `${label} omitted an adjacent land tile inside the viewport at ` +
      `${JSON.stringify(result.firstMissingVisibleLandNeighbor)}`
  );
}

function assertTraversalRepairBurden(result, label, maximumScore) {
  assert.ok(
    result.repairDemand.burdenScore <= maximumScore,
    `${label} required excessive visual concealment: ` +
      `${result.repairDemand.burdenScore.toFixed(2)} > ${maximumScore}; ` +
      `${JSON.stringify(result.repairDemand)}`
  );
}

function measureProtectedComponentTilt({
  positions,
  projectedById,
  neighborsById,
  protectionById
}) {
  const unvisited = new Set(positions.keys());
  let dotSum = 0;
  let crossSum = 0;
  let sampleCount = 0;
  while (unvisited.size > 0) {
    const startId = unvisited.values().next().value;
    const componentIds = [];
    const queue = [startId];
    unvisited.delete(startId);
    for (let head = 0; head < queue.length; head++) {
      const id = queue[head];
      componentIds.push(id);
      for (const neighborId of neighborsById[id]) {
        if (protectionById[neighborId] !== 255 || !unvisited.has(neighborId)) continue;
        unvisited.delete(neighborId);
        queue.push(neighborId);
      }
    }
    if (componentIds.length < 3) continue;
    let positionCenterX = 0;
    let positionCenterY = 0;
    let projectedCenterX = 0;
    let projectedCenterY = 0;
    for (const id of componentIds) {
      positionCenterX += positions.get(id).x;
      positionCenterY += positions.get(id).y;
      projectedCenterX += projectedById.get(id).x;
      projectedCenterY += projectedById.get(id).y;
    }
    positionCenterX /= componentIds.length;
    positionCenterY /= componentIds.length;
    projectedCenterX /= componentIds.length;
    projectedCenterY /= componentIds.length;
    for (const id of componentIds) {
      const position = positions.get(id);
      const projected = projectedById.get(id);
      const positionX = position.x - positionCenterX;
      const positionY = position.y - positionCenterY;
      const projectedX = projected.x - projectedCenterX;
      const projectedY = projected.y - projectedCenterY;
      dotSum += projectedX * positionX + projectedY * positionY;
      crossSum += projectedX * positionY - projectedY * positionX;
      sampleCount++;
    }
  }
  return {
    rotationDeg: sampleCount > 0 ? Math.atan2(crossSum, dotSum) * 180 / Math.PI : 0
  };
}

function geographicRouteDirections(waypoints, maximumStepDeg) {
  const directions = [];
  for (let index = 1; index < waypoints.length; index++) {
    const start = directionAt(...waypoints[index - 1]);
    const end = directionAt(...waypoints[index]);
    const angle = Math.acos(clamp(dot3(start, end), -1, 1));
    const steps = Math.max(1, Math.ceil(angle * 180 / Math.PI / maximumStepDeg));
    for (let step = index === 1 ? 0 : 1; step <= steps; step++) {
      directions.push(slerpDirection(start, end, step / steps));
    }
  }
  return directions;
}

function slerpDirection(start, end, progress) {
  const angle = Math.acos(clamp(dot3(start, end), -1, 1));
  if (angle <= 1e-9) return start.slice();
  const denominator = Math.sin(angle);
  const startWeight = Math.sin((1 - progress) * angle) / denominator;
  const endWeight = Math.sin(progress * angle) / denominator;
  return normalize3([
    start[0] * startWeight + end[0] * endWeight,
    start[1] * startWeight + end[1] * endWeight,
    start[2] * startWeight + end[2] * endWeight
  ]);
}

function directionLocation(direction) {
  const lat = Math.asin(clamp(direction[1], -1, 1)) * 180 / Math.PI;
  const lon = Math.atan2(-direction[2], direction[0]) * 180 / Math.PI;
  return `${lat.toFixed(1)}, ${lon.toFixed(1)}`;
}

function worldCoastProtection(graph) {
  const earth = JSON.parse(readFileSync(
    new URL("../../../examples/globe-demo/public/earth-globe-cache-6.json", import.meta.url),
    "utf8"
  ));
  const terrainGraph = buildGeodesicGraph(earth.subdivisions);
  const terrainDirectionIndex = createDirectionIndex(terrainGraph);
  const terrainClassByTileId = Array.from({ length: graph.tileCount }, (_, tileId) => {
    const terrainTileId = findNearestTileId(
      terrainGraph,
      terrainDirectionIndex,
      graphCenter(graph, tileId)
    );
    return isWaterSurfaceRow(earth.tiles[terrainTileId]) ? "water" : "land";
  });
  const protectionById = buildChartTileProtection({
    graph,
    terrainClassForTile: (tileId) => terrainClassByTileId[tileId],
    pentagonNeedsProtection: (tileId) => terrainClassByTileId[tileId] !== "water"
  });
  return { protectionById, terrainClassByTileId };
}

function gameWorldProtection(graph) {
  const earth = JSON.parse(readFileSync(
    new URL("../../../examples/globe-demo/public/earth-globe-cache-7.json", import.meta.url),
    "utf8"
  ));
  if (earth.subdivisions !== graph.subdivisions) {
    throw new Error(
      `Game-world traversal requires subdivision ${earth.subdivisions}, got ${graph.subdivisions}`
    );
  }
  const earthRows = applyManualTerrainOverrides(earth.tiles, earth.subdivisions);
  const navigation = buildWorldNavigationTopology({
    graph,
    earthRows,
    earthCache: earth,
    subdivisions: earth.subdivisions
  });
  const featureTileIds = new Set(
    MANUAL_CITY_RIVER_HEX_CHAINS_BY_SUBDIVISIONS[earth.subdivisions]?.Smolensk || []
  );
  for (let tileId = 0; tileId < graph.tileCount; tileId++) {
    if ((navigation.riverMasks[tileId] || 0) !== 0 ||
        (navigation.riverToWaterMasks[tileId] || 0) !== 0) {
      featureTileIds.add(tileId);
    }
  }
  const terrainClassByTileId = earthRows.map((row) => (
    isWaterSurfaceRow(row) ? "water" : "land"
  ));
  const protectionById = buildChartTileProtection({
    graph,
    terrainClassForTile: (tileId) => gameTerrainProtectionClass(earthRows[tileId]),
    featureTileIds,
    pentagonNeedsProtection: (tileId) => terrainClassByTileId[tileId] !== "water"
  });
  return { protectionById, terrainClassByTileId };
}

function gameTerrainProtectionClass(row) {
  const terrain = row.t || "land";
  const surface = isWaterSurfaceRow(row) ? "water" : "land";
  let level = 0;
  if (terrain === "water") level = -2;
  else if (terrain === "lake" || terrain === "beach") level = -1;
  else if (terrain === "mountain") level = 3;
  else if (row.e > 0.13) level = 2;
  else if (row.h === 1 || row.e > 0.075) level = 1;
  return `${surface}:${terrain}:${level}`;
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
      const screenX = position ? position.x + viewportWidth / 2 : Number.NaN;
      const screenY = position ? position.y + viewportHeight / 2 : Number.NaN;
      if (
        position &&
        screenX + tileVisualRadius >= 0 &&
        screenX - tileVisualRadius <= viewportWidth &&
        screenY + tileVisualRadius >= 0 &&
        screenY - tileVisualRadius <= viewportHeight
      ) {
        visibleBefore.set(id, { ...position });
      }
    }

    if (support.correctionActive) {
      correctionSteps++;
      refreshOffscreenLayoutTiles({
        positions,
        projectedTiles,
        protectionById,
        viewportWidth,
        viewportHeight,
        tileVisualRadius,
        anchorId,
        viewX: 0,
        viewY: 0
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
    refreshOffscreenLayoutTiles({
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

function simulateFiniteOceanCrossing({
  refreshOffscreenEachStep,
  resolveNearestAnchor = false,
  initialRotationDeg = 14
}) {
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
  const continuityMaskById = new Uint8Array(columns * rows);
  continuityMaskById.fill(1);
  protectionById.fill(255);
  for (let row = 0; row < rows; row++) {
    for (let column = elasticStartColumn; column <= elasticEndColumn; column++) {
      protectionById[gridTileId(column, row, columns, rows)] = 0;
    }
  }
  const positions = new Map();
  const rotation = initialRotationDeg * Math.PI / 180;
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
  let maximumAbsoluteRotationDeg = Math.abs(initial.rotationDeg);
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
    const preferredAnchorId = gridTileId(centerColumn, 3, columns, rows);
    const anchorId = resolveNearestAnchor
      ? resolveLocalLayoutAnchor({
        positions,
        projectedById,
        preferredAnchorId,
        viewX: viewportWidth / 2,
        viewY: viewportHeight / 2
      })
      : preferredAnchorId;
    if (!resolveNearestAnchor) {
      retainLocalLayoutAnchor({
        positions,
        anchorId,
        viewX: viewportWidth / 2,
        viewY: viewportHeight / 2
      });
    }
    if (correctElasticTilesNorthUp) {
      elasticSteps++;
    }
    if (correctElasticTilesNorthUp && (refreshOffscreenEachStep || !resetActive)) {
      refreshOffscreenLayoutTiles({
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
      correctElasticTilesNorthUp,
      maxElasticCorrectionPx: correctElasticTilesNorthUp
        ? Math.hypot(viewportWidth, viewportHeight)
        : 0,
      maxProtectedCorrectionPx: MAX_PROTECTED_ADMISSION_SLACK_PX,
      continuityMaskById,
      maxContinuityCorrectionPx: MAX_PROTECTED_ADMISSION_SLACK_PX,
      continuityCorrectionLimitsByClass:
        TEST_CONTINUITY_CORRECTION_LIMITS_BY_CLASS,
      protectedCorrectionViewportIds: viewportIds,
      liveViewportAdmissionIds: viewportIds,
      recoverProtectedStitchError: () => true
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
      maximumAbsoluteRotationDeg = Math.max(
        maximumAbsoluteRotationDeg,
        Math.abs(frame.rotationDeg)
      );
    }
  }

  return {
    initialRotationDeg: initial.rotationDeg,
    exitRotationDeg,
    maximumAbsoluteRotationDeg,
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
  let maxErrorPx = 0;
  let maxErrorTileId = samples[0]?.projected?.id ?? null;
  for (let index = 0; index < vectors.length; index++) {
    const { projectedVector, layoutVector } = vectors[index];
    const expectedX = projectedVector.x * cos - projectedVector.y * sin;
    const expectedY = projectedVector.x * sin + projectedVector.y * cos;
    const errorPx = Math.hypot(layoutVector.x - expectedX, layoutVector.y - expectedY);
    squaredError += errorPx ** 2;
    if (errorPx > maxErrorPx) {
      maxErrorPx = errorPx;
      maxErrorTileId = samples[index].projected.id;
    }
  }
  return {
    rotationDeg: rotation * 180 / Math.PI,
    rmsError: Math.sqrt(squaredError / vectors.length),
    maxErrorPx,
    maxErrorTileId
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

function collectTraversalTiles(
  graph,
  camera,
  {
    centerId = null,
    pixelsPerRadian = TRAVERSAL_PIXELS_PER_RADIAN,
    chartMargin = TRAVERSAL_MARGIN,
    viewportWidth = TRAVERSAL_SCREEN_W,
    viewportHeight = TRAVERSAL_SCREEN_H
  } = {}
) {
  const points = [];
  const ids = centerId === null
    ? Array.from({ length: graph.tileCount }, (_, id) => id)
    : traversalTileIdsNearViewport(graph, camera, centerId, pixelsPerRadian, chartMargin);
  for (const id of ids) {
    const projected = projectDirection(graphCenter(graph, id), camera, pixelsPerRadian, {
      viewportWidth,
      viewportHeight
    });
    if (!projected) continue;
    if (
      projected.x < -chartMargin ||
      projected.x > viewportWidth + chartMargin ||
      projected.y < -chartMargin ||
      projected.y > viewportHeight + chartMargin
    ) continue;
    points.push({ id, ...projected });
  }
  return points;
}

function traversalTileIdsNearViewport(graph, camera, centerId, pixelsPerRadian, chartMargin) {
  const maximumDistance = Math.hypot(
    TRAVERSAL_SCREEN_W / 2 + chartMargin,
    TRAVERSAL_SCREEN_H / 2 + chartMargin
  ) / pixelsPerRadian + 0.025;
  const minimumDot = Math.cos(maximumDistance);
  const ids = [];
  const queue = [centerId];
  const seen = new Set(queue);
  for (let head = 0; head < queue.length; head++) {
    const id = queue[head];
    if (dot3(graphCenter(graph, id), camera.center) < minimumDot) continue;
    ids.push(id);
    for (const neighborId of graph.neighbors[id]) {
      if (seen.has(neighborId)) continue;
      seen.add(neighborId);
      queue.push(neighborId);
    }
  }
  return ids;
}

function projectDirection(
  direction,
  camera,
  pixelsPerRadian = TRAVERSAL_PIXELS_PER_RADIAN,
  {
    viewportWidth = TRAVERSAL_SCREEN_W,
    viewportHeight = TRAVERSAL_SCREEN_H
  } = {}
) {
  const d = dot3(direction, camera.center);
  if (d <= 0.2) return null;
  const vx = dot3(direction, camera.right);
  const vy = dot3(direction, camera.up);
  const sinTheta = Math.sqrt(Math.max(0, 1 - d * d));
  const scale = sinTheta > 1e-6 ? Math.acos(clamp(d, -1, 1)) / sinTheta : 1;
  return {
    x: Math.round(viewportWidth / 2 + vx * scale * pixelsPerRadian),
    y: Math.round(viewportHeight / 2 - vy * scale * pixelsPerRadian)
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

function rotatePoint({ x, y }, angleDeg) {
  const angle = angleDeg * Math.PI / 180;
  return {
    x: x * Math.cos(angle) - y * Math.sin(angle),
    y: x * Math.sin(angle) + y * Math.cos(angle)
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
