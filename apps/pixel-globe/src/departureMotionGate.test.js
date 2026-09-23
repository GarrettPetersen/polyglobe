import assert from "node:assert/strict";
import test from "node:test";

import {
  activateDepartureMotionGate,
  createDepartureMotionGate,
  departureMotionGateIsActive,
  departureMotionInputIsBlocked
} from "./departureMotionGate.js";

test("the first movement input releases a stopped departure", () => {
  const gate = createDepartureMotionGate();
  activateDepartureMotionGate(gate);

  assert.equal(departureMotionInputIsBlocked(gate, false), true, "the ship waits without input");
  assert.equal(departureMotionInputIsBlocked(gate, true), false, "the first input launches the ship");
  assert.equal(departureMotionGateIsActive(gate), false);
  assert.equal(departureMotionInputIsBlocked(gate, false), false);
});

test("reactivating the gate stops the ship until another movement input", () => {
  const gate = createDepartureMotionGate();
  activateDepartureMotionGate(gate);
  departureMotionInputIsBlocked(gate, true);

  activateDepartureMotionGate(gate);
  assert.equal(departureMotionInputIsBlocked(gate, false), true);
  assert.equal(departureMotionInputIsBlocked(gate, true), false);
});

test("departure motion gates reject malformed state and input", () => {
  assert.throws(() => activateDepartureMotionGate(null), /Invalid departure motion gate/);
  assert.throws(
    () => departureMotionInputIsBlocked(createDepartureMotionGate(), "yes"),
    /boolean steering state/
  );
});
