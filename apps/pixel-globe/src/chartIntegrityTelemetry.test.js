import assert from "node:assert/strict";
import test from "node:test";

import {
  CHART_INTEGRITY_ACTIVE_REPAIR_CONFIRMATION_MS,
  CHART_INTEGRITY_CATASTROPHIC_CONFIRMATION_MS,
  CHART_INTEGRITY_CATASTROPHIC_REPAIR_CONFIRMATION_MS,
  CHART_INTEGRITY_SEVERE_CONFIRMATION_MS,
  chartIntegrityIncidentError,
  chartIntegrityTelemetryStats,
  createChartIntegrityTelemetryMonitor,
  observeChartIntegrityTelemetry
} from "./chartIntegrityTelemetry.js";

test("healthy chart samples remain allocation-light and silent", () => {
  const monitor = createChartIntegrityTelemetryMonitor();
  for (let index = 0; index < 10_000; index++) {
    assert.equal(observeChartIntegrityTelemetry(monitor, sample(index * 500)), null);
  }
  assert.deepEqual(chartIntegrityTelemetryStats(monitor), {
    samplesObserved: 10_000,
    severeSamples: 0,
    catastrophicSamples: 0,
    incidentsDetected: 0,
    maximumAbsoluteTiltDeg: 0,
    maximumTerrainTearPx: 0,
    maximumWaterTearPx: 0,
    maximumViewportEdgeGapPx: 0,
    maximumViewportInteriorGapPx: 20
  });
});

test("a transient bad sample does not become telemetry", () => {
  const monitor = createChartIntegrityTelemetryMonitor();
  assert.equal(observeChartIntegrityTelemetry(monitor, sample(0, { rotationDeg: 9 })), null);
  assert.equal(observeChartIntegrityTelemetry(monitor, sample(500)), null);
  assert.equal(observeChartIntegrityTelemetry(
    monitor,
    sample(CHART_INTEGRITY_SEVERE_CONFIRMATION_MS + 500, { rotationDeg: 9 })
  ), null);
  assert.equal(monitor.incidentsDetected, 0);
});

test("persistent severe tilt produces one incident per unhealthy episode", () => {
  const monitor = createChartIntegrityTelemetryMonitor();
  assert.equal(observeChartIntegrityTelemetry(monitor, sample(0, { rotationDeg: -9 })), null);
  const incident = observeChartIntegrityTelemetry(
    monitor,
    sample(CHART_INTEGRITY_SEVERE_CONFIRMATION_MS, { rotationDeg: -9 })
  );
  assert.equal(incident.category, "tilt");
  assert.equal(incident.severity, "severe");
  assert.equal(observeChartIntegrityTelemetry(
    monitor,
    sample(CHART_INTEGRITY_SEVERE_CONFIRMATION_MS + 500, { rotationDeg: -9 })
  ), null);
  assert.equal(chartIntegrityIncidentError(incident).name, "ChartIntegrityTilt");
});

test("an active repair gets time to settle a severe fault without masking a failure", () => {
  const monitor = createChartIntegrityTelemetryMonitor();
  const fault = { rmsDistortionPx: 13, repairKind: "ocean-swell" };
  assert.equal(observeChartIntegrityTelemetry(monitor, sample(0, fault)), null);
  assert.equal(observeChartIntegrityTelemetry(
    monitor,
    sample(CHART_INTEGRITY_SEVERE_CONFIRMATION_MS, fault)
  ), null);
  const incident = observeChartIntegrityTelemetry(
    monitor,
    sample(CHART_INTEGRITY_ACTIVE_REPAIR_CONFIRMATION_MS, fault)
  );
  assert.equal(incident.category, "rms-distortion");
});

test("catastrophic coast compression reports quickly with tile context", () => {
  const monitor = createChartIntegrityTelemetryMonitor();
  const fault = { tearPx: 40, signedTearPx: -40, surface: "coast" };
  assert.equal(observeChartIntegrityTelemetry(monitor, sample(0, fault)), null);
  const incident = observeChartIntegrityTelemetry(
    monitor,
    sample(CHART_INTEGRITY_CATASTROPHIC_CONFIRMATION_MS, fault)
  );
  assert.equal(incident.category, "coast-compression");
  assert.equal(incident.severity, "catastrophic");
  assert.match(chartIntegrityIncidentError(incident).message, /tear -40\.00px coast \[12:13\]/);
});

test("an emergency repair gets a short grace period but cannot mask a catastrophic fault", () => {
  const monitor = createChartIntegrityTelemetryMonitor();
  const fault = { rmsDistortionPx: 25, repairKind: "closing-fog" };
  assert.equal(observeChartIntegrityTelemetry(monitor, sample(0, fault)), null);
  assert.equal(observeChartIntegrityTelemetry(
    monitor,
    sample(CHART_INTEGRITY_CATASTROPHIC_CONFIRMATION_MS, fault)
  ), null);
  const incident = observeChartIntegrityTelemetry(
    monitor,
    sample(CHART_INTEGRITY_CATASTROPHIC_REPAIR_CONFIRMATION_MS, fault)
  );
  assert.equal(incident.category, "rms-distortion");
  assert.equal(incident.severity, "catastrophic");
});

test("persistent viewport voids are distinguished from geometric tears", () => {
  const monitor = createChartIntegrityTelemetryMonitor();
  const fault = { viewportInteriorGapPx: 130, repairKind: "closing-fog" };
  observeChartIntegrityTelemetry(monitor, sample(0, fault));
  const incident = observeChartIntegrityTelemetry(
    monitor,
    sample(CHART_INTEGRITY_CATASTROPHIC_REPAIR_CONFIRMATION_MS, fault)
  );
  assert.equal(incident.category, "viewport-interior-void");
  assert.equal(incident.repairKind, "closing-fog");
});

test("extreme persistent ocean compression is reported without lowering land thresholds", () => {
  const monitor = createChartIntegrityTelemetryMonitor();
  const fault = { waterTearPx: 175, signedWaterTearPx: -175 };
  observeChartIntegrityTelemetry(monitor, sample(0, fault));
  const incident = observeChartIntegrityTelemetry(
    monitor,
    sample(CHART_INTEGRITY_CATASTROPHIC_CONFIRMATION_MS, fault)
  );
  assert.equal(incident.category, "water-compression");
  assert.equal(incident.severity, "catastrophic");
});

test("chart integrity sampling rejects malformed and backwards samples", () => {
  const monitor = createChartIntegrityTelemetryMonitor();
  observeChartIntegrityTelemetry(monitor, sample(500));
  assert.throws(() => observeChartIntegrityTelemetry(monitor, sample(499)), /moved backwards/);
  assert.throws(
    () => observeChartIntegrityTelemetry(monitor, { ...sample(1000), repairKind: "" }),
    /repair kind/
  );
});

function sample(nowMs, {
  rotationDeg = 0,
  rmsDistortionPx = 0,
  maxDistortionPx = 0,
  tearPx = 0,
  signedTearPx = tearPx,
  surface = "land",
  viewportEdgeGapPx = 0,
  viewportInteriorGapPx = 20,
  waterTearPx = 0,
  signedWaterTearPx = waterTearPx,
  repairKind = "none"
} = {}) {
  return {
    nowMs,
    drift: { rotationDeg, rmsDistortionPx, maxDistortionPx },
    terrainTear: {
      extraPx: tearPx,
      signedExtraPx: signedTearPx,
      tileIds: tearPx > 0 ? [12, 13] : [],
      surface,
      screenX: 100,
      screenY: 80
    },
    waterTear: {
      extraPx: waterTearPx,
      signedExtraPx: signedWaterTearPx,
      tileIds: waterTearPx > 0 ? [22, 23] : [],
      surface: "water",
      screenX: 140,
      screenY: 90
    },
    coverage: {
      edge: { maximumGapPx: viewportEdgeGapPx, edge: "top" },
      interior: {
        maximumNearestTileDistancePx: viewportInteriorGapPx,
        screenX: 200,
        screenY: 120
      },
      viewportTileCount: 120
    },
    repairKind
  };
}
