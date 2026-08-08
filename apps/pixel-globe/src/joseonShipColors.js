const HYEOPSEON_RIG_MESH_NAMES = new Set([
  "Object_11",
  "Object_87",
  "Object_88"
]);

const HYEOPSEON_TIMBER = Object.freeze({ r: 174, g: 112, b: 61 });

export function hyeopseonHullColor(color, surface) {
  assertColor(color);
  const meshName = surface?.sourceMeshName;
  if (meshName == null || HYEOPSEON_RIG_MESH_NAMES.has(meshName)) return color;
  if (typeof meshName !== "string") {
    throw new Error("Hyeopseon color transform received an invalid source mesh name");
  }
  const luminance = color.r * 0.2126 + color.g * 0.7152 + color.b * 0.0722;
  const shade = Math.max(0.62, Math.min(1.26, luminance / 128));
  return {
    r: Math.round(HYEOPSEON_TIMBER.r * shade),
    g: Math.round(HYEOPSEON_TIMBER.g * shade),
    b: Math.round(HYEOPSEON_TIMBER.b * shade)
  };
}

function assertColor(color) {
  if (!color || ![color.r, color.g, color.b].every(Number.isFinite)) {
    throw new Error("Hyeopseon color transform requires a finite RGB color");
  }
}
