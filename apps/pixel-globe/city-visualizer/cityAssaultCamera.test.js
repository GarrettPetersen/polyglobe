import assert from "node:assert/strict";
import test from "node:test";
import { cityAssaultCameraTargetPosition } from "./cityAssaultCamera.js";

const unit = (side, position, alive = true) => ({ side, position, alive });

test("assault camera follows the landing force before centering the engagement", () => {
  assert.equal(cityAssaultCameraTargetPosition([
    unit("attacker", 0.08),
    unit("attacker", 0.12),
    unit("defender", 0.9)
  ]), 0.2);
  assert.ok(Math.abs(cityAssaultCameraTargetPosition([
    unit("attacker", 0.54),
    unit("defender", 0.66)
  ]) - 0.6) < 1e-9);
});

test("assault camera follows the surviving front and ignores fallen units", () => {
  assert.equal(cityAssaultCameraTargetPosition([
    unit("attacker", 0.7, false),
    unit("attacker", 0.42)
  ]), 0.42);
  assert.equal(cityAssaultCameraTargetPosition([unit("defender", 0.18)]), 0.18);
  assert.equal(cityAssaultCameraTargetPosition([]), null);
});

test("assault camera rejects malformed presentation units", () => {
  assert.throws(() => cityAssaultCameraTargetPosition(null), /unit list/);
  assert.throws(() => cityAssaultCameraTargetPosition([unit("pirate", 0.5)]), /invalid unit/);
  assert.throws(() => cityAssaultCameraTargetPosition([unit("attacker", 2)]), /invalid unit/);
});
