import test from "node:test";
import assert from "node:assert/strict";

import {
  selectShipFlagAnchorPoint,
  validateShipFlagAnchorBake
} from "./shipFlagAnchors.js";

test("ship flag anchor chooses the highest point and resolves a tie aftward", () => {
  const point = selectShipFlagAnchorPoint([
    { points: [{ x: 0, y: 1, z: 4 }, { x: 0, y: 5, z: 3 }, { x: 2, y: 5, z: -4 }] },
    { points: [{ x: -1, y: 5, z: -4 }, { x: 0, y: 4, z: -8 }, { x: 0, y: 0, z: 0 }] }
  ]);

  assert.deepEqual(point, { x: -1, y: 5, z: -4 });
});

test("ship flag anchor resolves duplicate aft points toward the centerline", () => {
  const point = selectShipFlagAnchorPoint([
    { points: [{ x: -3, y: 7, z: -2 }, { x: 1, y: 7, z: -2 }, { x: 0, y: 2, z: 0 }] }
  ]);

  assert.deepEqual(point, { x: 1, y: 7, z: -2 });
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
