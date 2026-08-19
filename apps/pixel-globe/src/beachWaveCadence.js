export const BEACH_WAVE_PERIOD_MS = 3600;
export const BEACH_WAVE_FRAME_COUNT = 16;

const BEACH_WAVE_MIN_REACH = 0.16;
const BEACH_WAVE_MAX_REACH = 0.78;
const BEACH_WAVE_CADENCE_PROFILES = Object.freeze([
  Object.freeze({ advanceRatio: 0.38, recedeRatio: 0.42 }),
  Object.freeze({ advanceRatio: 0.44, recedeRatio: 0.38 }),
  Object.freeze({ advanceRatio: 0.5, recedeRatio: 0.33 })
]);

export function beachWaveCadence(call) {
  validateCoastCall(call);
  const low = Math.min(call.a, call.b);
  const high = Math.max(call.a, call.b);
  const seed = hashInt(low ^ Math.imul(high, 0x632be59b));
  return Object.freeze({
    phaseFrame: seed % BEACH_WAVE_FRAME_COUNT,
    profileIndex: hashInt(seed ^ 0x57415645) % BEACH_WAVE_CADENCE_PROFILES.length
  });
}

export function beachWaveState(call, clockMs) {
  if (!Number.isFinite(clockMs) || clockMs < 0) {
    throw new Error(`Invalid beach wave clock: ${clockMs}`);
  }
  const cadence = beachWaveCadence(call);
  const profile = BEACH_WAVE_CADENCE_PROFILES[cadence.profileIndex];
  const offsetMs = cadence.phaseFrame / BEACH_WAVE_FRAME_COUNT * BEACH_WAVE_PERIOD_MS;
  const phase = ((clockMs + offsetMs) % BEACH_WAVE_PERIOD_MS) / BEACH_WAVE_PERIOD_MS;
  const reachSpan = BEACH_WAVE_MAX_REACH - BEACH_WAVE_MIN_REACH;
  if (phase < profile.advanceRatio) {
    const p = easeInOut(phase / profile.advanceRatio);
    const reach = BEACH_WAVE_MIN_REACH + reachSpan * p;
    return { reach, foamReach: reach, foamAlpha: 0.92 };
  }

  const fadePhase = (phase - profile.advanceRatio) / (1 - profile.advanceRatio);
  const foamAlpha = 0.92 * (1 - easeInOut(fadePhase));
  const recedeEnd = profile.advanceRatio + profile.recedeRatio;
  if (phase < recedeEnd) {
    const p = easeInOut((phase - profile.advanceRatio) / profile.recedeRatio);
    return {
      reach: BEACH_WAVE_MAX_REACH - reachSpan * p,
      foamReach: BEACH_WAVE_MAX_REACH,
      foamAlpha
    };
  }

  return {
    reach: BEACH_WAVE_MIN_REACH,
    foamReach: BEACH_WAVE_MAX_REACH,
    foamAlpha
  };
}

function validateCoastCall(call) {
  if (!call || !Number.isInteger(call.a) || !Number.isInteger(call.b) || call.a === call.b) {
    throw new Error("Beach wave cadence requires two distinct integer tile ids");
  }
}

function easeInOut(value) {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
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
