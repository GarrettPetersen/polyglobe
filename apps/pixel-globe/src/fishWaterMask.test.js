import assert from "node:assert/strict";
import test from "node:test";

import { nearestWaterMaskedPoint, waterMaskedSpritePixels } from "./fishWaterMask.js";

test("dry fish positions snap to the nearest water-mask pixel", () => {
  const point = nearestWaterMaskedPoint({
    x: 4.2,
    y: 5.1,
    maxRadius: 4,
    isWater: (x, y) => x === 6 && y === 5
  });

  assert.deepEqual(point, { x: 6, y: 5 });
});

test("fish sprite pixels are retained only where the water mask is open", () => {
  const pixels = waterMaskedSpritePixels({
    x: 10,
    y: 20,
    width: 3,
    height: 2,
    alpha: Uint8Array.from([255, 255, 0, 0, 255, 255]),
    isWater: (x) => x <= 10
  });

  assert.deepEqual(pixels, [{ x: 10, y: 20 }]);
});

test("flipped fish use the mirrored source alpha when applying water", () => {
  const pixels = waterMaskedSpritePixels({
    x: 0,
    y: 0,
    width: 3,
    height: 1,
    alpha: Uint8Array.from([255, 0, 0]),
    flip: true,
    isWater: () => true
  });

  assert.deepEqual(pixels, [{ x: 2, y: 0 }]);
});
