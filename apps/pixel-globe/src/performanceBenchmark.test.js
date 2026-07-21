import assert from "node:assert/strict";
import test from "node:test";

import {
  BUSY_WORLD_CAPTURE_SCENARIO_ID,
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
    [77, 8, 5]
  ]) {
    recordPerformanceBenchmarkStage(state, "render", cpuMs / 2);
    result = recordPerformanceBenchmarkFrame(state, frameAtMs, cpuMs, renders, { ships: 12 }) || result;
  }
  assert.equal(result.sampledFrames, 3);
  assert.equal(result.renderedFrames, 3);
  assert.equal(result.frameTimeMs.p50, 17);
  assert.equal(result.frameTimeMs.p95, 34);
  assert.equal(result.cpuTimeMs.max, 8);
  assert.equal(result.stages.render.max, 4);
  assert.equal(result.longFrames.over33Ms, 1);
  assert.equal(result.estimatedSkippedFrames, 1);
  assert.deepEqual(result.scene, { ships: 12 });
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
  const result = recordPerformanceBenchmarkFrame(state, 5030, 4, 5, {});
  assert.equal(result.sampledFrames, 2);
  assert.equal(result.frameTimeMs.max, 10);
});
