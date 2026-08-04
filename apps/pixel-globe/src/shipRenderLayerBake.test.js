import assert from "node:assert/strict";
import test from "node:test";
import {
  SHIP_RENDER_LAYER_BAKE_VERSION,
  bakeShipRenderLayerSheet,
  validateShipRenderLayerManifest
} from "./shipRenderLayerBake.js";

test("ship render-layer bake separates only the exposed bottom hull", () => {
  const color = new Uint8ClampedArray(3 * 3 * 4);
  const depth = new Uint8ClampedArray(color.length);
  for (const [x, y, sink] of [[0, 1, 220], [0, 2, 30], [1, 1, 220]]) {
    const offset = (y * 3 + x) * 4;
    color.set([90, 60, 30, 255], offset);
    depth.set([sink, sink, sink, 255], offset);
  }
  const result = bakeShipRenderLayerSheet({
    colorPixels: color,
    depthPixels: depth,
    width: 3,
    height: 3,
    frameSize: 3,
    sheetColumns: 1,
    headingCount: 1,
    maxRasterDepth: 2
  });
  assert.equal(result.submergedPixels[(2 * 3) * 4 + 3], 255);
  assert.equal(result.abovePixels[(1 * 3) * 4 + 3], 255);
  assert.deepEqual(result.frames[0], {
    bottomOpaqueY: 2,
    submergedMinY: 2,
    submergedMaxY: 2
  });
});

test("ship render-layer manifest validates its full roster and bounds", () => {
  const manifest = {
    version: SHIP_RENDER_LAYER_BAKE_VERSION,
    frameSize: 2,
    headingCount: 1,
    sheetColumns: 1,
    bundles: {
      "ship-render-layers-0.bin": { byteLength: 100 }
    },
    ships: {
      cutter: {
        bundle: "ship-render-layers-0.bin",
        byteOffset: 10,
        byteLength: 50,
        width: 4,
        height: 2,
        sources: {
          "unity-ships/cutter-1-headings": {
            row: 0,
            frames: [{ bottomOpaqueY: 1, submergedMinY: 2, submergedMaxY: -1 }]
          }
        }
      }
    }
  };
  assert.equal(validateShipRenderLayerManifest(manifest, ["cutter"]), manifest);
  assert.throws(
    () => validateShipRenderLayerManifest(manifest, ["cutter", "dhow"]),
    /roster mismatch/
  );
});
