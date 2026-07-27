import assert from "node:assert/strict";
import test from "node:test";

import { partitionVisualStateReprojections } from "./visualStateReprojection.js";

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
