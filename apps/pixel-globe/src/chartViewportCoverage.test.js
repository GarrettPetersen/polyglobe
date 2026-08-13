import test from "node:test";
import assert from "node:assert/strict";
import {
  chartTerrainCoverageBounds,
  chartViewportEdgeCoverage,
  measureChartViewportTileCoverage
} from "./chartViewportCoverage.js";

test("chart edge coverage detects a viewport that has outrun retained terrain", () => {
  const bounds = chartTerrainCoverageBounds([
    { id: 1, drawSurfaceX: 0, drawSurfaceY: 0 },
    { id: 2, drawSurfaceX: 200, drawSurfaceY: 100 }
  ], 18);

  assert.deepEqual(
    chartViewportEdgeCoverage({
      bounds,
      offset: { x: 0, y: 0 },
      viewportWidth: 300,
      viewportHeight: 120
    }),
    {
      maximumGapPx: 82,
      edge: "right",
      gaps: { left: -18, top: -18, right: 82, bottom: 2 }
    }
  );
});

test("sampled chart coverage detects a large interior void despite covered outer bounds", () => {
  const tileCalls = [];
  for (let x = 0; x <= 240; x += 20) {
    tileCalls.push({ id: tileCalls.length, drawSurfaceX: x, drawSurfaceY: 0 });
    tileCalls.push({ id: tileCalls.length, drawSurfaceX: x, drawSurfaceY: 160 });
  }
  const coverage = measureChartViewportTileCoverage({
    tileCalls,
    offset: { x: 0, y: 0 },
    viewportWidth: 240,
    viewportHeight: 160,
    sampleSpacingPx: 40
  });

  assert.equal(coverage.maximumNearestTileDistancePx, 80);
  assert.equal(coverage.screenY, 80);
});

test("sampled chart coverage remains tight for a complete terrain grid", () => {
  const tileCalls = [];
  for (let y = -20; y <= 180; y += 20) {
    for (let x = -20; x <= 260; x += 20) {
      tileCalls.push({ id: tileCalls.length, drawSurfaceX: x, drawSurfaceY: y });
    }
  }
  const coverage = measureChartViewportTileCoverage({
    tileCalls,
    offset: { x: 0, y: 0 },
    viewportWidth: 240,
    viewportHeight: 160,
    sampleSpacingPx: 40
  });

  assert.equal(coverage.maximumNearestTileDistancePx, 0);
});
