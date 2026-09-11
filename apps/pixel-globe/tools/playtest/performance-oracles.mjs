import assert from "node:assert/strict";

export const SOAK_MIN_RENDER_FRAMES_PER_SECOND = 10;

// A release smoke budget for the moving, CPU-throttled busy-world scenario.
// These are regression tripwires, not a claim about every player's hardware.
export function assertSoakPerformance(report) {
  assert.equal(report.id, "busy-world");
  assert.equal(report.cpuThrottle, 4);
  assert.equal(report.runtime, "browser");
  assert.equal(report.headless, false,
    "Performance probe must use headed Chromium; headless rAF cadence is not a hardware signal");
  // Reports measure first-to-last sampled frame, so a 15-second collection
  // normally reports slightly less than 15 seconds. Allow one frame-budget
  // interval; the independent maximum-gap assertion still catches stalls.
  assert.ok(report.durationSeconds >= 14.5 && report.sampledFrames > 0, "Performance probe did not collect enough samples");
  // Same-session pre-change and current headed baselines on the signing host
  // render at 11.5-11.7 FPS under 4x throttling. Keep enough run-to-run margin
  // while rejecting a material slowdown from that measured release baseline.
  assert.ok(Number.isFinite(report.renderFramesPerSecond) &&
    report.renderFramesPerSecond >= SOAK_MIN_RENDER_FRAMES_PER_SECOND,
    `Rendered FPS fell below ${SOAK_MIN_RENDER_FRAMES_PER_SECOND}: ${report.renderFramesPerSecond}`);
  assert.ok(Number.isFinite(report.frameTimeMs?.max) && report.frameTimeMs.max <= 500,
    `Visible frame stall exceeded 500 ms: ${report.frameTimeMs?.max}`);
}
