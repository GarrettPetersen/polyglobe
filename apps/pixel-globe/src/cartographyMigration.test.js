import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { buildGeodesicGraph } from "./geodesic.js";
import { decodeGeodesicGraphBake } from "./geodesicBake.js";
import { reconcileCartographyTileMask } from "./cartographyMigration.js";
import { WORLD_GLOBE_SUBDIVISIONS, geodesicTileCount } from "./worldScale.js";

const repoRoot = new URL("../../../", import.meta.url);

test("an adjacent larger globe preserves and geographically expands the saved chart", () => {
  const savedSubdivisions = 1;
  const currentSubdivisions = 2;
  const savedTileCount = geodesicTileCount(savedSubdivisions);
  const graph = buildGeodesicGraph(currentSubdivisions);
  const packed = new Uint8Array(Math.ceil(savedTileCount / 8));
  const revealedCoarseTiles = new Set([0, 12, 27]);
  for (const tileId of revealedCoarseTiles) packed[tileId >> 3] |= 1 << (tileId & 7);

  const result = reconcileCartographyTileMask(
    packed,
    revealedCoarseTiles.size,
    graph,
    { savedSubdivisions, currentSubdivisions }
  );

  assert.equal(result.migrated, true);
  assert.equal(result.packedMask.length, Math.ceil(graph.tileCount / 8));
  assert.notEqual(result.packedMask, packed);
  let expectedCount = 0;
  for (let tileId = 0; tileId < graph.tileCount; tileId++) {
    const coarseParents = tileId < savedTileCount
      ? [tileId]
      : [...graph.neighbors[tileId]].filter((neighborId) => neighborId < savedTileCount);
    const expected = coarseParents.some((tileId) => revealedCoarseTiles.has(tileId));
    const actual = (result.packedMask[tileId >> 3] & (1 << (tileId & 7))) !== 0;
    assert.equal(actual, expected, `fine tile ${tileId}`);
    if (actual) expectedCount += 1;
  }
  assert.equal(result.seenTileCount, expectedCount);
});

test("same-topology cartography is validated without being rewritten", () => {
  const graph = buildGeodesicGraph(1);
  const packed = new Uint8Array(Math.ceil(graph.tileCount / 8));
  packed[0] = 0b00000101;
  const result = reconcileCartographyTileMask(packed, 2, graph, {
    savedSubdivisions: 1,
    currentSubdivisions: 1
  });
  assert.deepEqual(result, { packedMask: packed, seenTileCount: 2, migrated: false });
});

test("the reported subdivision-seven chart size migrates on the production globe", async () => {
  const graphSource = await readFile(new URL(
    "examples/globe-demo/public/geodesic-graph-8.bin",
    repoRoot
  ));
  const graph = decodeGeodesicGraphBake(
    graphSource.buffer.slice(graphSource.byteOffset, graphSource.byteOffset + graphSource.byteLength),
    WORLD_GLOBE_SUBDIVISIONS
  );
  const savedTileCount = geodesicTileCount(7);
  const packed = new Uint8Array(Math.ceil(savedTileCount / 8));
  for (const tileId of [0, 79421, savedTileCount - 1]) {
    packed[tileId >> 3] |= 1 << (tileId & 7);
  }

  const result = reconcileCartographyTileMask(packed, 3, graph, {
    savedSubdivisions: 7,
    currentSubdivisions: 8
  });

  assert.equal(packed.length, 20481);
  assert.equal(result.packedMask.length, 81921);
  assert.equal(result.migrated, true);
  assert.ok(result.seenTileCount >= 3);
});

test("cartography migration rejects corrupt masks and unsupported topology jumps", () => {
  const graph = buildGeodesicGraph(2);
  const savedTileCount = geodesicTileCount(1);
  const packed = new Uint8Array(Math.ceil(savedTileCount / 8));
  packed[0] = 1;
  assert.throws(
    () => reconcileCartographyTileMask(packed, 2, graph, {
      savedSubdivisions: 1,
      currentSubdivisions: 2
    }),
    /count mismatch/
  );
  const corruptTail = packed.slice();
  corruptTail[corruptTail.length - 1] = 0b10000000;
  assert.throws(
    () => reconcileCartographyTileMask(corruptTail, 1, graph, {
      savedSubdivisions: 1,
      currentSubdivisions: 2
    }),
    /beyond its world tile count/
  );
  assert.throws(
    () => reconcileCartographyTileMask(new Uint8Array(2), 0, graph, {
      savedSubdivisions: 0,
      currentSubdivisions: 2
    }),
    /No cartography migration exists/
  );
});
