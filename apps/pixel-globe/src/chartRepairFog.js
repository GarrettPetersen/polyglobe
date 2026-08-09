import { fogLayerRgba } from "./stormPresentation.js";
import { PERMANENT_POLAR_CAP_LATITUDE_DEG } from "./polarChartPresentation.js";

export const CHART_FOG_REDRAW_CONCEALMENT = 0.82;

export function createChartRepairFog({
  nowMs,
  viewportWidth,
  viewportHeight,
  focusX,
  focusY
}) {
  for (const [label, value] of Object.entries({
    nowMs,
    viewportWidth,
    viewportHeight,
    focusX,
    focusY
  })) {
    if (!Number.isFinite(value)) throw new Error(`Chart repair fog has invalid ${label}`);
  }
  if (viewportWidth <= 0 || viewportHeight <= 0) {
    throw new Error("Chart repair fog requires a non-empty viewport");
  }
  const fadeBandPx = 42;
  const maximumClearRadius = Math.max(
    Math.hypot(focusX, focusY),
    Math.hypot(viewportWidth - focusX, focusY),
    Math.hypot(focusX, viewportHeight - focusY),
    Math.hypot(viewportWidth - focusX, viewportHeight - focusY)
  ) + fadeBandPx;
  const formationDurationMs = 60_000;
  const holdDurationMs = 2_400;
  const clearingDurationMs = 50_000;
  return Object.freeze({
    startedAtMs: nowMs,
    durationMs: formationDurationMs + holdDurationMs + clearingDurationMs,
    formationDurationMs,
    holdDurationMs,
    clearingDurationMs,
    viewportWidth,
    viewportHeight,
    focusX,
    focusY,
    minimumClearRadius: Math.max(42, Math.min(viewportWidth, viewportHeight) * 0.18),
    fadeBandPx,
    maximumClearRadius
  });
}

export function chartRepairFogFrame(fog, nowMs, release = null) {
  if (!fog || !Number.isFinite(nowMs)) {
    throw new Error("Chart repair fog frame requires state and time");
  }
  if (release !== null && (
    !Number.isFinite(release.startedAtMs) ||
    !Number.isFinite(release.startLevel) ||
    release.startLevel < 0 ||
    release.startLevel > 1
  )) {
    throw new Error("Chart repair fog release requires a valid start time and level");
  }
  const elapsedMs = Math.max(0, nowMs - fog.startedAtMs);
  const automaticReleaseAtMs = fog.formationDurationMs + fog.holdDurationMs;
  let concealment;
  let finished = false;
  if (release) {
    const releaseProgress = clamp01((nowMs - release.startedAtMs) / fog.clearingDurationMs);
    concealment = release.startLevel * (1 - smoothstep01(releaseProgress));
    finished = releaseProgress >= 1;
  } else if (elapsedMs <= automaticReleaseAtMs) {
    concealment = smoothstep01(elapsedMs / fog.formationDurationMs);
  } else {
    const releaseProgress = clamp01(
      (elapsedMs - automaticReleaseAtMs) / fog.clearingDurationMs
    );
    concealment = 1 - smoothstep01(releaseProgress);
    finished = releaseProgress >= 1;
  }
  const edgeOpacity = concealment;
  const clearRadius = fog.maximumClearRadius +
    (fog.minimumClearRadius - fog.maximumClearRadius) * concealment;
  return Object.freeze({
    progress: clamp01(elapsedMs / fog.durationMs),
    concealment,
    edgeOpacity,
    focusX: fog.focusX,
    focusY: fog.focusY,
    clearRadius,
    fadeBandPx: fog.fadeBandPx,
    raggednessPx: 13,
    denseFogRadius: clearRadius + fog.fadeBandPx + 13,
    repairReady: edgeOpacity >= CHART_FOG_REDRAW_CONCEALMENT && !finished,
    finished
  });
}

export function chartRepairFogWindPresence(frame) {
  if (!frame || !Number.isFinite(frame.concealment)) {
    throw new Error("Chart repair fog wind requires a valid fog frame");
  }
  if (frame.concealment < 0 || frame.concealment > 1) {
    throw new Error(`Chart repair fog wind has invalid concealment: ${frame.concealment}`);
  }
  return smoothstep(0.06, 1, frame.concealment);
}

export function polarChartFogFrame({
  latitudeDeg,
  viewportWidth,
  viewportHeight,
  focusX,
  focusY
}) {
  for (const [label, value] of Object.entries({
    latitudeDeg,
    viewportWidth,
    viewportHeight,
    focusX,
    focusY
  })) {
    if (!Number.isFinite(value)) throw new Error(`Polar chart fog has invalid ${label}`);
  }
  const polarAmount = smoothstep(
    58,
    PERMANENT_POLAR_CAP_LATITUDE_DEG,
    Math.abs(latitudeDeg)
  );
  if (polarAmount <= 0) return null;
  const maximumClearRadius = Math.max(
    Math.hypot(focusX, focusY),
    Math.hypot(viewportWidth - focusX, focusY),
    Math.hypot(focusX, viewportHeight - focusY),
    Math.hypot(viewportWidth - focusX, viewportHeight - focusY)
  ) + 30;
  const minimumDimension = Math.min(viewportWidth, viewportHeight);
  const minimumClearRadius = Math.max(62, minimumDimension * 0.43);
  const clearRadius = maximumClearRadius +
    (minimumClearRadius - maximumClearRadius) * polarAmount;
  return Object.freeze({
    progress: 1,
    concealment: polarAmount,
    edgeOpacity: 1,
    focusX,
    focusY,
    clearRadius,
    fadeBandPx: 24,
    raggednessPx: 10,
    denseFogRadius: clearRadius + 34,
    repairReady: true,
    finished: false,
    polarAmount
  });
}

export function chartFogObscuresCircle(frame, x, y, radius = 0) {
  if (!frame) return false;
  for (const [label, value] of Object.entries({ x, y, radius })) {
    if (!Number.isFinite(value)) throw new Error(`Chart fog coverage has invalid ${label}`);
  }
  if (radius < 0) throw new Error(`Chart fog coverage radius cannot be negative: ${radius}`);
  if (!Number.isFinite(frame.edgeOpacity) || frame.edgeOpacity < 0 || frame.edgeOpacity > 1) {
    throw new Error(`Chart fog coverage has invalid edge opacity: ${frame.edgeOpacity}`);
  }
  if (frame.edgeOpacity < CHART_FOG_REDRAW_CONCEALMENT) return false;
  return Math.hypot(x - frame.focusX, y - frame.focusY) - radius >= frame.denseFogRadius;
}

export function chartFogPixelDensity(frame, x, y) {
  if (!frame) throw new Error("Chart fog pixel density requires a frame");
  for (const [label, value] of Object.entries({
    x,
    y,
    focusX: frame.focusX,
    focusY: frame.focusY,
    clearRadius: frame.clearRadius,
    fadeBandPx: frame.fadeBandPx,
    raggednessPx: frame.raggednessPx
  })) {
    if (!Number.isFinite(value)) throw new Error(`Chart fog pixel density has invalid ${label}`);
  }
  if (frame.fadeBandPx <= 0 || frame.raggednessPx < 0) {
    throw new Error("Chart fog pixel density requires positive band geometry");
  }
  return chartFogPixelDensityUnchecked(frame, x, y);
}

export function createChartFogMaskField({ width, height, focusX, focusY, pixelSize }) {
  for (const [label, value] of Object.entries({ width, height, focusX, focusY, pixelSize })) {
    const integerRequired = label === "width" || label === "height" || label === "pixelSize";
    if (!Number.isFinite(value) || (integerRequired && !Number.isInteger(value))) {
      throw new Error(`Chart fog mask field has invalid ${label}: ${value}`);
    }
  }
  if (width <= 0 || height <= 0 || pixelSize <= 0) {
    throw new Error("Chart fog mask field requires positive geometry");
  }
  const distances = new Float32Array(width * height);
  const edgeUnits = new Float32Array(width * height);
  const fringeNoise = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const sampleX = x * pixelSize + pixelSize / 2;
      const sampleY = y * pixelSize + pixelSize / 2;
      const index = x + y * width;
      distances[index] = Math.hypot(sampleX - focusX, sampleY - focusY);
      edgeUnits[index] = chartFogEdgeUnit(sampleX, sampleY);
      fringeNoise[index] = fogNoise(sampleX, sampleY, 0x2c1b3c6d);
    }
  }
  return Object.freeze({
    width,
    height,
    focusX,
    focusY,
    pixelSize,
    distances,
    edgeUnits,
    fringeNoise
  });
}

export function fillChartFogMaskPixels(
  pixels,
  width,
  height,
  frame,
  pixelSize,
  field = null
) {
  if (!(pixels instanceof Uint8ClampedArray)) {
    throw new Error("Chart fog mask pixels must be Uint8ClampedArray data");
  }
  if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) {
    throw new Error(`Chart fog mask dimensions must be positive integers: ${width}x${height}`);
  }
  if (pixels.length !== width * height * 4) {
    throw new Error(`Chart fog mask length ${pixels.length} does not match ${width}x${height}`);
  }
  if (!Number.isInteger(pixelSize) || pixelSize <= 0) {
    throw new Error(`Chart fog mask pixel size must be positive: ${pixelSize}`);
  }
  chartFogPixelDensity(frame, frame.focusX, frame.focusY);
  if (field !== null && (
    field.width !== width ||
    field.height !== height ||
    field.pixelSize !== pixelSize ||
    field.focusX !== frame.focusX ||
    field.focusY !== frame.focusY ||
    field.distances?.length !== width * height ||
    field.edgeUnits?.length !== width * height ||
    field.fringeNoise?.length !== width * height
  )) {
    throw new Error("Chart fog mask field does not match the requested frame geometry");
  }
  pixels.fill(0);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = x + y * width;
      const density = field
        ? chartFogDensityFromField(frame, field, index)
        : chartFogPixelDensityUnchecked(
            frame,
            x * pixelSize + pixelSize / 2,
            y * pixelSize + pixelSize / 2
          );
      const color = fogLayerRgba(density);
      if (color[3] === 0) continue;
      const offset = index * 4;
      pixels[offset] = color[0];
      pixels[offset + 1] = color[1];
      pixels[offset + 2] = color[2];
      pixels[offset + 3] = color[3];
    }
  }
  return pixels;
}

function chartFogPixelDensityUnchecked(frame, x, y) {
  const dx = x - frame.focusX;
  const dy = y - frame.focusY;
  const edgeOffset = chartFogEdgeUnit(x, y) * frame.raggednessPx;
  const distance = Math.hypot(dx, dy);
  const density = fogBandDensity(frame, distance, edgeOffset);
  if (density <= 0) return 0;
  if (density < 0.24) {
    const coverage = density / 0.24;
    if (fogNoise(x, y, 0x2c1b3c6d) > coverage) return 0;
  }
  return Math.min(1, Math.ceil(density * 5) / 5);
}

function chartFogDensityFromField(frame, field, index) {
  const density = fogBandDensity(
    frame,
    field.distances[index],
    field.edgeUnits[index] * frame.raggednessPx
  );
  if (density <= 0) return 0;
  if (density < 0.24 && field.fringeNoise[index] > density / 0.24) return 0;
  return Math.min(1, Math.ceil(density * 5) / 5);
}

function fogBandDensity(frame, distance, edgeOffset) {
  return smoothstep01(
    (distance - frame.clearRadius - edgeOffset) / frame.fadeBandPx
  );
}

function chartFogEdgeUnit(x, y) {
  const broad = Math.sin(x * 0.041 + y * 0.019) * 0.48;
  const ripple = Math.sin(x * 0.113 - y * 0.067) * 0.24;
  const block = (fogNoise(Math.floor(x / 13), Math.floor(y / 13)) - 0.5) * 0.56;
  return broad + ripple + block;
}

function smoothstep(edge0, edge1, value) {
  const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return smoothstep01(t);
}

function smoothstep01(value) {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function fogNoise(x, y, seed = 0x464f4721) {
  let value = seed ^ Math.imul(x + 1, 0x9e3779b1) ^ Math.imul(y + 1, 0x85ebca6b);
  value = Math.imul(value ^ value >>> 16, 0x7feb352d);
  value = Math.imul(value ^ value >>> 15, 0x846ca68b);
  return ((value ^ value >>> 16) >>> 0) / 0xffffffff;
}
