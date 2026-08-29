const DETAILED_SAIL_SHIP_TEXTURE_PALETTE = Object.freeze({
  sail: Object.freeze({ r: 226, g: 215, b: 177 }),
  redAccent: Object.freeze({ r: 157, g: 55, b: 43 }),
  coolTrim: Object.freeze({ r: 75, g: 77, b: 80 }),
  darkWood: Object.freeze({ r: 52, g: 34, b: 24 }),
  deepWood: Object.freeze({ r: 82, g: 51, b: 31 }),
  midWood: Object.freeze({ r: 126, g: 80, b: 45 }),
  lightWood: Object.freeze({ r: 170, g: 126, b: 76 }),
  sunlitWood: Object.freeze({ r: 200, g: 160, b: 110 })
});

export function simplifyDetailedSailShipTextureColor(color, surface = null) {
  assertTextureColor(color);
  const lifted = {
    r: clamp255(color.r * 1.55 + 18),
    g: clamp255(color.g * 1.48 + 16),
    b: clamp255(color.b * 1.38 + 13)
  };
  const maximum = Math.max(lifted.r, lifted.g, lifted.b);
  const minimum = Math.min(lifted.r, lifted.g, lifted.b);
  const chroma = maximum - minimum;
  const luminance = lifted.r * 0.299 + lifted.g * 0.587 + lifted.b * 0.114;

  if (luminance >= 168 && chroma <= 78) return DETAILED_SAIL_SHIP_TEXTURE_PALETTE.sail;
  if (
    lifted.r >= 100 &&
    lifted.g <= 70 &&
    lifted.r >= lifted.g * 1.42 &&
    lifted.r >= lifted.b * 1.25
  ) {
    return DETAILED_SAIL_SHIP_TEXTURE_PALETTE.redAccent;
  }
  if (
    luminance >= 68 &&
    chroma <= 28 &&
    lifted.b >= lifted.r * 0.82
  ) {
    return DETAILED_SAIL_SHIP_TEXTURE_PALETTE.coolTrim;
  }
  const timber = luminance < 55
    ? DETAILED_SAIL_SHIP_TEXTURE_PALETTE.darkWood
    : luminance < 88
      ? DETAILED_SAIL_SHIP_TEXTURE_PALETTE.deepWood
      : luminance < 132
        ? DETAILED_SAIL_SHIP_TEXTURE_PALETTE.midWood
        : DETAILED_SAIL_SHIP_TEXTURE_PALETTE.lightWood;
  return detailedShipTimberPlaneColor(timber, surface);
}

function detailedShipTimberPlaneColor(timber, surface) {
  if (surface == null) return timber;
  const normalY = surface.normal?.y;
  if (!Number.isFinite(normalY)) {
    throw new Error("Detailed ship plane lighting requires a finite surface normal");
  }
  return normalY >= 0.45
    ? DETAILED_SAIL_SHIP_TEXTURE_PALETTE.sunlitWood
    : timber;
}

export function simplifyDetailedSailShipSailColor(color) {
  assertTextureColor(color);
  return DETAILED_SAIL_SHIP_TEXTURE_PALETTE.sail;
}

function assertTextureColor(color) {
  if (!color || ![color.r, color.g, color.b].every(Number.isFinite)) {
    throw new Error("Ship texture simplification requires a finite RGB color");
  }
}

function clamp255(value) {
  return Math.max(0, Math.min(255, value));
}
