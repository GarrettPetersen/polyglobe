import assert from "node:assert/strict";
import test from "node:test";

import { portAssaultDeckCreaseMask } from "./portAssaultEdgeShading.js";

function normalRaster(width, height) {
  return {
    alpha: new Uint8Array(width * height),
    normals: new Float32Array(width * height * 3),
    width,
    height
  };
}

function setPixel(raster, x, y, [nx, ny, nz]) {
  const pixel = x + y * raster.width;
  raster.alpha[pixel] = 1;
  raster.normals.set([nx, ny, nz], pixel * 3);
}

test("deck crease shading selects the side of a sharp deck-to-hull break", () => {
  const raster = normalRaster(3, 3);
  setPixel(raster, 1, 0, [0, 1, 0]);
  setPixel(raster, 1, 1, [0, 0, 1]);
  const mask = portAssaultDeckCreaseMask(raster);
  assert.equal(mask[1], 0, "deck surface stays broad and unoutlined");
  assert.equal(mask[4], 1, "adjacent side hull receives the dark crease");
});

test("deck crease shading ignores coherent surfaces and detached rigging", () => {
  const raster = normalRaster(4, 3);
  setPixel(raster, 0, 1, [0, 0, 1]);
  setPixel(raster, 1, 1, [0, 0, 1]);
  setPixel(raster, 3, 0, [0, 1, 0]);
  setPixel(raster, 3, 2, [0, 0, 1]);
  assert.deepEqual([...portAssaultDeckCreaseMask(raster)], new Array(12).fill(0));
});

test("native-scale crease shading keeps a one-logical-pixel edge", () => {
  const raster = normalRaster(5, 5);
  setPixel(raster, 2, 0, [0, 1, 0]);
  setPixel(raster, 2, 1, [0, 0, 1]);
  setPixel(raster, 2, 2, [0, 0, 1]);
  const mask = portAssaultDeckCreaseMask({ ...raster, nativeScale: 2 });
  assert.equal(mask[7], 1);
  assert.equal(mask[12], 1);
});
