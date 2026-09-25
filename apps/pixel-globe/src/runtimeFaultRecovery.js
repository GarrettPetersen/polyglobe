import { isLayoutPresentationFailure } from "./layoutPresentationFailure.js";

export const RUNTIME_FAULT_REPEAT_WINDOW_MS = 2_000;
export const RUNTIME_SKIP_SAVE_PREPARATION_KEY = "marque-and-reprisal.skip-save-preparation-once";

export class UnrecoverableGameDataError extends Error {
  constructor(message) {
    if (typeof message !== "string" || message.length === 0) {
      throw new Error("Unrecoverable game data requires a message");
    }
    super(message);
    this.name = "UnrecoverableGameDataError";
  }
}

export function isUnrecoverableGameDataFailure(error) {
  return error instanceof Error && error.name === "UnrecoverableGameDataError";
}

// Display and formatting failures always continue. The title screen is only
// for saved data that cannot be repaired in memory.
export function runtimeFaultRecoveryAction(error) {
  if (isLayoutPresentationFailure(error)) return "continue-frame";
  if (isUnrecoverableGameDataFailure(error)) return "reload-title";
  return "continue-frame";
}

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
    action: runtimeFaultRecoveryAction(error),
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

export function requestSkipAutomaticSavePreparation(storage) {
  requireSessionStorage(storage);
  storage.setItem(RUNTIME_SKIP_SAVE_PREPARATION_KEY, "true");
}

export function consumeSkipAutomaticSavePreparation(storage) {
  requireSessionStorage(storage);
  const requested = shouldSkipAutomaticSavePreparation(storage);
  storage.removeItem(RUNTIME_SKIP_SAVE_PREPARATION_KEY);
  return requested;
}

export function shouldSkipAutomaticSavePreparation(storage) {
  requireSessionStorage(storage);
  return storage.getItem(RUNTIME_SKIP_SAVE_PREPARATION_KEY) === "true";
}

function assertRecoveryState(state) {
  if (!state || !Object.hasOwn(state, "signature") ||
      !(Number.isFinite(state.lastIncidentAtMs) || state.lastIncidentAtMs === -Infinity) ||
      !Number.isInteger(state.consecutiveIncidents) || state.consecutiveIncidents < 0) {
    throw new Error("Runtime fault recovery state is invalid");
  }
}

function requireSessionStorage(storage) {
  if (!storage || typeof storage.getItem !== "function" ||
      typeof storage.setItem !== "function" || typeof storage.removeItem !== "function") {
    throw new Error("Runtime save recovery requires session storage");
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
