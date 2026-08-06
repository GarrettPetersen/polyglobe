const HULL_TIMBER_MESH_NAMES = new Set([
  "Object_14",
  "Object_21",
  "Object_23",
  "Object_24"
]);

const GALLEASS_UPPER_HULL_MESH_NAMES = new Set([
  "Object_14",
  "Object_24"
]);

const GALLEY_HULL_COLOR = Object.freeze({ r: 230, g: 144, b: 78 });
const FUSTA_HULL_COLOR = Object.freeze({ r: 158, g: 69, b: 57 });
const GALLEASS_UPPER_HULL_COLOR = Object.freeze({ r: 110, g: 39, b: 39 });

export function mediterraneanGalleyHullColor(color, surface) {
  return recolorHullMesh(color, surface, HULL_TIMBER_MESH_NAMES, GALLEY_HULL_COLOR);
}

export function fustaHullColor(color, surface) {
  return recolorHullMesh(color, surface, HULL_TIMBER_MESH_NAMES, FUSTA_HULL_COLOR);
}

export function galleassHullColor(color, surface) {
  return recolorHullMesh(
    color,
    surface,
    GALLEASS_UPPER_HULL_MESH_NAMES,
    GALLEASS_UPPER_HULL_COLOR
  );
}

function recolorHullMesh(color, surface, meshNames, hullColor) {
  assertColorTransformInput(color);
  if (surface?.sourceMeshName == null) return color;
  if (typeof surface.sourceMeshName !== "string") {
    throw new Error("Mediterranean galley color transform received an invalid source mesh name");
  }
  if (!meshNames.has(surface.sourceMeshName)) return color;
  return hullColor;
}

function assertColorTransformInput(color) {
  if (!color || ![color.r, color.g, color.b].every(Number.isFinite)) {
    throw new Error("Mediterranean galley color transform requires a finite RGB color");
  }
}
