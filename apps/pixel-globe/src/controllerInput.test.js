import assert from "node:assert/strict";
import test from "node:test";
import { gamepadControlFrame } from "./controllerInput.js";

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
  const first = gamepadControlFrame(pad({ pressed: [0, 4, 9, 13] }));
  assert.deepEqual(first.actions, ["confirm", "firePort", "menu", "down"]);
  const held = gamepadControlFrame(pad({ pressed: [0, 4, 9, 13] }), first.buttons);
  assert.deepEqual(held.actions, []);
});

test("either shoulder or trigger maps to one broadside action", () => {
  const frame = gamepadControlFrame(pad({ pressed: [4, 6, 5, 7] }));
  assert.deepEqual(frame.actions, ["firePort", "fireStarboard"]);
});
