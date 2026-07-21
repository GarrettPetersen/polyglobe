import assert from "node:assert/strict";
import test from "node:test";

import {
  createTerrainOcclusionIndex,
  shipOcclusionDepthY,
  terrainOccludersForScreenBounds
} from "./terrainShipOcclusion.js";

function occluder({ x, y, depthY, width = 8, height = 2 }) {
  return {
    x,
    y,
    depthY,
    width,
    height,
    drawLayer: { image: {} }
  };
}

test("ship terrain depth uses its bottom opaque pixel plus a visibility bias", () => {
  assert.equal(shipOcclusionDepthY(70, 47, 2), 119);
  assert.throws(() => shipOcclusionDepthY(70, -1, 2), /integer sprite/);
  assert.throws(() => shipOcclusionDepthY(70, 47, 1.5), /integer sprite/);
});

test("terrain occlusion index returns only nearby masks with the current screen offset", () => {
  const near = occluder({ x: 20, y: 30, depthY: 38 });
  const far = occluder({ x: 300, y: 300, depthY: 308 });
  const index = createTerrainOcclusionIndex([near, far], 32);

  const result = terrainOccludersForScreenBounds(
    index,
    { x: 24, y: 35, w: 10, h: 10 },
    { x: 4, y: 5 }
  );

  assert.equal(result.length, 1);
  assert.equal(result[0].x, 24);
  assert.equal(result[0].y, 35);
  assert.equal(result[0].depthY, 43);
  assert.equal(result[0].drawLayer, near.drawLayer);
});

test("terrain occlusion rejects malformed layers and queries", () => {
  assert.throws(
    () => terrainOccludersForScreenBounds(
      createTerrainOcclusionIndex([], 32),
      { x: 0, y: 0, w: 0, h: 4 },
      { x: 0, y: 0 }
    ),
    /positive integer bounds/
  );
  assert.throws(
    () => createTerrainOcclusionIndex([{
      x: 0,
      y: 0,
      depthY: 2,
      width: 2,
      height: 2
    }]),
    /invalid draw layer/
  );
});
