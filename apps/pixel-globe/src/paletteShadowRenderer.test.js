import assert from "node:assert/strict";
import test from "node:test";

import { createPaletteShadowRenderer } from "./paletteShadowRenderer.js";

const LUT = Object.freeze({
  width: 1,
  height: 1,
  data: new Uint8Array([0, 0, 0, 255])
});

test("palette shadow rendering falls back cleanly when WebGL is unavailable", () => {
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => null
  };
  const renderer = createPaletteShadowRenderer({
    width: 455,
    height: 256,
    lut: LUT,
    strength: 0.62,
    createCanvas: () => canvas
  });
  assert.equal(renderer, null);
  assert.equal(canvas.width, 455);
  assert.equal(canvas.height, 256);
});

test("palette shadow rendering validates dimensions, lookup data, and strength", () => {
  assert.throws(() => createPaletteShadowRenderer({
    width: 0,
    height: 256,
    lut: LUT,
    strength: 0.62
  }), /dimensions/);
  assert.throws(() => createPaletteShadowRenderer({
    width: 455,
    height: 256,
    lut: { width: 1, height: 1, data: new Uint8Array(3) },
    strength: 0.62
  }), /lookup texture/);
  assert.throws(() => createPaletteShadowRenderer({
    width: 455,
    height: 256,
    lut: LUT,
    strength: 2
  }), /between zero and one/);
});
