import test from "node:test";
import assert from "node:assert/strict";
import {
  CHART_CLOUD_REPAIR_LAND_TEAR_PX,
  CHART_CLOUD_REPAIR_RMS_PX,
  chartDriftNeedsCloudRepair,
  chartDistortionNeedsRepair,
  chartFaultNeedsCloudRepair,
  chartRotationNeedsFullCloudRepair,
  landTearNeedsRepair,
  measureVisibleLandTear
} from "./chartVisualFault.js";

test("visible adjacent land reports excess spacing but ignores offscreen faults", () => {
  const tileById = new Map([
    [0, tile(0, 10, 20, 10, 20)],
    [1, tile(1, 42, 20, 30, 20)],
    [2, tile(2, 500, 20, 50, 20)],
    [3, tile(3, 540, 20, 70, 20)]
  ]);
  const result = measureVisibleLandTear({
    faceCalls: [{ a: 0, b: 1 }, { a: 2, b: 3 }],
    tileById,
    offset: { x: 0, y: 0 },
    viewportWidth: 100,
    viewportHeight: 60,
    isLandTile: () => true
  });

  assert.equal(result.extraPx, 12);
  assert.deepEqual(result.tileIds, [0, 1]);
});

test("large tilt, distortion, or visible tear requests cloud repair", () => {
  const calm = { rotationDeg: 0, rmsDistortionPx: 0, maxDistortionPx: 0 };
  const attached = { extraPx: 0 };
  assert.equal(chartFaultNeedsCloudRepair({ drift: calm, landTear: attached }), false);
  assert.equal(chartDriftNeedsCloudRepair(calm), false);
  assert.equal(chartRotationNeedsFullCloudRepair(calm), false);
  assert.equal(chartDistortionNeedsRepair(calm), false);
  assert.equal(landTearNeedsRepair(attached), false);
  assert.equal(chartFaultNeedsCloudRepair({
    drift: { ...calm, rotationDeg: 4 },
    landTear: attached
  }), true);
  assert.equal(chartRotationNeedsFullCloudRepair({ ...calm, rotationDeg: 4 }), true);
  assert.equal(chartDistortionNeedsRepair({
    ...calm,
    rmsDistortionPx: CHART_CLOUD_REPAIR_RMS_PX
  }), true);
  assert.equal(chartFaultNeedsCloudRepair({
    drift: calm,
    landTear: { extraPx: CHART_CLOUD_REPAIR_LAND_TEAR_PX }
  }), true);
  assert.equal(landTearNeedsRepair({ extraPx: CHART_CLOUD_REPAIR_LAND_TEAR_PX }), true);
});

function tile(id, x, y, projectedX, projectedY) {
  return { id, x, y, projectedX, projectedY };
}
