import assert from "node:assert/strict";
import test from "node:test";

import {
  UNDERWATER_REFRACTION_PERIOD_MS,
  UNDERWATER_REFRACTION_SHADER_TIME_COEFFICIENT,
  underwaterRefractionPhase
} from "./underwaterRefraction.js";

test("underwater refraction uses one slow nine-second cycle", () => {
  assert.equal(UNDERWATER_REFRACTION_PERIOD_MS, 9000);
  assert.equal(UNDERWATER_REFRACTION_SHADER_TIME_COEFFICIENT, 4 / 9000);
  assert.equal(underwaterRefractionPhase(0), 0);
  assert.ok(Math.abs(underwaterRefractionPhase(9000) - Math.PI * 2) < 1e-12);
});

test("underwater refraction rejects malformed time", () => {
  assert.throws(() => underwaterRefractionPhase(Number.NaN), /finite time/);
});
