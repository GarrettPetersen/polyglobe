import assert from "node:assert/strict";
import test from "node:test";

import { fineTilesBorderingCoarseTile } from "./climateTileBoundary.js";
import { buildGeodesicGraph } from "./geodesic.js";
import { buildFineToCoarseTileMapping, geodesicTileCount } from "./worldScale.js";

test("coarse polar cells find their fine boundary without a whole-world scan", () => {
  const graph = buildGeodesicGraph(4);
  const mapping = buildFineToCoarseTileMapping(graph, 2);
  const coarseTileId = Math.floor(geodesicTileCount(2) / 3);
  const boundary = fineTilesBorderingCoarseTile({
    graph,
    coarseTileId,
    coarseTileIdForFineTile: (tileId) => mapping[tileId],
    acceptsBoundaryTile: () => true
  });

  assert.ok(boundary.length > 0);
  assert.ok(boundary.length < graph.tileCount / 100);
  assert.ok(boundary.every((tileId) => mapping[tileId] !== coarseTileId));
  const directFineNeighbors = graph.neighbors[coarseTileId];
  assert.ok(
    directFineNeighbors.every((tileId) => mapping[tileId] === coarseTileId),
    "the test must cover the two-subdivision case where direct fine neighbors stay in-cell"
  );
});

test("climate boundary searches fail loudly when a mapping cell is unexpectedly huge", () => {
  const graph = buildGeodesicGraph(2);
  assert.throws(() => fineTilesBorderingCoarseTile({
    graph,
    coarseTileId: 0,
    coarseTileIdForFineTile: () => 0,
    acceptsBoundaryTile: () => true,
    maximumVisitedTiles: 8
  }), /covers more than 8/);
});
