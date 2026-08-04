import assert from "node:assert/strict";
import test from "node:test";
import { advanceFrameCadence } from "./frameCadence.js";

test("frame cadence runs the first frame", () => {
  assert.deepEqual(advanceFrameCadence({ nowMs: 100, nextFrameMs: null }), {
    run: true,
    nextFrameMs: 100 + 1000 / 60
  });
});

test("frame cadence limits a 120 Hz display to 60 world updates", () => {
  let nextFrameMs = null;
  const runTimes = [];
  for (let frame = 0; frame < 8; frame++) {
    const nowMs = frame * (1000 / 120);
    const result = advanceFrameCadence({ nowMs, nextFrameMs });
    nextFrameMs = result.nextFrameMs;
    if (result.run) runTimes.push(nowMs);
  }
  assert.deepEqual(runTimes.map((time) => Math.round(time)), [0, 17, 33, 50]);
});

test("frame cadence catches up without accumulating a long stall", () => {
  const result = advanceFrameCadence({ nowMs: 500, nextFrameMs: 20 });
  assert.equal(result.run, true);
  assert.ok(result.nextFrameMs > 500);
  assert.ok(result.nextFrameMs < 518);
});

test("frame cadence can be bypassed for deterministic tools", () => {
  const result = advanceFrameCadence({
    nowMs: 5,
    nextFrameMs: 20,
    bypass: true
  });
  assert.equal(result.run, true);
});

test("frame cadence rejects malformed timing", () => {
  assert.throws(
    () => advanceFrameCadence({ nowMs: 0, nextFrameMs: null, targetHz: 0 }),
    /valid timing/
  );
});
