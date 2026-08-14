export const PERSISTENT_LOW_FRAME_RATE_THRESHOLD_FPS = 20;
export const PERSISTENT_LOW_FRAME_RATE_DURATION_MS = 20_000;

const SAMPLE_BUCKET_MS = 1_000;
const PROFILE_TRIGGER_WINDOW_MS = 3_000;
const PROFILE_TRIGGER_FPS = 24;
const REPORT_RECENCY_WINDOW_MS = 5_000;
const RECOVERY_FPS = 28;
const MAX_FRAME_GAP_MS = 2_500;
const MAX_STAGE_COUNT = 5;

export function createPersistentLowFrameRateMonitor({
  thresholdFps = PERSISTENT_LOW_FRAME_RATE_THRESHOLD_FPS,
  durationMs = PERSISTENT_LOW_FRAME_RATE_DURATION_MS
} = {}) {
  if (!Number.isFinite(thresholdFps) || thresholdFps <= 0 || thresholdFps >= 60 ||
      !Number.isFinite(durationMs) || durationMs < 5_000 || durationMs > 120_000) {
    throw new Error("Persistent low-frame-rate monitor requires valid thresholds");
  }
  return {
    thresholdFps,
    durationMs,
    previousFrameAtMs: null,
    bucketStartedAtMs: null,
    bucketFrames: 0,
    buckets: [],
    currentFrameIntervalMs: null,
    currentFrameStageMs: {},
    profiling: false,
    profiledFrameIntervalsMs: [],
    profiledCpuMs: [],
    stageTotalsMs: {},
    stageMaximumMs: {},
    reported: false,
    reportPending: false
  };
}

export function beginPersistentLowFrameRateFrame(monitor, nowMs, { eligible = true } = {}) {
  validateMonitor(monitor);
  if (!Number.isFinite(nowMs) || nowMs < 0 || typeof eligible !== "boolean") {
    throw new Error("Persistent low-frame-rate frame requires valid timing and eligibility");
  }
  monitor.currentFrameStageMs = {};
  monitor.currentFrameIntervalMs = null;
  monitor.reportPending = false;
  if (monitor.reported) return false;
  if (!eligible) {
    resetCandidate(monitor);
    return false;
  }
  if (monitor.previousFrameAtMs === null) {
    monitor.previousFrameAtMs = nowMs;
    monitor.bucketStartedAtMs = nowMs;
    return false;
  }
  if (nowMs < monitor.previousFrameAtMs) {
    throw new Error(`Low-frame-rate clock moved backwards: ${nowMs} < ${monitor.previousFrameAtMs}`);
  }
  const intervalMs = nowMs - monitor.previousFrameAtMs;
  monitor.previousFrameAtMs = nowMs;
  if (intervalMs <= 0) return monitor.profiling;
  if (intervalMs > MAX_FRAME_GAP_MS) {
    resetCandidate(monitor, nowMs);
    return false;
  }
  monitor.currentFrameIntervalMs = intervalMs;
  monitor.bucketFrames += 1;
  const bucketDurationMs = nowMs - monitor.bucketStartedAtMs;
  if (bucketDurationMs >= SAMPLE_BUCKET_MS) {
    monitor.buckets.push({ durationMs: bucketDurationMs, frames: monitor.bucketFrames });
    monitor.bucketStartedAtMs = nowMs;
    monitor.bucketFrames = 0;
    trimBuckets(monitor);
    updateProfilingState(monitor);
    monitor.reportPending = sustainedLowFrameRate(monitor);
  }
  return monitor.profiling;
}

export function recordPersistentLowFrameRateStage(monitor, name, durationMs) {
  validateMonitor(monitor);
  if (!monitor.profiling || monitor.reported) return false;
  if (typeof name !== "string" || name === "" || !Number.isFinite(durationMs) || durationMs < 0) {
    throw new Error("Persistent low-frame-rate stage requires a name and duration");
  }
  monitor.currentFrameStageMs[name] = (monitor.currentFrameStageMs[name] || 0) + durationMs;
  return true;
}

export function finishPersistentLowFrameRateFrame(monitor, cpuMs) {
  validateMonitor(monitor);
  if (!Number.isFinite(cpuMs) || cpuMs < 0) {
    throw new Error(`Invalid low-frame-rate CPU duration: ${cpuMs}`);
  }
  if (monitor.reported) return null;
  if (monitor.profiling && monitor.currentFrameIntervalMs !== null) {
    monitor.profiledFrameIntervalsMs.push(monitor.currentFrameIntervalMs);
    monitor.profiledCpuMs.push(cpuMs);
    for (const [name, durationMs] of Object.entries(monitor.currentFrameStageMs)) {
      monitor.stageTotalsMs[name] = (monitor.stageTotalsMs[name] || 0) + durationMs;
      monitor.stageMaximumMs[name] = Math.max(monitor.stageMaximumMs[name] || 0, durationMs);
    }
  }
  if (!monitor.reportPending) return null;
  const report = buildReport(monitor);
  monitor.reported = true;
  monitor.profiling = false;
  return report;
}

function updateProfilingState(monitor) {
  const recent = bucketRate(monitor.buckets, PROFILE_TRIGGER_WINDOW_MS);
  if (recent.durationMs < PROFILE_TRIGGER_WINDOW_MS) return;
  if (recent.fps < PROFILE_TRIGGER_FPS) {
    monitor.profiling = true;
    return;
  }
  if (recent.fps >= RECOVERY_FPS) clearProfile(monitor);
}

function sustainedLowFrameRate(monitor) {
  const full = bucketRate(monitor.buckets, monitor.durationMs);
  if (full.durationMs < monitor.durationMs || full.fps >= monitor.thresholdFps) return false;
  const recent = bucketRate(monitor.buckets, REPORT_RECENCY_WINDOW_MS);
  return recent.durationMs >= REPORT_RECENCY_WINDOW_MS && recent.fps < monitor.thresholdFps;
}

function buildReport(monitor) {
  if (monitor.profiledFrameIntervalsMs.length === 0 || monitor.profiledCpuMs.length === 0) {
    throw new Error("Persistent low-frame-rate report has no profiled frames");
  }
  const full = bucketRate(monitor.buckets, monitor.durationMs);
  const frameTimeMs = distribution(monitor.profiledFrameIntervalsMs);
  const cpuTimeMs = distribution(monitor.profiledCpuMs);
  const profiledFrames = monitor.profiledCpuMs.length;
  const allStages = Object.entries(monitor.stageTotalsMs)
    .map(([name, totalMs]) => ({
      name,
      meanMs: round(totalMs / profiledFrames, 2),
      maxMs: round(monitor.stageMaximumMs[name], 2)
    }))
    .sort((left, right) => right.meanMs - left.meanMs);
  const attributedMeanMs = allStages.reduce((sum, stage) => sum + stage.meanMs, 0);
  const unattributedMeanMs = Math.max(0, cpuTimeMs.mean - attributedMeanMs);
  const framePacingMeanMs = Math.max(0, frameTimeMs.mean - cpuTimeMs.mean);
  if (framePacingMeanMs > 0.05 || allStages.length === 0) {
    allStages.push({
      name: "frame-pacing",
      meanMs: round(framePacingMeanMs, 2),
      maxMs: round(Math.max(0, frameTimeMs.max - cpuTimeMs.max), 2)
    });
  }
  allStages.sort((left, right) => right.meanMs - left.meanMs);
  const stages = allStages.slice(0, MAX_STAGE_COUNT);
  if (unattributedMeanMs > 0.05) {
    stages.push({
      name: "unattributed",
      meanMs: round(unattributedMeanMs, 2),
      maxMs: round(cpuTimeMs.max, 2)
    });
    stages.sort((left, right) => right.meanMs - left.meanMs);
    stages.splice(MAX_STAGE_COUNT);
  }
  return Object.freeze({
    durationSeconds: round(full.durationMs / 1000, 1),
    sampledFrames: full.frames,
    framesPerSecond: round(full.fps, 2),
    frameTimeMs,
    cpuTimeMs,
    longFramePercent: round(
      monitor.profiledFrameIntervalsMs.filter((value) => value > 50).length * 100 /
        monitor.profiledFrameIntervalsMs.length,
      1
    ),
    stages: Object.freeze(stages.map((stage) => Object.freeze(stage)))
  });
}

function bucketRate(buckets, requestedDurationMs) {
  let durationMs = 0;
  let frames = 0;
  for (let index = buckets.length - 1; index >= 0 && durationMs < requestedDurationMs; index -= 1) {
    durationMs += buckets[index].durationMs;
    frames += buckets[index].frames;
  }
  return {
    durationMs,
    frames,
    fps: durationMs > 0 ? frames * 1000 / durationMs : Infinity
  };
}

function trimBuckets(monitor) {
  const maximumDurationMs = monitor.durationMs + SAMPLE_BUCKET_MS * 2;
  let durationMs = monitor.buckets.reduce((sum, bucket) => sum + bucket.durationMs, 0);
  while (monitor.buckets.length > 1 && durationMs - monitor.buckets[0].durationMs >= maximumDurationMs) {
    durationMs -= monitor.buckets.shift().durationMs;
  }
}

function resetCandidate(monitor, nowMs = null) {
  monitor.previousFrameAtMs = nowMs;
  monitor.bucketStartedAtMs = nowMs;
  monitor.bucketFrames = 0;
  monitor.buckets = [];
  monitor.currentFrameIntervalMs = null;
  monitor.reportPending = false;
  clearProfile(monitor);
}

function clearProfile(monitor) {
  monitor.profiling = false;
  monitor.profiledFrameIntervalsMs = [];
  monitor.profiledCpuMs = [];
  monitor.stageTotalsMs = {};
  monitor.stageMaximumMs = {};
}

function distribution(values) {
  const sorted = [...values].sort((left, right) => left - right);
  const total = sorted.reduce((sum, value) => sum + value, 0);
  return Object.freeze({
    mean: round(total / sorted.length, 2),
    p50: round(percentile(sorted, 0.5), 2),
    p95: round(percentile(sorted, 0.95), 2),
    max: round(sorted.at(-1), 2)
  });
}

function percentile(sorted, ratio) {
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1))];
}

function round(value, digits) {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function validateMonitor(monitor) {
  if (!monitor || !Number.isFinite(monitor.thresholdFps) || !Number.isFinite(monitor.durationMs) ||
      !Array.isArray(monitor.buckets) || !Array.isArray(monitor.profiledFrameIntervalsMs) ||
      !Array.isArray(monitor.profiledCpuMs) || typeof monitor.profiling !== "boolean" ||
      typeof monitor.reported !== "boolean") {
    throw new Error("Invalid persistent low-frame-rate monitor");
  }
}
