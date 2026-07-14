export function orientXForwardToZForward({ x, y, z }) {
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
