export const DEFAULT_GAME_FRAME_HZ = 60;

export function advanceFrameCadence({
  nowMs,
  nextFrameMs,
  targetHz = DEFAULT_GAME_FRAME_HZ,
  toleranceMs = 0.75,
  bypass = false
}) {
  if (!Number.isFinite(nowMs) || !Number.isFinite(targetHz) || targetHz <= 0 ||
      !Number.isFinite(toleranceMs) || toleranceMs < 0 ||
      (nextFrameMs !== null && !Number.isFinite(nextFrameMs)) ||
      typeof bypass !== "boolean") {
    throw new Error("Frame cadence requires valid timing values");
  }
  const intervalMs = 1000 / targetHz;
  if (bypass || nextFrameMs === null || nowMs + toleranceMs >= nextFrameMs) {
    const scheduledMs = nextFrameMs === null || nowMs - nextFrameMs > intervalMs
      ? nowMs + intervalMs
      : nextFrameMs + intervalMs;
    return Object.freeze({ run: true, nextFrameMs: scheduledMs });
  }
  return Object.freeze({ run: false, nextFrameMs });
}
