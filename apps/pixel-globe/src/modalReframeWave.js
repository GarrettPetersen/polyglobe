export const MODAL_REFRAME_WAVE_DURATION_MS = 2200;
export const MODAL_REFRAME_WAVE_BAND_PX = 44;

export function createModalReframeWave({ startedAtMs, viewportWidth, viewportHeight }) {
  if (!Number.isFinite(startedAtMs)) {
    throw new Error(`Modal reframe wave requires a finite start time: ${startedAtMs}`);
  }
  for (const [label, value] of Object.entries({ viewportWidth, viewportHeight })) {
    if (!Number.isInteger(value) || value <= 0) {
      throw new Error(`Modal reframe wave requires a positive integer ${label}: ${value}`);
    }
  }
  return Object.freeze({ startedAtMs, viewportWidth, viewportHeight });
}

export function modalReframeWaveFrame(wave, nowMs) {
  validateWave(wave);
  if (!Number.isFinite(nowMs)) throw new Error(`Modal reframe wave requires a finite frame time: ${nowMs}`);
  const progress = clamp((nowMs - wave.startedAtMs) / MODAL_REFRAME_WAVE_DURATION_MS, 0, 1);
  const start = -MODAL_REFRAME_WAVE_BAND_PX;
  const end = wave.viewportWidth + wave.viewportHeight + MODAL_REFRAME_WAVE_BAND_PX;
  return Object.freeze({
    bandWidthPx: MODAL_REFRAME_WAVE_BAND_PX,
    complete: progress >= 1,
    frontPx: Math.round(start + smootherstep(progress) * (end - start))
  });
}

export function modalReframeScreenProgress(frame, screenPosition) {
  validateFrame(frame);
  validatePoint(screenPosition, "screen");
  return smootherstep(clamp(
    (frame.frontPx - screenPosition.x - screenPosition.y) / frame.bandWidthPx,
    0,
    1
  ));
}

export function modalReframeTileMotion({ oldPosition, newPosition, fallbackOffset = null }) {
  validatePoint(newPosition, "new");
  if (oldPosition !== null) validatePoint(oldPosition, "old");
  if (fallbackOffset !== null) validatePoint(fallbackOffset, "fallback offset");
  if (oldPosition === null && fallbackOffset === null) {
    throw new Error("Modal reframe tile motion needs an old position or fallback offset");
  }
  const offsetX = oldPosition === null
    ? fallbackOffset.x
    : oldPosition.x - newPosition.x;
  const offsetY = oldPosition === null
    ? fallbackOffset.y
    : oldPosition.y - newPosition.y;
  return Object.freeze([
    Math.round(offsetX),
    Math.round(offsetY),
    Math.round(newPosition.x + newPosition.y)
  ]);
}

function validateWave(wave) {
  if (!wave || !Number.isFinite(wave.startedAtMs) ||
      !Number.isInteger(wave.viewportWidth) || wave.viewportWidth <= 0 ||
      !Number.isInteger(wave.viewportHeight) || wave.viewportHeight <= 0) {
    throw new Error("Invalid modal reframe wave");
  }
}

function validateFrame(frame) {
  if (!frame || !Number.isFinite(frame.frontPx) ||
      !Number.isFinite(frame.bandWidthPx) || frame.bandWidthPx <= 0) {
    throw new Error("Invalid modal reframe wave frame");
  }
}

function validatePoint(point, label) {
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    throw new Error(`Modal reframe tile motion requires a finite ${label} point`);
  }
}

function smootherstep(value) {
  return value * value * value * (value * (value * 6 - 15) + 10);
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}
