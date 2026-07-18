import assert from "node:assert/strict";
import test from "node:test";
import {
  AUTOMATIC_CAPTURE_FRAME_PASS,
  AUTOMATIC_CAPTURE_FRAME_RATE,
  advanceAutomaticFrameStepper,
  advanceCaptureDirector,
  advanceCaptureDirectorClock,
  automaticCaptureMode,
  captureDirectorComplete,
  captureDirectorCue,
  createAutomaticFrameStepper,
  createCaptureDirector
} from "./captureDirector.js";

test("automatic capture requires the explicit deterministic frame pass", () => {
  assert.equal(automaticCaptureMode(""), null);
  assert.equal(automaticCaptureMode("?autocapture=frames"), AUTOMATIC_CAPTURE_FRAME_PASS);
  assert.equal(AUTOMATIC_CAPTURE_FRAME_RATE, 30);
  assert.throws(() => automaticCaptureMode("?autocapture=audio"), /Invalid autocapture/);
  assert.throws(() => automaticCaptureMode("?autocapture=1"), /Invalid autocapture/);
  assert.throws(() => automaticCaptureMode("?autocapture=true"), /Invalid autocapture/);
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

test("deterministic capture advances exactly one thirtieth of a second per frame", () => {
  const stepper = createAutomaticFrameStepper(2);
  assert.deepEqual(advanceAutomaticFrameStepper(stepper, 0), {
    frameIndex: 0,
    nowMs: 1000 / 30,
    complete: false
  });
  for (let index = 1; index < 59; index += 1) {
    assert.equal(advanceAutomaticFrameStepper(stepper, index).complete, false);
  }
  assert.deepEqual(advanceAutomaticFrameStepper(stepper, 59), {
    frameIndex: 59,
    nowMs: 2000,
    complete: true
  });
  assert.throws(() => advanceAutomaticFrameStepper(stepper, 60), /exceeds/);
});

test("deterministic capture rejects skipped frames and fractional frame totals", () => {
  const stepper = createAutomaticFrameStepper(1);
  assert.throws(() => advanceAutomaticFrameStepper(stepper, 1), /Expected capture frame 0/);
  assert.throws(() => createAutomaticFrameStepper(1 / 31), /whole frames/);
  assert.throws(() => createAutomaticFrameStepper(1, 0), /frame rate/);
});
