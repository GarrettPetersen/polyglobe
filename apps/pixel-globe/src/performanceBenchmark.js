export const PERFORMANCE_BENCHMARK_QUERY_PARAM = "benchmark";
export const BUSY_WORLD_BENCHMARK_ID = "busy-world";
export const BUSY_WORLD_CAPTURE_SCENARIO_ID = "benchmark-busy-world";
export const CLOUD_COVER_BENCHMARK_ID = "cloud-cover";
export const CLOUD_COVER_CAPTURE_SCENARIO_ID = "benchmark-cloud-cover";
export const COMBAT_HOTSPOT_BENCHMARK_ID = "combat-hotspot";
export const COMBAT_HOTSPOT_CAPTURE_SCENARIO_ID = "benchmark-combat-hotspot";
export const NANJING_HOTSPOT_BENCHMARK_ID = "nanjing-hotspot";
export const NANJING_HOTSPOT_CAPTURE_SCENARIO_ID = "benchmark-nanjing-hotspot";

const BENCHMARKS = Object.freeze({
  [BUSY_WORLD_BENCHMARK_ID]: Object.freeze({
    captureScenarioId: BUSY_WORLD_CAPTURE_SCENARIO_ID,
    targetLandCarts: 14
  }),
  [CLOUD_COVER_BENCHMARK_ID]: Object.freeze({
    captureScenarioId: CLOUD_COVER_CAPTURE_SCENARIO_ID,
    targetLandCarts: 2
  }),
  [COMBAT_HOTSPOT_BENCHMARK_ID]: Object.freeze({
    captureScenarioId: COMBAT_HOTSPOT_CAPTURE_SCENARIO_ID,
    targetLandCarts: 2
  }),
  [NANJING_HOTSPOT_BENCHMARK_ID]: Object.freeze({
    captureScenarioId: NANJING_HOTSPOT_CAPTURE_SCENARIO_ID,
    targetLandCarts: 14
  })
});

export const PERFORMANCE_BENCHMARK_IDS = Object.freeze(Object.keys(BENCHMARKS));

const FRAME_BUDGET_MS = 1000 / 60;
const MIN_MEASURED_FRAMES = 4;
const DEFAULT_WARMUP_SECONDS = 2;
const DEFAULT_DURATION_SECONDS = 8;

export function performanceBenchmarkFromSearch(search) {
  const params = new URLSearchParams(search);
  const id = params.get(PERFORMANCE_BENCHMARK_QUERY_PARAM);
  if (!id) return null;
  const definition = BENCHMARKS[id];
  if (!definition) throw new Error(`Unknown performance benchmark: ${id}`);
  return Object.freeze({
    id,
    captureScenarioId: definition.captureScenarioId,
    warmupSeconds: positiveQueryNumber(params, "benchmarkWarmup", DEFAULT_WARMUP_SECONDS),
    durationSeconds: positiveQueryNumber(params, "benchmarkDuration", DEFAULT_DURATION_SECONDS),
    targetLandCarts: definition.targetLandCarts
  });
}

export function createPerformanceBenchmarkState(config, startedAtMs) {
  validateConfig(config);
  if (!Number.isFinite(startedAtMs)) throw new Error(`Invalid benchmark start time: ${startedAtMs}`);
  return {
    config,
    startedAtMs,
    measurementAnchorMs: null,
    previousFrameAtMs: null,
    frameIntervalsMs: [],
    frameCpuMs: [],
    frameStageMs: {},
    currentFrameStageMs: {},
    renderCountAtStart: null,
    result: null
  };
}

export function recordPerformanceBenchmarkStage(state, name, durationMs) {
  validateState(state);
  if (typeof name !== "string" || name === "") throw new Error("Benchmark stage requires a name");
  if (!Number.isFinite(durationMs) || durationMs < 0) {
    throw new Error(`Invalid benchmark stage duration for ${name}: ${durationMs}`);
  }
  state.currentFrameStageMs[name] = (state.currentFrameStageMs[name] || 0) + durationMs;
}

export function recordPerformanceBenchmarkFrame(state, frameAtMs, cpuMs, renderCount, scene) {
  validateState(state);
  if (state.result) return state.result;
  if (!Number.isFinite(frameAtMs)) throw new Error(`Invalid benchmark frame time: ${frameAtMs}`);
  if (!Number.isFinite(cpuMs) || cpuMs < 0) throw new Error(`Invalid benchmark CPU time: ${cpuMs}`);
  if (!Number.isInteger(renderCount) || renderCount < 0) {
    throw new Error(`Invalid benchmark render count: ${renderCount}`);
  }
  // A request queued during loading can retain its pre-initialization RAF timestamp.
  if (frameAtMs < state.startedAtMs) {
    state.previousFrameAtMs = null;
    return null;
  }
  if (state.previousFrameAtMs === null) {
    state.previousFrameAtMs = frameAtMs;
    state.currentFrameStageMs = {};
    return null;
  }
  if (state.measurementAnchorMs === null) {
    state.measurementAnchorMs = frameAtMs;
    state.previousFrameAtMs = frameAtMs;
    state.currentFrameStageMs = {};
    return null;
  }

  const measurementStartMs = state.measurementAnchorMs + state.config.warmupSeconds * 1000;
  const measurementEndMs = measurementStartMs + state.config.durationSeconds * 1000;
  if (state.renderCountAtStart === null && frameAtMs >= measurementStartMs) {
    state.renderCountAtStart = renderCount;
  }
  const needsMinimumSamples = state.frameIntervalsMs.length < MIN_MEASURED_FRAMES;
  if (state.previousFrameAtMs !== null && state.previousFrameAtMs >= measurementStartMs &&
      (state.previousFrameAtMs < measurementEndMs || needsMinimumSamples)) {
    state.frameIntervalsMs.push(frameAtMs - state.previousFrameAtMs);
    state.frameCpuMs.push(cpuMs);
    for (const [name, durationMs] of Object.entries(state.currentFrameStageMs)) {
      if (!state.frameStageMs[name]) state.frameStageMs[name] = [];
      state.frameStageMs[name].push(durationMs);
    }
  }
  state.currentFrameStageMs = {};
  state.previousFrameAtMs = frameAtMs;
  if (frameAtMs < measurementEndMs || state.frameIntervalsMs.length < MIN_MEASURED_FRAMES) return null;

  const resolvedScene = typeof scene === "function" ? scene() : scene;
  if (!resolvedScene || typeof resolvedScene !== "object" || Array.isArray(resolvedScene)) {
    throw new Error("Benchmark scene snapshot must be an object or an object-producing function");
  }
  const elapsedMs = state.frameIntervalsMs.reduce((sum, value) => sum + value, 0);
  const renderFrames = renderCount - (state.renderCountAtStart ?? renderCount);
  state.result = Object.freeze({
    version: 1,
    id: state.config.id,
    warmupSeconds: state.config.warmupSeconds,
    durationSeconds: elapsedMs / 1000,
    sampledFrames: state.frameIntervalsMs.length,
    renderedFrames: renderFrames,
    framesPerSecond: roundTo(state.frameIntervalsMs.length * 1000 / elapsedMs, 2),
    renderFramesPerSecond: roundTo(renderFrames * 1000 / elapsedMs, 2),
    frameTimeMs: distribution(state.frameIntervalsMs),
    cpuTimeMs: distribution(state.frameCpuMs),
    stages: Object.freeze(Object.fromEntries(
      Object.entries(state.frameStageMs)
        .filter(([, values]) => values.length > 0)
        .map(([name, values]) => [name, distribution(values)])
    )),
    longFrames: Object.freeze({
      over20Ms: countOver(state.frameIntervalsMs, 20),
      over33Ms: countOver(state.frameIntervalsMs, 1000 / 30),
      over50Ms: countOver(state.frameIntervalsMs, 50)
    }),
    estimatedSkippedFrames: state.frameIntervalsMs.reduce(
      (sum, value) => sum + Math.max(0, Math.round(value / FRAME_BUDGET_MS) - 1),
      0
    ),
    scene: Object.freeze({ ...resolvedScene })
  });
  return state.result;
}

function distribution(values) {
  if (!Array.isArray(values) || values.length === 0) throw new Error("Benchmark distribution requires samples");
  const sorted = [...values].sort((a, b) => a - b);
  const total = sorted.reduce((sum, value) => sum + value, 0);
  return Object.freeze({
    mean: roundTo(total / sorted.length, 3),
    p50: roundTo(percentile(sorted, 0.5), 3),
    p95: roundTo(percentile(sorted, 0.95), 3),
    p99: roundTo(percentile(sorted, 0.99), 3),
    max: roundTo(sorted.at(-1), 3)
  });
}

function percentile(sorted, ratio) {
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1));
  return sorted[index];
}

function countOver(values, threshold) {
  return values.reduce((count, value) => count + (value > threshold ? 1 : 0), 0);
}

function positiveQueryNumber(params, key, fallback) {
  const raw = params.get(key);
  if (raw === null) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0 || value > 120) {
    throw new Error(`${key} must be greater than 0 and no more than 120 seconds`);
  }
  return value;
}

function roundTo(value, places) {
  const scale = 10 ** places;
  return Math.round(value * scale) / scale;
}

function validateConfig(config) {
  if (!config || typeof config.id !== "string" || !Number.isFinite(config.warmupSeconds) ||
      !Number.isFinite(config.durationSeconds) || config.warmupSeconds <= 0 || config.durationSeconds <= 0) {
    throw new Error("Invalid performance benchmark configuration");
  }
}

function validateState(state) {
  if (!state || !Array.isArray(state.frameIntervalsMs) || !Array.isArray(state.frameCpuMs) ||
      !state.frameStageMs || !state.currentFrameStageMs ||
      (state.measurementAnchorMs !== null && !Number.isFinite(state.measurementAnchorMs))) {
    throw new Error("Invalid performance benchmark state");
  }
}
