export function orientNegativeXForwardYUpToZForward({ x, y, z }) {
  return { x: z, y, z: -x };
}

export function orientPositiveXForwardToZForward({ x, y, z }) {
  return { x: -z, y, z: x };
}

export function orientPositiveXForwardZUpToZForward({ x, y, z }) {
  return { x: y, y: z, z: x };
}

export function orientYForwardZDownToZForward({ x, y, z }) {
  return { x: -x, y: -z, z: -y };
}

export function rotateY({ x, y, z }, angleRad) {
  if (![x, y, z, angleRad].every(Number.isFinite)) {
    throw new Error("Y-axis rotation requires finite coordinates and angle");
  }
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  return {
    x: x * cos + z * sin,
    y,
    z: -x * sin + z * cos
  };
}

const CYC3W_GALLEON_PRESENTATION_YAW_RAD = Math.PI / 9;
const CYC3W_GALLEON_SOURCE_ORIENTATION = createShipModelBasisOrientation({
  // Measured after the glTF scene transforms are applied. The source is
  // Y-up, but its bow is presented 20 degrees off raw -X.
  right: {
    x: Math.sin(CYC3W_GALLEON_PRESENTATION_YAW_RAD),
    y: 0,
    z: Math.cos(CYC3W_GALLEON_PRESENTATION_YAW_RAD)
  },
  up: { x: 0, y: 1, z: 0 },
  forward: {
    x: -Math.cos(CYC3W_GALLEON_PRESENTATION_YAW_RAD),
    y: 0,
    z: Math.sin(CYC3W_GALLEON_PRESENTATION_YAW_RAD)
  }
}, "cyc3w galleon");

export function orientCyc3wGalleonToCanonical(point) {
  return CYC3W_GALLEON_SOURCE_ORIENTATION(point);
}

export function createShipModelBasisOrientation({ right, up, forward }, label = "ship model") {
  const basis = {
    right: requiredUnitVector(right, `${label} right axis`),
    up: requiredUnitVector(up, `${label} up axis`),
    forward: requiredUnitVector(forward, `${label} forward axis`)
  };
  for (const [firstName, secondName] of [
    ["right", "up"],
    ["right", "forward"],
    ["up", "forward"]
  ]) {
    const alignment = dot(basis[firstName], basis[secondName]);
    if (Math.abs(alignment) > 1e-5) {
      throw new Error(`${label} ${firstName} and ${secondName} axes are not perpendicular`);
    }
  }
  const handedness = dot(cross(basis.right, basis.up), basis.forward);
  if (handedness < 1 - 1e-5) {
    throw new Error(`${label} orientation basis is not right-handed`);
  }
  return (point) => {
    const value = requiredFiniteVector(point, `${label} point`);
    return {
      x: dot(value, basis.right),
      y: dot(value, basis.up),
      z: dot(value, basis.forward)
    };
  };
}

function requiredUnitVector(value, label) {
  const vector = requiredFiniteVector(value, label);
  const length = Math.hypot(vector.x, vector.y, vector.z);
  if (Math.abs(length - 1) > 1e-5) throw new Error(`${label} must be normalized`);
  return vector;
}

function requiredFiniteVector(value, label) {
  if (!value || ![value.x, value.y, value.z].every(Number.isFinite)) {
    throw new Error(`${label} requires finite coordinates`);
  }
  return { x: value.x, y: value.y, z: value.z };
}

function dot(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function cross(a, b) {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x
  };
}
