import assert from "node:assert/strict";
import test from "node:test";

import { flagWaveColumnOffsets } from "./flagAnimation.js";

test("flag waves stay attached to the pole and within one subtle pixel", () => {
  for (const phase of [0, Math.PI / 3, Math.PI, Math.PI * 1.7]) {
    const offsets = flagWaveColumnOffsets(12, phase, 1);
    assert.equal(offsets.length, 12);
    assert.equal(offsets[0], 0);
    assert.ok(offsets.every((offset) => Number.isInteger(offset) && Math.abs(offset) <= 1));
    assert.ok(offsets.filter((offset) => offset !== 0).length <= 6);
  }
});

test("flag wave advances through visibly different pixel poses", () => {
  assert.notDeepEqual(
    flagWaveColumnOffsets(12, 0, 1),
    flagWaveColumnOffsets(12, Math.PI / 2, 1)
  );
});

test("flag wave uses one broad half wave across each flag", () => {
  for (const width of [14, 32]) {
    const offsets = flagWaveColumnOffsets(width, 0, 1);
    const firstMoving = offsets.findIndex((offset, column) => column > 0 && offset !== 0);
    const lastMoving = offsets.findLastIndex((offset) => offset !== 0);

    assert.ok(firstMoving > 0, `expected ${width}px flag to lift after the pole`);
    assert.ok(lastMoving > width * 0.7, `expected ${width}px flag to finish the broad wave near the fly end`);
    assert.ok(offsets.every((offset) => offset >= 0), `expected ${width}px flag to form a single upward half wave`);
  }
});
