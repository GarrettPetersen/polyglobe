import assert from "node:assert/strict";
import test from "node:test";

import {
  riverBankNeighborOffsets,
  riverBankOutlineMask,
  riverBankOutlinePixelSet
} from "./riverBankOutline.js";

test("riverbank outline forms a one-pixel ring outside river water", () => {
  const width = 5;
  const height = 5;
  const alpha = new Uint8Array(width * height);
  alpha[2 + 2 * width] = 255;

  const outline = riverBankOutlineMask(alpha, width, height);
  assert.equal(outline.reduce((sum, value) => sum + value, 0), 8);
  assert.equal(outline[2 + 2 * width], 0);
  assert.equal(outline[0], 0);
  for (const [dx, dy] of riverBankNeighborOffsets()) {
    assert.equal(outline[2 + dx + (2 + dy) * width], 1);
  }
});

test("riverbank outline follows long water shapes without filling distant land", () => {
  const width = 7;
  const height = 5;
  const alpha = new Uint8ClampedArray(width * height);
  for (let x = 1; x <= 5; x++) alpha[x + 2 * width] = 255;

  const outline = riverBankOutlineMask(alpha, width, height);
  assert.equal(outline[3 + width], 1);
  assert.equal(outline[3 + 3 * width], 1);
  assert.equal(outline[3], 0);
  for (let x = 1; x <= 5; x++) assert.equal(outline[x + 2 * width], 0);
});

test("riverbank outline rejects malformed alpha masks", () => {
  assert.throws(() => riverBankOutlineMask([], 1, 1), /alpha byte array/);
  assert.throws(() => riverBankOutlineMask(new Uint8Array(3), 2, 2), /length/);
  assert.throws(() => riverBankOutlineMask(new Uint8Array(1), 0, 1), /dimensions/);
});

test("river connector pixels use the same one-pixel outline rule", () => {
  const water = new Set(["4,7", "5,7"]);
  const outline = riverBankOutlinePixelSet(water);
  assert.equal(outline.has("4,7"), false);
  assert.equal(outline.has("5,7"), false);
  assert.equal(outline.has("3,7"), true);
  assert.equal(outline.has("6,7"), true);
  assert.equal(outline.has("4,6"), true);
  assert.equal(outline.has("5,8"), true);
  assert.throws(() => riverBankOutlinePixelSet(new Set(["bad"])), /pixel key/);
});
