import test from "node:test";
import assert from "node:assert/strict";

import {
  shipyardConstructionFillPixels,
  shipyardConstructionPixels
} from "./shipyardConstructionArt.js";

const OUTLINE = [62, 48, 34, 255];

test("shipyard construction art outlines every transparent pixel touching the ship", () => {
  const source = pixels(3, 3, [{ x: 1, y: 1, rgba: [190, 30, 40, 255] }]);
  const output = shipyardConstructionPixels(source, 3, 3, 0);

  for (let y = 0; y < 3; y++) {
    for (let x = 0; x < 3; x++) {
      assert.deepEqual(pixel(output, 3, x, y), x === 1 && y === 1 ? [0, 0, 0, 0] : OUTLINE);
    }
  }
});

test("completed construction rows reveal the original ship pixels", () => {
  const source = pixels(4, 4, [
    { x: 1, y: 1, rgba: [40, 80, 180, 255] },
    { x: 1, y: 2, rgba: [180, 70, 30, 255] }
  ]);
  const halfway = shipyardConstructionPixels(source, 4, 4, 0.5);
  assert.deepEqual(pixel(halfway, 4, 1, 1), [0, 0, 0, 0]);
  assert.deepEqual(pixel(halfway, 4, 1, 2), [180, 70, 30, 255]);

  const complete = shipyardConstructionPixels(source, 4, 4, 1);
  assert.deepEqual(pixel(complete, 4, 1, 1), [40, 80, 180, 255]);
  assert.deepEqual(pixel(complete, 4, 1, 2), [180, 70, 30, 255]);
});

test("city construction art reveals the same progress without a modal outline", () => {
  const source = pixels(4, 4, [
    { x: 1, y: 1, rgba: [40, 80, 180, 255] },
    { x: 1, y: 2, rgba: [180, 70, 30, 255] }
  ]);
  const halfway = shipyardConstructionFillPixels(source, 4, 4, 0.5);
  assert.deepEqual(pixel(halfway, 4, 1, 1), [0, 0, 0, 0]);
  assert.deepEqual(pixel(halfway, 4, 1, 2), [180, 70, 30, 255]);
  assert.deepEqual(pixel(halfway, 4, 0, 2), [0, 0, 0, 0]);
});

test("shipyard construction art rejects blank or malformed inputs", () => {
  assert.throws(
    () => shipyardConstructionPixels(new Uint8ClampedArray(4 * 4 * 4), 4, 4, 0.5),
    /no opaque pixels/
  );
  assert.throws(
    () => shipyardConstructionPixels(new Uint8ClampedArray(3), 1, 1, 0.5),
    /complete RGBA source pixels/
  );
  assert.throws(
    () => shipyardConstructionPixels(new Uint8ClampedArray(4), 1, 1, 2),
    /progress/
  );
});

function pixels(width, height, entries) {
  const result = new Uint8ClampedArray(width * height * 4);
  for (const entry of entries) result.set(entry.rgba, (entry.y * width + entry.x) * 4);
  return result;
}

function pixel(pixelsValue, width, x, y) {
  return [...pixelsValue.slice((y * width + x) * 4, (y * width + x) * 4 + 4)];
}
