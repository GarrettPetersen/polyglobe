import assert from "node:assert/strict";
import test from "node:test";

import {
  retargetWhaleVisualPresentation,
  whaleVisualPresentationIsActive,
  whaleVisualPresentationPoint
} from "./whaleVisualPresentation.js";

test("whale presentation survives chart rebuilds within one local layout", () => {
  const localLayout = {};
  let state = retargetWhaleVisualPresentation(null, {
    whaleId: "whale-1",
    coordinateSpace: localLayout,
    from: { x: 10, y: 20 },
    to: { x: 50, y: 20 },
    nowMs: 100,
    durationMs: 400
  });

  assert.deepEqual(whaleVisualPresentationPoint(state, {
    coordinateSpace: localLayout,
    rawPoint: { x: 50, y: 20, tileId: 7 },
    nowMs: 300
  }), { x: 30, y: 20, tileId: 7 });
  assert.equal(whaleVisualPresentationIsActive(state, localLayout, 300), true);

  state = retargetWhaleVisualPresentation(state, {
    whaleId: "whale-1",
    coordinateSpace: localLayout,
    from: { x: 30, y: 20 },
    to: { x: 70, y: 24 },
    nowMs: 300,
    durationMs: 400
  });
  assert.deepEqual(whaleVisualPresentationPoint(state, {
    coordinateSpace: localLayout,
    rawPoint: { x: 70, y: 24, tileId: 8 },
    nowMs: 300
  }), { x: 30, y: 20, tileId: 8 });
});

test("whale presentation rejects a replaced coordinate space and stale completed motion", () => {
  const originalLayout = {};
  const replacementLayout = {};
  const state = retargetWhaleVisualPresentation(null, {
    whaleId: "whale-2",
    coordinateSpace: originalLayout,
    from: { x: 0, y: 0 },
    to: { x: 12, y: 4 },
    nowMs: 0,
    durationMs: 100
  });
  const rawPoint = { x: 90, y: 70, tileId: 9 };

  assert.equal(whaleVisualPresentationIsActive(state, replacementLayout, 50), false);
  assert.deepEqual(whaleVisualPresentationPoint(state, {
    coordinateSpace: replacementLayout,
    rawPoint,
    nowMs: 50
  }), rawPoint);
  assert.deepEqual(whaleVisualPresentationPoint(state, {
    coordinateSpace: originalLayout,
    rawPoint,
    nowMs: 101
  }), rawPoint);
});
