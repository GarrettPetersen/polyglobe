const BUTTON_ACTIONS = Object.freeze(new Map([
  [0, "confirm"],
  [1, "back"],
  [2, "anchor"],
  [3, "secondary"],
  [4, "firePort"],
  [5, "fireStarboard"],
  [6, "firePort"],
  [7, "fireStarboard"],
  [8, "cycleTarget"],
  [9, "menu"]
]));

const DPAD_UP = 12;
const DPAD_DOWN = 13;
const DPAD_LEFT = 14;
const DPAD_RIGHT = 15;
const DEFAULT_NAVIGATION_DEADZONE = 0.55;
const DEFAULT_NAVIGATION_REPEAT_DELAY_MS = 360;
const DEFAULT_NAVIGATION_REPEAT_INTERVAL_MS = 110;

export function gamepadControlFrame(gamepad, previousButtons = [], deadzone = 0.2) {
  if (!gamepad || typeof gamepad !== "object") {
    return { steering: null, steeringSource: null, actions: [], buttons: [] };
  }
  const buttons = Array.from(gamepad.buttons || [], (button) => buttonIsPressed(button));
  const actions = [];
  for (const [index, action] of BUTTON_ACTIONS) {
    if (buttons[index] && !previousButtons[index] && !actions.includes(action)) actions.push(action);
  }

  const analogX = Number(gamepad.axes?.[0]) || 0;
  const analogScreenY = Number(gamepad.axes?.[1]) || 0;
  const analogMagnitude = Math.hypot(analogX, analogScreenY);
  const dpadX = Number(buttons[DPAD_RIGHT]) - Number(buttons[DPAD_LEFT]);
  const dpadScreenY = Number(buttons[DPAD_DOWN]) - Number(buttons[DPAD_UP]);
  const usingAnalog = analogMagnitude > deadzone;
  const x = usingAnalog ? analogX : dpadX;
  const screenY = usingAnalog ? analogScreenY : dpadScreenY;
  const magnitude = Math.hypot(x, screenY);
  const steering = magnitude <= deadzone
    ? null
    : {
        dx: x / Math.max(1, magnitude),
        dy: -screenY / Math.max(1, magnitude),
        strength: usingAnalog
          ? Math.min(1, (magnitude - deadzone) / (1 - deadzone))
          : 1
      };
  return {
    steering,
    steeringSource: steering ? usingAnalog ? "stick" : "dpad" : null,
    actions,
    buttons
  };
}

export function gamepadMenuNavigationFrame(gamepad, previousState, nowMs, {
  allowDpad = true,
  allowStick = true,
  stickAxes = [0, 1],
  deadzone = DEFAULT_NAVIGATION_DEADZONE,
  repeatDelayMs = DEFAULT_NAVIGATION_REPEAT_DELAY_MS,
  repeatIntervalMs = DEFAULT_NAVIGATION_REPEAT_INTERVAL_MS
} = {}) {
  if (!Number.isFinite(nowMs) || nowMs < 0) throw new Error(`Invalid controller navigation time: ${nowMs}`);
  if (!Array.isArray(stickAxes) || stickAxes.length !== 2 ||
      !stickAxes.every((index) => Number.isInteger(index) && index >= 0)) {
    throw new Error("Controller navigation requires two stick axis indexes");
  }
  if (!Number.isFinite(deadzone) || deadzone <= 0 || deadzone >= 1) {
    throw new Error(`Invalid controller navigation deadzone: ${deadzone}`);
  }
  if (!Number.isFinite(repeatDelayMs) || repeatDelayMs < 0 ||
      !Number.isFinite(repeatIntervalMs) || repeatIntervalMs <= 0) {
    throw new Error("Invalid controller navigation repeat timing");
  }

  const intent = controllerNavigationIntent(gamepad, { allowDpad, allowStick, stickAxes, deadzone });
  if (!intent) {
    return {
      action: null,
      source: null,
      state: { intentKey: null, nextRepeatAtMs: 0 }
    };
  }

  const state = validNavigationState(previousState);
  const intentKey = `${intent.source}:${intent.action}`;
  if (state.intentKey !== intentKey) {
    return {
      action: intent.action,
      source: intent.source,
      state: { intentKey, nextRepeatAtMs: nowMs + repeatDelayMs }
    };
  }
  if (nowMs >= state.nextRepeatAtMs) {
    return {
      action: intent.action,
      source: intent.source,
      state: { intentKey, nextRepeatAtMs: nowMs + repeatIntervalMs }
    };
  }
  return {
    action: null,
    source: intent.source,
    state
  };
}

function controllerNavigationIntent(gamepad, { allowDpad, allowStick, stickAxes, deadzone }) {
  if (!gamepad || typeof gamepad !== "object") return null;
  if (allowDpad) {
    const buttons = Array.from(gamepad.buttons || [], (button) => buttonIsPressed(button));
    const horizontal = Number(buttons[DPAD_RIGHT]) - Number(buttons[DPAD_LEFT]);
    const vertical = Number(buttons[DPAD_DOWN]) - Number(buttons[DPAD_UP]);
    const action = cardinalDirection(horizontal, vertical);
    if (action) return { action, source: "dpad" };
  }
  if (!allowStick) return null;
  const horizontal = Number(gamepad.axes?.[stickAxes[0]]) || 0;
  const vertical = Number(gamepad.axes?.[stickAxes[1]]) || 0;
  if (Math.hypot(horizontal, vertical) <= deadzone) return null;
  const action = cardinalDirection(horizontal, vertical);
  return action ? { action, source: "stick" } : null;
}

function cardinalDirection(horizontal, vertical) {
  if (Math.abs(vertical) >= Math.abs(horizontal) && vertical !== 0) {
    return vertical > 0 ? "down" : "up";
  }
  if (horizontal !== 0) return horizontal > 0 ? "right" : "left";
  return null;
}

function validNavigationState(state) {
  if (!state || typeof state !== "object" ||
      (state.intentKey !== null && typeof state.intentKey !== "string") ||
      !Number.isFinite(state.nextRepeatAtMs) || state.nextRepeatAtMs < 0) {
    return { intentKey: null, nextRepeatAtMs: 0 };
  }
  return state;
}

function buttonIsPressed(button) {
  if (typeof button === "number") return button > 0.5;
  return button?.pressed === true || Number(button?.value) > 0.5;
}
