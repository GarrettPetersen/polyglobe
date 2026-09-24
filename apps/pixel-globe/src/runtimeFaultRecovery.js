export const RUNTIME_FAULT_REPEAT_WINDOW_MS = 2_000;

export function createRuntimeFaultRecoveryState() {
  return { signature: null, lastIncidentAtMs: -Infinity, consecutiveIncidents: 0 };
}

export function recordRuntimeFault(state, error, nowMs) {
  assertRecoveryState(state);
  if (!Number.isFinite(nowMs)) throw new Error(`Runtime fault recovery requires a finite time: ${nowMs}`);
  const signature = runtimeFaultSignature(error);
  const repeated = state.signature === signature &&
    nowMs - state.lastIncidentAtMs <= RUNTIME_FAULT_REPEAT_WINDOW_MS;
  state.signature = signature;
  state.lastIncidentAtMs = nowMs;
  state.consecutiveIncidents = repeated ? state.consecutiveIncidents + 1 : 1;
  return Object.freeze({
    action: state.consecutiveIncidents >= 2 ? "reload-title" : "retry-frame",
    signature,
    consecutiveIncidents: state.consecutiveIncidents
  });
}

export function recordRuntimeFrameSuccess(state) {
  assertRecoveryState(state);
  state.signature = null;
  state.lastIncidentAtMs = -Infinity;
  state.consecutiveIncidents = 0;
}

export function runtimeFaultSignature(error) {
  const normalized = error instanceof Error ? error : new Error(String(error));
  const stackSite = typeof normalized.stack === "string"
    ? normalized.stack.split("\n").slice(1, 3).join("\n").replace(/[?#][^\s):]+/g, "")
    : "";
  return fnv1a32(`${normalized.name}|${normalized.message}|${stackSite}`)
    .toString(16)
    .padStart(8, "0");
}

function assertRecoveryState(state) {
  if (!state || !Object.hasOwn(state, "signature") ||
      !(Number.isFinite(state.lastIncidentAtMs) || state.lastIncidentAtMs === -Infinity) ||
      !Number.isInteger(state.consecutiveIncidents) || state.consecutiveIncidents < 0) {
    throw new Error("Runtime fault recovery state is invalid");
  }
}

function fnv1a32(text) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}
