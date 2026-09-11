import assert from "node:assert/strict";
import test from "node:test";
import {
  assertSoakPerformance,
  SOAK_MIN_RENDER_FRAMES_PER_SECOND
} from "./performance-oracles.mjs";
const report = { id: "busy-world", cpuThrottle: 4, durationSeconds: 15, sampledFrames: 900,
  runtime: "browser", headless: false, framesPerSecond: 60,
  renderFramesPerSecond: 30, frameTimeMs: { max: 100 } };
test("performance gate detects freezes and poor rendering despite a healthy update FPS", () => {
  assert.doesNotThrow(() => assertSoakPerformance(report));
  assert.doesNotThrow(() => assertSoakPerformance({ ...report, durationSeconds: 14.9983 }));
  assert.doesNotThrow(() => assertSoakPerformance({
    ...report,
    renderFramesPerSecond: SOAK_MIN_RENDER_FRAMES_PER_SECOND
  }));
  assert.throws(() => assertSoakPerformance({ ...report, durationSeconds: 14 }), /samples/);
  assert.throws(() => assertSoakPerformance({ ...report, frameTimeMs: { max: 1000 } }), /stall/);
  assert.throws(() => assertSoakPerformance({
    ...report,
    renderFramesPerSecond: SOAK_MIN_RENDER_FRAMES_PER_SECOND - 0.01
  }), /Rendered FPS/);
  assert.throws(() => assertSoakPerformance({ ...report, durationSeconds: 0 }), /samples/);
  assert.throws(() => assertSoakPerformance({ ...report, headless: true }), /headed Chromium/);
  assert.throws(() => assertSoakPerformance({ ...report, runtime: "electron" }));
});
