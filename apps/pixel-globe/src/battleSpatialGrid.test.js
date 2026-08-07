import assert from "node:assert/strict";
import test from "node:test";

import {
  createBattleSpatialGrid,
  queryBattleSpatialGrid,
  rebuildBattleSpatialGrid
} from "./battleSpatialGrid.js";

test("battle spatial grid returns only nearby cell candidates", () => {
  const items = [
    { x: 10, y: 10, active: true },
    { x: 80, y: 10, active: true },
    { x: 250, y: 250, active: true },
    { x: 12, y: 12, active: false }
  ];
  const grid = createBattleSpatialGrid(64);
  rebuildBattleSpatialGrid(grid, items);

  assert.equal(grid.itemCount, 3);
  assert.deepEqual(queryBattleSpatialGrid(grid, 10, 10, 30).sort((a, b) => a - b), [0]);
  assert.deepEqual(queryBattleSpatialGrid(grid, 64, 10, 70).sort((a, b) => a - b), [0, 1]);
  assert.deepEqual(queryBattleSpatialGrid(grid, 250, 250, 10), [2]);
});

test("battle spatial grid rejects malformed coordinates", () => {
  const grid = createBattleSpatialGrid();
  assert.throws(
    () => rebuildBattleSpatialGrid(grid, [{ x: Number.NaN, y: 0 }]),
    /invalid coordinates/
  );
  assert.throws(() => queryBattleSpatialGrid(grid, 0, 0, -1), /Invalid battle spatial-grid query/);
});
