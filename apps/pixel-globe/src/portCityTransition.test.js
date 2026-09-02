import assert from "node:assert/strict";
import test from "node:test";

import {
  PORT_CITY_TRANSITION_DURATION_MS,
  portCityCircleWipeFrame
} from "./portCityTransition.js";

test("city entry expands from the overworld city sprite to cover the viewport", () => {
  const start = frame("enter", 0);
  const finish = frame("enter", PORT_CITY_TRANSITION_DURATION_MS);
  assert.equal(start.radius, 0);
  assert.equal(finish.complete, true);
  assert.ok(finish.radius > Math.hypot(455, 256) / 2);
});

test("city exit contracts back into the same city sprite", () => {
  const start = frame("exit", 0);
  const finish = frame("exit", PORT_CITY_TRANSITION_DURATION_MS);
  assert.ok(start.radius > 0);
  assert.equal(finish.radius, 0);
});

function frame(direction, nowMs) {
  return portCityCircleWipeFrame({
    direction,
    startedAtMs: 0,
    nowMs,
    centerX: 200,
    centerY: 120,
    viewportWidth: 455,
    viewportHeight: 256
  });
}
