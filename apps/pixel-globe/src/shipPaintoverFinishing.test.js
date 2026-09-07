import test from "node:test";
import assert from "node:assert/strict";
import { finishShipSpritePixels, isDocksideKeyColor, shipPaintoverQuantizer } from "./shipPaintoverFinishing.js";

test("dockside chroma key preserves pale yellow sails and saturated green trim", () => {
  assert.equal(isDocksideKeyColor(146, 169, 132), true);
  assert.equal(isDocksideKeyColor(140, 164, 125), true);
  assert.equal(isDocksideKeyColor(195, 195, 151), false);
  assert.equal(isDocksideKeyColor(22, 90, 76), false);
  const quantize = shipPaintoverQuantizer(["ab947a", "c7dcd0", "165a4c"]);
  assert.deepEqual(quantize(195, 195, 151), [171, 148, 122]);
  assert.deepEqual(quantize(22, 90, 76), [22, 90, 76]);
});

test("sailing palette finishing preserves the silhouette and never mutates its source", () => {
  const source = new Uint8ClampedArray([126, 80, 45, 255, 8, 9, 10, 0, 220, 215, 175, 255]);
  const before = source.slice();
  const palette = ["2e222f", "625565", "966c6c", "ab947a", "c7dcd0"];
  const finished = finishShipSpritePixels(source, palette, { mutedGalleonTimber: true });
  assert.deepEqual(source, before);
  assert.deepEqual(Array.from(finished), [150, 108, 108, 255, 0, 0, 0, 0, 199, 220, 208, 255]);
  assert.throws(() => finishShipSpritePixels(new Uint8Array([0, 0, 0, 127]), palette), /binary alpha/);
  assert.throws(() => finishShipSpritePixels(new Uint8Array(3), palette), /complete RGBA/);
});

test("paintover palettes reject invalid pigments and channels", () => {
  for (const palette of [[], ["fefefe"], ["92a984"], ["ab947a", "ab947a"]]) {
    assert.throws(() => shipPaintoverQuantizer(palette), /unique Resurrect64/);
  }
  const quantize = shipPaintoverQuantizer(["ab947a"]);
  for (const channel of [NaN, Infinity, -1, 256]) assert.throws(() => quantize(channel, 0, 0), /0–255/);
});
