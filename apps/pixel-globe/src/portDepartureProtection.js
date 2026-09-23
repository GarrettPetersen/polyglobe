export const PORT_DEPARTURE_INVULNERABILITY_SECONDS = 3;

export function createPortDepartureProtection() {
  return { remainingSeconds: 0 };
}

export function activatePortDepartureProtection(state) {
  assertPortDepartureProtection(state);
  state.remainingSeconds = PORT_DEPARTURE_INVULNERABILITY_SECONDS;
}

export function advancePortDepartureProtection(state, elapsedSeconds) {
  assertPortDepartureProtection(state);
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 0) {
    throw new Error(`Invalid port departure protection duration: ${elapsedSeconds}`);
  }
  state.remainingSeconds = Math.max(0, state.remainingSeconds - elapsedSeconds);
  return state.remainingSeconds > 0;
}

export function portDepartureProtectionIsActive(state) {
  assertPortDepartureProtection(state);
  return state.remainingSeconds > 0;
}

function assertPortDepartureProtection(state) {
  if (!state || !Number.isFinite(state.remainingSeconds) || state.remainingSeconds < 0) {
    throw new Error("Invalid port departure protection state");
  }
}
