export const UNDERWATER_REFRACTION_PERIOD_MS = 4000;
export const UNDERWATER_REFRACTION_SHADER_TIME_COEFFICIENT =
  4 / UNDERWATER_REFRACTION_PERIOD_MS;
export const WATER_SURFACE_REFRACTION_PX = 1;

const TAU = Math.PI * 2;

export function underwaterRefractionPhase(nowMs) {
  if (!Number.isFinite(nowMs)) {
    throw new Error(`Underwater refraction requires a finite time: ${nowMs}`);
  }
  return nowMs / UNDERWATER_REFRACTION_PERIOD_MS * TAU;
}

export function waterSurfaceRefractionPx({
  isWaterSurface,
  hasSurfaceIce,
  reducedMotion
}) {
  for (const [label, value] of Object.entries({
    isWaterSurface,
    hasSurfaceIce,
    reducedMotion
  })) {
    if (typeof value !== "boolean") {
      throw new Error(`Water surface refraction requires boolean ${label}: ${value}`);
    }
  }
  return isWaterSurface && !hasSurfaceIce && !reducedMotion
    ? WATER_SURFACE_REFRACTION_PX
    : 0;
}
