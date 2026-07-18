import assert from "node:assert/strict";
import test from "node:test";
import {
  advanceCaptureDirector,
  advanceCaptureDirectorClock,
  automaticCaptureRequested,
  captureDirectorComplete,
  captureDirectorCue,
  createCaptureDirector
} from "./captureDirector.js";

test("automatic capture is explicit and rejects malformed values", () => {
  assert.equal(automaticCaptureRequested(""), false);
  assert.equal(automaticCaptureRequested("?autocapture=1"), true);
  assert.throws(() => automaticCaptureRequested("?autocapture=true"), /Invalid autocapture/);
});

test("capture director fires each timed cue once and completes on duration", () => {
  const director = createCaptureDirector({ durationSeconds: 4 });
  assert.equal(captureDirectorCue(director, "first", 1), false);
  advanceCaptureDirector(director, 1.25);
  assert.equal(captureDirectorCue(director, "first", 1), true);
  assert.equal(captureDirectorCue(director, "first", 1), false);
  advanceCaptureDirector(director, 2.75);
  assert.equal(captureDirectorComplete(director), true);
});

test("capture director wall clock remains independent of clamped simulation frames", () => {
  const director = createCaptureDirector({ kind: "explore", durationSeconds: 10 });
  assert.equal(advanceCaptureDirectorClock(director, 5_000), 0);
  assert.equal(advanceCaptureDirectorClock(director, 7_500), 2.5);
  assert.equal(advanceCaptureDirectorClock(director, 15_000), 10);
  assert.equal(captureDirectorComplete(director), true);
  assert.throws(
    () => advanceCaptureDirectorClock(director, 14_999),
    /clock moved backward/
  );
});
