import assert from "node:assert/strict";
import test from "node:test";

import { advanceRowingCadence, createRowingCadenceState } from "./rowingCadence.js";

test("rowing cadence sounds once on entry and once per complete stroke", () => {
  const state = createRowingCadenceState();
  assert.equal(advanceRowingCadence(state, { active: true, dt: 0, periodSeconds: 0.68 }), true);
  assert.equal(advanceRowingCadence(state, { active: true, dt: 0.4, periodSeconds: 0.68 }), false);
  assert.equal(advanceRowingCadence(state, { active: true, dt: 0.28, periodSeconds: 0.68 }), true);
  assert.equal(advanceRowingCadence(state, { active: true, dt: 0.2, periodSeconds: 0.68 }), false);
});

test("rowing cadence resets while anchored or otherwise inactive", () => {
  const state = createRowingCadenceState();
  advanceRowingCadence(state, { active: true, dt: 0, periodSeconds: 0.68 });
  advanceRowingCadence(state, { active: true, dt: 0.5, periodSeconds: 0.68 });
  assert.equal(advanceRowingCadence(state, { active: false, dt: 0.1, periodSeconds: 0.68 }), false);
  assert.deepEqual(state, { active: false, elapsedSeconds: 0 });
  assert.equal(advanceRowingCadence(state, { active: true, dt: 0, periodSeconds: 0.68 }), true);
});
