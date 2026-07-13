export const STALL_TUTORIAL_TRIGGER_SECONDS = 5;
export const EARLY_SAILING_HELP_TRIGGER_SECONDS = 10;
export const EARLY_SAILING_HELP_WINDOW_SECONDS = 90;
export const EARLY_SAILING_HELP_MOVEMENT_PX_PER_SECOND = 1;

const SAILING_HELP_INPUT_MODES = new Set(["touch", "mouse", "keyboard", "controller"]);

export function createSailingTutorialState(options = {}) {
  const restoredWindowSeconds = Number.isFinite(options.earlyWindowSeconds)
    ? Math.max(0, Math.min(EARLY_SAILING_HELP_WINDOW_SECONDS, options.earlyWindowSeconds))
    : 0;
  return {
    activeStallSeconds: 0,
    earlyWindowSeconds: restoredWindowSeconds,
    lowMovementSeconds: 0
  };
}

export function updateSailingTutorialState(state, input) {
  if (!state || !Number.isFinite(state.activeStallSeconds)) {
    throw new Error("Invalid sailing tutorial state");
  }
  if (!Number.isFinite(input?.dt) || input.dt < 0) {
    throw new Error("Sailing tutorial requires a valid frame duration");
  }

  if (input.alreadyShown || !input.eligible || !input.stalled) {
    state.activeStallSeconds = 0;
    return false;
  }

  state.activeStallSeconds += input.dt;
  if (state.activeStallSeconds < STALL_TUTORIAL_TRIGGER_SECONDS) return false;
  state.activeStallSeconds = 0;
  return true;
}

export function updateEarlySailingHelpState(state, input) {
  assertEarlySailingHelpState(state);
  if (!Number.isFinite(input?.dt) || input.dt < 0) {
    throw new Error("Early sailing help requires a valid frame duration");
  }
  if (!Number.isFinite(input?.movedPx) || input.movedPx < 0) {
    throw new Error("Early sailing help requires a valid movement distance");
  }

  if (input.alreadyShown) {
    state.lowMovementSeconds = 0;
    return false;
  }
  if (!input.eligible) {
    state.lowMovementSeconds = 0;
    return false;
  }
  if (state.earlyWindowSeconds >= EARLY_SAILING_HELP_WINDOW_SECONDS) {
    state.lowMovementSeconds = 0;
    return false;
  }

  const countedDt = Math.min(
    input.dt,
    EARLY_SAILING_HELP_WINDOW_SECONDS - state.earlyWindowSeconds
  );
  state.earlyWindowSeconds += countedDt;
  const movedEnough = countedDt > 0 &&
    input.movedPx / countedDt > EARLY_SAILING_HELP_MOVEMENT_PX_PER_SECOND;
  state.lowMovementSeconds = movedEnough ? 0 : state.lowMovementSeconds + countedDt;

  if (state.lowMovementSeconds >= EARLY_SAILING_HELP_TRIGGER_SECONDS) {
    state.lowMovementSeconds = 0;
    return true;
  }
  if (state.earlyWindowSeconds >= EARLY_SAILING_HELP_WINDOW_SECONDS) {
    state.lowMovementSeconds = 0;
  }
  return false;
}

export function earlySailingHelpWindowIsActive(state) {
  assertEarlySailingHelpState(state);
  return state.earlyWindowSeconds < EARLY_SAILING_HELP_WINDOW_SECONDS;
}

export function sailingHelpPages(inputMode) {
  if (!SAILING_HELP_INPUT_MODES.has(inputMode)) {
    throw new Error(`Unknown sailing help input mode: ${inputMode}`);
  }
  const steeringCopy = {
    touch: "Touch and hold anywhere around your ship. The bow turns toward your finger. Keep holding while it sails.",
    mouse: "Click and hold anywhere around your ship. The bow turns toward the pointer. Keep holding while it sails.",
    keyboard: "Press and hold WASD or an arrow key. The bow turns toward that direction. Keep holding while it sails.",
    controller: "Tilt and hold the left stick. The bow turns toward that direction. Keep holding while it sails."
  };
  const haulingCopy = {
    touch: "If a riverbank or coast traps you, touch and hold toward open water. Your crew will haul along the shore, very slowly.",
    mouse: "If a riverbank or coast traps you, click and hold toward open water. Your crew will haul along the shore, very slowly.",
    keyboard: "If a riverbank or coast traps you, hold a direction key toward open water. Your crew will haul along the shore, very slowly.",
    controller: "If a riverbank or coast traps you, hold the left stick toward open water. Your crew will haul along the shore, very slowly."
  };
  return [
    {
      title: "TURN AND SAIL",
      diagram: "steer",
      body: steeringCopy[inputMode]
    },
    {
      title: "SAILING UPWIND",
      diagram: "tack",
      body: "Most sailing ships cannot point straight into the wind. Aim to either side, then cross back and forth. This zigzag is called tacking."
    },
    {
      title: "ESCAPE THE SHORE",
      diagram: "haul",
      body: haulingCopy[inputMode]
    }
  ];
}

function assertEarlySailingHelpState(state) {
  if (!state || !Number.isFinite(state.earlyWindowSeconds) || !Number.isFinite(state.lowMovementSeconds)) {
    throw new Error("Invalid early sailing help state");
  }
}
