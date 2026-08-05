import {
  simplifyDetailedSailShipSailColor,
  simplifyDetailedSailShipTextureColor
} from "./shipTextureSimplification.js";

export function simplifySpanishNaoTextureColor(color, surface) {
  if (isSpanishNaoSailMesh(surface?.sourceMeshName)) {
    return simplifyDetailedSailShipSailColor(color);
  }
  return simplifyDetailedSailShipTextureColor(color);
}

export function isSpanishNaoSailMesh(sourceMeshName) {
  if (typeof sourceMeshName !== "string") {
    throw new Error("Spanish Nao texture simplification requires a source mesh name");
  }
  return /^(?:Vela|Gavia)/i.test(sourceMeshName);
}
