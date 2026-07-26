import assert from "node:assert/strict";
import test from "node:test";

import {
  partitionVisualStateCommits,
  partitionVisualStateReprojections
} from "./visualStateReprojection.js";

test("visual states outside a rebuilt chart are separated for deactivation", () => {
  const states = [
    { id: "visible", vector: [1, 0, 0] },
    { id: "outside", vector: [-1, 0, 0] }
  ];
  const result = partitionVisualStateReprojections(
    states,
    (state) => state.id === "visible" ? { x: 12, y: 8, tileId: 4 } : null
  );

  assert.deepEqual(result.projected, [{
    state: states[0],
    point: { x: 12, y: 8, tileId: 4 }
  }]);
  assert.deepEqual(result.outside, [states[1]]);
});

test("visual state reprojection rejects malformed projected points", () => {
  assert.throws(
    () => partitionVisualStateReprojections(
      [{ id: "broken" }],
      () => ({ x: Number.NaN, y: 0, tileId: 1 })
    ),
    /invalid point/
  );
});

test("visual state commit resolves the tile beneath the current pixel instead of a stale tile id", () => {
  const state = {
    id: "visible",
    x: 24,
    y: 18,
    tileId: 98897
  };
  const result = partitionVisualStateCommits(
    [state],
    (x, y) => x === 24 && y === 18 ? { tileId: 42 } : null
  );

  assert.equal(result.projected[0].point.tileId, 42);
  assert.deepEqual(result.outside, []);
});
