export const CHART_SWELL_REPAIR_STALL_MS = 4_000;
export const CHART_SWELL_REPAIR_PROGRESS_PX = 1;

export function advanceChartSwellRepairProgress(progress, { nowMs, rmsDistortionPx }) {
  if (!Number.isFinite(nowMs) || nowMs < 0 ||
      !Number.isFinite(rmsDistortionPx) || rmsDistortionPx < 0) {
    throw new Error("Chart swell progress requires valid time and RMS distortion");
  }
  if (progress === null) {
    return Object.freeze({
      progress: Object.freeze({
        bestRmsDistortionPx: rmsDistortionPx,
        lastProgressAtMs: nowMs
      }),
      stalled: false
    });
  }
  if (!Number.isFinite(progress.bestRmsDistortionPx) ||
      !Number.isFinite(progress.lastProgressAtMs) || progress.lastProgressAtMs > nowMs) {
    throw new Error("Chart swell progress state is invalid");
  }
  const improved = rmsDistortionPx <=
    progress.bestRmsDistortionPx - CHART_SWELL_REPAIR_PROGRESS_PX;
  const nextProgress = improved
    ? Object.freeze({
        bestRmsDistortionPx: rmsDistortionPx,
        lastProgressAtMs: nowMs
      })
    : progress;
  return Object.freeze({
    progress: nextProgress,
    stalled: nowMs - nextProgress.lastProgressAtMs >= CHART_SWELL_REPAIR_STALL_MS
  });
}
