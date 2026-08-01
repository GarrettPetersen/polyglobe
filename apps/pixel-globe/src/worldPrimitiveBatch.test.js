import assert from "node:assert/strict";
import test from "node:test";
import { forEachPixelLine, unitRgbaForCssColor } from "./worldPrimitiveBatch.js";

test("world primitive colors convert CSS RGB and alpha to WebGL channels", () => {
  assert.deepEqual(unitRgbaForCssColor("rgba(18, 14, 12, 0.5)"), [18 / 255, 14 / 255, 12 / 255, 0.5]);
  assert.deepEqual(unitRgbaForCssColor("#ffffff"), [1, 1, 1, 1]);
});

test("pixel lines visit a contiguous raster in either direction", () => {
  const forward = [];
  const backward = [];
  forEachPixelLine(0, 0, 4, 2, (x, y) => forward.push([x, y]));
  forEachPixelLine(4, 2, 0, 0, (x, y) => backward.push([x, y]));
  assert.deepEqual(forward[0], [0, 0]);
  assert.deepEqual(forward.at(-1), [4, 2]);
  assert.deepEqual(backward[0], [4, 2]);
  assert.deepEqual(backward.at(-1), [0, 0]);
  for (const points of [forward, backward]) {
    for (let index = 1; index < points.length; index++) {
      assert.ok(Math.abs(points[index][0] - points[index - 1][0]) <= 1);
      assert.ok(Math.abs(points[index][1] - points[index - 1][1]) <= 1);
    }
  }
});

test("world primitive parsing fails loudly for unsupported colors", () => {
  assert.throws(() => unitRgbaForCssColor("rebeccapurple"), /Unsupported/);
  assert.throws(() => forEachPixelLine(0.5, 0, 1, 1, () => {}), /integers/);
});
