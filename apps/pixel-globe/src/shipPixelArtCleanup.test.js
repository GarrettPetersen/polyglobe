import assert from "node:assert/strict";
import test from "node:test";

import { coalesceShipPixelArtColors } from "./shipPixelArtCleanup.js";

function pixelBuffer(rows) {
  const colors = {
    ".": [0, 0, 0, 0],
    a: [76, 62, 36, 255],
    b: [46, 34, 47, 255]
  };
  return new Uint8ClampedArray(rows.flatMap((row) => (
    [...row].flatMap((character) => colors[character])
  )));
}

function rgbAt(rgba, width, x, y) {
  const offset = (x + y * width) * 4;
  return [...rgba.slice(offset, offset + 3)];
}

test("pixel-art cleanup absorbs a surrounded one-pixel texture speck", () => {
  const result = coalesceShipPixelArtColors(pixelBuffer([
    "aaa",
    "aba",
    "aaa"
  ]), 3, 3, { minimumRegionPixels: 2, passes: 1 });

  assert.deepEqual(rgbAt(result.rgba, 3, 1, 1), [76, 62, 36]);
  assert.equal(result.metadata.recoloredRegions, 1);
  assert.equal(result.metadata.recoloredPixels, 1);
});

test("pixel-art cleanup retains small isolated rigging against transparency", () => {
  const source = pixelBuffer([
    "...",
    ".b.",
    "..."
  ]);
  const result = coalesceShipPixelArtColors(source, 3, 3, {
    minimumRegionPixels: 3,
    passes: 2
  });

  assert.deepEqual(result.rgba, source);
  assert.equal(result.metadata.recoloredPixels, 0);
});

test("pixel-art cleanup retains deliberate regions at the configured size", () => {
  const source = pixelBuffer([
    "aaaa",
    "abba",
    "aaaa"
  ]);
  const result = coalesceShipPixelArtColors(source, 4, 3, {
    minimumRegionPixels: 2,
    passes: 1
  });

  assert.deepEqual(result.rgba, source);
});

test("pixel-art cleanup rejects malformed raster contracts", () => {
  assert.throws(
    () => coalesceShipPixelArtColors(new Uint8ClampedArray(4), 2, 2, {
      minimumRegionPixels: 2
    }),
    /length/
  );
  assert.throws(
    () => coalesceShipPixelArtColors(new Uint8ClampedArray(16), 2, 2, {
      minimumRegionPixels: 1
    }),
    /threshold/
  );
});
