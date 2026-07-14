import assert from "node:assert/strict";
import test from "node:test";

import { removePortraitChromaFringe } from "./portraitChromaKey.js";

test("portrait cleanup removes green fringe connected to chroma key", () => {
  const image = rgbaImage(4, 1, [
    [0, 255, 0, 255],
    [22, 90, 76, 150],
    [46, 34, 47, 180],
    [180, 80, 60, 255]
  ]);

  assert.equal(removePortraitChromaFringe(image, 4, 1), 2);
  assert.deepEqual(pixel(image, 0), [0, 0, 0, 0]);
  assert.deepEqual(pixel(image, 1), [0, 0, 0, 0]);
  assert.deepEqual(pixel(image, 2), [46, 34, 47, 255]);
  assert.deepEqual(pixel(image, 3), [180, 80, 60, 255]);
});

test("portrait cleanup keeps green clothing separated by a dark outline", () => {
  const image = rgbaImage(5, 1, [
    [0, 255, 0, 255],
    [22, 90, 76, 255],
    [46, 34, 47, 255],
    [22, 90, 76, 255],
    [46, 34, 47, 255]
  ]);

  removePortraitChromaFringe(image, 5, 1);
  assert.deepEqual(pixel(image, 1), [0, 0, 0, 0]);
  assert.deepEqual(pixel(image, 3), [22, 90, 76, 255]);
});

test("portrait cleanup cannot flood deeply into connected green clothing", () => {
  const image = rgbaImage(5, 1, [
    [0, 255, 0, 255],
    [22, 90, 76, 255],
    [22, 90, 76, 255],
    [22, 90, 76, 255],
    [22, 90, 76, 255]
  ]);

  removePortraitChromaFringe(image, 5, 1);
  assert.deepEqual(pixel(image, 2), [0, 0, 0, 0]);
  assert.deepEqual(pixel(image, 3), [22, 90, 76, 255]);
  assert.deepEqual(pixel(image, 4), [22, 90, 76, 255]);
});

function rgbaImage(width, height, pixels) {
  assert.equal(pixels.length, width * height);
  return { data: Uint8ClampedArray.from(pixels.flat()) };
}

function pixel(image, index) {
  return Array.from(image.data.slice(index * 4, index * 4 + 4));
}
