import test from "node:test";
import assert from "node:assert/strict";
import { admitProjectedTiles } from "./localLayoutAdmission.js";

test("new tiles use their exact projected offsets from the visible anchor", () => {
  const positions = new Map([
    [0, { x: 0, y: 0 }],
    [3, { x: -400, y: 900 }]
  ]);
  const projectedById = new Map([
    [0, { x: 100, y: 80 }],
    [1, { x: 120, y: 90 }],
    [2, { x: 180, y: 110 }],
    [3, { x: 200, y: 100 }]
  ]);

  admitProjectedTiles({
    positions,
    projectedById,
    pendingIds: [1, 2],
    anchorId: 0
  });

  assert.deepEqual(positions.get(0), { x: 0, y: 0 });
  assert.deepEqual(positions.get(3), { x: -400, y: 900 });
  assert.deepEqual(positions.get(1), { x: 20, y: 10 });
  assert.deepEqual(positions.get(2), { x: 80, y: 30 });
  assert.equal(positions.get(2).x - positions.get(1).x, 60);
  assert.equal(positions.get(2).y - positions.get(1).y, 20);
});

test("layout translation does not alter the projected shape", () => {
  const positions = new Map([[0, { x: 40, y: 60 }]]);
  const projectedById = new Map([
    [0, { x: 10, y: 20 }],
    [1, { x: 100, y: 120 }],
    [2, { x: 130, y: 150 }]
  ]);

  const admitted = admitProjectedTiles({
    positions,
    projectedById,
    pendingIds: [1, 2],
    anchorId: 0
  });

  assert.equal(admitted, 2);
  assert.deepEqual(positions.get(0), { x: 40, y: 60 });
  assert.deepEqual(positions.get(1), { x: 130, y: 160 });
  assert.deepEqual(positions.get(2), { x: 160, y: 190 });
});

test("admission fails when its projected anchor is missing", () => {
  assert.throws(
    () => admitProjectedTiles({
      positions: new Map([[0, { x: 0, y: 0 }]]),
      projectedById: new Map([[1, { x: 20, y: 10 }]]),
      pendingIds: [1],
      anchorId: 0
    }),
    /Projected anchor position/
  );
});
