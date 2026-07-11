export const SHIP_LIGHT_DIRECT_START_ALT = 0.02;
export const SHIP_LIGHT_DIRECT_FULL_ALT = 0.18;
export const SHIP_SHADOW_FADE_OUT_ALT = -0.08;
export const SHIP_SHADOW_FULL_ALT = 0.01;

export function shipLightStrengthsForSunAltitude(sunAltitude) {
  if (!Number.isFinite(sunAltitude)) {
    throw new Error(`Invalid ship-light sun altitude: ${sunAltitude}`);
  }
  return {
    direct: smoothstep(SHIP_LIGHT_DIRECT_START_ALT, SHIP_LIGHT_DIRECT_FULL_ALT, sunAltitude),
    shadow: smoothstep(SHIP_SHADOW_FADE_OUT_ALT, SHIP_SHADOW_FULL_ALT, sunAltitude)
  };
}

function smoothstep(edge0, edge1, value) {
  const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}
