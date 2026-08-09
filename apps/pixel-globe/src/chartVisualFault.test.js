import test from "node:test";
import assert from "node:assert/strict";
import {
  CHART_CLOUD_REPAIR_TERRAIN_TEAR_PX,
  CHART_CLOUD_REPAIR_RMS_PX,
  chartDriftNeedsCloudRepair,
  chartDistortionNeedsRepair,
  chartFaultNeedsCloudRepair,
  chartRotationNeedsFullCloudRepair,
  measureVisibleTerrainTear,
  terrainTearNeedsRepair
} from "./chartVisualFault.js";

test("visible adjacent terrain reports excess spacing but ignores offscreen faults", () => {
  const tileById = new Map([
    [0, tile(0, 10, 20, 10, 20, "water")],
    [1, tile(1, 42, 20, 30, 20, "water")],
    [2, tile(2, 500, 20, 50, 20, "land")],
    [3, tile(3, 540, 20, 70, 20, "land")]
  ]);
  const result = measureVisibleTerrainTear({
    faceCalls: [{ a: 0, b: 1 }, { a: 2, b: 3 }],
    tileById,
    offset: { x: 0, y: 0 },
    viewportWidth: 100,
    viewportHeight: 60,
    surfaceForTile: (entry) => entry.surface
  });

  assert.equal(result.extraPx, 12);
  assert.deepEqual(result.tileIds, [0, 1]);
  assert.equal(result.surface, "water");
});

test("coastal gaps participate in tear detection", () => {
  const result = measureVisibleTerrainTear({
    faceCalls: [{ a: 0, b: 1 }],
    tileById: new Map([
      [0, tile(0, 10, 20, 10, 20, "land")],
      [1, tile(1, 48, 20, 30, 20, "water")]
    ]),
    offset: { x: 0, y: 0 },
    viewportWidth: 100,
    viewportHeight: 60,
    surfaceForTile: (entry) => entry.surface
  });

  assert.equal(result.extraPx, 18);
  assert.equal(result.surface, "coast");
});

test("compressed navigable spacing participates in tear detection", () => {
  const result = measureVisibleTerrainTear({
    faceCalls: [{ a: 0, b: 1 }],
    tileById: new Map([
      [0, tile(0, 10, 20, 10, 20, "water")],
      [1, tile(1, 18, 20, 30, 20, "water")]
    ]),
    offset: { x: 0, y: 0 },
    viewportWidth: 100,
    viewportHeight: 60,
    surfaceForTile: (entry) => entry.surface
  });

  assert.equal(result.extraPx, 12);
  assert.equal(result.signedExtraPx, -12);
  assert.equal(result.surface, "water");
});

test("large tilt, distortion, or visible tear requests cloud repair", () => {
  const calm = { rotationDeg: 0, rmsDistortionPx: 0, maxDistortionPx: 0 };
  const attached = { extraPx: 0 };
  assert.equal(chartFaultNeedsCloudRepair({ drift: calm, terrainTear: attached }), false);
  assert.equal(chartDriftNeedsCloudRepair(calm), false);
  assert.equal(chartRotationNeedsFullCloudRepair(calm), false);
  assert.equal(chartDistortionNeedsRepair(calm), false);
  assert.equal(terrainTearNeedsRepair(attached), false);
  assert.equal(chartFaultNeedsCloudRepair({
    drift: { ...calm, rotationDeg: 4 },
    terrainTear: attached
  }), true);
  assert.equal(chartRotationNeedsFullCloudRepair({ ...calm, rotationDeg: 4 }), true);
  assert.equal(chartDistortionNeedsRepair({
    ...calm,
    rmsDistortionPx: CHART_CLOUD_REPAIR_RMS_PX
  }), true);
  assert.equal(chartFaultNeedsCloudRepair({
    drift: calm,
    terrainTear: { extraPx: CHART_CLOUD_REPAIR_TERRAIN_TEAR_PX }
  }), true);
  assert.equal(terrainTearNeedsRepair({ extraPx: CHART_CLOUD_REPAIR_TERRAIN_TEAR_PX }), true);
});

function tile(id, x, y, projectedX, projectedY, surface) {
  return { id, x, y, projectedX, projectedY, surface };
}
