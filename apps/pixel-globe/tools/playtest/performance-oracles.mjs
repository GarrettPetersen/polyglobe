import assert from "node:assert/strict";

// A release smoke budget for the moving, CPU-throttled busy-world scenario.
// These are regression tripwires, not a claim about every player's hardware.
export function assertSoakPerformance(report) {
  assert.equal(report.id, "busy-world");
  assert.equal(report.cpuThrottle, 4);
  // Reports measure first-to-last sampled frame, so a 15-second collection
  // normally reports slightly less than 15 seconds. Allow one frame-budget
  // interval; the independent maximum-gap assertion still catches stalls.
  assert.ok(report.durationSeconds >= 14.5 && report.sampledFrames > 0, "Performance probe did not collect enough samples");
  assert.ok(Number.isFinite(report.renderFramesPerSecond) && report.renderFramesPerSecond >= 15,
    `Rendered FPS fell below 15: ${report.renderFramesPerSecond}`);
  assert.ok(Number.isFinite(report.frameTimeMs?.max) && report.frameTimeMs.max <= 500,
    `Visible frame stall exceeded 500 ms: ${report.frameTimeMs?.max}`);
}
