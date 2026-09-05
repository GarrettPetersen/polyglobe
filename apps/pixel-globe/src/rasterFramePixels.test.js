import assert from "node:assert/strict";
import test from "node:test";
import { createRasterFramePixelReader } from "./rasterFramePixels.js";

const FRAME = Object.freeze({ x: 2, y: 3, w: 2, h: 1 });

test("repeated buildings read one immutable atlas rectangle and receive independent tint pixels", () => {
  const atlas = {};
  const original = new Uint8ClampedArray([20, 40, 60, 255, 80, 100, 120, 0]);
  let reads = 0;
  const read = createRasterFramePixelReader((source, frame) => {
    assert.equal(source, atlas);
    assert.deepEqual(frame, FRAME);
    reads++;
    return original;
  });
  const first = read(atlas, FRAME);
  first.fill(0);
  for (let building = 0; building < 200; building++) {
    const tinted = read(atlas, { ...FRAME });
    assert.deepEqual(tinted, original);
    tinted.fill(building);
  }
  assert.equal(reads, 1, "each building must not cause a GPU readback");
  original.fill(0);
  assert.equal(read(atlas, FRAME)[0], 20, "the read callback cannot mutate cached pixels");
});

test("pixel cache separates atlases and rectangles and evicts least recently used bytes", () => {
  let reads = 0;
  const read = createRasterFramePixelReader((_atlas, frame) => {
    reads++;
    return new Uint8ClampedArray(frame.w * frame.h * 4).fill(reads);
  }, { maxBytes: 16 });
  const a = {};
  const b = {};
  assert.equal(read(a, FRAME)[0], 1);
  assert.equal(read(b, FRAME)[0], 2);
  assert.equal(read(a, FRAME)[0], 1);
  const otherFrame = { ...FRAME, x: 4 };
  assert.equal(read(a, otherFrame)[0], 3);
  assert.equal(read(a, FRAME)[0], 1);
  assert.equal(read(b, FRAME)[0], 4, "the least recently used atlas frame was evicted");
  assert.equal(read(a, { ...FRAME, w: 5 })[0], 5);
  assert.equal(read(a, FRAME)[0], 1, "an oversized read must not flush retained frames");
});

test("invalid reads fail loudly and cannot poison the pixel cache", () => {
  const atlas = {};
  let attempts = 0;
  const read = createRasterFramePixelReader(() => {
    attempts++;
    if (attempts === 1) throw new Error("atlas read failed");
    if (attempts === 2) return new Uint8ClampedArray(1);
    return new Uint8ClampedArray(8);
  });
  assert.throws(() => read(atlas, FRAME), /atlas read failed/);
  assert.throws(() => read(atlas, FRAME), /invalid RGBA pixels/);
  assert.equal(read(atlas, FRAME).length, 8);
  assert.equal(attempts, 3);
  assert.throws(() => read(atlas, { ...FRAME, x: -1 }), /valid source rectangle/);
  assert.throws(() => read(null, FRAME), /atlas/);
  assert.throws(() => createRasterFramePixelReader(() => {}, { maxBytes: 0 }), /byte budget/);
});
