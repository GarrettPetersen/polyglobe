export const NORTH_UP_POLE_TANGENT_EPSILON = 1e-6;
export const CHART_REFRAME_ROTATION_THRESHOLD_DEG = 1.5;
export const CHART_REFRAME_RMS_DISTORTION_THRESHOLD_PX = 1.5;
export const CHART_REFRAME_MAX_DISTORTION_THRESHOLD_PX = 4;
export const NORTH_UP_REBUILD_MAX_ROTATION_DEG = 0.75;
export const NORTH_UP_REBUILD_MAX_RMS_ERROR_PX = 0.75;
export const NORTH_UP_REBUILD_MAX_ERROR_PX = 1.5;

export function selectRepresentativeChartDriftCalls(calls, viewport) {
  if (!Array.isArray(calls)) throw new Error("Chart drift calls must be an array");
  const { viewX, viewY, halfWidth, halfHeight } = viewport || {};
  for (const [key, value] of Object.entries({ viewX, viewY, halfWidth, halfHeight })) {
    if (!Number.isFinite(value) || ((key === "halfWidth" || key === "halfHeight") && value <= 0)) {
      throw new Error(`Chart drift viewport has invalid ${key}`);
    }
  }

  const extrema = [
    { score: -Infinity, call: null },
    { score: -Infinity, call: null },
    { score: -Infinity, call: null },
    { score: -Infinity, call: null }
  ];
  for (const call of calls) {
    if (!Number.isInteger(call?.id) || !Number.isFinite(call.x) || !Number.isFinite(call.y)) {
      throw new Error("Chart drift call requires a tile id and finite position");
    }
    const localX = call.x - viewX;
    const localY = call.y - viewY;
    if (Math.abs(localX) > halfWidth || Math.abs(localY) > halfHeight) continue;
    const scores = [localX, -localX, localY, -localY];
    for (let index = 0; index < extrema.length; index++) {
      if (scores[index] > extrema[index].score) {
        extrema[index] = { score: scores[index], call };
      }
    }
  }

  const selected = [];
  const selectedIds = new Set();
  for (const { call } of extrema) {
    if (!call || selectedIds.has(call.id)) continue;
    selectedIds.add(call.id);
    selected.push(call);
  }
  return selected;
}

export function captureChartReframePosition(position, subject = "vessel") {
  const validated = validatedUnitVector(position, `${subject} chart reframe position`);
  return Object.freeze({
    subject,
    position: Object.freeze(validated.slice())
  });
}

export function assertChartReframePositionPreserved(captured, position) {
  if (
    !captured ||
    typeof captured.subject !== "string" ||
    captured.subject.length === 0 ||
    !Array.isArray(captured.position)
  ) {
    throw new Error("Chart reframe requires a captured global position");
  }
  const validated = validatedUnitVector(position, `${captured.subject} reframed position`);
  if (validated.some((value, index) => Math.abs(value - captured.position[index]) > 1e-12)) {
    throw new Error(`Chart reframe changed ${captured.subject}'s global position`);
  }
}

export function createExactNorthUpLayout(projectedTiles, viewportWidth, viewportHeight) {
  if (!Array.isArray(projectedTiles) || projectedTiles.length === 0) {
    throw new Error("Exact north-up layout requires projected tiles");
  }
  if (!Number.isFinite(viewportWidth) || viewportWidth <= 0 ||
      !Number.isFinite(viewportHeight) || viewportHeight <= 0) {
    throw new Error("Exact north-up layout requires a positive viewport");
  }
  const halfWidth = Math.round(viewportWidth / 2);
  const halfHeight = Math.round(viewportHeight / 2);
  const positions = new Map();
  for (const tile of projectedTiles) {
    if (!Number.isInteger(tile?.id) || !Number.isFinite(tile.x) || !Number.isFinite(tile.y)) {
      throw new Error("Exact north-up layout received an invalid projected tile");
    }
    positions.set(tile.id, {
      x: tile.x - halfWidth,
      y: tile.y - halfHeight
    });
  }
  return { viewX: 0, viewY: 0, positions };
}

export function northUpProjectionIsStable(position) {
  const normalized = validatedUnitVector(position, "north-up camera position");
  return Math.hypot(normalized[0], normalized[2]) >= NORTH_UP_POLE_TANGENT_EPSILON;
}

export function measureChartNorthUpDrift(samples) {
  if (!Array.isArray(samples)) throw new Error("Chart drift samples must be an array");
  if (samples.length === 0) return emptyChartDrift();

  let weightedSin = 0;
  let weightedCos = 0;
  let angleWeight = 0;
  const validated = samples.map((sample, index) => {
    const values = ["localX", "localY", "northX", "northY"];
    for (const key of values) {
      if (!Number.isFinite(sample?.[key])) {
        throw new Error(`Chart drift sample ${index} has invalid ${key}`);
      }
    }
    const localRadius = Math.hypot(sample.localX, sample.localY);
    const northRadius = Math.hypot(sample.northX, sample.northY);
    if (localRadius >= 1 && northRadius >= 1) {
      const localAngle = Math.atan2(sample.localY, sample.localX);
      const northAngle = Math.atan2(sample.northY, sample.northX);
      const delta = normalizeAngle(localAngle - northAngle);
      const weight = Math.min(localRadius, northRadius, 160);
      weightedSin += Math.sin(delta) * weight;
      weightedCos += Math.cos(delta) * weight;
      angleWeight += weight;
    }
    return sample;
  });

  const rotationRad = angleWeight > 0 ? Math.atan2(weightedSin, weightedCos) : 0;
  const cos = Math.cos(rotationRad);
  const sin = Math.sin(rotationRad);
  let squaredDistortion = 0;
  let maxDistortionPx = 0;
  let worstDistortionSampleIndex = -1;
  for (let index = 0; index < validated.length; index++) {
    const sample = validated[index];
    const expectedX = sample.northX * cos - sample.northY * sin;
    const expectedY = sample.northX * sin + sample.northY * cos;
    const distortion = Math.hypot(sample.localX - expectedX, sample.localY - expectedY);
    squaredDistortion += distortion * distortion;
    if (distortion > Math.max(maxDistortionPx, 1e-9)) {
      maxDistortionPx = distortion;
      worstDistortionSampleIndex = index;
    }
  }

  const metrics = Object.freeze({
    sampleCount: validated.length,
    rotationDeg: rotationRad * 180 / Math.PI,
    rmsDistortionPx: Math.sqrt(squaredDistortion / validated.length),
    maxDistortionPx,
    worstDistortionSampleIndex
  });
  return Object.freeze({
    ...metrics,
    needsReframe: chartNorthUpDriftExceedsThreshold(metrics)
  });
}

export function chartNorthUpDriftExceedsThreshold(metrics) {
  validateChartDriftMetrics(metrics);
  return Math.abs(metrics.rotationDeg) >= CHART_REFRAME_ROTATION_THRESHOLD_DEG ||
    metrics.rmsDistortionPx >= CHART_REFRAME_RMS_DISTORTION_THRESHOLD_PX ||
    metrics.maxDistortionPx >= CHART_REFRAME_MAX_DISTORTION_THRESHOLD_PX;
}

export function chartReframeCandidateIsNorthUp(candidate) {
  validateChartDriftMetrics(candidate);
  return candidate.sampleCount > 0 &&
    Math.abs(candidate.rotationDeg) <= NORTH_UP_REBUILD_MAX_ROTATION_DEG &&
    candidate.rmsDistortionPx <= NORTH_UP_REBUILD_MAX_RMS_ERROR_PX &&
    candidate.maxDistortionPx <= NORTH_UP_REBUILD_MAX_ERROR_PX;
}

function validateChartDriftMetrics(metrics) {
  if (!metrics || !Number.isInteger(metrics.sampleCount) || metrics.sampleCount < 0) {
    throw new Error("Chart drift metrics require a non-negative sample count");
  }
  for (const key of ["rotationDeg", "rmsDistortionPx", "maxDistortionPx"]) {
    if (!Number.isFinite(metrics[key]) || (metrics[key] < 0 && key !== "rotationDeg")) {
      throw new Error(`Chart drift metrics have invalid ${key}`);
    }
  }
}

function emptyChartDrift() {
  return Object.freeze({
    sampleCount: 0,
    rotationDeg: 0,
    rmsDistortionPx: 0,
    maxDistortionPx: 0,
    worstDistortionSampleIndex: -1,
    needsReframe: false
  });
}

function validatedUnitVector(value, label) {
  if (!Array.isArray(value) || value.length !== 3 || value.some((entry) => !Number.isFinite(entry))) {
    throw new Error(`${label} must be a finite 3D vector`);
  }
  const length = Math.hypot(...value);
  if (length < 1e-12) throw new Error(`${label} cannot be zero`);
  return value.map((entry) => entry / length);
}

function normalizeAngle(angle) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}
