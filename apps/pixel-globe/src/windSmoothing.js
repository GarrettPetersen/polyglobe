export const PLAYER_WIND_TURN_RATE_RAD_PER_SECOND = Math.PI / 10;
export const PLAYER_WIND_STRENGTH_RESPONSE_PER_SECOND = 0.65;

export function createSmoothedWindState(sample) {
  assertWindSample(sample, "initial");
  return {
    directionRad: normalizeAngleRad(sample.directionRad),
    strength: sample.strength
  };
}

export function advanceSmoothedWindState(state, target, dt, options = {}) {
  assertWindSample(state, "current");
  assertWindSample(target, "target");
  if (!Number.isFinite(dt) || dt < 0) throw new Error(`Invalid wind smoothing delta: ${dt}`);

  const turnRate = options.turnRateRadPerSecond ?? PLAYER_WIND_TURN_RATE_RAD_PER_SECOND;
  const strengthResponse = options.strengthResponsePerSecond ?? PLAYER_WIND_STRENGTH_RESPONSE_PER_SECOND;
  if (!Number.isFinite(turnRate) || turnRate <= 0) {
    throw new Error(`Invalid wind smoothing turn rate: ${turnRate}`);
  }
  if (!Number.isFinite(strengthResponse) || strengthResponse <= 0) {
    throw new Error(`Invalid wind smoothing strength response: ${strengthResponse}`);
  }
  if (dt === 0) return false;

  const directionDelta = shortestAngleDelta(state.directionRad, target.directionRad);
  const maxTurn = turnRate * dt;
  const directionStep = clamp(directionDelta, -maxTurn, maxTurn);
  const strengthStep = 1 - Math.exp(-strengthResponse * dt);
  const nextStrength = state.strength + (target.strength - state.strength) * strengthStep;
  const changed = Math.abs(directionStep) > 1e-8 || Math.abs(nextStrength - state.strength) > 1e-8;

  state.directionRad = normalizeAngleRad(state.directionRad + directionStep);
  state.strength = nextStrength;
  return changed;
}

function assertWindSample(sample, label) {
  if (!sample || !Number.isFinite(sample.directionRad) || !Number.isFinite(sample.strength)) {
    throw new Error(`Invalid ${label} wind sample`);
  }
  if (sample.strength <= 0) throw new Error(`${label} wind strength must be positive`);
}

function shortestAngleDelta(from, to) {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

function normalizeAngleRad(angle) {
  const turn = Math.PI * 2;
  return ((angle % turn) + turn) % turn;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
