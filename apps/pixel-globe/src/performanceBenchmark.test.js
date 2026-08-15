import assert from "node:assert/strict";
import test from "node:test";

import {
  BUSY_WORLD_CAPTURE_SCENARIO_ID,
  CLOUD_COVER_CAPTURE_SCENARIO_ID,
  COMBAT_HOTSPOT_CAPTURE_SCENARIO_ID,
  GIBRALTAR_HOTSPOT_CAPTURE_SCENARIO_ID,
  NANJING_HOTSPOT_CAPTURE_SCENARIO_ID,
  NAPLES_APPROACH_CAPTURE_SCENARIO_ID,
  POLAR_FOG_CAPTURE_SCENARIO_ID,
  assertChartIntegrityTelemetryBenchmarkBudget,
  createPerformanceBenchmarkState,
  performanceBenchmarkFromSearch,
  recordPerformanceBenchmarkFrame,
  recordPerformanceBenchmarkStage
} from "./performanceBenchmark.js";

test("busy-world benchmark query resolves deterministic defaults", () => {
  assert.deepEqual(performanceBenchmarkFromSearch("?benchmark=busy-world"), {
    id: "busy-world",
    captureScenarioId: BUSY_WORLD_CAPTURE_SCENARIO_ID,
    warmupSeconds: 2,
    durationSeconds: 8,
    targetLandCarts: 14
  });
});

test("benchmark query accepts bounded timing overrides", () => {
  const config = performanceBenchmarkFromSearch(
    "?benchmark=busy-world&benchmarkWarmup=1.5&benchmarkDuration=12"
  );
  assert.equal(config.warmupSeconds, 1.5);
  assert.equal(config.durationSeconds, 12);
  assert.throws(
    () => performanceBenchmarkFromSearch("?benchmark=busy-world&benchmarkDuration=0"),
    /benchmarkDuration/
  );
});

test("combat-hotspot benchmark selects the eastern Mediterranean combat scene", () => {
  assert.deepEqual(performanceBenchmarkFromSearch("?benchmark=combat-hotspot"), {
    id: "combat-hotspot",
    captureScenarioId: COMBAT_HOTSPOT_CAPTURE_SCENARIO_ID,
    warmupSeconds: 2,
    durationSeconds: 8,
    targetLandCarts: 2
  });
});

test("cloud-cover benchmark selects the deterministic northern Aegean weather scene", () => {
  assert.deepEqual(performanceBenchmarkFromSearch("?benchmark=cloud-cover"), {
    id: "cloud-cover",
    captureScenarioId: CLOUD_COVER_CAPTURE_SCENARIO_ID,
    warmupSeconds: 2,
    durationSeconds: 8,
    targetLandCarts: 2
  });
});

test("polar-fog benchmark exercises the chart fog presentation pass", () => {
  assert.deepEqual(performanceBenchmarkFromSearch("?benchmark=polar-fog"), {
    id: "polar-fog",
    captureScenarioId: POLAR_FOG_CAPTURE_SCENARIO_ID,
    warmupSeconds: 2,
    durationSeconds: 8,
    targetLandCarts: 2
  });
});

test("nanjing-hotspot benchmark stages dense lower-Yangtze traffic", () => {
  assert.deepEqual(performanceBenchmarkFromSearch("?benchmark=nanjing-hotspot"), {
    id: "nanjing-hotspot",
    captureScenarioId: NANJING_HOTSPOT_CAPTURE_SCENARIO_ID,
    warmupSeconds: 2,
    durationSeconds: 8,
    targetLandCarts: 14
  });
});

test("gibraltar-hotspot benchmark stages dense traffic in the narrow strait", () => {
  assert.deepEqual(performanceBenchmarkFromSearch("?benchmark=gibraltar-hotspot"), {
    id: "gibraltar-hotspot",
    captureScenarioId: GIBRALTAR_HOTSPOT_CAPTURE_SCENARIO_ID,
    warmupSeconds: 2,
    durationSeconds: 8,
    targetLandCarts: 2
  });
});

test("naples-approach benchmark crosses the port activation boundary", () => {
  assert.deepEqual(performanceBenchmarkFromSearch("?benchmark=naples-approach"), {
    id: "naples-approach",
    captureScenarioId: NAPLES_APPROACH_CAPTURE_SCENARIO_ID,
    warmupSeconds: 2,
    durationSeconds: 8,
    targetLandCarts: 2
  });
});

test("benchmark report includes frame percentiles and skipped frame estimates", () => {
  const state = createPerformanceBenchmarkState({
    id: "busy-world",
    warmupSeconds: 0.01,
    durationSeconds: 0.05
  }, 0);
  let result = null;
  for (const [frameAtMs, cpuMs, renders] of [
    [0, 2, 0],
    [10, 2, 1],
    [20, 3, 2],
    [26, 3, 3],
    [43, 4, 4],
    [77, 8, 5],
    [90, 4, 6]
  ]) {
    recordPerformanceBenchmarkStage(state, "render", cpuMs / 2);
    result = recordPerformanceBenchmarkFrame(state, frameAtMs, cpuMs, renders, { ships: 12 }) || result;
  }
  assert.equal(result.sampledFrames, 4);
  assert.equal(result.renderedFrames, 4);
  assert.equal(result.frameTimeMs.p50, 13);
  assert.equal(result.frameTimeMs.p95, 34);
  assert.equal(result.cpuTimeMs.max, 8);
  assert.equal(result.stages.render.max, 4);
  assert.equal(result.longFrames.over33Ms, 1);
  assert.equal(result.estimatedSkippedFrames, 1);
  assert.deepEqual(result.scene, { ships: 12 });
});

test("benchmark enforces a sub-millisecond chart telemetry budget", () => {
  assert.deepEqual(assertChartIntegrityTelemetryBenchmarkBudget({
    durationSeconds: 8,
    stages: {
      "chart.integrityTelemetry": { count: 16, mean: 0.04, p95: 0.1 }
    }
  }), { count: 16, mean: 0.04, p95: 0.1 });
  assert.throws(
    () => assertChartIntegrityTelemetryBenchmarkBudget({ stages: {} }),
    /did not sample/
  );
  assert.throws(
    () => assertChartIntegrityTelemetryBenchmarkBudget({
      durationSeconds: 8,
      stages: {
        "chart.integrityTelemetry": { count: 16, mean: 0.3, p95: 0.4 }
      }
    }),
    /mean 0\.3ms exceeds/
  );
  assert.throws(
    () => assertChartIntegrityTelemetryBenchmarkBudget({
      durationSeconds: 8,
      stages: {
        "chart.integrityTelemetry": { count: 80, mean: 0.04, p95: 0.1 }
      }
    }),
    /sampled 10\.00 times per second/
  );
});

test("benchmark evaluates a lazy scene snapshot only when measurement completes", () => {
  const state = createPerformanceBenchmarkState({
    id: "combat-hotspot",
    warmupSeconds: 0.01,
    durationSeconds: 0.02
  }, 0);
  let snapshotCalls = 0;
  const scene = () => {
    snapshotCalls++;
    return { ships: 4 };
  };
  recordPerformanceBenchmarkFrame(state, 0, 2, 0, scene);
  recordPerformanceBenchmarkFrame(state, 10, 2, 1, scene);
  recordPerformanceBenchmarkFrame(state, 20, 2, 2, scene);
  recordPerformanceBenchmarkFrame(state, 30, 2, 3, scene);
  assert.equal(snapshotCalls, 0);
  recordPerformanceBenchmarkFrame(state, 40, 2, 4, scene);
  recordPerformanceBenchmarkFrame(state, 50, 2, 5, scene);
  const result = recordPerformanceBenchmarkFrame(state, 60, 2, 6, scene);
  assert.equal(snapshotCalls, 1);
  assert.deepEqual(result.scene, { ships: 4 });
});

test("unknown benchmarks fail loudly", () => {
  assert.throws(() => performanceBenchmarkFromSearch("?benchmark=unknown"), /Unknown performance benchmark/);
});

test("benchmark ignores a RAF timestamp queued before initialization finished", () => {
  const state = createPerformanceBenchmarkState({
    id: "busy-world",
    warmupSeconds: 1,
    durationSeconds: 1
  }, 5000);
  assert.equal(recordPerformanceBenchmarkFrame(state, 4900, 20, 1, {}), null);
  assert.equal(state.previousFrameAtMs, null);
});

test("benchmark discards the cold first-frame interval before starting its warmup", () => {
  const state = createPerformanceBenchmarkState({
    id: "busy-world",
    warmupSeconds: 0.01,
    durationSeconds: 0.02
  }, 1000);
  recordPerformanceBenchmarkFrame(state, 1000, 900, 1, {});
  recordPerformanceBenchmarkFrame(state, 5000, 4, 2, {});
  assert.equal(state.measurementAnchorMs, 5000);
  assert.deepEqual(state.frameIntervalsMs, []);
  recordPerformanceBenchmarkFrame(state, 5010, 4, 3, {});
  recordPerformanceBenchmarkFrame(state, 5020, 4, 4, {});
  recordPerformanceBenchmarkFrame(state, 5030, 4, 5, {});
  recordPerformanceBenchmarkFrame(state, 5040, 4, 6, {});
  const result = recordPerformanceBenchmarkFrame(state, 5050, 4, 7, {});
  assert.equal(result.sampledFrames, 4);
  assert.equal(result.frameTimeMs.max, 10);
});

test("benchmark extends a measurement until it has four catastrophic-frame samples", () => {
  const state = createPerformanceBenchmarkState({
    id: "busy-world",
    warmupSeconds: 0.01,
    durationSeconds: 0.02
  }, 0);
  recordPerformanceBenchmarkFrame(state, 0, 1, 0, {});
  recordPerformanceBenchmarkFrame(state, 10, 1, 1, {});
  recordPerformanceBenchmarkFrame(state, 20, 1, 2, {});

  assert.equal(recordPerformanceBenchmarkFrame(state, 1000, 980, 3, {}), null);
  assert.equal(recordPerformanceBenchmarkFrame(state, 2000, 980, 4, {}), null);
  assert.equal(recordPerformanceBenchmarkFrame(state, 3000, 980, 5, {}), null);
  const result = recordPerformanceBenchmarkFrame(state, 4000, 980, 6, {});

  assert.equal(result.sampledFrames, 4);
  assert.equal(result.frameTimeMs.p50, 1000);
  assert.equal(result.frameTimeMs.max, 1000);
});
