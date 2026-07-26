import assert from "node:assert/strict";
import test from "node:test";

import {
  CONTROL_SCHEME_ABSOLUTE,
  CONTROL_SCHEME_RELATIVE,
  nextControlScheme,
  normalizeControlScheme,
  relativeHeadingAngle,
  steeringIntentForScheme
} from "./controlScheme.js";

test("control scheme defaults to absolute and rejects corrupt stored values", () => {
  assert.equal(normalizeControlScheme(null), CONTROL_SCHEME_ABSOLUTE);
  assert.equal(normalizeControlScheme(CONTROL_SCHEME_RELATIVE), CONTROL_SCHEME_RELATIVE);
  assert.throws(() => normalizeControlScheme("tank-ish"), /Unknown control scheme/);
});

test("control scheme selection cycles in either direction", () => {
  assert.equal(nextControlScheme(CONTROL_SCHEME_ABSOLUTE), CONTROL_SCHEME_RELATIVE);
  assert.equal(nextControlScheme(CONTROL_SCHEME_RELATIVE), CONTROL_SCHEME_ABSOLUTE);
  assert.equal(nextControlScheme(CONTROL_SCHEME_ABSOLUTE, -1), CONTROL_SCHEME_RELATIVE);
});

test("absolute steering combines direction keys and controller axes", () => {
  assert.deepEqual(steeringIntentForScheme({
    scheme: CONTROL_SCHEME_ABSOLUTE,
    right: true,
    up: true,
    controllerX: -0.25,
    controllerY: 0.5
  }), {
    absoluteX: 0.75,
    absoluteY: 1.5,
    relativeTurn: 0,
    relativeForward: false
  });
});

test("relative steering turns laterally and treats forward as a hauling command", () => {
  assert.deepEqual(steeringIntentForScheme({
    scheme: CONTROL_SCHEME_RELATIVE,
    left: true,
    up: true,
    controllerY: 1
  }), {
    absoluteX: 0,
    absoluteY: 0,
    relativeTurn: -1,
    relativeForward: true
  });
  assert.equal(
    steeringIntentForScheme({
      scheme: CONTROL_SCHEME_RELATIVE,
      right: true,
      controllerX: -1
    }).relativeTurn,
    0
  );
  assert.equal(
    steeringIntentForScheme({
      scheme: CONTROL_SCHEME_RELATIVE,
      down: true,
      controllerY: -1
    }).relativeForward,
    false
  );
});

test("relative right turns clockwise in screen coordinates", () => {
  assert.equal(relativeHeadingAngle(0, 1), Math.PI / 2);
  assert.equal(relativeHeadingAngle(0, -1), -Math.PI / 2);
  assert.equal(relativeHeadingAngle(0, 0), null);
});
