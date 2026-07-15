import assert from "node:assert/strict";
import test from "node:test";

import {
  alphaMaskContainsMapPoint,
  forEachPixelBrushPoint,
  pixelMaskKey
} from "./pixelWaterMask.js";

test("pixel brush points use the same contiguous diamond as river rendering", () => {
  const points = new Set();
  forEachPixelBrushPoint(10.4, 20.4, 2, (x, y) => points.add(pixelMaskKey(x, y)));

  assert.equal(points.has("10,20"), true);
  assert.equal(points.has("12,20"), true);
  assert.equal(points.has("10,22"), true);
  assert.equal(points.has("12,22"), false);
  assert.equal(points.size, 21);
});

test("alpha masks map world pixels through the exact rounded sprite origin", () => {
  const mask = {
    width: 3,
    height: 2,
    alpha: new Uint8Array([
      0, 255, 0,
      255, 0, 0
    ])
  };

  assert.equal(alphaMaskContainsMapPoint(mask, 7, 11, 8, 11), true);
  assert.equal(alphaMaskContainsMapPoint(mask, 7, 11, 7, 12), true);
  assert.equal(alphaMaskContainsMapPoint(mask, 7, 11, 7, 11), false);
  assert.equal(alphaMaskContainsMapPoint(mask, 7, 11, 10, 11), false);
});

test("pixel water-mask helpers reject malformed inputs", () => {
  assert.throws(() => forEachPixelBrushPoint(0, 0, 1.5, () => {}), /Invalid pixel brush radius/);
  assert.throws(() => pixelMaskKey(0.5, 1), /must be integers/);
  assert.throws(() => alphaMaskContainsMapPoint(null, 0, 0, 0, 0), /complete alpha mask/);
});
