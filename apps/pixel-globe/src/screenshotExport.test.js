import assert from "node:assert/strict";
import test from "node:test";

import {
  SHARE_SCREENSHOT_SCALE,
  createShareScreenshotCanvas,
  integerPixelScaleForDimensions,
  shareScreenshotFilename
} from "./screenshotExport.js";

test("Steam-sized exports use one exact integer scale on both axes", () => {
  assert.equal(integerPixelScaleForDimensions({
    sourceWidth: 480,
    sourceHeight: 270,
    targetWidth: 1920,
    targetHeight: 1080
  }), 4);
  assert.throws(() => integerPixelScaleForDimensions({
    sourceWidth: 455,
    sourceHeight: 256,
    targetWidth: 1920,
    targetHeight: 1080
  }), /not an integer multiple/);
  assert.throws(() => integerPixelScaleForDimensions({
    sourceWidth: 480,
    sourceHeight: 270,
    targetWidth: 1920,
    targetHeight: 810
  }), /differs by axis/);
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
