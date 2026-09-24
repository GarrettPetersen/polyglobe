export function createAutoRowCommandState() {
  return { aheadLatched: false };
}

export function updateAutoRowCommand(state, {
  enabled,
  relativeControls,
  canRow,
  forwardHeld,
  reverseHeld
}) {
  assertAutoRowCommandState(state);
  for (const [label, value] of Object.entries({
    enabled,
    relativeControls,
    canRow,
    forwardHeld,
    reverseHeld
  })) {
    if (typeof value !== "boolean") throw new Error(`Auto-row ${label} must be boolean`);
  }

  if (!enabled || !relativeControls || !canRow) {
    state.aheadLatched = false;
    return Object.freeze({ ahead: forwardHeld, astern: reverseHeld });
  }
  if (reverseHeld) state.aheadLatched = false;
  else if (forwardHeld) state.aheadLatched = true;
  return Object.freeze({
    ahead: state.aheadLatched && !reverseHeld,
    astern: reverseHeld
  });
}

export function cancelAutoRowCommand(state) {
  assertAutoRowCommandState(state);
  const changed = state.aheadLatched;
  state.aheadLatched = false;
  return changed;
}

function assertAutoRowCommandState(state) {
  if (!state || typeof state.aheadLatched !== "boolean") {
    throw new Error("Invalid auto-row command state");
  }
}
