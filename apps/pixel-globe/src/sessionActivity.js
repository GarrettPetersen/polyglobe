export const SESSION_IDLE_TIMEOUT_MS = 5 * 60 * 1000;

export function createSessionActivityState(startedAtMs, {
  idleTimeoutMs = SESSION_IDLE_TIMEOUT_MS
} = {}) {
  assertTimestamp(startedAtMs, "session start");
  if (!Number.isFinite(idleTimeoutMs) || idleTimeoutMs <= 0) {
    throw new Error(`Invalid session idle timeout: ${idleTimeoutMs}`);
  }
  return {
    idleTimeoutMs,
    lastActivityMs: startedAtMs
  };
}

export function noteSessionActivity(state, nowMs) {
  assertState(state);
  assertTimestamp(nowMs, "session activity");
  if (nowMs < state.lastActivityMs) {
    throw new Error(`Session activity moved backwards: ${nowMs} < ${state.lastActivityMs}`);
  }
  state.lastActivityMs = nowMs;
}

export function activeSessionFrameSeconds(state, {
  nowMs,
  elapsedSeconds,
  continuousInput = false
}) {
  assertState(state);
  assertTimestamp(nowMs, "session frame");
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 0) {
    throw new Error(`Invalid session frame duration: ${elapsedSeconds}`);
  }
  if (typeof continuousInput !== "boolean") {
    throw new Error("Session continuous input flag must be boolean");
  }
  if (continuousInput) noteSessionActivity(state, nowMs);
  const boundedElapsedSeconds = Math.min(elapsedSeconds, state.idleTimeoutMs / 1000);
  const frameStartMs = nowMs - boundedElapsedSeconds * 1000;
  const activeUntilMs = state.lastActivityMs + state.idleTimeoutMs;
  const activeMs = Math.max(0, Math.min(nowMs, activeUntilMs) - frameStartMs);
  return Math.min(boundedElapsedSeconds, activeMs / 1000);
}

function assertState(state) {
  if (!state || typeof state !== "object") throw new Error("Session activity state is required");
  assertTimestamp(state.lastActivityMs, "last session activity");
  if (!Number.isFinite(state.idleTimeoutMs) || state.idleTimeoutMs <= 0) {
    throw new Error(`Invalid session idle timeout: ${state.idleTimeoutMs}`);
  }
}

function assertTimestamp(value, label) {
  if (!Number.isFinite(value) || value < 0) throw new Error(`Invalid ${label} timestamp: ${value}`);
}
