import assert from "node:assert/strict";
import test from "node:test";

import { analyzeWaterlineSlice, estimateShipWaterlineY } from "./shipWaterlineSlice.js";

test("a mast and deck furniture do not pull the waterline onto the deck", () => {
  const triangles = [
    ...boxTriangles(-1, 1, 0, 1, -3, 3),
    ...boxTriangles(-0.12, 0.12, 1, 5, -0.12, 0.12),
    ...boxTriangles(-0.35, 0.35, 1, 1.5, 1, 1.6)
  ];
  const result = estimateShipWaterlineY(triangles, { label: "test ship" });
  assert.ok(result.y > 0.2 && result.y < 0.6, `waterline ${result.y}`);
  assert.equal(result.expectedHullCount, 1);
  assert.ok(result.dominantLengthRatio >= 0.68);
});

test("an ordinary hull slice is one dominant connected shape", () => {
  const analysis = analyzeWaterlineSlice(boxTriangles(-1, 1, 0, 1, -3, 3), 0.4);
  assert.equal(analysis.structureValid, true);
  assert.equal(analysis.componentCount, 1);
  assert.equal(analysis.dominantLengthRatio, 1);
});

test("equal disconnected hulls fail single-hull validation", () => {
  const triangles = [
    ...boxTriangles(-2, -1, 0, 1, -3, 3),
    ...boxTriangles(1, 2, 0, 1, -3, 3)
  ];
  assert.throws(
    () => estimateShipWaterlineY(triangles, { label: "undeclared catamaran" }),
    /dominant connected shape/
  );
});

test("a declared catamaran accepts two substantial hull sections", () => {
  const triangles = [
    ...boxTriangles(-2, -1, 0, 1, -3, 3),
    ...boxTriangles(1, 2, 0, 1, -3, 3),
    ...boxTriangles(-2, 2, 1, 1.2, -0.2, 0.2)
  ];
  const result = estimateShipWaterlineY(triangles, {
    expectedHullCount: 2,
    label: "catamaran"
  });
  assert.equal(result.expectedHullCount, 2);
  assert.ok(result.y < 1);
});

test("waterline analysis rejects malformed geometry and options", () => {
  assert.throws(() => estimateShipWaterlineY([], {}), /requires triangles/);
  assert.throws(
    () => estimateShipWaterlineY(boxTriangles(-1, 1, 0, 1, -3, 3), { expectedHullCount: 0 }),
    /invalid hull count/
  );
  assert.throws(
    () => analyzeWaterlineSlice([{ points: [{ x: 0, y: 0, z: 0 }] }], 0),
    /requires triangle points/
  );
});

function boxTriangles(minX, maxX, minY, maxY, minZ, maxZ) {
  const p = [
    point(minX, minY, minZ), point(maxX, minY, minZ),
    point(maxX, maxY, minZ), point(minX, maxY, minZ),
    point(minX, minY, maxZ), point(maxX, minY, maxZ),
    point(maxX, maxY, maxZ), point(minX, maxY, maxZ)
  ];
  return [
    face(p, 0, 1, 2, 3), face(p, 4, 7, 6, 5),
    face(p, 0, 4, 5, 1), face(p, 3, 2, 6, 7),
    face(p, 0, 3, 7, 4), face(p, 1, 5, 6, 2)
  ].flat();
}

function face(points, a, b, c, d) {
  return [
    { points: [points[a], points[b], points[c]] },
    { points: [points[a], points[c], points[d]] }
  ];
}

function point(x, y, z) {
  return { x, y, z };
}
