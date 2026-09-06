import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { buildGeodesicGraph, createDirectionIndex, findNearestTileId } from "./geodesic.js";
import { decodeGeodesicGraphBake } from "./geodesicBake.js";

function direction(lat, lon) {
  const a = lat * Math.PI / 180, b = lon * Math.PI / 180;
  return [Math.cos(a) * Math.cos(b), Math.sin(a), -Math.cos(a) * Math.sin(b)];
}
function exhaustiveNearest(graph, dir) {
  let best = 0, bestDot = -Infinity;
  for (let id = 0; id < graph.tileCount; id++) {
    const k = id * 3;
    const dot = graph.centers[k] * dir[0] + graph.centers[k + 1] * dir[1] + graph.centers[k + 2] * dir[2];
    if (dot > bestDot) { best = id; bestDot = dot; }
  }
  return best;
}

test("nearest-tile indexing agrees with exhaustive geometry across buckets, dateline and poles", () => {
  for (const subdivisions of [0, 2, 4]) {
    const graph = buildGeodesicGraph(subdivisions);
    const index = createDirectionIndex(graph);
    for (let i = 0; i < 400; i++) {
      const lat = -90 + (i * 71.377 % 180), lon = -180 + (i * 131.313 % 360);
      const dir = direction(lat, lon);
      assert.equal(findNearestTileId(graph, index, dir), exhaustiveNearest(graph, dir), `${subdivisions}: ${lat}/${lon}`);
    }
  }
});

test("Copenhagen resolves to existing Zealand land, not the Sound across the index bucket edge", async () => {
  const bytes = await readFile(new URL("../../../examples/globe-demo/public/geodesic-graph-8.bin", import.meta.url));
  const graph = decodeGeodesicGraphBake(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), 8);
  const index = createDirectionIndex(graph);
  const dir = direction(55.67594, 12.56553);
  assert.equal(exhaustiveNearest(graph, dir), 393293);
  assert.equal(findNearestTileId(graph, index, dir), 393293);
  const points = [[55.676, 12.5], [89.99, -180], [-89.99, 180], [0, 179.999], [56.66, 16.35],
    ...Array.from({ length: 200 }, (_, i) => [-90 + (i * 71.377 % 180), -180 + (i * 131.313 % 360)])];
  for (const [lat, lon] of points) {
    const point = direction(lat, lon);
    assert.equal(findNearestTileId(graph, index, point), exhaustiveNearest(graph, point));
  }
});
