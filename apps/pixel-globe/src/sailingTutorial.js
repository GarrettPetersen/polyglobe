export const STALL_TUTORIAL_TRIGGER_SECONDS = 5;

export function createSailingTutorialState() {
  return { activeStallSeconds: 0 };
}

export function updateSailingTutorialState(state, input) {
  if (!state || !Number.isFinite(state.activeStallSeconds)) {
    throw new Error("Invalid sailing tutorial state");
  }
  if (!Number.isFinite(input?.dt) || input.dt < 0) {
    throw new Error("Sailing tutorial requires a valid frame duration");
  }

  if (input.alreadyShown || !input.eligible || !input.activelySteering || !input.stalled) {
    state.activeStallSeconds = 0;
    return false;
  }

  state.activeStallSeconds += input.dt;
  if (state.activeStallSeconds < STALL_TUTORIAL_TRIGGER_SECONDS) return false;
  state.activeStallSeconds = 0;
  return true;
}
