import assert from "node:assert/strict";
import test from "node:test";

import { portraitBottomTransparentRows } from "./portraitFrameAlignment.js";

function frame(width, height, opaquePixels) {
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (const [x, y] of opaquePixels) rgba[(y * width + x) * 4 + 3] = 255;
  return rgba;
}

test("portrait frames report the transparent rows below their lowest visible pixel", () => {
  assert.equal(portraitBottomTransparentRows(frame(4, 5, [[1, 2]]), 4, 5), 2);
  assert.equal(portraitBottomTransparentRows(frame(4, 5, [[0, 1], [3, 4]]), 4, 5), 0);
});

test("portrait frame alignment rejects empty or malformed rasters", () => {
  assert.throws(
    () => portraitBottomTransparentRows(frame(2, 2, []), 2, 2),
    /no visible pixels/
  );
  assert.throws(
    () => portraitBottomTransparentRows(new Uint8ClampedArray(3), 2, 2),
    /does not match/
  );
});
