import test from "node:test";
import assert from "node:assert/strict";
import {
  CHART_CLOUD_REPAIR_TERRAIN_TEAR_PX,
  CHART_CLOUD_REPAIR_RMS_PX,
  chartFaultCanRelyOnSwell,
  chartDriftNeedsCloudRepair,
  chartDistortionNeedsRepair,
  chartFaultNeedsCloudRepair,
  chartRotationNeedsFullCloudRepair,
  measureVisibleTerrainTear,
  nearestChartSurfaceAtPoint,
  terrainTearNeedsRepair
} from "./chartVisualFault.js";

test("chart distortion samples resolve by tile centers rather than sprite anchors", () => {
  const tileCalls = [
    { id: 1, x: 120, y: 80, drawSurfaceX: 300, drawSurfaceY: 300, surface: "water" },
    { id: 2, x: 220, y: 80, drawSurfaceX: 120, drawSurfaceY: 80, surface: "land" }
  ];
  assert.equal(nearestChartSurfaceAtPoint({
    tileCalls,
    offset: { x: 5, y: -3 },
    point: { x: 125, y: 77 },
    surfaceForTile: (call) => call.surface
  }), "water");
});

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
  assert.equal(result.nonWater.extraPx, 0);
  assert.equal(result.nonWater.surface, null);
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

test("open-ocean elasticity does not hide or impersonate a structural tear", () => {
  const result = measureVisibleTerrainTear({
    faceCalls: [{ a: 0, b: 1 }, { a: 2, b: 3 }],
    tileById: new Map([
      [0, tile(0, 10, 10, 10, 10, "water")],
      [1, tile(1, 70, 10, 30, 10, "water")],
      [2, tile(2, 10, 40, 10, 40, "land")],
      [3, tile(3, 42, 40, 30, 40, "water")]
    ]),
    offset: { x: 0, y: 0 },
    viewportWidth: 100,
    viewportHeight: 60,
    surfaceForTile: (entry) => entry.surface
  });

  assert.equal(result.extraPx, 40);
  assert.equal(result.surface, "water");
  assert.equal(result.nonWater.extraPx, 12);
  assert.equal(result.nonWater.surface, "coast");
  assert.deepEqual(result.nonWater.tileIds, [2, 3]);
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

test("a local water swell cannot claim broad archipelago distortion", () => {
  const aleutianDistortion = {
    rotationDeg: 0.39,
    rmsDistortionPx: 24.42,
    maxDistortionPx: 32.96
  };
  assert.equal(chartFaultCanRelyOnSwell({
    drift: aleutianDistortion,
    waterOnlyViewport: false,
    localWaterFault: true
  }), false);
  assert.equal(chartFaultCanRelyOnSwell({
    drift: aleutianDistortion,
    waterOnlyViewport: true,
    localWaterFault: true
  }), true);
  assert.equal(chartFaultCanRelyOnSwell({
    drift: { rotationDeg: 0, rmsDistortionPx: 0, maxDistortionPx: 0 },
    waterOnlyViewport: false,
    localWaterFault: true
  }), true);
});

test("a water-only viewport always keeps repair in the water system", () => {
  assert.equal(chartFaultCanRelyOnSwell({
    drift: {
      rotationDeg: 9,
      rmsDistortionPx: 20,
      maxDistortionPx: 48
    },
    waterOnlyViewport: true,
    localWaterFault: false
  }), true);
});

function tile(id, x, y, projectedX, projectedY, surface) {
  return { id, x, y, projectedX, projectedY, surface };
}
