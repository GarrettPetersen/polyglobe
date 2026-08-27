export const WORLD_OBJECTIVE_SCAN_INTERVAL_MS = 100;

export function worldObjectiveScanIsDue(previousScanAtMs, nowMs) {
  if (previousScanAtMs !== null && (!Number.isFinite(previousScanAtMs) || previousScanAtMs < 0)) {
    throw new Error(`Invalid previous world-objective scan time: ${previousScanAtMs}`);
  }
  if (!Number.isFinite(nowMs) || nowMs < 0) {
    throw new Error(`Invalid current world-objective scan time: ${nowMs}`);
  }
  if (previousScanAtMs !== null && nowMs < previousScanAtMs) {
    throw new Error(`World-objective scan time moved backward: ${nowMs} < ${previousScanAtMs}`);
  }
  return previousScanAtMs === null ||
    nowMs - previousScanAtMs >= WORLD_OBJECTIVE_SCAN_INTERVAL_MS;
}
