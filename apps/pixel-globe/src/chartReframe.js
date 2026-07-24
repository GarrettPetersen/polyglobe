export const NORTH_UP_POLE_TANGENT_EPSILON = 1e-6;
export const CHART_REFRAME_ROTATION_THRESHOLD_DEG = 1.5;
export const CHART_REFRAME_RMS_DISTORTION_THRESHOLD_PX = 1.5;
export const CHART_REFRAME_MAX_DISTORTION_THRESHOLD_PX = 4;

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
  for (const sample of validated) {
    const expectedX = sample.northX * cos - sample.northY * sin;
    const expectedY = sample.northX * sin + sample.northY * cos;
    const distortion = Math.hypot(sample.localX - expectedX, sample.localY - expectedY);
    squaredDistortion += distortion * distortion;
    maxDistortionPx = Math.max(maxDistortionPx, distortion);
  }

  const metrics = Object.freeze({
    sampleCount: validated.length,
    rotationDeg: rotationRad * 180 / Math.PI,
    rmsDistortionPx: Math.sqrt(squaredDistortion / validated.length),
    maxDistortionPx
  });
  return Object.freeze({
    ...metrics,
    needsReframe: chartNorthUpDriftExceedsThreshold(metrics)
  });
}

export function chartNorthUpDriftExceedsThreshold(metrics) {
  if (!metrics || !Number.isInteger(metrics.sampleCount) || metrics.sampleCount < 0) {
    throw new Error("Chart drift metrics require a non-negative sample count");
  }
  for (const key of ["rotationDeg", "rmsDistortionPx", "maxDistortionPx"]) {
    if (!Number.isFinite(metrics[key]) || (metrics[key] < 0 && key !== "rotationDeg")) {
      throw new Error(`Chart drift metrics have invalid ${key}`);
    }
  }
  return Math.abs(metrics.rotationDeg) >= CHART_REFRAME_ROTATION_THRESHOLD_DEG ||
    metrics.rmsDistortionPx >= CHART_REFRAME_RMS_DISTORTION_THRESHOLD_PX ||
    metrics.maxDistortionPx >= CHART_REFRAME_MAX_DISTORTION_THRESHOLD_PX;
}

function emptyChartDrift() {
  return Object.freeze({
    sampleCount: 0,
    rotationDeg: 0,
    rmsDistortionPx: 0,
    maxDistortionPx: 0,
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
