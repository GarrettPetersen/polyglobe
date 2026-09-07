import assert from "node:assert/strict";
import test from "node:test";
import { docksidePaintoverSamples } from "./shipDocksidePaintover.js";

function fixture() {
  const rgba = new Uint8ClampedArray(5 * 3 * 4);
  const sourceAlpha = new Uint8Array(15);
  sourceAlpha[6] = sourceAlpha[8] = 1;
  for (const pixel of [6, 7, 8]) rgba.set([150, 108, 108, 255], pixel * 4);
  return { rgba, sourceAlpha, width: 5, height: 3, maximumDistancePx: 1 };
}

test("paintover preserves occupied surface samples and registers new pixels deterministically", () => {
  const input = fixture();
  const before = structuredClone(input);
  const result = docksidePaintoverSamples(input);
  assert.deepEqual(Array.from(result.samples.slice(6, 9)), [6, 6, 8]);
  assert.equal(result.samples[0], -1);
  assert.equal(result.opaquePixels, 3);
  assert.equal(result.extendedPixels, 1);
  assert.equal(result.maximumUsedDistancePx, 1);
  assert.deepEqual(input, before, "registration must not mutate the painting or source geometry");
});

test("paintover rejects unsupported contours instead of inventing distant depth", () => {
  const input = fixture();
  input.rgba.set([150, 108, 108, 255], 0);
  assert.throws(() => docksidePaintoverSamples(input), /\(0, 0\).*registration radius/);
  assert.throws(() => docksidePaintoverSamples({ ...fixture(), maximumDistancePx: 0 }), /registration radius/);
});

test("paintover enforces exact Resurrect colors, clean transparency, and nonblank art", () => {
  for (const [channels, message] of [
    [[150, 108, 108, 128], /non-binary alpha/],
    [[151, 108, 108, 255], /non-Resurrect/],
    [[150, 108, 108, 0], /hidden RGB/]
  ]) {
    const input = fixture();
    input.rgba.set(channels, 6 * 4);
    assert.throws(() => docksidePaintoverSamples(input), message);
  }
  const blank = fixture();
  blank.rgba.fill(0);
  assert.throws(() => docksidePaintoverSamples(blank), /blank/);
});

test("paintover rejects malformed dimensions and unbounded registration", () => {
  for (const patch of [{ width: 4 }, { height: 0 }, { sourceAlpha: [] }, { rgba: [] }]) {
    assert.throws(() => docksidePaintoverSamples({ ...fixture(), ...patch }), /dimensions/);
  }
  for (const maximumDistancePx of [-1, 0.5, 33, NaN]) {
    assert.throws(() => docksidePaintoverSamples({ ...fixture(), maximumDistancePx }), /radius/);
  }
});
