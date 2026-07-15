import assert from "node:assert/strict";
import test from "node:test";

import {
  SHARE_SCREENSHOT_SCALE,
  createShareScreenshotCanvas,
  isShareScreenshotKey,
  shareScreenshotFilename
} from "./screenshotExport.js";

test("the share screenshot shortcut supports macOS and other desktop keyboards", () => {
  assert.equal(isShareScreenshotKey({ code: "KeyS", shiftKey: true, metaKey: true }), true);
  assert.equal(isShareScreenshotKey({ code: "KeyS", shiftKey: true, ctrlKey: true }), true);
  assert.equal(isShareScreenshotKey({ code: "KeyS", shiftKey: false, metaKey: true }), false);
  assert.equal(isShareScreenshotKey({ code: "KeyS", shiftKey: true }), false);
});

test("share screenshots upscale the logical canvas five times without smoothing", () => {
  const drawCalls = [];
  const context = {
    imageSmoothingEnabled: true,
    drawImage: (...args) => drawCalls.push(args)
  };
  const output = createShareScreenshotCanvas({ width: 455, height: 256 }, {
    createCanvas: () => ({ width: 0, height: 0, getContext: () => context })
  });

  assert.equal(SHARE_SCREENSHOT_SCALE, 5);
  assert.equal(output.width, 2275);
  assert.equal(output.height, 1280);
  assert.equal(context.imageSmoothingEnabled, false);
  assert.deepEqual(drawCalls, [[{ width: 455, height: 256 }, 0, 0, 2275, 1280]]);
});

test("share screenshot filenames are stable and filesystem safe", () => {
  assert.equal(
    shareScreenshotFilename(new Date("2026-07-15T12:34:56.789Z")),
    "marque-and-reprisal-2026-07-15T12-34-56-789Z.png"
  );
  assert.throws(() => shareScreenshotFilename(new Date(Number.NaN)), /valid date/);
});
