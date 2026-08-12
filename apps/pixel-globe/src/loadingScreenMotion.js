import { responsiveLogicalViewport } from "./responsiveViewport.js";

export const LOADING_CAPSULE_WIDTH = 1232;
export const LOADING_CAPSULE_HEIGHT = 706;
export const LOADING_CAPSULE_HORIZON_Y = 366;

const LOADING_WAVE_MIN_AMPLITUDE_PX = 0.65;
const LOADING_WAVE_MAX_AMPLITUDE_PX = 8;
const LOADING_WAVE_ROW_FREQUENCY = 0.24;
const LOADING_WAVE_TIME_FREQUENCY = 0.00135;
const LOADING_SHIP_BASE_Y_PX = 2;
const LOADING_SHIP_BOB_AMPLITUDE_PX = 2.5;

export function loadingScreenRenderSize(viewportWidth, viewportHeight) {
  assertPositiveDimension(viewportWidth, "viewport width");
  assertPositiveDimension(viewportHeight, "viewport height");
  return Object.freeze(responsiveLogicalViewport({ viewportWidth, viewportHeight }));
}

export function loadingScreenCoverCrop(
  viewportWidth,
  viewportHeight,
  sourceWidth = LOADING_CAPSULE_WIDTH,
  sourceHeight = LOADING_CAPSULE_HEIGHT
) {
  assertPositiveDimension(viewportWidth, "viewport width");
  assertPositiveDimension(viewportHeight, "viewport height");
  assertPositiveDimension(sourceWidth, "source width");
  assertPositiveDimension(sourceHeight, "source height");
  const viewportAspect = viewportWidth / viewportHeight;
  const sourceAspect = sourceWidth / sourceHeight;
  if (viewportAspect >= sourceAspect) {
    const height = sourceWidth / viewportAspect;
    return Object.freeze({
      x: 0,
      y: (sourceHeight - height) / 2,
      width: sourceWidth,
      height
    });
  }
  const width = sourceHeight * viewportAspect;
  return Object.freeze({
    x: (sourceWidth - width) / 2,
    y: 0,
    width,
    height: sourceHeight
  });
}

export function loadingScreenForegroundLayout(
  viewportWidth,
  viewportHeight,
  sourceWidth = LOADING_CAPSULE_WIDTH,
  sourceHeight = LOADING_CAPSULE_HEIGHT,
  sourceHorizonY = LOADING_CAPSULE_HORIZON_Y
) {
  assertPositiveDimension(viewportWidth, "viewport width");
  assertPositiveDimension(viewportHeight, "viewport height");
  assertPositiveDimension(sourceWidth, "source width");
  assertPositiveDimension(sourceHeight, "source height");
  if (!Number.isFinite(sourceHorizonY) || sourceHorizonY < 0 || sourceHorizonY > sourceHeight) {
    throw new Error(`Loading screen source horizon is outside the artwork: ${sourceHorizonY}`);
  }
  const environmentCrop = loadingScreenCoverCrop(
    viewportWidth,
    viewportHeight,
    sourceWidth,
    sourceHeight
  );
  const horizonY =
    (sourceHorizonY - environmentCrop.y) *
    viewportHeight /
    environmentCrop.height;
  const scale = viewportWidth / sourceWidth;
  return Object.freeze({
    x: 0,
    y: horizonY - sourceHorizonY * scale,
    width: viewportWidth,
    height: sourceHeight * scale,
    horizonY
  });
}

export function loadingWaveAmplitude(sourceY) {
  if (!Number.isFinite(sourceY)) throw new Error(`Loading wave row must be finite, got ${sourceY}`);
  if (sourceY < LOADING_CAPSULE_HORIZON_Y) return 0;
  const depth = clamp01(
    (sourceY - LOADING_CAPSULE_HORIZON_Y) /
    (LOADING_CAPSULE_HEIGHT - 1 - LOADING_CAPSULE_HORIZON_Y)
  );
  return LOADING_WAVE_MIN_AMPLITUDE_PX +
    (LOADING_WAVE_MAX_AMPLITUDE_PX - LOADING_WAVE_MIN_AMPLITUDE_PX) * depth ** 1.65;
}

export function loadingWaveOffset(sourceY, elapsedMs) {
  if (!Number.isFinite(elapsedMs)) throw new Error(`Loading animation time must be finite, got ${elapsedMs}`);
  const amplitude = loadingWaveAmplitude(sourceY);
  if (amplitude === 0) return 0;
  const phase = sourceY * LOADING_WAVE_ROW_FREQUENCY + elapsedMs * LOADING_WAVE_TIME_FREQUENCY;
  return Math.sin(phase) * amplitude;
}

export function loadingLayerMotion(elapsedMs, reducedMotion = false) {
  if (!Number.isFinite(elapsedMs)) throw new Error(`Loading animation time must be finite, got ${elapsedMs}`);
  if (reducedMotion) {
    return Object.freeze({ upperTextY: 0, lowerTextY: 0, shipY: LOADING_SHIP_BASE_Y_PX });
  }
  const upperProgress = easeOutCubic((elapsedMs - 90) / 720);
  const lowerProgress = easeOutCubic((elapsedMs - 250) / 760);
  return Object.freeze({
    upperTextY: upperProgress === 1 ? 0 : -250 * (1 - upperProgress),
    lowerTextY: lowerProgress === 1 ? 0 : 270 * (1 - lowerProgress),
    shipY: LOADING_SHIP_BASE_Y_PX +
      Math.sin(elapsedMs * Math.PI * 2 / 3400) * LOADING_SHIP_BOB_AMPLITUDE_PX
  });
}

function easeOutCubic(value) {
  const x = clamp01(value);
  return 1 - (1 - x) ** 3;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function assertPositiveDimension(value, label) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`Loading screen ${label} must be positive, got ${value}`);
  }
}
