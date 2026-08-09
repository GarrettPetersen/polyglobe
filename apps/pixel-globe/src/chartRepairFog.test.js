import test from "node:test";
import assert from "node:assert/strict";
import {
  chartFogFullyCoversCircle,
  chartRepairFogFrame,
  createChartRepairFog,
  polarChartFogFrame
} from "./chartRepairFog.js";

test("repair fog progressively hides distant geography before clearing", () => {
  const fog = createChartRepairFog({
    nowMs: 100,
    viewportWidth: 455,
    viewportHeight: 256,
    focusX: 227,
    focusY: 128
  });
  const open = chartRepairFogFrame(fog, 100);
  const rim = chartRepairFogFrame(fog, 100 + fog.formationDurationMs / 2);
  const nearlyClosed = chartRepairFogFrame(fog, 100 + fog.formationDurationMs * 0.999);
  const closed = chartRepairFogFrame(fog, 100 + fog.formationDurationMs);
  const cleared = chartRepairFogFrame(fog, 100 + fog.durationMs);

  assert.ok(fog.durationMs > 40_000);
  assert.equal(open.edgeOpacity, 0);
  assert.ok(open.clearRadius > 290);
  assert.equal(chartFogFullyCoversCircle(rim, 227, 128, 12), false);
  assert.equal(chartFogFullyCoversCircle(rim, 4, 4, 4), false);
  assert.equal(chartFogFullyCoversCircle(nearlyClosed, 4, 4, 4), true);
  assert.ok(Math.abs(closed.clearRadius - fog.minimumClearRadius) < 1e-9);
  assert.equal(closed.repairReady, true);
  assert.equal(cleared.finished, true);
});

test("repair fog can clear early after an outer-ring repair is sufficient", () => {
  const fog = createChartRepairFog({
    nowMs: 0,
    viewportWidth: 455,
    viewportHeight: 256,
    focusX: 227,
    focusY: 128
  });
  const releaseAtMs = fog.formationDurationMs / 2;
  const forming = chartRepairFogFrame(fog, releaseAtMs);
  const clearing = chartRepairFogFrame(fog, releaseAtMs + fog.clearingDurationMs / 2, {
    startedAtMs: releaseAtMs,
    startLevel: forming.concealment
  });
  const cleared = chartRepairFogFrame(fog, releaseAtMs + fog.clearingDurationMs, {
    startedAtMs: releaseAtMs,
    startLevel: forming.concealment
  });

  assert.ok(clearing.concealment < forming.concealment);
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
