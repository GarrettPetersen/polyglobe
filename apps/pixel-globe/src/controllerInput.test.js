import assert from "node:assert/strict";
import test from "node:test";
import { gamepadControlFrame, gamepadMenuNavigationFrame } from "./controllerInput.js";

function pad({ axes = [0, 0], pressed = [] } = {}) {
  return {
    axes,
    buttons: Array.from({ length: 16 }, (_, index) => ({ pressed: pressed.includes(index), value: 0 }))
  };
}

test("gamepad stick produces normalized world steering outside the deadzone", () => {
  assert.equal(gamepadControlFrame(pad({ axes: [0.1, 0.1] })).steering, null);
  const frame = gamepadControlFrame(pad({ axes: [0.6, -0.8] }));
  assert.deepEqual(frame.steering, { dx: 0.6, dy: 0.8, strength: 1 });
});

test("gamepad buttons emit semantic actions only on their pressed edge", () => {
  const first = gamepadControlFrame(pad({ pressed: [0, 3, 4, 8, 9] }));
  assert.deepEqual(first.actions, ["confirm", "secondary", "firePort", "cycleTarget", "menu"]);
  const held = gamepadControlFrame(pad({ pressed: [0, 3, 4, 8, 9] }), first.buttons);
  assert.deepEqual(held.actions, []);
});

test("either shoulder or trigger maps to one broadside action", () => {
  const frame = gamepadControlFrame(pad({ pressed: [4, 6, 5, 7] }));
  assert.deepEqual(frame.actions, ["firePort", "fireStarboard"]);
});

test("the d-pad steers when the left stick is centered", () => {
  const steering = gamepadControlFrame(pad({ pressed: [12, 15] })).steering;
  assert.ok(Math.abs(steering.dx - Math.SQRT1_2) < 1e-12);
  assert.ok(Math.abs(steering.dy - Math.SQRT1_2) < 1e-12);
  assert.equal(steering.strength, 1);
});

test("menu navigation supports d-pad and stick edge presses with held repeat", () => {
  const dpad = pad({ pressed: [13] });
  const first = gamepadMenuNavigationFrame(dpad, null, 1000);
  assert.equal(first.action, "down");
  assert.equal(first.source, "dpad");
  assert.equal(gamepadMenuNavigationFrame(dpad, first.state, 1200).action, null);
  const repeated = gamepadMenuNavigationFrame(dpad, first.state, 1360);
  assert.equal(repeated.action, "down");

  const released = gamepadMenuNavigationFrame(pad(), repeated.state, 1400);
  assert.equal(released.action, null);
  const stick = gamepadMenuNavigationFrame(pad({ axes: [-0.9, 0.1] }), released.state, 1410);
  assert.equal(stick.action, "left");
  assert.equal(stick.source, "stick");
});

test("right-stick navigation can exclude the d-pad", () => {
  const frame = gamepadMenuNavigationFrame(
    pad({ axes: [0, 0, 0.1, -0.8], pressed: [13] }),
    null,
    100,
    { allowDpad: false, stickAxes: [2, 3] }
  );
  assert.equal(frame.action, "up");
  assert.equal(frame.source, "stick");
});
