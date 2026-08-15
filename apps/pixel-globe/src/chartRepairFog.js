import { fogLayerRgba } from "./stormPresentation.js";
import { PERMANENT_POLAR_CAP_LATITUDE_DEG } from "./polarChartPresentation.js";

export const CHART_FOG_REDRAW_CONCEALMENT = 0.82;
const POLAR_REPAIR_FOG_RELEASE_LATITUDE_DEG = 54;
const POLAR_REPAIR_FOG_CLEAR_LATITUDE_DEG = 42;

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
  const formationDurationMs = 100_000;
  const holdDurationMs = 8_000;
  const clearingDurationMs = 120_000;
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
  focusY,
  repairPressure = 0
}) {
  for (const [label, value] of Object.entries({
    latitudeDeg,
    viewportWidth,
    viewportHeight,
    focusX,
    focusY,
    repairPressure
  })) {
    if (!Number.isFinite(value)) throw new Error(`Polar chart fog has invalid ${label}`);
  }
  const polarAmount = smoothstep(
    58,
    PERMANENT_POLAR_CAP_LATITUDE_DEG,
    Math.abs(latitudeDeg)
  );
  if (repairPressure < 0 || repairPressure > 1) {
    throw new Error(`Polar chart fog has invalid repair pressure: ${repairPressure}`);
  }
  // Repair pressure may carry an existing polar bank a little farther toward
  // temperate water while its concealed geometry finishes settling. It may
  // never originate in an otherwise implausible climate.
  const inheritedRepairFog = repairPressure * smoothstep(
    POLAR_REPAIR_FOG_CLEAR_LATITUDE_DEG,
    POLAR_REPAIR_FOG_RELEASE_LATITUDE_DEG,
    Math.abs(latitudeDeg)
  );
  if (polarAmount <= 0 && inheritedRepairFog <= 0) return null;
  const maximumClearRadius = Math.max(
    Math.hypot(focusX, focusY),
    Math.hypot(viewportWidth - focusX, focusY),
    Math.hypot(focusX, viewportHeight - focusY),
    Math.hypot(viewportWidth - focusX, viewportHeight - focusY)
  ) + 30;
  const minimumDimension = Math.min(viewportWidth, viewportHeight);
  const naturalMinimumClearRadius = Math.max(62, minimumDimension * 0.43);
  // Under severe chart pressure, polar fog acts like a tighter camera crop:
  // only the ship's immediate navigational neighborhood remains fixed while
  // the concealed ring converges on the exact north-up projection.
  // Keep the ship tile and its six immediate neighbors visible. That tiny
  // rigid patch is enough for navigation, while every tile beyond it can
  // settle iteratively as it enters the fog.
  const repairMinimumClearRadius = Math.max(28, minimumDimension * 0.11);
  const minimumClearRadius = naturalMinimumClearRadius +
    (repairMinimumClearRadius - naturalMinimumClearRadius) * repairPressure;
  const effectiveConcealment = Math.max(polarAmount, inheritedRepairFog);
  const clearRadius = maximumClearRadius +
    (minimumClearRadius - maximumClearRadius) * effectiveConcealment;
  return Object.freeze({
    progress: 1,
    concealment: effectiveConcealment,
    edgeOpacity: 1,
    focusX,
    focusY,
    clearRadius,
    fadeBandPx: 24,
    raggednessPx: 10,
    denseFogRadius: clearRadius + 34,
    repairReady: true,
    finished: false,
    polarAmount,
    repairPressure
  });
}

export function nextPolarChartRepairPressure({
  currentPressure,
  latitudeDeg,
  drift,
  terrainTear,
  elapsedSeconds
}) {
  if (!drift || !terrainTear) {
    throw new Error("Polar chart repair pressure requires drift and terrain metrics");
  }
  const terrainCompressionPx = terrainTear.compressionPx ?? 0;
  for (const [label, value] of Object.entries({
    currentPressure,
    latitudeDeg,
    elapsedSeconds,
    rotationDeg: drift.rotationDeg,
    terrainTearPx: terrainTear.extraPx,
    terrainCompressionPx
  })) {
    if (!Number.isFinite(value)) {
      throw new Error(`Polar chart repair pressure has invalid ${label}: ${value}`);
    }
  }
  if (currentPressure < 0 || currentPressure > 1) {
    throw new Error(`Polar chart repair pressure must be in 0..1: ${currentPressure}`);
  }
  const rotationPressure = Math.min(1, Math.abs(drift.rotationDeg) / 6);
  const tearPressure = Math.min(1, Math.max(
    terrainTear.extraPx,
    terrainCompressionPx
  ) / 18);
  const latitudePressure = smoothstep(
    58,
    PERMANENT_POLAR_CAP_LATITUDE_DEG,
    Math.abs(latitudeDeg)
  );
  const polarRepairEligible = Math.abs(latitudeDeg) > 58 || (
    currentPressure > 0 &&
    Math.abs(latitudeDeg) >= POLAR_REPAIR_FOG_RELEASE_LATITUDE_DEG
  );
  const target = polarRepairEligible
    ? Math.max(latitudePressure, rotationPressure, tearPressure)
    : 0;
  // Natural polar fog is already visible cover. Preserve that displayed
  // concealment as repair pressure before the ship sails toward clearer
  // latitudes, otherwise the bank can retreat faster than its hidden tiles
  // settle and reveal an unfinished chart.
  const effectiveCurrentPressure = Math.max(currentPressure, latitudePressure);
  const severeDistortion = Math.max(rotationPressure, tearPressure) >= 0.75;
  if (elapsedSeconds < 0) {
    throw new Error(`Polar chart repair pressure elapsed time cannot be negative: ${elapsedSeconds}`);
  }
  const ratePerSecond = target > effectiveCurrentPressure
    ? severeDistortion ? 0.045 : 0.014
    : 0.01;
  const maximumStep = ratePerSecond * elapsedSeconds;
  return effectiveCurrentPressure + Math.max(
    -maximumStep,
    Math.min(maximumStep, target - effectiveCurrentPressure)
  );
}

export function chartRepairPressureDrift(visibleDrift, completeDrift) {
  if (!visibleDrift || !completeDrift) {
    throw new Error("Chart repair pressure requires visible and complete drift metrics");
  }
  for (const [label, drift] of Object.entries({ visibleDrift, completeDrift })) {
    if (!Number.isFinite(drift.rotationDeg)) {
      throw new Error(`Chart repair pressure has invalid ${label} rotation`);
    }
  }
  return Math.abs(visibleDrift.rotationDeg) >= Math.abs(completeDrift.rotationDeg)
    ? visibleDrift
    : completeDrift;
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

export function chartFogConcealsCircleForRepair(frame, x, y, radius = 0) {
  if (!frame) return false;
  for (const [label, value] of Object.entries({ x, y, radius })) {
    if (!Number.isFinite(value)) throw new Error(`Chart fog repair coverage has invalid ${label}`);
  }
  if (radius < 0) {
    throw new Error(`Chart fog repair coverage radius cannot be negative: ${radius}`);
  }
  if (frame.repairReady !== true) return false;
  if (
    !Number.isFinite(frame.clearRadius) ||
    !Number.isFinite(frame.raggednessPx) ||
    frame.raggednessPx < 0
  ) {
    throw new Error("Chart fog repair coverage requires valid fog geometry");
  }
  // Full-opacity fog can replace a tile immediately. The visible, ragged fog
  // band can still conceal a one-pixel interpolation step, so it should not
  // wait for the whole fade band to become dense before repairing the chart.
  // The tile may remain partially legible at this boundary, which is why the
  // caller must interpolate rather than replace it. Requiring its full visual
  // radius to enter the band made polar fog incapable of repairing landscape
  // viewports: a 42px tile could not fit between the clear center and screen.
  return Math.hypot(x - frame.focusX, y - frame.focusY) >=
    frame.clearRadius + frame.raggednessPx;
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
  const broad = (smoothFogNoise(x / 47, y / 47, 0x170f6a21) - 0.5) * 1.12;
  const middle = (smoothFogNoise(x / 23, y / 23, 0x5a19c3e7) - 0.5) * 0.58;
  const fine = (smoothFogNoise(x / 9, y / 9, 0x2c1b3c6d) - 0.5) * 0.24;
  return Math.max(-1, Math.min(1, broad + middle + fine));
}

function smoothFogNoise(x, y, seed) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = smoothstep01(x - x0);
  const ty = smoothstep01(y - y0);
  const top = lerp(
    fogNoise(x0, y0, seed),
    fogNoise(x0 + 1, y0, seed),
    tx
  );
  const bottom = lerp(
    fogNoise(x0, y0 + 1, seed),
    fogNoise(x0 + 1, y0 + 1, seed),
    tx
  );
  return lerp(top, bottom, ty);
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

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function fogNoise(x, y, seed = 0x464f4721) {
  let value = seed ^ Math.imul(x + 1, 0x9e3779b1) ^ Math.imul(y + 1, 0x85ebca6b);
  value = Math.imul(value ^ value >>> 16, 0x7feb352d);
  value = Math.imul(value ^ value >>> 15, 0x846ca68b);
  return ((value ^ value >>> 16) >>> 0) / 0xffffffff;
}
