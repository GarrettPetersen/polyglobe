export const UNDERWATER_REFRACTION_PERIOD_MS = 4000;
export const UNDERWATER_REFRACTION_SHADER_TIME_COEFFICIENT =
  4 / UNDERWATER_REFRACTION_PERIOD_MS;

const TAU = Math.PI * 2;

export function underwaterRefractionPhase(nowMs) {
  if (!Number.isFinite(nowMs)) {
    throw new Error(`Underwater refraction requires a finite time: ${nowMs}`);
  }
  return nowMs / UNDERWATER_REFRACTION_PERIOD_MS * TAU;
}
