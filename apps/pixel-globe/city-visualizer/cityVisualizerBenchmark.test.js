import assert from "node:assert/strict";
import test from "node:test";
import {
  CITY_VISUALIZER_BENCHMARK_ID,
  cityVisualizerBenchmarkFromSearch,
  assertCityFrameCpuBudget
} from "./cityVisualizerBenchmark.js";

test("city visualizer benchmark is opt-in with stable defaults", () => {
  assert.equal(cityVisualizerBenchmarkFromSearch(""), null);
  assert.deepEqual(
    cityVisualizerBenchmarkFromSearch(`?benchmark=${CITY_VISUALIZER_BENCHMARK_ID}`),
    {
      id: CITY_VISUALIZER_BENCHMARK_ID,
      warmupSeconds: 2,
      durationSeconds: 8,
      cameraMode: "stationary"
    }
  );
});

test("city frame budget catches cold and warmup stalls even when steady frames are fast", () => {
  assert.doesNotThrow(() => assertCityFrameCpuBudget({ coldFrameCpuMs: 30, maxFrameCpuMs: 50 }, 50));
  assert.throws(() => assertCityFrameCpuBudget({ coldFrameCpuMs: 1100, maxFrameCpuMs: 1100 }, 500), /exceeded/);
  assert.throws(() => assertCityFrameCpuBudget({ coldFrameCpuMs: 30, maxFrameCpuMs: 1100 }, 500), /including warmup/);
  assert.throws(() => assertCityFrameCpuBudget({ cpuTimeMs: { max: 2 } }, 500), /measurements/);
  assert.throws(() => assertCityFrameCpuBudget({ coldFrameCpuMs: 30, maxFrameCpuMs: 20 }, 500), /measurements/);
  assert.throws(() => assertCityFrameCpuBudget({ coldFrameCpuMs: 30, maxFrameCpuMs: 50 }, NaN), /positive limit/);
});

test("city visualizer benchmark accepts bounded measurement durations", () => {
  assert.deepEqual(
    cityVisualizerBenchmarkFromSearch(
      `?benchmark=${CITY_VISUALIZER_BENCHMARK_ID}&benchmarkWarmup=0.5&benchmarkDuration=12`
    ),
    {
      id: CITY_VISUALIZER_BENCHMARK_ID,
      warmupSeconds: 0.5,
      durationSeconds: 12,
      cameraMode: "stationary"
    }
  );
  assert.throws(
    () => cityVisualizerBenchmarkFromSearch(
      `?benchmark=${CITY_VISUALIZER_BENCHMARK_ID}&benchmarkDuration=0`
    ),
    /benchmarkDuration must be greater than 0/
  );
  assert.throws(
    () => cityVisualizerBenchmarkFromSearch("?benchmark=unknown"),
    /Unknown city visualizer benchmark/
  );
  assert.equal(
    cityVisualizerBenchmarkFromSearch(
      `?benchmark=${CITY_VISUALIZER_BENCHMARK_ID}&benchmarkCamera=pan`
    ).cameraMode,
    "pan"
  );
  assert.throws(
    () => cityVisualizerBenchmarkFromSearch(
      `?benchmark=${CITY_VISUALIZER_BENCHMARK_ID}&benchmarkCamera=orbit`
    ),
    /Unknown city visualizer benchmark camera mode/
  );
});
