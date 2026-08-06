const ACTION_SET_NAMES = Object.freeze(["Sailing", "Menus"]);

const DIGITAL_BUTTONS = Object.freeze({
  Sailing: Object.freeze({
    sailing_confirm: 0,
    sailing_back: 1,
    anchor: 2,
    sailing_secondary: 3,
    fire_port: 4,
    fire_starboard: 5,
    cycle_target: 8,
    captain_menu: 9
  }),
  Menus: Object.freeze({
    menu_confirm: 0,
    menu_back: 1,
    menu_secondary: 3,
    previous_page: 4,
    next_page: 5
  })
});

const DIGITAL_DIRECTIONS = Object.freeze({
  Sailing: Object.freeze({
    up: "steer_up",
    down: "steer_down",
    left: "steer_left",
    right: "steer_right"
  }),
  Menus: Object.freeze({
    up: "navigate_up",
    down: "navigate_down",
    left: "navigate_left",
    right: "navigate_right"
  })
});

exportForCommonJs();

function createSteamInputService(input) {
  assertInputApi(input);
  const actionSets = Object.fromEntries(ACTION_SET_NAMES.map((name) => [
    name,
    requiredActionHandle(input.getActionSet(name), `action set ${name}`)
  ]));
  const digitalActions = Object.fromEntries(
    [...new Set([
      ...Object.values(DIGITAL_BUTTONS).flatMap((buttons) => Object.keys(buttons)),
      ...Object.values(DIGITAL_DIRECTIONS).flatMap((directions) => Object.values(directions))
    ])].map((name) => [
      name,
      requiredActionHandle(input.getDigitalAction(name), `digital action ${name}`)
    ])
  );
  const analogActions = Object.freeze({
    steer: requiredActionHandle(input.getAnalogAction("steer"), "analog action steer"),
    navigate: requiredActionHandle(input.getAnalogAction("navigate"), "analog action navigate"),
    scroll: requiredActionHandle(input.getAnalogAction("scroll"), "analog action scroll")
  });
  let activeActionSet = "Menus";

  function setActionSet(name) {
    if (!ACTION_SET_NAMES.includes(name)) throw new Error(`Unknown Steam Input action set: ${name}`);
    activeActionSet = name;
    return true;
  }

  function snapshot() {
    const controller = input.getControllers()[0];
    if (!controller) return null;
    controller.activateActionSet(actionSets[activeActionSet]);
    const buttons = Array(16).fill(0);
    for (const [name, buttonIndex] of Object.entries(DIGITAL_BUTTONS[activeActionSet])) {
      buttons[buttonIndex] = controller.isDigitalActionPressed(digitalActions[name]) ? 1 : 0;
    }
    const primary = controller.getAnalogActionVector(
      analogActions[activeActionSet === "Menus" ? "navigate" : "steer"]
    );
    const directions = DIGITAL_DIRECTIONS[activeActionSet];
    const primaryX = normalizedAxis(
      primary.x +
        digitalActionValue(controller, digitalActions[directions.right]) -
        digitalActionValue(controller, digitalActions[directions.left])
    );
    const primaryY = normalizedAxis(
      primary.y +
        digitalActionValue(controller, digitalActions[directions.up]) -
        digitalActionValue(controller, digitalActions[directions.down])
    );
    const scroll = activeActionSet === "Menus"
      ? controller.getAnalogActionVector(analogActions.scroll)
      : { x: 0, y: 0 };
    return Object.freeze({
      connected: true,
      id: `Steam Input ${controller.getType()}`,
      index: 0,
      inputType: controller.getType(),
      axes: [primaryX, screenAxis(primaryY), normalizedAxis(scroll.x), screenAxis(scroll.y)],
      buttons
    });
  }

  return Object.freeze({ setActionSet, snapshot });
}

function digitalActionValue(controller, handle) {
  return controller.isDigitalActionPressed(handle) ? 1 : 0;
}

function normalizedAxis(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`Steam Input returned an invalid analog value: ${value}`);
  return Math.max(-1, Math.min(1, number));
}

function screenAxis(value) {
  const axis = normalizedAxis(value);
  return axis === 0 ? 0 : -axis;
}

function assertInputApi(input) {
  for (const method of ["getActionSet", "getDigitalAction", "getAnalogAction", "getControllers"]) {
    if (typeof input?.[method] !== "function") throw new Error(`Steam Input API has no ${method} function`);
  }
}

function requiredActionHandle(handle, label) {
  if (handle === null || handle === undefined || handle === 0 || handle === 0n || handle === "") {
    throw new Error(`Steam Input returned no handle for ${label}; check the bundled action manifest`);
  }
  return handle;
}

function exportForCommonJs() {
  module.exports = { ACTION_SET_NAMES, createSteamInputService };
}
