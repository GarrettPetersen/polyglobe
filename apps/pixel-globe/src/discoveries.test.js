import assert from "node:assert/strict";
import test from "node:test";
import { buildGeodesicGraph, createDirectionIndex } from "./geodesic.js";
import {
  CIRCUMNAVIGATION_DISCOVERY,
  GREAT_PYRAMID_DISCOVERY_ID,
  LAKE_VICTORIA_DISCOVERY_ID,
  buildWorldDiscoveries,
  mountainIsAccessibleFromNavigation
} from "./discoveries.js";

test("world discoveries map the Great Pyramid and Lake Victoria onto the globe", () => {
  const graph = buildGeodesicGraph(3);
  const landMask = new Uint8Array(graph.tileCount).fill(1);
  const riverMasks = new Uint8Array(graph.tileCount);
  const riverToWaterMasks = new Uint8Array(graph.tileCount);
  const discoveries = buildWorldDiscoveries(graph, createDirectionIndex(graph), {
    landMask,
    cityTileIds: [],
    riverMasks,
    riverToWaterMasks
  });
  assert.deepEqual(discoveries.map((item) => item.id), [
    GREAT_PYRAMID_DISCOVERY_ID,
    LAKE_VICTORIA_DISCOVERY_ID
  ]);
  assert.ok(discoveries.every((item) => Number.isInteger(item.tileId)));
  const pyramid = discoveries.find((item) => item.id === GREAT_PYRAMID_DISCOVERY_ID);
  assert.ok(pyramid);
  assert.ok(Number.isInteger(pyramid.spriteTileId));
  assert.ok(graph.lonDeg[pyramid.spriteTileId] < pyramid.lon, "pyramid artwork must remain west of the Nile");
  assert.equal(CIRCUMNAVIGATION_DISCOVERY.kind, "achievement");
});

test("mountain accessibility requires ocean-connected navigation within viewing range", () => {
  const graph = buildGeodesicGraph(2);
  const mountainTileId = 0;
  const nearbyTileId = graph.neighbors[mountainTileId][0];
  const mask = new Uint8Array(graph.tileCount);

  assert.equal(mountainIsAccessibleFromNavigation(mountainTileId, graph, mask, 0.5), false);
  mask[nearbyTileId] = 1;
  assert.equal(mountainIsAccessibleFromNavigation(mountainTileId, graph, mask, 0.5), true);
});
