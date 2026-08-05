import assert from "node:assert/strict";
import test from "node:test";

import { scoreShipRasterNoise } from "./shipRasterNoise.js";

test("ship raster noise scores checkerboard texture above a broad solid fill", () => {
  const solid = fixture((x, y) => ({ r: 126, g: 80, b: 45, a: 255 }));
  const checkerboard = fixture((x, y) => (
    (x + y) % 2 === 0
      ? { r: 52, g: 34, b: 24, a: 255 }
      : { r: 226, g: 215, b: 177, a: 255 }
  ));

  assert.equal(score(solid).score, 0);
  assert.ok(score(checkerboard).score > 45);
});

test("ship raster noise ignores transparent silhouette edges", () => {
  const data = fixture((x, y) => {
    if (x < 2 || x > 6 || y < 2 || y > 6) return { r: 0, g: 0, b: 0, a: 0 };
    return { r: 126, g: 80, b: 45, a: 255 };
  });
  assert.equal(score(data).score, 0);
});

test("ship raster noise does not treat a broad material boundary as texture noise", () => {
  const splitMaterials = fixture((x) => (
    x < 4
      ? { r: 52, g: 34, b: 24, a: 255 }
      : { r: 226, g: 215, b: 177, a: 255 }
  ));

  assert.ok(score(splitMaterials).score < 5);
});

test("ship raster noise rejects incompatible dimensions", () => {
  assert.throws(
    () => scoreShipRasterNoise({
      data: new Uint8ClampedArray(4),
      width: 9,
      height: 9,
      frameSize: 9,
      headingCount: 1,
      sheetColumns: 1
    }),
    /incompatible dimensions/
  );
});

function fixture(pixel) {
  const data = new Uint8ClampedArray(9 * 9 * 4);
  for (let y = 0; y < 9; y++) {
    for (let x = 0; x < 9; x++) {
      const color = pixel(x, y);
      const offset = (x + y * 9) * 4;
      data[offset] = color.r;
      data[offset + 1] = color.g;
      data[offset + 2] = color.b;
      data[offset + 3] = color.a;
    }
  }
  return data;
}

function score(data) {
  return scoreShipRasterNoise({
    data,
    width: 9,
    height: 9,
    frameSize: 9,
    headingCount: 1,
    sheetColumns: 1
  });
}
