export const FIRE_FRAME_WIDTH = 32;
export const FIRE_FRAME_HEIGHT = 48;
export const FIRE_FRAME_COUNT = 8;
export const FIRE_VARIANT_IDS = Object.freeze(
  [4, 5, 6, 7].flatMap((group) => (
    [1, 2, 3, 4, 5].map((variant) => `group-${group}-${variant}`)
  ))
);
export const FIRE_VARIANT_COUNT = FIRE_VARIANT_IDS.length;
export const FIRE_RESURRECT_64_HEX = Object.freeze([
  "2e222f",
  "6e2727",
  "9e4539",
  "cd683d",
  "f79617",
  "f9c22b",
  "fbff86"
]);
export const FIRE_FRAME_MS = 110;
export const FIRE_SOUND_NEAR_PX = 24;
export const FIRE_SOUND_FAR_PX = 168;

export function fireAnimationFrame(nowMs, phaseSeed = 0) {
  if (!Number.isFinite(nowMs) || nowMs < 0) throw new Error(`Invalid fire animation time: ${nowMs}`);
  if (!Number.isInteger(phaseSeed)) throw new Error(`Invalid fire animation seed: ${phaseSeed}`);
  const phaseFrame = positiveModulo(Math.imul(phaseSeed, 5), FIRE_FRAME_COUNT);
  return (Math.floor(nowMs / FIRE_FRAME_MS) + phaseFrame) % FIRE_FRAME_COUNT;
}

export function fireVariantIndex(phaseSeed) {
  if (!Number.isInteger(phaseSeed)) throw new Error(`Invalid fire variant seed: ${phaseSeed}`);
  return positiveModulo(hashInt(phaseSeed ^ 0x46495245), FIRE_VARIANT_COUNT);
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

function hashInt(value) {
  let x = value | 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d);
  x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b);
  x ^= x >>> 16;
  return x >>> 0;
}
