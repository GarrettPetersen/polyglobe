const BUTTON_ACTIONS = Object.freeze(new Map([
  [0, "confirm"],
  [1, "back"],
  [2, "anchor"],
  [4, "firePort"],
  [5, "fireStarboard"],
  [6, "firePort"],
  [7, "fireStarboard"],
  [9, "menu"],
  [12, "up"],
  [13, "down"],
  [14, "left"],
  [15, "right"]
]));

export function gamepadControlFrame(gamepad, previousButtons = [], deadzone = 0.2) {
  if (!gamepad || typeof gamepad !== "object") {
    return { steering: null, actions: [], buttons: [] };
  }
  const buttons = Array.from(gamepad.buttons || [], (button) => buttonIsPressed(button));
  const actions = [];
  for (const [index, action] of BUTTON_ACTIONS) {
    if (buttons[index] && !previousButtons[index] && !actions.includes(action)) actions.push(action);
  }

  const x = Number(gamepad.axes?.[0]) || 0;
  const screenY = Number(gamepad.axes?.[1]) || 0;
  const magnitude = Math.hypot(x, screenY);
  const steering = magnitude <= deadzone
    ? null
    : {
        dx: x / Math.max(1, magnitude),
        dy: -screenY / Math.max(1, magnitude),
        strength: Math.min(1, (magnitude - deadzone) / (1 - deadzone))
      };
  return { steering, actions, buttons };
}

function buttonIsPressed(button) {
  if (typeof button === "number") return button > 0.5;
  return button?.pressed === true || Number(button?.value) > 0.5;
}
