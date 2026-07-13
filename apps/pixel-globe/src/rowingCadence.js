export function createRowingCadenceState() {
  return { active: false, elapsedSeconds: 0 };
}

export function advanceRowingCadence(state, { active, dt, periodSeconds }) {
  if (!state || typeof state !== "object") throw new Error("Rowing cadence requires state");
  if (!Number.isFinite(dt) || dt < 0) throw new Error(`Invalid rowing cadence dt: ${dt}`);
  if (!Number.isFinite(periodSeconds) || periodSeconds <= 0) {
    throw new Error(`Invalid rowing cadence period: ${periodSeconds}`);
  }

  if (!active) {
    state.active = false;
    state.elapsedSeconds = 0;
    return false;
  }
  if (!state.active) {
    state.active = true;
    state.elapsedSeconds = 0;
    return true;
  }

  state.elapsedSeconds += dt;
  if (state.elapsedSeconds < periodSeconds) return false;
  state.elapsedSeconds %= periodSeconds;
  return true;
}
