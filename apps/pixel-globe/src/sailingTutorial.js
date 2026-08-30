import {
  CONTROL_SCHEME_ABSOLUTE,
  CONTROL_SCHEME_RELATIVE,
  normalizeControlScheme
} from "./controlScheme.js";
import { TERRAIN_WEATHER_MODE_STATIC } from "./terrainWeatherPolicy.js";

export const STALL_TUTORIAL_TRIGGER_SECONDS = 5;
export const EARLY_SAILING_HELP_TRIGGER_SECONDS = 10;
export const EARLY_SAILING_HELP_WINDOW_SECONDS = 90;
export const EARLY_SAILING_HELP_MOVEMENT_PX_PER_SECOND = 1;

const SAILING_HELP_INPUT_MODES = new Set(["touch", "mouse", "keyboard", "controller"]);
const SAILING_HELP_DIAGRAMS = new Set(["steer", "tack", "row", "haul"]);

export function sailingTutorialTerrainKind(diagram, normalizedX, normalizedY) {
  if (!SAILING_HELP_DIAGRAMS.has(diagram)) {
    throw new Error(`Unknown sailing tutorial diagram: ${diagram}`);
  }
  if (!Number.isFinite(normalizedX) || !Number.isFinite(normalizedY)) {
    throw new Error("Sailing tutorial terrain requires finite coordinates");
  }
  if (diagram !== "haul") return "deep-water";

  const channelCenterY = 0.56 - normalizedX * 0.08;
  const channelHalfWidth = 0.1 + normalizedX * normalizedX * 0.36;
  const channelMargin = Math.min(
    normalizedX - 0.14,
    channelHalfWidth - Math.abs(normalizedY - channelCenterY)
  );
  if (channelMargin <= 0) return "land";
  return channelMargin < 0.1 ? "coastal-water" : "deep-water";
}

export function sailingTutorialTerrainRow(diagram, normalizedX, normalizedY) {
  const kind = sailingTutorialTerrainKind(diagram, normalizedX, normalizedY);
  const base = {
    e: 0,
    h: 0,
    latitudeDeg: 35,
    weatherMode: TERRAIN_WEATHER_MODE_STATIC
  };
  if (kind === "land") return Object.freeze({ ...base, t: "land" });
  if (kind === "coastal-water") return Object.freeze({ ...base, t: "beach", e: -0.1 });
  if (kind === "deep-water") {
    return Object.freeze({ ...base, t: "water", e: -0.2, waterDepthBand: 2 });
  }
  throw new Error(`Unknown sailing tutorial terrain kind: ${kind}`);
}

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

export function sailingHelpPages(inputMode, controlScheme = CONTROL_SCHEME_ABSOLUTE) {
  if (!SAILING_HELP_INPUT_MODES.has(inputMode)) {
    throw new Error(`Unknown sailing help input mode: ${inputMode}`);
  }
  const normalizedControlScheme = normalizeControlScheme(controlScheme);
  const steeringCopy = {
    touch: "Touch and hold anywhere around your ship. The bow turns toward your finger. Keep holding while it sails.",
    mouse: "Click and hold anywhere around your ship. The bow turns toward the pointer. Keep holding while it sails.",
    keyboard: "Press and hold WASD or an arrow key. The bow turns toward that direction. Keep holding while it sails.",
    controller: "Tilt and hold the left stick. The bow turns toward that direction. Keep holding while it sails."
  };
  const haulingCopy = {
    touch: "If wind pins you against a riverbank or coast, steer toward open water. Your crew immediately begins to haul along the shore, very slowly.",
    mouse: "If wind pins you against a riverbank or coast, steer toward open water. Your crew immediately begins to haul along the shore, very slowly.",
    keyboard: "If wind pins you against a riverbank or coast, steer toward open water. Your crew immediately begins to haul along the shore, very slowly.",
    controller: "If wind pins you against a riverbank or coast, steer toward open water. Your crew immediately begins to haul along the shore, very slowly."
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
      title: "ROWING",
      diagram: "row",
      body: rowingTutorialMessage(inputMode, normalizedControlScheme)
    },
    {
      title: "ESCAPE THE SHORE",
      diagram: "haul",
      body: haulingCopy[inputMode]
    }
  ];
}

export function rowingTutorialMessage(inputMode, controlScheme = CONTROL_SCHEME_ABSOLUTE) {
  if (!SAILING_HELP_INPUT_MODES.has(inputMode)) {
    throw new Error(`Unknown sailing help input mode: ${inputMode}`);
  }
  const normalizedControlScheme = normalizeControlScheme(controlScheme);
  if (inputMode === "touch") {
    return "On an oared ship, hold ahead to row or behind to reverse. Hold to either side while stopped to turn in place. Release to rest; more rowers are stronger but eat more.";
  }
  if (inputMode === "mouse") {
    return "On an oared ship, hold ahead to row or behind to reverse. Hold to either side while stopped to turn in place. Release to rest; more rowers are stronger but eat more.";
  }
  if (inputMode === "keyboard") {
    return normalizedControlScheme === CONTROL_SCHEME_RELATIVE
      ? "On an oared ship, hold forward to row, back to reverse, or left/right while stopped to turn in place. Release to rest; more rowers are stronger but eat more."
      : "On an oared ship, hold toward the bow to row, behind it to reverse, or to either side while stopped to turn in place. Release to rest; more rowers are stronger but eat more.";
  }
  return normalizedControlScheme === CONTROL_SCHEME_RELATIVE
    ? "On an oared ship, hold the left stick forward to row, back to reverse, or left/right while stopped to turn in place. Release to rest; more rowers are stronger but eat more."
    : "On an oared ship, hold the left stick toward the bow to row, behind it to reverse, or to either side while stopped to turn in place. Release to rest; more rowers are stronger but eat more.";
}

function assertEarlySailingHelpState(state) {
  if (!state || !Number.isFinite(state.earlyWindowSeconds) || !Number.isFinite(state.lowMovementSeconds)) {
    throw new Error("Invalid early sailing help state");
  }
}
