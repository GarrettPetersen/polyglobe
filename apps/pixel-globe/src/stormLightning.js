export const STORM_LIGHTNING_MIN_INTENSITY = 0.42;
export const STORM_SHIP_STRIKE_FRAME_WIDTH = 195;
export const STORM_SHIP_STRIKE_FRAME_HEIGHT = 220;
export const STORM_SHIP_STRIKE_SHEET_COLUMNS = 6;
export const STORM_SHIP_STRIKE_FRAME_COUNT = 30;
export const STORM_SHIP_STRIKE_FLASH_FRAME = 3;
export const STORM_SHIP_STRIKE_COOLDOWN_MS = 10000;

export const STORM_SHIP_STRIKE_DURATION_MS = 1000;
const STORM_SHIP_STRIKE_IMPACT_X = 98;
const STORM_SHIP_STRIKE_IMPACT_Y = 217;

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

export function createStormShipStrikeState({ durationMs = STORM_SHIP_STRIKE_DURATION_MS } = {}) {
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    throw new Error(`Invalid storm ship strike duration: ${durationMs}`);
  }
  return {
    durationMs,
    startedAtMs: null,
    cooldownUntilMs: null,
    sequence: 0,
    flashPending: false
  };
}

export function triggerStormShipStrike(state, nowMs) {
  validateStormShipStrikeState(state);
  if (!Number.isFinite(nowMs)) throw new Error(`Storm ship strike requires finite time: ${nowMs}`);
  if (state.cooldownUntilMs !== null && nowMs < state.cooldownUntilMs) return false;
  state.startedAtMs = nowMs;
  state.cooldownUntilMs = nowMs + STORM_SHIP_STRIKE_COOLDOWN_MS;
  state.sequence += 1;
  state.flashPending = true;
  return true;
}

export function updateStormShipStrike(state, nowMs) {
  validateStormShipStrikeState(state);
  if (!Number.isFinite(nowMs)) throw new Error(`Storm ship strike requires finite time: ${nowMs}`);
  if (state.startedAtMs === null) return false;
  if (nowMs < state.startedAtMs) throw new Error("Storm ship strike cannot run before it starts");
  if (nowMs - state.startedAtMs < state.durationMs) {
    return true;
  }
  state.startedAtMs = null;
  state.flashPending = false;
  return false;
}

export function stormShipStrikeFrame(state, nowMs) {
  validateStormShipStrikeState(state);
  if (!Number.isFinite(nowMs)) throw new Error(`Storm ship strike requires finite time: ${nowMs}`);
  if (state.startedAtMs === null) return null;
  const elapsedMs = nowMs - state.startedAtMs;
  if (elapsedMs < 0) throw new Error("Storm ship strike cannot render before it starts");
  const frameMs = state.durationMs / STORM_SHIP_STRIKE_FRAME_COUNT;
  const index = Math.floor(elapsedMs / frameMs);
  if (index >= STORM_SHIP_STRIKE_FRAME_COUNT) return null;
  return {
    index,
    sourceX: index % STORM_SHIP_STRIKE_SHEET_COLUMNS * STORM_SHIP_STRIKE_FRAME_WIDTH,
    sourceY: Math.floor(index / STORM_SHIP_STRIKE_SHEET_COLUMNS) * STORM_SHIP_STRIKE_FRAME_HEIGHT,
    mirrored: state.sequence % 2 === 0
  };
}

export function consumeStormShipStrikeFlash(state, nowMs) {
  validateStormShipStrikeState(state);
  if (!state.flashPending) return false;
  const frame = stormShipStrikeFrame(state, nowMs);
  if (!frame || frame.index < STORM_SHIP_STRIKE_FLASH_FRAME) return false;
  state.flashPending = false;
  return true;
}

export function stormShipStrikeDrawOrigin({ shipX, shipY, shipFrameSize }) {
  if (![shipX, shipY, shipFrameSize].every(Number.isFinite) || shipFrameSize <= 0) {
    throw new Error("Storm ship strike draw origin requires a finite positive ship frame");
  }
  const impactX = shipX + Math.round(shipFrameSize / 2);
  const impactY = shipY + Math.round(shipFrameSize * 0.75);
  return {
    x: Math.round(impactX - STORM_SHIP_STRIKE_IMPACT_X),
    y: Math.round(impactY - STORM_SHIP_STRIKE_IMPACT_Y)
  };
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

function validateStormShipStrikeState(state) {
  if (!state || !Number.isFinite(state.durationMs) || state.durationMs <= 0 || !Number.isInteger(state.sequence) ||
      (state.startedAtMs !== null && !Number.isFinite(state.startedAtMs)) ||
      (state.cooldownUntilMs !== null && !Number.isFinite(state.cooldownUntilMs)) ||
      typeof state.flashPending !== "boolean") {
    throw new Error("Invalid storm ship strike state");
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
