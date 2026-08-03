export const CONTROL_SCHEME_ABSOLUTE = "absolute";
export const CONTROL_SCHEME_RELATIVE = "relative";

export const CONTROL_SCHEMES = Object.freeze([
  CONTROL_SCHEME_ABSOLUTE,
  CONTROL_SCHEME_RELATIVE
]);

export function normalizeControlScheme(value) {
  if (value === null || value === undefined || value === "") {
    return CONTROL_SCHEME_ABSOLUTE;
  }
  if (!CONTROL_SCHEMES.includes(value)) {
    throw new Error(`Unknown control scheme: ${value}`);
  }
  return value;
}

export function nextControlScheme(value, direction = 1) {
  const normalized = normalizeControlScheme(value);
  if (!Number.isFinite(direction) || direction === 0) {
    throw new Error(`Invalid control scheme direction: ${direction}`);
  }
  const index = CONTROL_SCHEMES.indexOf(normalized);
  return CONTROL_SCHEMES[
    (index + (direction > 0 ? 1 : -1) + CONTROL_SCHEMES.length) % CONTROL_SCHEMES.length
  ];
}

export function steeringIntentForScheme({
  scheme,
  left = false,
  right = false,
  up = false,
  down = false,
  controllerX = 0,
  controllerY = 0
}) {
  const normalized = normalizeControlScheme(scheme);
  if (!Number.isFinite(controllerX) || !Number.isFinite(controllerY)) {
    throw new Error("Controller steering axes must be finite");
  }
  const horizontal = Number(Boolean(right)) - Number(Boolean(left)) + controllerX;
  const vertical = Number(Boolean(up)) - Number(Boolean(down)) + controllerY;
  if (normalized === CONTROL_SCHEME_RELATIVE) {
    return {
      absoluteX: 0,
      absoluteY: 0,
      relativeTurn: Math.sign(horizontal),
      relativeForward: vertical > 0,
      relativeBackward: vertical < 0
    };
  }
  return {
    absoluteX: horizontal,
    absoluteY: vertical,
    relativeTurn: 0,
    relativeForward: false,
    relativeBackward: false
  };
}

export function relativeHeadingAngle(currentHeadingRad, relativeTurn) {
  if (!Number.isFinite(currentHeadingRad) || !Number.isFinite(relativeTurn)) {
    throw new Error("Relative heading inputs must be finite");
  }
  if (relativeTurn === 0) return null;
  return currentHeadingRad + Math.sign(relativeTurn) * Math.PI / 2;
}
