import assert from "node:assert/strict";
import test from "node:test";

import {
  beginPersistentLowFrameRateFrame,
  createPersistentLowFrameRateMonitor,
  finishPersistentLowFrameRateFrame,
  recordPersistentLowFrameRateStage
} from "./persistentLowFrameRate.js";

test("sustained low frame rate produces one actionable report", () => {
  const monitor = createPersistentLowFrameRateMonitor();
  let report = null;
  for (let nowMs = 0; nowMs <= 24_000; nowMs += 100) {
    const profiling = beginPersistentLowFrameRateFrame(monitor, nowMs);
    if (profiling) {
      recordPersistentLowFrameRateStage(monitor, "render", 55);
      recordPersistentLowFrameRateStage(monitor, "npcShips", 20);
    }
    report ||= finishPersistentLowFrameRateFrame(monitor, profiling ? 82 : 0);
  }

  assert.ok(report);
  assert.equal(report.framesPerSecond, 10);
  assert.ok(report.durationSeconds >= 20);
  assert.ok(report.frameTimeMs.p95 >= 100);
  assert.equal(report.stages[0].name, "render");
  assert.equal(report.stages[0].meanMs, 55);
  assert.equal(report.longFramePercent, 100);

  beginPersistentLowFrameRateFrame(monitor, 24_100);
  assert.equal(finishPersistentLowFrameRateFrame(monitor, 0), null);
});

test("brief frame-rate drops recover without a report", () => {
  const monitor = createPersistentLowFrameRateMonitor();
  let report = null;
  let nowMs = 0;
  for (; nowMs <= 12_000; nowMs += 100) {
    const profiling = beginPersistentLowFrameRateFrame(monitor, nowMs);
    report ||= finishPersistentLowFrameRateFrame(monitor, profiling ? 60 : 0);
  }
  for (; nowMs <= 36_000; nowMs += 1000 / 60) {
    const profiling = beginPersistentLowFrameRateFrame(monitor, nowMs);
    report ||= finishPersistentLowFrameRateFrame(monitor, profiling ? 8 : 0);
  }
  assert.equal(report, null);
  assert.equal(monitor.profiling, false);
});

test("hidden or suspended frames reset the incident window", () => {
  const monitor = createPersistentLowFrameRateMonitor();
  let report = null;
  for (let nowMs = 0; nowMs <= 15_000; nowMs += 100) {
    const profiling = beginPersistentLowFrameRateFrame(monitor, nowMs);
    report ||= finishPersistentLowFrameRateFrame(monitor, profiling ? 70 : 0);
  }
  beginPersistentLowFrameRateFrame(monitor, 15_100, { eligible: false });
  finishPersistentLowFrameRateFrame(monitor, 0);
  for (let nowMs = 30_000; nowMs <= 45_000; nowMs += 100) {
    const profiling = beginPersistentLowFrameRateFrame(monitor, nowMs);
    report ||= finishPersistentLowFrameRateFrame(monitor, profiling ? 70 : 0);
  }
  assert.equal(report, null);

  beginPersistentLowFrameRateFrame(monitor, 50_000);
  assert.equal(monitor.buckets.length, 0);
});

test("browser or GPU pacing stalls still produce an actionable stage", () => {
  const monitor = createPersistentLowFrameRateMonitor();
  let report = null;
  for (let nowMs = 0; nowMs <= 24_000; nowMs += 100) {
    const profiling = beginPersistentLowFrameRateFrame(monitor, nowMs);
    report ||= finishPersistentLowFrameRateFrame(monitor, profiling ? 3 : 0);
  }
  assert.ok(report);
  assert.equal(report.stages[0].name, "frame-pacing");
  assert.equal(report.stages[0].meanMs, 97);
});
