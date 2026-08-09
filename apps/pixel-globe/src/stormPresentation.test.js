import assert from "node:assert/strict";
import test from "node:test";

import {
  FIRST_STORM_DIALOGUE_CLEARANCE,
  FIRST_STORM_DIALOGUE_WARNING,
  STORM_PASSAGE_CLEARED,
  STORM_PASSAGE_ENTERED,
  createStormPassageState,
  fillStormEdgeFogPixels,
  fogLayerRgba,
  firstStormDialogueKind,
  markStormClearanceDelivered,
  markStormWarningDelivered,
  resetStormPassageState,
  stormFogStrength,
  updateStormPassage
} from "./stormPresentation.js";

const THRESHOLDS = Object.freeze({
  enterIntensity: 0.28,
  exitIntensity: 0.16,
  clearanceDelayMs: 10000
});

test("storm passage reports clearance only after ten continuous safe seconds", () => {
  const state = createStormPassageState();
  assert.equal(updateStormPassage(state, 0.27, THRESHOLDS, 0), null);
  assert.equal(updateStormPassage(state, 0.28, THRESHOLDS, 1000), STORM_PASSAGE_ENTERED);
  assert.equal(state.warningPending, true);
  markStormWarningDelivered(state);
  assert.equal(updateStormPassage(state, 0.2, THRESHOLDS, 2000), null);
  assert.equal(updateStormPassage(state, 0.15, THRESHOLDS, 3000), null);
  assert.equal(updateStormPassage(state, 0.1, THRESHOLDS, 12999), null);
  assert.equal(updateStormPassage(state, 0.1, THRESHOLDS, 13000), STORM_PASSAGE_CLEARED);
  assert.equal(state.clearancePending, true);
  assert.equal(updateStormPassage(state, 0.1, THRESHOLDS, 14000), null);
  markStormClearanceDelivered(state);
  assert.equal(state.clearancePending, false);
});

test("a delivered storm warning stays suppressed until the all-clear", () => {
  const state = createStormPassageState();
  assert.equal(updateStormPassage(state, 0.4, THRESHOLDS, 0), STORM_PASSAGE_ENTERED);
  markStormWarningDelivered(state);
  assert.equal(updateStormPassage(state, 0.5, THRESHOLDS, 1000), null);
  assert.equal(updateStormPassage(state, 0.2, THRESHOLDS, 2000), null);
  assert.equal(updateStormPassage(state, 0.4, THRESHOLDS, 3000), null);
  assert.equal(state.warningPending, false);

  assert.equal(updateStormPassage(state, 0.1, THRESHOLDS, 4000), null);
  assert.equal(updateStormPassage(state, 0.1, THRESHOLDS, 14000), STORM_PASSAGE_CLEARED);
  markStormClearanceDelivered(state);
  assert.equal(updateStormPassage(state, 0.4, THRESHOLDS, 15000), STORM_PASSAGE_ENTERED);
  assert.equal(state.warningPending, true);
});

test("storm intensity returning above the safe threshold resets clearance timing", () => {
  const state = createStormPassageState(true);
  assert.equal(updateStormPassage(state, 0.1, THRESHOLDS, 1000), null);
  assert.equal(updateStormPassage(state, 0.17, THRESHOLDS, 9000), null);
  assert.equal(updateStormPassage(state, 0.1, THRESHOLDS, 10000), null);
  assert.equal(updateStormPassage(state, 0.1, THRESHOLDS, 19999), null);
  assert.equal(updateStormPassage(state, 0.1, THRESHOLDS, 20000), STORM_PASSAGE_CLEARED);
});

test("a new storm cancels a stale undelivered clearance comment", () => {
  const state = createStormPassageState(true);
  assert.equal(updateStormPassage(state, 0.1, THRESHOLDS, 0), null);
  assert.equal(updateStormPassage(state, 0.1, THRESHOLDS, 10000), STORM_PASSAGE_CLEARED);
  assert.equal(state.clearancePending, true);
  assert.equal(updateStormPassage(state, 0.5, THRESHOLDS, 11000), STORM_PASSAGE_ENTERED);
  assert.equal(state.warningPending, true);
  assert.equal(state.clearancePending, false);
});

test("only the first storm passage requests warning and clearance dialogue", () => {
  const state = createStormPassageState();
  assert.equal(updateStormPassage(state, 0.5, THRESHOLDS, 0), STORM_PASSAGE_ENTERED);
  assert.equal(firstStormDialogueKind(state), FIRST_STORM_DIALOGUE_WARNING);
  markStormWarningDelivered(state);

  assert.equal(updateStormPassage(state, 0.1, THRESHOLDS, 1000), null);
  assert.equal(updateStormPassage(state, 0.1, THRESHOLDS, 11000), STORM_PASSAGE_CLEARED);
  assert.equal(firstStormDialogueKind(state, {
    warningShown: true,
    clearanceShown: false
  }), FIRST_STORM_DIALOGUE_CLEARANCE);
  markStormClearanceDelivered(state);

  assert.equal(updateStormPassage(state, 0.5, THRESHOLDS, 12000), STORM_PASSAGE_ENTERED);
  assert.equal(firstStormDialogueKind(state, {
    warningShown: true,
    clearanceShown: true
  }), null);
});

test("an all-clear is silent when the first warning could not be shown", () => {
  const state = createStormPassageState(true);
  assert.equal(updateStormPassage(state, 0.1, THRESHOLDS, 0), null);
  assert.equal(updateStormPassage(state, 0.1, THRESHOLDS, 10000), STORM_PASSAGE_CLEARED);
  assert.equal(firstStormDialogueKind(state), null);
});

test("storm passage state resets between voyages", () => {
  const state = createStormPassageState(true);
  state.warningPending = true;
  state.belowExitSinceMs = 100;
  assert.equal(resetStormPassageState(state), state);
  assert.deepEqual(state, createStormPassageState());
});

test("storm fog fades in smoothly and reaches full strength", () => {
  assert.equal(stormFogStrength(0.1, 0.12, 0.6), 0);
  const moderate = stormFogStrength(0.28, 0.12, 0.6);
  const severe = stormFogStrength(0.45, 0.12, 0.6);
  assert.ok(moderate > 0.45 && moderate < severe);
  assert.equal(stormFogStrength(0.6, 0.12, 0.6), 1);
});

test("fog layers use three translucent shades shared by weather effects", () => {
  assert.deepEqual(fogLayerRgba(0), [0, 0, 0, 0]);
  assert.deepEqual(fogLayerRgba(0.2), [137, 153, 157, 93]);
  assert.deepEqual(fogLayerRgba(0.6), [169, 182, 181, 150]);
  assert.deepEqual(fogLayerRgba(1), [199, 204, 195, 208]);
  assert.throws(() => fogLayerRgba(1.1), /between zero and one/);
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
  assert.ok(alphaAt(0, Math.floor(height / 2)) >= 200);
  let edgePixels = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (Math.min(x, y, width - 1 - x, height - 1 - y) < depth && alphaAt(x, y) > 0) edgePixels++;
    }
  }
  assert.ok(edgePixels > 0);
});
