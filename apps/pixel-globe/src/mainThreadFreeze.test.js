import assert from "node:assert/strict";
import test from "node:test";

import {
  beginMainThreadFreezeFrame,
  createMainThreadFreezeMonitor,
  finishMainThreadFreezeFrame,
  recordMainThreadWork,
  suspendMainThreadFreezeMonitor
} from "./mainThreadFreeze.js";

test("a foreground frame gap reports whether work or pacing froze the game", () => {
  const monitor = createMainThreadFreezeMonitor();
  assert.equal(beginMainThreadFreezeFrame(monitor, 100), null);
  finishMainThreadFreezeFrame(monitor, 1_200);

  const report = beginMainThreadFreezeFrame(monitor, 1_400);
  assert.equal(report.gapMs, 1_300);
  assert.equal(report.previousFrameCpuMs, 1_200);
  assert.equal(report.schedulerDelayMs, 100);
  assert.equal(report.cause, "frame-work");
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
