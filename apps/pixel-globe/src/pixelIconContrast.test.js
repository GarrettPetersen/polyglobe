import assert from "node:assert/strict";
import test from "node:test";

import { buildPixelIconOutlinePixels } from "./pixelIconContrast.js";

test("pixel icon outlines add a light cardinal edge without bleeding between atlas cells", () => {
  const width = 8;
  const height = 4;
  const sourcePixels = new Uint8ClampedArray(width * height * 4);
  sourcePixels[(1 * width + 3) * 4 + 3] = 255;
  const outline = buildPixelIconOutlinePixels({
    sourcePixels,
    width,
    height,
    cells: [
      { x: 0, y: 0, w: 4, h: 4 },
      { x: 4, y: 0, w: 4, h: 4 }
    ]
  });

  const alphaAt = (x, y) => outline[(y * width + x) * 4 + 3];
  assert.equal(alphaAt(2, 1), 255);
  assert.equal(alphaAt(3, 0), 255);
  assert.equal(alphaAt(3, 2), 255);
  assert.equal(alphaAt(4, 1), 0);
  assert.equal(alphaAt(3, 1), 0);
});

test("pixel icon outline geometry rejects invalid atlas data", () => {
  assert.throws(() => buildPixelIconOutlinePixels({
    sourcePixels: new Uint8ClampedArray(12),
    width: 2,
    height: 2,
    cells: [{ x: 0, y: 0, w: 2, h: 2 }]
  }), /must match/);
});
