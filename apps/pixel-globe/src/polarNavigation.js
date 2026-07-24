export const SHIP_POLAR_NAVIGATION_LIMIT_DEG = 84;

const POLAR_ESCAPE_EPSILON_DEG = 1e-6;

export function shipPositionWithinPolarNavigationLimit(
  position,
  limitDeg = SHIP_POLAR_NAVIGATION_LIMIT_DEG
) {
  return Math.abs(latitudeDegForUnitVector(position)) <= validatedLimit(limitDeg);
}

export function polarNavigationCollision(
  fromPosition,
  toPosition,
  limitDeg = SHIP_POLAR_NAVIGATION_LIMIT_DEG
) {
  const limit = validatedLimit(limitDeg);
  const from = normalizedVector(fromPosition, "polar navigation origin");
  const to = normalizedVector(toPosition, "polar navigation destination");
  const fromLatitude = latitudeDegForNormalizedVector(from);
  const toLatitude = latitudeDegForNormalizedVector(to);
  const toAbsLatitude = Math.abs(toLatitude);

  if (toAbsLatitude <= limit) return null;
  if (
    Math.abs(fromLatitude) > limit &&
    toAbsLatitude < Math.abs(fromLatitude) - POLAR_ESCAPE_EPSILON_DEG
  ) return null;

  const poleSign = toLatitude >= 0 ? 1 : -1;
  const towardPole = [0, poleSign, 0];
  const dot = dot3(towardPole, from);
  const tangent = [
    towardPole[0] - from[0] * dot,
    towardPole[1] - from[1] * dot,
    towardPole[2] - from[2] * dot
  ];
  const length = Math.hypot(tangent[0], tangent[1], tangent[2]);
  if (length < 1e-9) {
    throw new Error("Cannot resolve a polar navigation boundary normal at the geographic pole");
  }

  return Object.freeze({
    latitudeDeg: toLatitude,
    normal: Object.freeze(tangent.map((value) => value / length))
  });
}

function latitudeDegForUnitVector(position) {
  return latitudeDegForNormalizedVector(normalizedVector(position, "ship position"));
}

function latitudeDegForNormalizedVector(position) {
  return Math.asin(clamp(position[1], -1, 1)) * 180 / Math.PI;
}

function normalizedVector(value, label) {
  if (
    !Array.isArray(value) ||
    value.length !== 3 ||
    value.some((component) => !Number.isFinite(component))
  ) {
    throw new Error(`${label} must be a finite 3D vector`);
  }
  const length = Math.hypot(value[0], value[1], value[2]);
  if (length < 1e-9) throw new Error(`${label} cannot be zero`);
  return value.map((component) => component / length);
}

function validatedLimit(limitDeg) {
  if (!Number.isFinite(limitDeg) || limitDeg <= 0 || limitDeg >= 90) {
    throw new Error(`Invalid ship polar navigation limit: ${limitDeg}`);
  }
  return limitDeg;
}

function dot3(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
