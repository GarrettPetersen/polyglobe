// This protects collision and integration stability; it is not a clock source.
export const MAX_SIMULATION_FRAME_SECONDS = 0.05;

export function elapsedRealSeconds(previousFrameMs, currentFrameMs) {
  assertFrameTimestamp(previousFrameMs, "previous frame");
  assertFrameTimestamp(currentFrameMs, "current frame");
  if (currentFrameMs < previousFrameMs) {
    throw new Error(`Frame time moved backwards: ${currentFrameMs} < ${previousFrameMs}`);
  }
  return (currentFrameMs - previousFrameMs) / 1000;
}

export function elapsedAnimationFrameSeconds(
  previousFrameMs,
  currentFrameMs,
  { synchronize = false } = {}
) {
  assertFrameTimestamp(previousFrameMs, "previous frame");
  assertFrameTimestamp(currentFrameMs, "current frame");
  if (typeof synchronize !== "boolean") {
    throw new Error(`Invalid animation-frame synchronization state: ${synchronize}`);
  }
  // A requestAnimationFrame timestamp may precede performance.now() sampled
  // before the callback. Synchronizing once keeps both sides in the rAF clock domain.
  if (synchronize) return 0;
  return elapsedRealSeconds(previousFrameMs, currentFrameMs);
}

export function boundedSimulationSeconds(realSeconds) {
  if (!Number.isFinite(realSeconds) || realSeconds < 0) {
    throw new Error(`Invalid real frame duration: ${realSeconds}`);
  }
  return Math.min(realSeconds, MAX_SIMULATION_FRAME_SECONDS);
}

function assertFrameTimestamp(value, label) {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`Invalid ${label} timestamp: ${value}`);
  }
}
