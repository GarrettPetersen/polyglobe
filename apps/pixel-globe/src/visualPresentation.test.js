import assert from "node:assert/strict";
import test from "node:test";

import {
  createVisualPresentation,
  resetVisualPresentation,
  retargetVisualPresentation,
  visualPresentationIsActive,
  visualPresentationPoint
} from "./visualPresentation.js";

test("visual presentation moves continuously between authoritative positions", () => {
  const state = createVisualPresentation({ x: 2, y: 5 }, 100);
  retargetVisualPresentation(state, { x: 2, y: 5 }, { x: 10, y: 1 }, 100, 200);

  assert.deepEqual(visualPresentationPoint(state, 100), { x: 2, y: 5 });
  assert.deepEqual(visualPresentationPoint(state, 200), { x: 6, y: 3 });
  assert.deepEqual(visualPresentationPoint(state, 300), { x: 10, y: 1 });
  assert.equal(visualPresentationIsActive(state, 299), true);
  assert.equal(visualPresentationIsActive(state, 300), false);
});

test("visual presentation retargets from its current displayed point without jumping", () => {
  const state = createVisualPresentation({ x: 0, y: 0 }, 0);
  retargetVisualPresentation(state, { x: 0, y: 0 }, { x: 8, y: 0 }, 0, 200);
  const displayed = visualPresentationPoint(state, 100);
  retargetVisualPresentation(state, displayed, { x: 12, y: 4 }, 100, 200);

  assert.deepEqual(visualPresentationPoint(state, 100), displayed);
  assert.deepEqual(visualPresentationPoint(state, 200), { x: 8, y: 2 });
});

test("visual presentation can be reset and rejects malformed input", () => {
  const state = createVisualPresentation({ x: 1, y: 2 }, 0);
  resetVisualPresentation(state, { x: 4, y: 7 }, 20);
  assert.deepEqual(visualPresentationPoint(state, 100), { x: 4, y: 7 });
  assert.throws(() => createVisualPresentation({ x: NaN, y: 0 }, 0), /finite coordinates/);
  assert.throws(
    () => retargetVisualPresentation(state, { x: 0, y: 0 }, { x: 1, y: 1 }, 0, -1),
    /duration/
  );
});
