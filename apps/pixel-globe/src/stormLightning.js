export const STORM_LIGHTNING_MIN_INTENSITY = 0.42;

const FIRST_STRIKE_MIN_MS = 900;
const FIRST_STRIKE_MAX_MS = 3600;
const STRIKE_INTERVAL_MIN_MS = 6500;
const STRIKE_INTERVAL_MAX_MS = 18000;

export function createStormLightningState(seed = 0x4c495447) {
  if (!Number.isInteger(seed)) throw new Error(`Storm lightning seed must be an integer: ${seed}`);
  return {
    seed: seed | 0,
    sequence: 0,
    nextStrikeAtMs: null,
    flashPending: false
  };
}

export function updateStormLightning(state, { nowMs, intensity, enabled = true }) {
  validateStormLightningState(state);
  if (!Number.isFinite(nowMs) || !Number.isFinite(intensity)) {
    throw new Error("Storm lightning requires finite time and intensity");
  }

  if (!enabled || intensity < STORM_LIGHTNING_MIN_INTENSITY) {
    state.nextStrikeAtMs = null;
    state.flashPending = false;
    return false;
  }

  const severity = clamp(
    (intensity - STORM_LIGHTNING_MIN_INTENSITY) / (1 - STORM_LIGHTNING_MIN_INTENSITY),
    0,
    1
  );
  if (state.nextStrikeAtMs === null) {
    state.nextStrikeAtMs = nowMs + strikeDelayMs(state, severity, true);
    return false;
  }
  if (nowMs < state.nextStrikeAtMs) return false;

  state.flashPending = true;
  state.sequence += 1;
  state.nextStrikeAtMs = nowMs + strikeDelayMs(state, severity, false);
  return true;
}

export function consumeStormLightningFlash(state) {
  validateStormLightningState(state);
  if (!state.flashPending) return false;
  state.flashPending = false;
  return true;
}

function strikeDelayMs(state, severity, firstStrike) {
  const minMs = firstStrike
    ? lerp(FIRST_STRIKE_MIN_MS * 1.6, FIRST_STRIKE_MIN_MS, severity)
    : lerp(STRIKE_INTERVAL_MIN_MS * 2, STRIKE_INTERVAL_MIN_MS, severity);
  const maxMs = firstStrike
    ? lerp(FIRST_STRIKE_MAX_MS * 1.35, FIRST_STRIKE_MAX_MS, severity)
    : lerp(STRIKE_INTERVAL_MAX_MS, STRIKE_INTERVAL_MAX_MS * 0.46, severity);
  return Math.round(lerp(minMs, maxMs, eventUnit(state.seed, state.sequence, firstStrike)));
}

function eventUnit(seed, sequence, firstStrike) {
  const salt = firstStrike ? 0x46525354 : 0x4e455854;
  return (mix32(seed ^ salt ^ Math.imul(sequence + 1, 0x9e3779b1)) >>> 0) / 0x100000000;
}

function validateStormLightningState(state) {
  if (!state || !Number.isInteger(state.seed) || !Number.isInteger(state.sequence) ||
      (state.nextStrikeAtMs !== null && !Number.isFinite(state.nextStrikeAtMs)) ||
      typeof state.flashPending !== "boolean") {
    throw new Error("Invalid storm lightning state");
  }
}

function mix32(value) {
  let x = value | 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d);
  x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b);
  x ^= x >>> 16;
  return x | 0;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
