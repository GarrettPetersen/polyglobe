import test from "node:test";
import assert from "node:assert/strict";

import {
  selectShipFlagAnchorPoint,
  validateShipFlagAnchorBake
} from "./shipFlagAnchors.js";

test("ship flag anchor prefers upper centerline geometry over an off-axis rig tip", () => {
  const point = selectShipFlagAnchorPoint([
    { points: [{ x: -4, y: 10, z: -8 }, { x: -0.2, y: 9, z: -3 }, { x: 0.2, y: 9, z: 2 }] },
    { points: [{ x: 4, y: 0, z: 0 }, { x: 0, y: 3, z: -8 }, { x: 0, y: 0, z: 0 }] }
  ]);

  assert.deepEqual(point, { x: -0.2, y: 9, z: -3 });
});

test("ship flag anchor resolves duplicate aft points toward the centerline", () => {
  const point = selectShipFlagAnchorPoint([
    { points: [{ x: -3, y: 2, z: 0 }, { x: 3, y: 2, z: 0 }, { x: 0, y: 0, z: 0 }] },
    { points: [{ x: -0.3, y: 7, z: -2 }, { x: 0.1, y: 7, z: -2 }, { x: 0, y: 4, z: 0 }] }
  ]);

  assert.deepEqual(point, { x: 0.1, y: 7, z: -2 });
});

test("mastless ships use their nearest upper points when the center strip is empty", () => {
  const point = selectShipFlagAnchorPoint([
    { points: [{ x: -2, y: 5, z: 1 }, { x: 2, y: 5, z: -1 }, { x: 0, y: 0, z: 0 }] }
  ]);

  assert.deepEqual(point, { x: 2, y: 5, z: -1 });
});

test("ship flag anchor handles production-scale meshes without spreading vertex arrays", () => {
  const triangles = Array.from({ length: 50_000 }, (_, triangleIndex) => ({
    points: [
      { x: -5, y: triangleIndex % 3, z: triangleIndex },
      { x: 5, y: triangleIndex % 5, z: triangleIndex },
      { x: 0, y: triangleIndex === 49_999 ? 12 : 4, z: triangleIndex }
    ]
  }));

  assert.deepEqual(selectShipFlagAnchorPoint(triangles), { x: 0, y: 12, z: 49_999 });
});

test("ship flag anchor bake validates every required heading and ship", () => {
  const result = validateShipFlagAnchorBake({
    frameSize: 47,
    headings: 2,
    ships: {
      cog: { base: [{ x: 12, y: 4 }, { x: 30, y: 5 }] }
    }
  }, 47, 2, new Map([["cog", 0]]));

  assert.deepEqual(result.get("cog").base, [{ x: 12, y: 4 }, { x: 30, y: 5 }]);
  assert.throws(
    () => validateShipFlagAnchorBake({
      frameSize: 47,
      headings: 2,
      ships: { cog: { base: [{ x: 12, y: 4 }] } }
    }, 47, 2, new Map([["cog", 0]])),
    /must have 2 flag anchor frames/
  );
});
