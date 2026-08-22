import assert from "node:assert/strict";
import test from "node:test";

import {
  beginMainThreadFreezeFrame,
  createMainThreadFreezeMonitor,
  finishMainThreadFreezeFrame,
  recordMainThreadWork,
  suspendMainThreadFreezeMonitor
} from "./mainThreadFreeze.js";

test("a foreground frame gap reports measured frame work", () => {
  const monitor = createMainThreadFreezeMonitor();
  assert.equal(beginMainThreadFreezeFrame(monitor, 100), null);
  finishMainThreadFreezeFrame(monitor, 1_200);

  const report = beginMainThreadFreezeFrame(monitor, 1_400);
  assert.equal(report.gapMs, 1_300);
  assert.equal(report.previousFrameCpuMs, 1_200);
  assert.equal(report.schedulerDelayMs, 100);
  assert.equal(report.cause, "frame-work");
});

test("browser scheduling gaps without measured work are not game freezes", () => {
  const monitor = createMainThreadFreezeMonitor();
  assert.equal(beginMainThreadFreezeFrame(monitor, 100), null);
  finishMainThreadFreezeFrame(monitor, 14);

  assert.equal(beginMainThreadFreezeFrame(monitor, 3_169), null);
});

test("named synchronous work attributes a freeze outside the animation callback", () => {
  const monitor = createMainThreadFreezeMonitor();
  beginMainThreadFreezeFrame(monitor, 100);
  finishMainThreadFreezeFrame(monitor, 8);
  recordMainThreadWork(monitor, "save.periodic", 1_100, 1_220);

  const report = beginMainThreadFreezeFrame(monitor, 1_300);
  assert.equal(report.cause, "save.periodic");
  assert.equal(report.recentWork, "save.periodic");
  assert.equal(report.recentWorkMs, 1_100);
  assert.equal(report.schedulerDelayMs, 1_192);
});

test("freeze attribution retains the largest named task completed in one frame", () => {
  const monitor = createMainThreadFreezeMonitor();
  beginMainThreadFreezeFrame(monitor, 1000);
  recordMainThreadWork(monitor, "chart", 900, 1900);
  recordMainThreadWork(monitor, "portraits.preload", 120, 1950);
  finishMainThreadFreezeFrame(monitor, 1020);

  const report = beginMainThreadFreezeFrame(monitor, 2050);
  assert.equal(report.cause, "chart");
  assert.equal(report.recentWorkMs, 900);
});

test("visibility suspension and machine sleep do not impersonate freezes", () => {
  const monitor = createMainThreadFreezeMonitor();
  beginMainThreadFreezeFrame(monitor, 100);
  finishMainThreadFreezeFrame(monitor, 5);
  suspendMainThreadFreezeMonitor(monitor);
  assert.equal(beginMainThreadFreezeFrame(monitor, 5_000), null);

  finishMainThreadFreezeFrame(monitor, 5);
  assert.equal(beginMainThreadFreezeFrame(monitor, 60_000), null);
});

test("an ineligible frame resets the watchdog before returning to play", () => {
  const monitor = createMainThreadFreezeMonitor();
  beginMainThreadFreezeFrame(monitor, 100);
  assert.equal(beginMainThreadFreezeFrame(monitor, 1_500, { eligible: false }), null);
  assert.equal(beginMainThreadFreezeFrame(monitor, 5_000), null);
});
