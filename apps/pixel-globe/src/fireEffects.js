export const FIRE_FRAME_WIDTH = 32;
export const FIRE_FRAME_HEIGHT = 48;
export const FIRE_FRAME_COUNT = 8;
export const FIRE_FRAME_MS = 110;
export const FIRE_SOUND_NEAR_PX = 24;
export const FIRE_SOUND_FAR_PX = 168;

export function fireAnimationFrame(nowMs, phaseSeed = 0) {
  if (!Number.isFinite(nowMs) || nowMs < 0) throw new Error(`Invalid fire animation time: ${nowMs}`);
  if (!Number.isInteger(phaseSeed)) throw new Error(`Invalid fire animation seed: ${phaseSeed}`);
  const phaseFrame = positiveModulo(Math.imul(phaseSeed, 5), FIRE_FRAME_COUNT);
  return (Math.floor(nowMs / FIRE_FRAME_MS) + phaseFrame) % FIRE_FRAME_COUNT;
}

export function fireSoundPresence(distancePx) {
  if (!Number.isFinite(distancePx) || distancePx < 0) {
    throw new Error(`Invalid fire sound distance: ${distancePx}`);
  }
  if (distancePx <= FIRE_SOUND_NEAR_PX) return 1;
  if (distancePx >= FIRE_SOUND_FAR_PX) return 0;
  const t = (distancePx - FIRE_SOUND_NEAR_PX) / (FIRE_SOUND_FAR_PX - FIRE_SOUND_NEAR_PX);
  const smooth = t * t * (3 - 2 * t);
  return 1 - smooth;
}

function positiveModulo(value, modulus) {
  return ((value % modulus) + modulus) % modulus;
}
