import {
  GALLEASS_SLUG,
  MEDITERRANEAN_GALLEY_SLUG,
  SHIP_PROPULSION_SAIL,
  SHIP_STATS
} from "./shipStats.js";

export const SHIP_ROWING_FRAME_COUNT = 6;

export const SHIP_ROWING_ANIMATION_SPECS = new Map([
  [MEDITERRANEAN_GALLEY_SLUG, rowingSpec(125, 0.14, 0.88)],
  [GALLEASS_SLUG, rowingSpec(150, 0.16, 0.76)],
  ["joseon-turtle-ship", rowingSpec(123, 0.14, 0.92)],
  ["joseon-panokseon", rowingSpec(125, 0.14, 0.90)],
  ["japanese-kuribune", rowingSpec(116, 0.11, 1.00)],
  ["japanese-kobaya", rowingSpec(116, 0.12, 1.02)],
  ["japanese-sekibune", rowingSpec(121, 0.13, 0.94)],
  ["japanese-atakebune", rowingSpec(137, 0.14, 0.84)],
  ["viking-longship", rowingSpec(117, 0.14, 0.96)],
  ["mesoamerican-dugout-canoe", rowingSpec(110, 0.11, 1.08)],
  ["kelulus", rowingSpec(121, 0.13, 0.94)],
  ["penjajap", rowingSpec(114, 0.13, 1.00)],
  ["lancaran", rowingSpec(124, 0.14, 0.93)],
  ["royal-lancaran", rowingSpec(132, 0.15, 0.87)]
]);

validateRowingAnimationCoverage();

const ROWING_PHASES = Object.freeze([
  Object.freeze({ sweep: 1, lift: 1 }),
  Object.freeze({ sweep: 0.74, lift: 0.12 }),
  Object.freeze({ sweep: 0.18, lift: -0.9 }),
  Object.freeze({ sweep: -0.56, lift: -1 }),
  Object.freeze({ sweep: -1, lift: 0 }),
  Object.freeze({ sweep: -0.28, lift: 1 })
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

function rowingSpec(frameMs, volume, playbackRate) {
  return Object.freeze({
    frames: SHIP_ROWING_FRAME_COUNT,
    frameMs,
    volume,
    playbackRate
  });
}

function validateRowingAnimationCoverage() {
  const expected = SHIP_STATS
    .filter((stats) => stats.propulsion !== SHIP_PROPULSION_SAIL)
    .map((stats) => stats.slug)
    .sort();
  const configured = [...SHIP_ROWING_ANIMATION_SPECS.keys()].sort();
  if (JSON.stringify(configured) !== JSON.stringify(expected)) {
    throw new Error(
      `Rowing animation roster mismatch; configured ${configured.join(", ")}, ` +
      `expected ${expected.join(", ")}`
    );
  }
}
