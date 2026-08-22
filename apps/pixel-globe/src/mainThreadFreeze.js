export const MAIN_THREAD_FREEZE_THRESHOLD_MS = 1_000;
export const MAIN_THREAD_FREEZE_MAX_GAP_MS = 30_000;

const MIN_ATTRIBUTABLE_WORK_MS = 100;

export function createMainThreadFreezeMonitor() {
  return {
    previousFrameAtMs: null,
    previousFrameCpuMs: 0,
    recentWork: null
  };
}

export function beginMainThreadFreezeFrame(monitor, nowMs, { eligible = true } = {}) {
  validateMonitor(monitor);
  if (!Number.isFinite(nowMs) || nowMs < 0 || typeof eligible !== "boolean") {
    throw new Error("Main-thread freeze monitor requires valid frame timing and eligibility");
  }
  if (!eligible) {
    suspendMainThreadFreezeMonitor(monitor);
    return null;
  }
  if (monitor.previousFrameAtMs === null) {
    monitor.previousFrameAtMs = nowMs;
    monitor.recentWork = null;
    return null;
  }
  if (nowMs < monitor.previousFrameAtMs) {
    throw new Error(`Main-thread freeze clock moved backwards: ${nowMs} < ${monitor.previousFrameAtMs}`);
  }

  const previousFrameAtMs = monitor.previousFrameAtMs;
  const gapMs = nowMs - previousFrameAtMs;
  const recordedWork = monitor.recentWork;
  monitor.previousFrameAtMs = nowMs;
  monitor.recentWork = null;
  if (gapMs < MAIN_THREAD_FREEZE_THRESHOLD_MS) return null;
  if (gapMs > MAIN_THREAD_FREEZE_MAX_GAP_MS) {
    monitor.previousFrameCpuMs = 0;
    monitor.recentWork = null;
    return null;
  }

  const previousFrameCpuMs = Math.min(gapMs, monitor.previousFrameCpuMs);
  const recentWork = workInsideGap(recordedWork, previousFrameAtMs, nowMs);
  const attributedWork = recentWork && recentWork.durationMs >= Math.max(
    MIN_ATTRIBUTABLE_WORK_MS,
    gapMs * 0.2
  ) ? recentWork : null;
  const frameWork = previousFrameCpuMs >= gapMs * 0.5;
  // A long scheduler delay with no measured work is the browser, OS, or a
  // suspended VM withholding the animation callback. It is not an actionable
  // game freeze and reporting it obscures the frames that actually ran long.
  if (!attributedWork && !frameWork) return null;
  const cause = attributedWork?.name || "frame-work";
  return Object.freeze({
    gapMs: round(gapMs),
    previousFrameCpuMs: round(previousFrameCpuMs),
    schedulerDelayMs: round(Math.max(0, gapMs - previousFrameCpuMs)),
    cause,
    recentWork: attributedWork?.name || "none",
    recentWorkMs: round(attributedWork?.durationMs || 0)
  });
}

export function finishMainThreadFreezeFrame(monitor, cpuMs) {
  validateMonitor(monitor);
  if (!Number.isFinite(cpuMs) || cpuMs < 0) {
    throw new Error(`Invalid main-thread frame CPU duration: ${cpuMs}`);
  }
  monitor.previousFrameCpuMs = cpuMs;
}

export function recordMainThreadWork(monitor, name, durationMs, completedAtMs) {
  validateMonitor(monitor);
  if (typeof name !== "string" || name === "" || name.length > 80 ||
      !Number.isFinite(durationMs) || durationMs < 0 ||
      !Number.isFinite(completedAtMs) || completedAtMs < 0) {
    throw new Error("Main-thread freeze work requires a bounded name, duration, and completion time");
  }
  const current = monitor.recentWork;
  if (current === null || durationMs > current.durationMs) {
    monitor.recentWork = { name, durationMs, completedAtMs };
  }
}

export function suspendMainThreadFreezeMonitor(monitor) {
  validateMonitor(monitor);
  monitor.previousFrameAtMs = null;
  monitor.previousFrameCpuMs = 0;
  monitor.recentWork = null;
}

function workInsideGap(work, startedAtMs, endedAtMs) {
  return work && work.completedAtMs >= startedAtMs && work.completedAtMs <= endedAtMs
    ? work
    : null;
}

function round(value) {
  return Math.round(value * 10) / 10;
}

function validateMonitor(monitor) {
  if (!monitor || !(monitor.previousFrameAtMs === null || Number.isFinite(monitor.previousFrameAtMs)) ||
      !Number.isFinite(monitor.previousFrameCpuMs) ||
      !(monitor.recentWork === null || typeof monitor.recentWork === "object")) {
    throw new Error("Invalid main-thread freeze monitor");
  }
}
