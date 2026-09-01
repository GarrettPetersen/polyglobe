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
