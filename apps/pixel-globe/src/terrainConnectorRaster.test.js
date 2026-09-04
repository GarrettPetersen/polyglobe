import test from "node:test";
import assert from "node:assert/strict";
import {
  terrainConnectorCallSequenceKey,
  terrainConnectorEdgeKey,
  terrainConnectorHalfWidthPx,
  terrainConnectorLengthIsRenderable,
  terrainConnectorRasterSpans
} from "./terrainConnectorRaster.js";

const CONNECTOR = Object.freeze([
  { x: 2, y: 1 },
  { x: 10, y: 3 },
  { x: 12, y: 8 },
  { x: 9, y: 12 },
  { x: 1, y: 10 },
  { x: -1, y: 5 }
]);

test("terrain connector polygons rasterize into fully owned integer pixels", () => {
  const spans = terrainConnectorRasterSpans(CONNECTOR, 12345);
  assert.ok(spans.length > 0);
  for (const span of spans) {
    assert.equal(Number.isInteger(span.x), true);
    assert.equal(Number.isInteger(span.y), true);
    assert.equal(Number.isInteger(span.width), true);
    assert.ok(span.width > 0);
  }
});

test("terrain connector edge noise is deterministic and breaks up straight seams", () => {
  const square = [
    { x: 0, y: 0 },
    { x: 8, y: 0 },
    { x: 8, y: 12 },
    { x: 0, y: 12 }
  ];
  const first = terrainConnectorRasterSpans(square, 77);
  assert.deepEqual(terrainConnectorRasterSpans(square, 77), first);
  assert.notDeepEqual(terrainConnectorRasterSpans(square, 78), first);
  assert.ok(new Set(first.map((span) => `${span.x}:${span.width}`)).size > 1);
});

test("water-only connectors cover integer-projected three-tile junctions", () => {
  assert.equal(terrainConnectorHalfWidthPx({
    baseHalfWidthPx: 9,
    levelDifference: 0,
    surfaceKind: "water"
  }), 10);
  assert.equal(terrainConnectorHalfWidthPx({
    baseHalfWidthPx: 9,
    levelDifference: 0,
    surfaceKind: "coast"
  }), 9);
  assert.equal(terrainConnectorHalfWidthPx({
    baseHalfWidthPx: 9,
    levelDifference: 4,
    surfaceKind: "water"
  }), 12);
});

test("land-only connectors close the same three-tile junction pinholes", () => {
  assert.equal(terrainConnectorHalfWidthPx({
    baseHalfWidthPx: 9,
    levelDifference: 0,
    surfaceKind: "land"
  }), 10);
});

test("terrain connector width rejects malformed geometry state", () => {
  assert.throws(
    () => terrainConnectorHalfWidthPx({ baseHalfWidthPx: 0, levelDifference: 0, surfaceKind: "water" }),
    /positive integer/
  );
  assert.throws(
    () => terrainConnectorHalfWidthPx({ baseHalfWidthPx: 9, levelDifference: -1, surfaceKind: "water" }),
    /non-negative integer/
  );
  assert.throws(
    () => terrainConnectorHalfWidthPx({ baseHalfWidthPx: 9, levelDifference: 0, surfaceKind: "sand" }),
    /Unknown terrain connector surface kind/
  );
});

test("terrain connector raster rejects malformed geometry", () => {
  assert.throws(() => terrainConnectorRasterSpans([], 1), /at least three/);
  assert.throws(
    () => terrainConnectorRasterSpans([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: NaN, y: 1 }], 1),
    /invalid point/
  );
  assert.throws(() => terrainConnectorRasterSpans(CONNECTOR, 1.5), /integer seed/);
});

test("terrain connector rendering rejects pathological chart stretches", () => {
  assert.equal(terrainConnectorLengthIsRenderable(36, 72), true);
  assert.equal(terrainConnectorLengthIsRenderable(72, 72), true);
  assert.equal(terrainConnectorLengthIsRenderable(72.01, 72), false);
  assert.throws(
    () => terrainConnectorLengthIsRenderable(Infinity, 72),
    /finite and non-negative/
  );
  assert.throws(
    () => terrainConnectorLengthIsRenderable(36, 0),
    /maximum length must be positive/
  );
});

test("equivalent visible connector arrays share one beach-wave cache key", () => {
  const first = [{ a: 12, b: 4 }, { a: 12, b: 19 }];
  const recreated = [{ a: 4, b: 12 }, { a: 12, b: 19 }];
  assert.equal(terrainConnectorCallSequenceKey(first), terrainConnectorCallSequenceKey(recreated));
  assert.notEqual(
    terrainConnectorCallSequenceKey(first),
    terrainConnectorCallSequenceKey([{ a: 12, b: 4 }, { a: 12, b: 20 }])
  );
  assert.equal(terrainConnectorEdgeKey({ a: 7, b: 2 }), "2:7");
  assert.throws(() => terrainConnectorCallSequenceKey([{ a: 3, b: 3 }]), /distinct integer tile ids/);
});
