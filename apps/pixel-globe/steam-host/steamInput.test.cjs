const assert = require("node:assert/strict");
const test = require("node:test");

const { createSteamInputService } = require("./steamInput.cjs");

function inputHarness() {
  const activeSets = [];
  const pressed = new Set(["menu_confirm", "previous_page"]);
  const controller = {
    activateActionSet: (handle) => activeSets.push(handle),
    isDigitalActionPressed: (handle) => pressed.has(handle),
    getAnalogActionVector: (handle) => handle === "navigate" ? { x: 0.25, y: 0.75 } : { x: -0.5, y: 0.5 },
    getType: () => "SteamDeckController"
  };
  return {
    activeSets,
    pressed,
    input: {
      getActionSet: (name) => `set:${name}`,
      getDigitalAction: (name) => name,
      getAnalogAction: (name) => name,
      getControllers: () => [controller]
    }
  };
}

test("Steam menu actions become the standard gamepad frame consumed by the game", () => {
  const harness = inputHarness();
  const service = createSteamInputService(harness.input);
  const frame = service.snapshot();
  assert.equal(harness.activeSets.at(-1), "set:Menus");
  assert.equal(frame.buttons[0], 1);
  assert.equal(frame.buttons[4], 1);
  assert.deepEqual(frame.axes, [0.25, -0.75, -0.5, -0.5]);
  assert.equal(frame.inputType, "SteamDeckController");
});

test("Steam sailing activates its own action set and rejects invented sets", () => {
  const harness = inputHarness();
  const service = createSteamInputService(harness.input);
  harness.pressed.add("steer_up");
  harness.pressed.add("steer_left");
  assert.equal(service.setActionSet("Sailing"), true);
  const frame = service.snapshot();
  assert.equal(harness.activeSets.at(-1), "set:Sailing");
  assert.deepEqual(frame.axes, [-1, -1, 0, 0]);
  assert.throws(() => service.setActionSet("Inventory"), /Unknown Steam Input action set/);
});

test("Steam Input rejects missing action handles at startup", () => {
  const harness = inputHarness();
  harness.input.getDigitalAction = (name) => name === "menu_confirm" ? 0n : name;
  assert.throws(
    () => createSteamInputService(harness.input),
    /no handle for digital action menu_confirm/
  );
});
