import test from "node:test";
import assert from "node:assert/strict";
import {
  chartFogFullyCoversCircle,
  chartRepairFogFrame,
  createChartRepairFog,
  polarChartFogFrame
} from "./chartRepairFog.js";

test("repair fog leaves the ship visible while making distant geography opaque", () => {
  const fog = createChartRepairFog({
    nowMs: 100,
    viewportWidth: 455,
    viewportHeight: 256,
    focusX: 227,
    focusY: 128
  });
  const open = chartRepairFogFrame(fog, 100);
  const closed = chartRepairFogFrame(fog, 100 + fog.durationMs / 2);
  const cleared = chartRepairFogFrame(fog, 100 + fog.durationMs);

  assert.ok(open.clearRadius > 500);
  assert.equal(closed.clearRadius, 34);
  assert.equal(closed.opaqueRadius, 62);
  assert.equal(closed.repairReady, true);
  assert.equal(cleared.finished, true);
});

test("polar fog preserves a clear navigable center and hides the chart edge", () => {
  const fog = polarChartFogFrame({
    latitudeDeg: 78,
    viewportWidth: 455,
    viewportHeight: 256,
    focusX: 227,
    focusY: 128
  });

  assert.ok(fog);
  assert.ok(fog.clearRadius >= 100 && fog.clearRadius <= 112);
  assert.equal(chartFogFullyCoversCircle(fog, 227, 128, 12), false);
  assert.equal(chartFogFullyCoversCircle(fog, 10, 10, 12), true);
  assert.equal(polarChartFogFrame({
    latitudeDeg: 50,
    viewportWidth: 455,
    viewportHeight: 256,
    focusX: 227,
    focusY: 128
  }), null);
});
