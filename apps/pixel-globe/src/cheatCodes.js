import { recordDiscovery, validateGameState } from "./gameState.js";

export const CHEAT_CODE_DISCOVER_ALL = "discoverall";
export const CHEAT_CODE_MILLION_DOUBLOONS = "milliondb";
export const CHEAT_COMMAND_DISCOVER_ALL = "discover-all";
export const CHEAT_COMMAND_MILLION_DOUBLOONS = "million-doubloons";
export const CHEAT_MILLION_DOUBLOONS = 1_000_000;

const MAX_CHEAT_CODE_LENGTH = 24;
const CHEAT_COMMANDS = new Map([
  [CHEAT_CODE_DISCOVER_ALL, CHEAT_COMMAND_DISCOVER_ALL],
  [CHEAT_CODE_MILLION_DOUBLOONS, CHEAT_COMMAND_MILLION_DOUBLOONS]
]);

export function createCheatCodeInputState() {
  return { active: false, buffer: "" };
}

export function processCheatCodeKey(state, event) {
  assertCheatCodeInputState(state);
  if (!event || typeof event.key !== "string") throw new Error("Cheat code input requires a keyboard event");
  if (!state.active) {
    if (!isCheatPromptKey(event)) return { handled: false, status: null, command: null };
    state.active = true;
    state.buffer = "";
    return { handled: true, status: "opened", command: null };
  }
  if (event.key === "Escape") {
    resetCheatCodeInput(state);
    return { handled: true, status: "canceled", command: null };
  }
  if (event.key === "Backspace") {
    state.buffer = state.buffer.slice(0, -1);
    return { handled: true, status: "edited", command: null };
  }
  if (event.key === "Enter") {
    const code = state.buffer;
    const command = CHEAT_COMMANDS.get(code) || null;
    resetCheatCodeInput(state);
    return { handled: true, status: command ? "accepted" : "unknown", command, code };
  }
  if (event.key.length === 1 && /^[a-z0-9]$/i.test(event.key)) {
    if (state.buffer.length < MAX_CHEAT_CODE_LENGTH) state.buffer += event.key.toLowerCase();
    return { handled: true, status: "edited", command: null };
  }
  return { handled: true, status: null, command: null };
}

export function grantAllDiscoveriesForCheat(state, discoveryCatalog) {
  validateGameState(state);
  if (!Array.isArray(discoveryCatalog) || discoveryCatalog.length === 0) {
    throw new Error("Discover-all cheat requires the live discovery catalog");
  }
  const pendingBeforeCheat = [...state.memory.pendingDiscoveryPortDialogueIds];
  let granted = 0;
  for (const discovery of discoveryCatalog) {
    if (recordDiscovery(state, discovery)) granted += 1;
  }
  state.memory.pendingDiscoveryPortDialogueIds = pendingBeforeCheat;
  validateGameState(state);
  return { granted, total: discoveryCatalog.length };
}

export function grantMillionDoubloonsForCheat(state) {
  validateGameState(state);
  const previous = state.doubloons;
  state.doubloons = CHEAT_MILLION_DOUBLOONS;
  validateGameState(state);
  return { previous, current: state.doubloons };
}

function isCheatPromptKey(event) {
  return (event.code === "Backquote" || event.key === "`" || event.key === "~" ||
    event.code === "F8" || event.key === "F8") &&
    !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey;
}

function resetCheatCodeInput(state) {
  state.active = false;
  state.buffer = "";
}

function assertCheatCodeInputState(state) {
  if (!state || typeof state.active !== "boolean" || typeof state.buffer !== "string") {
    throw new Error("Invalid cheat code input state");
  }
}
