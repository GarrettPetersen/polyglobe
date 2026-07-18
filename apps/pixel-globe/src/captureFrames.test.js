import assert from "node:assert/strict";
import test from "node:test";
import {
  captureFrameDue,
  captureFrameSamplerSnapshot,
  createCaptureFrameSampler,
  recordCaptureFrame,
  startCaptureFrameSampler
} from "./captureFrames.js";

const PNG = "data:image/png;base64,AAAA";

test("automatic frame sampling records at most one rendered frame per time bucket", () => {
  const sampler = createCaptureFrameSampler(10);
  startCaptureFrameSampler(sampler, 1_000);
  assert.equal(captureFrameDue(sampler, 1_000), true);
  assert.equal(recordCaptureFrame(sampler, 1_000, PNG), true);
  assert.equal(recordCaptureFrame(sampler, 1_050, PNG), false);
  assert.equal(recordCaptureFrame(sampler, 1_100, PNG), true);
  assert.deepEqual(
    captureFrameSamplerSnapshot(sampler).frames.map((frame) => frame.t),
    [0, 100]
  );
});

test("automatic frame sampling fails loudly for malformed frames and incomplete footage", () => {
  const sampler = createCaptureFrameSampler();
  startCaptureFrameSampler(sampler, 0);
  assert.throws(() => recordCaptureFrame(sampler, 0, "not png"), /PNG data URL/);
  recordCaptureFrame(sampler, 0, PNG);
  assert.throws(() => captureFrameSamplerSnapshot(sampler), /only 1 rendered frames/);
});
