import assert from "node:assert/strict";
import test from "node:test";

import { flattenShipTriangleTextures } from "./shipTextureFlattening.js";

test("detailed texture flattening turns each model triangle into one sampled color", () => {
  const triangle = {
    color: { r: 1, g: 2, b: 3 },
    textureSampler: {
      sample(u, v) {
        return { r: u * 100, g: v * 100, b: (u + v) * 50 };
      }
    },
    uvs: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }]
  };

  const [flattened] = flattenShipTriangleTextures([triangle]);

  assert.deepEqual(flattened.color, { r: 33, g: 33, b: 33 });
  assert.equal(flattened.textureSampler, null);
  assert.equal(flattened.uvs, null);
  assert.notEqual(flattened, triangle);
});

test("untextured procedural geometry remains unchanged", () => {
  const triangle = { color: { r: 20, g: 30, b: 40 }, uvs: null };
  const [flattened] = flattenShipTriangleTextures([triangle]);
  assert.equal(flattened, triangle);
});

test("texture flattening fails loudly for malformed sampler output", () => {
  assert.throws(
    () => flattenShipTriangleTextures([{
      textureSampler: { sample: () => ({ r: Number.NaN, g: 20, b: 30 }) },
      uvs: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }]
    }]),
    /malformed RGB/
  );
});
