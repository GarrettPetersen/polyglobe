export const SHIP_ROWING_FRAME_COUNT = 6;

const ROWING_PHASES = Object.freeze([
  Object.freeze({ sweep: -1, lift: 1 }),
  Object.freeze({ sweep: -0.74, lift: 0.12 }),
  Object.freeze({ sweep: -0.18, lift: -0.9 }),
  Object.freeze({ sweep: 0.56, lift: -1 }),
  Object.freeze({ sweep: 1, lift: 0 }),
  Object.freeze({ sweep: 0.28, lift: 1 })
]);

export function rowingOarPose(frameIndex, options = {}) {
  if (!Number.isInteger(frameIndex)) throw new Error(`Rowing frame must be an integer: ${frameIndex}`);
  const sweepScale = options.sweepScale ?? 0.46;
  const liftScale = options.liftScale ?? 0.1;
  if (!Number.isFinite(sweepScale) || sweepScale <= 0) {
    throw new Error(`Rowing sweep scale must be positive: ${sweepScale}`);
  }
  if (!Number.isFinite(liftScale) || liftScale <= 0) {
    throw new Error(`Rowing lift scale must be positive: ${liftScale}`);
  }
  const phase = ((frameIndex % SHIP_ROWING_FRAME_COUNT) + SHIP_ROWING_FRAME_COUNT) % SHIP_ROWING_FRAME_COUNT;
  return Object.freeze({
    sweep: ROWING_PHASES[phase].sweep * sweepScale,
    lift: ROWING_PHASES[phase].lift * liftScale
  });
}
