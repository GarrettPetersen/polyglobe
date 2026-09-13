const assert = require("node:assert/strict");
const test = require("node:test");

const { createSteamInputService, initializeSteamInput } = require("./steamInput.cjs");

test("Steam Input registers the manifest before initialization", () => {
  const harness = inputHarness();
  const calls = [];
  harness.input.init = () => calls.push("init");
  const nativeApi = { setInputActionManifest: path => calls.push(path) };
  const service = initializeSteamInput({ input: harness.input, nativeApi, manifestPath: "/game/actions.vdf" });
  assert.deepEqual(calls, ["/game/actions.vdf", "init"]);
  assert.ok(service.snapshot());
});

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

test("Steam Input rejects missing action handles when a controller is used", () => {
  const harness = inputHarness();
  harness.input.getDigitalAction = (name) => name === "menu_confirm" ? 0n : name;
  assert.throws(
    () => createSteamInputService(harness.input).snapshot(),
    /no handle for digital action menu_confirm/
  );
});

test("keyboard-only startup never queries unavailable Steam action mappings", () => {
  const harness = inputHarness();
  harness.input.getControllers = () => [];
  for (const method of ["getActionSet", "getDigitalAction", "getAnalogAction"]) {
    harness.input[method] = () => assert.fail("No controller mapping is available");
  }
  const service = createSteamInputService(harness.input);
  assert.equal(service.snapshot(), null);
  service.setActionSet("Sailing");
  assert.equal(service.snapshot(), null);
});

test("hotplug resolves handles once and reacquires them after disconnect", () => {
  const harness = inputHarness();
  const connected = harness.input.getControllers;
  const getActionSet = harness.input.getActionSet;
  let lookups = 0;
  harness.input.getActionSet = name => { lookups++; return getActionSet(name); };
  harness.input.getControllers = () => [];
  const service = createSteamInputService(harness.input);
  service.setActionSet("Sailing");
  assert.equal(service.snapshot(), null);
  assert.equal(lookups, 0);
  harness.input.getControllers = connected;
  service.snapshot();
  service.snapshot();
  assert.equal(lookups, 2);
  assert.equal(harness.activeSets.at(-1), "set:Sailing");
  harness.input.getControllers = () => [];
  assert.equal(service.snapshot(), null);
  harness.input.getControllers = connected;
  service.snapshot();
  assert.equal(lookups, 4);
});
