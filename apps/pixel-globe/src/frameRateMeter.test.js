import assert from "node:assert/strict";
import test from "node:test";

import {
  createFrameRateMeter,
  isFrameRateToggleKey,
  resetFrameRateMeter,
  sampleFrameRate
} from "./frameRateMeter.js";

test("frame-rate samples use a stable half-second window", () => {
  const meter = createFrameRateMeter(500);
  assert.equal(sampleFrameRate(meter, 1000), false);
  for (let time = 1100; time < 1500; time += 100) {
    assert.equal(sampleFrameRate(meter, time), false);
  }
  assert.equal(sampleFrameRate(meter, 1500), true);
  assert.equal(meter.framesPerSecond, 10);
});

test("resetting the frame-rate meter clears its displayed sample", () => {
  const meter = createFrameRateMeter(250);
  sampleFrameRate(meter, 0);
  sampleFrameRate(meter, 250);
  assert.equal(meter.framesPerSecond, 4);
  assert.deepEqual(resetFrameRateMeter(meter), {
    sampleWindowMs: 250,
    windowStartMs: null,
    frameCount: 0,
    framesPerSecond: null
  });
});

test("shift-backquote toggles the frame-rate overlay without taking plain backtick", () => {
  assert.equal(isFrameRateToggleKey({ key: "~", code: "Backquote", shiftKey: true }), true);
  assert.equal(isFrameRateToggleKey({ key: "`", code: "Backquote", shiftKey: false }), false);
  assert.equal(isFrameRateToggleKey({
    key: "~",
    code: "Backquote",
    shiftKey: true,
    ctrlKey: true
  }), false);
});

test("frame-rate samples reject malformed state and time", () => {
  assert.throws(() => createFrameRateMeter(0), /sample window/i);
  assert.throws(() => sampleFrameRate(createFrameRateMeter(), -1), /sample time/i);
  const meter = createFrameRateMeter();
  sampleFrameRate(meter, 100);
  assert.throws(() => sampleFrameRate(meter, 99), /moved backwards/i);
});
