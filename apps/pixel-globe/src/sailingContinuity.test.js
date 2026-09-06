import assert from "node:assert/strict";
import test from "node:test";
import { sailingCorrectionDistancePx } from "./sailingContinuity.js";
test("sailing diagnostics separate chart correction from legitimate integrated travel", () => {
  assert.equal(sailingCorrectionDistancePx([1, 0, 0], [1, 0, 0], 1000), 0);
  assert.equal(sailingCorrectionDistancePx([1, 0, 0], [1, 0.01, 0], 1000), 10);
  assert.equal(sailingCorrectionDistancePx([1, 0, 0], [1, 0.01, 0], 2000), 20);
  assert.throws(() => sailingCorrectionDistancePx([1, NaN, 0], [1, 0, 0], 1000), /finite/);
});
