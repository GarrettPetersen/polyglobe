export const SHIP_LIGHT_DIRECT_START_ALT = 0.02;
export const SHIP_LIGHT_DIRECT_FULL_ALT = 0.18;
export const SHIP_SHADOW_FADE_OUT_ALT = -0.08;
export const SHIP_SHADOW_FULL_ALT = 0.01;
export const SHIP_SURFACE_LIGHTING_BLEND = "soft-light";

export const SHIP_LIGHTING_RGBA = Object.freeze({
  shadow: Object.freeze([12 / 255, 9 / 255, 24 / 255, 0.22]),
  shade: Object.freeze([26 / 255, 18 / 255, 44 / 255, 0.24]),
  highlight: Object.freeze([1, 240 / 255, 188 / 255, 0.26])
});

export function shipLightStrengthsForSunAltitude(sunAltitude) {
  if (!Number.isFinite(sunAltitude)) {
    throw new Error(`Invalid ship-light sun altitude: ${sunAltitude}`);
  }
  return {
    direct: smoothstep(SHIP_LIGHT_DIRECT_START_ALT, SHIP_LIGHT_DIRECT_FULL_ALT, sunAltitude),
    shadow: smoothstep(SHIP_SHADOW_FADE_OUT_ALT, SHIP_SHADOW_FULL_ALT, sunAltitude)
  };
}

export function scaledShipLightingRgba(kind, strength = 1) {
  const color = SHIP_LIGHTING_RGBA[kind];
  if (!color) throw new Error(`Unknown ship-lighting color: ${kind}`);
  if (!Number.isFinite(strength) || strength < 0 || strength > 1) {
    throw new Error(`Invalid ship-lighting strength: ${strength}`);
  }
  return [color[0], color[1], color[2], color[3] * strength];
}

export function shipLightingCssColor(kind) {
  const color = SHIP_LIGHTING_RGBA[kind];
  if (!color) throw new Error(`Unknown ship-lighting color: ${kind}`);
  return `rgba(${Math.round(color[0] * 255)}, ${Math.round(color[1] * 255)}, ` +
    `${Math.round(color[2] * 255)}, ${color[3]})`;
}

function smoothstep(edge0, edge1, value) {
  const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}
