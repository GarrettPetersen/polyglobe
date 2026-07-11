import assert from "node:assert/strict";
import test from "node:test";

import { flagWaveColumnOffsets } from "./flagAnimation.js";

test("flag waves stay attached to the pole and within one pixel", () => {
  for (const phase of [0, Math.PI / 3, Math.PI, Math.PI * 1.7]) {
    const offsets = flagWaveColumnOffsets(12, phase, 1);
    assert.equal(offsets.length, 12);
    assert.equal(offsets[0], 0);
    assert.ok(offsets.every((offset) => Number.isInteger(offset) && Math.abs(offset) <= 1));
  }
});

test("flag wave advances through visibly different pixel poses", () => {
  assert.notDeepEqual(
    flagWaveColumnOffsets(12, 0, 1),
    flagWaveColumnOffsets(12, Math.PI / 2, 1)
  );
});
