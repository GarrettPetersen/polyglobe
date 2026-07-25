export function createFrameRateMeter(sampleWindowMs = 500) {
  if (!Number.isFinite(sampleWindowMs) || sampleWindowMs <= 0) {
    throw new Error(`Invalid frame-rate sample window: ${sampleWindowMs}`);
  }
  return {
    sampleWindowMs,
    windowStartMs: null,
    frameCount: 0,
    framesPerSecond: null
  };
}

export function sampleFrameRate(meter, nowMs) {
  validateFrameRateMeter(meter);
  if (!Number.isFinite(nowMs) || nowMs < 0) {
    throw new Error(`Invalid frame-rate sample time: ${nowMs}`);
  }
  if (meter.windowStartMs === null) {
    meter.windowStartMs = nowMs;
    meter.frameCount = 0;
    return false;
  }
  if (nowMs < meter.windowStartMs) {
    throw new Error(`Frame-rate sample time moved backwards: ${nowMs} < ${meter.windowStartMs}`);
  }
  meter.frameCount += 1;
  const elapsedMs = nowMs - meter.windowStartMs;
  if (elapsedMs < meter.sampleWindowMs) return false;
  meter.framesPerSecond = meter.frameCount * 1000 / elapsedMs;
  meter.windowStartMs = nowMs;
  meter.frameCount = 0;
  return true;
}

export function resetFrameRateMeter(meter) {
  validateFrameRateMeter(meter);
  meter.windowStartMs = null;
  meter.frameCount = 0;
  meter.framesPerSecond = null;
  return meter;
}

export function isFrameRateToggleKey(event) {
  if (!event || typeof event !== "object") throw new Error("Frame-rate toggle requires a keyboard event");
  return !event.metaKey &&
    !event.ctrlKey &&
    !event.altKey &&
    (event.key === "~" || (event.code === "Backquote" && event.shiftKey === true));
}

function validateFrameRateMeter(meter) {
  if (!meter || !Number.isFinite(meter.sampleWindowMs) || meter.sampleWindowMs <= 0 ||
      (meter.windowStartMs !== null && (!Number.isFinite(meter.windowStartMs) || meter.windowStartMs < 0)) ||
      !Number.isInteger(meter.frameCount) || meter.frameCount < 0 ||
      (meter.framesPerSecond !== null &&
        (!Number.isFinite(meter.framesPerSecond) || meter.framesPerSecond < 0))) {
    throw new Error("Invalid frame-rate meter");
  }
}
