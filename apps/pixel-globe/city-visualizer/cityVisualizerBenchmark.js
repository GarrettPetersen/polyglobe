export const CITY_VISUALIZER_BENCHMARK_ID = "city-visualizer";
export const CITY_VISUALIZER_BENCHMARK_CAMERA_MODES = Object.freeze(["stationary", "pan"]);

const DEFAULT_WARMUP_SECONDS = 2;
const DEFAULT_DURATION_SECONDS = 8;
const MAX_BENCHMARK_SECONDS = 120;

export function cityVisualizerBenchmarkFromSearch(search) {
  const params = new URLSearchParams(search);
  const id = params.get("benchmark");
  if (id === null) return null;
  if (id !== CITY_VISUALIZER_BENCHMARK_ID) {
    throw new Error(`Unknown city visualizer benchmark: ${id}`);
  }
  return Object.freeze({
    id,
    warmupSeconds: positiveDuration(params, "benchmarkWarmup", DEFAULT_WARMUP_SECONDS),
    durationSeconds: positiveDuration(params, "benchmarkDuration", DEFAULT_DURATION_SECONDS),
    cameraMode: cameraMode(params.get("benchmarkCamera"))
  });
}

function cameraMode(value) {
  const resolved = value || "stationary";
  if (!CITY_VISUALIZER_BENCHMARK_CAMERA_MODES.includes(resolved)) {
    throw new Error(`Unknown city visualizer benchmark camera mode: ${resolved}`);
  }
  return resolved;
}

export function assertCityFrameCpuBudget(report, budgetMs) {
  if (!Number.isFinite(budgetMs) || budgetMs <= 0 ||
      !Number.isFinite(report?.coldFrameCpuMs) || report.coldFrameCpuMs < 0 ||
      !Number.isFinite(report?.maxFrameCpuMs) || report.maxFrameCpuMs < report.coldFrameCpuMs) {
    throw new Error("City frame budget requires a positive limit and cold/warm frame measurements");
  }
  if (report.maxFrameCpuMs > budgetMs) {
    throw new Error(`City frame CPU exceeded ${budgetMs} ms: ${report.maxFrameCpuMs.toFixed(1)} ms including warmup`);
  }
}

function positiveDuration(params, key, fallback) {
  const raw = params.get(key);
  if (raw === null) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0 || value > MAX_BENCHMARK_SECONDS) {
    throw new Error(`${key} must be greater than 0 and no more than ${MAX_BENCHMARK_SECONDS} seconds`);
  }
  return value;
}
