const ACTION_SET_NAMES = Object.freeze(["Sailing", "Menus"]);

const DIGITAL_BUTTONS = Object.freeze({
  confirm: 0,
  back: 1,
  anchor: 2,
  secondary: 3,
  fire_port: 4,
  previous_page: 4,
  fire_starboard: 5,
  next_page: 5,
  cycle_target: 8,
  captain_menu: 9
});

exportForCommonJs();

function createSteamInputService(input) {
  assertInputApi(input);
  const actionSets = Object.fromEntries(ACTION_SET_NAMES.map((name) => [name, input.getActionSet(name)]));
  const digitalActions = Object.fromEntries(
    Object.keys(DIGITAL_BUTTONS).map((name) => [name, input.getDigitalAction(name)])
  );
  const analogActions = Object.freeze({
    steer: input.getAnalogAction("steer"),
    navigate: input.getAnalogAction("navigate"),
    scroll: input.getAnalogAction("scroll")
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
    const actionNames = activeActionSet === "Menus"
      ? ["confirm", "back", "secondary", "previous_page", "next_page"]
      : ["confirm", "back", "anchor", "secondary", "fire_port", "fire_starboard", "cycle_target", "captain_menu"];
    for (const name of actionNames) {
      buttons[DIGITAL_BUTTONS[name]] = controller.isDigitalActionPressed(digitalActions[name]) ? 1 : 0;
    }
    const primary = controller.getAnalogActionVector(
      analogActions[activeActionSet === "Menus" ? "navigate" : "steer"]
    );
    const scroll = activeActionSet === "Menus"
      ? controller.getAnalogActionVector(analogActions.scroll)
      : { x: 0, y: 0 };
    return Object.freeze({
      connected: true,
      id: `Steam Input ${controller.getType()}`,
      index: 0,
      inputType: controller.getType(),
      axes: [normalizedAxis(primary.x), screenAxis(primary.y), normalizedAxis(scroll.x), screenAxis(scroll.y)],
      buttons
    });
  }

  return Object.freeze({ setActionSet, snapshot });
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

function exportForCommonJs() {
  module.exports = { ACTION_SET_NAMES, createSteamInputService };
}
