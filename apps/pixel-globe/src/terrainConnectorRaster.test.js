import test from "node:test";
import assert from "node:assert/strict";
import { terrainConnectorRasterSpans } from "./terrainConnectorRaster.js";

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

test("terrain connector raster rejects malformed geometry", () => {
  assert.throws(() => terrainConnectorRasterSpans([], 1), /at least three/);
  assert.throws(
    () => terrainConnectorRasterSpans([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: NaN, y: 1 }], 1),
    /invalid point/
  );
  assert.throws(() => terrainConnectorRasterSpans(CONNECTOR, 1.5), /integer seed/);
});
