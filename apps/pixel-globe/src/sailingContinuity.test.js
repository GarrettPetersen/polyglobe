import assert from "node:assert/strict";
import test from "node:test";
import { sailingCorrectionDistancePx, sailingStepCorrectionDistancePx } from "./sailingContinuity.js";
test("sailing diagnostics separate chart correction from legitimate integrated travel", () => {
  assert.equal(sailingCorrectionDistancePx([1, 0, 0], [1, 0, 0], 1000), 0);
  assert.equal(sailingCorrectionDistancePx([1, 0, 0], [1, 0.01, 0], 1000), 10);
  assert.equal(sailingCorrectionDistancePx([1, 0, 0], [1, 0.01, 0], 2000), 20);
  assert.throws(() => sailingCorrectionDistancePx([1, NaN, 0], [1, 0, 0], 1000), /finite/);
});

test("wave-driven chart settlement is separated from a new sailing discontinuity", () => {
  const input = { previousPosition: [1, 0, 0], previousChartPosition: [1, 0.0091, 0],
    integratedPosition: [1, 0.0011, 0], reconciledPosition: [1, 0.0102, 0], pixelsPerRadian: 1000 };
  assert.ok(sailingStepCorrectionDistancePx(input) < 1e-9);
  assert.ok(sailingStepCorrectionDistancePx({ ...input, reconciledPosition: [1, 0.0252, 0] }) > 14.9);
});
