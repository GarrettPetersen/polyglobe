import {
  simplifyDetailedSailShipSailColor,
  simplifyDetailedSailShipTextureColor
} from "./shipTextureSimplification.js";

export const GALLEON_SAIL_MATERIAL = "3d66-Standardmaterial-15910671-003";
export const PROCEDURAL_FURLED_SAIL_MATERIAL = "procedural-furled-sail-cloth";

export function simplifyGalleonTextureColor(color, surface) {
  if (typeof surface?.sourceMaterialName !== "string") {
    throw new Error("Galleon texture simplification requires a source material name");
  }
  return (
    surface.sourceMaterialName === GALLEON_SAIL_MATERIAL ||
    surface.sourceMaterialName === PROCEDURAL_FURLED_SAIL_MATERIAL
  )
    ? simplifyDetailedSailShipSailColor(color)
    : simplifyDetailedSailShipTextureColor(color, surface);
}
