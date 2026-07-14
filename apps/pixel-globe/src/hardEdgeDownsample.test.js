import assert from "node:assert/strict";
import test from "node:test";
import { hardEdgeSampleMap } from "./hardEdgeDownsample.js";

function rgba(width, height, opaquePixels) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (const { x, y, color = [120, 80, 40] } of opaquePixels) {
    const offset = (x + y * width) * 4;
    data[offset] = color[0];
    data[offset + 1] = color[1];
    data[offset + 2] = color[2];
    data[offset + 3] = 255;
  }
  return data;
}

test("hard-edge downsampling retains a one-source-pixel-wide line with sufficient coverage", () => {
  const source = rgba(4, 4, [0, 1, 2, 3].map((y) => ({ x: 1, y })));
  const samples = hardEdgeSampleMap({
    rgba: source,
    sourceWidth: 4,
    sourceHeight: 4,
    bounds: { minX: 0, minY: 0, width: 4, height: 4 },
    targetWidth: 2,
    targetHeight: 2
  });

  assert.deepEqual([...samples], [1, -1, 9, -1]);
});

test("hard-edge downsampling rejects isolated sub-pixel specks", () => {
  const source = rgba(4, 4, [{ x: 1, y: 1 }]);
  const samples = hardEdgeSampleMap({
    rgba: source,
    sourceWidth: 4,
    sourceHeight: 4,
    bounds: { minX: 0, minY: 0, width: 4, height: 4 },
    targetWidth: 1,
    targetHeight: 1
  });

  assert.equal(samples[0], -1);
});

test("hard-edge downsampling reconnects a contiguous source shape across a low-coverage cell", () => {
  const source = rgba(6, 4, [
    { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 },
    { x: 2, y: 1 }, { x: 3, y: 1 },
    { x: 4, y: 0 }, { x: 5, y: 0 }, { x: 4, y: 1 }, { x: 5, y: 1 }
  ]);
  const samples = hardEdgeSampleMap({
    rgba: source,
    sourceWidth: 6,
    sourceHeight: 4,
    bounds: { minX: 0, minY: 0, width: 6, height: 4 },
    targetWidth: 3,
    targetHeight: 1
  });

  assert.ok(samples.every((sample) => sample >= 0));
});

test("a tagged thin feature survives even when every cell is below the silhouette threshold", () => {
  const source = rgba(8, 4, Array.from({ length: 8 }, (_, x) => ({ x, y: 1 })));
  const features = new Int32Array(8 * 4);
  features.fill(-1);
  for (let x = 0; x < 8; x++) features[x + 8] = 2;
  const samples = hardEdgeSampleMap({
    rgba: source,
    sourceFeatures: features,
    sourceWidth: 8,
    sourceHeight: 4,
    bounds: { minX: 0, minY: 0, width: 8, height: 4 },
    targetWidth: 4,
    targetHeight: 1
  });

  assert.ok(samples.every((sample) => sample >= 0));
});

test("hard-edge downsampling selects an opaque source color instead of blending colors", () => {
  const source = rgba(2, 2, [
    { x: 0, y: 0, color: [255, 0, 0] },
    { x: 1, y: 0, color: [0, 0, 255] }
  ]);
  const samples = hardEdgeSampleMap({
    rgba: source,
    sourceWidth: 2,
    sourceHeight: 2,
    bounds: { minX: 0, minY: 0, width: 2, height: 2 },
    targetWidth: 1,
    targetHeight: 1
  });

  assert.ok(samples[0] === 0 || samples[0] === 1);
  const offset = samples[0] * 4;
  assert.ok(
    (source[offset] === 255 && source[offset + 2] === 0) ||
    (source[offset] === 0 && source[offset + 2] === 255)
  );
});

test("feature-tagged oars are repaired independently of the connected hull", () => {
  const source = rgba(8, 4, [
    ...Array.from({ length: 8 }, (_, x) => ({ x, y: 2, color: [80, 50, 30] })),
    { x: 0, y: 0 }, { x: 1, y: 0 },
    { x: 2, y: 0 }, { x: 3, y: 1 },
    { x: 4, y: 1 }, { x: 5, y: 0 },
    { x: 6, y: 0 }, { x: 7, y: 0 }
  ]);
  const features = new Int32Array(8 * 4);
  features.fill(-1);
  for (const index of [0, 1, 2, 11, 12, 5, 6, 7]) features[index] = 4;
  const samples = hardEdgeSampleMap({
    rgba: source,
    sourceFeatures: features,
    sourceWidth: 8,
    sourceHeight: 4,
    bounds: { minX: 0, minY: 0, width: 8, height: 4 },
    targetWidth: 4,
    targetHeight: 2
  });

  assert.ok(samples.slice(0, 4).every((sample) => sample >= 0));
});

test("oar connectivity never overwrites a dominant sail or hull surface", () => {
  const source = rgba(6, 3, [
    ...Array.from({ length: 6 }, (_, x) => ({ x, y: 0, color: [140, 86, 48] })),
    ...Array.from({ length: 3 }, (_, x) => ({ x: x + 3, y: 1, color: [220, 210, 180] })),
    ...Array.from({ length: 3 }, (_, x) => ({ x: x + 3, y: 2, color: [220, 210, 180] }))
  ]);
  const features = new Int32Array(6 * 3);
  features.fill(-1);
  for (let x = 0; x < 6; x++) features[x] = 7;
  const samples = hardEdgeSampleMap({
    rgba: source,
    sourceFeatures: features,
    sourceWidth: 6,
    sourceHeight: 3,
    bounds: { minX: 0, minY: 0, width: 6, height: 3 },
    targetWidth: 2,
    targetHeight: 1
  });

  assert.ok(samples[0] >= 0 && samples[0] < 3);
  assert.ok(samples[1] >= 9);
});
