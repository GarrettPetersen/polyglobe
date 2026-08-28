import assert from "node:assert/strict";
import test from "node:test";

import { buildGeodesicGraph } from "./geodesic.js";
import { worldTilesWithinArcRadius } from "./worldTileNeighborhood.js";

test("bounded world searches visit a local neighborhood instead of the whole globe", () => {
  const graph = buildGeodesicGraph(6);
  const radius = 350 / 6371;
  const matches = worldTilesWithinArcRadius({ graph, originTileId: 0, maxDistanceRad: radius });
  assert.ok(matches.length > 1);
  assert.ok(matches.length < graph.tileCount / 100);
  for (const match of matches) assert.ok(match.distanceRad <= radius);
});

test("bounded world searches validate their graph and radius", () => {
  const graph = buildGeodesicGraph(1);
  assert.throws(
    () => worldTilesWithinArcRadius({ graph, originTileId: -1, maxDistanceRad: 0.1 }),
    /origin tile/
  );
  assert.throws(
    () => worldTilesWithinArcRadius({ graph, originTileId: 0, maxDistanceRad: 0 }),
    /radius/
  );
});
