export const FISH_SCHOOL_ANIMATION_FRAME_COUNT = 12;
export const FISH_SCHOOL_ANIMATION_FRAME_MS = 125;
export const FISH_SCHOOL_MOTION_FRAME_COUNT = 48;
export const FISH_SCHOOL_MAX_FISH = 6;

const FISH_PHASES = Object.freeze([0, 2, 4, 6, 8, 10]);
const SWIM_PATH = Object.freeze([
  Object.freeze({ x: 0, y: 0 }),
  Object.freeze({ x: 1, y: 0 }),
  Object.freeze({ x: 1, y: 0 }),
  Object.freeze({ x: 2, y: 0 }),
  Object.freeze({ x: 2, y: 1 }),
  Object.freeze({ x: 2, y: 1 }),
  Object.freeze({ x: 1, y: 1 }),
  Object.freeze({ x: 1, y: 2 }),
  Object.freeze({ x: 0, y: 2 }),
  Object.freeze({ x: 0, y: 1 }),
  Object.freeze({ x: 0, y: 1 }),
  Object.freeze({ x: 0, y: 0 })
]);

if (SWIM_PATH.length !== FISH_SCHOOL_ANIMATION_FRAME_COUNT) {
  throw new Error("Fish school swim path must contain one offset per animation frame");
}
if (FISH_PHASES.length !== FISH_SCHOOL_MAX_FISH) {
  throw new Error("Fish school animation must contain one phase per visible fish");
}

export function fishSchoolAnimationTick(nowMs) {
  if (!Number.isFinite(nowMs)) {
    throw new Error(`Fish school animation received invalid time: ${nowMs}`);
  }
  return Math.floor(nowMs / FISH_SCHOOL_ANIMATION_FRAME_MS);
}

export function fishSchoolAnimationTime(nowMs) {
  return fishSchoolAnimationTick(nowMs) * FISH_SCHOOL_ANIMATION_FRAME_MS;
}

export function fishSchoolAnimationFrame(nowMs, phase = 0) {
  if (!Number.isInteger(phase)) {
    throw new Error(`Fish school animation received invalid phase: ${phase}`);
  }
  return positiveModulo(
    fishSchoolAnimationTick(nowMs) + phase,
    FISH_SCHOOL_ANIMATION_FRAME_COUNT
  );
}

export function fishSchoolMotionFrame(nowMs, phase = 0) {
  if (!Number.isInteger(phase)) {
    throw new Error(`Fish school motion received invalid phase: ${phase}`);
  }
  return positiveModulo(
    fishSchoolAnimationTick(nowMs) + phase,
    FISH_SCHOOL_MOTION_FRAME_COUNT
  );
}

export function fishSchoolFishOffset(frame, fishIndex) {
  if (
    !Number.isInteger(frame) ||
    frame < 0 ||
    frame >= FISH_SCHOOL_ANIMATION_FRAME_COUNT
  ) {
    throw new Error(`Fish school animation received invalid frame: ${frame}`);
  }
  if (!Number.isInteger(fishIndex) || fishIndex < 0 || fishIndex >= FISH_SCHOOL_MAX_FISH) {
    throw new Error(`Fish school animation received invalid fish index: ${fishIndex}`);
  }
  return SWIM_PATH[(frame + FISH_PHASES[fishIndex]) % SWIM_PATH.length];
}

function positiveModulo(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}
