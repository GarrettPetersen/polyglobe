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
