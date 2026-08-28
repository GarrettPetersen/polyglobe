import assert from "node:assert/strict";
import test from "node:test";

import { buildGeodesicGraph } from "./geodesic.js";
import {
  decodeGeodesicGraphBake,
  encodeGeodesicGraphBake,
  geodesicGraphBakeByteLength,
  isGraphNeighborRow,
  isGraphRowCollection
} from "./geodesicBake.js";

test("packed geodesic graph bakes preserve exact topology without row objects", () => {
  const source = buildGeodesicGraph(3);
  const buffer = encodeGeodesicGraphBake(source);
  const decoded = decodeGeodesicGraphBake(buffer, 3);

  assert.equal(buffer.byteLength, geodesicGraphBakeByteLength(source.tileCount));
  assert.equal(decoded.tileCount, source.tileCount);
  assert.equal(isGraphRowCollection(decoded.neighbors), true);
  assert.equal(Array.isArray(decoded.neighbors), false);
  assert.equal(isGraphNeighborRow(decoded.neighbors[0]), true);
  assert.deepEqual([...decoded.centers], [...source.centers]);
  assert.deepEqual([...decoded.latDeg], [...source.latDeg]);
  assert.deepEqual([...decoded.lonDeg], [...source.lonDeg]);
  assert.deepEqual([...decoded.edgeCount], [...source.edgeCount]);
  assert.deepEqual([...decoded.isPentagon], [...source.isPentagon]);
  for (let tileId = 0; tileId < source.tileCount; tileId++) {
    assert.deepEqual([...decoded.neighbors[tileId]], source.neighbors[tileId]);
    assert.deepEqual([...decoded.edgeNeighbors[tileId]], source.edgeNeighbors[tileId]);
  }
});

test("packed geodesic graph bakes reject mismatched subdivisions", () => {
  const buffer = encodeGeodesicGraphBake(buildGeodesicGraph(2));
  assert.throws(() => decodeGeodesicGraphBake(buffer, 3), /expected 3/);
});
