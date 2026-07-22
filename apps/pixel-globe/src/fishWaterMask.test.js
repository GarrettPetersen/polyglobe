import assert from "node:assert/strict";
import test from "node:test";

import {
  fisheryTileCallsNearestFirst,
  nearestWaterMaskedPoint,
  waterMaskedSpritePixels
} from "./fishWaterMask.js";

test("nearby fisheries receive the visual fish budget before distant ones", () => {
  const distant = { id: 1, drawSurfaceX: 90, drawSurfaceY: 70 };
  const nearest = { id: 2, drawSurfaceX: 12, drawSurfaceY: 9 };
  const middle = { id: 3, drawSurfaceX: 40, drawSurfaceY: 35 };
  const original = [distant, nearest, middle];

  assert.deepEqual(
    fisheryTileCallsNearestFirst(original, 10, 10).map((call) => call.id),
    [2, 3, 1]
  );
  assert.deepEqual(original, [distant, nearest, middle]);
});

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
