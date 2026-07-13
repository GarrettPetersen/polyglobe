import assert from "node:assert/strict";
import test from "node:test";

import {
  STORM_PASSAGE_CLEARED,
  STORM_PASSAGE_ENTERED,
  createStormPassageState,
  fillStormEdgeFogPixels,
  markStormClearanceDelivered,
  stormFogStrength,
  updateStormPassage
} from "./stormPresentation.js";

const THRESHOLDS = Object.freeze({ enterIntensity: 0.28, exitIntensity: 0.16 });

test("storm passage uses hysteresis and reports one clear transition", () => {
  const state = createStormPassageState();
  assert.equal(updateStormPassage(state, 0.27, THRESHOLDS), null);
  assert.equal(updateStormPassage(state, 0.28, THRESHOLDS), STORM_PASSAGE_ENTERED);
  assert.equal(updateStormPassage(state, 0.2, THRESHOLDS), null);
  assert.equal(updateStormPassage(state, 0.15, THRESHOLDS), STORM_PASSAGE_CLEARED);
  assert.equal(state.clearancePending, true);
  assert.equal(updateStormPassage(state, 0.1, THRESHOLDS), null);
  markStormClearanceDelivered(state);
  assert.equal(state.clearancePending, false);
});

test("a new storm cancels a stale undelivered clearance comment", () => {
  const state = createStormPassageState(true);
  assert.equal(updateStormPassage(state, 0.1, THRESHOLDS), STORM_PASSAGE_CLEARED);
  assert.equal(state.clearancePending, true);
  assert.equal(updateStormPassage(state, 0.5, THRESHOLDS), STORM_PASSAGE_ENTERED);
  assert.equal(state.clearancePending, false);
});

test("storm fog fades in smoothly and reaches full strength", () => {
  assert.equal(stormFogStrength(0.1, 0.12, 0.6), 0);
  const moderate = stormFogStrength(0.28, 0.12, 0.6);
  const severe = stormFogStrength(0.45, 0.12, 0.6);
  assert.ok(moderate > 0 && moderate < severe);
  assert.equal(stormFogStrength(0.6, 0.12, 0.6), 1);
});

test("storm fog is deterministic, pixelated, and limited to screen edges", () => {
  const width = 80;
  const height = 48;
  const first = new Uint8ClampedArray(width * height * 4);
  const second = new Uint8ClampedArray(first.length);
  const depth = fillStormEdgeFogPixels(first, width, height);
  fillStormEdgeFogPixels(second, width, height);
  assert.deepEqual(first, second);

  const alphaAt = (x, y) => first[(y * width + x) * 4 + 3];
  assert.equal(alphaAt(Math.floor(width / 2), Math.floor(height / 2)), 0);
  let edgePixels = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (Math.min(x, y, width - 1 - x, height - 1 - y) < depth && alphaAt(x, y) > 0) edgePixels++;
    }
  }
  assert.ok(edgePixels > 0);
});
